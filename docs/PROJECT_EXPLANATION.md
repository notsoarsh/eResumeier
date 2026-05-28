# eResumeier — Complete Project Explanation

## What is eResumeier?

eResumeier is an intelligent resume analyzing and job matching engine that replaces manual, biased resume screening with a mathematically fair, AI-driven pipeline. It reads resumes and job descriptions using a Large Language Model, converts them into numerical vectors, scores compatibility using Manhattan Distance, and produces stable matches using the Nobel Prize-winning Gale-Shapley algorithm.

---

## The Problem We Solve

Traditional recruitment suffers from:

- **Human bias** — Recruiters unconsciously favor certain names, colleges, or formatting styles
- **Keyword brittleness** — ATS systems reject "ML Developer" when searching for "Machine Learning Engineer"
- **One-sided optimization** — Systems rank candidates for employers but ignore candidate preferences
- **Scale** — A single job posting gets 500+ applications; manual review is unsustainable
- **High turnover** — 45% of hires leave within the first year due to poor initial compatibility assessment

eResumeier addresses all of these by making the process objective, two-sided, and mathematically stable.

---

## How It Works — The Pipeline

```
Resume (PDF/DOCX/Text)
    ↓
[1] LLM Parser (Google Gemini)
    → Extracts: skills, experience, education, certifications
    ↓
[2] Feature Extraction
    → Converts to 12-dimensional numerical vector [9, 3, 7, 9, 8, 6, 5, 3, 8, 3, 7, 2]
    ↓
[3] Manhattan Distance Scoring
    → S = 1 / (1 + Σ|Ri - Ji|) for every candidate-job pair
    ↓
[4] Gale-Shapley Stable Marriage Algorithm
    → Produces stable, fair matches with no blocking pairs
    ↓
[5] Results
    → Ranked pairs with scores, tier classification, justification
```

---

## Features

### 1. User Authentication & Role-Based Access
- Secure registration and login with JWT tokens
- Passwords hashed with bcrypt (12 salt rounds)
- Three roles: Candidate, Employer, Admin
- Each role sees different navigation and pages

### 2. Resume Upload & AI Parsing
- Accepts PDF, DOCX, and plain text uploads (max 10MB)
- Text extraction using pdf-parse and mammoth libraries
- Google Gemini LLM extracts structured JSON: skills, experience, education, certifications, domain expertise
- Retry mechanism with exponential backoff (3 attempts, 1s → 2s → 4s delays)
- Model fallback: gemini-2.5-flash → gemini-2.0-flash-lite → gemini-2.0-flash

### 3. Job Posting Management
- Employers create job descriptions with title, company, location, salary, requirements
- Same LLM pipeline extracts structured requirements from job text
- CRUD operations: create, read, update, close (soft delete)
- Search and filter by keyword, location, status

### 4. Feature Extraction (Vectorization)
- Converts parsed JSON into a fixed-length 12-dimensional numerical vector
- Each dimension scored 1-10 based on keyword matching against a curated taxonomy
- Dimensions: Python, JavaScript, SQL, Machine Learning, Data Analysis, Cloud Computing, Communication, Leadership, Problem Solving, Years Experience, Education Level, Project Management
- Vectors stored in database and cached in Redis for fast retrieval

### 5. Manhattan Distance Similarity Scoring
- Formula: **S(R, J) = 1 / (1 + Σ|Ri − Ji|)**
- Computes pairwise similarity for every candidate-job combination
- Produces an n×m score matrix
- Score range: (0, 1] where 1.0 = perfect match (identical vectors)

### 6. Gale-Shapley Stable Marriage Algorithm
- Candidate-proposing variant
- Builds ranked preference lists from similarity scores
- Uses FIFO queue for proposals + hash map for O(1) preference comparison
- Guarantees: no blocking pair exists in the final matching
- Post-computation stability verification confirms zero blocking pairs

### 7. Match Results & Justification
- Ranked match pairs with similarity scores
- Tier classification: A (80%+), B (60-79%), C (<60%)
- Radar chart comparing candidate vector vs job vector across all 12 dimensions
- Per-match justification showing candidate preference rank and job preference rank

### 8. Match History
- Persistent log of all matching runs
- Records: algorithm used, candidate count, job count, average score, stability status
- Viewable with drill-down into individual run results

