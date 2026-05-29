# eResumeier — Setup Guide

This guide will help you run eResumeier on your local machine. No prior development experience needed — just follow the steps.

---

## Prerequisites (Install These First)

You need 3 things installed. If you already have them, skip to Step 1.

### 1. Node.js (v18 or above)

**Mac:**
- Go to https://nodejs.org/
- Download the LTS version
- Open the downloaded file and follow the installer

**Windows:**
- Go to https://nodejs.org/
- Download the LTS version (Windows Installer .msi)
- Run the installer, click Next through all steps
- Restart your computer after installation

**Verify:** Open Terminal (Mac) or Command Prompt (Windows) and type:
```
node --version
```
You should see something like `v18.x.x` or higher.

### 2. Docker Desktop

**Mac:**
- Go to https://www.docker.com/products/docker-desktop/
- Download "Docker Desktop for Mac"
- Open the .dmg file, drag Docker to Applications
- Open Docker from Applications — wait until it says "Docker is running"

**Windows:**
- Go to https://www.docker.com/products/docker-desktop/
- Download "Docker Desktop for Windows"
- Run the installer
- Restart your computer
- Open Docker Desktop — wait until it says "Docker is running"

**Verify:** Open Terminal/Command Prompt and type:
```
docker --version
```

### 3. Git

**Mac:** Already installed. Verify with `git --version`

**Windows:**
- Go to https://git-scm.com/download/win
- Download and install (click Next through all steps)
- Restart your computer

---

## Step 1: Download the Project

Open Terminal (Mac) or Command Prompt (Windows):

```
git clone https://github.com/notsoarsh/eResumeier.git
cd eResumeier
```

---

## Step 2: Start the Database

Make sure Docker Desktop is open and running (you should see the whale icon in your taskbar/menu bar).

```
docker compose up -d
```

Wait 10 seconds. Then verify:
```
docker ps
```
You should see two containers: `eresumeier-postgres` and `eresumeier-redis`.

---

## Step 3: Setup the Backend

```
cd server
npm install
```

This will download all required packages (takes 1-2 minutes).

Now create the configuration file:

**Mac:**
```
cp .env.example .env
```

**Windows:**
```
copy .env.example .env
```

Now open the `.env` file in any text editor and add your Gemini API key:
- Go to https://aistudio.google.com/apikey
- Click "Create API Key" → "Create API key in new project"
- Copy the key
- Paste it in the `.env` file next to `GEMINI_API_KEY=`

(Optional) For email notifications, also add:
```
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your-app-password
```
To get an app password: https://myaccount.google.com/apppasswords

Now create the database tables:
```
npm run migrate
```

Load sample data (5 Nielsen job postings + 5 candidates):
```
npm run seed
```

Start the backend server:
```
npm run dev
```

You should see: `eResumeier server running on port 5000`

**Keep this terminal open. Open a NEW terminal for the next step.**

---

## Step 4: Setup the Frontend

Open a new Terminal/Command Prompt window:

```
cd eResumeier/client
npm install
npm run dev
```

You should see: `Local: http://localhost:3000/`

---

## Step 5: Open the App

Open your web browser and go to:

**http://localhost:3000**

---

## Step 6: Login

Use these test accounts (password for all: `password123`):

| Email | Role | What you can do |
|-------|------|-----------------|
| admin@nielsen.com | Admin | Run matching, view all resumes, send emails |
| hr@nielsen.com | Employer | Post jobs, view matched candidates |
| rahul.de@demo.com | Candidate | Upload resume, view job matches |
| amit.ml@demo.com | Candidate | Upload resume, view job matches |
| sneha.em@demo.com | Candidate | Upload resume, view job matches |
| neha.da@demo.com | Candidate | Upload resume, view job matches |

---

## How to Use (Demo Flow)

### As Admin:
1. Login as `admin@nielsen.com`
2. Go to **Resumes** — see all uploaded candidate resumes
3. Go to **Jobs** — see Nielsen's open positions
4. Go to **Run Matching** — click the button to run the algorithm
5. Go to **Results** — see who matched to which job with scores
6. Click **Send Email** on 80%+ matches to notify candidates

### As Candidate:
1. Login as any candidate (or register a new account)
2. Go to **My Resumes** — upload your resume (paste text or upload PDF)
3. Wait for admin to run matching
4. Go to **My Matches** — see which job you were matched to
5. Check **Dashboard** for notifications

### As Employer:
1. Login as `hr@nielsen.com`
2. Go to **My Jobs** — see posted positions, create new ones
3. Go to **Matched Candidates** — see who matched to your jobs

---

## Troubleshooting

### "docker compose up" fails
- Make sure Docker Desktop is open and running
- On Windows, you might need to run Command Prompt as Administrator

### "npm install" fails
- Make sure Node.js is installed: `node --version`
- Try deleting `node_modules` folder and running `npm install` again

### "Port 5000 already in use"
- Another program is using port 5000
- On Mac: `lsof -i :5000` then `kill -9 <PID>`
- On Windows: `netstat -ano | findstr :5000` then `taskkill /PID <PID> /F`

### "Port 5433 already in use"
- You have PostgreSQL installed locally
- Either stop it, or change `DB_PORT` in `server/.env` and `docker-compose.yml`

### Resume parsing fails (LLM error)
- Your Gemini API key might be exhausted (free tier has daily limits)
- The matching engine still works with seeded data — just can't parse NEW resumes
- Wait 24 hours for quota reset, or create a new Google Cloud project for a fresh key

### Email sending fails
- Make sure `EMAIL_USER` and `EMAIL_PASS` are set in `server/.env`
- The password must be a Gmail App Password (not your regular password)
- Get one from: https://myaccount.google.com/apppasswords

---

## Stopping the App

1. Press `Ctrl+C` in both terminal windows (frontend and backend)
2. Stop the database: `docker compose down`

---

## Starting Again Later

```
# Terminal 1
cd eResumeier
docker compose up -d
cd server
npm run dev

# Terminal 2
cd eResumeier/client
npm run dev
```

Then open http://localhost:3000
