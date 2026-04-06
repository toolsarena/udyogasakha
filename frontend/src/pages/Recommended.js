import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobs } from '../api';

export default function Recommended() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobs.recommended(50).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">🤖 Analyzing your profile and ranking jobs...</div>;

  return (
    <div>
      <h2 className="section-title">🎯 Recommended For You</h2>
      {data && (
        <p className="meta" style={{ marginBottom: 16 }}>
          Ranked using {data.method === 'two-tower' ? '🧠 Two-Tower Neural Matching' : '🔤 Keyword Matching'} • {data.total} matches
          {data.method !== 'two-tower' && <span> — <Link to="/profile">Complete your profile</Link> for better AI recommendations</span>}
        </p>
      )}

      {!data || data.data.length === 0 ? (
        <div className="empty">
          <p>No recommendations yet.</p>
          <p className="meta" style={{ marginTop: 8 }}>Make sure your <Link to="/profile">profile</Link> has skills, experience, and preferences filled in.</p>
        </div>
      ) : (
        <div className="grid">
          {data.data.map((job, idx) => (
            <Link to={`/jobs/${job.id}`} className="card-link" key={job.id}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <span className="rank-badge">#{idx + 1}</span>
                  <span className="score-badge">{(job.score * 100).toFixed(0)}% match</span>
                </div>
                <h3 style={{ marginTop: 8 }}>{job.title}</h3>
                <p style={{ color: '#3498db', fontWeight: 600, margin: '4px 0' }}>{job.company}</p>
                <div className="meta">
                  📍 {job.location || 'Remote'} • {job.job_type || 'Full-time'}
                  {job.salary && ` • 💰 ${job.salary}`}
                </div>
                {job.tags && JSON.parse(job.tags || '[]').slice(0, 4).map((t, i) => (
                  <span key={i} className="skill-tag">{t}</span>
                ))}
                <div className="meta" style={{ marginTop: 8 }}>
                  {job.posted_at && `Posted ${new Date(job.posted_at).toLocaleDateString()}`}
                  <span className={`source-tag source-${job.source}`} style={{ marginLeft: 8 }}>{job.source}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
