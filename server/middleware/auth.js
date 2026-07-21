'use strict';

const jwt = require('jsonwebtoken');
const pool = require('../db');

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '');
  if (secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return secret;
}

async function authenticateToken(req, res, next) {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    const claims = jwt.verify(token, getJwtSecret(), { issuer: 'music-rights-royalty-tracker' });
    if (!claims.id || !claims.tenantId) return res.status(401).json({ error: 'Active tenant membership required' });
    const membership = await pool.query(
      'SELECT role FROM royalty_tenant_memberships WHERE tenant_id=$1 AND user_id=$2 AND active=TRUE',
      [claims.tenantId, claims.id]
    );
    if (!membership.rows[0]) return res.status(403).json({ error: 'Tenant membership is inactive' });
    req.user = { ...claims, role: membership.rows[0].role };
    next();
  } catch (error) {
    if (error.message === 'Tenant membership is inactive') return res.status(403).json({ error: error.message });
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

module.exports = { authenticateToken, getJwtSecret };
