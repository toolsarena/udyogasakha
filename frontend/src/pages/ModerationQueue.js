import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { admin, opportunities } from '../api';

export default function ModerationQueue() {
  const [queue, setQueue] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [tab, setTab] = useState('queue');

  useEffect(() => {
    admin.moderationQueue().then(setQueue).catch(console.error);
    admin.complaints().then(setComplaints).catch(console.error);
  }, []);

  const moderate = async (id, action, notes = '') => {
    await opportunities.moderate(id, { action, notes });
    setQueue(queue.filter(q => q.id !== id));
  };

  const resolveComplaint = async (id, status) => {
    await admin.updateComplaint(id, { status, resolution_notes: '' });
    setComplaints(complaints.map(c => c.id === id ? { ...c, status } : c));
  };

  return (
    <div>
      <h2 className="section-title">Moderation & Governance</h2>
      <div className="filters">
        <button className={`btn ${tab === 'queue' ? 'btn-primary' : ''}`} onClick={() => setTab('queue')}>Moderation Queue ({queue.length})</button>
        <button className={`btn ${tab === 'complaints' ? 'btn-danger' : ''}`} onClick={() => setTab('complaints')}>Complaints ({complaints.filter(c => c.status === 'open').length})</button>
      </div>

      {tab === 'queue' && (
        queue.length === 0 ? <div className="empty">No pending moderations</div> : (
          <table>
            <thead><tr><th>Title</th><th>Module</th><th>Requester</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {queue.map(q => (
                <tr key={q.id}>
                  <td><Link to={`/opportunities/${q.id}`}>{q.title}</Link></td>
                  <td><span className={`module-tag module-${q.module}`}>{q.module.replace('_', ' ')}</span></td>
                  <td>{q.requester_name}</td>
                  <td className="meta">{new Date(q.created_at).toLocaleDateString()}</td>
                  <td className="actions">
                    <button className="btn btn-success btn-sm" onClick={() => moderate(q.id, 'approve')}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => moderate(q.id, 'reject', 'Does not meet guidelines')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {tab === 'complaints' && (
        complaints.length === 0 ? <div className="empty">No complaints</div> : (
          <table>
            <thead><tr><th>Reporter</th><th>Target</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id}>
                  <td>{c.reporter_name}</td>
                  <td>{c.target_type} #{c.target_id}</td>
                  <td>{c.reason}</td>
                  <td><span className={`status status-${c.status}`}>{c.status}</span></td>
                  <td className="actions">
                    {c.status === 'open' && <>
                      <button className="btn btn-warning btn-sm" onClick={() => resolveComplaint(c.id, 'reviewing')}>Review</button>
                      <button className="btn btn-success btn-sm" onClick={() => resolveComplaint(c.id, 'resolved')}>Resolve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => resolveComplaint(c.id, 'dismissed')}>Dismiss</button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
