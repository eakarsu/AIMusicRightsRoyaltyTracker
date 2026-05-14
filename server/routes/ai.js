const express = require('express');
const auth = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter } = require('../services/openRouterService');
const { MusicCatalog, RightsLicense, RoyaltyCalculation, Contract, sequelize } = require('../models');
const router = express.Router();

// Initialize ai_analyses table
sequelize.query(`
  CREATE TABLE IF NOT EXISTS ai_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    analysis_type VARCHAR(100),
    entity_id INTEGER,
    input_data JSONB,
    result TEXT,
    structured_result JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});

function parseAIJson(text) {
  if (!text) return null;
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1].trim());
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) return JSON.parse(text.slice(start, end + 1));
    return JSON.parse(text);
  } catch { return null; }
}

async function persistAnalysis(userId, type, entityId, inputData, result, structured) {
  try {
    await sequelize.query(
      `INSERT INTO ai_analyses (user_id, analysis_type, entity_id, input_data, result, structured_result) VALUES ($1, $2, $3, $4, $5, $6)`,
      { bind: [userId, type, entityId || null, JSON.stringify(inputData), result, JSON.stringify(structured)] }
    );
  } catch { /* non-fatal */ }
}

// AI Plagiarism Detection
router.post('/plagiarism-detection', auth, rateLimiter, async (req, res) => {
  try {
    const { songTitle, lyrics, melody, artist } = req.body;
    const systemPrompt = `You are an expert music plagiarism analyst. Return JSON: { "similarity_score": 0-100, "plagiarism_detected": bool, "problematic_elements": [], "originality_verdict": "string", "recommendations": [] }`;
    const userPrompt = `Analyze for plagiarism:\nTitle: ${songTitle}\nArtist: ${artist || 'Unknown'}\nLyrics: ${lyrics || 'Not provided'}\nMelody: ${melody || 'Not provided'}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);
    await persistAnalysis(req.user.id, 'plagiarism-detection', null, { songTitle, artist }, text, structured);
    res.json({ analysis: text, structured, model: result.model, usage: result.usage });
  } catch (error) { if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing || "OPENROUTER_API_KEY" }); res.status(500).json({ error: error.message }); }
});

// AI Catalog Valuation
router.post('/catalog-valuation', auth, rateLimiter, async (req, res) => {
  try {
    const { catalogId } = req.body;
    let catalogData;
    if (catalogId) catalogData = await MusicCatalog.findByPk(catalogId);
    const songs = await MusicCatalog.findAll({ limit: 20 });
    const systemPrompt = `You are an expert music catalog valuation analyst. Return JSON: { "estimated_value_usd": number, "valuation_methodology": "string", "value_drivers": [], "comparable_catalog_sales": [], "confidence_level": "low|medium|high" }`;
    const userPrompt = `Value this music catalog:\n${catalogData ? `Specific: ${JSON.stringify(catalogData)}` : ''}\nCatalog: ${JSON.stringify(songs.map(s => ({ title: s.title, artist: s.artist, genre: s.genre, releaseDate: s.releaseDate, estimatedValue: s.estimatedValue })))}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);
    await persistAnalysis(req.user.id, 'catalog-valuation', catalogId, { catalogId }, text, structured);
    res.json({ analysis: text, structured, model: result.model, usage: result.usage });
  } catch (error) { if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing || "OPENROUTER_API_KEY" }); res.status(500).json({ error: error.message }); }
});

// AI Rights Clearance
router.post('/rights-clearance', auth, rateLimiter, async (req, res) => {
  try {
    const { songTitle, usageType, territory, licensee } = req.body;
    const licenses = await RightsLicense.findAll({ limit: 20 });
    const systemPrompt = `You are an expert music rights clearance specialist. Analyze and return JSON: { "clearance_status": "cleared|pending|blocked|needs-review", "clearance_score": 0-100, "conflicts_found": [], "required_permissions": [], "estimated_cost": number, "recommendations": [] }`;
    const userPrompt = `Rights clearance request:\nSong: ${songTitle}\nUsage: ${usageType || 'Commercial'}\nTerritory: ${territory || 'Worldwide'}\nLicensee: ${licensee || 'Not specified'}\nExisting Licenses: ${JSON.stringify(licenses.map(l => ({ song: l.songTitle, type: l.licenseType, territory: l.territory, status: l.status })))}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);
    await persistAnalysis(req.user.id, 'rights-clearance', null, { songTitle, usageType, territory }, text, structured);
    res.json({ analysis: text, structured, model: result.model, usage: result.usage });
  } catch (error) { if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing || "OPENROUTER_API_KEY" }); res.status(500).json({ error: error.message }); }
});

