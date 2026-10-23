'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const fpPath = path.join(__dirname, '../server/routes/fpWave40.js');
const fp = require(fpPath);
const express = createRequire(fpPath)('express');
function auth(req, res, next) {
  const id = req.headers['x-test-user'];
  if (!id) return res.status(401).json({ error: 'Access token required' });
  req.user = { id }; next();
}
async function withServer(fn) {
  const app = express(); app.use(express.json());
  app.use('/api/fp', fp.createRouter ? fp.createRouter({ auth }) : fp({ auth }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.on('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api/fp`;
  try { await fn(base); } finally { await new Promise(r => server.close(r)); }
}
const H = { 'Content-Type': 'application/json', 'x-test-user': 'user-1' };

test('fp: unauthenticated tasks list is 401', async () => {
  await withServer(async (base) => {
    const r = await fetch(`${base}/tasks`);
    assert.equal(r.status, 401);
  });
});

test('fp: create/list search-filter/update and export', async () => {
  await withServer(async (base) => {
    let r = await fetch(`${base}/tasks`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'Alpha task', status: 'todo', priority: 'high' }) });
    assert.equal(r.status, 201); const created = await r.json(); assert.ok(created.id);
    r = await fetch(`${base}/tasks`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'Beta task', status: 'done', priority: 'low' }) });
    assert.equal(r.status, 201);
    r = await fetch(`${base}/tasks`, { method: 'POST', headers: H, body: JSON.stringify({ title: '' }) });
    assert.equal(r.status, 400);
    r = await fetch(`${base}/tasks?q=Alpha`, { headers: H }); let body = await r.json();
    assert.equal(body.total, 1); assert.equal(body.data[0].title, 'Alpha task');
    r = await fetch(`${base}/tasks?status=done`, { headers: H }); body = await r.json();
    assert.equal(body.total, 1); assert.equal(body.data[0].title, 'Beta task');
    r = await fetch(`${base}/tasks/${created.id}`, { method: 'PUT', headers: H, body: JSON.stringify({ status: 'done' }) });
    assert.equal(r.status, 200); assert.equal((await r.json()).status, 'done');
    r = await fetch(`${base}/tasks/does-not-exist`, { method: 'PUT', headers: H, body: JSON.stringify({ status: 'done' }) });
    assert.equal(r.status, 404);
    r = await fetch(`${base}/tasks/export?format=csv`, { headers: H });
    assert.match(r.headers.get('content-type') || '', /text\/csv/);
    assert.match(await r.text(), /Alpha task/);
    r = await fetch(`${base}/tasks/export?format=json`, { headers: H }); body = await r.json();
    assert.equal(body.total, 2);
    // isolation: other user sees none
    r = await fetch(`${base}/tasks`, { headers: { 'x-test-user': 'user-2' } }); body = await r.json();
    assert.equal(body.total, 0);
  });
});

test('fp: AI features are labelled deterministic fallback over own records', async () => {
  await withServer(async (base) => {
    const features = fp.FEATURES; assert.ok(features.length >= 2 && features.length <= 3);
    for (const f of features) {
      const r = await fetch(`${base}/ai/${f.id}`, { method: 'POST', headers: H, body: JSON.stringify({}) });
      assert.equal(r.status, 200); const body = await r.json();
      assert.equal(body.aiGenerated, false);
      assert.equal(body.provider, 'deterministic-fallback');
      assert.ok(Array.isArray(body.sections) && body.sections.length >= 1);
      assert.equal(body.counts.total, 0);
    }
    // after creating one record, counts reflect it and empty stays honest
    await fetch(`${base}/tasks`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'Seed record' }) });
    const r = await fetch(`${base}/ai/${features[0].id}`, { method: 'POST', headers: H, body: JSON.stringify({}) });
    const body = await r.json();
    assert.equal(body.aiGenerated, false); assert.equal(body.counts.total, 1);
  });
});
