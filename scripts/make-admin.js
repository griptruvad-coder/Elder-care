// Usage: npm run make-admin -- someone@example.com   (makes an existing user an admin)
const db = require('../server/db');
const email = (process.argv[2] || '').toLowerCase();
if (!email) { console.error('Usage: npm run make-admin -- email@example.com'); process.exit(1); }
db.one("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id, name", [email])
  .then(u => { console.log(u ? `${u.name} is now an admin.` : 'No user with that email. Ask them to sign up first.'); return db.pool.end(); })
  .catch(e => { console.error(e.message); process.exit(1); });
