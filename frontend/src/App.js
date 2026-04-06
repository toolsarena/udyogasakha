import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { auth as authApi } from './api';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
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
        <Link to="/opportunities">Opportunities</Link>
        {user ? (
          <>
            {user.role === 'provider' && <Link to="/create-opportunity">Post Opportunity</Link>}
            {user.role === 'seeker' && <Link to="/my-applications">My Applications</Link>}
            {user.role === 'provider' && <Link to="/my-listings">My Listings</Link>}
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
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/opportunities/:id" element={<OpportunityDetail />} />
            <Route path="/create-opportunity" element={<ProtectedRoute roles={['provider', 'admin']}><CreateOpportunity /></ProtectedRoute>} />
            <Route path="/my-applications" element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />
            <Route path="/my-listings" element={<ProtectedRoute roles={['provider', 'admin']}><MyListings /></ProtectedRoute>} />
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
