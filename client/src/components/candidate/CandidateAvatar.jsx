// client/src/components/candidate/CandidateAvatar.jsx
// The candidate's photo, or their initials when there is none - so the
// header and sidebar always show something recognisable.
import React from 'react';
import { BACKEND_URL } from '../../config/api';

export const resolvePhoto = (photoUrl) => (photoUrl ? BACKEND_URL + photoUrl : null);

const initialsOf = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

export default function CandidateAvatar({ candidate, size = 40, className = '' }) {
  const src = resolvePhoto(candidate?.photoUrl);
  const name = candidate?.uname || candidate?.emailid || '';
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) };

  return (
    <span className={'cp-avatar ' + className} style={style} title={name}>
      {src
        ? <img src={src} alt={name} />
        : <span aria-hidden="true">{initialsOf(name)}</span>}
    </span>
  );
}
