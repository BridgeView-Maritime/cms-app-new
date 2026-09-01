// client/src/pages/CandidateDashboardPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Upload, Download, CheckCircle2, AlertTriangle, User, Save, LogOut
} from 'lucide-react';

import '../styles/theme.css';
import '../styles/landing.css';
import '../styles/candidatePortal.css';
import { CANDIDATE_ENDPOINTS, BACKEND_URL } from '../config/api';
import { useCandidateSession } from '../hooks/useCandidateSession';
import { useLandingContent } from '../hooks/useLandingContent';
import { useScrollableRoot } from '../hooks/useScrollableRoot';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';

const PROFILE_FIELDS = [
  { key: 'uname', label: 'Full Name / Username' },
  { key: 'dob', label: 'Date of Birth', type: 'date' },
  { key: 'countrycode', label: 'Country Code', placeholder: '+91' },
  { key: 'phoneno', label: 'Phone Number' },
  { key: 'rank', label: 'Present Rank' },
  { key: 'applied_rank', label: 'Applied Rank' },
  { key: 'vesseltype', label: 'Vessel Type (legacy)' },
  { key: 'vesseltypes', label: 'Vessel Types Sailed On', type: 'list', placeholder: 'Comma separated, e.g. Container, Tanker' },
  { key: 'engine_type', label: 'Engine Type' },
  { key: 'passport_no', label: 'Passport Number' },
  { key: 'indosno', label: 'INDOS Number' },
  { key: 'sidno', label: 'SID Number' },
  { key: 'aadharno', label: 'Aadhar Card Number' },
  { key: 'pancardno', label: 'PAN Card Number' },
  { key: 'coc_country', label: 'COC Country' },
  { key: 'coc', label: 'COC' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'countryname', label: 'Country' },
];

// candidate[key] -> form-field string
const toFieldValue = (key, type, value) => {
  if (type === 'date') {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  if (type === 'list') return Array.isArray(value) ? value.join(', ') : '';
  return value || '';
};

// form-field string -> API payload value
const toPayloadValue = (type, value) => {
  if (type === 'list') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return value;
};

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('candidateToken')}` });

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1901) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CandidateDashboardPage() {
  const navigate = useNavigate();
  const content = useLandingContent();
  const { candidate, loading, logout, reload } = useCandidateSession();
  useScrollableRoot();

  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // An explicit Sign Out should land on the public homepage; arriving here
  // with no session at all (e.g. a bookmarked link) should land on the
  // login page instead. Both cases converge on `candidate` becoming falsy,
  // so this ref is the only thing that tells them apart — and it also
  // keeps this effect as the SINGLE place that navigates on logout, since
  // an extra `navigate()` call from the click handler races this effect
  // (whichever fires second wins) and unpredictably lands on the wrong page.
  const explicitLogoutRef = useRef(false);

  // Gate: no session -> back to login (or home, for an explicit sign-out).
  // Waits for the initial /me check first.
  useEffect(() => {
    if (!loading && !candidate) {
      navigate(explicitLogoutRef.current ? '/' : '/candidate-login', { replace: true });
    }
  }, [loading, candidate, navigate]);

  useEffect(() => {
    if (candidate) {
      setProfile((prev) => prev ?? Object.fromEntries(
        PROFILE_FIELDS.map((f) => [f.key, toFieldValue(f.key, f.type, candidate[f.key])])
      ));
    }
  }, [candidate]);

  const goTo = useCallback((href) => (e) => {
    if (e) e.preventDefault();
    navigate(`/${href}`);
  }, [navigate]);

  const handleLogout = () => {
    explicitLogoutRef.current = true;
    logout();
  };

  const handleFieldChange = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = Object.fromEntries(
        PROFILE_FIELDS.map((f) => [f.key, toPayloadValue(f.type, profile[f.key])])
      );
      const res = await fetch(CANDIDATE_ENDPOINTS.PROFILE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg({ type: 'success', text: 'Profile updated successfully.' });
        reload();
      } else {
        setSaveMsg({ type: 'error', text: data.message || 'Failed to update profile.' });
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Network error while saving your profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are accepted.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File must be under 2 MB.');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await fetch(CANDIDATE_ENDPOINTS.RESUME_UPLOAD, {
        method: 'POST',
        headers: authHeader(),
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        reload();
      } else {
        setUploadError(data.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadError('Network error while uploading your CV.');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !candidate || !profile) {
    return (
      <div className="lp-root">
        <div className="cp-loading-screen">Loading your dashboard...</div>
      </div>
    );
  }

  const resumes = [...(candidate.resumes || [])].sort(
    (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
  );
  const latestResume = resumes[0];
  const olderResumes = resumes.slice(1);
  const resumeUrl = (filename) => `${BACKEND_URL}/uploads/resumes/${filename}`;

  return (
    <div className="lp-root">
      <LandingHeader
        topbar={content.topbar}
        onNavigate={goTo}
        scrolled
        candidate={candidate}
        onCandidateLogout={handleLogout}
      />

      <section className="cp-dashboard">
        <div className="cp-dashboard-head">
          <h1>Welcome, {candidate.uname || candidate.emailid}</h1>
          <button type="button" className="lp-btn lp-btn-outline" onClick={handleLogout}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>

        {/* --- CV / RESUME --- */}
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

          <div className="cp-upload-row">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />
            <button type="button" className="lp-btn lp-btn-primary" onClick={handleUploadClick} disabled={uploading}>
              <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload CV'}
            </button>
            <span className="cp-muted">PDF format only, less than 2 MB</span>
          </div>
          {uploadError && <div className="cp-alert cp-alert-error">{uploadError}</div>}
        </div>

        {/* --- STATUS BADGES --- */}
        <div className="cp-status-row">
          <div className="cp-status-chip">
            <span>Email</span>
            <strong>{candidate.emailid}</strong>
          </div>
          <div className={`cp-status-chip ${candidate.status === 'active' ? 'cp-status-good' : 'cp-status-bad'}`}>
            <span>Status</span>
            <strong>{candidate.status === 'active' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {candidate.status}</strong>
          </div>
          {candidate.cvcategory && (
            <div className="cp-status-chip">
              <span>Category</span>
              <strong>{candidate.cvcategory}</strong>
            </div>
          )}
        </div>

        {/* --- PROFILE FORM --- */}
        <div className="cp-card">
          <div className="cp-card-head">
            <User size={18} />
            <h2>Registration Information</h2>
          </div>

          {saveMsg && <div className={`cp-alert cp-alert-${saveMsg.type}`}>{saveMsg.text}</div>}

          <form onSubmit={handleSaveProfile} className="cp-profile-grid">
            {PROFILE_FIELDS.map((f) => (
              <label key={f.key} className="cp-field">
                <span>{f.label}</span>
                <div className="cp-input-wrap cp-input-plain">
                  <input
                    type={f.type === 'date' ? 'date' : 'text'}
                    value={profile[f.key]}
                    placeholder={f.placeholder || ''}
                    onChange={(e) => handleFieldChange(f.key, e.target.value)}
                  />
                </div>
              </label>
            ))}

            <div className="cp-profile-save-row">
              <button type="submit" className="lp-btn lp-btn-primary" disabled={saving}>
                <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <LandingFooter topbar={content.topbar} footer={content.footer} onNavigate={goTo} />
    </div>
  );
}
