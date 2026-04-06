import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { auth as authApi } from './api';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Recommended from './pages/Recommended';
import Opportunities from './pages/Opportunities';
import OpportunityDetail from './pages/OpportunityDetail';
import CreateOpportunity from './pages/CreateOpportunity';
import MyApplications from './pages/MyApplications';
import MyListings from './pages/MyListings';
import AdminDashboard from './pages/AdminDashboard';
import ModerationQueue from './pages/ModerationQueue';
import TrustManagement from './pages/TrustManagement';
import Profile from './pages/Profile';
import './App.css';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.me().then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (creds) => {
    const data = await authApi.login(creds);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (info) => {
    const data = await authApi.register(info);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  if (loading) return <div className="loading">Loading...</div>;
  return <AuthContext.Provider value={{ user, login, register, logout, setUser }}>{children}</AuthContext.Provider>;
}

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="navbar">
      <Link to="/" className="logo">🏛️ UdyogaSakha</Link>
      <div className="nav-links">
        <Link to="/jobs">Jobs</Link>
        {user && <Link to="/recommended">For You</Link>}
        <Link to="/opportunities">Community</Link>
        {user ? (
          <>
            {user.role === 'recruiter' && <Link to="/create-opportunity">Post</Link>}
            {user.role === 'talent' && <Link to="/my-applications">Applications</Link>}
            {user.role === 'recruiter' && <Link to="/my-listings">Listings</Link>}
            {['admin', 'moderator'].includes(user.role) && <Link to="/admin">Dashboard</Link>}
            {['admin', 'moderator'].includes(user.role) && <Link to="/moderation">Moderation</Link>}
            {['admin', 'moderator'].includes(user.role) && <Link to="/trust-mgmt">Trust</Link>}
            <Link to="/profile">Profile</Link>
            <span className="trust-badge">L{user.trust_level}</span>
            <button onClick={() => { logout(); navigate('/'); }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/recommended" element={<ProtectedRoute><Recommended /></ProtectedRoute>} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/opportunities/:id" element={<OpportunityDetail />} />
            <Route path="/create-opportunity" element={<ProtectedRoute roles={['recruiter', 'admin']}><CreateOpportunity /></ProtectedRoute>} />
            <Route path="/my-applications" element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />
            <Route path="/my-listings" element={<ProtectedRoute roles={['recruiter', 'admin']}><MyListings /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={['admin', 'moderator']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/moderation" element={<ProtectedRoute roles={['admin', 'moderator']}><ModerationQueue /></ProtectedRoute>} />
            <Route path="/trust-mgmt" element={<ProtectedRoute roles={['admin', 'moderator']}><TrustManagement /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}
