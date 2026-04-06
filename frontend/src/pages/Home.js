import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

const modules = [
  { icon: '💼', title: 'Employment Exchange', desc: 'Full-time, part-time, contract, advisory roles across all industries', active: true },
  { icon: '🙏', title: 'Service Engagement Roles', desc: 'Pujaris, traditional cooks, event coordinators, caretakers', active: true },
  { icon: '📋', title: 'Project & Tender Exchange', desc: 'Project announcements, RFPs, bid submissions', active: false },
  { icon: '🎓', title: 'Consultancy & Advisory', desc: 'Professional, legal, financial, technical consulting', active: false },
  { icon: '🏪', title: 'Vendor & Marketplace', desc: 'Artisans, farmers, home-based producers, micro-enterprises', active: false },
  { icon: '📚', title: 'Training & Skill Development', desc: 'Courses, apprenticeships, certification pathways', active: false },
  { icon: '🚀', title: 'Startup & Innovation', desc: 'Ideas, techathons, co-founder matching, mentorship', active: false },
  { icon: '🤝', title: 'Volunteer & Social Impact', desc: 'Skill-based volunteering, community projects', active: false },
];

const trustLevels = [
  { level: 'L0', name: 'Registered', desc: 'Account created, terms accepted' },
  { level: 'L1', name: 'Document Verified', desc: 'Identity & document verification completed' },
  { level: 'L2', name: 'Foundation Screened', desc: 'Structured evaluation under governance' },
  { level: 'L3', name: 'Domain Expert Certified', desc: 'Endorsed by Domain Expert Panel' },
  { level: 'L4', name: 'Community Endorsed', desc: 'Consistent positive engagement history' },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div>
      <div className="hero">
        <h1>UdyogaSakha</h1>
        <p>A Foundation-governed Udyoga facilitation ecosystem connecting seekers and providers of opportunities under a transparent trust framework.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/opportunities" className="btn btn-primary">Browse Opportunities</Link>
          {!user && <Link to="/register" className="btn btn-success">Join the Ecosystem</Link>}
        </div>
      </div>

      <h2 className="section-title">Udyoga Modules</h2>
      <div className="grid">
        {modules.map((m, i) => (
          <div className="card" key={i} style={{ opacity: m.active ? 1 : 0.5 }}>
            <h3>{m.icon} {m.title} {!m.active && <span className="status status-pending">(Coming Soon)</span>}</h3>
            <p>{m.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="section-title" style={{ marginTop: 32 }}>Trust Framework</h2>
      <div className="grid">
        {trustLevels.map((t) => (
          <div className="card" key={t.level}>
            <h3><span className="trust-badge">{t.level}</span> {t.name}</h3>
            <p>{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
