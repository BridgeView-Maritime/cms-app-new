// client/src/components/LandingHeader.jsx
// Shared site header/nav — used by the public landing page AND every
// candidate-facing page (login, dashboard) so the chrome is always
// identical, from a single source instead of copy-pasted.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, ChevronDown, LayoutDashboard, LogIn, LogOut, Mail, Menu, Phone, ShieldCheck, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'About Us', href: '#about' },
  {
    label: 'Services',
    href: '#services',
    children: [
      { label: 'Value Added Courses', href: '#services-courses' },
      { label: 'Flag Documentation', href: '#services-flags' },
      { label: 'Visa Services', href: '#services-visa' },
    ],
  },
  { label: 'Products', href: '/products', route: true },
  { label: 'Contact', href: '#contact' },
  { label: 'Need Help', href: '#contact' },
  { label: 'Sitemap', href: '#footer' },
];

/**
 * @param {object} props
 * @param {object} props.topbar - content.topbar from the landing content API
 * @param {(href: string) => (e?: Event) => void} props.onNavigate - handles
 *   both in-page anchors (landing page: smooth-scroll) and cross-page
 *   anchors (other pages: navigate to `/` + hash)
 * @param {boolean} [props.scrolled] - controls the solid/scrolled header
 *   style; pages other than the landing page can just pass `true`
 * @param {{ uname?: string, emailid?: string } | null} [props.candidate] -
 *   when set, shows "Hi, <name>" + Log Out instead of "Candidate Log In"
 * @param {() => void} [props.onCandidateLogout]
 */
export default function LandingHeader({ topbar, onNavigate, scrolled = false, candidate = null, onCandidateLogout }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const mailto = (subject) => `mailto:${topbar.email}?subject=${encodeURIComponent(subject)}`;

  // Most nav links are in-page anchors handled by `onNavigate` (smooth-scroll
  // on the landing page, cross-page navigate('/'+hash) elsewhere). A `route`
  // link is a real standalone page instead, so it bypasses that entirely.
  const goTo = (link) => (e) => {
    setMenuOpen(false);
    setServicesOpen(false);
    if (link.route) {
      e?.preventDefault();
      navigate(link.href);
      return;
    }
    onNavigate(link.href)(e);
  };

  // Signed in, the greeting is the way back into the portal; signing out is
  // its own button rather than something the greeting does by surprise.
  const handleCandidateAction = () => {
    setMenuOpen(false);
    navigate(candidate ? '/candidate' : '/candidate-login');
  };

  const handleCandidateLogout = () => {
    setMenuOpen(false);
    onCandidateLogout?.();
  };

  const handleAdminLogin = () => {
    setMenuOpen(false);
    navigate('/admin-login');
  };

  const candidateLabel = candidate ? `Hi, ${candidate.uname || candidate.emailid}` : 'Candidate Log In';

  const candidateActions = (
    <>
      <button type="button" className="lp-btn lp-btn-ghost" onClick={handleCandidateAction}>
        {candidate ? <LayoutDashboard size={14} /> : <LogIn size={14} />}
        {candidateLabel}
      </button>
      {/* Only offered where the host page can actually end the session, so
          this is never a button that appears to do nothing. */}
      {candidate && onCandidateLogout && (
        <button type="button" className="lp-btn lp-btn-ghost" onClick={handleCandidateLogout}>
          <LogOut size={14} />
          Sign Out
        </button>
      )}
    </>
  );

  return (
    <header className={`lp-header ${scrolled ? 'lp-header-scrolled' : ''}`}>
      <div className="lp-topbar">
        <div className="lp-topbar-inner">
          <div className="lp-topbar-item">
            <Phone size={12} />
            <a href={`tel:${topbar.phone1.replace(/\s+/g, '')}`}>{topbar.phone1}</a>
            <span className="lp-topbar-sep">/</span>
            <a href={`tel:${topbar.phone2.replace(/\s+/g, '')}`}>{topbar.phone2}</a>
          </div>
          <div className="lp-topbar-item">
            <Mail size={12} />
            <a href={mailto('General Enquiry')}>{topbar.email}</a>
          </div>
          <div className="lp-topbar-item lp-topbar-rpsl">
            <ShieldCheck size={12} />
            <span>{topbar.rpslText}</span>
          </div>
        </div>
      </div>

      <div className="lp-nav">
        <a href="/#home" className="lp-brand" onClick={goTo({ href: '#home' })}>
          <span className="lp-brand-icon">
            <Anchor size={20} />
          </span>
          <span className="lp-brand-text">
            <strong>Bridgeview Maritime</strong>
            <small>Ship Management Jobs</small>
          </span>
        </a>

        <nav className="lp-nav-links">
          {NAV_LINKS.map((link) => (
            <div
              key={link.label}
              className={`lp-nav-item ${link.children ? 'lp-has-children' : ''}`}
              onMouseEnter={() => link.children && setServicesOpen(true)}
              onMouseLeave={() => link.children && setServicesOpen(false)}
            >
              <a href={link.route ? link.href : `/${link.href}`} onClick={goTo(link)}>
                {link.label}
                {link.children && <ChevronDown size={14} />}
              </a>
              {link.children && (
                <div className={`lp-dropdown ${servicesOpen ? 'lp-dropdown-open' : ''}`}>
                  {link.children.map((child) => (
                    <a key={child.label} href={`/${child.href}`} onClick={goTo(child)}>
                      {child.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="lp-nav-actions">
          {candidateActions}
          <button type="button" className="lp-btn lp-btn-primary" onClick={handleAdminLogin}>
            <LogIn size={15} />
            Admin Login
          </button>
          <button
            type="button"
            className="lp-menu-toggle"
            aria-label="Toggle navigation menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`lp-mobile-drawer ${menuOpen ? 'lp-mobile-drawer-open' : ''}`}>
        {NAV_LINKS.flatMap((link) =>
          link.children
            ? [link, ...link.children.map((c) => ({ ...c, sub: true }))]
            : [link]
        ).map((link) => (
          <a
            key={link.label + (link.sub ? '-sub' : '')}
            href={link.route ? link.href : `/${link.href}`}
            className={link.sub ? 'lp-mobile-sub-link' : ''}
            onClick={goTo(link)}
          >
            {link.label}
          </a>
        ))}
        <div className="lp-mobile-actions">
          {candidateActions}
          <button type="button" className="lp-btn lp-btn-primary" onClick={handleAdminLogin}>
            <LogIn size={15} />
            Admin Login
          </button>
        </div>
      </div>
    </header>
  );
}
