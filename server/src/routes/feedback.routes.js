const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const pool = require('../db/pool');
const logger = require('../utils/logger');

// POST /api/feedback - Submit feedback on a match
router.post('/', authenticate, async (req, res) => {
  try {
    const { matchId, rating, comment } = req.body;

    if (!matchId || !rating) {
      return res.status(400).json({ error: 'matchId and rating (1-5) are required.' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    // Verify match exists
    const matchCheck = await pool.query('SELECT match_id FROM match_results WHERE match_id = $1', [matchId]);
    if (matchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found.' });
    }

    const result = await pool.query(
      `INSERT INTO feedback (match_id, rater_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING feedback_id, rating, comment, created_at`,
      [matchId, req.user.userId, rating, comment || null]
    );

    logger.info(`Feedback submitted for match ${matchId}: ${rating}/5`);
    res.status(201).json({ message: 'Feedback submitted.', feedback: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You already submitted feedback for this match.' });
    }
    logger.error(`Feedback error: ${err.message}`);
    res.status(500).json({ error: 'Failed to submit feedback.' });
  }
});

// GET /api/feedback/:matchId - Get feedback for a match
router.get('/:matchId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, u.first_name, u.last_name
       FROM feedback f
       JOIN users u ON u.user_id = f.rater_id
       WHERE f.match_id = $1
       ORDER BY f.created_at DESC`,
      [req.params.matchId]
    );

    res.json({ feedback: result.rows });
  } catch (err) {
    logger.error(`Get feedback error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch feedback.' });
  }
});

module.exports = router;
