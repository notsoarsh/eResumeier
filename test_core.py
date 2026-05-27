"""
Step 1 Test: Validate core engine with mock data.

Generates mock feature vectors for 5 candidates and 5 jobs,
runs similarity scoring, builds preference matrices, runs
Gale-Shapley, and verifies stability.
"""

from core.scoring import similarity_score, build_preference_matrix
from core.stable_marriage import gale_shapley, verify_stability

# Mock feature vectors (12 dimensions matching FEATURE_DIMENSIONS)
# [python, javascript, sql, ml, data_analysis, cloud, communication,
#  leadership, problem_solving, years_exp, education, project_mgmt]

MOCK_CANDIDATES = {
    "Alice": [9, 3, 7, 8, 9, 6, 5, 3, 8, 5, 7, 2],    # Data scientist
    "Bob": [4, 9, 5, 2, 3, 7, 7, 5, 6, 6, 5, 6],       # Frontend dev
    "Carol": [7, 6, 8, 5, 7, 8, 6, 7, 7, 7, 7, 8],     # Full-stack senior
    "Dave": [8, 4, 6, 9, 8, 5, 4, 2, 9, 4, 9, 2],      # ML researcher
    "Eve": [5, 7, 4, 3, 4, 9, 8, 8, 6, 8, 5, 9],       # Cloud architect/PM
}

MOCK_JOBS = {
    "DataSciRole": [8, 2, 7, 9, 9, 5, 5, 3, 8, 5, 7, 3],      # Data scientist
    "FrontendRole": [3, 9, 3, 1, 2, 5, 8, 4, 6, 4, 5, 5],      # Frontend dev
    "BackendRole": [7, 5, 9, 4, 5, 8, 5, 5, 7, 6, 5, 6],       # Backend dev
    "MLEngineer": [9, 3, 5, 10, 8, 7, 4, 3, 9, 5, 9, 3],       # ML engineer
    "TechLead": [6, 6, 6, 4, 5, 7, 8, 9, 7, 8, 6, 9],          # Tech lead
}


def main():
    print("=" * 70)
    print("eResumeier - Core Engine Test (Step 1)")
    print("=" * 70)

    # --- Similarity Scoring ---
    print("\n📊 SIMILARITY SCORES (Manhattan Distance)")
    print("-" * 70)
    header = f"{'':12}" + "".join(f"{j:>14}" for j in MOCK_JOBS)
    print(header)

    for cand_id, cand_vec in MOCK_CANDIDATES.items():
        row = f"{cand_id:12}"
        for job_id, job_vec in MOCK_JOBS.items():
            score = similarity_score(cand_vec, job_vec)
            row += f"{score:14.4f}"
        print(row)

    # --- Preference Matrices ---
    print("\n\n📋 PREFERENCE MATRICES")
    print("-" * 70)

    cand_prefs, job_prefs, scores = build_preference_matrix(
        MOCK_CANDIDATES, MOCK_JOBS
    )

    print("\nCandidate Preferences (most preferred → least preferred):")
    for cand, prefs in cand_prefs.items():
        scores_str = ", ".join(
            f"{j}({scores[(cand, j)]:.3f})" for j in prefs
        )
        print(f"  {cand:8} → {scores_str}")

    print("\nJob Preferences (most preferred → least preferred):")
    for job, prefs in job_prefs.items():
        scores_str = ", ".join(
            f"{c}({scores[(c, job)]:.3f})" for c in prefs
        )
        print(f"  {job:14} → {scores_str}")

    # --- Stable Marriage ---
    print("\n\n💍 STABLE MATCHING (Gale-Shapley)")
    print("-" * 70)

    matches = gale_shapley(cand_prefs, job_prefs)

    print("\nFinal Stable Pairs:")
    for candidate, job in sorted(matches.items()):
        score = scores[(candidate, job)]
        print(f"  {candidate:8} ↔ {job:14}  (similarity: {score:.4f})")

    # --- Stability Verification ---
    print("\n\n✅ STABILITY VERIFICATION")
    print("-" * 70)

    blocking_pairs = verify_stability(matches, cand_prefs, job_prefs)
    if not blocking_pairs:
        print("  ✓ Matching is STABLE - no blocking pairs found!")
    else:
        print(f"  ✗ Found {len(blocking_pairs)} blocking pair(s):")
        for c, j in blocking_pairs:
            print(f"    ({c}, {j})")

    print("\n" + "=" * 70)
    print("Core engine test complete.")
    print("=" * 70)


if __name__ == "__main__":
    main()
