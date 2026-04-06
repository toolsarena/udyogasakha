import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { opportunities as oppApi, applications as appApi } from '../api';
import { useAuth } from '../App';

export default function OpportunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [opp, setOpp] = useState(null);
  const [coverNote, setCoverNote] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { oppApi.get(id).then(setOpp).catch(console.error); }, [id]);

  const handleApply = async () => {
    setError(''); setMsg('');
    try {
      await appApi.apply({ opportunity_id: +id, cover_note: coverNote });
      setMsg('Application submitted successfully!');
    } catch (err) {
      setError(err.error || 'Failed to apply');
    }
  };

  if (!opp) return <div className="loading">Loading...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card">
        <span className={`module-tag module-${opp.module}`}>{opp.module.replace('_', ' ')}</span>
        <span className={`status status-${opp.status}`} style={{ marginLeft: 8 }}>{opp.status}</span>
        {opp.required_trust_level > 0 && <span className="trust-badge" style={{ marginLeft: 8 }}>Requires L{opp.required_trust_level}+</span>}
        <h2 style={{ marginTop: 12 }}>{opp.title}</h2>
        <div className="meta" style={{ marginBottom: 16 }}>
          Posted by {opp.requester_name} {opp.organization_name && `(${opp.organization_name})`}
          <span className="trust-badge" style={{ marginLeft: 8 }}>L{opp.requester_trust_level}</span>
          {opp.location && ` • 📍 ${opp.location}`}
        </div>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{opp.description}</p>
        {opp.engagement_type && <p className="meta">Engagement: {opp.engagement_type}</p>}
        {opp.compensation_info && <p className="meta">Compensation: {opp.compensation_info}</p>}
        {opp.category_name && <p className="meta">Category: {opp.category_name}</p>}
        {opp.expires_at && <p className="meta">Expires: {new Date(opp.expires_at).toLocaleDateString()}</p>}
      </div>

      {user && user.role === 'seeker' && opp.status === 'published' && (
        <div className="card">
          <h3>Express Interest</h3>
          {error && <p className="error">{error}</p>}
          {msg && <p className="success">{msg}</p>}
          {!msg && (
            <>
              <div className="form-group">
                <label>Cover Note (optional)</label>
                <textarea value={coverNote} onChange={e => setCoverNote(e.target.value)} placeholder="Why are you interested in this opportunity?" />
              </div>
              <button className="btn btn-primary" onClick={handleApply}>Apply</button>
            </>
          )}
        </div>
      )}

      {!user && opp.status === 'published' && (
        <div className="card"><p>Please <a href="/login">login</a> to apply for this opportunity.</p></div>
      )}
    </div>
  );
}