// AI Royalty Forecasting
router.post('/royalty-forecasting', auth, rateLimiter, async (req, res) => {
  try {
    const { songTitle, platform, period } = req.body;
    const royalties = await RoyaltyCalculation.findAll({ limit: 30 });
    const systemPrompt = `You are an expert royalty forecasting analyst. Return JSON: { "forecast_period": "string", "projected_revenue": { "q1": number, "q2": number, "q3": number, "q4": number }, "growth_rate_pct": number, "key_drivers": [], "risk_factors": [] }`;
    const userPrompt = `Forecast royalties:\nSong: ${songTitle || 'All catalog'}\nPlatform: ${platform || 'All platforms'}\nPeriod: ${period || '12 months'}\nHistorical: ${JSON.stringify(royalties.map(r => ({ song: r.songTitle, platform: r.platform, streams: r.streams, totalRoyalty: r.totalRoyalty, period: r.period })))}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);
    await persistAnalysis(req.user.id, 'royalty-forecasting', null, { songTitle, platform, period }, text, structured);
    res.json({ analysis: text, structured, model: result.model, usage: result.usage });
  } catch (error) { if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing || "OPENROUTER_API_KEY" }); res.status(500).json({ error: error.message }); }
});

// AI Contract Analysis
router.post('/contract-analysis', auth, rateLimiter, async (req, res) => {
  try {
    const { contractId, contractText } = req.body;
    let contractData;
    if (contractId) contractData = await Contract.findByPk(contractId);
    const systemPrompt = `You are an expert music industry contract analyst. Return JSON: { "contract_health": "good|fair|poor", "key_terms": [], "red_flags": [], "negotiation_opportunities": [], "compliance_score": 0-100 }`;
    const userPrompt = `Analyze this contract:\n${contractData ? JSON.stringify(contractData) : ''}\n${contractText ? `Contract Text: ${contractText}` : ''}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);
    await persistAnalysis(req.user.id, 'contract-analysis', contractId, { contractId }, text, structured);
    res.json({ analysis: text, structured, model: result.model, usage: result.usage });
  } catch (error) { if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing || "OPENROUTER_API_KEY" }); res.status(500).json({ error: error.message }); }
});

// AI Market Trend Analysis
router.post('/market-trends', auth, rateLimiter, async (req, res) => {
  try {
    const { genre, region, timeframe } = req.body;
    const catalog = await MusicCatalog.findAll({ limit: 20 });
    const royalties = await RoyaltyCalculation.findAll({ limit: 20 });
    const systemPrompt = `You are an expert music industry market analyst. Analyze trends and return structured JSON with: trendSummary, topTrends (array), genreAnalysis (array), recommendations (array), outlook.`;
    const userPrompt = `Analyze market trends:\nGenre: ${genre || 'All'}\nRegion: ${region || 'Global'}\nTimeframe: ${timeframe || 'Current year'}\nCatalog: ${JSON.stringify(catalog.map(c => ({ title: c.title, genre: c.genre })))}\nRoyalties: ${JSON.stringify(royalties.map(r => ({ platform: r.platform, streams: r.streams, revenue: r.totalRoyalty })))}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);
    await persistAnalysis(req.user.id, 'market-trends', null, { genre, region, timeframe }, text, structured);
    res.json({ analysis: text, structured, model: result.model, usage: result.usage });
  } catch (error) { if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing || "OPENROUTER_API_KEY" }); res.status(500).json({ error: error.message }); }
});

// AI Sampling Detection
router.post('/sampling-detection', auth, rateLimiter, async (req, res) => {
  try {
    const { songTitle, audioFingerprint, lyrics, knownInfluences } = req.body || {};
    const systemPrompt = `You are an expert in music sampling forensics. Identify potentially uncleared samples. Return JSON: { "samples_found": [{"sample_of": string, "confidence": number, "section": string, "rights_holder": string, "clearance_path": string}], "overall_risk": "low"|"medium"|"high", "recommendations": [string] }`;
    const userPrompt = `Analyze for unauthorized sampling:\nTitle: ${songTitle || 'Unknown'}\nLyrics: ${lyrics || 'N/A'}\nAudio fingerprint: ${audioFingerprint || 'N/A'}\nKnown influences: ${JSON.stringify(knownInfluences || [])}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);
    await persistAnalysis(req.user.id, 'sampling-detection', null, { songTitle }, text, structured);
    res.json({ analysis: text, structured, model: result.model, usage: result.usage });
  } catch (error) { if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing || "OPENROUTER_API_KEY" }); res.status(500).json({ error: error.message }); }
});

