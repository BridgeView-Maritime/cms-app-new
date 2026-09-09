// client/src/pages/candidate/CandidateContractDetailsPage.jsx
// Despite the legacy name, contract_details is not a document store: each
// row is the joining-paperwork checklist for one vacancy, with a flag per
// item. It is filled in by the crewing team, so this page is read-only.
import React, { useState, useEffect } from 'react';
import { FilePen, Inbox, Check, Clock, Info } from 'lucide-react';
import { CANDIDATE_SECTIONS } from '../../config/api';

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1902) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CandidateContractDetailsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(CANDIDATE_SECTIONS.CONTRACT_DETAILS, { headers: authHeader() });
        const data = await res.json();
        if (data.success) setRecords(data.records || []);
        else setError(data.message || 'Could not load your contract details.');
      } catch (err) {
        setError('Network error while loading your contract details.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="cp-loading-screen">Loading contract details...</div>;

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Contract Details</h1>
          <p>Your joining paperwork and where each document stands.</p>
        </div>
      </div>

      {error && <div className="cp-alert cp-alert-error">{error}</div>}

      {records.length === 0 ? (
        <div className="cp-placeholder">
          <Inbox size={28} />
          <h2>No contract records</h2>
          <p>
            Contract paperwork is raised when you are assigned to a vessel.
            Nothing has been issued to you yet.
          </p>
        </div>
      ) : (
        <>
          {records.map((rec) => (
            <div className="cp-card cp-contract-card" key={rec._id}>
              <div className="cp-card-head">
                <h2>
                  <FilePen size={16} />
                  {rec.vacancyId ? 'Vacancy #' + rec.vacancyId : 'Contract Paperwork'}
                </h2>
                <span className={'cp-contract-progress' + (rec.completed === rec.total ? ' cp-contract-progress-done' : '')}>
                  {rec.completed} of {rec.total} complete
                </span>
              </div>

              {formatDate(rec.date) && (
                <p className="cp-muted cp-contract-date">Raised {formatDate(rec.date)}</p>
              )}

              <ul className="cp-checklist">
                {rec.items.map((item) => (
                  <li key={item.key} className={item.done ? 'cp-checklist-done' : ''}>
                    <span className="cp-checklist-mark">
                      {item.done ? <Check size={13} /> : <Clock size={13} />}
                    </span>
                    <span className="cp-checklist-label">{item.label}</span>
                    <span className="cp-checklist-state">{item.done ? 'Completed' : 'Pending'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p className="cp-table-note">
            <Info size={13} /> These records are maintained by the company. If something looks wrong, raise it under Need Help.
          </p>
        </>
      )}
    </>
  );
}
