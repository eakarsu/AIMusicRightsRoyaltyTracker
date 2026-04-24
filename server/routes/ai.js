const express = require('express');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../services/openRouterService');
const { MusicCatalog, RightsLicense, RoyaltyCalculation, Contract } = require('../models');
const router = express.Router();

// AI Plagiarism Detection
router.post('/plagiarism-detection', auth, async (req, res) => {
  try {
    const { songTitle, lyrics, melody, artist } = req.body;
    const systemPrompt = `You are an expert music plagiarism analyst. Analyze the provided song details for potential plagiarism issues. Consider melody patterns, lyrical similarities, chord progressions, and rhythm patterns. Provide a detailed analysis with risk score (0-100), similar songs found, specific areas of concern, and recommendations. Format your response as structured JSON with fields: riskScore, overallAssessment, similarSongs (array with title, artist, similarity percentage, matchedElements), areasOfConcern (array), recommendations (array), legalRisk (low/medium/high), and detailedAnalysis.`;
    const userPrompt = `Analyze this song for plagiarism:\nTitle: ${songTitle}\nArtist: ${artist || 'Unknown'}\nLyrics: ${lyrics || 'Not provided'}\nMelody Description: ${melody || 'Not provided'}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ analysis: result.choices[0].message.content, model: result.model, usage: result.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// AI Catalog Valuation
router.post('/catalog-valuation', auth, async (req, res) => {
  try {
    const { catalogId } = req.body;
    let catalogData;
    if (catalogId) {
      catalogData = await MusicCatalog.findByPk(catalogId);
    }
    const songs = await MusicCatalog.findAll({ limit: 20 });
    const systemPrompt = `You are an expert music catalog valuation analyst. Analyze the provided music catalog data and provide a comprehensive valuation. Consider streaming performance, genre trends, catalog age, artist popularity, and market conditions. Provide your response as structured JSON with fields: totalValuation, valuationRange (min, max), methodology, perSongValuation (array with title, estimatedValue, factors), marketAnalysis, growthProjection (1yr, 3yr, 5yr percentages), riskFactors (array), opportunities (array), and confidenceScore (0-100).`;
    const userPrompt = `Value this music catalog:\n${catalogData ? `Specific Song: ${JSON.stringify(catalogData)}` : ''}\nFull Catalog: ${JSON.stringify(songs.map(s => ({ title: s.title, artist: s.artist, genre: s.genre, releaseDate: s.releaseDate, estimatedValue: s.estimatedValue })))}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ analysis: result.choices[0].message.content, model: result.model, usage: result.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// AI Rights Clearance
router.post('/rights-clearance', auth, async (req, res) => {
  try {
    const { songTitle, usageType, territory, licensee } = req.body;
    const licenses = await RightsLicense.findAll({ limit: 20 });
    const systemPrompt = `You are an expert music rights clearance specialist. Analyze the rights clearance request and existing licenses to determine clearance feasibility. Provide your response as structured JSON with fields: clearanceStatus (cleared/pending/blocked/needs-review), clearanceScore (0-100), existingRights (array of relevant existing licenses), conflictsFound (array), requiredPermissions (array with rightsHolder, type, estimatedCost), estimatedTimeline, estimatedCost, recommendations (array), legalConsiderations (array), and nextSteps (array).`;
    const userPrompt = `Rights clearance request:\nSong: ${songTitle}\nUsage Type: ${usageType || 'Commercial'}\nTerritory: ${territory || 'Worldwide'}\nLicensee: ${licensee || 'Not specified'}\nExisting Licenses: ${JSON.stringify(licenses.map(l => ({ song: l.songTitle, type: l.licenseType, licensee: l.licensee, territory: l.territory, status: l.status })))}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ analysis: result.choices[0].message.content, model: result.model, usage: result.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// AI Royalty Forecasting
router.post('/royalty-forecasting', auth, async (req, res) => {
  try {
    const { songTitle, platform, period } = req.body;
    const royalties = await RoyaltyCalculation.findAll({ limit: 30 });
    const systemPrompt = `You are an expert music royalty forecasting analyst. Based on historical royalty data, predict future earnings. Provide your response as structured JSON with fields: forecast (array with period, predictedRevenue, confidence), totalProjectedRevenue, growthRate, seasonalTrends (array), platformBreakdown (array with platform, projectedRevenue, trend), riskFactors (array), opportunities (array), methodology, confidenceLevel (low/medium/high), and keyAssumptions (array).`;
    const userPrompt = `Forecast royalties:\nSong: ${songTitle || 'All catalog'}\nPlatform: ${platform || 'All platforms'}\nForecast Period: ${period || '12 months'}\nHistorical Data: ${JSON.stringify(royalties.map(r => ({ song: r.songTitle, platform: r.platform, streams: r.streams, totalRoyalty: r.totalRoyalty, period: r.period })))}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ analysis: result.choices[0].message.content, model: result.model, usage: result.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// AI Contract Analysis
router.post('/contract-analysis', auth, async (req, res) => {
  try {
    const { contractId, contractText } = req.body;
    let contractData;
    if (contractId) {
      contractData = await Contract.findByPk(contractId);
    }
    const systemPrompt = `You are an expert music industry contract analyst. Analyze the contract details and provide comprehensive insights. Provide your response as structured JSON with fields: overallScore (0-100), fairnessRating (very-unfair/unfair/fair/favorable/very-favorable), keyTerms (array with term, assessment, impact), risks (array with risk, severity, mitigation), opportunities (array), comparisonToIndustryStandard, negotiationPoints (array with point, currentValue, suggestedValue, reasoning), redFlags (array), recommendations (array), and summary.`;
    const userPrompt = `Analyze this contract:\n${contractData ? JSON.stringify(contractData) : ''}\n${contractText ? `Contract Text: ${contractText}` : ''}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ analysis: result.choices[0].message.content, model: result.model, usage: result.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// AI Market Trend Analysis
router.post('/market-trends', auth, async (req, res) => {
  try {
    const { genre, region, timeframe } = req.body;
    const catalog = await MusicCatalog.findAll({ limit: 20 });
    const royalties = await RoyaltyCalculation.findAll({ limit: 20 });
    const systemPrompt = `You are an expert music industry market analyst. Analyze current market trends and provide insights. Provide your response as structured JSON with fields: trendSummary, topTrends (array with trend, impact, relevance), genreAnalysis (array with genre, growth, streamingShare, revenue), platformTrends (array with platform, growth, marketShare), emergingMarkets (array), seasonalPatterns (array), recommendations (array with action, priority, expectedImpact), riskFactors (array), opportunities (array), and outlook (positive/neutral/cautious/negative).`;
    const userPrompt = `Analyze market trends:\nGenre Focus: ${genre || 'All genres'}\nRegion: ${region || 'Global'}\nTimeframe: ${timeframe || 'Current year'}\nCatalog Data: ${JSON.stringify(catalog.map(c => ({ title: c.title, genre: c.genre, artist: c.artist })))}\nRoyalty Data: ${JSON.stringify(royalties.map(r => ({ platform: r.platform, streams: r.streams, revenue: r.totalRoyalty })))}`;
    const result = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ analysis: result.choices[0].message.content, model: result.model, usage: result.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
