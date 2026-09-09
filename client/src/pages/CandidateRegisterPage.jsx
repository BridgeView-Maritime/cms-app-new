// client/src/pages/CandidateRegisterPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, FileText, Upload, ShieldCheck, CheckCircle2, AlertTriangle, X,
} from 'lucide-react';

import '../styles/theme.css';
import '../styles/landing.css';
import '../styles/candidatePortal.css';
import { CANDIDATE_ENDPOINTS } from '../config/api';
import { useCandidateSession } from '../hooks/useCandidateSession';
import { useLandingContent } from '../hooks/useLandingContent';
import { useScrollableRoot } from '../hooks/useScrollableRoot';
import {
  CV_CATEGORIES, COC_OPTIONS, RANK_OPTIONS, VESSEL_TYPE_OPTIONS, MAX_VESSEL_TYPES,
} from '../config/registrationOptions';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';

const STEPS = ['Your Details', 'Verify Email', 'Complete Profile'];

const emptyProfile = {
  password: '', repassword: '',
  indosno: '', dob: '', passport_no: '',
  coc_country: '', coc: '',
  rank: '', applied_rank: '',
  vesseltypes: [],
  countryname: '', state: '', city: '', address: '',
  countrycode: '+91', phoneno: '',
  aadharno: '', pancardno: '', sidno: '',
};

