'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticateToken, getJwtSecret } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password, tenantId } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const result = await pool.query(
      `SELECT u.id,u.email,u.password,u.name,m.tenant_id,m.role
       FROM users u JOIN royalty_tenant_memberships m ON m.user_id=u.id AND m.active=TRUE
       WHERE LOWER(u.email)=LOWER($1) AND ($2::BIGINT IS NULL OR m.tenant_id=$2)
       ORDER BY m.tenant_id LIMIT 2`,
      [email, tenantId || null]
    );
    if (!tenantId && result.rows.length > 1) return res.status(400).json({ error: 'tenantId is required for users with multiple memberships' });
    const row = result.rows[0];
    if (!row || !await bcrypt.compare(password, row.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const user = { id: row.id, email: row.email, name: row.name, tenantId: row.tenant_id, role: row.role };
    const token = jwt.sign(user, getJwtSecret(), { expiresIn: process.env.JWT_TTL || '1h', issuer: 'music-rights-royalty-tracker' });
    return res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(503).json({ error: 'Authentication service unavailable' });
  }
});

router.get('/me', authenticateToken, (req, res) => res.json({ user: req.user }));

module.exports = router;
