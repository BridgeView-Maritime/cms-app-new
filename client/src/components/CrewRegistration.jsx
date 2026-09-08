import React, { useState, useEffect } from 'react';
import '../styles/CrewRegistration.css';

export default function CrewRegistration() {
  const [step, setStep] = useState(0);

  // Auth / Role State
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    position: '',
    experience: '',
    bio: ''
  });

  const [token, setToken] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  // Check if current logged-in user is SUPER_ADMIN
  useEffect(() => {
    const userRole = localStorage.getItem('userRole') || localStorage.getItem('role');
    const adminToken = localStorage.getItem('accessToken');
    
    if (userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN' || adminToken) {
      setIsSuperAdmin(true);
    }
  }, []);

  // Password Logic Validation Rules
  const isLengthValid = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isPasswordValid = isLengthValid && hasUppercase && hasLowercase && hasNumber;

  // Check Email Availability
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/crew/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Email already exists.' });
      } else {
        if (isSuperAdmin) {
          // SUPER ADMIN FLOW: Skip OTP step entirely
          setMessage({ type: 'success', text: 'Email available. Set password for the new crew member.' });
          setStep(2); // Jump straight to password creation (OTP field hidden in UI)
        } else {
          // REGULAR USER FLOW: Send OTP
          setMessage({ type: 'success', text: 'OTP has been sent to your email.' });
          setStep(2);
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Register Crew Member
  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!isPasswordValid) {
      setMessage({ type: 'error', text: 'Please satisfy all password criteria.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);

    try {
      // Send dummy OTP if Super Admin to bypass backend requirement if needed
      const payload = {
        email,
        password,
        confirmPassword,
        otp: isSuperAdmin ? 'SUPERADMIN_BYPASS' : otp,
        isSuperAdminCreation: isSuperAdmin
      };

      const res = await fetch('http://localhost:5000/api/crew/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.message });
      } else {
        setToken(data.token);
        if (!isSuperAdmin) {
          localStorage.setItem('crewToken', data.token);
        }
        setProfileData(prev => ({ ...prev, email: data.user.email }));
        setMessage({ type: 'success', text: 'Crew account created! Proceeding to resume upload...' });
        
        setTimeout(() => {
          setStep(3);
          setMessage({ type: '', text: '' });
        }, 1200);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Registration failed. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Parse Resume PDF
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/crew/parse-resume', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok && data.data) {
        setProfileData(prev => ({
          ...prev,
          fullName: data.data.fullName || prev.fullName,
          email: data.data.email || prev.email,
          phone: data.data.phone || prev.phone,
          bio: data.data.bio || prev.bio
        }));
        setMessage({ type: 'success', text: 'Resume parsed and form auto-filled!' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to parse resume.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Upload failed.' });
    } finally {
      setLoading(false);
    }
  };

  // Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/crew/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Crew profile saved successfully!' });
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.message || 'Error saving profile.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setProfileData({
      fullName: '',
      email: email,
      phone: '',
      position: '',
      experience: '',
      bio: ''
    });
    setMessage({ type: 'info', text: 'Form has been reset.' });
  };

  return (
    <div className="crew-container">
      <div className="crew-card">
        <h2>Crew Onboarding Portal</h2>
        
        {isSuperAdmin && (
          <div className="crew-admin-badge">
            ⚡ Admin Mode Active (OTP Verification Bypassed)
          </div>
        )}

        {message.text && (
          <div className={`crew-alert crew-alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* STEP 0: QR CODE SIMULATION */}
        {step === 0 && (
          <div className="qr-container">
            <p>Scan QR Code to access the registration portal on mobile or web:</p>
            <div className="qr-wrapper">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=http://localhost:5173/register" 
                alt="QR Code" 
              />
            </div>
            <button className="crew-btn crew-btn-primary" onClick={() => setStep(1)}>
              Proceed to Web Registration
            </button>
          </div>
        )}

        {/* STEP 1: ENTER EMAIL */}
        {step === 1 && (
          <form onSubmit={handleCheckEmail}>
            <div className="crew-field">
              <label>Crew Email Address</label>
              <input
                type="email"
                required
                className="crew-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="crew@example.com"
              />
            </div>
            <button type="submit" className="crew-btn crew-btn-primary" disabled={loading}>
              {loading ? 'Checking...' : 'Next'}
            </button>
          </form>
        )}

        {/* STEP 2: PASSWORD CREATION (and OTP if standard user) */}
        {step === 2 && (
          <form onSubmit={handleRegister}>
            {/* Show OTP input ONLY if NOT Super Admin */}
            {!isSuperAdmin && (
              <div className="crew-field">
                <label>Email OTP (Check console)</label>
                <input
                  type="text"
                  required
                  maxLength="6"
                  className="crew-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                />
              </div>
            )}

            <div className="crew-field">
              <label>Password</label>
              <input
                type="password"
                required
                className="crew-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <div className="crew-validation-box">
              <p className="validation-title">Password Requirements:</p>
              <div className={isLengthValid ? 'valid' : 'invalid'}>✓ At least 8 characters</div>
              <div className={hasUppercase ? 'valid' : 'invalid'}>✓ At least 1 uppercase letter</div>
              <div className={hasLowercase ? 'valid' : 'invalid'}>✓ At least 1 lowercase letter</div>
              <div className={hasNumber ? 'valid' : 'invalid'}>✓ At least 1 number</div>
            </div>

            <div className="crew-field">
              <label>Confirm Password</label>
              <input
                type="password"
                required
                className="crew-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>

            <button type="submit" className="crew-btn crew-btn-primary" disabled={loading || !isPasswordValid}>
              {loading ? 'Creating Crew...' : 'Create Account & Continue'}
            </button>
          </form>
        )}

        {/* STEP 3: RESUME UPLOAD & AUTO-FILLED FORM */}
        {step === 3 && (
          <div>
            <div className="crew-upload-box">
              <h3>Upload Resume (PDF)</h3>
              <p>Upload to auto-fill the form below</p>
              <input type="file" accept=".pdf" onChange={handleResumeUpload} disabled={loading} />
            </div>

            <form onSubmit={handleSaveProfile} className="crew-profile-form">
              <h3>Crew Profile Form</h3>

              <div className="crew-field">
                <label>Full Name</label>
                <input
                  type="text"
                  className="crew-input"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                />
              </div>

              <div className="crew-field">
                <label>Email</label>
                <input
                  type="email"
                  className="crew-input"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                />
              </div>

              <div className="crew-field">
                <label>Phone Number</label>
                <input
                  type="text"
                  className="crew-input"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </div>

              <div className="crew-field">
                <label>Target Position</label>
                <input
                  type="text"
                  className="crew-input"
                  placeholder="e.g. Deckhand, Chief Engineer"
                  value={profileData.position}
                  onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                />
              </div>

              <div className="crew-field">
                <label>Years of Experience</label>
                <input
                  type="number"
                  className="crew-input"
                  value={profileData.experience}
                  onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                />
              </div>

              <div className="crew-action-buttons">
                <button type="submit" className="crew-btn crew-btn-success" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
                <button type="button" onClick={handleResetForm} className="crew-btn crew-btn-danger">
                  Reset Form
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}