const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const parserService = require('../services/parser.service');
const pool = require('../db/pool');
const logger = require('../utils/logger');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are allowed.'));
    }
  },
});

// POST /api/resumes/upload - Upload & parse resume
router.post('/upload', authenticate, authorize('candidate', 'admin'), upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Field name must be "resume".' });
    }

    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);

    const result = await parserService.processResume(
      req.user.userId,
      filePath,
      req.file.originalname,
      buffer,
      req.file.mimetype
    );

    if (result.status === 'parsed') {
      res.status(201).json({
        message: 'Resume uploaded and parsed successfully',
        resumeId: result.resumeId,
        parsedData: result.parsedJson,
      });
    } else {
      res.status(207).json({
        message: 'Resume uploaded but parsing failed. Will retry later.',
        resumeId: result.resumeId,
        error: result.error,
      });
    }
  } catch (err) {
    logger.error(`Resume upload error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/resumes/parse-text - Parse raw text directly (no file upload)
router.post('/parse-text', authenticate, authorize('candidate', 'admin'), async (req, res) => {
  try {
    const { text, name } = req.body;

    if (!text || text.length < 50) {
      return res.status(400).json({ error: 'Resume text must be at least 50 characters.' });
    }

    // Insert record
    const insertResult = await pool.query(
      `INSERT INTO resumes (user_id, raw_text, original_filename, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING resume_id`,
      [req.user.userId, text, name || 'text-input']
    );
    const resumeId = insertResult.rows[0].resume_id;

    // Parse with LLM
    try {
      const parsedJson = await parserService.parseWithLLM(text, 'resume');

      await pool.query(
        `UPDATE resumes SET parsed_json = $1, status = 'parsed', updated_at = NOW()
         WHERE resume_id = $2`,
        [JSON.stringify(parsedJson), resumeId]
      );

      // Compute and store feature vector
      const featureService = require('../services/feature.service');
      await featureService.computeAndStore(resumeId, 'resume', parsedJson);

      res.status(201).json({
        message: 'Resume text parsed successfully',
        resumeId,
        parsedData: parsedJson,
      });
    } catch (parseErr) {
      await pool.query(
        `UPDATE resumes SET status = 'error', updated_at = NOW() WHERE resume_id = $1`,
        [resumeId]
      );

      res.status(207).json({
        message: 'Text stored but parsing failed.',
        resumeId,
        error: parseErr.message,
      });
    }
  } catch (err) {
    logger.error(`Parse text error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/resumes - List user's resumes
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT resume_id, original_filename, status, parsed_json, created_at, updated_at
       FROM resumes WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json({ resumes: result.rows });
  } catch (err) {
    logger.error(`List resumes error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch resumes.' });
  }
});

// GET /api/resumes/:id - Get full resume details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM resumes WHERE resume_id = $1 AND user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    logger.error(`Get resume error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch resume.' });
  }
});

// Error handling for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
