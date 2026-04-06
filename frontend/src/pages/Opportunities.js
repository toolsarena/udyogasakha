import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { opportunities } from '../api';

export default function Opportunities() {
  const [data, setData] = useState({ data: [], total: 0 });
  const [filters, setFilters] = useState({ module: '', search: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.module) params.set('module', filters.module);
    if (filters.search) params.set('search', filters.search);
    opportunities.list(params.toString()).then(setData).catch(console.error);
  }, [filters]);

  return (
    <div>
      <h2 className="section-title">Browse Opportunities</h2>
      <div className="filters">
        <select value={filters.module} onChange={e => setFilters({ ...filters, module: e.target.value })}>
          <option value="">All Modules</option>
          <option value="employment">Employment Exchange</option>
          <option value="service_engagement">Service Engagement Roles</option>
        </select>
        <input placeholder="Search..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
        <span className="meta">{data.total} opportunities</span>
      </div>
      {data.data.length === 0 ? (
        <div className="empty">No opportunities found</div>
      ) : (
        <div className="grid">
          {data.data.map(opp => (
            <Link to={`/opportunities/${opp.id}`} className="card-link" key={opp.id}>
              <div className="card">
                <span className={`module-tag module-${opp.module}`}>{opp.module.replace('_', ' ')}</span>
                {opp.required_trust_level > 0 && <span className="trust-badge" style={{ marginLeft: 8 }}>L{opp.required_trust_level}+</span>}
                <h3 style={{ marginTop: 8 }}>{opp.title}</h3>
                <p>{opp.description?.substring(0, 150)}...</p>
                <div className="meta">
                  {opp.requester_name} {opp.organization_name && `• ${opp.organization_name}`}
                  {opp.location && ` • 📍 ${opp.location}`}
                  {opp.engagement_type && ` • ${opp.engagement_type}`}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
