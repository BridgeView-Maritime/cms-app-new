import React, { useState, useEffect } from 'react';
import { Trash2, Shield, ToggleLeft, ToggleRight, Code, Loader2, Sliders, Plus, Layers, LayoutGrid, Info } from 'lucide-react';
import '../styles/FieldControlCard.css';
import { AUTH_ENDPOINTS } from '../config/api';

export default function FieldControlCard({ 
  field, 
  idx, 
  sections = [], 
  handleFieldChange, 
  removeFieldRow, 
  toggleRolePermission, 
  availableForms = [], 
  systemRoles = [] 
}) {
  const [fetchedFormFields, setFetchedFormFields] = useState([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  // Secondary cache for repeater sub-field database lookup field options
  const [repeaterLookupFieldsCache, setRepeaterLookupFieldsCache] = useState({});
  const [loadingRepeaterLookups, setLoadingRepeaterLookups] = useState({});

  // Input classification helpers for top-level field
  const isTextBased = ['text', 'textarea', 'email', 'password', 'url'].includes(field.input_type);
  const isNumBased = ['number', 'currency', 'percentage'].includes(field.input_type);
  const isOptionBased = ['select', 'multi_select', 'radio', 'checkbox_group'].includes(field.input_type);
  const isFileBased = ['file', 'image'].includes(field.input_type);
  const isDateBased = ['date', 'datetime', 'time', 'date_range'].includes(field.input_type);
  const isLookupBased = field.input_type === 'database_lookup';
  const isToggleBased = field.input_type === 'boolean_toggle';
  const isRepeaterBased = field.input_type === 'repeater';

  // Helper classification functions for repeater sub-fields
  const getSubIsText = (type) => ['text', 'textarea', 'email', 'password', 'url'].includes(type);
  const getSubIsNum = (type) => ['number', 'currency', 'percentage'].includes(type);
  const getSubIsOption = (type) => ['select', 'multi_select', 'radio', 'checkbox_group'].includes(type);
  const getSubIsFile = (type) => ['file', 'image'].includes(type);
  const getSubIsDate = (type) => ['date', 'datetime', 'time', 'date_range'].includes(type);
  const getSubIsToggle = (type) => type === 'boolean_toggle';

  // Fetch target form schema metadata when top-level database lookup selection changes
  useEffect(() => {
    if (!isLookupBased || !field.lookup_form_code) {
      setFetchedFormFields([]);
      return;
    }

    let isMounted = true;
    setIsLoadingFields(true);

    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';

    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/${field.lookup_form_code}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (isMounted) {
          const schema = data.data || data;
          const rawFields = Array.isArray(schema.fields) ? schema.fields : [];
          setFetchedFormFields(rawFields);
        }
      })
      .catch(err => {
        console.error('Error fetching source lookup fields:', err);
        if (isMounted) setFetchedFormFields([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingFields(false);
      });

    return () => {
      isMounted = false;
    };
  }, [field.lookup_form_code, field.input_type, isLookupBased]);

  // Fetch schema metadata for repeater sub-fields configured with database_lookup
  useEffect(() => {
    if (!isRepeaterBased || !Array.isArray(field.sub_fields)) return;

    field.sub_fields.forEach((sub, subIdx) => {
      if (sub.input_type === 'database_lookup' && sub.lookup_form_code) {
        if (repeaterLookupFieldsCache[sub.lookup_form_code]) return; // Cache hit

        setLoadingRepeaterLookups(prev => ({ ...prev, [subIdx]: true }));
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';

        fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/${sub.lookup_form_code}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        })
          .then(res => res.json())
          .then(data => {
            const schema = data.data || data;
            const rawFields = Array.isArray(schema.fields) ? schema.fields : [];
            setRepeaterLookupFieldsCache(prev => ({
              ...prev,
              [sub.lookup_form_code]: rawFields
            }));
          })
          .catch(err => console.error(`Error fetching lookup fields for repeater subfield (${sub.lookup_form_code}):`, err))
          .finally(() => {
            setLoadingRepeaterLookups(prev => ({ ...prev, [subIdx]: false }));
          });
      }
    });
  }, [field.sub_fields, isRepeaterBased, repeaterLookupFieldsCache]);

  // Helper to auto-slugify Label into Database Key
  const handleLabelChange = (e) => {
    const newLabel = e.target.value;
    handleFieldChange(idx, 'label', newLabel);

    const generatedKey = newLabel
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s_]/g, '')
      .replace(/\s+/g, '_');

    handleFieldChange(idx, 'field_key', generatedKey);
  };

  // Auto-convert default_value type when toggle_format switches
  const handleToggleFormatChange = (newFormat) => {
    handleFieldChange(idx, 'toggle_format', newFormat);

    const curVal = field.default_value;
    const isCurrentlyTrue = curVal === true || curVal === 1 || curVal === '1' || curVal === 'Active' || curVal === 'Yes' || curVal === 'true';

    let updatedVal;
    if (newFormat === 'numeric') {
      updatedVal = isCurrentlyTrue ? 1 : 0;
    } else if (newFormat === 'active_inactive') {
      updatedVal = isCurrentlyTrue ? 'Active' : 'Inactive';
    } else if (newFormat === 'yes_no') {
      updatedVal = isCurrentlyTrue ? 'Yes' : 'No';
    } else {
      updatedVal = isCurrentlyTrue;
    }

    handleFieldChange(idx, 'default_value', updatedVal);
  };

  // Convert toggle selection string back into formatted DB primitive (Number / String / Boolean)
  const handleDefaultToggleChange = (rawValue) => {
    const format = field.toggle_format || 'boolean';
    let formattedVal;

    if (format === 'numeric') {
      formattedVal = rawValue === 'true' || rawValue === '1' ? 1 : 0;
    } else if (format === 'active_inactive') {
      formattedVal = rawValue === 'true' || rawValue === 'Active' ? 'Active' : 'Inactive';
    } else if (format === 'yes_no') {
      formattedVal = rawValue === 'true' || rawValue === 'Yes' ? 'Yes' : 'No';
    } else {
      formattedVal = rawValue === 'true' || rawValue === true;
    }

    handleFieldChange(idx, 'default_value', formattedVal);
  };

  // Convert saved DB value into string for dropdown binding
  const getSelectedDefaultString = () => {
    if (field.default_value === undefined || field.default_value === null) return 'false';
    const val = field.default_value;
    const isTrue = val === true || val === 1 || val === '1' || val === 'Active' || val === 'Yes' || val === 'true';
    return isTrue ? 'true' : 'false';
  };

  // Handlers for Repeater Grid Column Configuration
  const handleAddSubField = () => {
    const currentSubs = Array.isArray(field.sub_fields) ? field.sub_fields : [];
    const updatedSubs = [
      ...currentSubs,
      { 
        field_key: '', 
        label: '', 
        input_type: 'text', 
        options: [], 
        lookup_form_code: '', 
        lookup_field_key: '', 
        placeholder: '',
        same_line: false,
        same_line_group: '',
        grid_span: '12',
        has_disclaimer: false,
        disclaimer_text: '',
        validations: {
          required: false,
          min_length: 0,
          max_length: 255,
          min_val: null,
          max_val: null,
          max_file_size_mb: 5,
          allowed_file_types: '.pdf,.png,.jpg',
          date_restriction: 'none',
          regex_pattern: '',
          regex_error_msg: ''
        }
      }
    ];
    handleFieldChange(idx, 'sub_fields', updatedSubs);
  };

  const handleRemoveSubField = (subIdx) => {
    const currentSubs = Array.isArray(field.sub_fields) ? field.sub_fields : [];
    const updatedSubs = currentSubs.filter((_, i) => i !== subIdx);
    handleFieldChange(idx, 'sub_fields', updatedSubs);
  };

  const handleSubFieldChange = (subIdx, subKey, value) => {
    const currentSubs = Array.isArray(field.sub_fields) ? [...field.sub_fields] : [];
    
    if (subKey === 'label') {
      const generatedKey = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s_]/g, '')
        .replace(/\s+/g, '_');
      currentSubs[subIdx] = {
        ...currentSubs[subIdx],
        label: value,
        field_key: generatedKey
      };
    } else if (subKey.startsWith('validations.')) {
      const validationProp = subKey.split('.')[1];
      currentSubs[subIdx] = {
        ...currentSubs[subIdx],
        validations: {
          ...(currentSubs[subIdx].validations || {}),
          [validationProp]: value
        }
      };
    } else {
      currentSubs[subIdx] = {
        ...currentSubs[subIdx],
        [subKey]: value
      };
    }
    
    handleFieldChange(idx, 'sub_fields', currentSubs);
  };

  return (
    <div className={`mac-form-array-card field-control-card ${field.is_active ? 'active-node' : 'soft-deleted-node'}`}>
      
      {/* Header Actions */}
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

      {/* Main Attribute Configuration */}
      <div className="mac-form-grid-4x field-controls-grid">
        <div className="form-control-block">
          <label>UI Label Display</label>
          <input 
            type="text" 
            value={field.label || ''} 
            onChange={handleLabelChange} 
            placeholder="e.g. Visa Status" 
          />
        </div>

        <div className="form-control-block">
          <label>Database Key Name</label>
          <input 
            type="text" 
            value={field.field_key || ''} 
            disabled 
            placeholder="e.g. visa_status" 
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
            <optgroup label="Complex Dynamic Systems">
              <option value="repeater">Repeater Table Grid Row System</option>
            </optgroup>
          </select>
        </div>

        <div className="form-control-block">
          <label>Target Workspace Section</label>
          <select value={field.section || ''} onChange={e => handleFieldChange(idx, 'section', e.target.value)}>
            {sections.map(sectionItem => (
              <option key={sectionItem.id} value={sectionItem.id}>
                {sectionItem.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Layout & Alignment Configuration (Same-Line & Width Controls) */}
      <div className="field-subpanel layout-panel" style={{ marginTop: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LayoutGrid size={15} color="#086078" />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Layout & Inline Alignment
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500', color: '#334155' }}>
              <input 
                type="checkbox" 
                checked={field.same_line || false} 
                onChange={e => handleFieldChange(idx, 'same_line', e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: '#086078', cursor: 'pointer' }}
              />
              Display on Same Line (Inline)
            </label>

            {field.same_line && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>Inline Group ID:</label>
                <input
                  type="text"
                  value={field.same_line_group || ''}
                  onChange={e => handleFieldChange(idx, 'same_line_group', e.target.value)}
                  placeholder="e.g. group_1"
                  style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', width: '100px' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>Grid Width Span:</label>
              <select 
                value={field.grid_span || '12'} 
                onChange={e => handleFieldChange(idx, 'grid_span', e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff' }}
              >
                <option value="12">100% (Full Row Width)</option>
                <option value="6">50% (1/2 Width)</option>
                <option value="4">33.3% (1/3 Width - Standard Same Line)</option>
                <option value="3">25% (1/4 Width - Small)</option>
                <option value="2">16.6% (1/6 Width - Compact Dropdown)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer / Help Note Panel */}
      <div className="field-subpanel disclaimer-panel" style={{ marginTop: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={15} color="#086078" />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500', color: '#334155' }}>
              <input
                type="checkbox"
                checked={field.has_disclaimer || false}
                onChange={e => handleFieldChange(idx, 'has_disclaimer', e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: '#086078', cursor: 'pointer' }}
              />
              Include Disclaimer / Terms Notice
            </label>
          </div>

          {field.has_disclaimer && (
            <div className="form-control-block" style={{ marginTop: '4px' }}>
              <label className="field-subpanel-label" style={{ fontSize: '12px', color: '#64748b' }}>Disclaimer Text Content</label>
              <textarea
                rows={2}
                value={field.disclaimer_text || ''}
                onChange={e => handleFieldChange(idx, 'disclaimer_text', e.target.value)}
                placeholder="Enter disclaimer or help notes to be shown alongside this input element..."
                style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Options Panel for Choice Inputs */}
      {isOptionBased && (
        <div className="form-control-block field-subpanel options-panel">
          <label className="field-subpanel-label">Dynamic Node Choices Configuration (Comma separated values)</label>
          <input 
            type="text" 
            value={Array.isArray(field.options) ? field.options.join(', ') : (field.options || '')} 
            onChange={e => handleFieldChange(idx, 'options', e.target.value.split(',').map(s => s.trim()))} 
            placeholder="Option 1, Option 2, Option 3" 
          />
        </div>
      )}

      {/* Repeater Grid Columns Configuration Panel */}
      {isRepeaterBased && (
        <div className="form-control-block field-subpanel repeater-panel" style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label className="field-subpanel-label" style={{ marginBottom: 0 }}>
              <Layers size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
              Repeater Grid Columns Builder
            </label>
            <button
              type="button"
              onClick={handleAddSubField}
              style={{
                background: '#086078',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              <Plus size={14} /> Add Column
            </button>
          </div>

          {(!field.sub_fields || field.sub_fields.length === 0) ? (
            <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', margin: '8px 0' }}>
              No dynamic column headers defined for this grid yet. Click "Add Column" above to define table headers.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {field.sub_fields.map((sub, subIdx) => {
                const isSubLookup = sub.input_type === 'database_lookup';
                const availableSubFields = sub.lookup_form_code ? (repeaterLookupFieldsCache[sub.lookup_form_code] || []) : [];

                const subIsText = getSubIsText(sub.input_type);
                const subIsNum = getSubIsNum(sub.input_type);
                const subIsOption = getSubIsOption(sub.input_type);
                const subIsFile = getSubIsFile(sub.input_type);
                const subIsDate = getSubIsDate(sub.input_type);
                const subIsToggle = getSubIsToggle(sub.input_type);

                return (
                  <div key={subIdx} style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* Primary Row Controls */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 1.5fr 32px', gap: '8px', alignItems: 'center' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '2px' }}>Label</label>
                        <input
                          type="text"
                          placeholder="Column Header Label"
                          value={sub.label || ''}
                          onChange={(e) => handleSubFieldChange(subIdx, 'label', e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '2px' }}>Field Key</label>
                        <input
                          type="text"
                          placeholder="Column Key"
                          value={sub.field_key || ''}
                          disabled
                          style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f1f5f9' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '2px' }}>Input Type</label>
                        <select
                          value={sub.input_type || 'text'}
                          onChange={(e) => handleSubFieldChange(subIdx, 'input_type', e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        >
                          <optgroup label="Text Elements">
                            <option value="text">Short Text</option>
                            <option value="textarea">Textarea</option>
                            <option value="email">Email Address</option>
                            <option value="password">Password</option>
                            <option value="url">Web URL</option>
                          </optgroup>
                          <optgroup label="Numeric Systems">
                            <option value="number">Numeric Integer</option>
                            <option value="currency">Currency Unit</option>
                            <option value="percentage">Percentage (%)</option>
                          </optgroup>
                          <optgroup label="Selection Controls">
                            <option value="select">Dropdown Select</option>
                            <option value="database_lookup">Dynamic DB Lookup</option>
                            <option value="multi_select">Multi Select</option>
                            <option value="radio">Radio Group</option>
                            <option value="checkbox_group">Checkbox Group</option>
                            <option value="boolean_toggle">Boolean Toggle</option>
                          </optgroup>
                          <optgroup label="Temporal / Storage">
                            <option value="date">Date</option>
                            <option value="datetime">DateTime</option>
                            <option value="time">Time</option>
                            <option value="file">Document File</option>
                            <option value="image">Image Upload</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Options or Placeholder Control depending on field type */}
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '2px' }}>Configuration / Placeholder</label>
                        {subIsOption ? (
                          <input
                            type="text"
                            placeholder="Options (Comma-separated)"
                            value={Array.isArray(sub.options) ? sub.options.join(', ') : (sub.options || '')}
                            onChange={(e) => handleSubFieldChange(subIdx, 'options', e.target.value.split(',').map(s => s.trim()))}
                            style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        ) : isSubLookup ? (
                          <span style={{ fontSize: '11px', color: '#086078', fontWeight: '500' }}>
                            Configure DB Source Below ↓
                          </span>
                        ) : (
                          <input
                            type="text"
                            placeholder="Placeholder (Optional)"
                            value={sub.placeholder || ''}
                            onChange={(e) => handleSubFieldChange(subIdx, 'placeholder', e.target.value)}
                            style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        )}
                      </div>

                      <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubField(subIdx)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Remove Column"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Secondary Row for Repeater Column Database Lookup Configuration */}
                    {isSubLookup && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f1f5f9', padding: '8px', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '2px' }}>
                            Lookup Collection Source
                          </label>
                          <select
                            value={sub.lookup_form_code || ''}
                            onChange={(e) => {
                              handleSubFieldChange(subIdx, 'lookup_form_code', e.target.value);
                              handleSubFieldChange(subIdx, 'lookup_field_key', '');
                            }}
                            style={{ width: '100%', padding: '4px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff' }}
                          >
                            <option value="">-- Select Collection Source --</option>
                            {(availableForms || []).map(formItem => {
                              const code = formItem.form_code || formItem.code;
                              const name = formItem.form_name || formItem.name || code;
                              return (
                                <option key={code} value={code}>
                                  {name} ({code})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '2px' }}>
                            Source Field Property Mapping {loadingRepeaterLookups[subIdx] && <Loader2 size={10} className="spin-loader" style={{ display: 'inline', marginLeft: '4px' }} />}
                          </label>
                          <select
                            value={sub.lookup_field_key || ''}
                            onChange={(e) => handleSubFieldChange(subIdx, 'lookup_field_key', e.target.value)}
                            disabled={!sub.lookup_form_code || loadingRepeaterLookups[subIdx]}
                            style={{ width: '100%', padding: '4px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff' }}
                          >
                            <option value="">-- Select Value Key --</option>
                            <option value="_id">_id (MongoDB Unique Identifier)</option>
                            {availableSubFields.map(srcField => {
                              const key = typeof srcField === 'string' ? srcField : srcField.field_key;
                              const label = typeof srcField === 'string' ? srcField : (srcField.label || srcField.field_key);
                              if (key === '_id') return null;

                              return (
                                <option key={key || srcField._id} value={key}>
                                  {label} ({key})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Repeater Column Layout & Inline Alignment */}
                    <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LayoutGrid size={13} color="#086078" />
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155', textTransform: 'uppercase' }}>
                          Layout & Inline
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: '500', color: '#334155' }}>
                          <input 
                            type="checkbox" 
                            checked={sub.same_line || false} 
                            onChange={e => handleSubFieldChange(subIdx, 'same_line', e.target.checked)}
                            style={{ width: '13px', height: '13px', accentColor: '#086078', cursor: 'pointer' }}
                          />
                          Same Line (Inline)
                        </label>

                        {sub.same_line && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#64748b' }}>Group ID:</label>
                            <input
                              type="text"
                              value={sub.same_line_group || ''}
                              onChange={e => handleSubFieldChange(subIdx, 'same_line_group', e.target.value)}
                              placeholder="group_1"
                              style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '80px' }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: '#64748b' }}>Width Span:</label>
                          <select 
                            value={sub.grid_span || '12'} 
                            onChange={e => handleSubFieldChange(subIdx, 'grid_span', e.target.value)}
                            style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                          >
                            <option value="12">100% (Full Row Width)</option>
                            <option value="6">50% (1/2 Width)</option>
                            <option value="4">33.3% (1/3 Width)</option>
                            <option value="3">25% (1/4 Width)</option>
                            <option value="2">16.6% (1/6 Width)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Repeater Column Disclaimer / Help Notice */}
                    <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Info size={13} color="#086078" />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: '500', color: '#334155' }}>
                          <input
                            type="checkbox"
                            checked={sub.has_disclaimer || false}
                            onChange={e => handleSubFieldChange(subIdx, 'has_disclaimer', e.target.checked)}
                            style={{ width: '13px', height: '13px', accentColor: '#086078', cursor: 'pointer' }}
                          />
                          Include Disclaimer / Terms Notice
                        </label>
                      </div>

                      {sub.has_disclaimer && (
                        <textarea
                          rows={2}
                          value={sub.disclaimer_text || ''}
                          onChange={e => handleSubFieldChange(subIdx, 'disclaimer_text', e.target.value)}
                          placeholder="Enter disclaimer or help notes for this column..."
                          style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical' }}
                        />
                      )}
                    </div>

                    {/* Repeater Column Validations & Constraints */}
                    <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Column Validations & Constraints
                      </span>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '500', color: '#334155', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={sub.validations?.required || false} 
                            onChange={e => handleSubFieldChange(subIdx, 'validations.required', e.target.checked)} 
                            style={{ accentColor: '#086078' }}
                          />
                          Is Required
                        </label>

                        {subIsText && (
                          <>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Min Length</label>
                              <input 
                                type="number" 
                                value={sub.validations?.min_length ?? 0} 
                                onChange={e => handleSubFieldChange(subIdx, 'validations.min_length', parseInt(e.target.value) || 0)}
                                style={{ width: '100%', padding: '2px 4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Max Length</label>
                              <input 
                                type="number" 
                                value={sub.validations?.max_length ?? 255} 
                                onChange={e => handleSubFieldChange(subIdx, 'validations.max_length', parseInt(e.target.value) || 255)}
                                style={{ width: '100%', padding: '2px 4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                              />
                            </div>
                          </>
                        )}

                        {subIsNum && (
                          <>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Min Value</label>
                              <input 
                                type="number" 
                                value={sub.validations?.min_val ?? ''} 
                                onChange={e => handleSubFieldChange(subIdx, 'validations.min_val', e.target.value === '' ? null : Number(e.target.value))}
                                placeholder="No Min"
                                style={{ width: '100%', padding: '2px 4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Max Value</label>
                              <input 
                                type="number" 
                                value={sub.validations?.max_val ?? ''} 
                                onChange={e => handleSubFieldChange(subIdx, 'validations.max_val', e.target.value === '' ? null : Number(e.target.value))}
                                placeholder="No Max"
                                style={{ width: '100%', padding: '2px 4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                              />
                            </div>
                          </>
                        )}

                        {subIsFile && (
                          <>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Max File MB</label>
                              <input 
                                type="number" 
                                value={sub.validations?.max_file_size_mb ?? 5} 
                                onChange={e => handleSubFieldChange(subIdx, 'validations.max_file_size_mb', parseInt(e.target.value) || 5)}
                                style={{ width: '100%', padding: '2px 4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Allowed Ext.</label>
                              <input 
                                type="text" 
                                value={sub.validations?.allowed_file_types || '.pdf,.png,.jpg'} 
                                onChange={e => handleSubFieldChange(subIdx, 'validations.allowed_file_types', e.target.value)}
                                style={{ width: '100%', padding: '2px 4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                              />
                            </div>
                          </>
                        )}

                        {subIsDate && (
                          <div>
                            <label style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Timeline</label>
                            <select 
                              value={sub.validations?.date_restriction || 'none'} 
                              onChange={e => handleSubFieldChange(subIdx, 'validations.date_restriction', e.target.value)}
                              style={{ width: '100%', padding: '2px 4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                            >
                              <option value="none">Allow All</option>
                              <option value="past_only">Past Dates Only</option>
                              <option value="future_only">Future Dates Only</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Repeater Column Regex Validation */}
                      {subIsText && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Regex Pattern</label>
                            <input 
                              type="text" 
                              value={sub.validations?.regex_pattern || ''} 
                              onChange={e => handleSubFieldChange(subIdx, 'validations.regex_pattern', e.target.value)}
                              placeholder="e.g. ^[A-Z0-9]{8}$"
                              style={{ width: '100%', padding: '2px 4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'monospace' }} 
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Regex Error Message</label>
                            <input 
                              type="text" 
                              value={sub.validations?.regex_error_msg || ''} 
                              onChange={e => handleSubFieldChange(subIdx, 'validations.regex_error_msg', e.target.value)}
                              placeholder="Format error message"
                              style={{ width: '100%', padding: '2px 4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                            />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Toggle Output & Default Value Selector */}
      {isToggleBased && (
        <div className="mac-form-grid-2x field-subpanel toggle-panel">
          <div className="form-control-block">
            <label className="field-subpanel-label"><Sliders size={13}/> Toggle Output Value Standard</label>
            <select 
              value={field.toggle_format || 'boolean'} 
              onChange={e => handleToggleFormatChange(e.target.value)}
            >
              <option value="boolean">True / False (Boolean Type)</option>
              <option value="active_inactive">Active / Inactive (String Type)</option>
              <option value="yes_no">Yes / No (String Type)</option>
              <option value="numeric">1 / 0 (Numeric Type)</option>
            </select>
          </div>

          <div className="form-control-block">
            <label className="field-subpanel-label">Default Toggle Initial State</label>
            <select 
              value={getSelectedDefaultString()} 
              onChange={e => handleDefaultToggleChange(e.target.value)}
            >
              <option value="false">Off / Inactive / False / 0 (Default)</option>
              <option value="true">On / Active / True / 1</option>
            </select>
          </div>
        </div>
      )}

      {/* Top-Level Database Lookup Panel */}
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
              {(availableForms || []).map(formItem => {
                const code = formItem.form_code || formItem.code;
                const name = formItem.form_name || formItem.name || code;
                return (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                );
              })}
            </select>
          </div>
          
          <div className="form-control-block">
            <label className="field-subpanel-label">
              Source Property Key {isLoadingFields && <Loader2 size={12} className="spin-loader" style={{ display: 'inline', marginLeft: '5px' }} />}
            </label>
            <select 
              value={field.lookup_field_key || ''} 
              onChange={e => handleFieldChange(idx, 'lookup_field_key', e.target.value)} 
              disabled={!field.lookup_form_code || isLoadingFields}
            >
              <option value="">-- Choose Field Value Mapping Key --</option>
              <option value="_id">_id (MongoDB Unique Key Identifier)</option>
              {fetchedFormFields.map(srcField => {
                const key = typeof srcField === 'string' ? srcField : srcField.field_key;
                const label = typeof srcField === 'string' ? srcField : (srcField.label || srcField.field_key);
                if (key === '_id') return null;

                return (
                  <option key={key || srcField._id} value={key}>
                    {label} ({key})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* Dynamic Validation Controls Based on Input Type */}
      <div className="field-subpanel validations-panel">
        <span className="field-subpanel-label">STRUCTURAL INTEGRITY CONSTRAINTS & VALIDATIONS</span>
        
        <div className="mac-form-grid-3x validations-grid-3x">
          <div className="validations-checkbox-wrapper">
            <input 
              type="checkbox" 
              id={`req_${idx}`} 
              checked={field.validations?.required || false} 
              onChange={e => handleFieldChange(idx, 'validations.required', e.target.checked)} 
            />
            <label htmlFor={`req_${idx}`} className="validations-checkbox-label">Is Required Field</label>
          </div>

          {isTextBased && (
            <>
              <div className="form-control-block">
                <label className="validations-small-label">Min Character Bounds</label>
                <input type="number" value={field.validations?.min_length ?? 0} onChange={e => handleFieldChange(idx, 'validations.min_length', parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-control-block">
                <label className="validations-small-label">Max Character Boundary</label>
                <input type="number" value={field.validations?.max_length ?? 255} onChange={e => handleFieldChange(idx, 'validations.max_length', parseInt(e.target.value) || 255)} />
              </div>
            </>
          )}

          {isNumBased && (
            <>
              <div className="form-control-block">
                <label className="validations-small-label">Minimum Allowable Value</label>
                <input type="number" value={field.validations?.min_val ?? ''} onChange={e => handleFieldChange(idx, 'validations.min_val', e.target.value === '' ? null : Number(e.target.value))} placeholder="No Min Limit" />
              </div>
              <div className="form-control-block">
                <label className="validations-small-label">Maximum Allowable Value</label>
                <input type="number" value={field.validations?.max_val ?? ''} onChange={e => handleFieldChange(idx, 'validations.max_val', e.target.value === '' ? null : Number(e.target.value))} placeholder="No Max Limit" />
              </div>
            </>
          )}

          {isFileBased && (
            <>
              <div className="form-control-block">
                <label className="validations-small-label">Max File Size Boundary (MB)</label>
                <input type="number" value={field.validations?.max_file_size_mb ?? 5} onChange={e => handleFieldChange(idx, 'validations.max_file_size_mb', parseInt(e.target.value) || 5)} />
              </div>
              <div className="form-control-block">
                <label className="validations-small-label">Permitted Extensions Matrix</label>
                <input type="text" value={field.validations?.allowed_file_types || '.pdf,.png,.jpg'} onChange={e => handleFieldChange(idx, 'validations.allowed_file_types', e.target.value)} placeholder="e.g. .pdf,.csv" />
              </div>
            </>
          )}

          {isDateBased && (
            <div className="form-control-block">
              <label className="validations-small-label">Timeline Restriction</label>
              <select value={field.validations?.date_restriction || 'none'} onChange={e => handleFieldChange(idx, 'validations.date_restriction', e.target.value)}>
                <option value="none">Allow All Timeline Entries</option>
                <option value="past_only">Past Dates Only</option>
                <option value="future_only">Future Dates Only</option>
              </select>
            </div>
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
          {(systemRoles || []).map(role => (
            <label key={role} className="field-role-item">
              <input type="checkbox" checked={field.allowed_roles?.includes(role) || false} onChange={() => toggleRolePermission(idx, role)} /> {role}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}