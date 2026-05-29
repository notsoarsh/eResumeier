import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Briefcase, Target, TrendingUp, CheckCircle, Users } from 'lucide-react';
import api from '../api';
import { PageLoader, SkeletonCard } from '../components/Loader';
import './Pages.css';

function Dashboard({ user }) {
  const navigate = useNavigate();

  if (user.role === 'candidate') return <CandidateDashboard user={user} navigate={navigate} />;
  if (user.role === 'employer') return <EmployerDashboard user={user} navigate={navigate} />;
  return <AdminDashboard user={user} navigate={navigate} />;
}

function CandidateDashboard({ user, navigate }) {
  const [resumes, setResumes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const resumesRes = await api.get('/resumes');
        setResumes(resumesRes.data.resumes || []);
        const myResumeIds = (resumesRes.data.resumes || []).map(r => r.resume_id);

        const historyRes = await api.get('/match/history');
        const runs = historyRes.data.runs || [];
        if (runs.length > 0) {
          const res = await api.get(`/match/results/${runs[0].run_id}`);
          const myMatches = (res.data.matches || []).filter(m => myResumeIds.includes(m.resume_id));
          setMatches(myMatches);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>Welcome, {user.firstName} 👋</h2>
          <p>Your job matching dashboard</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/resumes')}>📄 Upload Resume</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FileText size={28} color="#60a5fa" /></div>
          <div className="stat-value">{resumes.length}</div>
          <div className="stat-label">Resumes Uploaded</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CheckCircle size={28} color="#34d399" /></div>
          <div className="stat-value">{resumes.filter(r => r.status === 'parsed').length}</div>
          <div className="stat-label">Successfully Parsed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Target size={28} color="#a78bfa" /></div>
          <div className="stat-value">{matches.length}</div>
          <div className="stat-label">Job Matches Found</div>
        </div>
      </div>

      {matches.length > 0 && (
        <div className="panel">
          <h3>🎯 Your Best Job Matches</h3>
          {matches.map((m, i) => (
            <div className="match-card" key={i}>
              <span className="candidate">{user.firstName} {user.lastName}</span>
              <span className="arrow">⟷</span>
              <span className="job">{m.job_title} at {m.job_company}</span>
              <span className="score">{(m.similarity_score * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {matches.length === 0 && (
        <div className="panel">
          <p style={{ color: '#94a3b8' }}>No matches yet. Upload your resume and wait for the admin to run the matching algorithm.</p>
        </div>
      )}
    </div>
  );
}

function EmployerDashboard({ user, navigate }) {
  const [jobs, setJobs] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    api.get(`/jobs?employerId=${user.userId}`).then(r => setJobs(r.data.jobs || [])).catch(() => {});
    api.get('/match/history').then(async (r) => {
      const runs = r.data.runs || [];
      if (runs.length > 0) {
        const res = await api.get(`/match/results/${runs[0].run_id}`);
        setMatches(res.data.matches || []);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>Welcome, {user.firstName} 👋</h2>
          <p>Your recruitment dashboard</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/jobs')}>💼 Post New Job</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Briefcase size={28} color="#60a5fa" /></div>
          <div className="stat-value">{jobs.length}</div>
          <div className="stat-label">Jobs Posted</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CheckCircle size={28} color="#34d399" /></div>
          <div className="stat-value">{jobs.filter(j => j.status === 'open').length}</div>
          <div className="stat-label">Active Jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Users size={28} color="#a78bfa" /></div>
          <div className="stat-value">{matches.length}</div>
          <div className="stat-label">Candidates Matched</div>
        </div>
      </div>

      {matches.length > 0 && (
        <div className="panel">
          <h3>👥 Top Matched Candidates</h3>
          {matches.slice(0, 5).map((m, i) => (
            <div className="match-card" key={i}>
              <span className="candidate">{m.resume_name || 'Candidate'}</span>
              <span className="arrow">⟷</span>
              <span className="job">{m.job_title}</span>
              <span className="score">{(m.similarity_score * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {jobs.length === 0 && (
        <div className="panel">
          <p style={{ color: '#94a3b8' }}>No jobs posted yet. Post a job description to start finding candidates.</p>
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ user, navigate }) {
  const [stats, setStats] = useState({ resumes: 0, jobs: 0, runs: 0, avgScore: 0 });
  const [recentMatches, setRecentMatches] = useState([]);

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
        resumes: latestRun?.candidate_count || 0,
        jobs: jobs.length,
        runs: runs.length,
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
          <h2>Admin Dashboard 🛡️</h2>
          <p>System overview and matching controls</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/matching')}>🚀 Run New Match</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FileText size={28} color="#60a5fa" /></div>
          <div className="stat-value">{stats.resumes}</div>
          <div className="stat-label">Candidates in Pool</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Briefcase size={28} color="#a78bfa" /></div>
          <div className="stat-value">{stats.jobs}</div>
          <div className="stat-label">Active Jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Target size={28} color="#34d399" /></div>
          <div className="stat-value">{stats.runs}</div>
          <div className="stat-label">Match Runs</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={28} color="#fbbf24" /></div>
          <div className="stat-value">{stats.avgScore}%</div>
          <div className="stat-label">Latest Avg Score</div>
        </div>
      </div>

      <div className="panel">
        <h3>📈 Latest Match Results</h3>
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
          <p style={{ color: '#94a3b8' }}>No matches yet. Click "Run New Match" to execute the algorithm.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
