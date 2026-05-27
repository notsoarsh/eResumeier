"""
Stable Marriage Algorithm (Gale-Shapley).

Produces a stable matching between candidates and jobs where no
"blocking pair" exists (i.e., no candidate-job pair would both prefer
each other over their current match).

This implementation uses the candidate-proposing variant.
"""


def gale_shapley(
    candidate_preferences: dict[str, list[str]],
    job_preferences: dict[str, list[str]],
) -> dict[str, str]:
    """
    Run the Gale-Shapley algorithm (candidate-proposing).

    Args:
        candidate_preferences: {candidate_id: [job_ids in preference order]}
        job_preferences: {job_id: [candidate_ids in preference order]}

    Returns:
        Dictionary mapping {candidate_id: job_id} for stable pairs.
    """
    # Track which proposal index each candidate is at
    candidate_next_proposal: dict[str, int] = {c: 0 for c in candidate_preferences}

    # Free candidates queue
    free_candidates: list[str] = list(candidate_preferences.keys())

    # Current engagements: job -> candidate
    job_engaged_to: dict[str, str | None] = {j: None for j in job_preferences}

    # Pre-compute job preference rankings for O(1) comparison
    # job_rank[job][candidate] = rank (lower is better)
    job_rank: dict[str, dict[str, int]] = {}
    for job_id, prefs in job_preferences.items():
        job_rank[job_id] = {candidate: rank for rank, candidate in enumerate(prefs)}

    while free_candidates:
        candidate = free_candidates.pop(0)
        prefs = candidate_preferences[candidate]

        # Get the next job this candidate hasn't proposed to yet
        proposal_idx = candidate_next_proposal[candidate]
        if proposal_idx >= len(prefs):
            # Candidate has exhausted all options (shouldn't happen with equal sizes)
            continue

        job = prefs[proposal_idx]
        candidate_next_proposal[candidate] = proposal_idx + 1

        current_partner = job_engaged_to[job]

        if current_partner is None:
            # Job is free, accept proposal
            job_engaged_to[job] = candidate
        else:
            # Job compares current partner vs new proposer
            if job_rank[job][candidate] < job_rank[job][current_partner]:
                # Job prefers new candidate over current partner
                job_engaged_to[job] = candidate
                # Current partner becomes free again
                free_candidates.append(current_partner)
            else:
                # Job rejects new candidate
                free_candidates.append(candidate)

    # Invert to get candidate -> job mapping
    matches: dict[str, str] = {}
    for job_id, cand_id in job_engaged_to.items():
        if cand_id is not None:
            matches[cand_id] = job_id

    return matches


def verify_stability(
    matches: dict[str, str],
    candidate_preferences: dict[str, list[str]],
    job_preferences: dict[str, list[str]],
) -> list[tuple[str, str]]:
    """
    Verify that a matching is stable by checking for blocking pairs.

    A blocking pair (c, j) exists if:
    - c prefers j over their current match, AND
    - j prefers c over their current match

    Returns list of blocking pairs (empty = stable).
    """
    # Build reverse mapping: job -> candidate
    job_to_candidate = {j: c for c, j in matches.items()}

    blocking_pairs = []

    for candidate, matched_job in matches.items():
        cand_prefs = candidate_preferences[candidate]
        matched_job_rank = cand_prefs.index(matched_job)

        # Check all jobs this candidate prefers over their match
        for preferred_job in cand_prefs[:matched_job_rank]:
            # Who is matched to this preferred job?
            rival = job_to_candidate.get(preferred_job)
            if rival is None:
                continue

            # Does this job prefer our candidate over its current match?
            job_prefs = job_preferences[preferred_job]
            if job_prefs.index(candidate) < job_prefs.index(rival):
                blocking_pairs.append((candidate, preferred_job))

    return blocking_pairs
