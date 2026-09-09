// client/src/pages/candidate/CandidateResumePage.jsx
// "View Resume" — the consolidated read-only resume, mirroring the legacy
// viewresume1.php. Sections whose legacy tables aren't migrated yet render
// as clearly-labelled empty states rather than silently disappearing.
import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { FileText, Printer, Pencil } from 'lucide-react';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1901) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Sections that come from tables still to be migrated. Keeping the headings
// visible means the resume reads as a complete document and each one becomes
// live the moment its data lands.
const PENDING_SECTIONS = [
  { title: 'Sea Services', to: '/candidate/sea-services' },
  { title: 'Previous Employer Details', to: '/candidate/previous-employers' },
  { title: 'Education Details', to: '/candidate/qualification' },
  { title: 'Certificate of Competency', to: '/candidate/coc' },
  { title: 'Offshore Certificate', to: '/candidate/offshore-certificates' },
  { title: 'Other Certificate', to: '/candidate/other-certificates' },
  { title: 'STCW', to: '/candidate/stcw' },
  { title: 'NOK Details', to: '/candidate/nok' },
];

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="cp-resume-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// Renders a section, falling back to an empty-state line when none of its
// rows have a value — otherwise the heading would sit above blank space.
function Section({ title, rows }) {
  const filled = rows.filter((r) => r.value);
  return (
    <section className="cp-resume-section">
      <h3>{title}</h3>
      {filled.length > 0 ? (
        <div className="cp-resume-rows">
          {filled.map((r) => <Row key={r.label} label={r.label} value={r.value} />)}
        </div>
      ) : (
        <p className="cp-resume-empty">Not provided yet.</p>
      )}
    </section>
  );
}

export default function CandidateResumePage() {
  const { candidate } = useOutletContext();

  const fullAddress = [candidate.address, candidate.city, candidate.state, candidate.countryname]
    .filter(Boolean)
    .join(', ');
  const phone = [candidate.countrycode, candidate.phoneno].filter(Boolean).join(' ');
  const vesselTypes = (candidate.vesseltypes || []).join(', ') || candidate.vesseltype;

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>View Resume</h1>
          <p>A read-only summary of everything on your profile.</p>
        </div>
        <div className="cp-page-head-actions">
          <Link to="/candidate/profile" className="lp-btn lp-btn-outline">
            <Pencil size={14} /> Edit Details
          </Link>
          <button type="button" className="lp-btn lp-btn-primary" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <div className="cp-card cp-resume-sheet">
        <div className="cp-resume-title">
          <FileText size={20} />
          <div>
            <h2>{candidate.uname || candidate.emailid}</h2>
            {candidate.rank && <span>{candidate.rank}</span>}
          </div>
        </div>

        <Section
          title="Personal Details"
          rows={[
            { label: 'Name', value: candidate.uname },
            { label: 'Email', value: candidate.emailid },
            { label: 'Phone', value: phone },
            { label: 'Date of Birth', value: formatDate(candidate.dob) },
            { label: 'Address', value: fullAddress },
            { label: 'CV Category', value: candidate.cvcategory },
          ]}
        />

        <Section
          title="Professional Details"
          rows={[
            { label: 'Present Rank', value: candidate.rank },
            { label: 'Applied Rank', value: candidate.applied_rank },
            { label: 'Vessel Types', value: vesselTypes },
            { label: 'Engine Type', value: candidate.engine_type },
            { label: 'COC', value: candidate.coc },
            { label: 'COC Country', value: candidate.coc_country },
          ]}
        />

        <Section
          title="Travel Document Details"
          rows={[
            { label: 'Passport Number', value: candidate.passport_no },
            { label: 'INDOS Number', value: candidate.indosno },
            { label: 'SID Number', value: candidate.sidno },
            { label: 'Aadhar Number', value: candidate.aadharno },
            { label: 'PAN Number', value: candidate.pancardno },
          ]}
        />

        {PENDING_SECTIONS.map((s) => (
          <section className="cp-resume-section" key={s.title}>
            <h3>{s.title}</h3>
            <p className="cp-resume-empty">
              No records yet. <Link to={s.to}>Open {s.title}</Link>
            </p>
          </section>
        ))}
      </div>
    </>
  );
}
