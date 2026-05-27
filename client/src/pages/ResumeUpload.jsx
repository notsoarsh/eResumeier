import { useState, useEffect, useRef } from 'react';
import api from '../api';
import './Pages.css';

function ResumeUpload({ user }) {
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
