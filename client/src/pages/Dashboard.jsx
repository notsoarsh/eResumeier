import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Pages.css';

function Dashboard({ user }) {
  const [stats, setStats] = useState({ resumes: 0, jobs: 0, matches: 0, avgScore: 0 });
  const [recentMatches, setRecentMatches] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [historyRes, jobsRes] = await Promise.all([
        api.get('/match/history'),
        api.get('/jobs'),
      ]);

      const runs = historyRes.data.runs || [];
      const jobs = jobsRes.data.jobs || [];
      const latestRun = runs[0];

      setStats({
        resumes: runs.reduce((s, r) => Math.max(s, r.candidate_count || 0), 0),
        jobs: jobs.length,
        matches: runs.length,
        avgScore: latestRun ? (latestRun.avg_score * 100).toFixed(1) : '0',
      });

      if (latestRun) {
        const resultsRes = await api.get(`/match/results/${latestRun.run_id}`);
        setRecentMatches(resultsRes.data.matches?.slice(0, 5) || []);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  };

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>Welcome back, {user.firstName} 👋</h2>
          <p>Here's your matching overview</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/matching')}>🚀 Run New Match</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-value">{stats.resumes}</div>
          <div className="stat-label">Candidates in Pool</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💼</div>
          <div className="stat-value">{stats.jobs}</div>
          <div className="stat-label">Active Jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{stats.matches}</div>
          <div className="stat-label">Match Runs</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.avgScore}%</div>
          <div className="stat-label">Latest Avg Score</div>
        </div>
      </div>

      <div className="panel">
        <h3>📈 Recent Match Results</h3>
        {recentMatches.length > 0 ? (
          <table className="data-table">
            <thead><tr><th>Candidate</th><th>Job</th><th>Score</th><th>Tier</th></tr></thead>
            <tbody>
              {recentMatches.map((m, i) => (
                <tr key={i}>
                  <td>{m.resume_name || 'Candidate'}</td>
                  <td>{m.job_title} at {m.job_company}</td>
                  <td><span className="badge badge-success">{(m.similarity_score * 100).toFixed(1)}%</span></td>
                  <td><span className="badge badge-info">Tier {m.tier}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#94a3b8' }}>No matches yet. Run the matching engine to see results.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
