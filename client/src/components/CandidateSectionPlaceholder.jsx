// client/src/components/CandidateSectionPlaceholder.jsx
// Stand-in for candidate sections whose legacy tables haven't been migrated
// into MongoDB yet. Deliberately explicit about *why* it's empty rather than
// showing a blank page, so it's obvious this is pending data, not a bug.
import React from 'react';
import { Construction } from 'lucide-react';

export default function CandidateSectionPlaceholder({ title, description, tables = [] }) {
  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>

      <div className="cp-placeholder">
        <Construction size={30} />
        <h2>This section is being built</h2>
        <p>
          It needs its legacy data migrated into MongoDB first
          {tables.length > 0 && (
            <>
              {' '}&mdash; specifically{' '}
              {tables.map((t, i) => (
                <React.Fragment key={t}>
                  {i > 0 && (i === tables.length - 1 ? ' and ' : ', ')}
                  <code>{t}</code>
                </React.Fragment>
              ))}
            </>
          )}
          . Once that lands, this page will show your real records.
        </p>
      </div>
    </>
  );
}
