import React from 'react';
import { PROFILE_SECTIONS } from '../../config/api';
import CandidateCertificatesPage from './CandidateCertificatesPage';

export default function CandidateCocPage() {
  return (
    <CandidateCertificatesPage
      title="Certificate of Competency"
      description="Your COC records and the authority that issued them."
      endpoint={PROFILE_SECTIONS.COC}
      addLabel="Add COC"
      emptyText="Add your certificates of competency."
      columns={['cocname', 'cocnumber', 'coccountry', 'cocissue', 'cocexp']}
      buildFields={(l) => [
        { key: 'cocname', label: 'Certificate', required: true,
          type: (l.cocCertificates || []).length ? 'select' : 'text', options: l.cocCertificates },
        { key: 'cocnumber', label: 'Certificate Number', required: true },
        { key: 'coccountry', label: 'Issuing Country',
          type: (l.cocCountries || []).length ? 'select' : 'text', options: l.cocCountries },
        { key: 'cocissue', label: 'Issue Date', type: 'date' },
        { key: 'cocexp', label: 'Expiry Date', type: 'date' },
      ]}
    />
  );
}
