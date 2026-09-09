// client/src/pages/candidate/CandidateOverviewPage.jsx
import React, { useState, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  FileText, Upload, Download, CheckCircle2, AlertTriangle, ArrowRight, Archive,
} from 'lucide-react';

import { CANDIDATE_ENDPOINTS, BACKEND_URL } from '../../config/api';
import { useCandidateSession } from '../../hooks/useCandidateSession';

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1901) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const QUICK_LINKS = [
  { label: 'Manage Account', to: '/candidate/profile' },
  { label: 'View Resume', to: '/candidate/resume' },
  { label: 'Apply For New Job', to: '/candidate/jobs' },
];

export default function CandidateOverviewPage() {
  const { candidate } = useOutletContext();
  const { reload } = useCandidateSession();

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
      const res = await fetch(CANDIDATE_ENDPOINTS.RESUME_UPLOAD, {
        method: 'POST', headers: authHeader(), body: formData,
      });
      const data = await res.json();
      if (data.success) reload();
      else setUploadError(data.message || 'Upload failed.');
    } catch (err) {
      setUploadError('Network error while uploading your CV.');
    } finally {
      setUploading(false);
    }
  };

  const resumes = [...(candidate.resumes || [])].sort(
    (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
  );
  const latestResume = resumes[0];
  const olderResumes = resumes.slice(1);
  const legacyResumes = candidate.legacyResumes || [];
  const resumeUrl = (filename) => BACKEND_URL + '/uploads/resumes/' + filename;

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Welcome, {candidate.uname || candidate.emailid}</h1>
          <p>Manage your CV, profile and job applications from here.</p>
        </div>
      </div>

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

      <div className="cp-status-row">
        <div className="cp-status-chip">
          <span>Email</span>
          <strong>{candidate.emailid}</strong>
        </div>
        <div className={'cp-status-chip ' + (candidate.status === 'active' ? 'cp-status-good' : 'cp-status-bad')}>
          <span>Status</span>
          <strong>
            {candidate.status === 'active' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {candidate.status}
          </strong>
        </div>
        {candidate.cvcategory && (
          <div className="cp-status-chip">
            <span>Category</span>
            <strong>{candidate.cvcategory}</strong>
          </div>
        )}
      </div>

      <div className="cp-card">
        <div className="cp-card-head">
          <ArrowRight size={18} />
          <h2>Quick Links</h2>
        </div>
        <div className="cp-quicklinks">
          {QUICK_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="lp-btn lp-btn-outline">
              {l.label} <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
