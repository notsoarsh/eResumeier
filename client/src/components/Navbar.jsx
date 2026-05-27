import { NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <span className="logo">⚡ eResumeier</span>
      <div className="nav-links">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/resumes">Upload Resume</NavLink>
        <NavLink to="/jobs">Jobs</NavLink>
        <NavLink to="/matching">Matching</NavLink>
        <NavLink to="/results">Results</NavLink>
        <NavLink to="/history">History</NavLink>
        {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
      </div>
      <div className="nav-right">
        <span className="user-badge">👤 {user.firstName} {user.lastName}</span>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
