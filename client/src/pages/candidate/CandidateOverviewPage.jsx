// client/src/pages/candidate/CandidateOverviewPage.jsx
// The dashboard. Its job is to put the gaps in a candidate's profile in
// front of them - every section the crewing team needs filled, with how
// complete it is and a direct link to fix it.
import React, { useState, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  FileText, Upload, Download, CheckCircle2, AlertTriangle, ArrowRight, Archive, Camera,
  User, Briefcase, ClipboardList, CalendarRange, Plane, Syringe, Users, Landmark,
  GraduationCap, ScrollText, Award, Building2, Construction, HardHat, Circle, Sparkles, RefreshCw,
} from 'lucide-react';

import { CANDIDATE_ENDPOINTS, BACKEND_URL } from '../../config/api';
import CandidateAvatar from '../../components/candidate/CandidateAvatar';

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1901) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const SECTION_ICONS = {
  photo: Camera, cv: FileText, personal: User, experience: Briefcase, other: ClipboardList,
  availability: CalendarRange, travel: Plane, covid: Syringe, nok: Users, bank: Landmark,
  qualification: GraduationCap, stcw: ScrollText, coc: Award, employers: Building2,
  crane: Construction, ppe: HardHat,
};

function SectionTile({ s }) {
  const Icon = SECTION_ICONS[s.key] || Circle;
  const state = s.complete ? 'done' : s.required ? 'todo' : 'optional';
  const pct = s.total ? Math.round((s.filled / s.total) * 100) : 0;
  return (
    <Link to={s.to} className={'cp-tile cp-tile-' + state}>
      <span className="cp-tile-icon"><Icon size={18} /></span>
      <span className="cp-tile-body">
        <strong>{s.label}</strong>
        <span className="cp-tile-meta">
          {s.total > 1 ? s.filled + ' of ' + s.total + ' filled' : s.complete ? 'Added' : 'Not added yet'}
        </span>
        {s.total > 1 && (
          <span className="cp-tile-bar"><span style={{ width: pct + '%' }} /></span>
        )}
      </span>
      <span className="cp-tile-state">
        {state === 'done' && <><CheckCircle2 size={14} /> Complete</>}
        {state === 'todo' && <><AlertTriangle size={14} /> Required</>}
        {state === 'optional' && <>Optional</>}
      </span>
    </Link>
  );
}

