// client/src/pages/candidate/CandidateProfilePage.jsx
// "Manage Account" — the editable registration/profile record.
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { User, Save } from 'lucide-react';

import { CANDIDATE_ENDPOINTS } from '../../config/api';
import { useCandidateSession } from '../../hooks/useCandidateSession';

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

const toFieldValue = (key, type, value) => {
  if (type === 'date') {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  if (type === 'list') return Array.isArray(value) ? value.join(', ') : '';
  return value || '';
};

const toPayloadValue = (type, value) => {
  if (type === 'list') return String(value).split(',').map((v) => v.trim()).filter(Boolean);
  return value;
};

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

export default function CandidateProfilePage() {
  const { candidate } = useOutletContext();
  const { reload } = useCandidateSession();

  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  useEffect(() => {
    if (candidate) {
      setProfile((prev) => prev ?? Object.fromEntries(
        PROFILE_FIELDS.map((f) => [f.key, toFieldValue(f.key, f.type, candidate[f.key])])
      ));
    }
  }, [candidate]);

  const handleFieldChange = (key, value) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

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

  if (!profile) return <div className="cp-loading-screen">Loading profile...</div>;

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Manage Account</h1>
          <p>Your registration details. Keep these current so recruiters can reach you.</p>
        </div>
      </div>

      <div className="cp-card">
        <div className="cp-card-head">
          <User size={18} />
          <h2>Registration Information</h2>
        </div>

        {saveMsg && <div className={'cp-alert cp-alert-' + saveMsg.type}>{saveMsg.text}</div>}

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
    </>
  );
}
