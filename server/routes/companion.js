const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { requireRole } = require('../lib/auth');
const { validate } = require('../lib/validate');

const router = express.Router();

// Parents assigned to the logged-in companion, with whether today's note is done.
router.get('/companion/parents', requireRole('companion', 'admin'), async (req, res) => {
  const rows = await db.many(
    `SELECT p.id, p.name, p.age, p.city, p.address, p.preferred_time, p.language, p.walking, p.notes,
            f.name AS family_name, f.phone AS family_phone,
            EXISTS (SELECT 1 FROM visit_notes n WHERE n.parent_id = p.id AND n.created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS visited_today
       FROM parents p JOIN users f ON f.id = p.family_user_id
      WHERE p.companion_id = $1 ORDER BY p.name`, [req.user.id]);
  res.json({ parents: rows });
});

const ACTIVITIES = ['walk', 'chai & baatein', 'medicine reminder', 'doctor visit', 'games', 'reading', 'music / bhajan', 'outing', 'errand'];

router.post('/companion/notes', requireRole('companion', 'admin'), validate(z.object({
  parentId: z.coerce.number().int().positive(),
  mood: z.enum(['great', 'good', 'okay', 'low']),
  activities: z.array(z.enum(ACTIVITIES)).max(9).default([]),
  medicinesTaken: z.boolean().nullable().optional(),
  note: z.string().trim().min(5, 'Please write a short note for the family').max(1500)
})), async (req, res) => {
  const b = req.body;
  const parent = await db.one('SELECT id, companion_id FROM parents WHERE id = $1', [b.parentId]);
  if (!parent || (req.user.role !== 'admin' && parent.companion_id !== req.user.id)) return res.status(404).json({ error: 'This parent is not assigned to you.' });
  const row = await db.one(
    'INSERT INTO visit_notes (parent_id, companion_id, mood, activities, medicines_taken, note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [b.parentId, req.user.id, b.mood, b.activities, b.medicinesTaken ?? null, b.note]);
  res.status(201).json({ id: row.id });
});

module.exports = { router, ACTIVITIES };