export default function CandidateOverviewPage() {
  // summary + refreshSummary are owned by the layout, which also uses them
  // to mark the sidebar.
  const { candidate, reload, summary, refreshSummary } = useOutletContext();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.type !== 'application/pdf') { setUploadError('Only PDF files are accepted.'); return; }
    if (file.size > 2 * 1024 * 1024) { setUploadError('File must be under 2 MB.'); return; }

    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await fetch(CANDIDATE_ENDPOINTS.RESUME_UPLOAD, { method: 'POST', headers: authHeader(), body: formData });
      const data = await res.json();
      if (data.success) reload();
      else setUploadError(data.message || 'Upload failed.');
    } catch (err) {
      setUploadError('Network error while uploading your CV.');
    } finally {
      setUploading(false);
    }
  };

  const resumes = [...(candidate.resumes || [])].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const latestResume = resumes[0];
  const olderResumes = resumes.slice(1);
  const legacyResumes = candidate.legacyResumes || [];
  const resumeUrl = (filename) => BACKEND_URL + '/uploads/resumes/' + filename;

  const sections = summary?.sections || [];
  const todo = sections.filter((s) => s.required && !s.complete);
  const optional = sections.filter((s) => !s.required && !s.complete);
  const done = sections.filter((s) => s.complete);
  const overall = summary?.overall ?? 0;
  const state = !summary ? 'loading' : summary.error ? 'failed' : 'ready';
  const travel = summary?.travel || [];

  return (
    <>
      {/* ---- identity strip ---- */}
      <div className="cp-hero">
        <Link to="/candidate/profile#photo" className="cp-hero-avatar" title={candidate.photoUrl ? 'Change photo' : 'Add a photo'}>
          <CandidateAvatar candidate={candidate} size={84} className="cp-avatar-lg" />
          <span className="cp-hero-avatar-badge"><Camera size={12} /></span>
        </Link>
        <div className="cp-hero-text">
          <h1>{candidate.uname || candidate.emailid}</h1>
          <p>
            {candidate.rank ? <span>{candidate.rank}</span> : <span className="cp-muted">Rank not set</span>}
            <span className="cp-hero-sep">·</span>
            <span>{candidate.emailid}</span>
            {candidate.indosno && <><span className="cp-hero-sep">·</span><span>INDOS {candidate.indosno}</span></>}
          </p>
          <div className="cp-hero-chips">
            <span className={'cp-pill ' + (candidate.status === 'active' ? 'cp-pill-good' : 'cp-pill-bad')}>
              {candidate.status === 'active' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {candidate.status}
            </span>
            {candidate.cvcategory && <span className="cp-pill">{candidate.cvcategory}</span>}
            {!candidate.photoUrl && (
              <Link to="/candidate/profile#photo" className="cp-pill cp-pill-warn"><Camera size={12} /> Add your photo</Link>
            )}
          </div>
        </div>
        <div className="cp-hero-progress">
          <div className="cp-ring" style={{ '--pct': state === 'ready' ? overall : 0 }}>
            <strong>{state === 'ready' ? overall + '%' : state === 'failed' ? '?' : '…'}</strong>
          </div>
          <span>Profile complete</span>
        </div>
      </div>

      {/* ---- company-arranged travel ---- */}
      {travel.length > 0 && (
        <div className="cp-travel-strip">
          <Plane size={16} />
          <div>
            <strong>Travel Details</strong>
            {travel.slice(0, 1).map((t) => (
              <span key={t._id}>
                {t.from || '?'} <ArrowRight size={12} /> {t.to || '?'}
                {t.date && <> on {formatDate(t.date)}</>}
                {t.details && <> · {t.details}</>}
              </span>
            ))}
          </div>
          <em>Happy journey!</em>
        </div>
      )}

      {/* ---- what still needs filling ---- */}
      <div className="cp-card cp-complete-card">
        <div className="cp-card-head">
          <Sparkles size={18} />
          <h2>
            {state === 'loading' && 'Checking Your Profile'}
            {state === 'failed' && 'Could Not Check Your Profile'}
            {state === 'ready' && (todo.length ? 'Complete Your Profile' : 'Your Profile is Complete')}
          </h2>
          {state === 'ready' && (
            <span className="cp-card-head-right cp-muted">
              {todo.length ? todo.length + ' required ' + (todo.length === 1 ? 'section' : 'sections') + ' remaining' : 'All required sections filled in'}
            </span>
          )}
        </div>
        <p className="cp-section-blurb cp-muted">
          Our crewing team matches candidates on these details. An incomplete profile is the most common reason a good candidate is passed over.
        </p>

        {state === 'loading' ? (
          <p className="cp-muted">Checking your profile...</p>
        ) : state === 'failed' ? (
          <div className="cp-alert cp-alert-error cp-alert-actions">
            <span>We could not reach the server to check your profile, so nothing here is up to date.</span>
            <button type="button" className="lp-btn lp-btn-outline cp-job-btn" onClick={refreshSummary}>
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        ) : (
          <>
            {todo.length > 0 && (
              <div className="cp-tile-grid">{todo.map((s) => <SectionTile key={s.key} s={s} />)}</div>
            )}
            {optional.length > 0 && (
              <>
                <div className="cp-tile-group-label">Optional - fill in if it applies to you</div>
                <div className="cp-tile-grid">{optional.map((s) => <SectionTile key={s.key} s={s} />)}</div>
              </>
            )}
            {done.length > 0 && (
              <>
                <div className="cp-tile-group-label">Completed</div>
                <div className="cp-tile-grid cp-tile-grid-done">{done.map((s) => <SectionTile key={s.key} s={s} />)}</div>
              </>
            )}
          </>
        )}
      </div>

      {/* ---- CV ---- */}
      <div className="cp-card">
        <div className="cp-card-head">
          <FileText size={18} />
          <h2>Your CV</h2>
        </div>

        {latestResume ? (
          <div className="cp-resume-highlight">
            <div>
              <strong>Latest Uploaded CV</strong>
              <a href={resumeUrl(latestResume.filename)} target="_blank" rel="noreferrer">
                <Download size={14} /> {latestResume.originalName || latestResume.filename}
              </a>
              <span className="cp-muted">{formatDate(latestResume.uploadedAt)}</span>
            </div>
          </div>
        ) : (
          <p className="cp-muted">No CV uploaded yet.</p>
        )}

        {olderResumes.length > 0 && (
          <div className="cp-resume-previous">
            <span className="cp-muted">Previous CVs</span>
            <div className="cp-chip-row">
              {olderResumes.map((r) => (
                <a key={r._id || r.filename} href={resumeUrl(r.filename)} target="_blank" rel="noreferrer" className="lp-chip cp-chip-link">
                  <Download size={12} /> {r.originalName || r.filename}
                </a>
              ))}
            </div>
          </div>
        )}

        {legacyResumes.length > 0 && (
          <div className="cp-resume-previous">
            <span className="cp-muted">From your previous account</span>
            <div className="cp-chip-row">
              {legacyResumes.map((r) =>
                r.available ? (
                  <a key={r.filename} href={BACKEND_URL + r.url} target="_blank" rel="noreferrer" className="lp-chip cp-chip-link">
                    <Download size={12} /> {r.filename}
                  </a>
                ) : (
                  <span key={r.filename} className="lp-chip cp-chip-muted" title="On record, but the file was not carried over from the old site">
                    <Archive size={12} /> {r.filename}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        <div className="cp-upload-row">
          <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileSelected} />
          <button type="button" className="lp-btn lp-btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload CV'}
          </button>
          <span className="cp-muted">PDF format only, less than 2 MB</span>
        </div>
        {uploadError && <div className="cp-alert cp-alert-error">{uploadError}</div>}
      </div>

      <div className="cp-quicklinks cp-quicklinks-bare">
        <Link to="/candidate/jobs" className="lp-btn lp-btn-primary">Apply For New Job <ArrowRight size={14} /></Link>
        <Link to="/candidate/resume" className="lp-btn lp-btn-outline">View Resume <ArrowRight size={14} /></Link>
        <Link to="/candidate/applied-jobs" className="lp-btn lp-btn-outline">Applied Jobs <ArrowRight size={14} /></Link>
      </div>
    </>
  );
}
