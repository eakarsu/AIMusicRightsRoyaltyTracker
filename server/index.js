'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { getJwtSecret, authenticateToken } = require('./middleware/auth');

getJwtSecret();
if (!process.env.DATABASE_URL && (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD)) throw new Error('Database configuration is incomplete');

const app = express();
const origins = String(process.env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
app.use(helmet());
app.use(cors({ credentials: true, origin: (origin, callback) => (!origin || origins.includes(origin)) ? callback(null, true) : callback(new Error('origin not allowed')) }));
app.use(express.json({ limit: '2mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'governed-music-rights-royalties' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/governed-royalties', require('./routes/governedRoyalties')(authenticateToken));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

const port = Number(process.env.SERVER_PORT);
if (!Number.isInteger(port) || port < 1) throw new Error('SERVER_PORT is required');
app.listen(port, () => console.log(`Governed royalty API listening on ${port}`));
