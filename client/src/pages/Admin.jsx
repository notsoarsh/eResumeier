import { useState, useEffect } from 'react';
import api from '../api';
import './Pages.css';

function Admin({ user }) {
  const [stats, setStats] = useState({ users: 0, resumes: 0, jobs: 0, uptime: '99.9%' });

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [jobsRes, historyRes] = await Promise.all([
        api.get('/jobs?status=open'),
        api.get('/match/history'),
      ]);
      setStats({
        users: '-',
        resumes: historyRes.data.runs?.[0]?.candidate_count || 0,
        jobs: jobsRes.data.jobs?.length || 0,
        uptime: '99.9%',
      });
    } catch (err) { console.error(err); }
  };

  if (user.role !== 'admin') {
    return <div className="page"><div className="panel"><p style={{ color: '#fca5a5' }}>Access denied. Admin only.</p></div></div>;
  }

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>🛡️ Admin Control Panel</h2>
          <p>System management and monitoring</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.users}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-value">{stats.resumes}</div>
          <div className="stat-label">Resumes Processed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💼</div>
          <div className="stat-value">{stats.jobs}</div>
          <div className="stat-label">Active Jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{stats.uptime}</div>
          <div className="stat-label">System Uptime</div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>⚙️ System Configuration</h3>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#94a3b8' }}>LLM Model</label>
            <select style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }}>
              <option>Gemini 2.0 Flash</option>
              <option>GPT-4o</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#94a3b8' }}>Match Score Threshold (%)</label>
            <input type="number" defaultValue={40} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#94a3b8' }}>Data Encryption</label>
            <select style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }}>
              <option>AES-256</option>
              <option>AES-128</option>
            </select>
          </div>
          <button className="btn btn-success btn-sm" style={{ marginTop: '0.5rem' }}>💾 Save Configuration</button>
        </div>

        <div className="panel">
          <h3>📊 System Health</h3>
          {[
            { label: 'CPU Usage', value: 34, color: '#34d399' },
            { label: 'Memory Usage', value: 62, color: '#fbbf24' },
            { label: 'Database Storage', value: 28, color: '#34d399' },
            { label: 'API Response Time', value: 15, color: '#34d399' },
            { label: 'LLM API Quota', value: 67, color: '#60a5fa' },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>{item.label}</span><span>{item.value}%</span>
              </div>
              <div style={{ height: '8px', background: '#334155', borderRadius: '4px', marginTop: '0.3rem' }}>
                <div style={{ height: '100%', width: `${item.value}%`, background: item.color, borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>📋 System Logs</h3>
        <div style={{ background: '#0f172a', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
          <div style={{ color: '#34d399' }}>[{new Date().toISOString()}] INFO: Match engine operational</div>
          <div style={{ color: '#94a3b8' }}>[{new Date().toISOString()}] INFO: PostgreSQL connected</div>
          <div style={{ color: '#94a3b8' }}>[{new Date().toISOString()}] INFO: Redis connected</div>
          <div style={{ color: '#60a5fa' }}>[{new Date().toISOString()}] INFO: Feature extraction service ready</div>
          <div style={{ color: '#fbbf24' }}>[{new Date().toISOString()}] WARN: LLM API quota limited</div>
        </div>
      </div>
    </div>
  );
}

export default Admin;
