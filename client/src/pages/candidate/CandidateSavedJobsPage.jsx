// client/src/pages/candidate/CandidateSavedJobsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Inbox, Trash2, Archive } from 'lucide-react';
import { JOB_ENDPOINTS } from '../../config/api';
import JobCard from '../../components/candidate/JobCard';
import ExpiredJobCard from '../../components/candidate/ExpiredJobCard';

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: 'Bearer ' + localStorage.getItem('candidateToken'),
});

export default function CandidateSavedJobsPage() {
  const [records, setRecords] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [savedRes, activityRes] = await Promise.all([
        fetch(JOB_ENDPOINTS.SAVED, { headers: authHeader() }),
        fetch(JOB_ENDPOINTS.MY_ACTIVITY, { headers: authHeader() }),
      ]);
      const saved = await savedRes.json();
      const activity = await activityRes.json();
      if (saved.success) setRecords(saved.records || []);
      else setMsg({ type: 'error', text: saved.message || 'Could not load your saved jobs.' });
      if (activity.success) setAppliedIds(new Set(activity.appliedJobIds || []));
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error while loading your saved jobs.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (rec) => {
    setBusy(rec._id);
    setMsg(null);
    try {
      const res = await fetch(JOB_ENDPOINTS.SAVED_ITEM(rec._id), { method: 'DELETE', headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.filter((r) => r._id !== rec._id));
        setMsg({ type: 'success', text: 'Removed from saved jobs.' });
      } else {
        setMsg({ type: 'error', text: data.message || 'Could not remove this job.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  const apply = async (job) => {
    setBusy(job.jobid);
    setMsg(null);
    try {
      const res = await fetch(JOB_ENDPOINTS.APPLY(job.jobid), { method: 'POST', headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setAppliedIds((prev) => new Set(prev).add(job.jobid));
        setMsg({ type: 'success', text: 'Application submitted for ' + job.title + '.' });
      } else {
        setMsg({ type: 'error', text: data.message || 'Could not submit your application.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="cp-loading-screen">Loading saved jobs...</div>;

  const live = records.filter((r) => r.jobAvailable);
  const expired = records.filter((r) => !r.jobAvailable);

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Saved Jobs</h1>
          <p>Openings you have bookmarked to come back to.</p>
        </div>
      </div>

      {msg && <div className={'cp-alert cp-alert-' + msg.type}>{msg.text}</div>}

      {records.length === 0 ? (
        <div className="cp-placeholder">
          <Inbox size={28} />
          <h2>No saved jobs</h2>
          <p>Save a job from Apply For New Job and it will appear here.</p>
        </div>
      ) : (
        <>
          <div className="cp-job-list">
            {live.map((rec) => (
              <JobCard
                key={rec._id}
                job={rec.job}
                applied={appliedIds.has(rec.jobid)}
                busy={busy === rec._id || busy === rec.jobid}
                onApply={apply}
                footer={
                  <button
                    type="button"
                    className="lp-btn lp-btn-outline cp-job-btn"
                    onClick={() => remove(rec)}
                    disabled={busy === rec._id}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                }
              />
            ))}
          </div>

          {/* Postings purged from the board are kept visible so the list
              matches what the candidate actually saved. */}
          {expired.length > 0 && (
            <>
              <div className="cp-section-heading cp-section-heading-spaced">
                <Archive size={17} />
                <h2>No Longer Listed ({expired.length})</h2>
              </div>
              <div className="cp-job-list">
                {expired.map((rec) => (
                  <ExpiredJobCard
                    key={rec._id}
                    jobid={rec.jobid}
                    date={rec.date}
                    dateLabel="Saved"
                    onRemove={() => remove(rec)}
                    busy={busy === rec._id}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
