require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');

// Import route modules
const authRoutes = require('./routes/auth.routes');
const resumeRoutes = require('./routes/resume.routes');
const jobRoutes = require('./routes/job.routes');
const matchRoutes = require('./routes/match.routes');
const featureRoutes = require('./routes/feature.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes (4 service modules as per report Section 2.2)
app.use('/api/auth', authRoutes);       // Authentication & Authorization Service
app.use('/api/resumes', resumeRoutes);  // Resume Parser Service
app.use('/api/jobs', jobRoutes);        // Job Posting Management
app.use('/api/match', matchRoutes);     // Matching Engine Service
app.use('/api/features', featureRoutes); // Feature Extraction Service
app.use('/api/admin', adminRoutes);     // Admin Control Panel

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'eResumeier API', version: '1.0.0' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  logger.info(`eResumeier server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
