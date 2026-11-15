const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { requireLogin, requireRole } = require('../lib/auth');
const { validate } = require('../lib/validate');

const router = express.Router();

const parentSchema = z.object({
  name: z.string().trim().min(2, 'Please enter their name').max(80),
  age: z.coerce.number().int().min(40, 'Age looks too low').max(120),
  city: z.string().trim().min(2, 'Please enter city and area').max(120),
  address: z.string().trim().max(300).optional().default(''),
  living: z.string().trim().max(40).optional().default(''),
  walking: z.string().trim().max(40).optional().default(''),
  preferred_time: z.string().trim().max(40).optional().default(''),
  language: z.string().trim().max(40).optional().default(''),
  notes: z.string().trim().max(1500).optional().default('')
});

const PARENT_COLS = `p.id, p.name, p.age, p.city, p.address, p.living, p.walking, p.preferred_time, p.language, p.notes, p.created_at,
  c.name AS companion_name, c.phone AS companion_phone,
  (SELECT row_to_json(s) FROM (SELECT id, plan, status, current_end FROM subscriptions WHERE parent_id = p.id ORDER BY created_at DESC LIMIT 1) s) AS subscription,
  (SELECT row_to_json(n) FROM (SELECT mood, note, created_at FROM visit_notes WHERE parent_id = p.id ORDER BY created_at DESC LIMIT 1) n) AS last_note`;

router.get('/parents', requireRole('family', 'admin'), async (req, res) => {
  const rows = await db.many(`SELECT ${PARENT_COLS} FROM parents p LEFT JOIN users c ON c.id = p.companion_id WHERE p.family_user_id = $1 ORDER BY p.created_at`, [req.user.id]);
  res.json({ parents: rows });
});

router.post('/parents', requireRole('family', 'admin'), validate(parentSchema), async (req, res) => {
  const b = req.body;
  const count = await db.one('SELECT count(*)::int AS n FROM parents WHERE family_user_id = $1', [req.user.id]);
  if (count.n >= 6) return res.status(400).json({ error: 'You can add up to 6 parents. Please contact us for more.' });
  const row = await db.one(
    `INSERT INTO parents (family_user_id, name, age, city, address, living, walking, preferred_time, language, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [req.user.id, b.name, b.age, b.city, b.address, b.living, b.walking, b.preferred_time, b.language, b.notes]);
  res.status(201).json({ id: row.id });
});

router.put('/parents/:id', requireRole('family', 'admin'), validate(parentSchema), async (req, res) => {
  const b = req.body;
  const row = await db.one(
    `UPDATE parents SET name=$3, age=$4, city=$5, address=$6, living=$7, walking=$8, preferred_time=$9, language=$10, notes=$11
      WHERE id = $1 AND family_user_id = $2 RETURNING id`,
    [Number(req.params.id), req.user.id, b.name, b.age, b.city, b.address, b.living, b.walking, b.preferred_time, b.language, b.notes]);
  if (!row) return res.status(404).json({ error: 'Parent not found.' });
  res.json({ ok: true });
});

// Visit notes for one parent: visible to that family, the assigned companion, and admins.
router.get('/parents/:id/notes', requireLogin, async (req, res) => {
  const id = Number(req.params.id);
  const parent = await db.one('SELECT family_user_id, companion_id FROM parents WHERE id = $1', [id]);
  const allowed = parent && (req.user.role === 'admin' || parent.family_user_id === req.user.id || parent.companion_id === req.user.id);
  if (!allowed) return res.status(404).json({ error: 'Parent not found.' });
  const notes = await db.many(
    `SELECT n.id, n.mood, n.activities, n.medicines_taken, n.note, n.created_at, u.name AS companion_name
       FROM visit_notes n LEFT JOIN users u ON u.id = n.companion_id
      WHERE n.parent_id = $1 ORDER BY n.created_at DESC LIMIT 60`, [id]);
  res.json({ notes });
});

// Public enquiry form (works logged in or out).
const enquirySchema = z.record(z.string().max(60), z.string().max(2000)).refine(o => Object.keys(o).length <= 25, 'Too many fields');
router.post('/enquiries', validate(enquirySchema), async (req, res) => {
  const data = req.body;
  if (!data['Phone number'] && !data['Email address']) return res.status(400).json({ error: 'Please give a phone number or email so we can reach you.' });
  const row = await db.one('INSERT INTO enquiries (user_id, data) VALUES ($1,$2) RETURNING id', [req.user?.id || null, data]);
  res.status(201).json({ id: row.id });
});

module.exports = router;
