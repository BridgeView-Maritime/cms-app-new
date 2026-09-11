// client/src/pages/candidate/CandidateTravelDocumentsPage.jsx
// Legacy traveldoc_details.php: passport, visa and seaman book details.
import React, { useState, useEffect } from 'react';
import { Plane, Info } from 'lucide-react';
import { ACCOUNT_ENDPOINTS } from '../../config/api';
import ExtendedSectionForm from '../../components/candidate/ExtendedSectionForm';

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

const hasVisa = (d) => Boolean(d?.visa || d?.vidate || d?.vexpdate);

export default function CandidateTravelDocumentsPage() {
  const [sections, setSections] = useState(null);
  const [showVisa, setShowVisa] = useState(false);

  useEffect(() => {
    fetch(ACCOUNT_ENDPOINTS.EXTENDED_PROFILE, { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSections(d.sections);
          setShowVisa(hasVisa(d.sections.travel));
        } else setSections({});
      })
      .catch(() => setSections({}));
  }, []);

  if (!sections) return <div className="cp-loading-screen">Loading travel documents...</div>;

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Travel Document Details</h1>
          <p>Your passport, visa and seaman book. Expiry dates matter - keep them current.</p>
        </div>
      </div>

      <div className="cp-card">
        <div className="cp-card-head">
          <Plane size={18} />
          <h2>Passport, Visa and Seaman Book</h2>
        </div>

        <div className="cp-visa-toggle">
          <span>Do you hold a visa?</span>
          <div className="cp-radio-row">
            <label className={'cp-radio' + (showVisa ? ' cp-radio-on' : '')}>
              <input type="radio" name="hasvisa" checked={showVisa} onChange={() => setShowVisa(true)} /> Yes
            </label>
            <label className={'cp-radio' + (!showVisa ? ' cp-radio-on' : '')}>
              <input type="radio" name="hasvisa" checked={!showVisa} onChange={() => setShowVisa(false)} /> No
            </label>
          </div>
        </div>

        <ExtendedSectionForm
          section="travel"
          initial={sections.travel}
          onSaved={setSections}
          submitLabel="Update Details"
          fields={[
            { key: 'passportno', label: 'Passport Number' },
            { key: 'idate', label: 'Passport Issue Date', type: 'date' },
            { key: 'expdate', label: 'Passport Expiry Date', type: 'date' },
            { key: 'visa', label: 'Visa Number', showIf: () => showVisa },
            { key: 'vidate', label: 'Visa Issue Date', type: 'date', showIf: () => showVisa },
            { key: 'vexpdate', label: 'Visa Expiry Date', type: 'date', showIf: () => showVisa },
            { key: 'seamanbno', label: 'Seaman Book (CDC) Number' },
            { key: 'sidate', label: 'Seaman Book Issue Date', type: 'date' },
            { key: 'seamanexpdate', label: 'Seaman Book Expiry Date', type: 'date' },
          ]}
        />
      </div>

      <p className="cp-table-note">
        <Info size={13} /> Copies of these documents are collected by our crewing team when you are assigned to a vessel - see Candidate Uploaded Documents.
      </p>
    </>
  );
}
