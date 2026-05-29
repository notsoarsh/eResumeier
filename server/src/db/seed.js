// Seed: Nielsen hiring scenario — single company, multiple roles, candidates apply
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

// Nielsen job openings
const JOBS = [
  {
    title: 'Senior Data Engineer',
    company: 'Nielsen',
    description: 'Nielsen is hiring a Senior Data Engineer to build and maintain large-scale data pipelines. Requirements: 5+ years experience, Python, SQL, PostgreSQL, AWS (S3, Redshift, Glue), Spark, ETL pipelines, data warehousing, Docker. Strong problem-solving skills. Bachelor or Master in CS preferred. Agile experience needed.',
    location: 'Bangalore',
    salaryRange: '22-32 LPA',
    vector: [8, 3, 9, 4, 7, 8, 5, 3, 7, 3, 7, 5],
  },
  {
    title: 'Full Stack Developer',
    company: 'Nielsen',
    description: 'Nielsen seeks a Full Stack Developer to build internal analytics platforms. Requirements: 3+ years, JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, REST APIs, Git, Docker, AWS. Good communication skills for cross-team collaboration. Bachelor degree required. Agile/Scrum experience.',
    location: 'Mumbai',
    salaryRange: '15-24 LPA',
    vector: [4, 9, 7, 2, 3, 6, 7, 3, 6, 2, 5, 5],
  },
  {
    title: 'Machine Learning Engineer',
    company: 'Nielsen',
    description: 'Nielsen is looking for an ML Engineer to build audience measurement models. Requirements: 4+ years, Python, TensorFlow, PyTorch, machine learning, deep learning, NLP, statistics, SQL, AWS SageMaker. MS or PhD preferred. Research publications a plus. Strong analytical and problem-solving skills.',
    location: 'Bangalore',
    salaryRange: '28-40 LPA',
    vector: [9, 2, 5, 9, 8, 5, 4, 2, 9, 2, 7, 2],
  },
  {
    title: 'Engineering Manager',
    company: 'Nielsen',
    description: 'Nielsen hiring an Engineering Manager to lead a team of 10 engineers building data products. Requirements: 8+ years experience, leadership, people management, Python, system design, AWS, agile, project management, stakeholder communication. MBA or MS preferred. PMP certification a plus.',
    location: 'Bangalore',
    salaryRange: '35-50 LPA',
    vector: [6, 5, 5, 3, 4, 7, 8, 9, 7, 4, 7, 9],
  },
  {
    title: 'Data Analyst',
    company: 'Nielsen',
    description: 'Nielsen needs a Data Analyst for consumer insights team. Requirements: 2+ years, SQL, Python, data analysis, statistics, Tableau, Power BI, Excel, communication skills for presenting to stakeholders. Bachelor degree required. Experience with A/B testing and business intelligence.',
    location: 'Mumbai',
    salaryRange: '10-16 LPA',
    vector: [5, 2, 8, 2, 9, 3, 8, 2, 5, 1, 5, 3],
  },
];

