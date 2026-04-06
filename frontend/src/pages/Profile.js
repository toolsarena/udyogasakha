import React, { useState, useEffect } from 'react';
import { auth, trust } from '../api';
import { useAuth } from '../App';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [verForm, setVerForm] = useState({ doc_type: 'identity', doc_reference: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    auth.me().then(p => { setProfile(p); setForm(p); }).catch(console.error);
  }, []);

  const handleSave = async () => {
    await auth.updateProfile(form);
    setProfile(form);
    setEditing(false);
    setMsg('Profile updated');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    await trust.submitVerification(verForm);
    setMsg('Verification document submitted for review');
    setVerForm({ doc_type: 'identity', doc_reference: '' });
  };

  if (!profile) return <div className="loading">Loading...</div>;

  const trustLabels = ['Registered', 'Document Verified', 'Foundation Screened', 'Domain Expert Certified', 'Community Endorsed'];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="card">
        <h2 className="section-title">My Profile</h2>
        {msg && <p className="success">{msg}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span className="trust-badge" style={{ fontSize: '1.1rem', padding: '6px 16px' }}>L{profile.trust_level}</span>
          <span>{trustLabels[profile.trust_level]}</span>
        </div>

        {editing ? (
          <>
            <div className="form-group"><label>Full Name</label><input value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="form-group"><label>Phone</label><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-group"><label>Organization</label><input value={form.organization_name || ''} onChange={e => setForm({ ...form, organization_name: e.target.value })} /></div>
            <div className="form-group"><label>Bio</label><textarea value={form.bio || ''} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
            <button className="btn btn-success" onClick={handleSave}>Save</button>
            <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
          </>
        ) : (
          <>
            <p><strong>Name:</strong> {profile.full_name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Role:</strong> {profile.role}</p>
            <p><strong>Phone:</strong> {profile.phone || '-'}</p>
            <p><strong>Organization:</strong> {profile.organization_name || '-'}</p>
            <p><strong>Bio:</strong> {profile.bio || '-'}</p>
            <p className="meta">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>Edit Profile</button>
          </>
        )}
      </div>

      {profile.trust_level < 1 && (
        <div className="card">
          <h3>Upgrade to Level 1 — Document Verification</h3>
          <p className="meta" style={{ marginBottom: 12 }}>Submit a document for identity verification to unlock more opportunities.</p>
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label>Document Type</label>
              <select value={verForm.doc_type} onChange={e => setVerForm({ ...verForm, doc_type: e.target.value })}>
                <option value="identity">Identity Document</option>
                <option value="organization">Organization Registration</option>
                <option value="agency">Agency Documentation</option>
                <option value="vendor">Vendor Legitimacy</option>
              </select>
            </div>
            <div className="form-group">
              <label>Document Reference / ID</label>
              <input value={verForm.doc_reference} onChange={e => setVerForm({ ...verForm, doc_reference: e.target.value })} required placeholder="Enter document number or reference" />
            </div>
            <button type="submit" className="btn btn-warning">Submit for Verification</button>
          </form>
        </div>
      )}
    </div>
  );
}