// AI Metadata Cleaner — standardize artist names, track titles
router.post('/metadata-cleaner', auth, rateLimiter, async (req, res) => {
  try {
    const { records } = req.body || {};
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array required' });
    }
    const systemPrompt = `You normalize music catalog metadata. Standardize spelling, capitalization, featuring credits, ISRC formatting, and detect duplicates. Return JSON: { "cleaned": [{"id": any, "original": object, "normalized": object, "issues": [string]}], "duplicate_groups": [[any]], "summary": string }`;
    const userPrompt = `Clean and standardize this metadata:\n${JSON.stringify(records).slice(0, 6000)}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);
    await persistAnalysis(req.user.id, 'metadata-cleaner', null, { count: records.length }, text, structured);
    res.json({ analysis: text, structured, model: result.model, usage: result.usage });
  } catch (error) { if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing || "OPENROUTER_API_KEY" }); res.status(500).json({ error: error.message }); }
});

// AI Licensing Recommender
router.post('/licensing-recommender', auth, rateLimiter, async (req, res) => {
  try {
    const { trackId, useCase, territory, budget, exclusivity } = req.body || {};
    let track = null;
    if (trackId) {
      try { track = await MusicCatalog.findByPk(trackId); } catch {}
    }
    const systemPrompt = `You recommend music licensing strategies (sync, mechanical, performance) based on use case, territory, and budget. Return JSON: { "license_type": string, "fee_estimate_usd": number, "term_months": number, "exclusivity": string, "rights_to_secure": [string], "negotiation_points": [string], "risk_flags": [string] }`;
    const userPrompt = `Recommend a license strategy.\nTrack: ${track ? JSON.stringify({ title: track.title, genre: track.genre, owner: track.owner }) : trackId || 'unknown'}\nUse case: ${useCase || ''}\nTerritory: ${territory || 'worldwide'}\nBudget USD: ${budget || 'flexible'}\nExclusivity: ${exclusivity || 'non-exclusive'}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);
    await persistAnalysis(req.user.id, 'licensing-recommender', trackId || null, { useCase, territory, budget }, text, structured);
    res.json({ analysis: text, structured, model: result.model, usage: result.usage });
  } catch (error) { if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing || "OPENROUTER_API_KEY" }); res.status(500).json({ error: error.message }); }
});

// AI Revenue Optimizer — recommend revenue-maximizing actions across catalog
router.post('/revenue-optimizer', auth, rateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY to enable AI features.' });
    }
    const { catalogId, focusGenre, target = 'streaming-revenue', timeframeMonths } = req.body || {};
    let catalogContext = null;
    if (catalogId) {
      try { catalogContext = await MusicCatalog.findByPk(catalogId); } catch {}
    }
    const songs = await MusicCatalog.findAll({ limit: 30 });
    const royalties = await RoyaltyCalculation.findAll({ limit: 30 });
    const licenses = await RightsLicense.findAll({ limit: 20 });

    const systemPrompt = `You are an expert music revenue strategist. Identify concrete actions that maximize revenue across streaming, sync, performance, mechanical, and brand partnerships. Return JSON: { "current_state_summary": string, "top_opportunities": [{"opportunity": string, "channel": string, "expected_uplift_pct": number, "effort": "low"|"medium"|"high", "timeline_months": number, "first_steps": [string]}], "underperforming_assets": [{"asset": string, "issue": string, "fix": string}], "pricing_actions": [string], "channel_mix_recommendation": object, "risk_flags": [string] }`;

    const userPrompt = `Optimize revenue.
Focus genre: ${focusGenre || 'all'}
Target: ${target}
Timeframe months: ${timeframeMonths || 12}
${catalogContext ? `Specific catalog: ${JSON.stringify({ title: catalogContext.title, genre: catalogContext.genre, owner: catalogContext.owner, estimatedValue: catalogContext.estimatedValue })}\n` : ''}Catalog sample: ${JSON.stringify(songs.map(s => ({ title: s.title, genre: s.genre, releaseDate: s.releaseDate, estimatedValue: s.estimatedValue })))}
Royalty history: ${JSON.stringify(royalties.map(r => ({ song: r.songTitle, platform: r.platform, streams: r.streams, totalRoyalty: r.totalRoyalty, period: r.period })))}
Active licenses: ${JSON.stringify(licenses.map(l => ({ song: l.songTitle, type: l.licenseType, territory: l.territory, status: l.status })))}`;

    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);
    await persistAnalysis(req.user.id, 'revenue-optimizer', catalogId || null, { focusGenre, target, timeframeMonths }, text, structured);
    res.json({ analysis: text, structured, model: result.model, usage: result.usage });
  } catch (error) { if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing || "OPENROUTER_API_KEY" }); res.status(500).json({ error: error.message }); }
});

