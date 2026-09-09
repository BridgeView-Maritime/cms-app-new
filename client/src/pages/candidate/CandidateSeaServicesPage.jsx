// client/src/pages/candidate/CandidateSeaServicesPage.jsx
// Read-only: sea service comes from company-issued contracts, so a
// candidate can view their record but not edit it.
import React, { useState, useEffect } from 'react';
import { Ship, Clock, Inbox, Info } from 'lucide-react';
import { PROFILE_SECTIONS } from '../../config/api';

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1902) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function humanDuration(days) {
  if (!days || days < 0) return '';
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const parts = [];
  if (years) parts.push(years + (years === 1 ? ' yr' : ' yrs'));
  if (months) parts.push(months + ' mo');
  // Under a month, days are the only meaningful unit.
  if (!parts.length) parts.push(days + (days === 1 ? ' day' : ' days'));
  return parts.join(' ');
}

export default function CandidateSeaServicesPage() {
  const [records, setRecords] = useState([]);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(PROFILE_SECTIONS.SEA_SERVICES, { headers: authHeader() });
        const data = await res.json();
        if (data.success) {
          setRecords(data.records || []);
          setTotalDays(data.totalDays || 0);
        } else {
          setError(data.message || 'Could not load your sea service record.');
        }
      } catch (err) {
        setError('Network error while loading your sea service record.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="cp-loading-screen">Loading sea services...</div>;

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Sea Services</h1>
          <p>Your sea time and vessel history.</p>
        </div>
      </div>

      {error && <div className="cp-alert cp-alert-error">{error}</div>}

      {records.length > 0 && (
        <div className="cp-status-row">
          <div className="cp-status-chip">
            <span>Total Sea Time</span>
            <strong><Clock size={14} /> {humanDuration(totalDays)}</strong>
          </div>
          <div className="cp-status-chip">
            <span>Contracts</span>
            <strong><Ship size={14} /> {records.length}</strong>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="cp-placeholder">
          <Inbox size={28} />
          <h2>No sea service records</h2>
          <p>
            Sea service is added by the company when you are signed on to a vessel.
            If you believe something is missing, please get in touch with us.
          </p>
        </div>
      ) : (
        <div className="cp-card cp-table-card">
          <div className="cp-table-scroll">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Vessel</th>
                  <th>Type</th>
                  <th>Company</th>
                  <th>Rank</th>
                  <th>Sign On</th>
                  <th>Sign Off</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id}>
                    <td>{r.vessel || <span className="cp-muted">&mdash;</span>}</td>
                    <td>{r.vesselType || <span className="cp-muted">&mdash;</span>}</td>
                    <td>{r.company || <span className="cp-muted">&mdash;</span>}</td>
                    <td>{r.rank || <span className="cp-muted">&mdash;</span>}</td>
                    <td>{formatDate(r.signOn) || <span className="cp-muted">&mdash;</span>}</td>
                    <td>{formatDate(r.signOff) || <span className="cp-muted">&mdash;</span>}</td>
                    <td>{r.days ? humanDuration(r.days) : <span className="cp-muted">&mdash;</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cp-table-note">
            <Info size={13} /> These records are maintained by the company and are read-only.
          </p>
        </div>
      )}
    </>
  );
}
