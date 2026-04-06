import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';

const SKILL_OPTIONS = ['JavaScript','Python','React','Node.js','Java','AWS','SQL','TypeScript','Docker','Kubernetes','Machine Learning','AI','Data Science','DevOps','Go','Rust','C++','PHP','Ruby','Swift','Flutter','Android','iOS','Cloud','Azure','GCP','Terraform','GraphQL','REST API','MongoDB','PostgreSQL','Redis','Kafka','Microservices','System Design','Product Management','UI/UX','Figma','Agile','Scrum'];

export default function Register() {
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', phone: '', role: 'talent',
    organization_name: '', headline: '', skills: [], experience_years: 0,
    education: '', preferred_locations: [], preferred_job_types: [],
  });
  const [skillInput, setSkillInput] = useState('');
  const [locInput, setLocInput] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const addSkill = (skill) => {
    if (skill && !form.skills.includes(skill)) setForm({ ...form, skills: [...form.skills, skill] });
    setSkillInput('');
  };

  const addLocation = () => {
    if (locInput && !form.preferred_locations.includes(locInput)) setForm({ ...form, preferred_locations: [...form.preferred_locations, locInput] });
    setLocInput('');
  };

  const toggleJobType = (type) => {
    const types = form.preferred_job_types.includes(type) ? form.preferred_job_types.filter(t => t !== type) : [...form.preferred_job_types, type];
    setForm({ ...form, preferred_job_types: types });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/recommended');
    } catch (err) {
      setError(err.error || err.errors?.[0]?.msg || 'Registration failed');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <div className="card">
        <h2 className="section-title">Join UdyogaSakha</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>I am a</label>
            <select value={form.role} onChange={set('role')}>
              <option value="talent">Talent (Looking for opportunities)</option>
              <option value="recruiter">Recruiter (Posting opportunities)</option>
            </select>
          </div>
          <div className="form-group"><label>Full Name *</label><input value={form.full_name} onChange={set('full_name')} required /></div>
          <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={set('email')} required /></div>
          <div className="form-group"><label>Password * (min 6 chars)</label><input type="password" value={form.password} onChange={set('password')} required minLength={6} /></div>
          <div className="form-group"><label>Phone</label><input value={form.phone} onChange={set('phone')} /></div>
          <div className="form-group"><label>Headline</label><input value={form.headline} onChange={set('headline')} placeholder="e.g. Senior AI Architect | 10+ years in ML" /></div>

          {form.role === 'recruiter' && <div className="form-group"><label>Organization</label><input value={form.organization_name} onChange={set('organization_name')} /></div>}

          {form.role === 'talent' && (
            <>
              <div className="form-group">
                <label>Skills</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Type or pick a skill" list="skill-list" />
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => addSkill(skillInput)}>Add</button>
                </div>
                <datalist id="skill-list">{SKILL_OPTIONS.map(s => <option key={s} value={s} />)}</datalist>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.skills.map(s => (
                    <span key={s} className="skill-tag" onClick={() => setForm({ ...form, skills: form.skills.filter(x => x !== s) })} style={{ cursor: 'pointer' }}>{s} ✕</span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Years of Experience</label>
                <input type="number" min="0" max="50" value={form.experience_years} onChange={set('experience_years')} />
              </div>
              <div className="form-group">
                <label>Education</label>
                <select value={form.education} onChange={set('education')}>
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
                  <input value={locInput} onChange={e => setLocInput(e.target.value)} placeholder="e.g. Bangalore, Remote" />
                  <button type="button" className="btn btn-primary btn-sm" onClick={addLocation}>Add</button>
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.preferred_locations.map(l => (
                    <span key={l} className="skill-tag" onClick={() => setForm({ ...form, preferred_locations: form.preferred_locations.filter(x => x !== l) })} style={{ cursor: 'pointer' }}>{l} ✕</span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Preferred Job Types</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Full-time', 'Part-time', 'Contract', 'Remote', 'Freelance', 'Internship'].map(t => (
                    <button key={t} type="button" className={`btn btn-sm ${form.preferred_job_types.includes(t) ? 'btn-primary' : ''}`} onClick={() => toggleJobType(t)}>{t}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: 12 }}>Create Account</button>
        </form>
        <p className="meta" style={{ marginTop: 16, textAlign: 'center' }}>Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}
