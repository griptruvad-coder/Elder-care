const express = require('express');
const { z } = require('zod');
const db = require('../db');
const rzp = require('../lib/razorpay');
const { PLANS, planId, razorpay } = require('../config');
const { requireLogin } = require('../lib/auth');
const { validate } = require('../lib/validate');

const router = express.Router();

// Step 1: family picks a plan for one of their parents → we create a Razorpay subscription.
router.post('/subscriptions', requireLogin, validate(z.object({
  plan: z.enum(['basic', 'premium', 'super_premium']),
  parentId: z.coerce.number().int().positive()
})), async (req, res) => {
  if (!rzp.configured()) return res.status(503).json({ error: 'Online payments are not switched on yet. Please contact the care team.' });
  const { plan, parentId } = req.body;
  const pid = planId(plan);
  if (!pid) return res.status(503).json({ error: `The ${PLANS[plan].name} plan is not set up in Razorpay yet.` });

  const parent = await db.one('SELECT * FROM parents WHERE id = $1 AND family_user_id = $2', [parentId, req.user.id]);
  if (!parent) return res.status(404).json({ error: 'Parent not found.' });
  const active = await db.one("SELECT id FROM subscriptions WHERE parent_id = $1 AND status IN ('active','authenticated','pending')", [parentId]);
  if (active) return res.status(409).json({ error: `${parent.name} already has an active plan.` });

  const sub = await rzp.api('POST', '/subscriptions', {
    plan_id: pid,
    total_count: razorpay.totalCount,
    customer_notify: 1,
    notes: { user_id: String(req.user.id), parent_id: String(parentId), plan }
  });
  const row = await db.one(
    `INSERT INTO subscriptions (user_id, parent_id, plan, amount_paise, razorpay_subscription_id, status)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [req.user.id, parentId, plan, PLANS[plan].amountPaise, sub.id, sub.status || 'created']
  );
  res.status(201).json({
    id: row.id,
    keyId: razorpay.keyId,
    subscriptionId: sub.id,
    planName: PLANS[plan].name,
    amountPaise: PLANS[plan].amountPaise,
    prefill: { name: req.user.name, email: req.user.email, contact: req.user.phone || '' }
  });
});

// Step 2: Razorpay Checkout succeeded in the browser → verify the signature before trusting it.
router.post('/subscriptions/verify', requireLogin, validate(z.object({
  razorpay_payment_id: z.string().min(5),
  razorpay_subscription_id: z.string().min(5),
  razorpay_signature: z.string().min(10)
})), async (req, res) => {
  const b = req.body;
  // Use OUR stored subscription id (not just what the browser sent), as Razorpay recommends.
  const sub = await db.one('SELECT * FROM subscriptions WHERE razorpay_subscription_id = $1 AND user_id = $2', [b.razorpay_subscription_id, req.user.id]);
  if (!sub) return res.status(404).json({ error: 'Subscription not found.' });
  const ok = rzp.verifyCheckout({ paymentId: b.razorpay_payment_id, subscriptionId: sub.razorpay_subscription_id, signature: b.razorpay_signature });
  if (!ok) return res.status(400).json({ error: 'Payment could not be verified. If money was deducted, please contact us.' });

  await db.query("UPDATE subscriptions SET status = CASE WHEN status IN ('created','authenticated') THEN 'active' ELSE status END, updated_at = now() WHERE id = $1", [sub.id]);
  await db.query(
    `INSERT INTO payments (subscription_id, razorpay_payment_id, amount_paise, status) VALUES ($1,$2,$3,'captured')
     ON CONFLICT (razorpay_payment_id) DO NOTHING`,
    [sub.id, b.razorpay_payment_id, sub.amount_paise]
  );
  res.json({ ok: true });
});

router.get('/subscriptions', requireLogin, async (req, res) => {
  const rows = await db.many(
    `SELECT s.id, s.plan, s.amount_paise, s.status, s.current_end, s.created_at, p.name AS parent_name, p.id AS parent_id
       FROM subscriptions s JOIN parents p ON p.id = s.parent_id
      WHERE s.user_id = $1 ORDER BY s.created_at DESC`, [req.user.id]);
  res.json({ subscriptions: rows });
});

router.post('/subscriptions/:id/cancel', requireLogin, async (req, res) => {
  const sub = await db.one('SELECT * FROM subscriptions WHERE id = $1 AND user_id = $2', [Number(req.params.id), req.user.id]);
  if (!sub) return res.status(404).json({ error: 'Subscription not found.' });
  if (!['active', 'authenticated', 'pending', 'halted'].includes(sub.status)) return res.status(400).json({ error: 'This plan is not active.' });
  if (rzp.configured() && sub.razorpay_subscription_id) {
    // Cancel at the end of the current month so the paid period is still served.
    await rzp.api('POST', `/subscriptions/${sub.razorpay_subscription_id}/cancel`, { cancel_at_cycle_end: 1 });
  }
  await db.query("UPDATE subscriptions SET status = 'cancel_requested', updated_at = now() WHERE id = $1", [sub.id]);
  res.json({ ok: true });
});

// Razorpay → our server. Mounted with express.raw() so the signature can be checked on the exact bytes.
async function webhook(req, res) {
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!rzp.verifyWebhook(raw, req.get('x-razorpay-signature'))) return res.status(400).json({ error: 'Invalid signature' });

  let event;
  try { event = JSON.parse(raw); } catch { return res.status(400).json({ error: 'Bad JSON' }); }
  const eventId = req.get('x-razorpay-event-id');
  if (eventId) {
    const fresh = await db.one('INSERT INTO webhook_events (id, event) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING RETURNING id', [eventId, event.event]);
    if (!fresh) return res.json({ ok: true, duplicate: true });
  }

  const subEntity = event.payload?.subscription?.entity;
  const payEntity = event.payload?.payment?.entity;
  if (subEntity?.id && String(event.event).startsWith('subscription.')) {
    const status = event.event === 'subscription.charged' ? 'active' : subEntity.status;
    const sub = await db.one(
      `UPDATE subscriptions SET status = $2, current_end = COALESCE(to_timestamp($3), current_end), updated_at = now()
        WHERE razorpay_subscription_id = $1 RETURNING id`,
      [subEntity.id, status, subEntity.current_end || null]
    );
    if (sub && payEntity?.id) {
      await db.query(
        `INSERT INTO payments (subscription_id, razorpay_payment_id, amount_paise, status) VALUES ($1,$2,$3,$4)
         ON CONFLICT (razorpay_payment_id) DO UPDATE SET status = EXCLUDED.status`,
        [sub.id, payEntity.id, payEntity.amount || null, payEntity.status || 'captured']
      );
    }
  }
  res.json({ ok: true });
}

module.exports = { router, webhook };
