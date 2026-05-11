const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// GET /api/levels  — all levels with completion info per session
router.get('/', (req, res) => {
  const { session } = req.query;
  const levels = db.prepare('SELECT * FROM levels ORDER BY order_num').all();

  if (!session) return res.json(levels.map(l => ({ ...l, completed: false, score: 0 })));

  const progress = db.prepare(
    'SELECT level_id, completed, score, total, watched_video FROM progress WHERE session_id = ?'
  ).all(session);

  const progressMap = {};
  progress.forEach(p => (progressMap[p.level_id] = p));

  res.json(levels.map(l => ({
    ...l,
    ...( progressMap[l.id] || { completed: false, score: 0, total: 0 }),
  })));
});

// GET /api/levels/:id
router.get('/:id', (req, res) => {
  const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(req.params.id);
  if (!level) return res.status(404).json({ error: 'Level not found' });
  res.json(level);
});

module.exports = router;
