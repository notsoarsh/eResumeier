const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const featureService = require('../services/feature.service');
const pool = require('../db/pool');
const logger = require('../utils/logger');

// GET /api/features/dimensions - Get feature dimension names
router.get('/dimensions', (req, res) => {
  res.json({ dimensions: featureService.getDimensions() });
});

// POST /api/features/recompute/:entityType/:entityId - Recompute vector for an entity
router.post('/recompute/:entityType/:entityId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    if (!['resume', 'job'].includes(entityType)) {
      return res.status(400).json({ error: 'entityType must be resume or job.' });
    }

    // Fetch parsed JSON
    let parsedJson;
    if (entityType === 'resume') {
      const result = await pool.query('SELECT parsed_json FROM resumes WHERE resume_id = $1', [entityId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Resume not found.' });
      parsedJson = result.rows[0].parsed_json;
    } else {
      const result = await pool.query('SELECT requirements_json FROM job_postings WHERE job_id = $1', [entityId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found.' });
      parsedJson = result.rows[0].requirements_json;
    }

    if (!parsedJson) {
      return res.status(400).json({ error: 'Entity has not been parsed yet.' });
    }

    const { vectorId, vector } = await featureService.computeAndStore(entityId, entityType, parsedJson);

    res.json({
      message: 'Feature vector recomputed.',
      vectorId,
      vector,
      dimensions: featureService.getDimensions(),
    });
  } catch (err) {
    logger.error(`Recompute vector error: ${err.message}`);
    res.status(500).json({ error: 'Failed to recompute vector.' });
  }
});

// GET /api/features/:entityType/:entityId - Get vector for an entity
router.get('/:entityType/:entityId', authenticate, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const vectorRecord = await featureService.getVector(entityId, entityType);

    if (!vectorRecord) {
      return res.status(404).json({ error: 'No feature vector found for this entity.' });
    }

    res.json({
      ...vectorRecord,
      dimensions: featureService.getDimensions(),
    });
  } catch (err) {
    logger.error(`Get vector error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch vector.' });
  }
});

module.exports = router;
