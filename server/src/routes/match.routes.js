const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const matchingService = require('../services/matching.service');
const pool = require('../db/pool');
const logger = require('../utils/logger');

// POST /api/match/run - Trigger a full matching run
router.post('/run', authenticate, async (req, res) => {
  try {
    const { candidateIds, jobIds } = req.body;

    logger.info(`Match run triggered by user ${req.user.userId}`);

    const result = await matchingService.runFullMatch(
      req.user.userId,
      candidateIds || null,
      jobIds || null
    );

    res.status(201).json({
      message: `Matching complete. ${result.matchCount} stable pairs found.`,
      ...result,
    });
  } catch (err) {
    logger.error(`Match run error: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/match/results/:runId - Get results of a specific run
router.get('/results/:runId', authenticate, async (req, res) => {
  try {
    // Fetch run metadata
    const runResult = await pool.query(
      'SELECT * FROM match_runs WHERE run_id = $1',
      [req.params.runId]
    );

    if (runResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match run not found.' });
    }

    // Fetch individual match results with resume and job details
    const matchesResult = await pool.query(
      `SELECT mr.*,
              r.original_filename AS resume_name,
              r.parsed_json AS resume_parsed,
              jp.title AS job_title,
              jp.company AS job_company
       FROM match_results mr
       JOIN resumes r ON r.resume_id = mr.resume_id
       JOIN job_postings jp ON jp.job_id = mr.job_id
       WHERE mr.run_id = $1
       ORDER BY mr.rank ASC`,
      [req.params.runId]
    );

    res.json({
      run: runResult.rows[0],
      matches: matchesResult.rows,
    });
  } catch (err) {
    logger.error(`Get match results error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch match results.' });
  }
});

// GET /api/match/history - List all past matching runs
router.get('/history', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mr.*,
              u.first_name || ' ' || u.last_name AS initiated_by_name
       FROM match_runs mr
       LEFT JOIN users u ON u.user_id = mr.initiated_by
       ORDER BY mr.created_at DESC
       LIMIT 50`
    );

    res.json({ runs: result.rows });
  } catch (err) {
    logger.error(`Match history error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch match history.' });
  }
});

// GET /api/match/scores/:resumeId - Get all scores for a specific resume
router.get('/scores/:resumeId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mr.*, jp.title AS job_title, jp.company AS job_company
       FROM match_results mr
       JOIN job_postings jp ON jp.job_id = mr.job_id
       WHERE mr.resume_id = $1
       ORDER BY mr.similarity_score DESC`,
      [req.params.resumeId]
    );

    res.json({ scores: result.rows });
  } catch (err) {
    logger.error(`Resume scores error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch scores.' });
  }
});

module.exports = router;
