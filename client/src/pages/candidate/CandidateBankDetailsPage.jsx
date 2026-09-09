// client/src/pages/candidate/CandidateBankDetailsPage.jsx
import React from 'react';
import { PROFILE_SECTIONS } from '../../config/api';
import CandidateCrudSection from '../../components/candidate/CandidateCrudSection';

export default function CandidateBankDetailsPage() {
  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Bank Details</h1>
          <p>Where your payments are sent. Kept private to your account.</p>
        </div>
      </div>

      <CandidateCrudSection
        endpoint={PROFILE_SECTIONS.BANK}
        single
        addLabel="Save"
        emptyText=""
        columns={[]}
        fields={[
          { key: 'name', label: 'Account Holder Name', required: true },
          { key: 'accountno', label: 'Account Number', required: true },
          { key: 'code', label: 'IFSC / SWIFT Code', required: true },
          { key: 'bank_name', label: 'Bank Name', required: true },
          { key: 'bank_address', label: 'Bank Address', type: 'textarea', wide: true },
        ]}
      />
    </>
  );
}
