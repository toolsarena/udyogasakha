import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applications } from '../api';

export default function MyApplications() {
  const [apps, setApps] = useState([]);

  useEffect(() => { applications.my().then(setApps).catch(console.error); }, []);

  const handleWithdraw = async (id) => {
    if (!window.confirm('Withdraw this application?')) return;
    await applications.withdraw(id);
    setApps(apps.map(a => a.id === id ? { ...a, status: 'withdrawn' } : a));
  };

  return (
    <div>
      <h2 className="section-title">My Applications</h2>
      {apps.length === 0 ? <div className="empty">No applications yet</div> : (
        <table>
          <thead><tr><th>Opportunity</th><th>Module</th><th>Status</th><th>Applied</th><th>Actions</th></tr></thead>
          <tbody>
            {apps.map(a => (
              <tr key={a.id}>
                <td><Link to={`/opportunities/${a.opportunity_id}`}>{a.opportunity_title}</Link></td>
                <td><span className={`module-tag module-${a.module}`}>{a.module.replace('_', ' ')}</span></td>
                <td><span className={`status status-${a.status}`}>{a.status}</span></td>
                <td className="meta">{new Date(a.created_at).toLocaleDateString()}</td>
                <td>
                  {a.status === 'submitted' && <button className="btn btn-danger btn-sm" onClick={() => handleWithdraw(a.id)}>Withdraw</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
