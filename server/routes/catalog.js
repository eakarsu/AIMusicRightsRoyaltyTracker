const express = require('express');
const { MusicCatalog } = require('../models');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const { count, rows } = await MusicCatalog.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    res.json({ data: rows, page, limit, total: count, totalPages: Math.ceil(count / limit) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await MusicCatalog.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    if (!artist || !artist.trim()) return res.status(400).json({ error: 'Artist is required' });
    const item = await MusicCatalog.create(req.body);
    res.status(201).json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await MusicCatalog.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await MusicCatalog.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
