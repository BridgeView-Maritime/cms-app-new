// client/src/components/CandidatePortalLayout.jsx
// Shell for every logged-in candidate page: site header/footer (shared with
// the public site) plus the candidate sidebar, mirroring the legacy
// candidatesidebar.php menu. Auth gating lives here so each page doesn't
// have to repeat it.
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Bell, Heart, ClipboardList, FileUser, User, FileText, Ship,
  MessageSquareWarning, GraduationCap, Users, Building2, ScrollText, FilePen,
  Award, LifeBuoy, Landmark, KeyRound, LogOut, ChevronDown, Menu, X,
  Plane, Syringe, HardHat, FolderOpen, CheckCircle2,
} from 'lucide-react';

import '../styles/theme.css';
import '../styles/landing.css';
import '../styles/candidatePortal.css';
import { ACCOUNT_ENDPOINTS } from '../config/api';
import { useCandidateSession } from '../hooks/useCandidateSession';
import { useLandingContent } from '../hooks/useLandingContent';
import { useScrollableRoot } from '../hooks/useScrollableRoot';
import LandingHeader from './LandingHeader';
import LandingFooter from './LandingFooter';
import CandidateAvatar from './candidate/CandidateAvatar';

// Mirrors candidatesidebar.php. `group` items collapse, matching the
// legacy "Manage Alert" / "My Resume" accordions.
const MENU = [
  // `end` so this only highlights on /candidate itself — without it every
  // nested route would mark the dashboard as active too.
  { label: 'Dashboard', to: '/candidate', icon: LayoutDashboard, end: true },
  { label: 'Apply For New Job', to: '/candidate/jobs', icon: Briefcase, badge: 'New' },
  {
    label: 'Manage Alert',
    icon: Bell,
    group: 'alerts',
    children: [
      { label: 'Save Jobs', to: '/candidate/saved-jobs', icon: Heart },
      { label: 'Applied Jobs', to: '/candidate/applied-jobs', icon: ClipboardList },
    ],
  },
  {
    label: 'My Resume',
    icon: FileUser,
    group: 'resume',
    children: [
      { label: 'Personal Information', to: '/candidate/profile', icon: User },
      { label: 'View Resume', to: '/candidate/resume', icon: FileText },
      { label: 'Sea Services', to: '/candidate/sea-services', icon: Ship },
      { label: 'Grievances', to: '/candidate/grievances', icon: MessageSquareWarning },
      { label: 'Qualification', to: '/candidate/qualification', icon: GraduationCap },
      { label: 'NOK Details', to: '/candidate/nok', icon: Users },
      { label: 'Previous Employer Details', to: '/candidate/previous-employers', icon: Building2 },
      { label: 'STCW', to: '/candidate/stcw', icon: ScrollText },
      { label: 'Contract Details', to: '/candidate/contracts', icon: FilePen },
      { label: 'Certificate of Competency', to: '/candidate/coc', icon: Award },
      { label: 'Certificate of Offshore', to: '/candidate/offshore-certificates', icon: Award },
      { label: 'Others Certificate', to: '/candidate/other-certificates', icon: Award },
      { label: 'Bank Details', to: '/candidate/bank-details', icon: Landmark },
      // These four are on the live site's sidebar but post-date the code
      // dump, so they were not in candidatesidebar.php.
      { label: 'Travel Document Details', to: '/candidate/travel-documents', icon: Plane },
      { label: 'Covid Vaccine Details', to: '/candidate/covid-vaccine', icon: Syringe },
      { label: 'PPE Details', to: '/candidate/ppe', icon: HardHat },
      { label: 'Candidate Uploaded Documents', to: '/candidate/documents', icon: FolderOpen },
      { label: 'Need Help', to: '/candidate/help', icon: LifeBuoy },
    ],
  },
];

// Circumference of the r=8 sidebar progress ring, for its dash length.
const RING_LEN = 2 * Math.PI * 8;

const FOOTER_MENU = [
  { label: 'Change Password', to: '/candidate/change-password', icon: KeyRound },
];

