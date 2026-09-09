// client/src/pages/candidate/CandidateGrievancesPage.jsx
import React from 'react';
import { Info } from 'lucide-react';
import { CANDIDATE_SECTIONS } from '../../config/api';
import CandidateCrudSection from '../../components/candidate/CandidateCrudSection';

// `g_close_remark` is written by the crewing team when a grievance is
// closed, so it appears in the table but never in the candidate's form.
const FIELDS = [
  { key: 'g_title', label: 'Subject', required: true, placeholder: 'Briefly, what is this about?' },
  {
    key: 'g_remark',
    label: 'Details',
    type: 'textarea',
    wide: true,
    required: true,
    placeholder: 'Tell us what happened and what you would like us to do.',
  },
  { key: 'g_close_remark', label: 'Our Response', readOnly: true },
];

export default function CandidateGrievancesPage() {
  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Grievances</h1>
          <p>Raise a concern with us and track how it is progressing.</p>
        </div>
      </div>

      <CandidateCrudSection
        endpoint={CANDIDATE_SECTIONS.GRIEVANCES}
        addLabel="Raise a Grievance"
        emptyText="You have not raised any grievances. If something needs our attention, let us know here."
        columns={['g_title', 'g_remark', 'g_close_remark']}
        fields={FIELDS}
      />

      <p className="cp-table-note">
        <Info size={13} /> Grievances are reviewed by our crewing team. You will be contacted on the email registered to your account.
      </p>
    </>
  );
}
