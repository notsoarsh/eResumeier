const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const matchingService = require('../services/matching.service');
const emailService = require('../services/email.service');
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
              jp.company AS job_company,
              jp.requirements_json AS job_parsed,
              fv_r.vector_data AS resume_vector,
              fv_j.vector_data AS job_vector
       FROM match_results mr
       JOIN resumes r ON r.resume_id = mr.resume_id
       JOIN job_postings jp ON jp.job_id = mr.job_id
       LEFT JOIN feature_vectors fv_r ON fv_r.entity_id = mr.resume_id AND fv_r.entity_type = 'resume'
       LEFT JOIN feature_vectors fv_j ON fv_j.entity_id = mr.job_id AND fv_j.entity_type = 'job'
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

// POST /api/match/send-shortlist - Send shortlist email to a candidate
router.post('/send-shortlist', authenticate, authorize('admin', 'employer'), async (req, res) => {
  try {
    const { matchId } = req.body;
    if (!matchId) return res.status(400).json({ error: 'matchId is required.' });

    // Get match details with candidate and job info
    const result = await pool.query(
      `SELECT mr.*, u.email AS candidate_email, u.first_name, u.last_name,
              jp.title AS job_title, jp.company
       FROM match_results mr
       JOIN resumes r ON r.resume_id = mr.resume_id
       JOIN users u ON u.user_id = r.user_id
       JOIN job_postings jp ON jp.job_id = mr.job_id
       WHERE mr.match_id = $1`,
      [matchId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Match not found.' });

    const match = result.rows[0];
    const score = match.justification_json?.percentage || Math.round(match.similarity_score * 100);

    await emailService.sendShortlistEmail({
      candidateEmail: match.candidate_email,
      candidateName: `${match.first_name} ${match.last_name}`,
      jobTitle: match.job_title,
      company: match.company,
      score,
    });

    res.json({ message: `Shortlist email sent to ${match.candidate_email}` });
  } catch (err) {
    logger.error(`Send shortlist email error: ${err.message}`);
    res.status(500).json({ error: err.message });
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
