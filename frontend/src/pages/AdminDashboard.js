import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { admin } from '../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => { admin.dashboard().then(setStats).catch(console.error); }, []);

  if (!stats) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <h2 className="section-title">Governance Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card"><div className="number">{stats.users}</div><div className="label">Total Users</div></div>
        <div className="stat-card"><div className="number">{stats.opportunities_total}</div><div className="label">Total Opportunities</div></div>
        <div className="stat-card"><div className="number">{stats.applications_total}</div><div className="label">Total Applications</div></div>
        <div className="stat-card" style={{ borderLeft: '4px solid #f39c12' }}><div className="number">{stats.pending_moderations}</div><div className="label">Pending Moderation</div></div>
        <div className="stat-card" style={{ borderLeft: '4px solid #3498db' }}><div className="number">{stats.pending_verifications}</div><div className="label">Pending Verifications</div></div>
        <div className="stat-card" style={{ borderLeft: '4px solid #e74c3c' }}><div className="number">{stats.open_complaints}</div><div className="label">Open Complaints</div></div>
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
        <div className="card">
          <h3>Opportunities by Status</h3>
          {stats.opportunities_by_status.map(s => <p key={s.status}><span className={`status status-${s.status}`}>{s.status}</span>: {s.count}</p>)}
        </div>
        <div className="card">
          <h3>Opportunities by Module</h3>
          {stats.opportunities_by_module.map(m => <p key={m.module}><span className={`module-tag module-${m.module}`}>{m.module.replace('_', ' ')}</span>: {m.count}</p>)}
        </div>
        <div className="card">
          <h3>Applications by Status</h3>
          {stats.applications_by_status.map(s => <p key={s.status}><span className={`status status-${s.status}`}>{s.status}</span>: {s.count}</p>)}
        </div>
      </div>

      <div className="actions" style={{ marginTop: 24 }}>
        <Link to="/moderation" className="btn btn-warning">Moderation Queue</Link>
        <Link to="/trust-mgmt" className="btn btn-primary">Trust Management</Link>
      </div>
    </div>
  );
}
