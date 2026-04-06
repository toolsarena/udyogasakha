import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobs } from '../api';

export default function Jobs() {
  const [data, setData] = useState({ data: [], total: 0 });
  const [filters, setFilters] = useState({ search: '', location: '', job_type: '', source: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set('page', page);
    params.set('limit', 30);
    jobs.list(params.toString()).then(setData).catch(console.error);
  }, [filters, page]);

  return (
    <div>
      <h2 className="section-title">🔍 Browse Jobs</h2>
      <div className="filters">
        <input placeholder="Search jobs, companies..." value={filters.search} onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1); }} />
        <input placeholder="Location..." value={filters.location} onChange={e => { setFilters({ ...filters, location: e.target.value }); setPage(1); }} />
        <select value={filters.job_type} onChange={e => { setFilters({ ...filters, job_type: e.target.value }); setPage(1); }}>
          <option value="">All Types</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
          <option value="Remote">Remote</option>
        </select>
        <select value={filters.source} onChange={e => { setFilters({ ...filters, source: e.target.value }); setPage(1); }}>
          <option value="">All Sources</option>
          <option value="remotive">Remotive</option>
          <option value="arbeitnow">Arbeitnow</option>
          <option value="findwork">FindWork</option>
        </select>
        <span className="meta">{data.total} jobs found</span>
      </div>

      {data.data.length === 0 ? (
        <div className="empty">No jobs found. Jobs are scraped automatically — check back soon!</div>
      ) : (
        <>
          <div className="grid">
            {data.data.map(job => (
              <Link to={`/jobs/${job.id}`} className="card-link" key={job.id}>
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3>{job.title}</h3>
                      <p style={{ color: '#3498db', fontWeight: 600, margin: '4px 0' }}>{job.company}</p>
                    </div>
                    <span className={`source-tag source-${job.source}`}>{job.source}</span>
                  </div>
                  <div className="meta">
                    📍 {job.location || 'Remote'} • {job.job_type || 'Full-time'}
                    {job.salary && ` • 💰 ${job.salary}`}
                  </div>
                  {job.tags && JSON.parse(job.tags || '[]').slice(0, 4).map((t, i) => (
                    <span key={i} className="skill-tag">{t}</span>
                  ))}
                  <div className="meta" style={{ marginTop: 8 }}>
                    {job.posted_at && `Posted ${new Date(job.posted_at).toLocaleDateString()}`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="actions" style={{ justifyContent: 'center', marginTop: 20 }}>
            {page > 1 && <button className="btn" onClick={() => setPage(page - 1)}>← Previous</button>}
            <span className="meta">Page {page}</span>
            {data.data.length === 30 && <button className="btn" onClick={() => setPage(page + 1)}>Next →</button>}
          </div>
        </>
      )}
    </div>
  );
}
