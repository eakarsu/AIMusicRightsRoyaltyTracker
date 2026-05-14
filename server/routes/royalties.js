const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { RoyaltyCalculation } = require('../models');
const auth = require('../middleware/auth');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const { count, rows } = await RoyaltyCalculation.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    res.json({ data: rows, page, limit, total: count, totalPages: Math.ceil(count / limit) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await RoyaltyCalculation.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { songTitle, platform } = req.body;
    if (!songTitle || !songTitle.trim()) return res.status(400).json({ error: 'Song title is required' });
    if (!platform || !platform.trim()) return res.status(400).json({ error: 'Platform is required' });
    const item = await RoyaltyCalculation.create(req.body);
    res.status(201).json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await RoyaltyCalculation.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await RoyaltyCalculation.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// CSV Import
router.post('/import-csv', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file is required' });

    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const imported = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      try {
        if (!r.songTitle && !r.song_title) {
          errors.push({ row: i + 2, error: 'Missing songTitle' });
          continue;
        }
        const item = await RoyaltyCalculation.create({
          songTitle: r.songTitle || r.song_title || r['Song Title'],
          platform: r.platform || r.Platform || 'Unknown',
          streams: parseInt(r.streams || r.Streams || 0) || 0,
          downloads: parseInt(r.downloads || r.Downloads || 0) || 0,
          period: r.period || r.Period || null,
          ratePerStream: parseFloat(r.ratePerStream || r.rate_per_stream || r['Rate Per Stream'] || 0) || 0,
          totalRoyalty: parseFloat(r.totalRoyalty || r.total_royalty || r['Total Royalty'] || 0) || 0,
          artistShare: parseFloat(r.artistShare || r.artist_share || 0) || 0,
          labelShare: parseFloat(r.labelShare || r.label_share || 0) || 0,
          publisherShare: parseFloat(r.publisherShare || r.publisher_share || 0) || 0,
          status: r.status || 'calculated',
          paymentDate: r.paymentDate || r.payment_date || null
        });
        imported.push(item.id);
      } catch (err) {
        errors.push({ row: i + 2, error: err.message });
      }
    }

    res.json({
      imported: imported.length,
      total_rows: records.length,
      errors,
      message: `Successfully imported ${imported.length} of ${records.length} records`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse CSV: ' + error.message });
  }
});

module.exports = router;
