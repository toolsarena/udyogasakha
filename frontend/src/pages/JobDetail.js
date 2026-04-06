import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobs } from '../api';

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);

  useEffect(() => { jobs.get(id).then(setJob).catch(console.error); }, [id]);

  if (!job) return <div className="loading">Loading...</div>;

  const tags = JSON.parse(job.tags || '[]');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Link to="/jobs" className="meta">← Back to Jobs</Link>
      <div className="card" style={{ marginTop: 12 }}>
        <span className={`source-tag source-${job.source}`}>{job.source}</span>
        <h2 style={{ marginTop: 8 }}>{job.title}</h2>
        <p style={{ color: '#3498db', fontWeight: 600, fontSize: '1.1rem', margin: '8px 0' }}>{job.company}</p>
        <div className="meta" style={{ marginBottom: 16 }}>
          📍 {job.location || 'Remote'} • {job.job_type || 'Full-time'}
          {job.salary && ` • 💰 ${job.salary}`}
          {job.posted_at && ` • Posted ${new Date(job.posted_at).toLocaleDateString()}`}
        </div>
        {tags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {tags.map((t, i) => <span key={i} className="skill-tag">{t}</span>)}
          </div>
        )}
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{job.description}</div>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-block', marginTop: 20 }}>
            Apply on {job.source} →
          </a>
        )}
      </div>
    </div>
  );
}
