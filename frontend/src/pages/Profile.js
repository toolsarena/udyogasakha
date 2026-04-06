import React, { useState, useEffect } from 'react';
import { auth, trust } from '../api';
import { useAuth } from '../App';

const SKILL_OPTIONS = ['JavaScript','Python','React','Node.js','Java','AWS','SQL','TypeScript','Docker','Kubernetes','Machine Learning','AI','Data Science','DevOps','Go','Rust','C++','PHP','Ruby','Swift','Flutter','Android','iOS','Cloud','Azure','GCP','Terraform','GraphQL','REST API','MongoDB','PostgreSQL','Redis','Kafka','Microservices','System Design','Product Management','UI/UX','Figma','Agile','Scrum'];

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [skillInput, setSkillInput] = useState('');
  const [locInput, setLocInput] = useState('');
  const [verForm, setVerForm] = useState({ doc_type: 'identity', doc_reference: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { auth.me().then(p => { setProfile(p); setForm(p); }).catch(console.error); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSave = async () => {
    await auth.updateProfile(form);
    setProfile(form);
    setEditing(false);
    setMsg('Profile updated — recommendations will improve!');
  };

  const handleCV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('cv', file);
    const res = await auth.uploadCV(fd);
    setMsg(`CV uploaded: ${res.filename}`);
    auth.me().then(setProfile);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    await trust.submitVerification(verForm);
    setMsg('Verification submitted for review');
    setVerForm({ doc_type: 'identity', doc_reference: '' });
  };

  const addSkill = (s) => {
    if (s && !form.skills.includes(s)) setForm({ ...form, skills: [...form.skills, s] });
    setSkillInput('');
  };

  const addLoc = () => {
    if (locInput && !form.preferred_locations.includes(locInput)) setForm({ ...form, preferred_locations: [...form.preferred_locations, locInput] });
    setLocInput('');
  };

  const toggleJobType = (t) => {
    const types = form.preferred_job_types?.includes(t) ? form.preferred_job_types.filter(x => x !== t) : [...(form.preferred_job_types || []), t];
    setForm({ ...form, preferred_job_types: types });
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
            <div className="form-group"><label>Full Name</label><input value={form.full_name || ''} onChange={set('full_name')} /></div>
            <div className="form-group"><label>Headline</label><input value={form.headline || ''} onChange={set('headline')} placeholder="e.g. Senior AI Architect" /></div>
            <div className="form-group"><label>Phone</label><input value={form.phone || ''} onChange={set('phone')} /></div>
            <div className="form-group"><label>Organization</label><input value={form.organization_name || ''} onChange={set('organization_name')} /></div>
            <div className="form-group">
              <label>Skills</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={skillInput} onChange={e => setSkillInput(e.target.value)} list="skill-list" placeholder="Add skill" />
                <button type="button" className="btn btn-primary btn-sm" onClick={() => addSkill(skillInput)}>Add</button>
              </div>
              <datalist id="skill-list">{SKILL_OPTIONS.map(s => <option key={s} value={s} />)}</datalist>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(form.skills || []).map(s => (
                  <span key={s} className="skill-tag" onClick={() => setForm({ ...form, skills: form.skills.filter(x => x !== s) })} style={{ cursor: 'pointer' }}>{s} ✕</span>
                ))}
              </div>
            </div>
            <div className="form-group"><label>Years of Experience</label><input type="number" min="0" value={form.experience_years || 0} onChange={set('experience_years')} /></div>
            <div className="form-group">
              <label>Education</label>
              <select value={form.education || ''} onChange={set('education')}>
                <option value="">Select</option>
                <option value="High School">High School</option>
                <option value="Bachelor's">Bachelor's</option>
                <option value="Master's">Master's</option>
                <option value="PhD">PhD</option>
                <option value="Diploma">Diploma</option>
                <option value="Self-taught">Self-taught</option>
              </select>
            </div>
            <div className="form-group">
              <label>Preferred Locations</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={locInput} onChange={e => setLocInput(e.target.value)} placeholder="e.g. Bangalore" />
                <button type="button" className="btn btn-primary btn-sm" onClick={addLoc}>Add</button>
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(form.preferred_locations || []).map(l => (
                  <span key={l} className="skill-tag" onClick={() => setForm({ ...form, preferred_locations: form.preferred_locations.filter(x => x !== l) })} style={{ cursor: 'pointer' }}>{l} ✕</span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Preferred Job Types</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Full-time', 'Part-time', 'Contract', 'Remote', 'Freelance', 'Internship'].map(t => (
                  <button key={t} type="button" className={`btn btn-sm ${form.preferred_job_types?.includes(t) ? 'btn-primary' : ''}`} onClick={() => toggleJobType(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="actions">
              <button className="btn btn-success" onClick={handleSave}>Save</button>
              <button className="btn" onClick={() => { setForm(profile); setEditing(false); }}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p><strong>{profile.full_name}</strong></p>
            {profile.headline && <p style={{ color: '#636e72' }}>{profile.headline}</p>}
            <p className="meta">{profile.email} • {profile.role} • {profile.phone || 'No phone'}</p>
            {profile.organization_name && <p className="meta">🏢 {profile.organization_name}</p>}
            {profile.skills?.length > 0 && <div style={{ margin: '12px 0' }}>{profile.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}</div>}
            {profile.experience_years > 0 && <p className="meta">📅 {profile.experience_years} years experience</p>}
            {profile.education && <p className="meta">🎓 {profile.education}</p>}
            {profile.preferred_locations?.length > 0 && <p className="meta">📍 {profile.preferred_locations.join(', ')}</p>}
            {profile.preferred_job_types?.length > 0 && <p className="meta">💼 {profile.preferred_job_types.join(', ')}</p>}
            {profile.cv_filename && <p className="meta">📄 CV: {profile.cv_filename}</p>}
            <p className="meta">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit Profile</button>
              <label className="btn btn-warning" style={{ cursor: 'pointer' }}>
                Upload CV <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleCV} style={{ display: 'none' }} />
              </label>
            </div>
          </>
        )}
      </div>

      {profile.trust_level < 1 && (
        <div className="card">
          <h3>🔒 Upgrade to Level 1 — Document Verification</h3>
          <p className="meta" style={{ marginBottom: 12 }}>Verify your identity to unlock more opportunities and better trust signals.</p>
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label>Document Type</label>
              <select value={verForm.doc_type} onChange={e => setVerForm({ ...verForm, doc_type: e.target.value })}>
                <option value="identity">Identity Document</option>
                <option value="organization">Organization Registration</option>
                <option value="agency">Agency Documentation</option>
              </select>
            </div>
            <div className="form-group">
              <label>Document Reference / ID</label>
              <input value={verForm.doc_reference} onChange={e => setVerForm({ ...verForm, doc_reference: e.target.value })} required placeholder="Enter document number" />
            </div>
            <button type="submit" className="btn btn-warning">Submit for Verification</button>
          </form>
        </div>
      )}
    </div>
  );
}
