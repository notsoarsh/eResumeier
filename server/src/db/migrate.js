/**
 * Database Migration Script
 * Creates all 6 core tables as specified in Report Section 4.2
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const migration = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: users
-- Central identity store. UUID primary keys prevent enumeration attacks.
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('candidate', 'employer', 'admin')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  employer_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: resumes
-- Stores both the raw extracted text and the structured LLM output.
CREATE TABLE IF NOT EXISTS resumes (
  resume_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  raw_text TEXT,
  parsed_json JSONB,
  file_path VARCHAR(500),
  original_filename VARCHAR(255),
  parse_version INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'parsed', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: job_postings
-- Status lifecycle management enables soft-deletion and prevents re-processing of closed postings.
CREATE TABLE IF NOT EXISTS job_postings (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  description TEXT NOT NULL,
  requirements_json JSONB,
  location VARCHAR(255),
  salary_range VARCHAR(100),
  employment_type VARCHAR(50) DEFAULT 'full-time',
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'paused', 'closed')),
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on (employer_id, status) for efficient employer dashboard queries
CREATE INDEX IF NOT EXISTS idx_job_postings_employer_status ON job_postings(employer_id, status);

-- Table 4: feature_vectors
-- Separated from core entities to allow vector recomputation without touching primary records.
CREATE TABLE IF NOT EXISTS feature_vectors (
  vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL,
  entity_type VARCHAR(10) NOT NULL CHECK (entity_type IN ('resume', 'job')),
  vector_data JSONB NOT NULL,
  dimensional_meta JSONB,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one vector per entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_vectors_entity ON feature_vectors(entity_id, entity_type);

-- Table 5: match_results
-- Stores the complete output of the matching engine per run.
CREATE TABLE IF NOT EXISTS match_results (
  match_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID,
  resume_id UUID NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES job_postings(job_id) ON DELETE CASCADE,
  similarity_score NUMERIC(5,4) NOT NULL,
  rank INTEGER,
  tier VARCHAR(1) CHECK (tier IN ('A', 'B', 'C')),
  justification_json JSONB,
  is_stable_match BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UNIQUE constraint on (resume_id, job_id, run_id) prevents duplicate match records per run
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_results_unique_per_run
  ON match_results(resume_id, job_id, run_id);

-- Table 6: feedback
-- Captures ground-truth quality signal for algorithm improvement.
CREATE TABLE IF NOT EXISTS feedback (
  feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES match_results(match_id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on match_id for efficient aggregation of feedback distributions
CREATE INDEX IF NOT EXISTS idx_feedback_match ON feedback(match_id);

-- Match runs tracking table (for history)
CREATE TABLE IF NOT EXISTS match_runs (
  run_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiated_by UUID REFERENCES users(user_id),
  algorithm VARCHAR(50) DEFAULT 'gale-shapley',
  distance_metric VARCHAR(50) DEFAULT 'manhattan',
  candidate_count INTEGER,
  job_count INTEGER,
  avg_score NUMERIC(5,4),
  is_stable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function runMigration() {
  try {
    console.log('Running database migration...');
    await pool.query(migration);
    console.log('Migration completed successfully.');
    console.log('Tables created: users, resumes, job_postings, feature_vectors, match_results, feedback, match_runs');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
