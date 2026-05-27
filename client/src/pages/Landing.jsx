import { Link } from 'react-router-dom';
import './Landing.css';

function Landing() {
  return (
    <div className="landing">
      {/* Hero */}
      <header className="hero">
        <h1>⚡ eResumeier</h1>
        <p className="tagline">Intelligent Resume Analyzing & Job Matching Engine</p>
        <p className="hero-desc">
          An AI-powered platform that reads resumes and job descriptions, converts them into
          mathematical vectors, and produces fair, stable matches using Nobel Prize-winning algorithms.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="btn-hero btn-hero-primary">Sign In</Link>
          <Link to="/register" className="btn-hero btn-hero-secondary">Create Account</Link>
        </div>
      </header>

      {/* How it works */}
      <section className="section">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Upload</h3>
            <p>Candidates upload their resumes (PDF, DOCX, or plain text). Employers post job descriptions with requirements.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>AI Parsing</h3>
            <p>Our LLM (Google Gemini) reads each document and extracts skills, experience, education, and certifications into structured data.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Vectorization</h3>
            <p>Extracted data is converted into a 12-dimension numerical vector representing the candidate or job profile.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">4</div>
            <h3>Matching</h3>
            <p>Manhattan Distance scores every pair. Gale-Shapley algorithm produces stable, fair matches with no blocking pairs.</p>
          </div>
        </div>
      </section>

      {/* The 12 Dimensions */}
      <section className="section section-dark">
        <h2>The 12 Feature Dimensions</h2>
        <p className="section-desc">Every resume and job is scored across these dimensions (1-10 scale):</p>
        <div className="dimensions-grid">
          {[
            { name: 'Python', icon: '🐍' },
            { name: 'JavaScript', icon: '🟨' },
            { name: 'SQL & Databases', icon: '🗄️' },
            { name: 'Machine Learning', icon: '🤖' },
            { name: 'Data Analysis', icon: '📊' },
            { name: 'Cloud Computing', icon: '☁️' },
            { name: 'Communication', icon: '🗣️' },
            { name: 'Leadership', icon: '👔' },
            { name: 'Problem Solving', icon: '🧩' },
            { name: 'Years Experience', icon: '📅' },
            { name: 'Education Level', icon: '🎓' },
            { name: 'Project Management', icon: '📋' },
          ].map((d, i) => (
            <div className="dim-card" key={i}>
              <span className="dim-icon">{d.icon}</span>
              <span className="dim-name">{d.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* The Math */}
      <section className="section">
        <h2>The Mathematics Behind It</h2>
        <div className="math-cards">
          <div className="math-card">
            <h3>Manhattan Distance Scoring</h3>
            <div className="formula">S(R, J) = 1 / (1 + Σ|Rᵢ − Jᵢ|)</div>
            <p>
              For each candidate-job pair, we compute the sum of absolute differences across all 12 dimensions.
              A score of 1.0 means a perfect match (identical vectors). The closer to 1, the better the fit.
            </p>
          </div>
          <div className="math-card">
            <h3>Gale-Shapley Stable Marriage</h3>
            <div className="formula">No blocking pairs exist in the final matching</div>
            <p>
              Each candidate ranks all jobs by preference. Each job ranks all candidates.
              The algorithm finds a stable assignment where no unmatched pair would both prefer each other
              over their current match. This is mathematically guaranteed to be fair.
            </p>
            <p className="math-note">🏆 Nobel Prize in Economics (2012) — Alvin Roth & Lloyd Shapley</p>
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section className="section section-dark">
        <h2>Who Is This For?</h2>
        <div className="roles-grid">
          <div className="role-card">
            <div className="role-icon">👤</div>
            <h3>Job Seekers</h3>
            <ul>
              <li>Upload your resume</li>
              <li>AI extracts your skills automatically</li>
              <li>See which jobs match you best</li>
              <li>Understand WHY you matched (score breakdown)</li>
            </ul>
          </div>
          <div className="role-card">
            <div className="role-icon">🏢</div>
            <h3>Employers</h3>
            <ul>
              <li>Post job descriptions</li>
              <li>AI extracts your requirements</li>
              <li>See ranked candidates with scores</li>
              <li>Get stable, bias-free shortlists</li>
            </ul>
          </div>
          <div className="role-card">
            <div className="role-icon">🛡️</div>
            <h3>Administrators</h3>
            <ul>
              <li>Run the matching algorithm</li>
              <li>Monitor system health</li>
              <li>Configure matching parameters</li>
              <li>View all match history</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="section">
        <h2>Technology Stack</h2>
        <div className="tech-grid">
          <div className="tech-item"><strong>Frontend:</strong> React.js</div>
          <div className="tech-item"><strong>Backend:</strong> Node.js + Express.js</div>
          <div className="tech-item"><strong>Database:</strong> PostgreSQL 16</div>
          <div className="tech-item"><strong>Cache:</strong> Redis 7</div>
          <div className="tech-item"><strong>AI/LLM:</strong> Google Gemini API</div>
          <div className="tech-item"><strong>Auth:</strong> JWT + bcrypt</div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section-cta">
        <h2>Ready to try it?</h2>
        <p>Login with a test account or create your own.</p>
        <div className="hero-actions">
          <Link to="/register" className="btn-hero btn-hero-primary">Get Started</Link>
        </div>
        <p className="test-accounts">
          Test accounts available: <code>admin@seed.com</code>, <code>employer@seed.com</code>, <code>alice.ds@seed.com</code> (password: <code>password123</code>)
        </p>
      </section>

      <footer className="landing-footer">
        <p>eResumeier — Integrated Project (22CS038) | Chitkara University, Punjab | May 2026</p>
      </footer>
    </div>
  );
}

export default Landing;
