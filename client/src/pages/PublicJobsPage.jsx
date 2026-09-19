// client/src/pages/PublicJobsPage.jsx
// The job board for visitors who have not signed in - the same board as the
// portal's "Apply For New Job", inside the public site chrome. A signed-in
// candidate who lands here is sent to the portal version, where Save and
// Apply work.
import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import '../styles/theme.css';
import '../styles/landing.css';
import '../styles/candidatePortal.css';
import { useCandidateSession } from '../hooks/useCandidateSession';
import { useLandingContent } from '../hooks/useLandingContent';
import { useScrollableRoot } from '../hooks/useScrollableRoot';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import CandidateGuide from '../components/candidate/CandidateGuide';
import CandidateJobsPage from './candidate/CandidateJobsPage';

export default function PublicJobsPage() {
  const navigate = useNavigate();
  const content = useLandingContent();
  const { candidate, loading, logout: candidateLogout } = useCandidateSession();
  useScrollableRoot();

  useEffect(() => {
    if (!loading && candidate) {
      navigate('/candidate/jobs' + window.location.search, { replace: true });
    }
  }, [loading, candidate, navigate]);

  const goTo = useCallback((href) => (e) => {
    if (e) e.preventDefault();
    navigate('/' + href);
  }, [navigate]);

  return (
    <div className="lp-root">
      <LandingHeader topbar={content.topbar} onNavigate={goTo} scrolled candidate={candidate} onCandidateLogout={candidateLogout} />

      <div className="cp-portal cp-portal-public">
        <main className="cp-portal-content">
          <CandidateJobsPage publicMode />
        </main>
      </div>

      <LandingFooter topbar={content.topbar} footer={content.footer} onNavigate={goTo} />
      <CandidateGuide />
    </div>
  );
}
