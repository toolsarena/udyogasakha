import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', role: 'seeker', organization_name: '', bio: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.error || err.errors?.[0]?.msg || 'Registration failed');
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div style={{ maxWidth: 500, margin: '40px auto' }}>
      <div className="card">
        <h2 className="section-title">Join UdyogaSakha</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>I am a</label>
            <select value={form.role} onChange={set('role')}>
              <option value="seeker">Opportunity Seeker</option>
              <option value="provider">Opportunity Provider</option>
            </select>
          </div>
          <div className="form-group"><label>Full Name</label><input value={form.full_name} onChange={set('full_name')} required /></div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={set('email')} required /></div>
          <div className="form-group"><label>Password (min 6 chars)</label><input type="password" value={form.password} onChange={set('password')} required minLength={6} /></div>
          <div className="form-group"><label>Phone</label><input value={form.phone} onChange={set('phone')} /></div>
          {form.role === 'provider' && <div className="form-group"><label>Organization Name</label><input value={form.organization_name} onChange={set('organization_name')} /></div>}
          <div className="form-group"><label>Bio</label><textarea value={form.bio} onChange={set('bio')} rows={3} /></div>
          <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Register</button>
        </form>
        <p className="meta" style={{ marginTop: 16, textAlign: 'center' }}>Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}
