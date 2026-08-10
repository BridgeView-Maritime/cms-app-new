import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_ENDPOINTS, ATTENDANCE_ENDPOINTS } from '../config/api';

import '../styles/theme.css';
import '../styles/login.css';
import '../styles/Dashboard.css';

export default function LoginPage() {
  const navigate = useNavigate();

  // Application operational views workflow context pipeline
  // Stages managed: 'credentials' | 'otp' | 'forgot' | 'forgot_otp' | 'reset_password' | 'attendance'
  const [authStage, setAuthStage] = useState('credentials');
  const [userId, setUserId] = useState(null);

  // Post-login attendance gate state
  const [loggedInUserName, setLoggedInUserName] = useState('');
  const [attendanceType, setAttendanceType] = useState('full');
  const [leaveTime, setLeaveTime] = useState('18:30');
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [nowClock, setNowClock] = useState(new Date());

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

  // Live clock tick for the attendance gate stage
  useEffect(() => {
    if (authStage !== 'attendance') return;
    const timer = setInterval(() => setNowClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, [authStage]);

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
          setLoggedInUserName(data.user?.name || '');
          await proceedToAttendanceGate(data.accessToken);
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
        setLoggedInUserName(data.user?.name || '');
        await proceedToAttendanceGate(data.accessToken);
      } else {
        setErrors(p => ({ ...p, server: data.message || "Token verification failure." }));
      }
    } catch (err) {
      setErrors(p => ({ ...p, server: "MFA Gateway handshaking runtime crash." }));
    } finally {
      setLoading(false);
    }
  };

  // After a fully authenticated login, check whether today's attendance still
  // needs to be marked before letting the user reach the dashboard.
  const proceedToAttendanceGate = async (accessToken) => {
    try {
      const response = await fetch(ATTENDANCE_ENDPOINTS.TODAY, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();

      if (response.ok && !data.skip_attendance && !data.already_marked) {
        setAuthStage('attendance');
        return;
      }
    } catch (err) {
      // Attendance service unreachable — don't hard-lock users out of the app over it.
      console.warn('Attendance status check failed, continuing to dashboard.', err);
    }
    navigate('/dashboard', { replace: true });
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors(p => ({ ...p, server: '' }));

    try {
      const response = await fetch(ATTENDANCE_ENDPOINTS.MARK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          type: attendanceType,
          ...(attendanceType === 'half' && { leave_time: leaveTime })
        })
      });
      const data = await response.json();

      if (response.ok) {
        setAttendanceMarked(true);
      } else {
        setErrors(p => ({ ...p, server: data.message || "Unable to record attendance." }));
      }
    } catch (err) {
      setErrors(p => ({ ...p, server: "Cannot connect to attendance node." }));
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
        setUserId(data.userId);
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
      const response = await fetch(AUTH_ENDPOINTS.RESET_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otpCode: forgotOtp, newPassword })
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
        setUserId(null);
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
                {authStage === 'attendance' && `Hello, ${loggedInUserName || 'there'}`}
              </h2>
              <p className="hud-sub-heading">
                {authStage === 'credentials' && "Access your dashboard"}
                {authStage === 'otp' && "Enter verification token"}
                {authStage === 'forgot' && "Request security code to update baseline values"}
                {authStage === 'forgot_otp' && `Input the code dispatched to ${forgotEmail}`}
                {authStage === 'reset_password' && "Create strong password combinations"}
                {authStage === 'attendance' && "Please mark your attendance before continuing"}
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

            {/* STAGE 6: MANDATORY DAILY ATTENDANCE GATE */}
            {authStage === 'attendance' && (
              <div className="hud-native-form">
                <div style={{ textAlign: 'center', fontSize: '28px', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  {nowClock.toLocaleTimeString()}
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  {nowClock.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>

                {!attendanceMarked ? (
                  <>
                    <div className="hud-input-row">
                      <label className="hud-input-label">Attendance Type</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setAttendanceType('full')}
                          style={{
                            flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                            border: attendanceType === 'full' ? '1px solid #0077ff' : '1px solid var(--mac-border)',
                            background: attendanceType === 'full' ? 'rgba(0,119,255,0.12)' : 'transparent',
                            color: attendanceType === 'full' ? '#0077ff' : 'var(--text-muted)'
                          }}
                        >
                          Full Day
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendanceType('half')}
                          style={{
                            flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                            border: attendanceType === 'half' ? '1px solid #0077ff' : '1px solid var(--mac-border)',
                            background: attendanceType === 'half' ? 'rgba(0,119,255,0.12)' : 'transparent',
                            color: attendanceType === 'half' ? '#0077ff' : 'var(--text-muted)'
                          }}
                        >
                          Half Day
                        </button>
                      </div>
                    </div>

                    {attendanceType === 'half' && (
                      <div className="hud-input-row">
                        <label className="hud-input-label">Select Leave Time</label>
                        <div className="hud-input-field-container">
                          <input
                            type="time"
                            className="hud-native-input"
                            value={leaveTime}
                            onChange={e => setLeaveTime(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <button type="button" className="hud-submit-action" disabled={loading} onClick={handleMarkAttendance}>
                      {loading ? <div className="hud-spinner-element" /> : <span>✔ Mark Attendance In</span>}
                    </button>

                    <button
                      type="button"
                      className="hud-back-btn"
                      style={{ width: '100%', background: 'transparent', border: '1px solid var(--mac-border)', padding: '10px', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', marginTop: '10px' }}
                      title="Coming soon"
                    >
                      ✔ Please Login in WATI
                    </button>
                  </>
                ) : (
                  <>
                    <div className="hud-success-hint" style={{ padding: '10px', color: '#10b981', border: '1px solid #10b981', background: 'rgba(16,185,129,0.1)', borderRadius: '4px', fontSize: '13px', marginBottom: '14px', textAlign: 'center' }}>
                      Attendance marked ({attendanceType === 'full' ? 'Full Day' : `Half Day, leaving ${leaveTime}`})
                    </div>
                    <button type="button" className="hud-submit-action" onClick={() => navigate('/dashboard', { replace: true })}>
                      <span>Continue to Dashboard</span>
                    </button>
                  </>
                )}
              </div>
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