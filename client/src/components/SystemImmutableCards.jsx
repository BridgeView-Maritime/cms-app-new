import React from 'react';
import '../styles/SystemImmutableCards.css';

export default function SystemImmutableCards({ effectiveFixedFields }) {
  return (
    <>
      {effectiveFixedFields.map((sysF) => (
        <div key={sysF.field_key} className="mac-form-array-card system-immutable-card">
          <span className="system-immutable-badge">SYSTEM IMMUTABLE KEY ANCHOR</span>
          <div className="mac-form-grid-3x system-immutable-grid">
            <input type="text" value={sysF.label} disabled />
            <input type="text" value={sysF.field_key} disabled />
            <input type="text" value={`Section: ${sysF.section.toUpperCase()} (${sysF.input_type.toUpperCase()})`} disabled />
          </div>
        </div>
      ))}
    </>
  );
}