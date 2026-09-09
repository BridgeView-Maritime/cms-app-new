import React from 'react';
import { PROFILE_SECTIONS } from '../../config/api';
import CandidateCertificatesPage from './CandidateCertificatesPage';

export default function CandidateOffshoreCertificatesPage() {
  return (
    <CandidateCertificatesPage
      title="Certificate of Offshore"
      description="Offshore survival and safety certificates such as HUET and BOSIET."
      endpoint={PROFILE_SECTIONS.OFFSHORE_CERTS}
      addLabel="Add Offshore Certificate"
      emptyText="Add your offshore certificates."
      columns={['certificate', 'number', 'issuedate', 'expdate']}
      buildFields={(l) => [
        { key: 'certificate', label: 'Certificate', required: true,
          type: (l.offshoreCertificates || []).length ? 'select' : 'text', options: l.offshoreCertificates },
        { key: 'number', label: 'Certificate Number', required: true },
        { key: 'issuedate', label: 'Issue Date', type: 'date' },
        { key: 'expdate', label: 'Expiry Date', type: 'date' },
      ]}
    />
  );
}
