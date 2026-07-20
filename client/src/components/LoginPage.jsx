import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_ENDPOINTS } from '../config/api';

import '../styles/theme.css';
import '../styles/login.css';
import '../styles/Dashboard.css';

const BASE_STATIC_CONTENT = {
  brand: "Bridgeview Maritime",
  tagline: "Maritime ERP & Crew Management System",
  formTitle: "Log-In",
  formSubtitle: "Access your dashboard",
  userLabel: "username",
  userPlaceholder: "user@bridgeview.com",
  passLabel: "Password",
  passPlaceholder: "••••••••••••",
  forgot: "Forgot Password?",
  submit: "Submit",
  submitting: "Please wait...",
  successText: "Login Successfully",
  successSub: "Token verified successfully...",
  copyright: "2026 Bridgeview Maritime. All Rights Reserved.",
  
  otpTitle: "Security Clearance",
  otpSubtitle: "Enter verification token",
  otpLabel: "OTP Token",
  otpPlaceholder: "6-Digit Secure Code",
  errorOtp: "Verification token code is required",

  forgotTitle: "Reset Password",
  forgotSubtitle: "Enter your registered email address to recover your account.",
  emailLabel: "Email Address",
  emailPlaceholder: "email@bridgeview.com",
  errorEmail: "Valid email address is required",
  backToLogin: "Back to Log-In",
  resetSubmit: "Send Recovery OTP"
};

