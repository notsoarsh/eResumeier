/**
 * Seed Script: Creates test data for the matching engine
 * Inserts 5 candidates with parsed resumes + vectors, and 5 jobs with vectors.
 * This allows testing the full matching pipeline without needing the LLM API.
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const DIMENSIONS = [
  'python', 'javascript', 'sql', 'machine_learning', 'data_analysis',
  'cloud_computing', 'communication', 'leadership', 'problem_solving',
  'years_experience', 'education_level', 'project_management',
];

// 5 Candidates with realistic profiles
const CANDIDATES = [
  {
    email: 'alice.ds@seed.com', firstName: 'Alice', lastName: 'Johnson',
    parsedJson: {
      skills: ['python', 'tensorflow', 'pytorch', 'machine learning', 'deep learning', 'nlp', 'sql', 'postgresql', 'aws', 'sagemaker', 'data analysis', 'statistics', 'communication', 'presentation'],
      experience_years: 6, education_level: 'master',
      certifications: [{ name: 'AWS SAA', issuer: 'Amazon', level: 'associate' }],
      domain_expertise: ['data science', 'nlp'], preferred_roles: ['Data Scientist', 'ML Engineer'],
      summary: 'Senior data scientist with 6 years in ML and NLP.',
    },
    vector: [9, 3, 7, 9, 8, 6, 5, 3, 8, 3, 7, 2],
  },
  {
    email: 'bob.fe@seed.com', firstName: 'Bob', lastName: 'Smith',
    parsedJson: {
      skills: ['javascript', 'typescript', 'react', 'vue', 'css', 'tailwind', 'node', 'html', 'accessibility', 'figma', 'communication', 'teamwork'],
      experience_years: 4, education_level: 'bachelor',
      certifications: [],
      domain_expertise: ['frontend', 'web development'], preferred_roles: ['Frontend Engineer', 'UI Developer'],
      summary: 'Frontend developer with 4 years building responsive web apps.',
    },
    vector: [3, 9, 4, 2, 3, 5, 7, 4, 6, 2, 5, 5],
  },
  {
    email: 'carol.cloud@seed.com', firstName: 'Carol', lastName: 'Williams',
    parsedJson: {
      skills: ['python', 'terraform', 'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'ci/cd', 'leadership', 'management', 'pmp', 'agile', 'communication', 'stakeholder'],
      experience_years: 10, education_level: 'master',
      certifications: [{ name: 'PMP', issuer: 'PMI', level: 'professional' }, { name: 'AWS SAP', issuer: 'Amazon', level: 'professional' }],
      domain_expertise: ['cloud infrastructure', 'devops'], preferred_roles: ['Cloud Architect', 'Engineering Manager'],
      summary: 'Cloud solutions architect with 10 years leading infrastructure teams.',
    },
    vector: [7, 5, 6, 4, 5, 9, 7, 8, 7, 5, 7, 9],
  },
  {
    email: 'dave.ml@seed.com', firstName: 'Dave', lastName: 'Kumar',
    parsedJson: {
      skills: ['python', 'pytorch', 'tensorflow', 'deep learning', 'nlp', 'computer vision', 'research', 'statistics', 'sql', 'aws'],
      experience_years: 4, education_level: 'phd',
      certifications: [],
      domain_expertise: ['machine learning', 'research'], preferred_roles: ['ML Engineer', 'Research Scientist'],
      summary: 'ML researcher with PhD, focused on NLP and deep learning.',
    },
    vector: [8, 2, 5, 10, 7, 5, 4, 2, 9, 2, 9, 2],
  },
  {
    email: 'eve.pm@seed.com', firstName: 'Eve', lastName: 'Park',
    parsedJson: {
      skills: ['javascript', 'python', 'aws', 'gcp', 'docker', 'agile', 'scrum', 'jira', 'leadership', 'management', 'communication', 'stakeholder', 'roadmap'],
      experience_years: 8, education_level: 'master',
      certifications: [{ name: 'CSM', issuer: 'Scrum Alliance', level: 'certified' }],
      domain_expertise: ['project management', 'cloud'], preferred_roles: ['Tech Lead', 'Engineering Manager'],
      summary: 'Technical leader with 8 years managing engineering teams.',
    },
    vector: [5, 6, 4, 3, 4, 8, 8, 9, 6, 4, 7, 9],
  },
];

// 5 Jobs with realistic requirements
const JOBS = [
  {
    title: 'Senior Data Scientist', company: 'TechCorp AI Labs',
    description: 'Looking for a senior data scientist with 5+ years in ML, Python, deep learning, NLP, SQL, and cloud platforms.',
    location: 'Remote', salaryRange: '25-35 LPA',
    parsedJson: {
      skills: ['python', 'machine learning', 'deep learning', 'nlp', 'sql', 'aws', 'sagemaker', 'communication', 'statistics'],
      experience_years: 5, education_level: 'master',
      certifications: [], domain_expertise: ['data science', 'ai'],
      preferred_roles: ['Senior Data Scientist'], summary: 'Senior data scientist role requiring ML expertise.',
    },
    vector: [8, 2, 7, 9, 8, 5, 5, 3, 8, 3, 7, 3],
  },
  {
    title: 'Frontend Engineer', company: 'StartupXYZ',
    description: 'Seeking a frontend engineer with 3+ years React/TypeScript, strong CSS, accessibility knowledge.',
    location: 'Bangalore', salaryRange: '15-22 LPA',
    parsedJson: {
      skills: ['javascript', 'typescript', 'react', 'css', 'accessibility', 'node', 'communication'],
      experience_years: 3, education_level: 'bachelor',
      certifications: [], domain_expertise: ['frontend', 'web'],
      preferred_roles: ['Frontend Engineer'], summary: 'Frontend role requiring React expertise.',
    },
    vector: [3, 9, 3, 1, 2, 4, 8, 4, 6, 2, 5, 5],
  },
  {
    title: 'Cloud Engineering Manager', company: 'GlobalTech Solutions',
    description: 'Cloud engineering manager needed. 8+ years, deep AWS/GCP, leadership, PMP preferred, team of 10.',
    location: 'San Francisco', salaryRange: '$180-220K',
    parsedJson: {
      skills: ['aws', 'gcp', 'terraform', 'leadership', 'management', 'pmp', 'python', 'communication', 'agile'],
      experience_years: 8, education_level: 'master',
      certifications: [{ name: 'PMP', issuer: 'PMI', level: 'professional' }],
      domain_expertise: ['cloud', 'infrastructure'], preferred_roles: ['Cloud Engineering Manager'],
      summary: 'Manager role for cloud infrastructure team.',
    },
    vector: [6, 4, 5, 3, 4, 9, 8, 9, 7, 4, 7, 9],
  },
  {
    title: 'ML Engineer - NLP Focus', company: 'DeepMind India',
    description: 'ML engineer with NLP focus. PhD preferred, PyTorch, deep learning, research publications.',
    location: 'Bangalore', salaryRange: '30-45 LPA',
    parsedJson: {
      skills: ['python', 'pytorch', 'deep learning', 'nlp', 'research', 'machine learning', 'statistics'],
      experience_years: 4, education_level: 'phd',
      certifications: [], domain_expertise: ['machine learning', 'nlp'],
      preferred_roles: ['ML Engineer'], summary: 'Research-focused ML engineer role.',
    },
    vector: [9, 2, 4, 10, 7, 5, 4, 2, 9, 2, 9, 2],
  },
  {
    title: 'Technical Lead - Backend', company: 'Flipkart',
    description: 'Tech lead for backend team. 7+ years, system design, leadership, cloud, agile, team of 8.',
    location: 'Bangalore', salaryRange: '35-50 LPA',
    parsedJson: {
      skills: ['javascript', 'python', 'system design', 'leadership', 'management', 'aws', 'docker', 'agile', 'communication', 'architecture'],
      experience_years: 7, education_level: 'master',
      certifications: [], domain_expertise: ['backend', 'system design'],
      preferred_roles: ['Technical Lead'], summary: 'Tech lead role for backend systems.',
    },
    vector: [6, 6, 6, 4, 4, 7, 8, 9, 8, 4, 7, 8],
  },
];

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 12);

  console.log('Seeding database with test data...\n');

  // Create an employer for the jobs
  const employerId = uuidv4();
  await pool.query(
    `INSERT INTO users (user_id, email, password_hash, role, first_name, last_name)
     VALUES ($1, 'employer@seed.com', $2, 'employer', 'Seed', 'Employer')
     ON CONFLICT (email) DO NOTHING`,
    [employerId, passwordHash]
  );

  // Create admin
  await pool.query(
    `INSERT INTO users (user_id, email, password_hash, role, first_name, last_name)
     VALUES ($1, 'admin@seed.com', $2, 'admin', 'Admin', 'User')
     ON CONFLICT (email) DO NOTHING`,
    [uuidv4(), passwordHash]
  );

  // Insert candidates
  console.log('Creating candidates...');
  for (const cand of CANDIDATES) {
    const userId = uuidv4();
    const resumeId = uuidv4();

    await pool.query(
      `INSERT INTO users (user_id, email, password_hash, role, first_name, last_name)
       VALUES ($1, $2, $3, 'candidate', $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [userId, cand.email, passwordHash, cand.firstName, cand.lastName]
    );

    // Get the actual user_id (in case of conflict)
    const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', [cand.email]);
    const actualUserId = userResult.rows[0].user_id;

    await pool.query(
      `INSERT INTO resumes (resume_id, user_id, raw_text, parsed_json, original_filename, status)
       VALUES ($1, $2, $3, $4, $5, 'parsed')
       ON CONFLICT DO NOTHING`,
      [resumeId, actualUserId, cand.parsedJson.summary, JSON.stringify(cand.parsedJson), `${cand.firstName.toLowerCase()}_resume.pdf`]
    );

    await pool.query(
      `INSERT INTO feature_vectors (entity_id, entity_type, vector_data, dimensional_meta, computed_at)
       VALUES ($1, 'resume', $2, $3, NOW())
       ON CONFLICT (entity_id, entity_type) DO UPDATE SET vector_data = $2`,
      [resumeId, JSON.stringify(cand.vector), JSON.stringify({ dimensions: DIMENSIONS, version: 1 })]
    );

    console.log(`  ✓ ${cand.firstName} ${cand.lastName} (${cand.email}) - vector: [${cand.vector.join(', ')}]`);
  }

  // Insert jobs
  console.log('\nCreating job postings...');
  const empResult = await pool.query("SELECT user_id FROM users WHERE email = 'employer@seed.com'");
  const actualEmployerId = empResult.rows[0].user_id;

  for (const job of JOBS) {
    const jobId = uuidv4();

    await pool.query(
      `INSERT INTO job_postings (job_id, employer_id, title, company, description, requirements_json, location, salary_range, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')`,
      [jobId, actualEmployerId, job.title, job.company, job.description, JSON.stringify(job.parsedJson), job.location, job.salaryRange]
    );

    await pool.query(
      `INSERT INTO feature_vectors (entity_id, entity_type, vector_data, dimensional_meta, computed_at)
       VALUES ($1, 'job', $2, $3, NOW())
       ON CONFLICT (entity_id, entity_type) DO UPDATE SET vector_data = $2`,
      [jobId, JSON.stringify(job.vector), JSON.stringify({ dimensions: DIMENSIONS, version: 1 })]
    );

    console.log(`  ✓ ${job.title} at ${job.company} - vector: [${job.vector.join(', ')}]`);
  }

  console.log('\n✓ Seed complete!');
  console.log('\nTest accounts (all password: password123):');
  console.log('  Candidates: alice.ds@seed.com, bob.fe@seed.com, carol.cloud@seed.com, dave.ml@seed.com, eve.pm@seed.com');
  console.log('  Employer:   employer@seed.com');
  console.log('  Admin:      admin@seed.com');

  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
