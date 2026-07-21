'use strict';

const bcrypt = require('bcryptjs');
const pool = require('../db');

async function main() {
  if (process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
    throw new Error('BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required');
  }
  const email = (process.env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || '';
  const name = (process.env.PROVISION_ADMIN_NAME || '').trim();
  const organizationName = (process.env.BOOTSTRAP_TENANT_NAME || '').trim();
  if (!email || !name || !organizationName || password.length < 12) {
    throw new Error('Admin email, name, organization, and a 12+ character password are required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let organization = await client.query(
      'SELECT id FROM royalty_organizations WHERE name = $1 ORDER BY id LIMIT 1 FOR UPDATE',
      [organizationName]
    );
    if (!organization.rows.length) {
      organization = await client.query('INSERT INTO royalty_organizations (name) VALUES ($1) RETURNING id', [organizationName]);
    }
    let user = await client.query('SELECT id FROM users WHERE lower(email) = $1 FOR UPDATE', [email]);
    if (!user.rows.length) {
      const hash = await bcrypt.hash(password, 12);
      user = await client.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [email, hash, name, 'admin']
      );
    }
    await client.query(
      `INSERT INTO royalty_tenant_memberships (tenant_id, user_id, role, active)
       VALUES ($1, $2, 'admin', TRUE)
       ON CONFLICT (tenant_id, user_id) DO NOTHING`,
      [organization.rows[0].id, user.rows[0].id]
    );
    await client.query('COMMIT');
    console.log('Initial tenant admin is ready; existing credentials were not changed.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
