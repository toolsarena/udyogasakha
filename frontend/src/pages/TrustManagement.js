import React, { useState, useEffect } from 'react';
import { trust } from '../api';

export default function TrustManagement() {
  const [verifications, setVerifications] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [tab, setTab] = useState('verifications');

  useEffect(() => {
    trust.pendingVerifications().then(setVerifications).catch(console.error);
    trust.pendingScreenings().then(setScreenings).catch(console.error);
  }, []);

  const reviewVerification = async (id, status) => {
    await trust.reviewVerification(id, { status, notes: '' });
    setVerifications(verifications.filter(v => v.id !== id));
  };

  const completeScreening = async (id, outcome) => {
    await trust.completeScreening(id, { outcome, notes: '' });
    setScreenings(screenings.filter(s => s.id !== id));
  };

  return (
    <div>
      <h2 className="section-title">Trust Framework Management</h2>
      <div className="filters">
        <button className={`btn ${tab === 'verifications' ? 'btn-primary' : ''}`} onClick={() => setTab('verifications')}>
          Document Verifications (L1) - {verifications.length} pending
        </button>
        <button className={`btn ${tab === 'screenings' ? 'btn-warning' : ''}`} onClick={() => setTab('screenings')}>
          Foundation Screenings (L2) - {screenings.length} pending
        </button>
      </div>

      {tab === 'verifications' && (
        verifications.length === 0 ? <div className="empty">No pending verifications</div> : (
          <table>
            <thead><tr><th>User</th><th>Email</th><th>Doc Type</th><th>Reference</th><th>Submitted</th><th>Actions</th></tr></thead>
            <tbody>
              {verifications.map(v => (
                <tr key={v.id}>
                  <td>{v.full_name}</td>
                  <td>{v.email}</td>
                  <td>{v.doc_type}</td>
                  <td>{v.doc_reference}</td>
                  <td className="meta">{new Date(v.created_at).toLocaleDateString()}</td>
                  <td className="actions">
                    <button className="btn btn-success btn-sm" onClick={() => reviewVerification(v.id, 'approved')}>Approve → L1</button>
                    <button className="btn btn-danger btn-sm" onClick={() => reviewVerification(v.id, 'rejected')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {tab === 'screenings' && (
        screenings.length === 0 ? <div className="empty">No pending screenings</div> : (
          <table>
            <thead><tr><th>User</th><th>Email</th><th>Type</th><th>Submitted</th><th>Actions</th></tr></thead>
            <tbody>
              {screenings.map(s => (
                <tr key={s.id}>
                  <td>{s.full_name}</td>
                  <td>{s.email}</td>
                  <td>{s.screening_type}</td>
                  <td className="meta">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="actions">
                    <button className="btn btn-success btn-sm" onClick={() => completeScreening(s.id, 'passed')}>Pass → L2</button>
                    <button className="btn btn-danger btn-sm" onClick={() => completeScreening(s.id, 'failed')}>Fail</button>
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
