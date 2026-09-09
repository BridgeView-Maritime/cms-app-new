import React from 'react';
import { PROFILE_SECTIONS } from '../../config/api';
import CandidateCertificatesPage from './CandidateCertificatesPage';

export default function CandidateOtherCertificatesPage() {
  return (
    <CandidateCertificatesPage
      title="Others Certificate"
      description="Any other courses and certificates you hold."
      endpoint={PROFILE_SECTIONS.OTHER_CERTS}
      addLabel="Add Certificate"
      emptyText="Add any other certificates you hold."
      columns={['certificate', 'number', 'issuedate', 'expdate']}
      buildFields={(l) => [
        { key: 'certificate', label: 'Certificate', required: true,
          type: (l.certificates || []).length ? 'select' : 'text', options: l.certificates },
        { key: 'number', label: 'Certificate Number', required: true },
        { key: 'issuedate', label: 'Issue Date', type: 'date' },
        { key: 'expdate', label: 'Expiry Date', type: 'date' },
      ]}
    />
  );
}
