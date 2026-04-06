import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opportunities, admin } from '../api';

export default function CreateOpportunity() {
  const [form, setForm] = useState({ title: '', description: '', module: 'employment', category_id: '', location: '', engagement_type: '', compensation_info: '', required_trust_level: 0, expires_at: '' });
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => { admin.categories().then(setCategories).catch(() => {}); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const filtered = categories.filter(c => c.module === form.module);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const res = await opportunities.create({ ...form, category_id: form.category_id ? +form.category_id : null, required_trust_level: +form.required_trust_level });
      setMsg('Opportunity submitted for moderation!');
      setTimeout(() => navigate('/my-listings'), 1500);
    } catch (err) {
      setError(err.error || err.errors?.[0]?.msg || 'Failed to create');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="card">
        <h2 className="section-title">Post an Opportunity</h2>
        {error && <p className="error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Module</label>
            <select value={form.module} onChange={set('module')}>
              <option value="employment">Employment Exchange</option>
              <option value="service_engagement">Service Engagement Roles</option>
            </select>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={form.category_id} onChange={set('category_id')}>
              <option value="">Select category</option>
              {filtered.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Title</label><input value={form.title} onChange={set('title')} required /></div>
          <div className="form-group"><label>Description</label><textarea value={form.description} onChange={set('description')} required rows={5} /></div>
          <div className="form-group"><label>Location</label><input value={form.location} onChange={set('location')} /></div>
          <div className="form-group">
            <label>Engagement Type</label>
            <select value={form.engagement_type} onChange={set('engagement_type')}>
              <option value="">Select</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
              <option value="Advisory">Advisory</option>
              <option value="Short-term">Short-term</option>
              <option value="Event-based">Event-based</option>
            </select>
          </div>
          <div className="form-group"><label>Compensation Info</label><input value={form.compensation_info} onChange={set('compensation_info')} /></div>
          <div className="form-group">
            <label>Minimum Trust Level Required</label>
            <select value={form.required_trust_level} onChange={set('required_trust_level')}>
              {[0,1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Expires At</label><input type="date" value={form.expires_at} onChange={set('expires_at')} /></div>
          <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Submit for Moderation</button>
        </form>
      </div>
    </div>
  );
}
