// client/src/components/candidate/CandidateGuide.jsx
// A floating "Guide" button on every candidate-facing page. It opens a
// walkthrough of the whole flow - registering, signing in, filling in each
// section, applying for jobs - with the step for the current page marked
// "you are here" and a link from every step to its section.
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen, X, UserPlus, LogIn, LayoutDashboard, User, FileText, Plane,
  ClipboardList, Briefcase, LifeBuoy, ChevronRight, MapPin, CheckCircle2,
} from 'lucide-react';
// Self-contained: the landing page does not pull in the portal stylesheet.
import '../../styles/candidatePortal.css';

// The order a new candidate should work through things in.
const STEPS = [
  {
    key: 'register',
    icon: UserPlus,
    title: 'Create your account',
    to: '/candidate-register',
    linkLabel: 'Go to registration',
    matches: (p) => p.startsWith('/candidate-register') || p === '/',
    summary: 'Registration takes three short steps and a couple of minutes.',
    points: [
      'Enter your name and email, and choose your CV category - Marine, Offshore or Onshore.',
      'We email you a one-time code - enter it to verify the address.',
      'Complete your profile. If you upload your CV (PDF, under 2 MB) we read it and pre-fill as much as we can - check the values before you save.',
      'Choose a password of at least 8 characters. That is your account.',
    ],
  },
  {
    key: 'login',
    icon: LogIn,
    title: 'Sign in',
    to: '/candidate-login',
    linkLabel: 'Go to sign in',
    matches: (p) => p.startsWith('/candidate-login'),
    summary: 'Use the email or username you registered with.',
    points: [
      'Forgotten your password? Use "Forgot password" - we send a code to your email and you set a new one.',
      'Registered on the old shipmanagementjobs.com site? Your account has been carried over - sign in with the same details.',
      'Signed in, the greeting in the top bar takes you back to your dashboard from anywhere.',
    ],
  },
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    title: 'Check your dashboard',
    to: '/candidate',
    linkLabel: 'Go to dashboard',
    matches: (p) => p === '/candidate' || p === '/candidate/',
    summary: 'The dashboard shows how complete your profile is and what is still missing.',
    points: [
      'The ring shows your overall completeness; the tiles underneath list every section, required ones first.',
      'Click any tile to go straight to that section. The sidebar shows the same progress next to each entry.',
      'Our crewing team matches candidates on these details - an incomplete profile is the most common reason a good candidate is passed over.',
    ],
  },
  {
    key: 'personal',
    icon: User,
    title: 'Fill in Personal Information',
    to: '/candidate/profile',
    linkLabel: 'Go to Personal Information',
    matches: (p) => p.startsWith('/candidate/profile'),
    summary: 'Your photo, personal details, experience and availability - all on one page.',
    points: [
      'Add a clear head-and-shoulders photo (JPEG or PNG, under 2 MB).',
      'Personal Details: name, date of birth, phone, INDOS, passport number, address. Your INDOS number links your records, so get it right.',
      'Experience Details: present rank, the rank you are applying for, years in rank and vessel types. Add cooking skills only for catering ranks.',
      'Other Details and Availability: height, weight, languages, and the window in which you are free to join.',
      'Each section has its own Save button - you can fill in what you have now and come back for the rest.',
    ],
  },
  {
    key: 'cv',
    icon: FileText,
    title: 'Upload your CV',
    to: '/candidate/resume',
    linkLabel: 'Go to View Resume',
    matches: (p) => p.startsWith('/candidate/resume'),
    summary: 'Upload a PDF CV, and use View Resume to see your profile the way our crewing team does.',
    points: [
      'PDF only, under 2 MB. Your latest upload is the one we use; earlier ones stay on record.',
      'CVs from the old site are listed too, where the file was carried across.',
    ],
  },
  {
    key: 'documents',
    icon: Plane,
    title: 'Travel documents and vaccination',
    to: '/candidate/travel-documents',
    linkLabel: 'Go to Travel Document Details',
    matches: (p) => p.startsWith('/candidate/travel-documents') || p.startsWith('/candidate/covid-vaccine') || p.startsWith('/candidate/documents'),
    summary: 'Passport, visa and seaman book details, plus your Covid vaccination record.',
    points: [
      'Enter the number, issue date and expiry date for your passport and seaman book (CDC). Add visa details if you hold one.',
      'Expiry dates matter - keep them current, as vacancies are matched against them.',
      'Covid Vaccine Details: vaccine name and dose dates. Several ports and flag states still ask for this.',
      'Candidate Uploaded Documents shows the copies our crewing team holds on file for you, with expiry dates.',
    ],
  },
  {
    key: 'records',
    icon: ClipboardList,
    title: 'Add your records and certificates',
    to: '/candidate/qualification',
    linkLabel: 'Go to Qualification',
    matches: (p) => ['/candidate/qualification', '/candidate/nok', '/candidate/bank-details', '/candidate/stcw', '/candidate/coc',
      '/candidate/offshore-certificates', '/candidate/other-certificates', '/candidate/previous-employers', '/candidate/ppe',
      '/candidate/sea-services', '/candidate/contracts'].some((r) => p.startsWith(r)),
    summary: 'Each of these is a list you can add to, edit and remove from.',
    points: [
      'Qualification: education and pre-sea training. NOK Details: your next of kin. Bank Details: where you are paid.',
      'STCW, Certificate of Competency, Certificate of Offshore and Others Certificate: one entry per certificate, with number, issue and expiry dates.',
      'PPE Details: your sizes for shirts, trousers, shoes and safety kit, so the right kit is ready when you join.',
      'Sea Services and Contract Details are maintained by the company and are read-only for you.',
      'If a section is empty the form is already open - just fill it in and save.',
    ],
  },
  {
    key: 'jobs',
    icon: Briefcase,
    title: 'Apply for jobs',
    to: '/candidate/jobs',
    linkLabel: 'Go to Apply For New Job',
    matches: (p) => p.startsWith('/candidate/jobs') || p.startsWith('/candidate/saved-jobs') || p.startsWith('/candidate/applied-jobs'),
    summary: 'Browse the openings, save the ones you like, and apply with one click.',
    points: [
      'Search by rank, company, vessel or location, and filter by ship type and vessel type.',
      'Save Jobs keeps a shortlist; Applied Jobs shows every application and where it stands.',
      'Status is updated by our crewing team as your application progresses. "Applied" means it has been received and is yet to be reviewed.',
      'If you are shortlisted we contact you on the phone number and email on your profile - another reason to keep them current.',
    ],
  },
  {
    key: 'help',
    icon: LifeBuoy,
    title: 'Need a hand?',
    to: '/candidate/help',
    linkLabel: 'Go to Need Help',
    matches: (p) => p.startsWith('/candidate/help') || p.startsWith('/candidate/grievances') || p.startsWith('/candidate/change-password'),
    summary: 'We are a phone call or an email away.',
    points: [
      'Need Help has our contact details and answers to the usual questions.',
      'Grievances lets you raise a concern with our crewing team and track their response.',
      'Change Password is at the bottom of the sidebar.',
    ],
  },
];

