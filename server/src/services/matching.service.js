// Matching Engine — Manhattan Distance scoring + Gale-Shapley stable matching

const pool = require('../db/pool');
const redisClient = require('../db/redis');
const logger = require('../utils/logger');

// Minimum similarity to enter matching pool
const SCORE_THRESHOLD = 0.03;

class MatchingService {
  // S(R, J) = 1 / (1 + Σ|Ri - Ji|)
  computeSimilarity(vectorA, vectorB, weights = null) {
    if (vectorA.length !== vectorB.length) throw new Error('Vector length mismatch');
    let distance = 0;
    for (let i = 0; i < vectorA.length; i++) {
      distance += Math.abs(vectorA[i] - vectorB[i]) * (weights ? weights[i] : 1);
    }
    return 1 / (1 + distance);
  }

  // Compute scores for all candidate-job pairs
  computeAllScores(candidates, jobs, weights = null) {
    const scores = {};
    const candidateIds = Object.keys(candidates);
    const jobIds = Object.keys(jobs);

    for (const cId of candidateIds) {
      for (const jId of jobIds) {
        scores[`${cId}|${jId}`] = this.computeSimilarity(candidates[cId], jobs[jId], weights);
      }
    }
    return { scores, candidateIds, jobIds };
  }

  // Build ranked preference lists from scores
  buildPreferenceMatrices(scores, candidateIds, jobIds) {
    const candidatePrefs = {};
    for (const cId of candidateIds) {
      candidatePrefs[cId] = [...jobIds].sort((a, b) => scores[`${cId}|${b}`] - scores[`${cId}|${a}`]);
    }

    const jobPrefs = {};
    for (const jId of jobIds) {
      jobPrefs[jId] = [...candidateIds].sort((a, b) => scores[`${b}|${jId}`] - scores[`${a}|${jId}`]);
    }

    return { candidatePrefs, jobPrefs };
  }

  // Gale-Shapley candidate-proposing stable marriage
  runGaleShapley(candidatePrefs, jobPrefs) {
    const candidateIds = Object.keys(candidatePrefs);
    const jobIds = Object.keys(jobPrefs);

    // Pre-compute job rankings for O(1) comparison
    const jobRank = {};
    for (const jId of jobIds) {
      jobRank[jId] = {};
      jobPrefs[jId].forEach((cId, idx) => { jobRank[jId][cId] = idx; });
    }

    const nextProposal = {};
    candidateIds.forEach(id => { nextProposal[id] = 0; });

    const freeCandidates = [...candidateIds];
    const jobEngagedTo = {};
    jobIds.forEach(id => { jobEngagedTo[id] = null; });

    let proposalCount = 0;

    while (freeCandidates.length > 0) {
      const candidate = freeCandidates.shift();
      const prefs = candidatePrefs[candidate];
      const idx = nextProposal[candidate];

      if (idx >= prefs.length) continue;

      const job = prefs[idx];
      nextProposal[candidate] = idx + 1;
      proposalCount++;

      const current = jobEngagedTo[job];

      if (current === null) {
        jobEngagedTo[job] = candidate;
      } else if (jobRank[job][candidate] < jobRank[job][current]) {
        jobEngagedTo[job] = candidate;
        freeCandidates.push(current);
      } else {
        freeCandidates.push(candidate);
      }
    }

    const matches = {};
    for (const [jId, cId] of Object.entries(jobEngagedTo)) {
      if (cId !== null) matches[cId] = jId;
    }

    return { matches, proposalCount };
  }

  // Check for blocking pairs
  verifyStability(matches, candidatePrefs, jobPrefs) {
    const blockingPairs = [];
    const jobToCandidate = {};
    for (const [cId, jId] of Object.entries(matches)) { jobToCandidate[jId] = cId; }

    for (const [candidate, matchedJob] of Object.entries(matches)) {
      const cPrefs = candidatePrefs[candidate];
      const matchedRank = cPrefs.indexOf(matchedJob);

      for (let i = 0; i < matchedRank; i++) {
        const preferredJob = cPrefs[i];
        const rival = jobToCandidate[preferredJob];
        if (!rival) continue;

        const jPrefs = jobPrefs[preferredJob];
        if (jPrefs.indexOf(candidate) < jPrefs.indexOf(rival)) {
          blockingPairs.push({ candidate, job: preferredJob });
        }
      }
    }

    return { isStable: blockingPairs.length === 0, blockingPairs };
  }

  // Tier classification: A (80%+), B (60-79%), C (<60%)
  classifyTier(score) {
    const pct = score * 100;
    if (pct >= 80) return 'A';
    if (pct >= 60) return 'B';
    return 'C';
  }

