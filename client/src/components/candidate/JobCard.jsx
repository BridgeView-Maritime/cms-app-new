// client/src/components/candidate/JobCard.jsx
// One posting, rendered the same way on the job board, saved jobs and
// applied jobs so a candidate recognises it wherever it appears.
import React from 'react';
import { Building2, MapPin, Ship, CalendarClock, Banknote, Heart, HeartOff, Send, Check } from 'lucide-react';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1902) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function Meta({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="cp-job-meta">
      <Icon size={13} /> {children}
    </span>
  );
}

/**
 * @param {object}   job        normalized posting from the API
 * @param {boolean}  saved      already in the candidate saved list
 * @param {boolean}  applied    already applied for
 * @param {function} onSave     omit to hide the save control
 * @param {function} onApply    omit to hide the apply control
 * @param {node}     footer     extra actions (e.g. "Remove" on saved jobs)
 */
export default function JobCard({ job, saved, applied, onSave, onApply, busy, footer, children }) {
  return (
    <article className="cp-job-card">
      <div className="cp-job-card-head">
        <div>
          <h3>{job.title}</h3>
          <div className="cp-job-metas">
            <Meta icon={Building2}>{job.company}</Meta>
            <Meta icon={MapPin}>{job.area}</Meta>
            <Meta icon={Ship}>{job.vesselType || job.shipType}</Meta>
          </div>
        </div>
        {job.salary && <div className="cp-job-salary"><Banknote size={14} /> {job.salary}</div>}
      </div>

      {job.description && <p className="cp-job-desc">{job.description}</p>}

      <div className="cp-job-tags">
        {job.shipType && job.vesselType && job.shipType !== job.vesselType && (
          <span className="cp-job-tag">{job.shipType}</span>
        )}
        {job.contract && <span className="cp-job-tag">Contract: {job.contract}</span>}
        {job.nationality && <span className="cp-job-tag">{job.nationality}</span>}
      </div>

      {children}

      <div className="cp-job-card-foot">
        <span className="cp-job-posted">
          {formatDate(job.postedOn) && <><CalendarClock size={13} /> Posted {formatDate(job.postedOn)}</>}
        </span>
        <div className="cp-job-actions">
          {footer}
          {onSave && (
            <button
              type="button"
              className={'lp-btn lp-btn-outline cp-job-btn' + (saved ? ' cp-job-btn-on' : '')}
              onClick={() => onSave(job)}
              disabled={busy}
            >
              {saved ? <><HeartOff size={14} /> Unsave</> : <><Heart size={14} /> Save</>}
            </button>
          )}
          {onApply && (
            <button
              type="button"
              className="lp-btn lp-btn-primary cp-job-btn"
              onClick={() => onApply(job)}
              disabled={busy || applied}
            >
              {applied ? <><Check size={14} /> Applied</> : <><Send size={14} /> Apply Now</>}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