const stepFor = (pathname) => STEPS.find((s) => s.matches(pathname)) || null;

export default function CandidateGuide() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const here = useMemo(() => stepFor(location.pathname), [location.pathname]);
  const [active, setActive] = useState(here?.key || STEPS[0].key);

  // Each time the guide opens it starts on the step for the current page.
  useEffect(() => {
    if (open) setActive(here?.key || STEPS[0].key);
  }, [open, here]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    // The page scrolls #root rather than the window, and useScrollableRoot
    // keeps it scrollable with an inline `overflow-y: auto !important` (to
    // beat the dashboard stylesheet's global `overflow: hidden !important`).
    // The lock must therefore touch exactly that longhand, priority included:
    // writing the `overflow` shorthand would wipe it, and restoring the
    // shorthand's old value ('') would leave the page frozen after closing.
    const root = document.getElementById('root');
    const prevValue = root ? root.style.getPropertyValue('overflow-y') : '';
    const prevPriority = root ? root.style.getPropertyPriority('overflow-y') : '';
    if (root) root.style.setProperty('overflow-y', 'hidden', 'important');
    return () => {
      document.removeEventListener('keydown', onKey);
      if (!root) return;
      if (prevValue) root.style.setProperty('overflow-y', prevValue, prevPriority);
      else root.style.removeProperty('overflow-y');
    };
  }, [open]);

  const current = STEPS.find((s) => s.key === active) || STEPS[0];
  const index = STEPS.indexOf(current);

  return (
    <>
      <button
        type="button"
        className="cp-guide-fab"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="How to register and fill in your profile"
      >
        <BookOpen size={17} />
        <span>Guide</span>
      </button>

      {open && (
        <div className="cp-guide-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="cp-guide-modal" role="dialog" aria-modal="true" aria-labelledby="cp-guide-title">
            <div className="cp-guide-head">
              <div>
                <span className="lp-eyebrow"><BookOpen size={12} /> Candidate Guide</span>
                <h2 id="cp-guide-title">How it works, step by step</h2>
              </div>
              <button type="button" className="cp-icon-btn" onClick={() => setOpen(false)} aria-label="Close guide">
                <X size={16} />
              </button>
            </div>

            <div className="cp-guide-body">
              <ol className="cp-guide-steps">
                {STEPS.map((s, i) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      className={'cp-guide-step' + (s.key === active ? ' cp-guide-step-active' : '')}
                      onClick={() => setActive(s.key)}
                    >
                      <span className="cp-guide-step-num">{i + 1}</span>
                      <span className="cp-guide-step-title">{s.title}</span>
                      {here?.key === s.key && (
                        <span className="cp-guide-here-row"><span className="cp-guide-here"><MapPin size={11} /> You are here</span></span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>

              <div className="cp-guide-content">
                <div className="cp-guide-content-head">
                  <span className="cp-guide-content-icon"><current.icon size={20} /></span>
                  <div>
                    <span className="cp-muted">Step {index + 1} of {STEPS.length}</span>
                    <h3>{current.title}</h3>
                  </div>
                </div>
                <p className="cp-guide-summary">{current.summary}</p>
                <ul className="cp-guide-points">
                  {current.points.map((pt) => (
                    <li key={pt}><CheckCircle2 size={14} /><span>{pt}</span></li>
                  ))}
                </ul>
                <div className="cp-guide-actions">
                  <Link to={current.to} className="lp-btn lp-btn-primary cp-job-btn" onClick={() => setOpen(false)}>
                    {current.linkLabel} <ChevronRight size={14} />
                  </Link>
                  {index < STEPS.length - 1 && (
                    <button type="button" className="lp-btn lp-btn-outline cp-job-btn" onClick={() => setActive(STEPS[index + 1].key)}>
                      Next step
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
