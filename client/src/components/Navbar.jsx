import { NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <span className="logo">⚡ eResumeier</span>
      <div className="nav-links">
        <NavLink to="/">Dashboard</NavLink>

        {/* Candidate: upload resume, browse jobs, see their results */}
        {user.role === 'candidate' && (
          <>
            <NavLink to="/resumes">My Resumes</NavLink>
            <NavLink to="/jobs">Browse Jobs</NavLink>
            <NavLink to="/results">My Matches</NavLink>
          </>
        )}

        {/* Employer: manage jobs, see candidate matches */}
        {user.role === 'employer' && (
          <>
            <NavLink to="/jobs">My Jobs</NavLink>
            <NavLink to="/results">Matched Candidates</NavLink>
          </>
        )}

        {/* Admin: everything */}
        {user.role === 'admin' && (
          <>
            <NavLink to="/resumes">Resumes</NavLink>
            <NavLink to="/jobs">Jobs</NavLink>
            <NavLink to="/matching">Run Matching</NavLink>
            <NavLink to="/results">Results</NavLink>
            <NavLink to="/history">History</NavLink>
            <NavLink to="/admin">Admin Panel</NavLink>
          </>
        )}
      </div>
      <div className="nav-right">
        <span className="user-badge">
          {user.role === 'candidate' && '👤'}
          {user.role === 'employer' && '🏢'}
          {user.role === 'admin' && '🛡️'}
          {' '}{user.firstName} {user.lastName}
          <span className="role-tag">{user.role}</span>
        </span>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
