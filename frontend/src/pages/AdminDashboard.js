import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { admin, jobs as jobsApi } from '../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { admin.dashboard().then(setStats).catch(console.error); }, []);

  const triggerScrape = async () => {
    setMsg('Scraping jobs...');
    try {
      const res = await jobsApi.scrape();
      setMsg(res.message);
      admin.dashboard().then(setStats);
    } catch (e) { setMsg('Scrape failed: ' + (e.error || e.message)); }
  };

  const triggerEmbed = async () => {
    setMsg('Generating embeddings...');
    try {
      const res = await jobsApi.embed();
      setMsg(res.message);
      admin.dashboard().then(setStats);
    } catch (e) { setMsg('Embed failed: ' + (e.error || e.message)); }
  };

  if (!stats) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <h2 className="section-title">Governance Dashboard</h2>
      {msg && <p className="success">{msg}</p>}

      <div className="stats-grid">
        <div className="stat-card"><div className="number">{stats.users}</div><div className="label">Total Users</div></div>
        <div className="stat-card"><div className="number">{stats.jobs_total}</div><div className="label">Scraped Jobs</div></div>
        <div className="stat-card"><div className="number">{stats.jobs_embedded}</div><div className="label">Jobs Embedded</div></div>
        <div className="stat-card"><div className="number">{stats.opportunities_total}</div><div className="label">Community Posts</div></div>
        <div className="stat-card"><div className="number">{stats.applications_total}</div><div className="label">Applications</div></div>
        <div className="stat-card" style={{ borderLeft: '4px solid #f39c12' }}><div className="number">{stats.pending_moderations}</div><div className="label">Pending Moderation</div></div>
        <div className="stat-card" style={{ borderLeft: '4px solid #3498db' }}><div className="number">{stats.pending_verifications}</div><div className="label">Pending Verifications</div></div>
        <div className="stat-card" style={{ borderLeft: '4px solid #e74c3c' }}><div className="number">{stats.open_complaints}</div><div className="label">Open Complaints</div></div>
      </div>

      <div className="card">
        <h3>🤖 Job Pipeline Controls</h3>
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={triggerScrape}>🔄 Scrape Jobs Now</button>
          <button className="btn btn-warning" onClick={triggerEmbed}>🧠 Generate Embeddings</button>
        </div>
        {stats.jobs_by_source?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p className="meta">Jobs by source:</p>
            {stats.jobs_by_source.map(s => <span key={s.source} className={`source-tag source-${s.source}`} style={{ marginRight: 8 }}>{s.source}: {s.count}</span>)}
          </div>
        )}
      </div>

      <div className="grid">
        <div className="card">
          <h3>Users by Role</h3>
          {stats.users_by_role.map(r => <p key={r.role}><strong>{r.role}:</strong> {r.count}</p>)}
        </div>
        <div className="card">
          <h3>Users by Trust Level</h3>
          {stats.users_by_trust.map(t => <p key={t.trust_level}><strong>L{t.trust_level}:</strong> {t.count}</p>)}
        </div>
      </div>

      <div className="actions" style={{ marginTop: 24 }}>
        <Link to="/moderation" className="btn btn-warning">Moderation Queue</Link>
        <Link to="/trust-mgmt" className="btn btn-primary">Trust Management</Link>
      </div>
    </div>
  );
}
