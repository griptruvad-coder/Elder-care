const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { databaseUrl, isProd } = require('./config');

// Render's internal database URL has a host without dots (e.g. dpg-abc123-a) and needs no SSL.
// External URLs (…render.com, Neon, Supabase) need SSL. DATABASE_SSL=true/false overrides.
function sslSetting() {
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };
  if (process.env.DATABASE_SSL === 'false') return false;
  let host = '';
  try { host = new URL(databaseUrl).hostname; } catch { /* keep empty */ }
  const local = host === 'localhost' || host === '127.0.0.1' || !host.includes('.');
  return isProd && !local ? { rejectUnauthorized: false } : false;
}

const pool = new Pool({ connectionString: databaseUrl, ssl: sslSetting(), max: 10 });

const query = (text, params) => pool.query(text, params);
const one = async (text, params) => (await pool.query(text, params)).rows[0] || null;
const many = async (text, params) => (await pool.query(text, params)).rows;

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = { pool, query, one, many, migrate };