// Candidates (seeded with pre-computed vectors)
const CANDIDATES = [
  {
    email: 'rahul.de@demo.com', firstName: 'Rahul', lastName: 'Sharma',
    resume: 'Senior Data Engineer with 6 years at Flipkart and Walmart Labs. Expert in Python, SQL, PostgreSQL, AWS Redshift, S3, Glue, Spark, ETL pipelines, data warehousing, Docker, Airflow. M.Tech from IIT Delhi. Strong problem-solving and system design skills. Agile practitioner.',
    vector: [8, 2, 9, 3, 7, 8, 5, 3, 8, 3, 7, 6],
  },
  {
    email: 'priya.fs@demo.com', firstName: 'Priya', lastName: 'Patel',
    resume: 'Full Stack Developer with 4 years at Razorpay and Swiggy. Proficient in JavaScript, TypeScript, React, Next.js, Node.js, Express, PostgreSQL, MongoDB, REST APIs, GraphQL, Docker, AWS, Git. Strong communicator, agile team player. B.Tech from NIT Trichy.',
    vector: [3, 9, 7, 2, 3, 6, 7, 4, 6, 2, 5, 5],
  },
  {
    email: 'amit.ml@demo.com', firstName: 'Amit', lastName: 'Kumar',
    resume: 'ML Engineer with 4 years at Amazon and Google Research. Expert in Python, PyTorch, TensorFlow, deep learning, NLP, transformer models, machine learning, statistics, SQL, AWS SageMaker, model optimization. MS from IISc Bangalore. 3 publications at NeurIPS.',
    vector: [9, 2, 5, 9, 7, 5, 4, 2, 9, 2, 7, 2],
  },
  {
    email: 'sneha.em@demo.com', firstName: 'Sneha', lastName: 'Gupta',
    resume: 'Engineering Manager with 9 years at Microsoft and Flipkart. Led teams of 12 engineers. Strong in Python, system design, AWS, leadership, people management, agile, project management, stakeholder communication, roadmap planning. MBA from IIM Ahmedabad. PMP certified.',
    vector: [6, 5, 5, 3, 4, 7, 8, 9, 7, 5, 7, 9],
  },
  {
    email: 'neha.da@demo.com', firstName: 'Neha', lastName: 'Singh',
    resume: 'Data Analyst with 2.5 years at Deloitte. Skilled in SQL, Python, data analysis, statistics, Tableau, Power BI, Excel, A/B testing, business intelligence. Strong communication skills, presents insights to C-level stakeholders. B.Tech from VIT University.',
    vector: [5, 2, 8, 2, 9, 3, 8, 2, 5, 1, 5, 3],
  },
];

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 12);
  console.log('Seeding Nielsen hiring scenario...\n');

  // Admin
  await pool.query(
    `INSERT INTO users (user_id, email, password_hash, role, first_name, last_name)
     VALUES ($1, 'admin@nielsen.com', $2, 'admin', 'Admin', 'Nielsen')
     ON CONFLICT (email) DO NOTHING`,
    [uuidv4(), passwordHash]
  );

  // Employer (Nielsen HR)
  const employerId = uuidv4();
  await pool.query(
    `INSERT INTO users (user_id, email, password_hash, role, first_name, last_name)
     VALUES ($1, 'hr@nielsen.com', $2, 'employer', 'HR', 'Nielsen')
     ON CONFLICT (email) DO NOTHING`,
    [employerId, passwordHash]
  );

  const empResult = await pool.query("SELECT user_id FROM users WHERE email = 'hr@nielsen.com'");
  const actualEmployerId = empResult.rows[0].user_id;

  // Create jobs
  console.log('Creating Nielsen job postings...');
  for (const job of JOBS) {
    const jobId = uuidv4();
    await pool.query(
      `INSERT INTO job_postings (job_id, employer_id, title, company, description, location, salary_range, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')`,
      [jobId, actualEmployerId, job.title, job.company, job.description, job.location, job.salaryRange]
    );
    await pool.query(
      `INSERT INTO feature_vectors (entity_id, entity_type, vector_data, dimensional_meta, computed_at)
       VALUES ($1, 'job', $2, $3, NOW())
       ON CONFLICT (entity_id, entity_type) DO UPDATE SET vector_data = $2`,
      [jobId, JSON.stringify(job.vector), JSON.stringify({ dimensions: DIMENSIONS, version: 1 })]
    );
    console.log(`  ✓ ${job.title} (${job.location}) — ${job.salaryRange}`);
  }

  // Create candidates
  console.log('\nCreating candidates...');
  for (const cand of CANDIDATES) {
    const userId = uuidv4();
    const resumeId = uuidv4();

    await pool.query(
      `INSERT INTO users (user_id, email, password_hash, role, first_name, last_name)
       VALUES ($1, $2, $3, 'candidate', $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [userId, cand.email, passwordHash, cand.firstName, cand.lastName]
    );

    const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', [cand.email]);
    const actualUserId = userResult.rows[0].user_id;

    await pool.query(
      `INSERT INTO resumes (resume_id, user_id, raw_text, parsed_json, original_filename, status)
       VALUES ($1, $2, $3, $4, $5, 'parsed')`,
      [resumeId, actualUserId, cand.resume, JSON.stringify({ skills: cand.resume.split(', '), experience_years: 4, education_level: 'master' }), `${cand.firstName}_${cand.lastName}_resume.pdf`]
    );

    await pool.query(
      `INSERT INTO feature_vectors (entity_id, entity_type, vector_data, dimensional_meta, computed_at)
       VALUES ($1, 'resume', $2, $3, NOW())
       ON CONFLICT (entity_id, entity_type) DO UPDATE SET vector_data = $2`,
      [resumeId, JSON.stringify(cand.vector), JSON.stringify({ dimensions: DIMENSIONS, version: 1 })]
    );

    console.log(`  ✓ ${cand.firstName} ${cand.lastName} (${cand.email})`);
  }

  console.log('\n✓ Seed complete!');
  console.log('\nAccounts (password: password123):');
  console.log('  Admin:     admin@nielsen.com');
  console.log('  Employer:  hr@nielsen.com');
  console.log('  Candidates: rahul.de@demo.com, priya.fs@demo.com, amit.ml@demo.com, sneha.em@demo.com, neha.da@demo.com');
  console.log('\nNielsen Jobs: Senior Data Engineer, Full Stack Developer, ML Engineer, Engineering Manager, Data Analyst');

  await pool.end();
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
