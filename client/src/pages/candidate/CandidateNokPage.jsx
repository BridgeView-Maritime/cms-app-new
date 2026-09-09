// client/src/pages/candidate/CandidateNokPage.jsx
import React from 'react';
import { PROFILE_SECTIONS } from '../../config/api';
import CandidateCrudSection from '../../components/candidate/CandidateCrudSection';

export default function CandidateNokPage() {
  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>NOK Details</h1>
          <p>Your next of kin - who we contact in an emergency.</p>
        </div>
      </div>

      <CandidateCrudSection
        endpoint={PROFILE_SECTIONS.NOK}
        addLabel="Add Next of Kin"
        emptyText="Add the person we should contact in an emergency."
        columns={['nokname', 'nokrel', 'nokcontact', 'nokalternate', 'nok_emailid']}
        fields={[
          { key: 'nokname', label: 'Name', required: true },
          { key: 'nokrel', label: 'Relation', required: true },
          { key: 'nokcontact', label: 'Contact Number', required: true },
          { key: 'nokalternate', label: 'Alternate Number' },
          { key: 'nok_emailid', label: 'Email' },
          { key: 'nokaddress', label: 'Address', type: 'textarea', wide: true },
          { key: 'relative_name', label: 'Relative Name' },
          { key: 'relative_contact', label: 'Relative Contact' },
          { key: 'relative_address', label: 'Relative Address', type: 'textarea', wide: true },
        ]}
      />
    </>
  );
}
