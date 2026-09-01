// client/src/hooks/useCandidateSession.js
// Shared candidate auth state — used by the landing page (to show "Hi, X"
// in the header), the candidate login page (to redirect away if already
// signed in), and the candidate dashboard (to gate access + render data).
import { useState, useEffect, useCallback } from 'react';
import { CANDIDATE_ENDPOINTS } from '../config/api';

const TOKEN_KEY = 'candidateToken';

export function useCandidateSession() {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setCandidate(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(CANDIDATE_ENDPOINTS.ME, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCandidate(data.candidate);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setCandidate(null);
      }
    } catch (err) {
      // Network hiccup — don't force a logout over a transient failure.
      console.warn('Candidate session check failed.', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const login = useCallback((token, candidateData) => {
    localStorage.setItem(TOKEN_KEY, token);
    setCandidate(candidateData);
  }, []);

  const logout = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setCandidate(null);
    if (token) {
      fetch(CANDIDATE_ENDPOINTS.LOGOUT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, []);

  return { candidate, loading, login, logout, reload: loadProfile };
}
