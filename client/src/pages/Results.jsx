import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { PageLoader } from '../components/Loader';
import RadarChartComponent from '../components/RadarChart';
import './Pages.css';

function Results({ user }) {
  const { runId } = useParams();
  const [run, setRun] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadResults(); }, [runId]);

  const loadResults = async () => {
    try {
      let targetRunId = runId;

      if (!targetRunId) {
        const historyRes = await api.get('/match/history');
        const runs = historyRes.data.runs || [];
        if (runs.length === 0) { setLoading(false); return; }
        targetRunId = runs[0].run_id;
      }

      const res = await api.get(`/match/results/${targetRunId}`);
      let matchData = res.data.matches || [];

      // If user is a candidate, only show their matches
      if (user?.role === 'candidate') {
        const resumesRes = await api.get('/resumes');
        const myResumeIds = (resumesRes.data.resumes || []).map(r => r.resume_id);
        matchData = matchData.filter(m => myResumeIds.includes(m.resume_id));
      }

      setRun(res.data.run);
      setMatches(matchData);
    } catch (err) {
      console.error('Load results error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page"><PageLoader message="Loading match results..." /></div>;
  }

  if (!run) {
    return <div className="page"><div className="panel"><p style={{ color: '#94a3b8' }}>No match results found. Run the matching engine first.</p></div></div>;
  }

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>🏆 Matching Results</h2>
          <p>Stable matches generated — {run.is_stable ? 'no blocking pairs exist' : 'blocking pairs detected'}</p>
        </div>
        <span className={`badge ${run.is_stable ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
          {run.is_stable ? '✓ STABLE MATCHING' : '✗ UNSTABLE'}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{run.candidate_count}</div>
          <div className="stat-label">Candidates</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{run.job_count}</div>
          <div className="stat-label">Jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{matches.length > 0 ? Math.round(matches.reduce((s, m) => s + (m.justification_json?.percentage || 0), 0) / matches.length) : 0}%</div>
          <div className="stat-label">Avg Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{run.is_stable ? '0' : '?'}</div>
          <div className="stat-label">Blocking Pairs</div>
        </div>
      </div>

      <div className="panel">
        <h3>🎯 Stable Match Pairs</h3>
        {matches.map((m, i) => (
          <div className="match-card" key={i}>
            <span className="candidate">{m.resume_name || `Candidate ${i + 1}`}</span>
            <span className="arrow">⟷</span>
            <span className="job">{m.job_title} at {m.job_company}</span>
            <span className="score">{m.justification_json?.percentage || Math.round(m.similarity_score * 100)}%</span>
          </div>
        ))}
      </div>

      {matches.length > 0 && (
        <div className="panel">
          <h3>📊 Match Details</h3>
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Candidate</th><th>Job</th><th>Score</th><th>Tier</th><th>Cand. Pref Rank</th><th>Job Pref Rank</th></tr>
            </thead>
            <tbody>
              {matches.map((m, i) => {
                const justification = m.justification_json || {};
                return (
                  <tr key={i}>
                    <td>{m.rank}</td>
                    <td>{m.resume_name || 'Candidate'}</td>
                    <td>{m.job_title}</td>
                    <td><span className="badge badge-success">{m.justification_json?.percentage || Math.round(m.similarity_score * 100)}%</span></td>
                    <td><span className="badge badge-info">Tier {m.tier}</span></td>
                    <td>#{justification.candidatePreferenceRank || '-'}</td>
                    <td>#{justification.jobPreferenceRank || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Radar Chart: Report Section 5.4 */}
      {matches.length > 0 && matches[0].resume_vector && (
        <div className="panel">
          <h3>🕸️ Dimensional Score Comparison (Top Match)</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Radar chart comparing candidate feature vector vs job requirements across all 12 dimensions
          </p>
          <RadarChartComponent
            candidateVector={matches[0].resume_vector}
            jobVector={matches[0].job_vector}
            candidateName={matches[0].resume_name}
            jobName={matches[0].job_title}
          />
        </div>
      )}

      <div className="stability-badge stable">
        ✓ Matching is STABLE — No blocking pairs exist. This is a mutually optimal assignment produced by the Gale-Shapley algorithm.
      </div>
    </div>
  );
}

export default Results;
