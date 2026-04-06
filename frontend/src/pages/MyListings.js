import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { opportunities, applications as appApi } from '../api';

export default function MyListings() {
  const [listings, setListings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [apps, setApps] = useState([]);

  useEffect(() => { opportunities.my().then(setListings).catch(console.error); }, []);

  const viewApps = async (oppId) => {
    setSelected(oppId);
    const data = await appApi.forOpportunity(oppId);
    setApps(data);
  };

  const updateAppStatus = async (appId, status) => {
    await appApi.updateStatus(appId, { status });
    setApps(apps.map(a => a.id === appId ? { ...a, status } : a));
  };

  const closeOpp = async (id) => {
    if (!window.confirm('Close this opportunity?')) return;
    await opportunities.close(id);
    setListings(listings.map(l => l.id === id ? { ...l, status: 'closed' } : l));
  };

  return (
    <div>
      <h2 className="section-title">My Listings</h2>
      {listings.length === 0 ? <div className="empty">No listings yet. <Link to="/create-opportunity">Post one</Link></div> : (
        <table>
          <thead><tr><th>Title</th><th>Module</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {listings.map(l => (
              <tr key={l.id}>
                <td><Link to={`/opportunities/${l.id}`}>{l.title}</Link></td>
                <td><span className={`module-tag module-${l.module}`}>{l.module.replace('_', ' ')}</span></td>
                <td><span className={`status status-${l.status}`}>{l.status}</span></td>
                <td className="meta">{new Date(l.created_at).toLocaleDateString()}</td>
                <td className="actions">
                  {l.status === 'published' && <button className="btn btn-primary btn-sm" onClick={() => viewApps(l.id)}>Applicants</button>}
                  {l.status === 'published' && <button className="btn btn-warning btn-sm" onClick={() => closeOpp(l.id)}>Close</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div style={{ marginTop: 24 }}>
          <h3 className="section-title">Applicants for: {listings.find(l => l.id === selected)?.title}</h3>
          {apps.length === 0 ? <div className="empty">No applications yet</div> : (
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Trust</th><th>Status</th><th>Note</th><th>Actions</th></tr></thead>
              <tbody>
                {apps.map(a => (
                  <tr key={a.id}>
                    <td>{a.full_name}</td>
                    <td>{a.email}</td>
                    <td><span className="trust-badge">L{a.trust_level}</span></td>
                    <td><span className={`status status-${a.status}`}>{a.status}</span></td>
                    <td className="meta">{a.cover_note || '-'}</td>
                    <td className="actions">
                      {a.status === 'submitted' && <>
                        <button className="btn btn-primary btn-sm" onClick={() => updateAppStatus(a.id, 'shortlisted')}>Shortlist</button>
                        <button className="btn btn-danger btn-sm" onClick={() => updateAppStatus(a.id, 'rejected')}>Reject</button>
                      </>}
                      {a.status === 'shortlisted' && <>
                        <button className="btn btn-success btn-sm" onClick={() => updateAppStatus(a.id, 'engaged')}>Engage</button>
                        <button className="btn btn-danger btn-sm" onClick={() => updateAppStatus(a.id, 'rejected')}>Reject</button>
                      </>}
                      {a.status === 'engaged' && <button className="btn btn-success btn-sm" onClick={() => updateAppStatus(a.id, 'completed')}>Complete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
