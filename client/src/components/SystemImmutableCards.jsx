import React from 'react';

export default function SystemImmutableCards({ effectiveFixedFields }) {
  return (
    <>
      {effectiveFixedFields.map((sysF) => (
        <div key={sysF.field_key} className="mac-form-array-card" style={{ opacity: 0.75, backgroundColor: '#f1f5f9', borderLeft: '4px solid #64748b', padding: '12px', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 'bold' }}>SYSTEM IMMUTABLE KEY ANCHOR</span>
          <div className="mac-form-grid-3x" style={{ gap: '10px', marginTop: '5px' }}>
            <input type="text" value={sysF.label} disabled />
            <input type="text" value={sysF.field_key} disabled />
            <input type="text" value={`Section: ${sysF.section.toUpperCase()} (${sysF.input_type.toUpperCase()})`} disabled />
          </div>
        </div>
      ))}
    </>
  );
}