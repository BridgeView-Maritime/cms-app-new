import React from 'react';
import { PROFILE_SECTIONS } from '../../config/api';
import CandidateCertificatesPage from './CandidateCertificatesPage';

export default function CandidateStcwPage() {
  return (
    <CandidateCertificatesPage
      title="STCW"
      description="Your STCW courses, certificate numbers and issuing institutes."
      endpoint={PROFILE_SECTIONS.STCW}
      addLabel="Add STCW Course"
      emptyText="Add your STCW courses."
      columns={['certificate', 'number', 'institute', 'issuedate', 'expdate']}
      buildFields={(l) => [
        { key: 'certificate', label: 'Course', required: true,
          type: (l.certificates || []).length ? 'select' : 'text', options: l.certificates },
        { key: 'number', label: 'Certificate Number', required: true },
        { key: 'institute', label: 'Institute' },
        { key: 'issuedate', label: 'Issue Date', type: 'date' },
        { key: 'expdate', label: 'Expiry Date', type: 'date' },
      ]}
    />
  );
}
