const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// GET /api/questions/level/:levelId?count=12
// Returns a random selection of 10–15 questions for a level
router.get('/level/:levelId', (req, res) => {
  const count = Math.min(15, Math.max(10, parseInt(req.query.count) || 12));
  const questions = db
    .prepare('SELECT * FROM questions WHERE level_id = ? ORDER BY RANDOM() LIMIT ?')
    .all(req.params.levelId, count);

  if (!questions.length) return res.status(404).json({ error: 'No questions found' });

  // Parse JSON fields before sending
  const parsed = questions.map(q => ({
    ...q,
    choices: q.choices ? JSON.parse(q.choices) : null,
    // Do NOT expose correct_answer to the client here
    correct_answer: undefined,
    explanation: undefined,
  }));

  res.json(parsed);
});

// POST /api/questions/:id/answer  — check an answer
router.post('/:id/answer', (req, res) => {
  const { answer } = req.body;
  if (answer === undefined) return res.status(400).json({ error: 'answer is required' });

  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found' });

  let correct = false;

  if (q.type === 'mcq' || q.type === 'identify') {
    correct = answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

  } else if (q.type === 'wh' || q.type === 'fill') {
    const accepted = JSON.parse(q.correct_answer);
    const userAnswer = answer.trim().toLowerCase();
    correct = accepted.some(a => userAnswer.includes(a.toLowerCase()) || a.toLowerCase().includes(userAnswer));

  } else if (q.type === 'code') {
    const { keywords } = JSON.parse(q.correct_answer);
    const userCode = answer.toLowerCase();
    correct = keywords.every(kw => userCode.includes(kw.toLowerCase()));
  }

  res.json({ correct, explanation: q.explanation, correct_answer: q.correct_answer });
});

module.exports = router;
