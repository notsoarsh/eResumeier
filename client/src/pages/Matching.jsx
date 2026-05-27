import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Pages.css';

function Matching({ user }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const runMatching = async () => {
    setLoading(true);
    setError('');
    setProgress(1);

    try {
      // Simulate progress steps
      await delay(500); setProgress(2);
      await delay(500); setProgress(3);

      const res = await api.post('/match/run', {});

      setProgress(4);
      await delay(500);

      navigate(`/results/${res.data.runId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Matching failed. Make sure you have parsed resumes and jobs.');
      setLoading(false);
      setProgress(0);
    }
  };

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  const steps = [
    'Fetching feature vectors from database...',
    'Computing Manhattan Distance scores for all pairs...',
    'Building preference matrices...',
    'Running Gale-Shapley Stable Marriage Algorithm...',
  ];

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>🎯 Matching Engine</h2>
          <p>Run the Stable Marriage Algorithm on candidate-job pairs</p>
        </div>
      </div>

      <div className="panel">
        <h3>⚙️ Algorithm Configuration</h3>
        <div className="three-col" style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#94a3b8' }}>Similarity Metric</label>
            <select disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }}>
              <option>Manhattan Distance</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#94a3b8' }}>Matching Algorithm</label>
            <select disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }}>
              <option>Gale-Shapley (Stable Marriage)</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#94a3b8' }}>Proposing Side</label>
            <select disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }}>
              <option>Candidate-Proposing</option>
            </select>
          </div>
        </div>
      </div>

      <div className="panel" style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          This will match ALL parsed candidates against ALL open jobs using Manhattan Distance scoring and the Gale-Shapley algorithm.
        </p>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '1rem 3rem', fontSize: '1.1rem' }} onClick={runMatching} disabled={loading}>
          {loading ? '⏳ Running...' : '🚀 Run eResumeier Matching'}
        </button>
      </div>

      {error && <div className="panel" style={{ background: '#7f1d1d', color: '#fca5a5' }}>{error}</div>}

      {loading && (
        <div className="panel">
          <h3>⏳ Matching in Progress...</h3>
          <div style={{ marginTop: '1rem' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.9rem', color: progress > i ? '#34d399' : '#94a3b8' }}>
                  {progress > i ? '✓' : '○'} Step {i + 1}: {step}
                </p>
                <div style={{ height: '6px', background: '#334155', borderRadius: '3px', marginTop: '0.3rem' }}>
                  <div style={{ height: '100%', width: progress > i ? '100%' : '0%', background: progress > i ? '#34d399' : '#60a5fa', borderRadius: '3px', transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Matching;
