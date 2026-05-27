/**
 * Matching Engine Service
 * Report Section 3.1 (II): Accepts batch requests containing candidate and job
 * feature vectors. Computes pairwise Manhattan Distance similarity scores and,
 * on demand, executes the Gale-Shapley algorithm over the full preference-list
 * matrix to return a globally stable assignment.
 *
 * Report Section 3.4 (III): Manhattan Distance Similarity Formula
 * S(R, J) = 1 / (1 + Σ |Ri − Ji|) for i = 1 to n
 *
 * Report Section 3.4 (IV): Stable Marriage Algorithm (Gale-Shapley)
 * Candidate-proposing variant. Uses FIFO queue for proposals and hash map
 * for O(1) preference comparison.
 *
 * Report Section 6.3: Two primary internal functions:
 * - computeSimilarity(resumeVector, jobVector, weights)
 * - runStableMarriage(candidatePreferences, employerPreferences)
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

class MatchingService {
  /**
   * Compute Manhattan Distance similarity score between two vectors.
   * Report Section 3.4 (III): S(R, J) = 1 / (1 + Σ |Ri − Ji|) for i = 1 to n
   *
   * Report Section 6.3: Single-pass summation loop for O(n) time complexity per pair.
   * Dimensional weights can be applied as multipliers within the summation.
   *
   * @param {number[]} vectorA - Resume feature vector
   * @param {number[]} vectorB - Job feature vector
   * @param {number[]|null} weights - Optional dimensional weights
   * @returns {number} Similarity score in (0, 1]
   */
  computeSimilarity(vectorA, vectorB, weights = null) {
    if (vectorA.length !== vectorB.length) {
      throw new Error(`Vector length mismatch: ${vectorA.length} vs ${vectorB.length}`);
    }

    let weightedDistance = 0;

    for (let i = 0; i < vectorA.length; i++) {
      const diff = Math.abs(vectorA[i] - vectorB[i]);
      const weight = weights ? weights[i] : 1;
      weightedDistance += diff * weight;
    }

    return 1 / (1 + weightedDistance);
  }

  /**
   * Compute pairwise similarity scores for all candidate-job combinations.
   * Returns an n×m score matrix.
   *
   * @param {Object} candidates - { candidateId: vector[] }
   * @param {Object} jobs - { jobId: vector[] }
   * @param {number[]|null} weights - Optional dimensional weights
   * @returns {Object} { scores: { "candId|jobId": score }, matrix: [...] }
   */
  computeAllScores(candidates, jobs, weights = null) {
    const scores = {};
    const candidateIds = Object.keys(candidates);
    const jobIds = Object.keys(jobs);

    for (const candId of candidateIds) {
      for (const jobId of jobIds) {
        const score = this.computeSimilarity(candidates[candId], jobs[jobId], weights);
        scores[`${candId}|${jobId}`] = score;
      }
    }

    return { scores, candidateIds, jobIds };
  }

  /**
   * Build preference matrices from similarity scores.
   * Each candidate ranks all jobs by descending score.
   * Each job ranks all candidates by descending score.
   *
   * @param {Object} scores - { "candId|jobId": score }
   * @param {string[]} candidateIds
   * @param {string[]} jobIds
   * @returns {{ candidatePrefs: Object, jobPrefs: Object }}
   */
  buildPreferenceMatrices(scores, candidateIds, jobIds) {
    // Candidate preferences: each candidate ranks jobs best-to-worst
    const candidatePrefs = {};
    for (const candId of candidateIds) {
      const ranked = [...jobIds].sort((a, b) => {
        return scores[`${candId}|${b}`] - scores[`${candId}|${a}`];
      });
      candidatePrefs[candId] = ranked;
    }

    // Job preferences: each job ranks candidates best-to-worst
    const jobPrefs = {};
    for (const jobId of jobIds) {
      const ranked = [...candidateIds].sort((a, b) => {
        return scores[`${b}|${jobId}`] - scores[`${a}|${jobId}`];
      });
      jobPrefs[jobId] = ranked;
    }

    return { candidatePrefs, jobPrefs };
  }

  /**
   * Run the Gale-Shapley Stable Marriage Algorithm (candidate-proposing).
   *
   * Report Section 3.4 (IV):
   * 1. Initialise all candidates and employers as unmatched.
   * 2. Generate preference lists based on similarity score rankings.
   * 3. While any unmatched candidate with a non-exhausted preference list exists:
   *    a. Select the first unmatched candidate from the queue.
   *    b. Propose to highest-ranked job not yet proposed to.
   *    c. Job accepts if unmatched, or if proposer preferred over current match.
   *    d. If rejected, candidate advances to next preference.
   * 4. Terminates when no unmatched candidate with outstanding proposal remains.
   *
   * Report Section 6.3: Uses FIFO queue for candidate proposals and hash map
   * tracking each employer's current tentative match and their ranked position
   * (enabling O(1) comparison in the 'prefer over current' check).
   *
   * @param {Object} candidatePrefs - { candId: [jobId, jobId, ...] }
   * @param {Object} jobPrefs - { jobId: [candId, candId, ...] }
   * @returns {Object} { matches: { candId: jobId }, proposalCount: number }
   */
  runGaleShapley(candidatePrefs, jobPrefs) {
    const candidateIds = Object.keys(candidatePrefs);
    const jobIds = Object.keys(jobPrefs);

    // Pre-compute job preference rankings for O(1) comparison
    // jobRank[jobId][candId] = rank (lower is better)
    const jobRank = {};
    for (const jobId of jobIds) {
      jobRank[jobId] = {};
      jobPrefs[jobId].forEach((candId, index) => {
        jobRank[jobId][candId] = index;
      });
    }

    // Track which proposal index each candidate is at
    const nextProposal = {};
    candidateIds.forEach(id => { nextProposal[id] = 0; });

    // Free candidates queue (FIFO)
    const freeCandidates = [...candidateIds];

    // Current engagements: job -> candidate
    const jobEngagedTo = {};
    jobIds.forEach(id => { jobEngagedTo[id] = null; });

    let proposalCount = 0;

    while (freeCandidates.length > 0) {
      const candidate = freeCandidates.shift();
      const prefs = candidatePrefs[candidate];

      // Get next job this candidate hasn't proposed to
      const proposalIdx = nextProposal[candidate];
      if (proposalIdx >= prefs.length) {
        // Candidate has exhausted all options
        continue;
      }

      const job = prefs[proposalIdx];
      nextProposal[candidate] = proposalIdx + 1;
      proposalCount++;

      const currentPartner = jobEngagedTo[job];

      if (currentPartner === null) {
        // Job is free, accept proposal
        jobEngagedTo[job] = candidate;
      } else {
        // Job compares current partner vs new proposer using pre-computed ranks
        const currentRank = jobRank[job][currentPartner];
        const proposerRank = jobRank[job][candidate];

        if (proposerRank < currentRank) {
          // Job prefers new candidate over current partner
          jobEngagedTo[job] = candidate;
          // Current partner becomes free again
          freeCandidates.push(currentPartner);
        } else {
          // Job rejects new candidate
          freeCandidates.push(candidate);
        }
      }
    }

    // Build candidate -> job mapping
    const matches = {};
    for (const [jobId, candId] of Object.entries(jobEngagedTo)) {
      if (candId !== null) {
        matches[candId] = jobId;
      }
    }

    return { matches, proposalCount };
  }

  /**
   * Verify that a matching is stable by checking for blocking pairs.
   *
   * A blocking pair (c, j) exists if:
   * - c prefers j over their current match, AND
   * - j prefers c over their current match
   *
   * Report Section 6.3: Proof-of-stability log that records the count of
   * considered proposals, confirming the absence of blocking pairs.
   *
   * @param {Object} matches - { candId: jobId }
   * @param {Object} candidatePrefs - { candId: [jobId, ...] }
   * @param {Object} jobPrefs - { jobId: [candId, ...] }
   * @returns {{ isStable: boolean, blockingPairs: Array }}
   */
  verifyStability(matches, candidatePrefs, jobPrefs) {
    const blockingPairs = [];

    // Build reverse mapping: job -> candidate
    const jobToCandidate = {};
    for (const [candId, jobId] of Object.entries(matches)) {
      jobToCandidate[jobId] = candId;
    }

    for (const [candidate, matchedJob] of Object.entries(matches)) {
      const candPrefs = candidatePrefs[candidate];
      const matchedJobRank = candPrefs.indexOf(matchedJob);

      // Check all jobs this candidate prefers over their match
      for (let i = 0; i < matchedJobRank; i++) {
        const preferredJob = candPrefs[i];
        const rival = jobToCandidate[preferredJob];

        if (!rival) continue;

        // Does this job prefer our candidate over its current match?
        const jobPrefList = jobPrefs[preferredJob];
        const candidateRankAtJob = jobPrefList.indexOf(candidate);
        const rivalRankAtJob = jobPrefList.indexOf(rival);

        if (candidateRankAtJob < rivalRankAtJob) {
          blockingPairs.push({ candidate, job: preferredJob });
        }
      }
    }

    return {
      isStable: blockingPairs.length === 0,
      blockingPairs,
    };
  }

  /**
   * Classify match into tier based on similarity score.
   * Report Section 5.2: A: 80-100%, B: 60-79%, C: 40-59%
   */
  classifyTier(score) {
    const pct = score * 100;
    if (pct >= 80) return 'A';
    if (pct >= 60) return 'B';
    if (pct >= 40) return 'C';
    return 'C'; // Below 40% still gets C
  }

  /**
   * Full matching pipeline: fetch vectors -> score -> match -> store results
   *
   * @param {string} initiatedBy - User ID who triggered the run
   * @param {string[]|null} candidateIds - Specific resume IDs (null = all parsed)
   * @param {string[]|null} jobIds - Specific job IDs (null = all open)
   * @returns {Object} Full match run results
   */
  async runFullMatch(initiatedBy, candidateIds = null, jobIds = null) {
    // Step 1: Fetch candidate vectors
    let candidateQuery = `
      SELECT fv.entity_id, fv.vector_data, r.user_id
      FROM feature_vectors fv
      JOIN resumes r ON r.resume_id = fv.entity_id
      WHERE fv.entity_type = 'resume'
    `;
    const candidateParams = [];

    if (candidateIds && candidateIds.length > 0) {
      candidateQuery += ` AND fv.entity_id = ANY($1)`;
      candidateParams.push(candidateIds);
    }

    const candResult = await pool.query(candidateQuery, candidateParams);

    if (candResult.rows.length === 0) {
      throw new Error('No candidate vectors found. Upload and parse resumes first.');
    }

    // Step 2: Fetch job vectors
    let jobQuery = `
      SELECT fv.entity_id, fv.vector_data, jp.title, jp.company
      FROM feature_vectors fv
      JOIN job_postings jp ON jp.job_id = fv.entity_id
      WHERE fv.entity_type = 'job' AND jp.status = 'open'
    `;
    const jobParams = [];

    if (jobIds && jobIds.length > 0) {
      jobQuery += ` AND fv.entity_id = ANY($1)`;
      jobParams.push(jobIds);
    }

    const jobResult = await pool.query(jobQuery, jobParams);

    if (jobResult.rows.length === 0) {
      throw new Error('No job vectors found. Create and parse job postings first.');
    }

    // Step 3: Build vector maps
    const candidates = {};
    const candidateMeta = {};
    for (const row of candResult.rows) {
      candidates[row.entity_id] = row.vector_data;
      candidateMeta[row.entity_id] = { userId: row.user_id };
    }

    const jobs = {};
    const jobMeta = {};
    for (const row of jobResult.rows) {
      jobs[row.entity_id] = row.vector_data;
      jobMeta[row.entity_id] = { title: row.title, company: row.company };
    }

    // Step 4: Compute all pairwise scores
    const { scores, candidateIds: cIds, jobIds: jIds } = this.computeAllScores(candidates, jobs);

    // Step 5: Build preference matrices
    const { candidatePrefs, jobPrefs } = this.buildPreferenceMatrices(scores, cIds, jIds);

    // Step 6: Run Gale-Shapley
    const { matches, proposalCount } = this.runGaleShapley(candidatePrefs, jobPrefs);

    // Step 7: Verify stability
    const { isStable, blockingPairs } = this.verifyStability(matches, candidatePrefs, jobPrefs);

    // Step 8: Compute average score
    const matchEntries = Object.entries(matches);
    const avgScore = matchEntries.length > 0
      ? matchEntries.reduce((sum, [c, j]) => sum + scores[`${c}|${j}`], 0) / matchEntries.length
      : 0;

    // Step 9: Create match run record
    const runResult = await pool.query(
      `INSERT INTO match_runs (initiated_by, algorithm, distance_metric, candidate_count, job_count, avg_score, is_stable)
       VALUES ($1, 'gale-shapley', 'manhattan', $2, $3, $4, $5)
       RETURNING run_id`,
      [initiatedBy, cIds.length, jIds.length, avgScore.toFixed(4), isStable]
    );
    const runId = runResult.rows[0].run_id;

    // Step 10: Store individual match results
    const matchResults = [];
    let rank = 1;

    // Sort matches by score descending for ranking
    const sortedMatches = matchEntries.sort((a, b) => {
      return scores[`${b[0]}|${b[1]}`] - scores[`${a[0]}|${a[1]}`];
    });

    for (const [candId, jobId] of sortedMatches) {
      const score = scores[`${candId}|${jobId}`];
      const tier = this.classifyTier(score);

      const justification = {
        score: parseFloat(score.toFixed(4)),
        percentage: parseFloat((score * 100).toFixed(1)),
        tier,
        candidatePreferenceRank: candidatePrefs[candId].indexOf(jobId) + 1,
        jobPreferenceRank: jobPrefs[jobId].indexOf(candId) + 1,
        isStableMatch: true,
        proposalCount,
      };

      await pool.query(
        `INSERT INTO match_results (run_id, resume_id, job_id, similarity_score, rank, tier, justification_json, is_stable_match)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [runId, candId, jobId, score.toFixed(4), rank, tier, JSON.stringify(justification), true]
      );

      matchResults.push({
        rank,
        candidateId: candId,
        jobId,
        jobTitle: jobMeta[jobId]?.title,
        jobCompany: jobMeta[jobId]?.company,
        score: parseFloat(score.toFixed(4)),
        percentage: parseFloat((score * 100).toFixed(1)),
        tier,
      });

      rank++;
    }

    logger.info(`Match run ${runId}: ${matchEntries.length} pairs, avg ${(avgScore * 100).toFixed(1)}%, stable: ${isStable}`);

    return {
      runId,
      algorithm: 'gale-shapley',
      distanceMetric: 'manhattan',
      candidateCount: cIds.length,
      jobCount: jIds.length,
      matchCount: matchEntries.length,
      avgScore: parseFloat(avgScore.toFixed(4)),
      avgPercentage: parseFloat((avgScore * 100).toFixed(1)),
      isStable,
      blockingPairs: blockingPairs.length,
      proposalCount,
      matches: matchResults,
      allScores: scores,
    };
  }
}

module.exports = new MatchingService();