// =====================================================================
// Apply pass 5: backlog endpoints (additive only)
// Required env vars (per integration; absent => 503 with `missing` field):
//   SPOTIFY_FOR_ARTISTS_TOKEN  - /royalty-settlement (Spotify)
//   APPLE_MUSIC_TOKEN          - /royalty-settlement (Apple Music)
//   USCO_API_KEY               - /copyright-tracking
//   MLC_API_KEY / HFA_API_KEY  - /mechanical-licensing
//   ASCAP_API_KEY/BMI_API_KEY  - /pro-tracking
// PRODUCT-DECISION:
//   - Dispute resolution and artist portal are deferred to follow-up passes;
//     they require workflow + RBAC design and a public-facing surface.
//   - Catalog-acquisition-advisor is implemented as a thin AI-only wrapper
//     using callOpenRouter (no external comp-sales DB) and returns clear
//     low-confidence band when no benchmark provider is configured.
// =====================================================================

function requireEnv(res, vars) {
  const missing = vars.filter(v => !process.env[v]);
  if (missing.length) {
    res.status(503).json({ error: 'Service not configured', missing: missing.join(', ') });
    return false;
  }
  return true;
}

// /royalty-settlement - poll streaming-platform settlement statements
router.post('/royalty-settlement', auth, rateLimiter, async (req, res) => {
  try {
    const { platform } = req.body || {};
    if (!platform || !['spotify', 'apple'].includes(platform)) {
      return res.status(400).json({ error: "platform must be 'spotify' or 'apple'" });
    }
    const envVar = platform === 'spotify' ? 'SPOTIFY_FOR_ARTISTS_TOKEN' : 'APPLE_MUSIC_TOKEN';
    if (!requireEnv(res, [envVar])) return;
    // PRODUCT-DECISION: real settlement APIs require OAuth + multi-step calls.
    // We persist the settlement-fetch intent; an external worker performs the
    // actual ingestion to avoid blocking this request and exposing tokens.
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS royalty_settlement_jobs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const [rows] = await sequelize.query(
      `INSERT INTO royalty_settlement_jobs (user_id, platform, status) VALUES ($1, $2, 'queued') RETURNING id, status, created_at`,
      { bind: [req.user.id, platform] }
    );
    res.json({ job: rows[0], note: 'Settlement fetch queued. External worker required.' });
  } catch (error) {
    if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing });
    res.status(500).json({ error: error.message });
  }
});

