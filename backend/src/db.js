require('dotenv').config();
const { Pool } = require('pg');

// Same pool works against local Docker Postgres or Supabase Postgres —
// only DATABASE_URL and DATABASE_SSL change between environments.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err);
});

module.exports = pool;
