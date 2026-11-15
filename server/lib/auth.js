const jwt = require('jsonwebtoken');
const { jwtSecret, isProd } = require('../config');
const db = require('../db');

const COOKIE = 'apnasa_session';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function setSession(res, user) {
  const token = jwt.sign({ uid: user.id }, jwtSecret, { expiresIn: '30d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: MAX_AGE_MS, path: '/' });
}

function clearSession(res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' });
}

const publicUser = u => u && ({ id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, avatarUrl: u.avatar_url, hasPassword: !!u.password_hash });

// Reads the session cookie (if any) and puts the user on req.user.
async function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return next();
  try {
    const { uid } = jwt.verify(token, jwtSecret);
    const user = await db.one('SELECT * FROM users WHERE id = $1 AND is_active', [uid]);
    if (user) req.user = user;
  } catch { /* invalid or expired token: treat as logged out */ }
  next();
}

const requireLogin = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Please log in first.' });
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Please log in first.' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have access to this.' });
  next();
};

module.exports = { setSession, clearSession, publicUser, loadUser, requireLogin, requireRole };