### 9. Redis Caching
- Feature vectors cached on computation (TTL: 2 hours)
- Match results cached after each run (TTL: 1 hour)
- Reduces database load for frequently accessed data

### 10. Feedback System
- Users can rate match quality (1-5 stars) with optional comments
- Stored in feedback table linked to specific match results
- Designed for future algorithm improvement based on ground-truth signals

### 11. Admin Control Panel
- System health monitoring (CPU, memory, database, API quota)
- LLM model configuration
- Match score threshold settings
- System logs viewer

### 12. Score Threshold Filtering
- Candidates whose maximum similarity score falls below the configured threshold are excluded from the matching pool
- Prevents low-quality matches from entering the Gale-Shapley algorithm
- Configurable by admin

---

## Technology Stack — Why Each Choice

### Frontend: React.js (Vite)
**Why:** React is the industry standard for building interactive single-page applications. Component-based architecture makes it easy to build reusable UI elements (match cards, stat cards, forms). Vite provides instant hot-reload during development and fast production builds.

### Backend: Node.js + Express.js
**Why:** JavaScript on both frontend and backend reduces context switching. Express.js is minimal and unopinionated — perfect for building modular REST APIs. Non-blocking I/O handles concurrent requests efficiently (important when multiple users trigger matching simultaneously).

### Database: PostgreSQL 16
**Why:** ACID-compliant relational database with strong support for JSONB (storing parsed resume data), UUID primary keys (preventing enumeration attacks), and complex queries with JOINs (matching results across multiple tables). Chosen over MongoDB because our data is inherently relational (users → resumes → matches → jobs).

### Cache: Redis 7
**Why:** In-memory key-value store with sub-millisecond read latency. Feature vectors are read repeatedly during matching — caching them in Redis avoids hitting PostgreSQL for every pair comparison. Also caches recent match results for instant dashboard loading.

### AI/LLM: Google Gemini API
**Why:** Provides semantic understanding of unstructured text that rule-based parsers cannot achieve. Recognizes that "ML Developer" and "Machine Learning Engineer" are equivalent. Handles diverse resume formats (traditional, functional, creative). Gemini 2.5 Flash offers fast inference at low cost.

### Authentication: JWT + bcrypt
**Why:** JWT (JSON Web Tokens) enables stateless authentication — the server doesn't need to store sessions. bcrypt with 12 salt rounds provides industry-standard password hashing resistant to rainbow table attacks. Role-based access control (RBAC) middleware enforces permissions per endpoint.

### Containerization: Docker Compose
**Why:** Ensures consistent development environment across machines. PostgreSQL and Redis run in isolated containers with defined versions — no "works on my machine" issues. Single `docker compose up -d` command starts the entire data layer.

### Logging: Winston
**Why:** Structured logging with timestamps, log levels (INFO, WARN, ERROR), and multiple transports (console + file). Essential for debugging production issues and monitoring system health.

---

## The 12 Feature Dimensions

| # | Dimension | What it measures | Score range |
|---|-----------|-----------------|-------------|
| 1 | Python | Proficiency in Python ecosystem (Django, Flask, pandas, etc.) | 1-10 |
| 2 | JavaScript | Proficiency in JS/TS ecosystem (React, Node, Vue, etc.) | 1-10 |
| 3 | SQL | Database skills (PostgreSQL, MySQL, MongoDB, ETL, etc.) | 1-10 |
| 4 | Machine Learning | ML/AI/Deep Learning (TensorFlow, PyTorch, NLP, etc.) | 1-10 |
| 5 | Data Analysis | Statistics, analytics, visualization (Tableau, R, etc.) | 1-10 |
| 6 | Cloud Computing | Cloud platforms (AWS, GCP, Azure, Docker, K8s, etc.) | 1-10 |
| 7 | Communication | Soft skill: presentation, stakeholder management | 1-10 |
| 8 | Leadership | Management, team lead, executive capability | 1-10 |
| 9 | Problem Solving | Analytical thinking, system design, algorithms | 1-10 |
| 10 | Years Experience | Normalized from actual years (0-20 mapped to 0-10) | 1-10 |
| 11 | Education Level | Ordinal: high school=2, diploma=4, bachelor=5, master=7, PhD=9 | 1-10 |
| 12 | Project Management | PMP, Scrum, Agile, planning, delivery | 1-10 |

