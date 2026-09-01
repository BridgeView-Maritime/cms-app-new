// client/src/pages/CandidateLoginPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';

import '../styles/theme.css';
import '../styles/landing.css';
import '../styles/candidatePortal.css';
import { CANDIDATE_ENDPOINTS } from '../config/api';
import { useCandidateSession } from '../hooks/useCandidateSession';
import { useLandingContent } from '../hooks/useLandingContent';
import { useScrollableRoot } from '../hooks/useScrollableRoot';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';

const STAGE_COPY = {
  login: { icon: LogIn, eyebrow: 'Candidate Portal', title: 'Welcome Back', sub: 'Log in to manage your profile and upload your CV.' },
  forgot: { icon: KeyRound, eyebrow: 'Account Recovery', title: 'Forgot Password', sub: 'Enter your email and we’ll send you a verification code.' },
  forgot_otp: { icon: ShieldCheck, eyebrow: 'Verify Code', title: 'Enter Verification Code', sub: 'Enter the 6-digit code we sent to your email.' },
  reset_password: { icon: CheckCircle2, eyebrow: 'New Password', title: 'Reset Your Password', sub: 'Choose a new password for your account.' },
};

export default function CandidateLoginPage() {
  const navigate = useNavigate();
  const content = useLandingContent();
  const { candidate, loading, login } = useCandidateSession();
  useScrollableRoot();

  const [stage, setStage] = useState('login'); // 'login' | 'forgot' | 'forgot_otp' | 'reset_password'
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Login stage
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Forgot-password stages
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Already signed in — skip straight to the dashboard.
  useEffect(() => {
    if (!loading && candidate) {
      navigate('/candidate-dashboard', { replace: true });
    }
  }, [loading, candidate, navigate]);

  const goTo = useCallback((href) => (e) => {
    if (e) e.preventDefault();
    navigate(`/${href}`);
  }, [navigate]);

  const goToStage = (next) => {
    setError('');
    setNotice('');
    setStage(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your username/email and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(CANDIDATE_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        login(data.accessToken, data.candidate);
        navigate('/candidate-dashboard', { replace: true });
      } else {
        setError(data.message || 'Invalid username/email or password.');
      }
    } catch (err) {
      setError('Cannot connect to the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(CANDIDATE_ENDPOINTS.FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        goToStage('forgot_otp');
      } else {
        setError(data.message || 'Could not send verification code.');
      }
    } catch (err) {
      setError('Cannot connect to the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    if (forgotOtp.trim().length !== 6) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(CANDIDATE_ENDPOINTS.RESET_PASSWORD_VERIFY_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: forgotOtp.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setResetToken(data.resetToken);
        goToStage('reset_password');
      } else {
        setError(data.message || 'Verification failed.');
      }
    } catch (err) {
      setError('Cannot connect to the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendResetOtp = async () => {
    setError('');
    try {
      const res = await fetch(CANDIDATE_ENDPOINTS.FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      setError(data.success ? '' : (data.message || 'Could not resend code.'));
    } catch (err) {
      setError('Network error while resending the code.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(CANDIDATE_ENDPOINTS.RESET_PASSWORD_COMPLETE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resetToken}` },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setIdentifier(forgotEmail.trim());
        setPassword('');
        setForgotEmail('');
        setForgotOtp('');
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
        setNotice('Password reset successfully. Please log in with your new password.');
        setStage('login');
      } else {
        setError(data.message || 'Could not reset password.');
      }
    } catch (err) {
      setError('Cannot connect to the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const { icon: StageIcon, eyebrow, title, sub } = STAGE_COPY[stage];

  return (
    <div className="lp-root">
      <LandingHeader topbar={content.topbar} onNavigate={goTo} scrolled candidate={candidate} />

      <section className="cp-auth-hero">
        <div className="cp-auth-card">
          <div className="cp-auth-head">
            <span className="lp-eyebrow">
              <StageIcon size={14} />
              {eyebrow}
            </span>
            <h1>{title}</h1>
            <p>{sub}</p>
          </div>

          {notice && <div className="cp-alert cp-alert-success">{notice}</div>}
          {error && <div className="cp-alert cp-alert-error">{error}</div>}

          {/* -------- LOGIN -------- */}
          {stage === 'login' && (
            <>
              <form onSubmit={handleSubmit} className="cp-form" noValidate>
                <label className="cp-field">
                  <span>Username or Email</span>
                  <div className="cp-input-wrap">
                    <Mail size={16} />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="username"
                    />
                  </div>
                </label>

                <label className="cp-field">
                  <div className="cp-field-label-row">
                    <span>Password</span>
                    <button type="button" className="cp-inline-link" onClick={() => goToStage('forgot')}>
                      Forgot Password?
                    </button>
                  </div>
                  <div className="cp-input-wrap">
                    <Lock size={16} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button type="button" className="cp-visibility-toggle" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password visibility">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg cp-submit-btn" disabled={submitting}>
                  {submitting ? 'Signing in...' : 'Log In'}
                </button>
              </form>

              <p className="cp-auth-footnote">
                Not registered yet?{' '}
                <a href="/candidate-register" onClick={(e) => { e.preventDefault(); navigate('/candidate-register'); }}>
                  Create an account
                </a>
              </p>
            </>
          )}

          {/* -------- FORGOT: ENTER EMAIL -------- */}
          {stage === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="cp-form" noValidate>
              <label className="cp-field">
                <span>Email</span>
                <div className="cp-input-wrap">
                  <Mail size={16} />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              </label>

              <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg cp-submit-btn" disabled={submitting}>
                {submitting ? 'Sending code...' : 'Send Verification Code'}
              </button>
              <button type="button" className="lp-btn lp-btn-outline" onClick={() => goToStage('login')}>
                Back to Log In
              </button>
            </form>
          )}

          {/* -------- FORGOT: OTP -------- */}
          {stage === 'forgot_otp' && (
            <form onSubmit={handleVerifyResetOtp} className="cp-form" noValidate>
              <div className="cp-alert cp-alert-success">
                <ShieldCheck size={16} /> A verification code was sent to {forgotEmail}
              </div>
              <label className="cp-field">
                <span>Verification Code</span>
                <div className="cp-input-wrap cp-input-plain cp-otp-input">
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit code"
                  />
                </div>
              </label>
              <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg cp-submit-btn" disabled={submitting}>
                {submitting ? 'Verifying...' : 'Verify Code'}
              </button>
              <button type="button" className="lp-btn lp-btn-outline" onClick={handleResendResetOtp}>
                Resend Code
              </button>
              <button type="button" className="lp-btn lp-btn-ghost" onClick={() => goToStage('forgot')}>
                Back
              </button>
            </form>
          )}

          {/* -------- RESET PASSWORD -------- */}
          {stage === 'reset_password' && (
            <form onSubmit={handleResetPassword} className="cp-form" noValidate>
              <label className="cp-field">
                <span>New Password</span>
                <div className="cp-input-wrap">
                  <Lock size={16} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                </div>
              </label>
              <label className="cp-field">
                <span>Confirm New Password</span>
                <div className="cp-input-wrap">
                  <Lock size={16} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                  />
                </div>
              </label>
              <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg cp-submit-btn" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </section>

      <LandingFooter topbar={content.topbar} footer={content.footer} onNavigate={goTo} />
    </div>
  );
}
