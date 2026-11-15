const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { OAuth2Client } = require('google-auth-library');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { adminEmails, googleClientId } = require('../config');
const { setSession, clearSession, publicUser, requireLogin } = require('../lib/auth');
const { validate } = require('../lib/validate');

const router = express.Router();
const google = new OAuth2Client();

// Slow down password guessing: 20 attempts per 15 minutes per IP.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Please wait a few minutes and try again.' } });

const roleFor = email => adminEmails.includes(email.toLowerCase()) ? 'admin' : 'family';

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.email('Please enter a valid email').transform(e => e.toLowerCase()),
  phone: z.string().trim().max(20).optional().default(''),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100)
});

router.post('/signup', authLimiter, validate(signupSchema), async (req, res) => {
  const { name, email, phone, password } = req.body;
  const existing = await db.one('SELECT id, password_hash FROM users WHERE email = $1', [email]);
  if (existing) {
    return res.status(409).json({ error: existing.password_hash ? 'An account with this email already exists. Please log in.' : 'This email is linked to Google. Please use "Continue with Google".' });
  }
  const hash = await bcrypt.hash(password, 12);
  const user = await db.one(
    'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, email, phone || null, hash, roleFor(email)]
  );
  setSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

const loginSchema = z.object({
  email: z.email('Please enter a valid email').transform(e => e.toLowerCase()),
  password: z.string().min(1, 'Please enter your password')
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await db.one('SELECT * FROM users WHERE email = $1 AND is_active', [email]);
  const ok = user?.password_hash && await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    if (user && !user.password_hash) return res.status(401).json({ error: 'This account uses Google. Please use "Continue with Google".' });
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  // Promote to admin if their email was added to ADMIN_EMAILS later.
  if (user.role !== 'admin' && roleFor(email) === 'admin') {
    await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]); user.role = 'admin';
  }
  setSession(res, user);
  res.json({ user: publicUser(user) });
});

// Google Sign-In: the browser gets an ID token from Google and sends it here; we verify it with Google's keys.
router.post('/google', authLimiter, validate(z.object({ credential: z.string().min(20) })), async (req, res) => {
  if (!googleClientId) return res.status(503).json({ error: 'Google login is not set up yet.' });
  let payload;
  try {
    const ticket = await google.verifyIdToken({ idToken: req.body.credential, audience: googleClientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Google login failed. Please try again.' });
  }
  if (!payload?.email || !payload.email_verified) return res.status(401).json({ error: 'Your Google email is not verified.' });

  const email = payload.email.toLowerCase();
  let user = await db.one('SELECT * FROM users WHERE google_sub = $1 OR email = $2 ORDER BY (google_sub IS NOT DISTINCT FROM $1) DESC LIMIT 1', [payload.sub, email]);
  if (user && !user.is_active) return res.status(403).json({ error: 'This account is disabled.' });
  if (!user) {
    user = await db.one(
      'INSERT INTO users (name, email, google_sub, avatar_url, role) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [payload.name || email.split('@')[0], email, payload.sub, payload.picture || null, roleFor(email)]
    );
  } else {
    // Link Google to an existing email account, keep details fresh.
    user = await db.one(
      `UPDATE users SET google_sub = $2, avatar_url = COALESCE($3, avatar_url),
         role = CASE WHEN $4 THEN 'admin' ELSE role END WHERE id = $1 RETURNING *`,
      [user.id, payload.sub, payload.picture || null, roleFor(email) === 'admin']
    );
  }
  setSession(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });

router.get('/me', (req, res) => res.json({ user: publicUser(req.user) || null }));

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional().default('')
});
router.patch('/me', requireLogin, validate(profileSchema), async (req, res) => {
  const user = await db.one('UPDATE users SET name = $2, phone = $3 WHERE id = $1 RETURNING *', [req.user.id, req.body.name, req.body.phone || null]);
  res.json({ user: publicUser(user) });
});

module.exports = router;
