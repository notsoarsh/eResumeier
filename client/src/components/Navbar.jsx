import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Briefcase, Zap, BarChart3, Clock, Shield, User, Building2, LogOut } from 'lucide-react';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <span className="logo">eResumeier</span>
      <div className="nav-links">
        <NavLink to="/"><LayoutDashboard size={15} /> Dashboard</NavLink>

        {user.role === 'candidate' && (
          <>
            <NavLink to="/resumes"><FileText size={15} /> My Resumes</NavLink>
            <NavLink to="/jobs"><Briefcase size={15} /> Browse Jobs</NavLink>
            <NavLink to="/results"><BarChart3 size={15} /> My Matches</NavLink>
          </>
        )}

        {user.role === 'employer' && (
          <>
            <NavLink to="/jobs"><Briefcase size={15} /> My Jobs</NavLink>
            <NavLink to="/results"><BarChart3 size={15} /> Matched Candidates</NavLink>
          </>
        )}

        {user.role === 'admin' && (
          <>
            <NavLink to="/resumes"><FileText size={15} /> Resumes</NavLink>
            <NavLink to="/jobs"><Briefcase size={15} /> Jobs</NavLink>
            <NavLink to="/matching"><Zap size={15} /> Run Matching</NavLink>
            <NavLink to="/results"><BarChart3 size={15} /> Results</NavLink>
            <NavLink to="/history"><Clock size={15} /> History</NavLink>
            <NavLink to="/admin"><Shield size={15} /> Admin</NavLink>
          </>
        )}
      </div>
      <div className="nav-right">
        <span className="user-badge">
          {user.role === 'candidate' && <User size={14} />}
          {user.role === 'employer' && <Building2 size={14} />}
          {user.role === 'admin' && <Shield size={14} />}
          {' '}{user.firstName} {user.lastName}
          <span className="role-tag">{user.role}</span>
        </span>
        <button className="btn-logout" onClick={handleLogout}><LogOut size={14} /> Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
