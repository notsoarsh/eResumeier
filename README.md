# ⚡ eResumeier

**Intelligent Resume Analyzing & Job Matching Engine**

An MVP that demonstrates the core algorithmic pipeline: parsing unstructured text with LLMs, converting to feature vectors, scoring similarity using Manhattan Distance, and producing stable matches using the Gale-Shapley algorithm.

## Architecture

```
Raw Text (Resume/Job) 
    → LLM Parser (OpenAI GPT-3.5) 
    → Standardized JSON (12 dimensions, scored 1-10)
    → Feature Vector [float × 12]
    → Manhattan Distance Scoring: S = 1/(1 + Σ|Ri - Ji|)
    → Preference Matrices
    → Gale-Shapley Stable Marriage Algorithm
    → Optimal Stable Matches (no blocking pairs)
```

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Set up your OpenAI API key

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Test the core engine (no API key needed)

```bash
python test_core.py
```

### 4. Run the web application

```bash
python run.py
```

Then open http://localhost:8000 in your browser.

## Usage

- **Run eResumeier** (requires OpenAI API key): Parses your input text through GPT-3.5 to extract features, then runs the matching algorithm.
- **Run Demo** (no API key needed): Uses pre-built mock vectors to demonstrate the scoring and matching algorithms.

## Core Algorithms

### Manhattan Distance Similarity

```
S = 1 / (1 + Σ|Ri - Ji|)
```

Where R is the resume vector and J is the job vector. Score is in (0, 1] where 1 = perfect match.

### Gale-Shapley (Stable Marriage)

The candidate-proposing variant ensures:
- Every candidate is matched to exactly one job
- No "blocking pair" exists (no candidate-job pair would both prefer each other over their current match)
- The matching is optimal for the proposing side (candidates)

## Feature Dimensions (12)

| Dimension | Scale |
|-----------|-------|
| Python | 1-10 proficiency |
| JavaScript | 1-10 proficiency |
| SQL | 1-10 proficiency |
| Machine Learning | 1-10 proficiency |
| Data Analysis | 1-10 proficiency |
| Cloud Computing | 1-10 proficiency |
| Communication | 1-10 skill level |
| Leadership | 1-10 capability |
| Problem Solving | 1-10 capability |
| Years Experience | 1-10 (mapped from years) |
| Education Level | 1-10 (HS to PhD+) |
| Project Management | 1-10 proficiency |

## Project Structure

```
eResumeier/
├── core/
│   ├── __init__.py
│   ├── scoring.py          # Manhattan Distance + preference matrices
│   ├── stable_marriage.py  # Gale-Shapley algorithm
│   └── llm_parser.py       # OpenAI integration + feature extraction
├── templates/
│   └── index.html          # Web UI
├── app.py                  # FastAPI application
├── run.py                  # Server entry point
├── test_core.py            # Core engine test with mock data
├── requirements.txt
├── .env.example
└── README.md
```
