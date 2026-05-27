import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Pages.css';

function History() {
  const [runs, setRuns] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const res = await api.get('/match/history');
      setRuns(res.data.runs || []);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>📜 Match History</h2>
          <p>Track all matching runs and decisions</p>
        </div>
      </div>

      {runs.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr><th>Run ID</th><th>Date</th><th>Candidates</th><th>Jobs</th><th>Algorithm</th><th>Avg Score</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {runs.map(run => (
              <tr key={run.run_id}>
                <td><code style={{ color: '#60a5fa' }}>#{run.run_id.substring(0, 8)}</code></td>
                <td>{new Date(run.created_at).toLocaleDateString()}</td>
                <td>{run.candidate_count}</td>
                <td>{run.job_count}</td>
                <td>{run.algorithm}</td>
                <td><span className="badge badge-success">{(run.avg_score * 100).toFixed(1)}%</span></td>
                <td><span className={`badge ${run.is_stable ? 'badge-success' : 'badge-danger'}`}>{run.is_stable ? 'Stable' : 'Unstable'}</span></td>
                <td><button className="btn btn-secondary btn-sm" onClick={() => navigate(`/results/${run.run_id}`)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="panel"><p style={{ color: '#94a3b8' }}>No matching runs yet. Go to the Matching page to run the algorithm.</p></div>
      )}
    </div>
  );
}

export default History;
