import React from 'react';
import { Trash2, Shield, ToggleLeft, ToggleRight, Code } from 'lucide-react';

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

  return (
    <div className={`mac-form-array-card ${!field.is_active ? 'soft-deleted-node' : ''}`} style={{ padding: '18px', borderRadius: '6px', marginBottom: '20px', backgroundColor: field.is_active ? '#fff' : '#fef2f2', borderLeft: field.is_active ? '4px solid #3b82f6' : '4px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      
      <div className="card-header-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
        <span style={{ fontWeight: '600', color: '#1e293b' }}>Custom Control Element Node Row #{idx + 1}</span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleFieldChange(idx, 'is_active', !field.is_active)}>
            {field.is_active ? <ToggleRight color="#22c55e" size={20}/> : <ToggleLeft color="#ef4444" size={20}/>}
            <span style={{ fontSize: '12px', fontWeight: '500' }}>{field.is_active ? 'Active' : 'Inactive (Archived)'}</span>
          </button>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }} onClick={() => removeFieldRow(idx)}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mac-form-grid-4x" style={{ gap: '12px' }}>
        <div className="form-control-block"><label>UI Label Display</label><input type="text" value={field.label} onChange={e => handleFieldChange(idx, 'label', e.target.value)} placeholder="e.g. Identity Status" /></div>
        <div className="form-control-block"><label>Database Key Name</label><input type="text" value={field.field_key} onChange={e => handleFieldChange(idx, 'field_key', e.target.value)} placeholder="e.g. identity_status" /></div>
        
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
            {/* Iterates dynamically through custom runtime sections instead of hardcoded strings */}
            {sections.map(sectionItem => (
              <option key={sectionItem.id} value={sectionItem.id}>
                {sectionItem.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isOptionBased && (
        <div className="form-control-block" style={{ marginTop: '12px', backgroundColor: '#eff6ff', padding: '12px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
          <label style={{ fontSize: '11px', color: '#1e40af', fontWeight: 'bold' }}>Dynamic Node Choices Configuration (Comma separated values)</label>
          <input type="text" value={field.options || ''} onChange={e => handleFieldChange(idx, 'options', e.target.value)} placeholder="Option Alpha, Option Beta, Option Gamma" style={{ borderColor: '#60a5fa', backgroundColor: '#fff' }} />
        </div>
      )}

      {isLookupBased && (
        <div className="mac-form-grid-2x" style={{ marginTop: '12px', backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '4px', border: '1px solid #bbf7d0', gap: '12px' }}>
          <div className="form-control-block">
            <label style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold' }}>Source Target Database Form Blueprint</label>
            <select 
              value={field.lookup_form_code || ''} 
              onChange={e => {
                handleFieldChange(idx, 'lookup_form_code', e.target.value);
                handleFieldChange(idx, 'lookup_field_key', '');
              }}
              style={{ borderColor: '#86efac', backgroundColor: '#fff' }}
            >
              <option value="">-- Choose Data Collection Source --</option>
              {availableForms.map(formItem => (
                <option key={formItem.form_code} value={formItem.form_code}>{formItem.form_name} ({formItem.form_code})</option>
              ))}
            </select>
          </div>
          
          <div className="form-control-block">
            <label style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold' }}>Source Property Key</label>
            <select 
              value={field.lookup_field_key || ''} 
              onChange={e => handleFieldChange(idx, 'lookup_field_key', e.target.value)} 
              style={{ borderColor: '#86efac', backgroundColor: '#fff' }}
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

      <div style={{ marginTop: '14px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>STRUCTURAL INTEGRITY CONSTRAINTS & VALIDATIONS</span>
        
        <div className="mac-form-grid-3x" style={{ gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="checkbox" id={`req_${idx}`} checked={field.validations?.required || false} onChange={e => handleFieldChange(idx, 'validations.required', e.target.checked)} />
            <label htmlFor={`req_${idx}`} style={{ margin: 0, fontWeight: '500', fontSize: '12px' }}>Is Required Field</label>
          </div>

          {isTextBased && (
            <>
              <div className="form-control-block"><label style={{ fontSize: '11px' }}>Min Character Bounds</label><input type="number" value={field.validations?.min_length || 0} onChange={e => handleFieldChange(idx, 'validations.min_length', parseInt(e.target.value) || 0)} /></div>
              <div className="form-control-block"><label style={{ fontSize: '11px' }}>Max Character Boundary</label><input type="number" value={field.validations?.max_length || 255} onChange={e => handleFieldChange(idx, 'validations.max_length', parseInt(e.target.value) || 255)} /></div>
            </>
          )}

          {isNumBased && (
            <>
              <div className="form-control-block"><label style={{ fontSize: '11px' }}>Minimum Allowable Value</label><input type="number" value={field.validations?.min_val ?? ''} onChange={e => handleFieldChange(idx, 'validations.min_val', e.target.value === '' ? '' : Number(e.target.value))} placeholder="No Min Limit" /></div>
              <div className="form-control-block"><label style={{ fontSize: '11px' }}>Maximum Allowable Value</label><input type="number" value={field.validations?.max_val ?? ''} onChange={e => handleFieldChange(idx, 'validations.max_val', e.target.value === '' ? '' : Number(e.target.value))} placeholder="No Max Limit" /></div>
            </>
          )}

          {isFileBased && (
            <>
              <div className="form-control-block"><label style={{ fontSize: '11px' }}>Max File Size Boundary (MB)</label><input type="number" value={field.validations?.max_file_size_mb || 5} onChange={e => handleFieldChange(idx, 'validations.max_file_size_mb', parseInt(e.target.value) || 5)} /></div>
              <div className="form-control-block"><label style={{ fontSize: '11px' }}>Permitted Extensions Matrix</label><input type="text" value={field.validations?.allowed_file_types || '.pdf,.png,.jpg'} onChange={e => handleFieldChange(idx, 'validations.allowed_file_types', e.target.value)} placeholder="e.g. .pdf,.csv" /></div>
            </>
          )}

          {isDateBased && (
            <>
              <div className="form-control-block"><label style={{ fontSize: '11px' }}>Timeline Restriction</label><select value={field.validations?.date_restriction || 'none'} onChange={e => handleFieldChange(idx, 'validations.date_restriction', e.target.value)}><option value="none">Allow All Timeline Entries</option><option value="past_only">Past Dates Only</option><option value="future_only">Future Dates Only</option></select></div>
              <div style={{ minHeight: '1px' }}></div>
            </>
          )}
        </div>

        {isTextBased && (
          <div className="mac-form-grid-2x" style={{ gap: '10px', marginTop: '10px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
            <div className="form-control-block"><label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}><Code size={12}/> Custom Matching Regex Engine Pattern</label><input type="text" value={field.validations?.regex_pattern || ''} onChange={e => handleFieldChange(idx, 'validations.regex_pattern', e.target.value)} placeholder="^[A-Z0-9]{8}$" style={{ fontFamily: 'monospace' }} /></div>
            <div className="form-control-block"><label style={{ fontSize: '11px' }}>Regex Verification Error Fallback Text</label><input type="text" value={field.validations?.regex_error_msg || ''} onChange={e => handleFieldChange(idx, 'validations.regex_error_msg', e.target.value)} placeholder="Syntax formatting validation error." /></div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontWeight: 'bold' }}><Shield size={14}/> Role Access Permissions Routing Target Data:</label>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '6px' }}>
          {systemRoles.map(role => (
            <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'normal' }}>
              <input type="checkbox" checked={field.allowed_roles?.includes(role) || false} onChange={() => toggleRolePermission(idx, role)} /> {role}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}