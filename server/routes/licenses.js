const express = require('express');
const { RightsLicense, sequelize } = require('../models');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../services/openRouterService');
const router = express.Router();

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

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const { count, rows } = await RightsLicense.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    res.json({ data: rows, page, limit, total: count, totalPages: Math.ceil(count / limit) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await RightsLicense.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { songTitle, licenseType, licensee, licensor } = req.body;
    if (!songTitle || !songTitle.trim()) return res.status(400).json({ error: 'Song title is required' });
    if (!licenseType || !licenseType.trim()) return res.status(400).json({ error: 'License type is required' });
    if (!licensee || !licensee.trim()) return res.status(400).json({ error: 'Licensee is required' });
    if (!licensor || !licensor.trim()) return res.status(400).json({ error: 'Licensor is required' });
    const item = await RightsLicense.create(req.body);
    res.status(201).json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await RightsLicense.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await RightsLicense.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Rights conflict detector
router.post('/check-conflicts', auth, async (req, res) => {
  try {
    const { catalogId, territory, start_date, end_date } = req.body;
    if (!territory) return res.status(400).json({ error: 'Territory is required' });

    // Query overlapping licenses
    const whereClause = `
      WHERE (territory = :territory OR territory = 'Worldwide' OR :territory = 'Worldwide')
      AND (:start_date IS NULL OR end_date >= :start_date OR end_date IS NULL)
      AND (:end_date IS NULL OR start_date <= :end_date OR start_date IS NULL)
    `;
    const [overlapping] = await sequelize.query(
      `SELECT * FROM rights_licenses ${whereClause} LIMIT 20`,
      { replacements: { territory, start_date: start_date || null, end_date: end_date || null } }
    );

    const systemPrompt = `You are a music rights expert. Analyze license conflicts and return JSON: { "conflicts_found": bool, "conflicts": [{"license_id": number, "conflict_type": "string", "territory": "string", "overlap_period": "string"}], "resolution_options": [] }`;
    const userPrompt = `Analyze these potential license conflicts for territory "${territory}" from ${start_date || 'any date'} to ${end_date || 'any date'}:\n${JSON.stringify(overlapping)}`;

    const result = await callOpenRouter(systemPrompt, userPrompt);
    const text = result.choices[0].message.content;
    const structured = parseAIJson(text);

    res.json({
      overlapping_licenses: overlapping,
      analysis: text,
      structured,
      model: result.model
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
