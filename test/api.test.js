// End-to-end API tests against a real Postgres database.
// Run: DATABASE_URL=postgres://apnasa:apnasa@localhost:5432/apnasa_test npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.DATABASE_URL ||= 'postgres://apnasa:apnasa@localhost:5432/apnasa_test';
process.env.ADMIN_EMAILS = 'founder@apnasa.test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
process.env.RAZORPAY_PLAN_PREMIUM = 'plan_premium_test';

// Fake Razorpay API (the real one is never called in tests).
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  if (String(url).startsWith('https://api.razorpay.com')) {
    if (String(url).endsWith('/subscriptions')) return new Response(JSON.stringify({ id: 'sub_TEST123', status: 'created' }), { status: 200 });
    return new Response(JSON.stringify({ id: 'x', status: 'cancelled' }), { status: 200 });
  }
  return realFetch(url, opts);
};

const { app } = require('../server');
const db = require('../server/db');
let server, base;

// Tiny cookie-keeping client per user.
function client() {
  let cookie = '';
  return async (method, path, body, headers = {}) => {
    const res = await realFetch(base + path, {
      method, headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }), ...headers },
      body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
    });
    const set = res.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
    let json = null; try { json = await res.json(); } catch {}
    return { status: res.status, body: json };
  };
}

test.before(async () => {
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await db.migrate();
  server = app.listen(0); await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { server.close(); await db.pool.end(); });

const family = client(), admin = client(), comp = client(), stranger = client();
let parentId, companionId;

test('signup, duplicate, wrong password, login, me', async () => {
  let r = await family('POST', '/api/auth/signup', { name: 'Riya', email: 'Riya@Example.com', password: 'secret123' });
  assert.equal(r.status, 201); assert.equal(r.body.user.role, 'family'); assert.equal(r.body.user.email, 'riya@example.com');
  r = await stranger('POST', '/api/auth/signup', { name: 'Xavier', email: 'riya@example.com', password: 'secret123' });
  assert.equal(r.status, 409);
  r = await stranger('POST', '/api/auth/signup', { name: 'Y', email: 'y@example.com', password: 'short' });
  assert.equal(r.status, 400);
  r = await stranger('POST', '/api/auth/login', { email: 'riya@example.com', password: 'wrongpass' });
  assert.equal(r.status, 401);
  r = await family('GET', '/api/auth/me');
  assert.equal(r.body.user.name, 'Riya');
  r = await stranger('GET', '/api/auth/me');
  assert.equal(r.body.user, null);
});

test('ADMIN_EMAILS sign up as admin; Google login is off without a client id', async () => {
  const r = await admin('POST', '/api/auth/signup', { name: 'Founder', email: 'founder@apnasa.test', password: 'founder123' });
  assert.equal(r.body.user.role, 'admin');
  const g = await stranger('POST', '/api/auth/google', { credential: 'x'.repeat(40) });
  assert.equal(g.status, 503);
});

test('family adds a parent; others cannot see it', async () => {
  let r = await family('POST', '/api/parents', { name: 'Kamla Devi', age: 74, city: 'Lajpat Nagar, Delhi', walking: 'Uses a walker' });
  assert.equal(r.status, 201); parentId = r.body.id;
  r = await family('POST', '/api/parents', { name: 'Too Young', age: 12, city: 'Delhi' });
  assert.equal(r.status, 400);
  r = await family('GET', '/api/parents');
  assert.equal(r.body.parents.length, 1);
  r = await stranger('GET', '/api/parents');
  assert.equal(r.status, 401);
  r = await stranger('GET', `/api/parents/${parentId}/notes`);
  assert.equal(r.status, 401);
});

test('admin makes a companion, assigns parent; companion writes a note; family sees it', async () => {
  let r = await comp('POST', '/api/auth/signup', { name: 'Sunita', email: 'sunita@apnasa.test', password: 'companion1' });
  companionId = r.body.user.id;
  r = await family('PATCH', `/api/admin/users/${companionId}`, { role: 'companion' });
  assert.equal(r.status, 403, 'family cannot use admin APIs');
  r = await admin('PATCH', `/api/admin/users/${companionId}`, { role: 'companion' });
  assert.equal(r.status, 200);
  r = await comp('POST', '/api/companion/notes', { parentId, mood: 'good', note: 'Went for a walk.' });
  assert.equal(r.status, 404, 'not assigned yet');
  r = await admin('PATCH', `/api/admin/parents/${parentId}/companion`, { companionId });
  assert.equal(r.status, 200);
  r = await comp('GET', '/api/companion/parents');
  assert.equal(r.body.parents[0].name, 'Kamla Devi'); assert.equal(r.body.parents[0].visited_today, false);
  r = await comp('POST', '/api/companion/notes', { parentId, mood: 'great', activities: ['walk', 'chai & baatein'], medicinesTaken: true, note: 'Park tak walk, phir chai pe purani baatein.' });
  assert.equal(r.status, 201);
  r = await comp('GET', '/api/companion/parents');
  assert.equal(r.body.parents[0].visited_today, true);
  r = await family('GET', `/api/parents/${parentId}/notes`);
  assert.equal(r.body.notes.length, 1); assert.equal(r.body.notes[0].companion_name, 'Sunita');
  r = await family('GET', '/api/parents');
  assert.equal(r.body.parents[0].companion_name, 'Sunita');
});

test('enquiry form saves; admin sees and updates it', async () => {
  let r = await stranger('POST', '/api/enquiries', { 'Parent’s name': 'Ram', 'Phone number': '9800000000' });
  assert.equal(r.status, 201);
  r = await stranger('POST', '/api/enquiries', { 'Parent’s name': 'No contact' });
  assert.equal(r.status, 400);
  r = await admin('GET', '/api/admin/enquiries');
  assert.equal(r.body.enquiries.length, 1);
  r = await admin('PATCH', `/api/admin/enquiries/${r.body.enquiries[0].id}`, { status: 'contacted', adminNote: 'Called' });
  assert.equal(r.status, 200);
});

test('Razorpay: create subscription, reject bad signature, accept good one', async () => {
  let r = await family('POST', '/api/subscriptions', { plan: 'basic', parentId });
  assert.equal(r.status, 503, 'basic plan id not configured');
  r = await stranger('POST', '/api/subscriptions', { plan: 'premium', parentId });
  assert.equal(r.status, 401);
  r = await family('POST', '/api/subscriptions', { plan: 'premium', parentId });
  assert.equal(r.status, 201); assert.equal(r.body.subscriptionId, 'sub_TEST123'); assert.equal(r.body.amountPaise, 799900);

  r = await family('POST', '/api/subscriptions/verify', { razorpay_payment_id: 'pay_1', razorpay_subscription_id: 'sub_TEST123', razorpay_signature: 'f'.repeat(64) });
  assert.equal(r.status, 400);
  const sig = crypto.createHmac('sha256', 'test_secret').update('pay_1|sub_TEST123').digest('hex');
  r = await stranger('POST', '/api/subscriptions/verify', { razorpay_payment_id: 'pay_1', razorpay_subscription_id: 'sub_TEST123', razorpay_signature: sig });
  assert.equal(r.status, 401);
  r = await family('POST', '/api/subscriptions/verify', { razorpay_payment_id: 'pay_1', razorpay_subscription_id: 'sub_TEST123', razorpay_signature: sig });
  assert.equal(r.status, 200);
  r = await family('GET', '/api/subscriptions');
  assert.equal(r.body.subscriptions[0].status, 'active');
  r = await family('POST', '/api/subscriptions', { plan: 'premium', parentId });
  assert.equal(r.status, 409, 'no second active plan for same parent');
});

test('Razorpay webhook: signature required, updates status, ignores duplicates', async () => {
  const payload = JSON.stringify({ event: 'subscription.charged', payload: {
    subscription: { entity: { id: 'sub_TEST123', status: 'active', current_end: 1767225600 } },
    payment: { entity: { id: 'pay_2', amount: 799900, status: 'captured' } } } });
  let r = await stranger('POST', '/api/webhooks/razorpay', payload, { 'x-razorpay-signature': 'bad' });
  assert.equal(r.status, 400);
  const sig = crypto.createHmac('sha256', 'whsec_test').update(payload).digest('hex');
  r = await stranger('POST', '/api/webhooks/razorpay', payload, { 'x-razorpay-signature': sig, 'x-razorpay-event-id': 'evt_1' });
  assert.equal(r.status, 200);
  r = await stranger('POST', '/api/webhooks/razorpay', payload, { 'x-razorpay-signature': sig, 'x-razorpay-event-id': 'evt_1' });
  assert.equal(r.body.duplicate, true);
  const pays = await db.many('SELECT razorpay_payment_id FROM payments ORDER BY id');
  assert.deepEqual(pays.map(p => p.razorpay_payment_id), ['pay_1', 'pay_2']);
  const sub = await db.one("SELECT current_end FROM subscriptions WHERE razorpay_subscription_id = 'sub_TEST123'");
  assert.ok(sub.current_end);
});

test('admin stats, cancel, logout', async () => {
  let r = await admin('GET', '/api/admin/stats');
  assert.equal(r.body.stats.active_subscriptions, 1); assert.equal(r.body.stats.monthly_revenue_paise, 799900);
  const subs = (await family('GET', '/api/subscriptions')).body.subscriptions;
  r = await family('POST', `/api/subscriptions/${subs[0].id}/cancel`);
  assert.equal(r.status, 200);
  r = await admin('PATCH', `/api/admin/users/1`, { isActive: false });
  r = await family('GET', '/api/auth/me');
  assert.equal(r.body.user, null, 'disabled user is logged out');
  r = await admin('POST', '/api/auth/logout');
  r = await admin('GET', '/api/admin/stats');
  assert.equal(r.status, 401);
});

test('rate limit uses the real visitor IP sent by Netlify', () => {
  const { clientIp } = require('../server/lib/limits');
  const req = h => ({ ip: '10.0.0.1', get: k => h[k.toLowerCase()] });
  assert.equal(clientIp(req({ 'x-nf-client-connection-ip': '49.36.1.2' })), '49.36.1.2');
  assert.equal(clientIp(req({})), '10.0.0.1');
  assert.equal(clientIp(req({ 'x-nf-client-connection-ip': 'not an ip<script>' })), '10.0.0.1');
});
