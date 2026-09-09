// client/src/pages/candidate/CandidateCertificatesPage.jsx
// One component behind the four certificate pages (COC, Offshore, Others,
// STCW) — they differ only in endpoint, fields and which lookup list feeds
// the certificate dropdown.
import React, { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import { PROFILE_SECTIONS } from '../../config/api';
import CandidateCrudSection from '../../components/candidate/CandidateCrudSection';

export default function CandidateCertificatesPage({
  title, description, endpoint, addLabel, emptyText, columns, buildFields,
}) {
  const [lookups, setLookups] = useState({});

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
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="cp-section-heading">
        <Award size={17} />
        <h2>{title}</h2>
      </div>

      <CandidateCrudSection
        endpoint={endpoint}
        addLabel={addLabel}
        emptyText={emptyText}
        columns={columns}
        fields={buildFields(lookups)}
      />
    </>
  );
}
