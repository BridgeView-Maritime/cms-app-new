// client/src/components/ChangePasswordModal.jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, KeyRound } from 'lucide-react';
import { AUTH_ENDPOINTS } from '../config/api';
import '../styles/ChangePasswordModal.css';

export default function ChangePasswordModal({ email, onClose }) {
  // 'request' -> user hasn't sent OTP yet | 'confirm' -> OTP + new password form
  const [stage, setStage] = useState('request');
  const [userId, setUserId] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRequestOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(AUTH_ENDPOINTS.FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (response.ok && data.userId) {
        setUserId(data.userId);
        setSuccessMessage(data.message || 'Verification code sent to your email.');
        setStage('confirm');
      } else {
        setError(data.message || 'Failed to send verification code.');
      }
    } catch (err) {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpCode.trim() || otpCode.length !== 6) {
      setError('Enter the 6-digit verification code sent to your email.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(AUTH_ENDPOINTS.RESET_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otpCode, newPassword })
      });
      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Password changed successfully.');
        setStage('done');
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="cp-modal-backdrop" onClick={onClose}>
      <div className="cp-modal-container" onClick={e => e.stopPropagation()}>
        <div className="cp-modal-header">
          <div>
            <span className="cp-modal-subtitle">Account Security</span>
            <h3><KeyRound size={16} style={{ marginRight: 6, verticalAlign: -2 }} />Change Password</h3>
          </div>
          <button className="cp-btn-modal-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="cp-modal-body">
          {error && <div className="cp-alert cp-alert-error">{error}</div>}
          {successMessage && stage !== 'request' && <div className="cp-alert cp-alert-success">{successMessage}</div>}

          {stage === 'request' && (
            <>
              <p className="cp-helper-text">
                We'll send a one-time verification code to <strong>{email || 'your registered email'}</strong> to confirm this change.
              </p>
              <button className="cp-btn-primary" disabled={loading || !email} onClick={handleRequestOtp}>
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </>
          )}

          {stage === 'confirm' && (
            <form onSubmit={handleConfirmReset} className="cp-form">
              <div className="cp-input-row">
                <label className="cp-input-label">Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  className="cp-input"
                  style={{ textAlign: 'center', letterSpacing: '0.3em', fontWeight: 'bold' }}
                  placeholder="6-digit code"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="cp-input-row">
                <label className="cp-input-label">New Password</label>
                <input
                  type="password"
                  className="cp-input"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>

              <div className="cp-input-row">
                <label className="cp-input-label">Confirm New Password</label>
                <input
                  type="password"
                  className="cp-input"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="cp-btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>

              <button
                type="button"
                className="cp-btn-secondary"
                disabled={loading}
                onClick={handleRequestOtp}
              >
                Resend Code
              </button>
            </form>
          )}

          {stage === 'done' && (
            <button className="cp-btn-primary" onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
