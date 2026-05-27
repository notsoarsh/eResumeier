# eResumeier — Local Setup Guide

## Prerequisites

Make sure you have these installed:

- **Node.js** (v18 or above) — [Download](https://nodejs.org/)
- **Docker Desktop** — [Download](https://www.docker.com/products/docker-desktop/)
- **Git** — [Download](https://git-scm.com/)

## Step 1: Clone the repository

```bash
git clone https://github.com/notsoarsh/eResumeier.git
cd eResumeier
```

## Step 2: Start the database (PostgreSQL + Redis)

Make sure Docker Desktop is running, then:

```bash
docker compose up -d
```

This starts:
- PostgreSQL 16 on port 5433
- Redis 7 on port 6379

Verify they're running:
```bash
docker ps
```

## Step 3: Setup the backend

```bash
cd server
npm install
```

Create the `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key (get one from https://aistudio.google.com/apikey):
```
GEMINI_API_KEY=your_key_here
```

Run database migrations (creates all tables):
```bash
npm run migrate
```

Seed test data (5 candidates + 5 jobs with pre-computed vectors):
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev
```

Backend runs on http://localhost:5000

## Step 4: Setup the frontend

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

Frontend runs on http://localhost:3000

## Step 5: Open the app

Go to **http://localhost:3000** in your browser.

### Test Accounts (password for all: `password123`)

| Email | Role | Access |
|-------|------|--------|
| admin@seed.com | Admin | Full access — run matches, admin panel |
| employer@seed.com | Employer | Post jobs, view candidates |
| alice.ds@seed.com | Candidate | Upload resume, view job matches |
| bob.fe@seed.com | Candidate | Upload resume, view job matches |
| carol.cloud@seed.com | Candidate | Upload resume, view job matches |
| dave.ml@seed.com | Candidate | Upload resume, view job matches |
| eve.pm@seed.com | Candidate | Upload resume, view job matches |

## Step 6: Run the matching engine

1. Login as `admin@seed.com`
2. Go to **Matching** page
3. Click **🚀 Run eResumeier Matching**
4. View results on the **Results** page

## Project Structure

```
eResumeier/
├── docker-compose.yml          # PostgreSQL + Redis containers
├── server/                     # Node.js + Express backend
│   ├── src/
│   │   ├── index.js            # Express app entry point
│   │   ├── db/
│   │   │   ├── pool.js         # PostgreSQL connection
│   │   │   ├── redis.js        # Redis connection
│   │   │   ├── migrate.js      # Database schema creation
│   │   │   └── seed.js         # Test data seeder
│   │   ├── middleware/
│   │   │   └── auth.middleware.js  # JWT + RBAC
│   │   ├── routes/
│   │   │   ├── auth.routes.js      # /api/auth/*
│   │   │   ├── resume.routes.js    # /api/resumes/*
│   │   │   ├── job.routes.js       # /api/jobs/*
│   │   │   ├── match.routes.js     # /api/match/*
│   │   │   ├── feature.routes.js   # /api/features/*
│   │   │   └── admin.routes.js     # /api/admin/*
│   │   └── services/
│   │       ├── auth.service.js     # Registration, login, JWT
│   │       ├── parser.service.js   # LLM parsing (Gemini)
│   │       ├── feature.service.js  # 12D vectorization
│   │       └── matching.service.js # Manhattan Distance + Gale-Shapley
│   └── package.json
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js              # Axios instance with JWT
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx
│   │       ├── ResumeUpload.jsx
│   │       ├── Jobs.jsx
│   │       ├── Matching.jsx
│   │       ├── Results.jsx
│   │       ├── History.jsx
│   │       └── Admin.jsx
│   └── package.json
├── docs/                       # Architecture diagrams
│   ├── HLD.md                  # High-Level Design (Mermaid)
│   └── tech_stack.html         # Tech stack visual
└── templates/
    └── simulation.html         # Full UI simulation (static)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (Vite) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| AI/LLM | Google Gemini API |
| Auth | JWT + bcrypt |
| Containerization | Docker Compose |

## Core Algorithms

- **Manhattan Distance**: `S = 1 / (1 + Σ|Ri - Ji|)` — similarity scoring
- **Gale-Shapley**: Stable Marriage Algorithm — fair matching with no blocking pairs

## Troubleshooting

**Port conflict on 5433:**
```bash
# Check what's using the port
lsof -i :5433
# Or change DB_PORT in server/.env and docker-compose.yml
```

**Docker not running:**
```bash
# Make sure Docker Desktop is open, then:
docker compose up -d
```

**Gemini API quota exhausted:**
- The matching engine works without LLM (seeded data has pre-computed vectors)
- LLM is only needed for NEW resume/job uploads
- Get a new key or wait for daily quota reset

**npm install fails:**
```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm install
```
