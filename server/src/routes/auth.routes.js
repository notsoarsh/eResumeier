const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

// POST /api/auth/register - User registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, employerDetails } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required.' });
    }

    if (!['candidate', 'employer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be candidate or employer.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const user = await authService.register({
      email, password, role, firstName, lastName, employerDetails,
    });

    logger.info(`User registered: ${email} (${role})`);
    res.status(201).json({ message: 'Registration successful', user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    logger.error(`Registration error: ${err.message}`);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login - User login (returns JWT)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await authService.login({ email, password });

    logger.info(`User logged in: ${email}`);
    res.json(result);
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    res.status(401).json({ error: err.message });
  }
});

// GET /api/auth/me - Get current user profile (protected)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    logger.error(`Profile fetch error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// GET /api/auth/notifications - Get user notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.userId]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// PUT /api/auth/notifications/read - Mark all as read
router.put('/notifications/read', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.userId]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

module.exports = router;
