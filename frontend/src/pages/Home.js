import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

const modules = [
  { icon: '🔍', title: 'Smart Job Discovery', desc: 'AI-powered job scraping from top platforms — ranked for you using two-tower neural matching', active: true },
  { icon: '🎯', title: 'Personalized Recommendations', desc: 'Jobs ranked by your skills, experience, location preferences, and career goals', active: true },
  { icon: '🤝', title: 'Service Connect', desc: 'Pujaris, traditional cooks, event coordinators, caretakers — community service roles', active: true },
  { icon: '📋', title: 'Project Exchange', desc: 'Project announcements, RFPs, bid submissions', active: false },
  { icon: '🎓', title: 'Advisory & Consulting', desc: 'Professional, legal, financial, technical consulting', active: false },
  { icon: '🏪', title: 'Vendor Marketplace', desc: 'Artisans, farmers, home-based producers, micro-enterprises', active: false },
  { icon: '📚', title: 'Skill Academy', desc: 'Courses, apprenticeships, certification pathways', active: false },
  { icon: '🚀', title: 'Startup Hub', desc: 'Ideas, techathons, co-founder matching, mentorship', active: false },
];

const trustLevels = [
  { level: 'L0', name: 'Registered', desc: 'Account created, terms accepted', color: '#95a5a6' },
  { level: 'L1', name: 'Document Verified', desc: 'Identity & document verification', color: '#3498db' },
  { level: 'L2', name: 'Foundation Screened', desc: 'Structured evaluation passed', color: '#f39c12' },
  { level: 'L3', name: 'Domain Expert Certified', desc: 'Panel endorsement (Phase 2)', color: '#e67e22' },
  { level: 'L4', name: 'Community Endorsed', desc: 'Reputation over time (Phase 3)', color: '#27ae60' },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div>
      <div className="hero">
        <h1>UdyogaSakha</h1>
        <p>AI-powered opportunity matching under a transparent trust framework. Jobs scraped from top platforms, ranked by neural matching for your unique profile.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/jobs" className="btn btn-primary">Browse Jobs</Link>
          {user ? <Link to="/recommended" className="btn btn-success">My Recommendations</Link> : <Link to="/register" className="btn btn-success">Join Free</Link>}
        </div>
      </div>

      <h2 className="section-title">Platform Modules</h2>
      <div className="grid">
        {modules.map((m, i) => (
          <div className="card" key={i} style={{ opacity: m.active ? 1 : 0.5 }}>
            <h3>{m.icon} {m.title} {!m.active && <span className="status status-pending">(Coming Soon)</span>}</h3>
            <p>{m.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="section-title" style={{ marginTop: 32 }}>Trust Framework</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {trustLevels.map(t => (
          <div className="card" key={t.level} style={{ flex: '1 1 200px', borderLeft: `4px solid ${t.color}` }}>
            <h3><span className="trust-badge" style={{ background: t.color }}>{t.level}</span> {t.name}</h3>
            <p>{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
