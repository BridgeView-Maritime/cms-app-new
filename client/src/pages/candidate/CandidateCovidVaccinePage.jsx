// client/src/pages/candidate/CandidateCovidVaccinePage.jsx
// Legacy covid_details.php.
import React, { useState, useEffect } from 'react';
import { Syringe } from 'lucide-react';
import { ACCOUNT_ENDPOINTS } from '../../config/api';
import ExtendedSectionForm from '../../components/candidate/ExtendedSectionForm';

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

export default function CandidateCovidVaccinePage() {
  const [sections, setSections] = useState(null);
  const [vaccines, setVaccines] = useState([]);

  useEffect(() => {
    fetch(ACCOUNT_ENDPOINTS.EXTENDED_PROFILE, { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => setSections(d.success ? d.sections : {}))
      .catch(() => setSections({}));
    fetch(ACCOUNT_ENDPOINTS.EXTENDED_OPTIONS)
      .then((r) => r.json())
      .then((d) => { if (d.success) setVaccines(d.vaccines || []); })
      .catch(() => {});
  }, []);

  if (!sections) return <div className="cp-loading-screen">Loading vaccine details...</div>;

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Covid Vaccine Details</h1>
          <p>Vaccination status is still asked for by several ports and flag states.</p>
        </div>
      </div>

      <div className="cp-card">
        <div className="cp-card-head">
          <Syringe size={18} />
          <h2>Vaccination Record</h2>
        </div>
        <ExtendedSectionForm
          section="covid"
          initial={sections.covid}
          onSaved={setSections}
          submitLabel="Update Details"
          fields={[
            { key: 'vaccine', label: 'Covid Vaccine', type: 'select', options: vaccines },
            { key: 'vaccine1', label: 'Dose 1 Date', type: 'date' },
            { key: 'vaccine2', label: 'Dose 2 Date', type: 'date' },
            { key: 'boostername', label: 'Booster Vaccine', type: 'select', options: vaccines },
            { key: 'boosterdate', label: 'Booster Date', type: 'date' },
          ]}
        />
      </div>
    </>
  );
}
