// client/src/pages/candidate/CandidateDocumentsPage.jsx
// Legacy candidate_uploaded_doc_view.php: the documents the crewing team
// holds on file for this candidate, per vacancy. Read-only.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Inbox, FileText, CalendarClock, AlertTriangle, Info } from 'lucide-react';
import { ACCOUNT_ENDPOINTS } from '../../config/api';

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1902) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const expiryState = (expiry) => {
  if (!expiry) return null;
  const days = Math.round((new Date(expiry) - Date.now()) / 86400000);
  if (days < 0) return 'expired';
  if (days <= 90) return 'soon';
  return 'ok';
};

export default function CandidateDocumentsPage() {
  const [records, setRecords] = useState([]);
  const [needsIndos, setNeedsIndos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(ACCOUNT_ENDPOINTS.DOCUMENTS, { headers: authHeader() });
        const data = await res.json();
        if (data.success) { setRecords(data.records || []); setNeedsIndos(Boolean(data.needsIndos)); }
        else setError(data.message || 'Could not load your documents.');
      } catch (err) {
        setError('Network error while loading your documents.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="cp-loading-screen">Loading documents...</div>;

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Candidate Uploaded Documents</h1>
          <p>Documents our crewing team has on file for you, and when each one expires.</p>
        </div>
      </div>

      {error && <div className="cp-alert cp-alert-error">{error}</div>}

      {needsIndos ? (
        <div className="cp-placeholder">
          <AlertTriangle size={28} />
          <h2>INDOS number needed</h2>
          <p>
            Documents are filed against your INDOS number. Add it under{' '}
            <Link to="/candidate/profile#personal" className="cp-inline-link">Personal Information</Link> to see them here.
          </p>
        </div>
      ) : records.length === 0 ? (
        <div className="cp-placeholder">
          <Inbox size={28} />
          <h2>No documents on file</h2>
          <p>Documents are added by the crewing team when you are processed for a vacancy.</p>
        </div>
      ) : (
        <>
          {records.map((rec) => (
            <div className="cp-card" key={rec._id}>
              <div className="cp-card-head">
                <FolderOpen size={16} />
                <h2>{rec.vacancyId ? 'Vacancy #' + rec.vacancyId : 'Documents on File'}</h2>
                {formatDate(rec.date) && <span className="cp-muted cp-card-head-right">Filed {formatDate(rec.date)}</span>}
              </div>
              <ul className="cp-doc-list">
                {rec.documents.map((d) => {
                  const state = expiryState(d.expiry);
                  return (
                    <li key={d.key} className={'cp-doc' + (state ? ' cp-doc-' + state : '')}>
                      <FileText size={15} />
                      <div className="cp-doc-body">
                        <strong>{d.label}</strong>
                        <span className="cp-muted">{d.filename}</span>
                      </div>
                      {d.expiry ? (
                        <span className="cp-doc-expiry">
                          <CalendarClock size={12} />
                          {state === 'expired' ? 'Expired ' : 'Expires '}{formatDate(d.expiry)}
                        </span>
                      ) : (
                        <span className="cp-doc-expiry cp-muted">No expiry</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="cp-table-note">
            <Info size={13} /> These files were kept on the old site and have not been carried across yet, so they are listed but cannot be opened here. Contact us if you need a copy.
          </p>
        </>
      )}
    </>
  );
}