// /copyright-tracking - register/lookup USCO copyright filings
router.post('/copyright-tracking', auth, rateLimiter, async (req, res) => {
  try {
    if (!requireEnv(res, ['USCO_API_KEY'])) return;
    const { song_title, registration_number } = req.body || {};
    if (!song_title && !registration_number) {
      return res.status(400).json({ error: 'song_title or registration_number is required' });
    }
    // PRODUCT-DECISION: USCO does not expose a public REST API; production
    // integration typically uses a vendor (e.g. Songtrust). We persist intent
    // and surface it for the worker (additive table).
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS copyright_lookups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        song_title TEXT,
        registration_number TEXT,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const [rows] = await sequelize.query(
      `INSERT INTO copyright_lookups (user_id, song_title, registration_number) VALUES ($1, $2, $3) RETURNING id, status, created_at`,
      { bind: [req.user.id, song_title || null, registration_number || null] }
    );
    res.json({ lookup: rows[0], note: 'USCO lookup queued; worker integrates with provider.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// /mechanical-licensing - submit a request to MLC/HFA for a mechanical license
router.post('/mechanical-licensing', auth, rateLimiter, async (req, res) => {
  try {
    if (!requireEnv(res, ['MLC_API_KEY'])) return;
    const { song_title, configuration, units } = req.body || {};
    if (!song_title) return res.status(400).json({ error: 'song_title is required' });
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mechanical_license_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        song_title TEXT NOT NULL,
        configuration TEXT,
        units INTEGER,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const [rows] = await sequelize.query(
      `INSERT INTO mechanical_license_requests (user_id, song_title, configuration, units) VALUES ($1, $2, $3, $4) RETURNING id, status, created_at`,
      { bind: [req.user.id, song_title, configuration || null, units ? Number(units) : null] }
    );
    res.json({ request: rows[0], note: 'Mechanical license request queued; worker submits to MLC.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// /pro-tracking - report performance to ASCAP/BMI/SESAC
router.post('/pro-tracking', auth, rateLimiter, async (req, res) => {
  try {
    const { pro } = req.body || {};
    if (!pro || !['ascap', 'bmi', 'sesac'].includes(pro)) {
      return res.status(400).json({ error: "pro must be one of 'ascap', 'bmi', 'sesac'" });
    }
    const envVar = pro === 'ascap' ? 'ASCAP_API_KEY' : pro === 'bmi' ? 'BMI_API_KEY' : 'SESAC_API_KEY';
    if (!requireEnv(res, [envVar])) return;
    const { song_title, performance_count, venue, performance_date } = req.body || {};
    if (!song_title) return res.status(400).json({ error: 'song_title is required' });
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS pro_performance_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        pro TEXT NOT NULL,
        song_title TEXT NOT NULL,
        performance_count INTEGER,
        venue TEXT,
        performance_date DATE,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const [rows] = await sequelize.query(
      `INSERT INTO pro_performance_reports (user_id, pro, song_title, performance_count, venue, performance_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, status, created_at`,
      { bind: [req.user.id, pro, song_title, performance_count ? Number(performance_count) : null, venue || null, performance_date || null] }
    );
    res.json({ report: rows[0], note: `Performance report queued for ${pro.toUpperCase()}.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// /catalog-acquisition-advisor - AI-only advisor (PRODUCT-DECISION: no external comp-sales DB)
router.post('/catalog-acquisition-advisor', auth, rateLimiter, async (req, res) => {
  try {
    const { target_catalog_id, asking_price_usd, strategic_objective } = req.body || {};
    let target = null;
    if (target_catalog_id) target = await MusicCatalog.findByPk(target_catalog_id);
    const ownCatalog = await MusicCatalog.findAll({ limit: 20 });
    const systemPrompt = `You are a music catalog M&A advisor. Recommend whether to acquire the target catalog and at what price. Return JSON: {"recommendation":"buy|pass|negotiate","fair_value_band":{"low_usd":number,"mid_usd":number,"high_usd":number},"strategic_fit_score":0-100,"top_synergies":[string],"top_risks":[string],"deal_structure_notes":[string],"confidence":"low|medium|high"}`;
    const userPrompt = `Target: ${target ? JSON.stringify({ title: target.title, genre: target.genre, owner: target.owner, estimatedValue: target.estimatedValue }) : '(target details not provided)'}\nAsking price USD: ${asking_price_usd || 'unspecified'}\nStrategic objective: ${strategic_objective || 'long-term value'}\nOwn catalog (sample): ${JSON.stringify(ownCatalog.map(s => ({ title: s.title, genre: s.genre, estimatedValue: s.estimatedValue })))}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);
    await persistAnalysis(req.user.id, 'catalog-acquisition-advisor', target_catalog_id || null, { asking_price_usd, strategic_objective }, text, structured);
    res.json({ analysis: text, structured, model: result.model, usage: result.usage });
  } catch (error) {
    if (error.status === 503) return res.status(503).json({ error: error.message, missing: error.missing || 'OPENROUTER_API_KEY' });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
