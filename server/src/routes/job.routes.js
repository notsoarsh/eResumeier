const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const parserService = require('../services/parser.service');
const featureService = require('../services/feature.service');
const pool = require('../db/pool');
const logger = require('../utils/logger');

// POST /api/jobs - Create job posting (employer only)
router.post('/', authenticate, authorize('employer', 'admin'), async (req, res) => {
  try {
    const { title, company, description, location, salaryRange, employmentType, deadline } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    if (description.length < 50) {
      return res.status(400).json({ error: 'Job description must be at least 50 characters.' });
    }

    // Insert job posting
    const insertResult = await pool.query(
      `INSERT INTO job_postings (employer_id, title, company, description, location, salary_range, employment_type, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING job_id, title, status, created_at`,
      [req.user.userId, title, company || null, description, location || null, salaryRange || null, employmentType || 'full-time', deadline || null]
    );

    const job = insertResult.rows[0];

    // Parse job description with LLM (async, non-blocking for response)
    parseAndVectorizeJob(job.job_id, description).catch(err => {
      logger.error(`Background job parsing failed for ${job.job_id}: ${err.message}`);
    });

    res.status(201).json({
      message: 'Job posting created. Requirements extraction in progress.',
      job,
    });
  } catch (err) {
    logger.error(`Create job error: ${err.message}`);
    res.status(500).json({ error: 'Failed to create job posting.' });
  }
});

// GET /api/jobs - List/search jobs
router.get('/', async (req, res) => {
  try {
    const { search, location, status, employerId, limit, offset } = req.query;

    let query = 'SELECT job_id, employer_id, title, company, description, location, salary_range, employment_type, status, deadline, created_at FROM job_postings WHERE 1=1';
    const params = [];
    let paramIdx = 0;

    if (status) {
      paramIdx++;
      query += ` AND status = $${paramIdx}`;
      params.push(status);
    } else {
      // Default: only show open jobs for public listing
      paramIdx++;
      query += ` AND status = $${paramIdx}`;
      params.push('open');
    }

    if (search) {
      paramIdx++;
      query += ` AND (title ILIKE $${paramIdx} OR description ILIKE $${paramIdx} OR company ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
    }

    if (location) {
      paramIdx++;
      query += ` AND location ILIKE $${paramIdx}`;
      params.push(`%${location}%`);
    }

    if (employerId) {
      paramIdx++;
      query += ` AND employer_id = $${paramIdx}`;
      params.push(employerId);
    }

    query += ' ORDER BY created_at DESC';

    paramIdx++;
    query += ` LIMIT $${paramIdx}`;
    params.push(parseInt(limit) || 20);

    paramIdx++;
    query += ` OFFSET $${paramIdx}`;
    params.push(parseInt(offset) || 0);

    const result = await pool.query(query, params);
    res.json({ jobs: result.rows, count: result.rows.length });
  } catch (err) {
    logger.error(`List jobs error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch jobs.' });
  }
});

// GET /api/jobs/my - List employer's own jobs
router.get('/my', authenticate, authorize('employer', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.*, fv.vector_data
       FROM job_postings j
       LEFT JOIN feature_vectors fv ON fv.entity_id = j.job_id AND fv.entity_type = 'job'
       WHERE j.employer_id = $1
       ORDER BY j.created_at DESC`,
      [req.user.userId]
    );

    res.json({ jobs: result.rows });
  } catch (err) {
    logger.error(`My jobs error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch your jobs.' });
  }
});

