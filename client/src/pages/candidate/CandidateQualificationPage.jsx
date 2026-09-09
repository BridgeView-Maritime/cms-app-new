// client/src/pages/candidate/CandidateQualificationPage.jsx
// Mirrors the legacy rename_education.php, which combined academic
// qualifications and pre-sea training on one page.
import React, { useState, useEffect } from 'react';
import { GraduationCap, Anchor } from 'lucide-react';
import { PROFILE_SECTIONS } from '../../config/api';
import CandidateCrudSection from '../../components/candidate/CandidateCrudSection';

export default function CandidateQualificationPage() {
  const [lookups, setLookups] = useState({ educationTypes: [], preseaTypes: [] });

  useEffect(() => {
    fetch(PROFILE_SECTIONS.LOOKUPS)
      .then((r) => r.json())
      .then((d) => { if (d.success) setLookups(d); })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Qualification</h1>
          <p>Your academic qualifications and pre-sea training.</p>
        </div>
      </div>

      <div className="cp-section-heading">
        <GraduationCap size={17} />
        <h2>Education</h2>
      </div>
      <CandidateCrudSection
        endpoint={PROFILE_SECTIONS.EDUCATION}
        addLabel="Add Qualification"
        emptyText="Add your degrees, diplomas and other qualifications."
        columns={['degree', 'subject', 'university', 'issuedate', 'percentage']}
        fields={[
          { key: 'degree', label: 'Degree / Course', required: true,
            type: lookups.educationTypes.length ? 'select' : 'text',
            options: lookups.educationTypes },
          { key: 'subject', label: 'Major / Subject' },
          { key: 'university', label: 'University / Board' },
          { key: 'issuedate', label: 'Issue Date', type: 'date' },
          { key: 'percentage', label: 'Percentage / Grade' },
          { key: 'country', label: 'Country' },
        ]}
      />

      <div className="cp-section-heading cp-section-heading-spaced">
        <Anchor size={17} />
        <h2>Pre-Sea Training</h2>
      </div>
      <CandidateCrudSection
        endpoint={PROFILE_SECTIONS.PRESEA}
        addLabel="Add Pre-Sea Training"
        emptyText="Add any pre-sea training courses you have completed."
        columns={['presea_name', 'grade', 'periodfrom', 'periodto', 'remarks']}
        fields={[
          { key: 'presea_name', label: 'Institute / Course', required: true,
            type: lookups.preseaTypes.length ? 'select' : 'text',
            options: lookups.preseaTypes },
          { key: 'grade', label: 'Grade' },
          { key: 'periodfrom', label: 'From', type: 'date' },
          { key: 'periodto', label: 'To', type: 'date' },
          { key: 'remarks', label: 'Remarks', type: 'textarea', wide: true },
        ]}
      />
    </>
  );
}
