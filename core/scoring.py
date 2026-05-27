"""
Similarity Scoring using Manhattan Distance.

Formula: S = 1 / (1 + Σ|Ri - Ji|)

Where:
- R is the resume feature vector
- J is the job feature vector
- S is the similarity score (0, 1] where 1 = perfect match
"""


def manhattan_distance(vector_a: list[float], vector_b: list[float]) -> float:
    """Calculate Manhattan Distance between two vectors."""
    if len(vector_a) != len(vector_b):
        raise ValueError(
            f"Vectors must have equal length. Got {len(vector_a)} and {len(vector_b)}"
        )
    return sum(abs(a - b) for a, b in zip(vector_a, vector_b))


def similarity_score(resume_vector: list[float], job_vector: list[float]) -> float:
    """
    Calculate similarity score between a resume and job vector.
    S = 1 / (1 + Σ|Ri - Ji|)
    Returns a value in (0, 1] where 1 means identical vectors.
    """
    distance = manhattan_distance(resume_vector, job_vector)
    return 1.0 / (1.0 + distance)


def build_preference_matrix(
    candidates: dict[str, list[float]],
    jobs: dict[str, list[float]],
) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """
    Build preference matrices for candidates and jobs based on similarity scores.

    Returns:
        - candidate_preferences: {candidate_id: [job_ids sorted by preference descending]}
        - job_preferences: {job_id: [candidate_ids sorted by preference descending]}
    """
    # Score every candidate-job pair
    scores: dict[tuple[str, str], float] = {}
    for cand_id, cand_vec in candidates.items():
        for job_id, job_vec in jobs.items():
            scores[(cand_id, job_id)] = similarity_score(cand_vec, job_vec)

    # Build candidate preferences (each candidate ranks jobs best-to-worst)
    candidate_preferences: dict[str, list[str]] = {}
    for cand_id in candidates:
        ranked_jobs = sorted(
            jobs.keys(),
            key=lambda j: scores[(cand_id, j)],
            reverse=True,
        )
        candidate_preferences[cand_id] = ranked_jobs

    # Build job preferences (each job ranks candidates best-to-worst)
    job_preferences: dict[str, list[str]] = {}
    for job_id in jobs:
        ranked_candidates = sorted(
            candidates.keys(),
            key=lambda c: scores[(c, job_id)],
            reverse=True,
        )
        job_preferences[job_id] = ranked_candidates

    return candidate_preferences, job_preferences, scores