// GET /api/jobs/:id - Get job details
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.*, fv.vector_data, fv.dimensional_meta
       FROM job_postings j
       LEFT JOIN feature_vectors fv ON fv.entity_id = j.job_id AND fv.entity_type = 'job'
       WHERE j.job_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    logger.error(`Get job error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch job.' });
  }
});

// PUT /api/jobs/:id - Update job posting
router.put('/:id', authenticate, authorize('employer', 'admin'), async (req, res) => {
  try {
    const { title, company, description, location, salaryRange, employmentType, status, deadline } = req.body;

    // Verify ownership
    const existing = await pool.query(
      'SELECT employer_id FROM job_postings WHERE job_id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (existing.rows[0].employer_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this job.' });
    }

    const result = await pool.query(
      `UPDATE job_postings SET
        title = COALESCE($1, title),
        company = COALESCE($2, company),
        description = COALESCE($3, description),
        location = COALESCE($4, location),
        salary_range = COALESCE($5, salary_range),
        employment_type = COALESCE($6, employment_type),
        status = COALESCE($7, status),
        deadline = COALESCE($8, deadline),
        updated_at = NOW()
       WHERE job_id = $9
       RETURNING *`,
      [title, company, description, location, salaryRange, employmentType, status, deadline, req.params.id]
    );

    // Re-parse if description changed
    if (description && description.length >= 50) {
      parseAndVectorizeJob(req.params.id, description).catch(err => {
        logger.error(`Re-parse job failed: ${err.message}`);
      });
    }

    res.json({ message: 'Job updated.', job: result.rows[0] });
  } catch (err) {
    logger.error(`Update job error: ${err.message}`);
    res.status(500).json({ error: 'Failed to update job.' });
  }
});

// DELETE /api/jobs/:id - Close job posting (soft delete)
router.delete('/:id', authenticate, authorize('employer', 'admin'), async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT employer_id FROM job_postings WHERE job_id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (existing.rows[0].employer_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to close this job.' });
    }

    await pool.query(
      "UPDATE job_postings SET status = 'closed', updated_at = NOW() WHERE job_id = $1",
      [req.params.id]
    );

    res.json({ message: 'Job posting closed.' });
  } catch (err) {
    logger.error(`Delete job error: ${err.message}`);
    res.status(500).json({ error: 'Failed to close job.' });
  }
});

/**
 * Background helper: Parse job description with LLM and compute feature vector
 * Falls back to keyword-based extraction if LLM fails
 */
async function parseAndVectorizeJob(jobId, description) {
  try {
    // Try LLM parsing first
    const parsedJson = await parserService.parseWithLLM(description, 'job description');

    await pool.query(
      'UPDATE job_postings SET requirements_json = $1, updated_at = NOW() WHERE job_id = $2',
      [JSON.stringify(parsedJson), jobId]
    );

    await featureService.computeAndStore(jobId, 'job', parsedJson);
    logger.info(`Job ${jobId} parsed and vectorized via LLM`);
  } catch (err) {
    logger.warn(`LLM failed for job ${jobId}, using keyword fallback: ${err.message}`);

    // Fallback: extract skills from raw description using keyword matching
    const words = description.toLowerCase();
    const fallbackJson = {
      skills: extractSkillsFromText(words),
      experience_years: extractYearsFromText(words),
      education_level: extractEducationFromText(words),
      certifications: [],
      domain_expertise: [],
      preferred_roles: [],
      summary: description.substring(0, 100),
    };

    await pool.query(
      'UPDATE job_postings SET requirements_json = $1, updated_at = NOW() WHERE job_id = $2',
      [JSON.stringify(fallbackJson), jobId]
    );

    await featureService.computeAndStore(jobId, 'job', fallbackJson);
    logger.info(`Job ${jobId} vectorized via keyword fallback`);
  }
}

// Simple keyword extraction from raw text
function extractSkillsFromText(text) {
  const allKeywords = [
    'python', 'javascript', 'typescript', 'react', 'node', 'sql', 'postgresql',
    'mongodb', 'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform',
    'machine learning', 'deep learning', 'nlp', 'tensorflow', 'pytorch',
    'data analysis', 'statistics', 'tableau', 'communication', 'leadership',
    'management', 'agile', 'scrum', 'pmp', 'ci/cd', 'git', 'java', 'c++',
    'system design', 'microservices', 'rest api', 'graphql',
  ];
  return allKeywords.filter(kw => text.includes(kw));
}

function extractYearsFromText(text) {
  const match = text.match(/(\d+)\+?\s*(?:years|yrs|yr)/);
  return match ? parseInt(match[1]) : 2;
}

function extractEducationFromText(text) {
  if (text.includes('phd') || text.includes('doctorate')) return 'phd';
  if (text.includes('master') || text.includes('mtech') || text.includes('mba') || text.includes('ms ')) return 'master';
  if (text.includes('bachelor') || text.includes('btech') || text.includes('b.e') || text.includes('degree')) return 'bachelor';
  return 'bachelor';
}

module.exports = router;
