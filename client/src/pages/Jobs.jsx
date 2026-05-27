import { useState, useEffect } from 'react';
import api from '../api';
import './Pages.css';

function Jobs({ user }) {
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', company: '', description: '', location: '', salaryRange: '' });
  const [message, setMessage] = useState('');

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    try {
      const res = await api.get('/jobs');
      setJobs(res.data.jobs || []);
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await api.post('/jobs', form);
      setMessage(res.data.message);
      setForm({ title: '', company: '', description: '', location: '', salaryRange: '' });
      setShowForm(false);
      loadJobs();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to create job');
    }
  };

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>💼 Job Postings</h2>
          <p>Browse and manage job descriptions</p>
        </div>
        {user.role !== 'candidate' && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Post New Job</button>
        )}
      </div>

      {message && <div className="panel" style={{ background: '#065f46', color: '#34d399' }}>{message}</div>}

      {showForm && (
        <div className="panel">
          <h3>Create Job Posting</h3>
          <form onSubmit={handleCreate}>
            <div className="two-col" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Job Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Senior Data Scientist" required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }} />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="e.g., TechCorp" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }} />
              </div>
            </div>
            <div className="two-col">
              <div className="form-group">
                <label>Location</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g., Remote" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }} />
              </div>
              <div className="form-group">
                <label>Salary Range</label>
                <input value={form.salaryRange} onChange={e => setForm({ ...form, salaryRange: e.target.value })} placeholder="e.g., 25-35 LPA" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }} />
              </div>
            </div>
            <div className="form-group">
              <label>Job Description (min 50 chars)</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Full job description with requirements..." rows={5} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', resize: 'vertical' }} />
            </div>
            <button className="btn btn-primary" style={{ width: 'auto' }} type="submit">Create Job</button>
          </form>
        </div>
      )}

      {jobs.map(job => (
        <div className="job-card" key={job.job_id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div className="job-title">{job.title}</div>
              <div className="company">🏢 {job.company || 'Company'}</div>
            </div>
            <span className={`badge ${job.status === 'open' ? 'badge-success' : 'badge-warning'}`}>{job.status}</span>
          </div>
          <div className="job-meta">
            {job.location && <span>📍 {job.location}</span>}
            {job.salary_range && <span>💰 {job.salary_range}</span>}
            <span>📅 {new Date(job.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      ))}

      {jobs.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No jobs posted yet.</p>}
    </div>
  );
}

export default Jobs;
