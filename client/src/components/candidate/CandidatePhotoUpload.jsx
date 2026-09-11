// client/src/components/candidate/CandidatePhotoUpload.jsx
import React, { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { ACCOUNT_ENDPOINTS } from '../../config/api';
import CandidateAvatar from './CandidateAvatar';

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

/**
 * @param {object} candidate   from the portal outlet context (carries photoUrl)
 * @param {func}   onChanged   called after upload/remove so the session reloads
 */
export default function CandidatePhotoUpload({ candidate, onChanged, compact = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const upload = async (file) => {
    if (!file) return;
    // Mirrors the server limit so a too-large pick fails before the round trip.
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Please choose an image under 2 MB.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const body = new FormData();
      body.append('photo', file);
      const res = await fetch(ACCOUNT_ENDPOINTS.PHOTO, { method: 'POST', headers: authHeader(), body });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: 'Photo updated.' });
        onChanged?.();
      } else {
        setMsg({ type: 'error', text: data.message || 'Could not upload the photo.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error while uploading.' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    if (!window.confirm('Remove your profile photo?')) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(ACCOUNT_ENDPOINTS.PHOTO, { method: 'DELETE', headers: authHeader() });
      const data = await res.json();
      if (data.success) onChanged?.();
      else setMsg({ type: 'error', text: data.message || 'Could not remove the photo.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={'cp-photo-upload' + (compact ? ' cp-photo-upload-compact' : '')}>
      <CandidateAvatar candidate={candidate} size={compact ? 64 : 96} className="cp-avatar-lg" />
      <div className="cp-photo-upload-body">
        {!compact && (
          <p className="cp-muted">
            A clear, recent head-and-shoulders photo. JPEG or PNG, under 2 MB.
          </p>
        )}
        <div className="cp-photo-upload-actions">
          <button
            type="button"
            className="lp-btn lp-btn-primary cp-job-btn"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Camera size={14} /> {candidate?.photoUrl ? 'Change Photo' : 'Add Photo'}
          </button>
          {candidate?.photoUrl && (
            <button type="button" className="lp-btn lp-btn-outline cp-job-btn" onClick={remove} disabled={busy}>
              <Trash2 size={14} /> Remove
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>
        {msg && <div className={'cp-alert cp-alert-' + msg.type + ' cp-alert-inline'}>{msg.text}</div>}
      </div>
    </div>
  );
}
