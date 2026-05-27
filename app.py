"""
eResumeier - FastAPI Application.

Provides the API endpoints and serves the static HTML UI.
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from core.scoring import similarity_score, build_preference_matrix
from core.stable_marriage import gale_shapley, verify_stability
from core.llm_parser import parse_and_vectorize, FEATURE_DIMENSIONS

app = FastAPI(title="eResumeier", version="1.0.0")
templates = Jinja2Templates(directory="templates")


class MatchRequest(BaseModel):
    resumes: list[dict]  # [{"name": "Alice", "text": "..."}]
    jobs: list[dict]     # [{"title": "Data Scientist", "text": "..."}]


class MatchResult(BaseModel):
    matches: list[dict]
    candidate_features: dict
    job_features: dict
    all_scores: dict
    is_stable: bool
    blocking_pairs: list


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Serve the main UI page."""
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/simulation", response_class=HTMLResponse)
async def simulation(request: Request):
    """Serve the full platform simulation UI."""
    return templates.TemplateResponse(request=request, name="simulation.html")


@app.post("/api/match", response_model=MatchResult)
async def run_matching(data: MatchRequest):
    """
    Full eResumeier pipeline:
    1. Parse each resume and job with LLM
    2. Build feature vectors
    3. Calculate similarity scores (Manhattan Distance)
    4. Build preference matrices
    5. Run Gale-Shapley stable matching
    6. Return results
    """
    # Step 1 & 2: Parse and vectorize
    candidate_vectors: dict[str, list[float]] = {}
    candidate_features: dict[str, dict] = {}

    try:
        for resume in data.resumes:
            name = resume["name"]
            features, vector = parse_and_vectorize(resume["text"], "resume")
            candidate_vectors[name] = vector
            candidate_features[name] = features

        job_vectors: dict[str, list[float]] = {}
        job_features: dict[str, dict] = {}

        for job in data.jobs:
            title = job["title"]
            features, vector = parse_and_vectorize(job["text"], "job_description")
            job_vectors[title] = vector
            job_features[title] = features
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Step 3 & 4: Score and build preferences
    cand_prefs, job_prefs, scores = build_preference_matrix(
        candidate_vectors, job_vectors
    )

    # Convert tuple keys to string for JSON serialization
    all_scores = {
        f"{c}|{j}": round(s, 4) for (c, j), s in scores.items()
    }

    # Step 5: Stable matching
    matches = gale_shapley(cand_prefs, job_prefs)

    # Step 6: Verify stability
    blocking_pairs = verify_stability(matches, cand_prefs, job_prefs)

    # Format results
    match_list = []
    for candidate, job in sorted(matches.items()):
        match_list.append({
            "candidate": candidate,
            "job": job,
            "score": round(scores[(candidate, job)], 4),
        })

    return MatchResult(
        matches=match_list,
        candidate_features=candidate_features,
        job_features=job_features,
        all_scores=all_scores,
        is_stable=len(blocking_pairs) == 0,
        blocking_pairs=[(c, j) for c, j in blocking_pairs],
    )


@app.post("/api/match-demo")
async def run_demo_matching():
    """
    Demo endpoint using mock data (no LLM required).
    Useful for testing the algorithm without an API key.
    """
    from test_core import MOCK_CANDIDATES, MOCK_JOBS

    cand_prefs, job_prefs, scores = build_preference_matrix(
        MOCK_CANDIDATES, MOCK_JOBS
    )

    all_scores = {
        f"{c}|{j}": round(s, 4) for (c, j), s in scores.items()
    }

    matches = gale_shapley(cand_prefs, job_prefs)
    blocking_pairs = verify_stability(matches, cand_prefs, job_prefs)

    match_list = []
    for candidate, job in sorted(matches.items()):
        match_list.append({
            "candidate": candidate,
            "job": job,
            "score": round(scores[(candidate, job)], 4),
        })

    # Build feature dicts from vectors for display
    candidate_features = {
        name: dict(zip(FEATURE_DIMENSIONS, [int(v) for v in vec]))
        for name, vec in MOCK_CANDIDATES.items()
    }
    job_features = {
        name: dict(zip(FEATURE_DIMENSIONS, [int(v) for v in vec]))
        for name, vec in MOCK_JOBS.items()
    }

    return {
        "matches": match_list,
        "candidate_features": candidate_features,
        "job_features": job_features,
        "all_scores": all_scores,
        "is_stable": len(blocking_pairs) == 0,
        "blocking_pairs": [(c, j) for c, j in blocking_pairs],
    }
