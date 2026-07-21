'use strict';

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: true } : undefined
});

module.exports = pool;
