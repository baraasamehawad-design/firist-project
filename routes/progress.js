const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// GET /api/progress/:sessionId
router.get('/:sessionId', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM progress WHERE session_id = ? ORDER BY level_id')
    .all(req.params.sessionId);
  res.json(rows);
});

// POST /api/progress  — start or reset a level attempt
router.post('/', (req, res) => {
  const { session_id, level_id, watched_video = 0 } = req.body;
  if (!session_id || !level_id) return res.status(400).json({ error: 'session_id and level_id required' });

  // Remove any previous incomplete attempt for this session+level
  db.prepare('DELETE FROM progress WHERE session_id = ? AND level_id = ? AND completed = 0')
    .run(session_id, level_id);

  const result = db
    .prepare('INSERT INTO progress (session_id, level_id, watched_video) VALUES (?, ?, ?)')
    .run(session_id, level_id, watched_video ? 1 : 0);

  res.json({ id: result.lastInsertRowid });
});

// PATCH /api/progress/:id  — update score / mark complete
router.patch('/:id', (req, res) => {
  const { score, total, completed, watched_video } = req.body;
  const existing = db.prepare('SELECT * FROM progress WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Progress record not found' });

  db.prepare(`
    UPDATE progress SET
      score = COALESCE(?, score),
      total = COALESCE(?, total),
      completed = COALESCE(?, completed),
      watched_video = COALESCE(?, watched_video),
      completed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE completed_at END
    WHERE id = ?
  `).run(
    score ?? null,
    total ?? null,
    completed !== undefined ? (completed ? 1 : 0) : null,
    watched_video !== undefined ? (watched_video ? 1 : 0) : null,
    completed ? 1 : 0,
    req.params.id
  );

  res.json({ ok: true });
});

module.exports = router;