---

## Algorithm Deep Dive

### Manhattan Distance
```
Candidate Alice: [9, 3, 7, 9, 8, 6, 5, 3, 8, 3, 7, 2]
Job (Data Sci):  [8, 2, 7, 9, 8, 5, 5, 3, 8, 3, 7, 3]

Distance = |9-8| + |3-2| + |7-7| + |9-9| + |8-8| + |6-5| + |5-5| + |3-3| + |8-8| + |3-3| + |7-7| + |2-3|
         = 1 + 1 + 0 + 0 + 0 + 1 + 0 + 0 + 0 + 0 + 0 + 1 = 4

Similarity = 1 / (1 + 4) = 0.20 = 20%
```

**Why Manhattan over Euclidean?** Manhattan Distance treats each dimension independently and is more interpretable — you can see exactly which dimensions contribute to the distance. Euclidean squares differences, so one large gap dominates the score.

### Gale-Shapley Algorithm
```
Input: 
  Candidate preferences: Alice → [DataSci, ML, Frontend, Cloud, TechLead]
  Job preferences:       DataSci → [Alice, Dave, Carol, Bob, Eve]

Process:
  Round 1: Alice proposes to DataSci → Accepted (DataSci was free)
  Round 1: Dave proposes to ML → Accepted
  Round 1: Bob proposes to Frontend → Accepted
  ...

Output: Stable pairs where no blocking pair exists
```

**Why Gale-Shapley over greedy matching?** Greedy matching assigns the highest-scoring pair first, then the next, etc. This can create "blocking pairs" — situations where a candidate and job would both prefer each other over their assigned matches. Gale-Shapley mathematically guarantees this never happens.

---

## Database Schema

```
users (user_id, email, password_hash, role, first_name, last_name, is_active)
  ↓
resumes (resume_id, user_id, raw_text, parsed_json, file_path, status)
  ↓
feature_vectors (vector_id, entity_id, entity_type, vector_data, dimensional_meta)
  ↓
match_results (match_id, run_id, resume_id, job_id, similarity_score, rank, tier, justification_json)
  ↑
job_postings (job_id, employer_id, title, company, description, requirements_json, status)
  ↑
match_runs (run_id, initiated_by, algorithm, candidate_count, job_count, avg_score, is_stable)

feedback (feedback_id, match_id, rater_id, rating, comment)
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | Login (returns JWT) |
| GET | /api/auth/me | Get current user profile |
| POST | /api/resumes/upload | Upload and parse resume file |
| POST | /api/resumes/parse-text | Parse resume from text input |
| GET | /api/resumes | List user's resumes |
| POST | /api/jobs | Create job posting |
| GET | /api/jobs | List/search jobs |
| PUT | /api/jobs/:id | Update job |
| DELETE | /api/jobs/:id | Close job |
| POST | /api/match/run | Trigger matching algorithm |
| GET | /api/match/results/:runId | Get match results |
| GET | /api/match/history | List all past runs |
| POST | /api/feedback | Submit match feedback |
| GET | /api/features/:type/:id | Get feature vector |

---

## Security Measures

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with 7-day expiry
- Role-based access control on all protected endpoints
- Parameterized SQL queries (prevents SQL injection)
- File upload validation (type + size limits)
- CORS enabled for cross-origin requests
- Environment variables for secrets (not hardcoded)

---

## How to Run

```bash
# Start databases
docker compose up -d

# Start backend
cd server && npm install && npm run migrate && npm run seed && npm run dev

# Start frontend
cd client && npm install && npm run dev

# Open http://localhost:3000
```

---

## Limitations

1. Feature extraction uses keyword matching — no semantic embeddings
2. Fixed 12 dimensions may not suit all industries
3. Manhattan Distance raw scores appear low (5-33%) due to formula characteristics
4. Requires roughly equal candidates and jobs for optimal Gale-Shapley results
5. LLM parsing depends on external API availability and quota
6. No automated test suite

---

## Future Scope

1. Semantic embeddings (sentence-transformers) instead of keyword matching
2. Dynamic, industry-specific dimensions
3. Feedback-driven weight adjustment
4. Video resume analysis with computer vision
5. Blockchain-based credential verification
6. Mobile applications (React Native)
7. Integration with LinkedIn and GitHub APIs
