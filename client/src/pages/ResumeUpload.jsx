import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { PageLoader } from '../components/Loader';
import './Pages.css';

function ResumeUpload({ user }) {
  // Admin sees all resumes (read-only), Candidate sees upload form + their resumes
  if (user.role === 'admin') return <AdminResumeView />;
  return <CandidateResumeUpload user={user} />;
}

function AdminResumeView() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/resumes/all').then(r => setResumes(r.data.resumes || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><PageLoader message="Loading all resumes..." /></div>;

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>All Candidate Resumes</h2>
          <p>{resumes.length} resumes uploaded by candidates</p>
        </div>
      </div>

      <table className="data-table">
        <thead><tr><th>Candidate</th><th>File</th><th>Skills</th><th>Status</th><th>Uploaded</th><th>Action</th></tr></thead>
        <tbody>
          {resumes.map(r => (
            <tr key={r.resume_id}>
              <td>{r.first_name} {r.last_name}</td>
              <td>{r.original_filename}</td>
              <td>{r.parsed_json?.skills?.length || 0} skills</td>
              <td><span className={`badge ${r.status === 'parsed' ? 'badge-success' : 'badge-warning'}`}>{r.status}</span></td>
              <td>{new Date(r.created_at).toLocaleDateString()}</td>
              <td><button className="btn btn-secondary btn-sm" onClick={() => setSelected(r)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }} onClick={() => setSelected(null)}>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #334155' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>{selected.first_name} {selected.last_name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '1rem' }}>{selected.original_filename} • Uploaded {new Date(selected.created_at).toLocaleDateString()}</p>

            {selected.parsed_json?.skills && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>EXTRACTED SKILLS</p>
                <div className="skill-tags">
                  {selected.parsed_json.skills.map((s, i) => <span className="skill-tag" key={i}>{s}</span>)}
                </div>
              </div>
            )}

            {selected.parsed_json?.experience_years && (
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Experience: {selected.parsed_json.experience_years} years</p>
            )}
            {selected.parsed_json?.education_level && (
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Education: {selected.parsed_json.education_level}</p>
            )}

            {selected.raw_text && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>RAW RESUME TEXT</p>
                <div style={{ background: '#0f172a', borderRadius: '8px', padding: '1rem', fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
                  {selected.raw_text}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CandidateResumeUpload({ user }) {
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textName, setTextName] = useState('');
  const [message, setMessage] = useState('');
  const fileRef = useRef();

  useEffect(() => { loadResumes(); }, []);

  const loadResumes = async () => {
    try {
      const res = await api.get('/resumes');
      setResumes(res.data.resumes || []);
    } catch (err) { console.error(err); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message);
      loadResumes();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (textInput.length < 50) {
      setMessage('Resume text must be at least 50 characters.');
      return;
    }
    setUploading(true);
    setMessage('');
    try {
      const res = await api.post('/resumes/parse-text', { text: textInput, name: textName || 'Text Resume' });
      setMessage(res.data.message);
      setTextInput('');
      setTextName('');
      loadResumes();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Parsing failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>📄 Resume Upload & Parsing</h2>
          <p>Upload resumes for AI-powered feature extraction</p>
        </div>
      </div>

      <div className="upload-zone" onClick={() => fileRef.current?.click()}>
        <div className="upload-icon">📁</div>
        <p><strong>Drag & drop resume files here</strong></p>
        <p>or click to browse</p>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>Supported: PDF, DOCX, TXT (Max 10MB)</p>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>

      {message && <div className="panel" style={{ background: '#065f46', color: '#34d399' }}>{message}</div>}

      <div className="panel">
        <h3>📝 Or paste resume text directly</h3>
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label>Candidate Name</label>
          <input value={textName} onChange={e => setTextName(e.target.value)} placeholder="e.g., Alice Johnson" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }} />
        </div>
        <div className="form-group">
          <label>Resume Text</label>
          <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Paste full resume text here..." rows={6} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', resize: 'vertical' }} />
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleTextSubmit} disabled={uploading}>
          {uploading ? 'Parsing...' : '🧠 Parse with AI'}
        </button>
      </div>

      <div className="panel">
        <h3>📋 Uploaded Resumes</h3>
        {resumes.length > 0 ? (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Skills Extracted</th><th>Status</th><th>Uploaded</th></tr></thead>
            <tbody>
              {resumes.map(r => (
                <tr key={r.resume_id}>
                  <td>{r.original_filename}</td>
                  <td>{r.parsed_json?.skills?.length || 0} skills</td>
                  <td><span className={`badge ${r.status === 'parsed' ? 'badge-success' : r.status === 'error' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#94a3b8' }}>No resumes uploaded yet.</p>
        )}
      </div>
    </div>
  );
}

export default ResumeUpload;
