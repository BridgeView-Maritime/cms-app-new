// client/src/pages/candidate/CandidateHelpPage.jsx
// Contact details come from the same admin-editable landing content the
// public site uses, so they only ever have to be updated in one place.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, LifeBuoy, MessageSquareWarning, FileText, Briefcase } from 'lucide-react';
import { LANDING_ENDPOINTS } from '../../config/api';

const FAQS = [
  {
    q: 'How do I apply for a job?',
    a: 'Open Apply For New Job from the menu, use the search and filters to find a suitable opening, then choose Apply Now. You can also save a job and come back to it later.',
  },
  {
    q: 'Why can I not see a job I applied for earlier?',
    a: 'Once a vacancy is filled it is removed from the job board. Your application stays on your record and is shown under Applied Jobs as a past application.',
  },
  {
    q: 'How do I keep my profile up to date?',
    a: 'Everything under My Resume — qualifications, certificates, sea services, NOK and bank details — can be edited at any time. A complete profile gives you a much better chance of being shortlisted.',
  },
  {
    q: 'Who updates my sea service and contract records?',
    a: 'Those are maintained by our crewing team and are read-only for you. If something is missing or looks wrong, raise it under Grievances and we will look into it.',
  },
  {
    q: 'How long does it take to hear back after applying?',
    a: 'Applications are reviewed by our crewing team on an ongoing basis. If you are shortlisted you will be contacted on the phone number and email registered to your account.',
  },
];

const QUICK_LINKS = [
  { to: '/candidate/grievances', icon: MessageSquareWarning, title: 'Raise a Grievance', desc: 'Report a problem and track our response.' },
  { to: '/candidate/resume', icon: FileText, title: 'View Your Resume', desc: 'Check what our crewing team sees.' },
  { to: '/candidate/jobs', icon: Briefcase, title: 'Apply For New Job', desc: 'Browse the current openings.' },
];

export default function CandidateHelpPage() {
  const [contact, setContact] = useState(null);
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    fetch(LANDING_ENDPOINTS.CONTENT)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data?.contact) setContact(d.data.contact);
      })
      // Non-fatal: the FAQs and quick links are still useful without it.
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Need Help</h1>
          <p>Answers to the usual questions, and how to reach us directly.</p>
        </div>
      </div>

      <div className="cp-help-grid">
        <div className="cp-card cp-help-contact">
          <div className="cp-card-head">
            <h2><LifeBuoy size={16} /> Talk to Us</h2>
          </div>
          <p className="cp-muted">
            Our team is available Monday to Saturday, 9:30am to 6:30pm IST.
          </p>

          <ul className="cp-help-contact-list">
            {contact?.phone1 && (
              <li>
                <Phone size={15} />
                <a href={'tel:' + contact.phone1.replace(/[^+\d]/g, '')}>{contact.phone1}</a>
              </li>
            )}
            {contact?.phone2 && (
              <li>
                <Phone size={15} />
                <a href={'tel:' + contact.phone2.replace(/[^+\d]/g, '')}>{contact.phone2}</a>
              </li>
            )}
            {contact?.email && (
              <li>
                <Mail size={15} />
                <a href={'mailto:' + contact.email}>{contact.email}</a>
              </li>
            )}
            {(contact?.addressLine1 || contact?.addressLine2) && (
              <li>
                <MapPin size={15} />
                <span>
                  {contact.addressLine1}
                  {contact.addressLine2 && <><br />{contact.addressLine2}</>}
                </span>
              </li>
            )}
          </ul>
        </div>

        <div className="cp-help-links">
          {QUICK_LINKS.map(({ to, icon: Icon, title, desc }) => (
            <Link key={to} to={to} className="cp-card cp-help-link">
              <Icon size={18} />
              <div>
                <strong>{title}</strong>
                <span>{desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="cp-section-heading cp-section-heading-spaced">
        <h2>Frequently Asked Questions</h2>
      </div>

      <div className="cp-card cp-faq-list">
        {FAQS.map((item, i) => (
          <div key={item.q} className={'cp-faq' + (openIndex === i ? ' cp-faq-open' : '')}>
            <button
              type="button"
              className="cp-faq-q"
              onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
              aria-expanded={openIndex === i}
            >
              <span>{item.q}</span>
              <span className="cp-faq-toggle" aria-hidden="true">{openIndex === i ? '−' : '+'}</span>
            </button>
            {openIndex === i && <p className="cp-faq-a">{item.a}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
