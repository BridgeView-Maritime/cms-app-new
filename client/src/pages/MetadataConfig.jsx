import React, { useState } from 'react';
import { Plus, Sliders, Database, Save } from 'lucide-react';
import '../styles/MetadataConfig.css';

export default function MetadataConfig() {
  const [selectedSchema, setSelectedSchema] = useState('vessels');

  const schemas = [
    { id: 'vessels', title: 'Vessel Classification System' },
    { id: 'ports', title: 'Geopolitical Port Identifiers' },
    { id: 'certifications', title: 'Crew Statutory Endorsements' }
  ];

  return (
    <div className="metadata-canvas">
      <div className="metadata-header">
        <div>
          <h2>System Metadata Configuration</h2>
          <p>Alter application schema arrays, configure drop-down constants, and modify indexing references safely.</p>
        </div>
      </div>

      <div className="metadata-split-view-container">
        {/* Left Side: Selectable Metadata Domain Clusters */}
        <div className="metadata-left-pane">
          <span className="pane-section-label">Operational Schemas</span>
          <div className="schema-list-links">
            {schemas.map(sch => (
              <button 
                key={sch.id}
                className={`schema-pane-row-item ${selectedSchema === sch.id ? 'pane-active' : ''}`}
                onClick={() => setSelectedSchema(sch.id)}
              >
                <Database size={14} /> {sch.title}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Active Configuration Constants Form Mapping */}
        <div className="metadata-right-pane-workarea">
          <div className="workarea-pane-header">
            <h4>Active Object Parameter Configuration Values</h4>
            <button className="mac-btn-tiny"><Plus size={12} /> Add Constant Row</button>
          </div>

          <div className="config-form-inputs-stack">
            <div className="constant-parameter-item-row">
              <div className="field-group-input">
                <label>Constant Parameter Value Identifier String Key</label>
                <input type="text" defaultValue="VLCC_CLASS" />
              </div>
              <div className="field-group-input">
                <label>Display Label Definition</label>
                <input type="text" defaultValue="Very Large Crude Carrier" />
              </div>
            </div>

            <div className="constant-parameter-item-row">
              <div className="field-group-input">
                <label>Constant Parameter Value Identifier String Key</label>
                <input type="text" defaultValue="SUEZMAX_CLASS" />
              </div>
              <div className="field-group-input">
                <label>Display Label Definition</label>
                <input type="text" defaultValue="Suezmax Tanker Segment" />
              </div>
            </div>
          </div>

          <div className="workarea-footer-save-bar">
            <button className="mac-btn-blue"><Save size={14} /> Deploy Configuration</button>
          </div>
        </div>
      </div>
    </div>
  );
}