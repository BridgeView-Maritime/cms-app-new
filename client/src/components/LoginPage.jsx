import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_ENDPOINTS } from '../config/api';

import '../styles/theme.css';
import '../styles/login.css';
import '../styles/Dashboard.css';

export default function LoginPage() {
  const navigate = useNavigate();

  // Application operational views workflow context pipeline
  // Stages managed: 'credentials' | 'otp' | 'forgot' | 'forgot_otp' | 'reset_password'
  const [authStage, setAuthStage] = useState('credentials'); 
  const [userId, setUserId] = useState(null);

  // Transaction Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [apiSuccessMessage, setApiSuccessMessage] = useState('');
  const [errors, setErrors] = useState({ user: '', pass: '', otp: '', email: '', newPass: '', confirmPass: '', server: '' });


  // Safety Route Guard Check Matrix
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && window.location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Field Level Validation Utilities
  const handleValidateCredentials = useCallback(() => {
    const nextErr = { user: '', pass: '', otp: '', email: '', newPass: '', confirmPass: '', server: '' };
    if (!username.trim()) nextErr.user = "Username is required";
    if (!password.trim()) nextErr.pass = "Password is required";
    setErrors(nextErr);
    return !nextErr.user && !nextErr.pass;
  }, [username, password]);

  const handleValidateOtp = useCallback(() => {
    const nextErr = { user: '', pass: '', otp: '', email: '', newPass: '', confirmPass: '', server: '' };
    if (!otpCode.trim()) nextErr.otp = "Verification token code is required";
    setErrors(nextErr);
    return !nextErr.otp;
  }, [otpCode]);

  const handleValidateForgotEmail = useCallback(() => {
    const nextErr = { user: '', pass: '', otp: '', email: '', newPass: '', confirmPass: '', server: '' };
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) nextErr.email = "Valid email address is required";
    setErrors(nextErr);
    return !nextErr.email;
  }, [forgotEmail]);

  const handleValidateForgotOtp = useCallback(() => {
    const nextErr = { user: '', pass: '', otp: '', email: '', newPass: '', confirmPass: '', server: '' };
    if (!forgotOtp.trim() || forgotOtp.length !== 6) nextErr.otp = "Valid 6-digit challenge code is required";
    setErrors(nextErr);
    return !nextErr.otp;
  }, [forgotOtp]);

  const handleValidatePasswordReset = useCallback(() => {
    const nextErr = { user: '', pass: '', otp: '', email: '', newPass: '', confirmPass: '', server: '' };
    if (newPassword.length < 8) nextErr.newPass = "Password must be at least 8 characters long";
    if (newPassword !== confirmPassword) nextErr.confirmPass = "Passwords do not match";
    setErrors(nextErr);
    return !nextErr.newPass && !nextErr.confirmPass;
  }, [newPassword, confirmPassword]);

  /**
   * TRANSACTION IMPLEMENTATIONS
   */
  const handleCredentialSubmit = async (e) => {
    e.preventDefault();
    if (!handleValidateCredentials()) return;
    setLoading(true);
    setErrors(p => ({ ...p, server: '' }));

    try {
      const response = await fetch(AUTH_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (response.ok) {
        if (data.stepTwoRequired) {
          setUserId(data.userId);
          setApiSuccessMessage(data.message);
          setAuthStage('otp');
        } else {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          navigate('/dashboard', { replace: true });
        }
      } else {
        setErrors(p => ({ ...p, server: data.message || "Invalid credentials." }));
      }
    } catch (err) {
      setErrors(p => ({ ...p, server: "Cannot connect to authorization core node." }));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!handleValidateOtp()) return;
    setLoading(true);
    setErrors(p => ({ ...p, server: '' }));

    try {
      const response = await fetch(AUTH_ENDPOINTS.VERIFY_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otpCode })
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        navigate('/dashboard', { replace: true });
      } else {
        setErrors(p => ({ ...p, server: data.message || "Token verification failure." }));
      }
    } catch (err) {
      setErrors(p => ({ ...p, server: "MFA Gateway handshaking runtime crash." }));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!handleValidateForgotEmail()) return;
    setLoading(true);
    setErrors(p => ({ ...p, server: '' }));

    try {
      const response = await fetch(AUTH_ENDPOINTS.FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await response.json();

      if (response.ok) {
        setApiSuccessMessage(data.message || "Verification code sent successfully.");
        setAuthStage('forgot_otp');
      } else {
        setErrors(p => ({ ...p, server: data.message || "Failed to initiate password reset." }));
      }
    } catch (err) {
      setErrors(p => ({ ...p, server: "Unable to connect to password recovery engine." }));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOtpSubmit = async (e) => {
    e.preventDefault();
    if (!handleValidateForgotOtp()) return;
    setApiSuccessMessage("Identity verified. Update your account password below.");
    setAuthStage('reset_password');
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!handleValidatePasswordReset()) return;
    setLoading(true);
    setErrors(p => ({ ...p, server: '' }));

    try {
      const response = await fetch(`${AUTH_ENDPOINTS.FORGOT_PASSWORD}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword })
      });
      const data = await response.json();

      if (response.ok) {
        alert("Account password changed successfully! Proceeding to entry frame.");
        setAuthStage('credentials');
        setUsername('');
        setPassword('');
        setForgotOtp('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrors(p => ({ ...p, server: data.message || "Failed to apply secure update attributes." }));
      }
    } catch (err) {
      setErrors(p => ({ ...p, server: "Connection lost with directory verification nodes." }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hud-deck-wrapper">
      
      {/* Hidden Native Google Translate Target Element */}
      <div id="google_translate_element_login" style={{ display: 'none' }}></div>

      {/* BACKGROUND DEEP SEA ANIMATION PIPELINE */}
      <div className="dynamic-ocean-floor">
        <div className="ambient-sonar-wave" />
        <div className="ocean-vessel vessel-carrier">
          <svg viewBox="0 0 120 30" className="vessel-hull-svg">
            <path d="M0,15 L20,5 L95,5 L110,15 L120,15 L115,25 L10,25 Z" fill="currentColor" opacity="0.18"/>
          </svg>
          <div className="vessel-wake" />
        </div>
        <div className="ocean-vessel vessel-tanker">
          <svg viewBox="0 0 100 25" className="vessel-hull-svg">
            <path d="M0,12 L15,3 L80,3 L92,12 L100,12 L92,22 L8,22 Z" fill="currentColor" opacity="0.15"/>
          </svg>
          <div className="vessel-wake" />
        </div>
        <div className="swell-layer layer-top" />
        <div className="swell-layer layer-bottom" />
      </div>

      <div className="hud-glass-card">
        {/* UPPER BRANDING TELEMETRY HEADER */}
        <div className="hud-top-bar">
          <div className="hud-identity">
            <div className="hud-anchor-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22V8m0 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 14a6 6 0 0 1-6-6M12 16a6 6 0 0 0 6-6" />
              </svg>
            </div>
            <div>
              <h1 className="hud-brand-name">Bridgeview Maritime</h1>
              <p className="hud-tagline">Maritime ERP & Crew Management System</p>
            </div>
          </div>

        </div>

        {/* WORKSPACE OPERATIONS RENDERING VIEWPORT */}
        <div className="hud-card-body">
          <div className="hud-form-block">
            <div className="hud-form-headers">
              <h2 className="hud-main-heading">
                {authStage === 'credentials' && "Log-In"}
                {authStage === 'otp' && "Security Clearance"}
                {authStage === 'forgot' && "Account Recovery"}
                {authStage === 'forgot_otp' && "Verification Clearance"}
                {authStage === 'reset_password' && "New Password Engine"}
              </h2>
              <p className="hud-sub-heading">
                {authStage === 'credentials' && "Access your dashboard"}
                {authStage === 'otp' && "Enter verification token"}
                {authStage === 'forgot' && "Request security code to update baseline values"}
                {authStage === 'forgot_otp' && `Input the code dispatched to ${forgotEmail}`}
                {authStage === 'reset_password' && "Create strong password combinations"}
              </p>
            </div>

            {errors.server && (
              <div className="hud-error-hint" style={{ padding: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                {errors.server}
              </div>
            )}

            {apiSuccessMessage && ['otp', 'forgot_otp', 'reset_password'].includes(authStage) && (
              <div className="hud-success-hint" style={{ padding: '8px', color: '#10b981', border: '1px solid #10b981', background: 'rgba(16,185,129,0.1)', borderRadius: '4px', fontSize: '12px', marginBottom: '12px' }}>
                {apiSuccessMessage}
              </div>
            )}

            {/* STAGE 1: SYSTEM LOGIN FORM */}
            {authStage === 'credentials' && (
              <form onSubmit={handleCredentialSubmit} noValidate className="hud-native-form">
                <div className="hud-input-row">
                  <label className="hud-input-label">Username</label>
                  <div className={`hud-input-field-container ${errors.user ? 'hud-faulted' : ''}`}>
                    <input type="text" className="hud-native-input" placeholder="user@bridgeview.com" value={username} onChange={e => setUsername(e.target.value)} />
                  </div>
                  {errors.user && <span className="hud-error-hint">{errors.user}</span>}
                </div>

                <div className="hud-input-row">
                  <label className="hud-input-label">Password</label>
                  <div className={`hud-input-field-container ${errors.pass ? 'hud-faulted' : ''}`}>
                    <input type={showPass ? 'text' : 'password'} className="hud-native-input" placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  {errors.pass && <span className="hud-error-hint">{errors.pass}</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={showPass} onChange={() => setShowPass(!showPass)} style={{ accentColor: '#0077ff' }} />
                    Show Password
                  </label>
                  <button type="button" className="hud-forgot-trigger-btn" onClick={() => { setErrors({}); setApiSuccessMessage(''); setAuthStage('forgot'); }} style={{ background: 'none', border: 'none', color: '#0077ff', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" className="hud-submit-action" disabled={loading}>
                  {loading ? <div className="hud-spinner-element" /> : <span>Submit</span>}
                </button>
              </form>
            )}

            {/* STAGE 2: TWO-FACTOR OTP LOGIN FORM */}
            {authStage === 'otp' && (
              <form onSubmit={handleOtpSubmit} noValidate className="hud-native-form">
                <div className="hud-input-row">
                  <label className="hud-input-label">OTP Token</label>
                  <div className={`hud-input-field-container ${errors.otp ? 'hud-faulted' : ''}`}>
                    <input 
                      type="text" 
                      maxLength={6}
                      className="hud-native-input" 
                      style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '18px', fontWeight: 'bold' }}
                      placeholder="6-Digit Secure Code" 
                      value={otpCode} 
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    />
                  </div>
                  {errors.otp && <span className="hud-error-hint">{errors.otp}</span>}
                </div>

                <button type="submit" className="hud-submit-action" disabled={loading}>
                  {loading ? <div className="hud-spinner-element" /> : <span>Verify OTP Token</span>}
                </button>

                <button 
                  type="button" 
                  className="hud-back-btn" 
                  onClick={() => { setErrors({}); setApiSuccessMessage(''); setAuthStage('credentials'); }}
                  style={{ width: '100%', background: 'transparent', border: '1px solid var(--mac-border)', padding: '10px', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Back to Log-In
                </button>
              </form>
            )}

            {/* STAGE 3: RECOVERY EMAIL DISPATCH FORM */}
            {authStage === 'forgot' && (
              <form onSubmit={handleForgotPasswordSubmit} noValidate className="hud-native-form">
                <div className="hud-input-row">
                  <label className="hud-input-label">Email Address</label>
                  <div className={`hud-input-field-container ${errors.email ? 'hud-faulted' : ''}`}>
                    <input 
                      type="email" 
                      className="hud-native-input" 
                      placeholder="email@bridgeview.com" 
                      value={forgotEmail} 
                      onChange={e => setForgotEmail(e.target.value)} 
                    />
                  </div>
                  {errors.email && <span className="hud-error-hint">{errors.email}</span>}
                </div>

                <button type="submit" className="hud-submit-action" style={{ marginBottom: '12px' }} disabled={loading}>
                  {loading ? <div className="hud-spinner-element" /> : <span>Send Recovery OTP</span>}
                </button>

                <button 
                  type="button" 
                  className="hud-back-btn" 
                  onClick={() => { setErrors({}); setApiSuccessMessage(''); setAuthStage('credentials'); }}
                  style={{ width: '100%', background: 'transparent', border: '1px solid var(--mac-border)', padding: '10px', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Back to Log-In
                </button>
              </form>
            )}

            {/* STAGE 4: RECOVERY OTP VALIDATION FORM */}
            {authStage === 'forgot_otp' && (
              <form onSubmit={handleForgotOtpSubmit} noValidate className="hud-native-form">
                <div className="hud-input-row">
                  <label className="hud-input-label">Reset Verification Code</label>
                  <div className={`hud-input-field-container ${errors.otp ? 'hud-faulted' : ''}`}>
                    <input 
                      type="text" 
                      maxLength={6} 
                      className="hud-native-input" 
                      style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: '16px', fontWeight: 'bold' }} 
                      placeholder="Enter 6-Digit Code" 
                      value={forgotOtp} 
                      onChange={e => setForgotOtp(e.target.value.replace(/\D/g, ''))} 
                    />
                  </div>
                  {errors.otp && <span className="hud-error-hint">{errors.otp}</span>}
                </div>

                <button type="submit" className="hud-submit-action" style={{ marginBottom: '12px' }}>
                  <span>Verify Recovery Code</span>
                </button>

                <button 
                  type="button" 
                  className="hud-back-btn" 
                  onClick={() => { setErrors({}); setAuthStage('forgot'); }}
                  style={{ width: '100%', background: 'transparent', border: '1px solid var(--mac-border)', padding: '10px', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Back
                </button>
              </form>
            )}

            {/* STAGE 5: PASSWORD UPDATE MATRIX */}
            {authStage === 'reset_password' && (
              <form onSubmit={handlePasswordResetSubmit} noValidate className="hud-native-form">
                <div className="hud-input-row">
                  <label className="hud-input-label">Create New Password</label>
                  <div className={`hud-input-field-container ${errors.newPass ? 'hud-faulted' : ''}`}>
                    <input type="password" className="hud-native-input" placeholder="Min. 8 alphanumeric symbols" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  </div>
                  {errors.newPass && <span className="hud-error-hint">{errors.newPass}</span>}
                </div>

                <div className="hud-input-row">
                  <label className="hud-input-label">Confirm New Password</label>
                  <div className={`hud-input-field-container ${errors.confirmPass ? 'hud-faulted' : ''}`}>
                    <input type="password" className="hud-native-input" placeholder="Repeat password configuration" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>
                  {errors.confirmPass && <span className="hud-error-hint">{errors.confirmPass}</span>}
                </div>

                <button type="submit" className="hud-submit-action" disabled={loading}>
                  {loading ? <div className="hud-spinner-element" /> : <span>Update Account Credentials</span>}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="hud-footer-bar">
          <span className="hud-copyright-string">2026 Bridgeview Maritime. All Rights Reserved.</span>
        </div>
      </div>
    </div>
  );
}