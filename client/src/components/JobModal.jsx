import './JobModal.css';

function JobModal({ job, onClose }) {
  if (!job) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2>{job.title}</h2>
          <p className="modal-company">🏢 {job.company || 'Company'}</p>
        </div>

        <div className="modal-meta">
          {job.location && <span className="meta-tag">📍 {job.location}</span>}
          {job.salary_range && <span className="meta-tag">💰 {job.salary_range}</span>}
          {job.employment_type && <span className="meta-tag">⏰ {job.employment_type}</span>}
          <span className={`meta-tag status-${job.status}`}>{job.status}</span>
        </div>

        <div className="modal-section">
          <h3>Job Description</h3>
          <p className="modal-description">{job.description}</p>
        </div>

        {job.deadline && (
          <div className="modal-section">
            <h3>Application Deadline</h3>
            <p>{new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        )}

        <div className="modal-section">
          <h3>Posted On</h3>
          <p>{new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}

export default JobModal;
