// client/src/pages/candidate/CandidateAppliedJobsPage.jsx
// Read-only: an application cannot be withdrawn from the portal on the
// legacy site, and the status is set by the crewing team.
import React, { useState, useEffect } from 'react';
import { Inbox, Archive, Send, Info } from 'lucide-react';
import { JOB_ENDPOINTS } from '../../config/api';
import JobCard from '../../components/candidate/JobCard';
import ExpiredJobCard from '../../components/candidate/ExpiredJobCard';

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

// Progress comes from the crewing team's vacancy record, not from the
// application row itself. "Applied" simply means nothing has been recorded
// against it yet.
const STATUS_CLASS = {
  'Under Process': 'cp-app-status-progress',
  Selected: 'cp-app-status-good',
  'Selected (Other Vacancy)': 'cp-app-status-good',
  'Not Selected': 'cp-app-status-bad',
  Withdrawn: 'cp-app-status-bad',
  'Vacancy Closed': 'cp-app-status-bad',
};

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1902) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CandidateAppliedJobsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(JOB_ENDPOINTS.APPLIED, { headers: authHeader() });
        const data = await res.json();
        if (data.success) setRecords(data.records || []);
        else setError(data.message || 'Could not load your applications.');
      } catch (err) {
        setError('Network error while loading your applications.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="cp-loading-screen">Loading applications...</div>;

  const live = records.filter((r) => r.jobAvailable);
  const expired = records.filter((r) => !r.jobAvailable);

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Applied Jobs</h1>
          <p>Positions you have applied for and where each one stands.</p>
        </div>
      </div>

      {error && <div className="cp-alert cp-alert-error">{error}</div>}

      {records.length > 0 && (
        <div className="cp-status-row">
          <div className="cp-status-chip">
            <span>Applications</span>
            <strong><Send size={14} /> {records.length}</strong>
          </div>
          <div className="cp-status-chip">
            <span>Currently Listed</span>
            <strong>{live.length}</strong>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="cp-placeholder">
          <Inbox size={28} />
          <h2>No applications yet</h2>
          <p>Head to Apply For New Job to find an opening that suits you.</p>
        </div>
      ) : (
        <>
          <div className="cp-job-list">
            {live.map((rec) => (
              <JobCard key={rec._id} job={rec.job}>
                <div className="cp-app-row">
                  <span className={'cp-app-status ' + (STATUS_CLASS[rec.status] || '')}>
                    {rec.status}
                    {formatDate(rec.statusDate) && ' · ' + formatDate(rec.statusDate)}
                  </span>
                  {formatDate(rec.appliedOn) && <span className="cp-muted">Applied {formatDate(rec.appliedOn)}</span>}
                  {rec.vessel && <span className="cp-muted">Vessel: {rec.vessel}</span>}
                </div>
              </JobCard>
            ))}
          </div>

          {expired.length > 0 && (
            <>
              <div className="cp-section-heading cp-section-heading-spaced">
                <Archive size={17} />
                <h2>Past Applications ({expired.length})</h2>
              </div>
              <div className="cp-job-list">
                {expired.map((rec) => (
                  <ExpiredJobCard
                    key={rec._id}
                    jobid={rec.jobid}
                    date={rec.date}
                    dateLabel="Applied"
                    status={rec.status}
                  />
                ))}
              </div>
            </>
          )}

          <p className="cp-table-note">
            <Info size={13} /> Status is updated by our crewing team as your application progresses. "Applied" means it has been received and is yet to be reviewed.
          </p>
        </>
      )}
    </>
  );
}
