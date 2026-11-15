const { migrate, pool } = require('./db');

migrate()
  .then(() => { console.log('Database is up to date.'); return pool.end(); })
  .catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