export default function CandidatePortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const content = useLandingContent();
  const { candidate, loading, logout, reload } = useCandidateSession();
  useScrollableRoot();

  // Keep whichever accordion contains the current route open by default.
  const initialOpen = () => {
    const open = {};
    MENU.forEach((item) => {
      if (item.children?.some((c) => location.pathname.startsWith(c.to))) open[item.group] = true;
    });
    return Object.keys(open).length ? open : { resume: true };
  };
  const [openGroups, setOpenGroups] = useState(initialOpen);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Profile-completeness summary. Owned here so the sidebar can mark each
  // section and the dashboard can show the same numbers. Refetched on every
  // navigation, so saving a section and coming back reflects it at once.
  const [summary, setSummary] = useState(null);
  const refreshSummary = useCallback(async () => {
    const token = localStorage.getItem('candidateToken');
    if (!token) return;
    try {
      const res = await fetch(ACCOUNT_ENDPOINTS.DASHBOARD, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      // A failed check must never read as "nothing left to do".
      setSummary(data.success ? data : { error: true, sections: [], travel: [] });
    } catch (err) {
      setSummary({ error: true, sections: [], travel: [] });
    }
  }, []);

  useEffect(() => {
    if (candidate) refreshSummary();
  }, [candidate, location.pathname, refreshSummary]);

  // Roll the sections up by the page they live on, so a sidebar entry that
  // hosts several sections (Personal Information) shows one combined figure.
  const progressByPath = useMemo(() => {
    const out = {};
    for (const sec of summary?.sections || []) {
      const path = String(sec.to).split('#')[0];
      const cur = out[path] || { filled: 0, total: 0, required: false, complete: true };
      cur.filled += sec.filled;
      cur.total += sec.total;
      cur.required = cur.required || sec.required;
      cur.complete = cur.complete && sec.complete;
      out[path] = cur;
    }
    return out;
  }, [summary]);

  // An explicit Sign Out returns to the public homepage; arriving with no
  // session (e.g. a bookmark) goes to the login page instead. Both look the
  // same to the effect below, so this ref distinguishes them — and keeps
  // this as the single place that navigates, avoiding a race.
  const explicitLogoutRef = useRef(false);

  useEffect(() => {
    if (!loading && !candidate) {
      navigate(explicitLogoutRef.current ? '/' : '/candidate-login', { replace: true });
    }
  }, [loading, candidate, navigate]);

  const goTo = useCallback((href) => (e) => {
    if (e) e.preventDefault();
    navigate('/' + href);
  }, [navigate]);

  const handleLogout = () => {
    explicitLogoutRef.current = true;
    logout();
  };

  const toggleGroup = (group) =>
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  if (loading || !candidate) {
    return (
      <div className="lp-root">
        <div className="cp-loading-screen">Loading your account...</div>
      </div>
    );
  }

  const renderLink = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => 'cp-side-link' + (isActive ? ' cp-side-link-active' : '')}
      onClick={() => setMobileNavOpen(false)}
    >
      <item.icon size={15} />
      <span>{item.label}</span>
      {item.badge && <em className="cp-side-badge">{item.badge}</em>}
      {renderProgress(item.to)}
    </NavLink>
  );

  // A small progress ring for a required section still to be filled (the
  // dashboard ring in miniature); a tick once it is done. Optional sections
  // stay unmarked so they never nag. An SVG ring keeps a transparent centre,
  // so it sits cleanly on the plain, hover and active row backgrounds.
  const renderProgress = (path) => {
    const p = progressByPath[path];
    if (!p) return null;
    if (p.complete) return <i className="cp-side-done" title="Complete"><CheckCircle2 size={13} /></i>;
    if (!p.required) return null;
    const pct = p.total ? Math.round((p.filled / p.total) * 100) : 0;
    const label = pct + '% complete - ' + p.filled + ' of ' + p.total + ' filled';
    return (
      <svg className="cp-side-ring" viewBox="0 0 20 20" width="16" height="16" role="img" aria-label={label}>
        <title>{label}</title>
        <circle className="cp-side-ring-track" cx="10" cy="10" r="8" />
        <circle
          className="cp-side-ring-fill"
          cx="10" cy="10" r="8"
          strokeDasharray={(pct / 100) * RING_LEN + ' ' + RING_LEN}
        />
      </svg>
    );
  };

  return (
    <div className="lp-root">
      <LandingHeader
        topbar={content.topbar}
        onNavigate={goTo}
        scrolled
        candidate={candidate}
        onCandidateLogout={handleLogout}
      />

      <div className="cp-portal">
        <button
          type="button"
          className="cp-portal-nav-toggle"
          onClick={() => setMobileNavOpen((v) => !v)}
        >
          {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
          Menu
        </button>

        <aside className={'cp-sidebar' + (mobileNavOpen ? ' cp-sidebar-open' : '')}>
          <NavLink to="/candidate" end className="cp-sidebar-welcome" onClick={() => setMobileNavOpen(false)}>
            <CandidateAvatar candidate={candidate} size={44} />
            <div className="cp-sidebar-welcome-text">
              <span>Welcome</span>
              <strong>{candidate.uname || candidate.emailid}</strong>
            </div>
          </NavLink>

          <nav className="cp-sidebar-nav">
            {MENU.map((item) =>
              item.children ? (
                <div className="cp-side-group" key={item.label}>
                  <button type="button" className="cp-side-group-head" onClick={() => toggleGroup(item.group)}>
                    <item.icon size={15} />
                    <span>{item.label}</span>
                    <ChevronDown size={14} className={openGroups[item.group] ? 'cp-chev-open' : ''} />
                  </button>
                  {openGroups[item.group] && (
                    <div className="cp-side-group-items">{item.children.map(renderLink)}</div>
                  )}
                </div>
              ) : (
                renderLink(item)
              )
            )}

            <div className="cp-sidebar-divider" />
            {FOOTER_MENU.map(renderLink)}
            <button type="button" className="cp-side-link cp-side-link-danger" onClick={handleLogout}>
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </nav>
        </aside>

        <main className="cp-portal-content">
          {/* reload lets a page refresh the shared candidate (e.g. after a
              photo change) so the sidebar and header update too. */}
          <Outlet context={{ candidate, reload, summary, refreshSummary }} />
        </main>
      </div>

      <LandingFooter topbar={content.topbar} footer={content.footer} onNavigate={goTo} />
    </div>
  );
}