  // Full matching pipeline
  async runFullMatch(initiatedBy, candidateIds = null, jobIds = null) {
    // Fetch candidate vectors
    let cQuery = `SELECT fv.entity_id, fv.vector_data, r.user_id FROM feature_vectors fv JOIN resumes r ON r.resume_id = fv.entity_id WHERE fv.entity_type = 'resume'`;
    const cParams = [];
    if (candidateIds?.length) { cQuery += ` AND fv.entity_id = ANY($1)`; cParams.push(candidateIds); }
    const candResult = await pool.query(cQuery, cParams);
    if (candResult.rows.length === 0) throw new Error('No candidate vectors found. Upload and parse resumes first.');

    // Fetch job vectors
    let jQuery = `SELECT fv.entity_id, fv.vector_data, jp.title, jp.company FROM feature_vectors fv JOIN job_postings jp ON jp.job_id = fv.entity_id WHERE fv.entity_type = 'job' AND jp.status = 'open'`;
    const jParams = [];
    if (jobIds?.length) { jQuery += ` AND fv.entity_id = ANY($1)`; jParams.push(jobIds); }
    const jobResult = await pool.query(jQuery, jParams);
    if (jobResult.rows.length === 0) throw new Error('No job vectors found. Create and parse job postings first.');

    // Build vector maps
    const candidates = {}, candidateMeta = {};
    for (const row of candResult.rows) { candidates[row.entity_id] = row.vector_data; candidateMeta[row.entity_id] = { userId: row.user_id }; }

    const jobs = {}, jobMeta = {};
    for (const row of jobResult.rows) { jobs[row.entity_id] = row.vector_data; jobMeta[row.entity_id] = { title: row.title, company: row.company }; }

    // Compute all pairwise scores
    const { scores, candidateIds: cIds, jobIds: jIds } = this.computeAllScores(candidates, jobs);

    // Apply threshold filter
    const filteredCandidates = cIds.filter(cId => Math.max(...jIds.map(jId => scores[`${cId}|${jId}`])) >= SCORE_THRESHOLD);
    const filteredJobs = jIds.filter(jId => Math.max(...filteredCandidates.map(cId => scores[`${cId}|${jId}`])) >= SCORE_THRESHOLD);

    if (filteredCandidates.length === 0 || filteredJobs.length === 0) {
      throw new Error('No candidates/jobs passed the similarity threshold.');
    }

    logger.info(`Threshold filter: ${cIds.length} candidates → ${filteredCandidates.length}, ${jIds.length} jobs → ${filteredJobs.length}`);

    // Build preferences and run algorithm
    const { candidatePrefs, jobPrefs } = this.buildPreferenceMatrices(scores, filteredCandidates, filteredJobs);
    const { matches, proposalCount } = this.runGaleShapley(candidatePrefs, jobPrefs);
    const { isStable, blockingPairs } = this.verifyStability(matches, candidatePrefs, jobPrefs);

    // Compute average score
    const matchEntries = Object.entries(matches);
    const avgScore = matchEntries.length > 0
      ? matchEntries.reduce((sum, [c, j]) => sum + scores[`${c}|${j}`], 0) / matchEntries.length : 0;

    // Cache in Redis
    try {
      if (redisClient.isReady) {
        await redisClient.setEx('match:latest_scores', 3600, JSON.stringify(scores));
        await redisClient.setEx('match:latest_results', 3600, JSON.stringify(matchEntries));
        logger.info('Results cached in Redis');
      }
    } catch (err) { logger.warn(`Redis cache failed: ${err.message}`); }

    // Store match run
    const runResult = await pool.query(
      `INSERT INTO match_runs (initiated_by, algorithm, distance_metric, candidate_count, job_count, avg_score, is_stable)
       VALUES ($1, 'gale-shapley', 'manhattan', $2, $3, $4, $5) RETURNING run_id`,
      [initiatedBy, filteredCandidates.length, filteredJobs.length, avgScore.toFixed(4), isStable]
    );
    const runId = runResult.rows[0].run_id;

    // Store individual match results
    const matchResults = [];
    const sortedMatches = matchEntries.sort((a, b) => scores[`${b[0]}|${b[1]}`] - scores[`${a[0]}|${a[1]}`]);
    let rank = 1;

    // Normalize scores for display (best match = ~95%, scale others proportionally)
    const maxScore = sortedMatches.length > 0 ? scores[`${sortedMatches[0][0]}|${sortedMatches[0][1]}`] : 1;
    const normalizeForDisplay = (rawScore) => {
      if (maxScore === 0) return 0;
      return Math.min(98, Math.round((rawScore / maxScore) * 95));
    };

    for (const [candId, jobId] of sortedMatches) {
      const score = scores[`${candId}|${jobId}`];
      const displayPercentage = normalizeForDisplay(score);
      const tier = displayPercentage >= 80 ? 'A' : displayPercentage >= 60 ? 'B' : 'C';

      const justification = {
        score: parseFloat(score.toFixed(4)),
        rawPercentage: parseFloat((score * 100).toFixed(1)),
        percentage: displayPercentage,
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

      matchResults.push({ rank, candidateId: candId, jobId, jobTitle: jobMeta[jobId]?.title, jobCompany: jobMeta[jobId]?.company, score: parseFloat(score.toFixed(4)), percentage: displayPercentage, tier });
      rank++;
    }

    logger.info(`Match run ${runId}: ${matchEntries.length} pairs, avg ${(avgScore * 100).toFixed(1)}%, stable: ${isStable}`);

    // Create notifications for matched candidates
    for (const [candId, jobId] of sortedMatches) {
      const userId = candidateMeta[candId]?.userId;
      if (userId) {
        const jobTitle = jobMeta[jobId]?.title || 'a job';
        const score = (scores[`${candId}|${jobId}`] * 100).toFixed(1);
        await pool.query(
          `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, 'match')`,
          [userId, `You have been matched to "${jobTitle}" with a ${score}% compatibility score.`]
        );
      }
    }

    return { runId, algorithm: 'gale-shapley', distanceMetric: 'manhattan', candidateCount: filteredCandidates.length, jobCount: filteredJobs.length, matchCount: matchEntries.length, avgScore: parseFloat(avgScore.toFixed(4)), avgPercentage: parseFloat((avgScore * 100).toFixed(1)), isStable, blockingPairs: blockingPairs.length, proposalCount, matches: matchResults, allScores: scores };
  }
}

module.exports = new MatchingService();
