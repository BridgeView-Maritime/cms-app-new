// client/src/components/candidate/ExpiredJobCard.jsx
// A saved or applied record whose posting is no longer on the board. The
// legacy site purged old postings but kept the candidate rows, so the job
// itself cannot be shown - the record still is, rather than vanishing and
// making someone's history look shorter than it was.
import React from 'react';
import { Archive, CalendarClock, Trash2 } from 'lucide-react';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1902) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ExpiredJobCard({ jobid, date, dateLabel = 'Added', status, onRemove, busy }) {
  const when = formatDate(date);
  return (
    <article className="cp-job-card cp-job-card-expired">
      <div className="cp-job-card-head">
        <div>
          <h3>
            <Archive size={15} /> Posting no longer listed
          </h3>
          <div className="cp-job-metas">
            {jobid && <span className="cp-job-meta">Reference #{jobid}</span>}
            {status && <span className="cp-job-meta">{status}</span>}
          </div>
        </div>
      </div>

      <p className="cp-job-desc">
        This vacancy has been closed and removed from the job board. Your record of it is kept here for reference.
      </p>

      <div className="cp-job-card-foot">
        <span className="cp-job-posted">
          {when && <><CalendarClock size={13} /> {dateLabel} {when}</>}
        </span>
        {onRemove && (
          <div className="cp-job-actions">
            <button type="button" className="lp-btn lp-btn-outline cp-job-btn" onClick={onRemove} disabled={busy}>
              <Trash2 size={14} /> Remove
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
