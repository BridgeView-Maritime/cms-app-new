// client/src/components/LandingPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Anchor, ArrowRight, Award, ClipboardList, Compass,
  Globe, GraduationCap, Mail, MapPin, Package, Phone, Send, ShieldCheck,
  Ship, UserPlus, Users, CircleCheckBig, FileText
} from 'lucide-react';

import '../styles/theme.css';
import '../styles/landing.css';
import { LANDING_ENDPOINTS, JOB_ENDPOINTS } from '../config/api';
import { DEFAULT_LANDING_CONTENT, mergeLandingContent } from '../config/landingContentDefaults';
import { useCandidateSession } from '../hooks/useCandidateSession';
import { useScrollableRoot } from '../hooks/useScrollableRoot';
import LandingHeader from './LandingHeader';
import LandingFooter from './LandingFooter';
import CandidateGuide from './candidate/CandidateGuide';

// Structural icon sets — content (title/desc/labels) is admin-editable,
// but the icon per position stays fixed in code so a content edit can
// never leave a card without a glyph.
const STEP_ICONS = [UserPlus, ClipboardList, Send, Award];
const RANK_ICONS = [Compass, Anchor, Ship];
const BADGE_ICONS = [ShieldCheck, Award, MapPin, Users];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const { candidate, logout: candidateLogout } = useCandidateSession();

  // Admin-editable copy — starts from the shared defaults so the page never
  // flashes empty, then gets overlaid with whatever the API returns.
  const [content, setContent] = useState(DEFAULT_LANDING_CONTENT);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(LANDING_ENDPOINTS.CONTENT);
        const data = await res.json();
        if (!cancelled && data?.success && data.data) {
          setContent(mergeLandingContent(data.data));
        }
      } catch (err) {
        // Offline / API unreachable — the defaults already rendered, so the
        // public page stays fully usable.
        console.warn('Landing content fetch failed, using defaults.', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useScrollableRoot();

  // Cross-page nav (candidate login/dashboard -> here) arrives as `/#about`
  // etc. React Router doesn't auto-scroll to hashes on a client-rendered
  // route, so do it ourselves once the sections exist in the DOM.
  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash;
    const timer = setTimeout(() => {
      document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  const goTo = useCallback((href) => (e) => {
    if (e) e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const mailto = (subject) => `mailto:${content.topbar.email}?subject=${encodeURIComponent(subject)}`;

  // Live figures from the job board: the ranks with the most open positions
  // and the newest postings. Until they arrive (or if the API is unreachable)
  // the admin-entered rank cards render instead, so the section is never blank.
  const [highlights, setHighlights] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch(JOB_ENDPOINTS.HIGHLIGHTS)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d?.success && d.ranks?.length) setHighlights(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Where the hero buttons go depends on whether the visitor is signed in.
  const boardPath = candidate ? '/candidate/jobs' : '/jobs';
  const resumePath = candidate ? '/candidate/resume' : '/candidate-register';
  const jobsLink = (query) => boardPath + (query ? '?' + new URLSearchParams(query).toString() : '');

  const { topbar, hero, process: processContent, ranks, services, about, contact, footer } = content;

  return (
    <div className="lp-root">
      <LandingHeader
        topbar={topbar}
        onNavigate={goTo}
        scrolled={scrolled}
        candidate={candidate}
        onCandidateLogout={candidateLogout}
      />

      {/* ---------------- HERO ---------------- */}
      <section id="home" className="lp-hero">
        <div className="lp-hero-bg">
          <div className="lp-hero-sonar" />
          <div className="lp-hero-vessel lp-vessel-a">
            <svg viewBox="0 0 120 30" className="lp-vessel-svg">
              <path d="M0,15 L20,5 L95,5 L110,15 L120,15 L115,25 L10,25 Z" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
          <div className="lp-hero-vessel lp-vessel-b">
            <svg viewBox="0 0 100 25" className="lp-vessel-svg">
              <path d="M0,12 L15,3 L80,3 L92,12 L100,12 L92,22 L8,22 Z" fill="currentColor" opacity="0.4" />
            </svg>
          </div>
          <div className="lp-hero-grid" />
        </div>

        <div className="lp-hero-content">
          <span className="lp-eyebrow">
            <ShieldCheck size={14} />
            {hero.eyebrow}
          </span>
          <h1>{hero.heading}</h1>
          <p className="lp-hero-sub">{hero.subheading}</p>
          <p className="lp-hero-desc">{hero.description}</p>

          <div className="lp-hero-ctas">
            {/* Register (or, signed in, upload a CV) rather than emailing one. */}
            <Link to={resumePath} className="lp-btn lp-btn-primary lp-btn-lg">
              <Send size={16} />
              {hero.ctaResumeLabel}
            </Link>
            <Link to={boardPath} className="lp-btn lp-btn-secondary lp-btn-lg">
              {hero.ctaApplyLabel}
              <ArrowRight size={16} />
            </Link>
            <a href="#ranks" className="lp-btn lp-btn-outline lp-btn-lg" onClick={goTo('#ranks')}>
              {hero.ctaBrowseLabel}
            </a>
            {/* The board's company filter is what "company wise" means. */}
            <Link to={boardPath + '?focus=company'} className="lp-btn lp-btn-outline lp-btn-lg">
              {hero.ctaCompanyLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- PROCESS ---------------- */}
      <section id="process" className="lp-section">
        <div className="lp-section-head">
          <span className="lp-kicker">{processContent.kicker}</span>
          <h2>{processContent.heading}</h2>
        </div>

        <div className="lp-steps-grid">
          {processContent.steps.map((step, i) => {
            const StepIcon = STEP_ICONS[i % STEP_ICONS.length];
            return (
              <div className="lp-step-card" key={`${step.title}-${i}`}>
                <div className="lp-step-number">{String(i + 1).padStart(2, '0')}</div>
                <div className="lp-step-icon">
                  <StepIcon size={22} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- POPULAR RANKS ---------------- */}
      <section id="ranks" className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <span className="lp-kicker">{ranks.kicker}</span>
          <h2>{ranks.heading}</h2>
        </div>

        {highlights ? (
          <>
            {/* Live: the ranks with the most open positions on the board right
                now. Each card is a shortcut into the board filtered to that rank. */}
            <div className="lp-ranks-grid">
              {highlights.ranks.map((rank, i) => {
                const RankIcon = RANK_ICONS[i % RANK_ICONS.length];
                return (
                  <Link to={jobsLink({ rank: rank.title })} className="lp-rank-card lp-rank-card-live" key={rank.title}>
                    <div className="lp-rank-icon">
                      <RankIcon size={24} />
                    </div>
                    <span className="lp-rank-tag">{rank.tag || 'Open now'}</span>
                    <h3>{rank.title}</h3>
                    <span className="lp-rank-count">
                      <strong>{rank.openings.toLocaleString()}</strong> open {rank.openings === 1 ? 'position' : 'positions'}
                    </span>
                    <span className="lp-rank-link">
                      View openings
                      <ArrowRight size={14} />
                    </span>
                  </Link>
                );
              })}
            </div>

            {highlights.latest.length > 0 && (
              <div className="lp-latest">
                <div className="lp-latest-head">
                  <h3>Latest Openings</h3>
                  <span>{highlights.total.toLocaleString()} positions open across all ranks</span>
                </div>
                <ul className="lp-latest-list">
                  {highlights.latest.map((job) => (
                    <li key={job._id}>
                      <Link to={jobsLink({ rank: job.title })} className="lp-latest-row">
                        <span className="lp-latest-title">{job.title}</span>
                        <span className="lp-latest-meta">
                          {job.company}
                          {job.vesselType && <> · {job.vesselType}</>}
                          {job.area && job.area !== 'Other' && <> · {job.area}</>}
                        </span>
                        <ArrowRight size={14} />
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="lp-latest-foot">
                  <Link to={boardPath} className="lp-btn lp-btn-primary">
                    Browse all openings <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Fallback while the board is loading or unreachable: the
             admin-entered cards, so the section is never empty. */
          <div className="lp-ranks-grid">
            {ranks.items.map((rank, i) => {
              const RankIcon = RANK_ICONS[i % RANK_ICONS.length];
              return (
                <Link to={jobsLink({ rank: rank.title })} className="lp-rank-card lp-rank-card-live" key={`${rank.title}-${i}`}>
                  <div className="lp-rank-icon">
                    <RankIcon size={24} />
                  </div>
                  <span className="lp-rank-tag">{rank.tag}</span>
                  <h3>{rank.title}</h3>
                  <span className="lp-rank-link">
                    View openings
                    <ArrowRight size={14} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- SERVICES ---------------- */}
      <section id="services" className="lp-section">
        <div className="lp-section-head">
          <span className="lp-kicker">{services.kicker}</span>
          <h2>{services.heading}</h2>
        </div>

        <div className="lp-services-grid">
          <div id="services-courses" className="lp-service-card">
            <div className="lp-service-icon">
              <GraduationCap size={22} />
            </div>
            <h3>{services.courses.title}</h3>
            <p>{services.courses.description}</p>
            <a href={mailto(`${services.courses.title} - Enquiry`)}>
              Learn more <ArrowRight size={14} />
            </a>
          </div>

          <div id="services-flags" className="lp-service-card">
            <div className="lp-service-icon">
              <FileText size={22} />
            </div>
            <h3>{services.flags.title}</h3>
            <p>{services.flags.description}</p>
            <div className="lp-chip-row">
              {services.flags.items.map((f) => (
                <span className="lp-chip" key={f}>{f}</span>
              ))}
            </div>
          </div>

          <div id="services-visa" className="lp-service-card">
            <div className="lp-service-icon">
              <Globe size={22} />
            </div>
            <h3>{services.visa.title}</h3>
            <p>{services.visa.description}</p>
            <div className="lp-chip-row">
              {services.visa.items.map((c) => (
                <span className="lp-chip" key={c}>{c}</span>
              ))}
            </div>
          </div>

          <div className="lp-service-card">
            <div className="lp-service-icon">
              <Package size={22} />
            </div>
            <h3>{services.products.title}</h3>
            <p>{services.products.description}</p>
            <a href={mailto(`${services.products.title} - Enquiry`)}>
              Contact us <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- ABOUT ---------------- */}
      <section id="about" className="lp-section lp-section-alt">
        <div className="lp-about-grid">
          <div className="lp-about-copy">
            <span className="lp-kicker">{about.kicker}</span>
            <h2>{about.heading}</h2>
            <p>{about.paragraph}</p>

            <ul className="lp-why-list">
              {about.whyUs.map((item) => (
                <li key={item}>
                  <CircleCheckBig size={16} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lp-about-badges">
            {about.badges.map((badge, i) => {
              const BadgeIcon = BADGE_ICONS[i % BADGE_ICONS.length];
              return (
                <div className="lp-badge-card" key={`${badge.title}-${i}`}>
                  <BadgeIcon size={22} />
                  <div>
                    <strong>{badge.title}</strong>
                    <span>{badge.subtitle}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- CONTACT ---------------- */}
      <section id="contact" className="lp-section">
        <div className="lp-section-head">
          <span className="lp-kicker">{contact.kicker}</span>
          <h2>{contact.heading}</h2>
          <p className="lp-section-sub">{contact.subtitle}</p>
        </div>

        <div className="lp-contact-grid">
          <a className="lp-contact-card" href={`tel:${contact.phone1.replace(/\s+/g, '')}`}>
            <Phone size={20} />
            <strong>Call Us</strong>
            <span>{contact.phone1}</span>
            <span>{contact.phone2}</span>
          </a>
          <a className="lp-contact-card" href={mailto('General Enquiry')}>
            <Mail size={20} />
            <strong>Email Us</strong>
            <span>{contact.email}</span>
          </a>
          <div className="lp-contact-card lp-contact-card-static">
            <MapPin size={20} />
            <strong>Head Office</strong>
            <span>{contact.addressLine1}</span>
            <span>{contact.addressLine2}</span>
          </div>
        </div>
      </section>

      <LandingFooter topbar={topbar} footer={footer} onNavigate={goTo} />
      <CandidateGuide />
    </div>
  );
}
