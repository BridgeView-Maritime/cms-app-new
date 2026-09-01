// client/src/components/LandingFooter.jsx
// Shared site footer — see LandingHeader.jsx for why this is extracted.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, LogIn } from 'lucide-react';

const FOOTER_LINKS = [
  { label: 'About Us', href: '#about' },
  { label: 'Career', href: '#contact' },
  { label: 'Terms & Conditions', href: '#footer' },
  { label: 'Contact', href: '#contact' },
];

/**
 * @param {object} props
 * @param {object} props.topbar - content.topbar
 * @param {object} props.footer - content.footer
 * @param {(href: string) => (e?: Event) => void} props.onNavigate
 */
export default function LandingFooter({ topbar, footer, onNavigate }) {
  const navigate = useNavigate();
  const mailto = (subject) => `mailto:${topbar.email}?subject=${encodeURIComponent(subject)}`;

  return (
    <footer id="footer" className="lp-footer">
      <div className="lp-footer-top">
        <div className="lp-footer-brand">
          <div className="lp-brand-icon">
            <Anchor size={20} />
          </div>
          <div>
            <strong>{footer.brandName}</strong>
            <p>{footer.addressText}</p>
            <p>{footer.rpslText}</p>
          </div>
        </div>

        <div className="lp-footer-links">
          <strong>Quick Links</strong>
          {FOOTER_LINKS.map((link) => (
            <a key={link.label} href={`/${link.href}`} onClick={onNavigate(link.href)}>{link.label}</a>
          ))}
        </div>

        <div className="lp-footer-links">
          <strong>Reach Us</strong>
          <a href={`tel:${topbar.phone1.replace(/\s+/g, '')}`}>{topbar.phone1}</a>
          <a href={`tel:${topbar.phone2.replace(/\s+/g, '')}`}>{topbar.phone2}</a>
          <a href={mailto('General Enquiry')}>{topbar.email}</a>
        </div>

        <div className="lp-footer-links">
          <strong>Staff Access</strong>
          <button type="button" className="lp-footer-admin-btn" onClick={() => navigate('/admin-login')}>
            <LogIn size={14} />
            Admin Login
          </button>
        </div>
      </div>

      <div className="lp-footer-bottom">
        <span>{footer.copyright}</span>
      </div>
    </footer>
  );
}
