// client/src/pages/candidate/CandidatePreviousEmployersPage.jsx
import React from 'react';
import { PROFILE_SECTIONS } from '../../config/api';
import CandidateCrudSection from '../../components/candidate/CandidateCrudSection';

export default function CandidatePreviousEmployersPage() {
  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Previous Employer Details</h1>
          <p>Companies you have sailed or worked with before.</p>
        </div>
      </div>

      <CandidateCrudSection
        endpoint={PROFILE_SECTIONS.PREVIOUS_EMPLOYERS}
        addLabel="Add Employer"
        emptyText="Add the companies you have previously worked with."
        columns={['compname', 'persname', 'mobileno', 'preemailid']}
        fields={[
          { key: 'compname', label: 'Company Name', required: true },
          { key: 'persname', label: 'Contact Person' },
          { key: 'mobileno', label: 'Mobile Number' },
          { key: 'preemailid', label: 'Email' },
        ]}
      />
    </>
  );
}
