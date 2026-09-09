// client/src/components/CandidatePortalLayout.jsx
// Shell for every logged-in candidate page: site header/footer (shared with
// the public site) plus the candidate sidebar, mirroring the legacy
// candidatesidebar.php menu. Auth gating lives here so each page doesn't
// have to repeat it.
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Bell, Heart, ClipboardList, FileUser, User, FileText, Ship,
  MessageSquareWarning, GraduationCap, Users, Building2, ScrollText, FilePen,
  Award, LifeBuoy, Landmark, KeyRound, LogOut, ChevronDown, Menu, X,
} from 'lucide-react';

import '../styles/theme.css';
import '../styles/landing.css';
import '../styles/candidatePortal.css';
import { useCandidateSession } from '../hooks/useCandidateSession';
import { useLandingContent } from '../hooks/useLandingContent';
import { useScrollableRoot } from '../hooks/useScrollableRoot';
import LandingHeader from './LandingHeader';
import LandingFooter from './LandingFooter';

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
      { label: 'Manage Account', to: '/candidate/profile', icon: User },
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
      { label: 'Need Help', to: '/candidate/help', icon: LifeBuoy },
    ],
  },
];

const FOOTER_MENU = [
  { label: 'Change Password', to: '/candidate/change-password', icon: KeyRound },
];

export default function CandidatePortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const content = useLandingContent();
  const { candidate, loading, logout } = useCandidateSession();
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
    </NavLink>
  );

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
          <div className="cp-sidebar-welcome">
            <span>Welcome</span>
            <strong>{candidate.uname || candidate.emailid}</strong>
          </div>

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
          <Outlet context={{ candidate }} />
        </main>
      </div>

      <LandingFooter topbar={content.topbar} footer={content.footer} onNavigate={goTo} />
    </div>
  );
}
