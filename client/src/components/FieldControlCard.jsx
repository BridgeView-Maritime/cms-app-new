import React from 'react';
import { Trash2, Shield, ToggleLeft, ToggleRight, Code } from 'lucide-react';
import '../styles/FieldControlCard.css';

export default function FieldControlCard({ 
  field, idx, sections = [], handleFieldChange, removeFieldRow, toggleRolePermission, availableForms, systemRoles 
}) {
  const isTextBased = ['text', 'textarea', 'email', 'password', 'url'].includes(field.input_type);
  const isNumBased = ['number', 'currency', 'percentage'].includes(field.input_type);
  const isOptionBased = ['select', 'multi_select', 'radio', 'checkbox_group'].includes(field.input_type);
  const isFileBased = ['file', 'image'].includes(field.input_type);
  const isDateBased = ['date', 'datetime', 'time', 'date_range'].includes(field.input_type);
  const isLookupBased = field.input_type === 'database_lookup';

  const selectedSourceForm = availableForms.find(formItem => formItem.form_code === field.lookup_form_code);
  const sourceFields = selectedSourceForm && Array.isArray(selectedSourceForm.fields) ? selectedSourceForm.fields : [];

  // Helper function to auto-slugify Label into a Database Key
  const handleLabelChange = (e) => {
    const newLabel = e.target.value;
    handleFieldChange(idx, 'label', newLabel);

    // Converts "Identity Status" -> "identity_status"
    const generatedKey = newLabel
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s_]/g, '') // Remove non-alphanumeric chars except space/underscore
      .replace(/\s+/g, '_');         // Replace spaces with underscores

    handleFieldChange(idx, 'field_key', generatedKey);
  };

  return (
    <div className={`mac-form-array-card field-control-card ${field.is_active ? 'active-node' : 'soft-deleted-node'}`}>
      
      {/* Header Actions Row */}
      <div className="card-header-actions field-card-header">
        <span className="field-card-title">Custom Control Element Node Row #{idx + 1}</span>
        <div className="field-card-actions">
          <button type="button" className="field-action-btn" onClick={() => handleFieldChange(idx, 'is_active', !field.is_active)}>
            {field.is_active ? <ToggleRight color="#22c55e" size={20}/> : <ToggleLeft color="#ef4444" size={20}/>}
            <span className="field-action-text">{field.is_active ? 'Active' : 'Inactive (Archived)'}</span>
          </button>
          <button type="button" className="field-action-btn delete-btn" onClick={() => removeFieldRow(idx)}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Field Attribute Controls */}
      <div className="mac-form-grid-4x field-controls-grid">
        <div className="form-control-block">
          <label>UI Label Display</label>
          <input 
            type="text" 
            value={field.label || ''} 
            onChange={handleLabelChange} 
            placeholder="e.g. Identity Status" 
          />
        </div>

        <div className="form-control-block">
          <label>Database Key Name</label>
          <input 
            type="text" 
            value={field.field_key || ''} 
            disabled 
            placeholder="e.g. identity_status" 
          />
        </div>
        
        <div className="form-control-block">
          <label>Data Input Type</label>
          <select value={field.input_type} onChange={e => handleFieldChange(idx, 'input_type', e.target.value)}>
            <optgroup label="Text Elements">
              <option value="text">Short Text Line</option>
              <option value="textarea">Extended Textarea Block</option>
              <option value="email">Secure Email Address</option>
              <option value="password">Password Cipher Mask</option>
              <option value="url">Web Domain URL</option>
            </optgroup>
            <optgroup label="Numeric Systems">
              <option value="number">Numeric Integer Tracker</option>
              <option value="currency">Financial Currency Unit</option>
              <option value="percentage">Statistical Percentage (%)</option>
            </optgroup>
            <optgroup label="Selection Controls">
              <option value="select">Dropdown Single Select</option>
              <option value="database_lookup">Dynamic DB Lookup Dropdown</option>
              <option value="multi_select">Dropdown Multi Select Array</option>
              <option value="radio">Radio Option Group List</option>
              <option value="checkbox_group">Checkbox Composite Group</option>
              <option value="boolean_toggle">Boolean Toggle Switch (True/False)</option>
            </optgroup>
            <optgroup label="Temporal / Storage Matrix">
              <option value="date">Temporal Calendar Date</option>
              <option value="datetime">Timestamp DateTime Node</option>
              <option value="time">Hour-Minute Clock Time</option>
              <option value="date_range">Bounded Date Range Dual System</option>
              <option value="file">Secure Document File Attachment</option>
              <option value="image">Graphic Media/Image Frame Upload</option>
            </optgroup>
          </select>
        </div>

        <div className="form-control-block">
          <label>Target Workspace Section</label>
          <select value={field.section} onChange={e => handleFieldChange(idx, 'section', e.target.value)}>
            {sections.map(sectionItem => (
              <option key={sectionItem.id} value={sectionItem.id}>
                {sectionItem.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conditional: Dynamic Choice Options */}
      {isOptionBased && (
        <div className="form-control-block field-subpanel options-panel">
          <label className="field-subpanel-label">Dynamic Node Choices Configuration (Comma separated values)</label>
          <input type="text" value={field.options || ''} onChange={e => handleFieldChange(idx, 'options', e.target.value)} placeholder="Option Alpha, Option Beta, Option Gamma" />
        </div>
      )}

      {/* Conditional: Database Lookup Binding */}
      {isLookupBased && (
        <div className="mac-form-grid-2x field-subpanel lookup-panel">
          <div className="form-control-block">
            <label className="field-subpanel-label">Source Target Database Form Blueprint</label>
            <select 
              value={field.lookup_form_code || ''} 
              onChange={e => {
                handleFieldChange(idx, 'lookup_form_code', e.target.value);
                handleFieldChange(idx, 'lookup_field_key', '');
              }}
            >
              <option value="">-- Choose Data Collection Source --</option>
              {availableForms.map(formItem => (
                <option key={formItem.form_code} value={formItem.form_code}>{formItem.form_name} ({formItem.form_code})</option>
              ))}
            </select>
          </div>
          
          <div className="form-control-block">
            <label className="field-subpanel-label">Source Property Key</label>
            <select 
              value={field.lookup_field_key || ''} 
              onChange={e => handleFieldChange(idx, 'lookup_field_key', e.target.value)} 
              disabled={!field.lookup_form_code}
            >
              <option value="">-- Choose Field Value Mapping Key --</option>
              {sourceFields.map(srcField => (
                <option key={srcField.field_key} value={srcField.field_key}>
                  {srcField.label || srcField.field_key} ({srcField.field_key})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Validation Constraints Section */}
      <div className="field-subpanel validations-panel">
        <span className="field-subpanel-label">STRUCTURAL INTEGRITY CONSTRAINTS & VALIDATIONS</span>
        
        <div className="mac-form-grid-3x validations-grid-3x">
          <div className="validations-checkbox-wrapper">
            <input type="checkbox" id={`req_${idx}`} checked={field.validations?.required || false} onChange={e => handleFieldChange(idx, 'validations.required', e.target.checked)} />
            <label htmlFor={`req_${idx}`} className="validations-checkbox-label">Is Required Field</label>
          </div>

          {isTextBased && (
            <>
              <div className="form-control-block"><label className="validations-small-label">Min Character Bounds</label><input type="number" value={field.validations?.min_length || 0} onChange={e => handleFieldChange(idx, 'validations.min_length', parseInt(e.target.value) || 0)} /></div>
              <div className="form-control-block"><label className="validations-small-label">Max Character Boundary</label><input type="number" value={field.validations?.max_length || 255} onChange={e => handleFieldChange(idx, 'validations.max_length', parseInt(e.target.value) || 255)} /></div>
            </>
          )}

          {isNumBased && (
            <>
              <div className="form-control-block"><label className="validations-small-label">Minimum Allowable Value</label><input type="number" value={field.validations?.min_val ?? ''} onChange={e => handleFieldChange(idx, 'validations.min_val', e.target.value === '' ? '' : Number(e.target.value))} placeholder="No Min Limit" /></div>
              <div className="form-control-block"><label className="validations-small-label">Maximum Allowable Value</label><input type="number" value={field.validations?.max_val ?? ''} onChange={e => handleFieldChange(idx, 'validations.max_val', e.target.value === '' ? '' : Number(e.target.value))} placeholder="No Max Limit" /></div>
            </>
          )}

          {isFileBased && (
            <>
              <div className="form-control-block"><label className="validations-small-label">Max File Size Boundary (MB)</label><input type="number" value={field.validations?.max_file_size_mb || 5} onChange={e => handleFieldChange(idx, 'validations.max_file_size_mb', parseInt(e.target.value) || 5)} /></div>
              <div className="form-control-block"><label className="validations-small-label">Permitted Extensions Matrix</label><input type="text" value={field.validations?.allowed_file_types || '.pdf,.png,.jpg'} onChange={e => handleFieldChange(idx, 'validations.allowed_file_types', e.target.value)} placeholder="e.g. .pdf,.csv" /></div>
            </>
          )}

          {isDateBased && (
            <>
              <div className="form-control-block">
                <label className="validations-small-label">Timeline Restriction</label>
                <select value={field.validations?.date_restriction || 'none'} onChange={e => handleFieldChange(idx, 'validations.date_restriction', e.target.value)}>
                  <option value="none">Allow All Timeline Entries</option>
                  <option value="past_only">Past Dates Only</option>
                  <option value="future_only">Future Dates Only</option>
                </select>
              </div>
              <div style={{ minHeight: '1px' }}></div>
            </>
          )}
        </div>

        {isTextBased && (
          <div className="mac-form-grid-2x validations-regex-grid">
            <div className="form-control-block">
              <label className="validations-small-label field-subpanel-label"><Code size={12}/> Custom Matching Regex Engine Pattern</label>
              <input type="text" className="regex-input-code" value={field.validations?.regex_pattern || ''} onChange={e => handleFieldChange(idx, 'validations.regex_pattern', e.target.value)} placeholder="^[A-Z0-9]{8}$" />
            </div>
            <div className="form-control-block">
              <label className="validations-small-label">Regex Verification Error Fallback Text</label>
              <input type="text" value={field.validations?.regex_error_msg || ''} onChange={e => handleFieldChange(idx, 'validations.regex_error_msg', e.target.value)} placeholder="Syntax formatting validation error." />
            </div>
          </div>
        )}
      </div>

      {/* Role Access Matrix */}
      <div className="field-roles-panel">
        <label className="field-roles-label"><Shield size={14}/> Role Access Permissions Routing Target Data:</label>
        <div className="field-roles-list">
          {systemRoles.map(role => (
            <label key={role} className="field-role-item">
              <input type="checkbox" checked={field.allowed_roles?.includes(role) || false} onChange={() => toggleRolePermission(idx, role)} /> {role}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}