export default function CandidateRegisterPage() {
  const navigate = useNavigate();
  const content = useLandingContent();
  const { candidate, loading, login: sessionLogin } = useCandidateSession();
  useScrollableRoot();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [mode, setMode] = useState('manual'); // 'manual' | 'resume'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cvCategory, setCvCategory] = useState('');
  const [resumeExtract, setResumeExtract] = useState(null); // { fields, fieldsFound, tempFile, warning }
  const [parsing, setParsing] = useState(false);
  const resumeInputRef = useRef(null);

  // Step 2
  const [otp, setOtp] = useState('');
  const [regToken, setRegToken] = useState('');

  // Step 3
  const [profile, setProfile] = useState(emptyProfile);
  const [countries, setCountries] = useState([]);
  const [replacingResume, setReplacingResume] = useState(false);

  useEffect(() => {
    if (!loading && candidate) {
      navigate('/candidate', { replace: true });
    }
  }, [loading, candidate, navigate]);

  useEffect(() => {
    if (step !== 3) return;
    fetch(CANDIDATE_ENDPOINTS.COUNTRIES)
      .then((r) => r.json())
      .then((d) => { if (d.success) setCountries(d.countries); })
      .catch(() => {});
  }, [step]);

  const goTo = useCallback((href) => (e) => {
    if (e) e.preventDefault();
    navigate(`/${href}`);
  }, [navigate]);

  // ---------------- STEP 1 ----------------
  const handleResumeSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File must be under 2 MB.');
      return;
    }

    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await fetch(CANDIDATE_ENDPOINTS.REGISTER_PARSE_RESUME, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setResumeExtract(data);
        if (data.fields?.fullName) setFullName(data.fields.fullName);
        if (data.fields?.email) setEmail(data.fields.email);
      } else {
        setError(data.message || 'Could not process this file.');
      }
    } catch (err) {
      setError('Network error while processing your resume.');
    } finally {
      setParsing(false);
    }
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !cvCategory) {
      setError('Please fill in your name, email and CV category.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(CANDIDATE_ENDPOINTS.REGISTER_START, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), cvCategory }),
      });
      const data = await res.json();
      if (data.success) {
        setStep(2);
      } else {
        setError(data.message || 'Could not start registration.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- STEP 2 ----------------
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(CANDIDATE_ENDPOINTS.REGISTER_VERIFY_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setRegToken(data.regToken);
        // Carry resume-parsed values forward as a starting point for step 3.
        if (resumeExtract?.fields) {
          setProfile((prev) => ({
            ...prev,
            indosno: resumeExtract.fields.indosno || prev.indosno,
            passport_no: resumeExtract.fields.passport_no || prev.passport_no,
            dob: resumeExtract.fields.dob || prev.dob,
            phoneno: resumeExtract.fields.phoneno || prev.phoneno,
            address: resumeExtract.fields.address || prev.address,
          }));
        }
        setStep(3);
      } else {
        setError(data.message || 'Verification failed.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    try {
      const res = await fetch(CANDIDATE_ENDPOINTS.REGISTER_START, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), cvCategory }),
      });
      const data = await res.json();
      setError(data.success ? '' : (data.message || 'Could not resend code.'));
    } catch (err) {
      setError('Network error while resending the code.');
    }
  };

  // ---------------- STEP 3 ----------------
  const setField = (key, value) => setProfile((prev) => ({ ...prev, [key]: value }));

  const toggleVesselType = (type) => {
    setProfile((prev) => {
      const has = prev.vesseltypes.includes(type);
      if (has) return { ...prev, vesseltypes: prev.vesseltypes.filter((t) => t !== type) };
      if (prev.vesseltypes.length >= MAX_VESSEL_TYPES) return prev;
      return { ...prev, vesseltypes: [...prev.vesseltypes, type] };
    });
  };

  const handleReplaceResumeSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' || file.size > 2 * 1024 * 1024) {
      setError('CV must be a PDF under 2 MB.');
      return;
    }
    setParsing(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await fetch(CANDIDATE_ENDPOINTS.REGISTER_PARSE_RESUME, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setResumeExtract(data);
        setReplacingResume(false);
      } else {
        setError(data.message || 'Could not process this file.');
      }
    } catch (err) {
      setError('Network error while uploading your CV.');
    } finally {
      setParsing(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (profile.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (profile.password !== profile.repassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(CANDIDATE_ENDPOINTS.REGISTER_COMPLETE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${regToken}` },
        body: JSON.stringify({
          ...profile,
          tempResumeFilename: resumeExtract?.tempFile?.filename,
          tempResumeOriginalName: resumeExtract?.tempFile?.originalName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        sessionLogin(data.accessToken, data.candidate);
        navigate('/candidate', { replace: true });
      } else {
        setError(data.message || 'Could not complete registration.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lp-root">
      <LandingHeader topbar={content.topbar} onNavigate={goTo} scrolled candidate={candidate} />

      <section className="cp-auth-hero cp-register-hero">
        <div className="cp-auth-card cp-register-card">
          <div className="cp-auth-head">
            <span className="lp-eyebrow">
              <UserPlus size={14} />
              Candidate Portal
            </span>
            <h1>Create Your Account</h1>
            <p>Register in a few steps to apply for maritime jobs.</p>
          </div>

          <div className="cp-step-tracker">
            {STEPS.map((label, i) => (
              <div key={label} className={`cp-step-dot ${step === i + 1 ? 'cp-step-active' : ''} ${step > i + 1 ? 'cp-step-done' : ''}`}>
                <span>{step > i + 1 ? <CheckCircle2 size={13} /> : i + 1}</span>
                {label}
              </div>
            ))}
          </div>

          {error && <div className="cp-alert cp-alert-error">{error}</div>}

          {/* -------- STEP 1 -------- */}
          {step === 1 && (
            <>
              <div className="cp-tabs">
                <button type="button" className={mode === 'manual' ? 'cp-tab-active' : ''} onClick={() => setMode('manual')}>
                  Register Manually
                </button>
                <button type="button" className={mode === 'resume' ? 'cp-tab-active' : ''} onClick={() => setMode('resume')}>
                  Register with Resume
                </button>
              </div>

              {mode === 'resume' && (
                <div className="cp-resume-dropzone">
                  <input ref={resumeInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleResumeSelected} />
                  <button type="button" className="lp-btn lp-btn-outline" onClick={() => resumeInputRef.current?.click()} disabled={parsing}>
                    <Upload size={15} /> {parsing ? 'Reading your CV...' : 'Choose PDF Resume'}
                  </button>
                  <span className="cp-muted">PDF only, under 2 MB</span>

                  {resumeExtract && (
                    <div className="cp-extract-preview">
                      <FileText size={14} />
                      <span>{resumeExtract.tempFile?.originalName}</span>
                      {resumeExtract.fieldsFound?.length > 0 && (
                        <span className="cp-extract-hint">— auto-filled {resumeExtract.fieldsFound.length} field(s), review below</span>
                      )}
                      {resumeExtract.warning && <span className="cp-extract-hint">{resumeExtract.warning}</span>}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleStep1Submit} className="cp-form">
                <label className="cp-field">
                  <span>Full Name</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                  </div>
                </label>
                <label className="cp-field">
                  <span>Email</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                </label>
                <label className="cp-field">
                  <span>CV Category</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <select value={cvCategory} onChange={(e) => setCvCategory(e.target.value)}>
                      <option value="">-- Select CV Category --</option>
                      {CV_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </label>

                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg cp-submit-btn" disabled={submitting}>
                  {submitting ? 'Sending code...' : 'Submit'}
                </button>
              </form>
            </>
          )}

          {/* -------- STEP 2 -------- */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="cp-form">
              <div className="cp-alert cp-alert-success">
                <ShieldCheck size={16} /> A verification code was sent to {email}
              </div>
              <label className="cp-field">
                <span>Verification Code</span>
                <div className="cp-input-wrap cp-input-plain cp-otp-input">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit code"
                  />
                </div>
              </label>
              <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg cp-submit-btn" disabled={submitting}>
                {submitting ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button type="button" className="lp-btn lp-btn-outline" onClick={handleResendOtp}>
                Resend Code
              </button>
            </form>
          )}

          {/* -------- STEP 3 -------- */}
          {step === 3 && (
            <form onSubmit={handleCompleteRegistration} className="cp-form">
              <div className="cp-alert cp-alert-success">
                <CheckCircle2 size={16} /> OTP Verified
              </div>

              <div className="cp-profile-grid">
                <label className="cp-field">
                  <span>Password</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="password" value={profile.password} onChange={(e) => setField('password', e.target.value)} />
                  </div>
                </label>
                <label className="cp-field">
                  <span>Repeat Password</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="password" value={profile.repassword} onChange={(e) => setField('repassword', e.target.value)} />
                  </div>
                </label>

                <label className="cp-field">
                  <span>INDOS Number</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="text" value={profile.indosno} onChange={(e) => setField('indosno', e.target.value)} />
                  </div>
                </label>
                <label className="cp-field">
                  <span>Date of Birth</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="date" value={profile.dob} onChange={(e) => setField('dob', e.target.value)} />
                  </div>
                </label>

                <label className="cp-field">
                  <span>Passport Number</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="text" value={profile.passport_no} onChange={(e) => setField('passport_no', e.target.value)} />
                  </div>
                </label>
                <label className="cp-field">
                  <span>COC Country</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <select value={profile.coc_country} onChange={(e) => setField('coc_country', e.target.value)}>
                      <option value="">-- Select COC Country --</option>
                      {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </label>

                <label className="cp-field">
                  <span>COC</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <select value={profile.coc} onChange={(e) => setField('coc', e.target.value)}>
                      <option value="">-- Select COC --</option>
                      {COC_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </label>
                <label className="cp-field">
                  <span>Present Rank</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <select value={profile.rank} onChange={(e) => setField('rank', e.target.value)}>
                      <option value="">-- Select Here --</option>
                      {RANK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  {resumeExtract?.fields?.rank && (
                    <span className="cp-extract-hint">Detected in resume: “{resumeExtract.fields.rank}” — pick the closest match above.</span>
                  )}
                </label>

                <label className="cp-field">
                  <span>Applied Rank</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <select value={profile.applied_rank} onChange={(e) => setField('applied_rank', e.target.value)}>
                      <option value="">-- Select Here --</option>
                      {RANK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </label>
                <label className="cp-field">
                  <span>Country</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <select value={profile.countryname} onChange={(e) => setField('countryname', e.target.value)}>
                      <option value="">-- Select Country --</option>
                      {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </label>

                <label className="cp-field">
                  <span>State</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="text" value={profile.state} onChange={(e) => setField('state', e.target.value)} />
                  </div>
                </label>
                <label className="cp-field">
                  <span>City</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="text" value={profile.city} onChange={(e) => setField('city', e.target.value)} />
                  </div>
                </label>

                <label className="cp-field">
                  <span>Country Code</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="text" value={profile.countrycode} onChange={(e) => setField('countrycode', e.target.value)} placeholder="+91" />
                  </div>
                </label>
                <label className="cp-field">
                  <span>Mobile Number</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="text" value={profile.phoneno} onChange={(e) => setField('phoneno', e.target.value)} />
                  </div>
                </label>

                <label className="cp-field">
                  <span>Aadharcard No</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="text" value={profile.aadharno} onChange={(e) => setField('aadharno', e.target.value)} />
                  </div>
                </label>
                <label className="cp-field">
                  <span>Pancard No</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="text" value={profile.pancardno} onChange={(e) => setField('pancardno', e.target.value)} />
                  </div>
                </label>

                <label className="cp-field">
                  <span>SID No</span>
                  <div className="cp-input-wrap cp-input-plain">
                    <input type="text" value={profile.sidno} onChange={(e) => setField('sidno', e.target.value)} />
                  </div>
                </label>
              </div>

              <label className="cp-field">
                <span>Enter Your Address</span>
                <textarea
                  className="cp-textarea"
                  rows={3}
                  value={profile.address}
                  onChange={(e) => setField('address', e.target.value)}
                />
              </label>

              <div className="cp-field">
                <span>Type of vessel sailed on <em>(select up to {MAX_VESSEL_TYPES})</em></span>
                <div className="cp-vessel-grid">
                  {VESSEL_TYPE_OPTIONS.map((t) => {
                    const selected = profile.vesseltypes.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        className={`cp-vessel-chip ${selected ? 'cp-vessel-chip-selected' : ''}`}
                        onClick={() => toggleVesselType(t)}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="cp-field">
                <span>Upload your CV</span>
                {resumeExtract?.tempFile && !replacingResume ? (
                  <div className="cp-resume-highlight cp-resume-attached">
                    <FileText size={16} />
                    <span>{resumeExtract.tempFile.originalName}</span>
                    <button type="button" className="cp-icon-btn-sm" onClick={() => setReplacingResume(true)} aria-label="Replace CV">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="cp-upload-row">
                    <input type="file" accept="application/pdf" style={{ display: 'none' }} id="cp-replace-resume-input" onChange={handleReplaceResumeSelected} />
                    <button type="button" className="lp-btn lp-btn-outline" onClick={() => document.getElementById('cp-replace-resume-input').click()} disabled={parsing}>
                      <Upload size={15} /> {parsing ? 'Uploading...' : 'Choose file'}
                    </button>
                    <span className="cp-muted">PDF format only (Max file size 2 MB)</span>
                  </div>
                )}
              </div>

              <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg cp-submit-btn" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          )}

          {step === 1 && (
            <p className="cp-auth-footnote">
              Have already an account? <a href="/candidate-login" onClick={(e) => { e.preventDefault(); navigate('/candidate-login'); }}>Login Here</a>
            </p>
          )}
        </div>
      </section>

      <LandingFooter topbar={content.topbar} footer={content.footer} onNavigate={goTo} />
    </div>
  );
}