const SHIFTS = ['night', 'afternoon', 'day'];
const LANGUAGES = [
  { code: 'en', label: 'ENG' },
  { code: 'hi', label: 'हिन् (HI)' },
  { code: 'mr', label: 'मरा (MR)' }
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [shiftIndex, setShiftIndex] = useState(2); 
  const [currentLang, setCurrentLang] = useState('en');
  const [localizedContent, setLocalizedContent] = useState(BASE_STATIC_CONTENT);
  const [translating, setTranslating] = useState(false);

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

  // Environment Style Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', SHIFTS[shiftIndex]);
  }, [shiftIndex]);

  // Unified Multi-Language Translation Mapping Logic
  const fetchAiTranslation = async (targetLang) => {
    if (targetLang === 'en') return BASE_STATIC_CONTENT;
    await new Promise(resolve => setTimeout(resolve, 500));

    if (targetLang === 'hi') {
      return {
        ...BASE_STATIC_CONTENT,
        brand: "ब्रिजव्यू मैरीटाइम",
        tagline: "समुद्री ईआरपी और चालक दल प्रबंधन प्रणाली",
        formTitle: "लॉग-इन",
        formSubtitle: "अपने डैशबोर्ड तक पहुंचें",
        userLabel: "यूज़रनेम",
        userPlaceholder: "officer.id@bridgeview.com",
        passLabel: "पासवर्ड",
        passPlaceholder: "••••••••••••",
        forgot: "पासवर्ड भूल गए?",
        submit: "जमा करें",
        submitting: "कृपया प्रतीक्षा करें...",
        successText: "लॉगिन सफलतापूर्वक संपन्न हुआ",
        successSub: "उच्च आवृत्ति वाले बेड़े की टेलीमेट्री को डिक्रिप्ट किया जा रहा है...",
        errorUser: "यूज़रनेम आवश्यक है",
        errorPass: "पासवर्ड आवश्यक है",
        copyright: "2026 ब्रिजव्यू मैरीटाइम। सर्वाधिकार सुरक्षित।"
      };
    }

    if (targetLang === 'mr') {
      return {
        ...BASE_STATIC_CONTENT,
        brand: "ब्रिजव्ह्यू मरीन",
        tagline: "मॅरिटाईम ईआरपी आणि क्रू व्यवस्थापन प्रणाली",
        formTitle: "लॉग-इन",
        formSubtitle: "तुमच्या डॅशबोर्डवर जा",
        userLabel: "वापरकर्तानाव",
        userPlaceholder: "officer.id@bridgeview.com",
        passLabel: "पासवर्ड",
        passPlaceholder: "••••••••••••",
        forgot: "पासवर्ड विसरलात?",
        submit: "सबमिट करा",
        submitting: "कृपया प्रतीक्षा करा...",
        successText: "लॉगिन यशस्वी झाले",
        successSub: "उच्च-वारंवारता फ्लीट टेलिमेट्री डिक्रिप्ट करत आहे...",
        errorUser: "वापरकर्तानाव आवश्यक आहे",
        errorPass: "पासवर्ड आवश्यक आहे",
        copyright: "2026 ब्रिजव्ह्यू मरीन. सर्व हक्क सुरक्षित."
      };
    }
    return BASE_STATIC_CONTENT;
  };

  useEffect(() => {
    let isMounted = true;
    async function translateFields() {
      setTranslating(true);
      try {
        const data = await fetchAiTranslation(currentLang);
        if (isMounted) setLocalizedContent(data);
      } catch (err) {
        console.error("AI Translation connection exception:", err);
      } finally {
        if (isMounted) setTranslating(false);
      }
    }
    translateFields();
    return () => { isMounted = false; };
  }, [currentLang]);

  const handleShiftRotation = () => {
    setShiftIndex((prevIndex) => (prevIndex + 1) % SHIFTS.length);
  };

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
    if (!otpCode.trim()) nextErr.otp = localizedContent.errorOtp;
    setErrors(nextErr);
    return !nextErr.otp;
  }, [otpCode, localizedContent]);

  const handleValidateForgotEmail = useCallback(() => {
    const nextErr = { user: '', pass: '', otp: '', email: '', newPass: '', confirmPass: '', server: '' };
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) nextErr.email = localizedContent.errorEmail;
    setErrors(nextErr);
    return !nextErr.email;
  }, [forgotEmail, localizedContent]);

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
    <div className={`hud-deck-wrapper ${translating ? 'hud-translating-blur' : ''}`}>
      
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
              <h1 className="hud-brand-name">{localizedContent.brand}</h1>
              <p className="hud-tagline">{localizedContent.tagline}</p>
            </div>
          </div>

          <div className="hud-controls-cluster">
            <div className="hud-lang-selector-wrapper">
              <select 
                className="hud-dropdown-native"
                value={currentLang} 
                onChange={(e) => setCurrentLang(e.target.value)}
                disabled={translating || loading}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>

            <button type="button" className="hud-mode-toggle" onClick={handleShiftRotation}>
              <span className="hud-mode-text-label">{SHIFTS[shiftIndex]}</span>
            </button>
          </div>
        </div>

        {/* WORKSPACE OPERATIONS RENDERING VIEWPORT */}
        <div className="hud-card-body">
          <div className="hud-form-block">
            <div className="hud-form-headers">
              <h2 className="hud-main-heading">
                {authStage === 'credentials' && localizedContent.formTitle}
                {authStage === 'otp' && localizedContent.otpTitle}
                {authStage === 'forgot' && "Account Recovery"}
                {authStage === 'forgot_otp' && "Verification Clearance"}
                {authStage === 'reset_password' && "New Password Engine"}
              </h2>
              <p className="hud-sub-heading">
                {authStage === 'credentials' && localizedContent.formSubtitle}
                {authStage === 'otp' && localizedContent.otpSubtitle}
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
                  <label className="hud-input-label">{localizedContent.userLabel}</label>
                  <div className={`hud-input-field-container ${errors.user ? 'hud-faulted' : ''}`}>
                    <input type="text" className="hud-native-input" placeholder={localizedContent.userPlaceholder} value={username} onChange={e => setUsername(e.target.value)} />
                  </div>
                  {errors.user && <span className="hud-error-hint">{errors.user}</span>}
                </div>

                <div className="hud-input-row">
                  <label className="hud-input-label">{localizedContent.passLabel}</label>
                  <div className={`hud-input-field-container ${errors.pass ? 'hud-faulted' : ''}`}>
                    <input type={showPass ? 'text' : 'password'} className="hud-native-input" placeholder={localizedContent.passPlaceholder} value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  {errors.pass && <span className="hud-error-hint">{errors.pass}</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={showPass} onChange={() => setShowPass(!showPass)} style={{ accentColor: '#0077ff' }} />
                    Show Password
                  </label>
                  <button type="button" className="hud-forgot-trigger-btn" onClick={() => { setErrors({}); setApiSuccessMessage(''); setAuthStage('forgot'); }} style={{ background: 'none', border: 'none', color: '#0077ff', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
                    {localizedContent.forgot}
                  </button>
                </div>

                <button type="submit" className="hud-submit-action" disabled={loading || translating}>
                  {loading ? <div className="hud-spinner-element" /> : <span>{localizedContent.submit}</span>}
                </button>
              </form>
            )}

            {/* STAGE 2: TWO-FACTOR OTP LOGIN FORM */}
            {authStage === 'otp' && (
              <form onSubmit={handleOtpSubmit} noValidate className="hud-native-form">
                <div className="hud-input-row">
                  <label className="hud-input-label">{localizedContent.otpLabel}</label>
                  <div className={`hud-input-field-container ${errors.otp ? 'hud-faulted' : ''}`}>
                    <input 
                      type="text" 
                      maxLength={6}
                      className="hud-native-input" 
                      style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '18px', fontWeight: 'bold' }}
                      placeholder={localizedContent.otpPlaceholder} 
                      value={otpCode} 
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    />
                  </div>
                  {errors.otp && <span className="hud-error-hint">{errors.otp}</span>}
                </div>

                <button type="submit" className="hud-submit-action" disabled={loading || translating}>
                  {loading ? <div className="hud-spinner-element" /> : <span>Verify OTP Token</span>}
                </button>
              </form>
            )}

            {/* STAGE 3: RECOVERY EMAIL DISPATCH FORM */}
            {authStage === 'forgot' && (
              <form onSubmit={handleForgotPasswordSubmit} noValidate className="hud-native-form">
                <div className="hud-input-row">
                  <label className="hud-input-label">{localizedContent.emailLabel}</label>
                  <div className={`hud-input-field-container ${errors.email ? 'hud-faulted' : ''}`}>
                    <input 
                      type="email" 
                      className="hud-native-input" 
                      placeholder={localizedContent.emailPlaceholder} 
                      value={forgotEmail} 
                      onChange={e => setForgotEmail(e.target.value)} 
                    />
                  </div>
                  {errors.email && <span className="hud-error-hint">{errors.email}</span>}
                </div>

                <button type="submit" className="hud-submit-action" style={{ marginBottom: '12px' }} disabled={loading || translating}>
                  {loading ? <div className="hud-spinner-element" /> : <span>{localizedContent.resetSubmit}</span>}
                </button>

                <button 
                  type="button" 
                  className="hud-back-btn" 
                  onClick={() => { setErrors({}); setApiSuccessMessage(''); setAuthStage('credentials'); }}
                  style={{ width: '100%', background: 'transparent', border: '1px solid var(--mac-border)', padding: '10px', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}
                >
                  {localizedContent.backToLogin}
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

                <button type="submit" className="hud-submit-action" disabled={loading || translating}>
                  {loading ? <div className="hud-spinner-element" /> : <span>Update Account Credentials</span>}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="hud-footer-bar">
          <span className="hud-copyright-string">{localizedContent.copyright}</span>
        </div>
      </div>
    </div>
  );
}