// client/src/pages/candidate/CandidateChangePasswordPage.jsx
import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { CANDIDATE_SECTIONS } from '../../config/api';

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: 'Bearer ' + localStorage.getItem('candidateToken'),
});

const BLANK = { currentPassword: '', newPassword: '', confirmPassword: '' };

function PasswordField({ label, name, value, onChange, autoComplete }) {
  const [shown, setShown] = useState(false);
  return (
    <label className="cp-field cp-field-wide">
      <span>{label} *</span>
      <div className="cp-input-wrap cp-input-plain cp-password-wrap">
        <input
          type={shown ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="cp-visibility-toggle"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'}
        >
          {shown ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </label>
  );
}

export default function CandidateChangePasswordPage() {
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);

    // Checked here as well as on the server so the obvious mistakes do not
    // cost a round trip.
    if (!form.currentPassword || !form.newPassword) {
      setMsg({ type: 'error', text: 'Please fill in every field.' });
      return;
    }
    if (form.newPassword.length < 8) {
      setMsg({ type: 'error', text: 'Your new password must be at least 8 characters.' });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setMsg({ type: 'error', text: 'The new passwords do not match.' });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(CANDIDATE_SECTIONS.CHANGE_PASSWORD, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: 'Password changed successfully. Use your new password next time you sign in.' });
        setForm(BLANK);
      } else {
        setMsg({ type: 'error', text: data.message || 'Could not change your password.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Change Password</h1>
          <p>Choose a new password for your account.</p>
        </div>
      </div>

      {msg && <div className={'cp-alert cp-alert-' + msg.type}>{msg.text}</div>}

      <div className="cp-card cp-password-card">
        <div className="cp-card-head">
          <h2><KeyRound size={16} /> Update Your Password</h2>
        </div>

        <form onSubmit={submit} className="cp-crud-form">
          <div className="cp-profile-grid">
            <PasswordField
              label="Current Password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={onChange}
              autoComplete="current-password"
            />
            <PasswordField
              label="New Password"
              name="newPassword"
              value={form.newPassword}
              onChange={onChange}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm New Password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={onChange}
              autoComplete="new-password"
            />
          </div>

          <p className="cp-helper-text">
            <ShieldCheck size={13} /> Use at least 8 characters. A mix of letters, numbers and symbols is strongest.
          </p>

          <div className="cp-crud-form-actions">
            <button type="submit" className="lp-btn lp-btn-primary" disabled={busy}>
              {busy ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
