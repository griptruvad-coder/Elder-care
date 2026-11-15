const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { requireRole } = require('../lib/auth');
const { validate } = require('../lib/validate');

const router = express.Router();
router.use('/admin', requireRole('admin'));

router.get('/admin/stats', async (_req, res) => {
  const s = await db.one(`SELECT
    (SELECT count(*)::int FROM users WHERE role = 'family') AS families,
    (SELECT count(*)::int FROM users WHERE role = 'companion') AS companions,
    (SELECT count(*)::int FROM parents) AS parents,
    (SELECT count(*)::int FROM parents WHERE companion_id IS NULL) AS unassigned,
    (SELECT count(*)::int FROM enquiries WHERE status = 'new') AS new_enquiries,
    (SELECT count(*)::int FROM subscriptions WHERE status = 'active') AS active_subscriptions,
    (SELECT COALESCE(sum(amount_paise),0)::bigint FROM subscriptions WHERE status = 'active') AS monthly_revenue_paise,
    (SELECT count(*)::int FROM visit_notes WHERE created_at > now() - interval '7 days') AS notes_this_week`);
  res.json({ stats: { ...s, monthly_revenue_paise: Number(s.monthly_revenue_paise) } });
});

router.get('/admin/enquiries', async (_req, res) => {
  res.json({ enquiries: await db.many('SELECT id, data, status, admin_note, created_at FROM enquiries ORDER BY created_at DESC LIMIT 200') });
});

router.patch('/admin/enquiries/:id', validate(z.object({
  status: z.enum(['new', 'contacted', 'converted', 'closed']),
  adminNote: z.string().trim().max(1000).optional().default('')
})), async (req, res) => {
  const row = await db.one('UPDATE enquiries SET status = $2, admin_note = $3 WHERE id = $1 RETURNING id', [Number(req.params.id), req.body.status, req.body.adminNote]);
  if (!row) return res.status(404).json({ error: 'Not found.' });
  res.json({ ok: true });
});

router.get('/admin/users', async (_req, res) => {
  res.json({ users: await db.many(`SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
    (SELECT count(*)::int FROM parents WHERE family_user_id = u.id) AS parent_count,
    (SELECT count(*)::int FROM parents WHERE companion_id = u.id) AS assigned_count
    FROM users u ORDER BY u.created_at DESC LIMIT 500`) });
});

router.patch('/admin/users/:id', validate(z.object({
  role: z.enum(['family', 'companion', 'admin']).optional(),
  isActive: z.boolean().optional()
})), async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role or status.' });
  const row = await db.one(
    'UPDATE users SET role = COALESCE($2, role), is_active = COALESCE($3, is_active) WHERE id = $1 RETURNING id',
    [id, req.body.role ?? null, req.body.isActive ?? null]);
  if (!row) return res.status(404).json({ error: 'User not found.' });
  res.json({ ok: true });
});

router.get('/admin/parents', async (_req, res) => {
  res.json({ parents: await db.many(`SELECT p.id, p.name, p.age, p.city, p.preferred_time, p.language, p.companion_id,
      f.name AS family_name, f.email AS family_email, f.phone AS family_phone, c.name AS companion_name,
      (SELECT row_to_json(s) FROM (SELECT plan, status FROM subscriptions WHERE parent_id = p.id ORDER BY created_at DESC LIMIT 1) s) AS subscription,
      (SELECT max(created_at) FROM visit_notes WHERE parent_id = p.id) AS last_visit
    FROM parents p JOIN users f ON f.id = p.family_user_id LEFT JOIN users c ON c.id = p.companion_id
    ORDER BY p.created_at DESC LIMIT 500`) });
});

router.patch('/admin/parents/:id/companion', validate(z.object({ companionId: z.coerce.number().int().positive().nullable() })), async (req, res) => {
  const cid = req.body.companionId;
  if (cid) {
    const c = await db.one("SELECT id FROM users WHERE id = $1 AND role = 'companion' AND is_active", [cid]);
    if (!c) return res.status(400).json({ error: 'That person is not an active companion.' });
  }
  const row = await db.one('UPDATE parents SET companion_id = $2 WHERE id = $1 RETURNING id', [Number(req.params.id), cid]);
  if (!row) return res.status(404).json({ error: 'Parent not found.' });
  res.json({ ok: true });
});

router.get('/admin/subscriptions', async (_req, res) => {
  res.json({ subscriptions: await db.many(`SELECT s.id, s.plan, s.amount_paise, s.status, s.current_end, s.created_at, s.razorpay_subscription_id,
      p.name AS parent_name, u.name AS family_name, u.email AS family_email
    FROM subscriptions s JOIN parents p ON p.id = s.parent_id JOIN users u ON u.id = s.user_id
    ORDER BY s.created_at DESC LIMIT 300`) });
});

module.exports = router;
