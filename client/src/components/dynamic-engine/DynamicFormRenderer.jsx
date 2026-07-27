import React, { useState, useEffect } from 'react';
import { Save, Briefcase, FileText, Loader2, Plus, Trash2, Info } from 'lucide-react';
import '../../styles/DynamicFormRenderer.css';
import { AUTH_ENDPOINTS } from '../../config/api';

// Icon map to cleanly render dynamic headers
const iconMap = {
  Briefcase: <Briefcase size={20} style={{ color: '#2563eb' }} />,
  FileText: <FileText size={20} style={{ color: '#2563eb' }} />
};

export default function DynamicFormRenderer({ schema: initialSchema, formCode, recordId, onSaveSuccess }) {
  const [schema, setSchema] = useState(initialSchema || null);
  const [schemaLoading, setSchemaLoading] = useState(!initialSchema && Boolean(formCode));
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookupOptions, setLookupOptions] = useState({});
  const [loadingLookups, setLoadingLookups] = useState({});

  // 0. Fetch schema metadata automatically if formCode is provided without initialSchema
  useEffect(() => {
    if (initialSchema) {
      setSchema(initialSchema);
      setSchemaLoading(false);
      return;
    }

    if (formCode) {
      setSchemaLoading(true);
      const token = localStorage.getItem('accessToken');
      const normalizedCode = formCode.trim().toUpperCase().replace(/-/g, '_');

      fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/${normalizedCode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setSchema(data);
        })
        .catch(err => {
          console.error("Error retrieving custom form schema blueprint:", err);
        })
        .finally(() => {
          setSchemaLoading(false);
        });
    }
  }, [initialSchema, formCode]);

  // 1. Load initial values or existing record values
  useEffect(() => {
    if (!schema || !schema.form_code) return;

    if (recordId) {
      const token = localStorage.getItem('accessToken');
      fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/collections/${schema.form_code.toLowerCase()}/${recordId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setFormData(data.record || {}))
        .catch(err => console.error("Error reading operational data block:", err));
    } else {
      const initial = {};
      (schema.fields || []).forEach(f => {
        if (f.input_type === 'repeater') {
          // Initialize repeater with 1 empty row entry
          const emptyRow = {};
          (f.sub_fields || []).forEach(sub => { emptyRow[sub.field_key] = ''; });
          initial[f.field_key] = [emptyRow];
        } else if (f.input_type === 'checkbox_group' || f.input_type === 'multi_select') {
          initial[f.field_key] = [];
        } else if (f.input_type === 'boolean_toggle') {
          initial[f.field_key] = f.default_value !== undefined ? Boolean(f.default_value) : false;
        } else {
          initial[f.field_key] = f.default_value || '';
        }
      });
      setFormData(initial);
    }
  }, [schema, recordId]);

  // 2. Fetch options for dynamic DB Lookup fields (Main Form & Repeater Sub-fields)
  useEffect(() => {
    if (!schema || !schema.fields) return;

    const lookupsToFetch = [];

    (schema.fields || []).forEach(f => {
      if (!f.is_active) return;

      // Top-level lookup
      if (f.input_type === 'database_lookup' && f.lookup_form_code) {
        lookupsToFetch.push({
          key: f.field_key,
          lookup_form_code: f.lookup_form_code,
          lookup_field_key: f.lookup_field_key
        });
      }

      // Repeater sub-field lookups
      if (f.input_type === 'repeater' && Array.isArray(f.sub_fields)) {
        f.sub_fields.forEach(sub => {
          if (sub.input_type === 'database_lookup' && sub.lookup_form_code) {
            lookupsToFetch.push({
              key: sub.field_key,
              lookup_form_code: sub.lookup_form_code,
              lookup_field_key: sub.lookup_field_key
            });
          }
        });
      }
    });

    lookupsToFetch.forEach(field => {
      const { key, lookup_form_code, lookup_field_key } = field;
      setLoadingLookups(prev => ({ ...prev, [key]: true }));

      const token = localStorage.getItem('accessToken');
      fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/collections/${lookup_form_code.toLowerCase()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const records = data.records || data.data || (Array.isArray(data) ? data : []);

          const parsedOptions = records.map(rec => ({
            id: rec._id || rec.id,
            value: lookup_field_key && rec[lookup_field_key] !== undefined ? rec[lookup_field_key] : (rec._id || rec.id),
            label: lookup_field_key && rec[lookup_field_key] !== undefined ? String(rec[lookup_field_key]) : (rec.name || rec.title || rec._id)
          }));

          setLookupOptions(prev => ({ ...prev, [key]: parsedOptions }));
        })
        .catch(err => console.error(`Error loading lookup data for ${key}:`, err))
        .finally(() => {
          setLoadingLookups(prev => ({ ...prev, [key]: false }));
        });
    });
  }, [schema]);

  const handleInputChange = (fieldKey, value) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
  };

  // --- REPEATER TABLE HANDLERS ---
  const handleAddRepeaterRow = (fieldKey, subFields) => {
    const emptyRow = {};
    (subFields || []).forEach(sub => { emptyRow[sub.field_key] = ''; });

    setFormData(prev => ({
      ...prev,
      [fieldKey]: [...(prev[fieldKey] || []), emptyRow]
    }));
  };

  const handleRemoveRepeaterRow = (fieldKey, index) => {
    setFormData(prev => {
      const updatedList = [...(prev[fieldKey] || [])];
      updatedList.splice(index, 1);
      return { ...prev, [fieldKey]: updatedList };
    });
  };

  const handleRepeaterCellChange = (fieldKey, index, subFieldKey, value) => {
    setFormData(prev => {
      const updatedList = [...(prev[fieldKey] || [])];
      updatedList[index] = {
        ...updatedList[index],
        [subFieldKey]: value
      };
      return { ...prev, [fieldKey]: updatedList };
    });
  };

  const handleFormSubmission = async (e) => {
    e.preventDefault();
    if (!schema || !schema.form_code) return;

    setIsSubmitting(true);
    const token = localStorage.getItem('accessToken');
    const endpoint = recordId 
      ? `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/collections/${schema.form_code.toLowerCase()}/${recordId}`
      : `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/collections/${schema.form_code.toLowerCase()}/create`;

    try {
      const response = await fetch(endpoint, {
        method: recordId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        if (onSaveSuccess) onSaveSuccess();
      }
    } catch (err) {
      console.error("Data ingestion failure:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to standardise string/array options from schema
  const normalizeOptions = (rawOptions) => {
    if (Array.isArray(rawOptions)) return rawOptions;
    if (typeof rawOptions === 'string' && rawOptions.trim() !== '') {
      return rawOptions.split(',').map(item => item.trim());
    }
    return [];
  };

  // Conditional rule checker
  const isFieldVisible = (field) => {
    if (!field.conditional_show) return true;
    const { field_key, value } = field.conditional_show;
    return formData[field_key] === value;
  };

  // Helper to render Repeater Table Inputs based on sub_field input_type
  const renderRepeaterCellInput = (field_key, rowIndex, row, sub) => {
    const cellValue = row[sub.field_key] !== undefined ? row[sub.field_key] : '';

    switch (sub.input_type) {
      case 'database_lookup':
        return (
          <select
            value={cellValue}
            disabled={loadingLookups[sub.field_key]}
            onChange={e => handleRepeaterCellChange(field_key, rowIndex, sub.field_key, e.target.value)}
          >
            <option value="">
              {loadingLookups[sub.field_key] ? 'Loading...' : `-- Select ${sub.label} --`}
            </option>
            {(lookupOptions[sub.field_key] || []).map(opt => (
              <option key={opt.id} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'select':
      case 'radio':
      case 'checkbox_group':
      case 'multi_select': {
        const cellOptions = normalizeOptions(sub.options);
        return (
          <select
            value={cellValue}
            onChange={e => handleRepeaterCellChange(field_key, rowIndex, sub.field_key, e.target.value)}
          >
            <option value="">--Select--</option>
            {cellOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }

      case 'boolean_toggle':
        return (
          <div className="toggle-switch-container" style={{ margin: 0, justifyContent: 'center' }}>
            <label className="toggle-switch" style={{ transform: 'scale(0.8)' }}>
              <input
                type="checkbox"
                checked={Boolean(cellValue)}
                onChange={e => handleRepeaterCellChange(field_key, rowIndex, sub.field_key, e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        );

      case 'date':
      case 'datetime':
      case 'time':
        return (
          <input
            type={sub.input_type === 'datetime' ? 'datetime-local' : sub.input_type}
            value={cellValue}
            onChange={e => handleRepeaterCellChange(field_key, rowIndex, sub.field_key, e.target.value)}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={cellValue}
            placeholder={sub.label}
            onChange={e => handleRepeaterCellChange(field_key, rowIndex, sub.field_key, e.target.value)}
          />
        );

      case 'number':
      case 'currency':
      case 'percentage':
        return (
          <input
            type="number"
            value={cellValue}
            placeholder={sub.label}
            onChange={e => handleRepeaterCellChange(field_key, rowIndex, sub.field_key, e.target.value)}
          />
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            value={cellValue}
            placeholder={sub.label}
            onChange={e => handleRepeaterCellChange(field_key, rowIndex, sub.field_key, e.target.value)}
          />
        );
    }
  };

  if (schemaLoading) {
    return <div style={{ padding: '30px', textAlign: 'center' }}>Loading Form Schema...</div>;
  }

  if (!schema) {
    return <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>Unable to load form configuration blueprint.</div>;
  }

  return (
    <div className="workspace-card-wrapper">
      {/* Dynamic Embedded CSS Styles */}
      <style>{`
        /* DYNAMIC 12-COLUMN GRID SYSTEM */
        .mac-form-grid-12x {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 16px;
          align-items: start;
        }

        .grid-span-12 { grid-column: span 12; }
        .grid-span-11 { grid-column: span 11; }
        .grid-span-10 { grid-column: span 10; }
        .grid-span-9  { grid-column: span 9; }
        .grid-span-8  { grid-column: span 8; }
        .grid-span-7  { grid-column: span 7; }
        .grid-span-6  { grid-column: span 6; }
        .grid-span-5  { grid-column: span 5; }
        .grid-span-4  { grid-column: span 4; }
        .grid-span-3  { grid-column: span 3; }
        .grid-span-2  { grid-column: span 2; }
        .grid-span-1  { grid-column: span 1; }

        @media (max-width: 768px) {
          .mac-form-grid-12x {
            grid-template-columns: repeat(1, 1fr);
          }
          .grid-span-12, .grid-span-11, .grid-span-10, .grid-span-9,
          .grid-span-8, .grid-span-7, .grid-span-6, .grid-span-5,
          .grid-span-4, .grid-span-3, .grid-span-2, .grid-span-1 {
            grid-column: span 1 / -1;
          }
        }

        /* FIELD DISCLAIMER STYLING */
        .field-disclaimer-box {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          font-size: 0.78rem;
          color: #64748b;
        }

        /* TOGGLE SWITCH STYLING */
        .toggle-switch-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 6px;
          user-select: none;
        }
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 26px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #cbd5e1;
          transition: .3s;
          border-radius: 26px;
        }
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        input:checked + .toggle-slider {
          background-color: #2563eb;
        }
        input:checked + .toggle-slider:before {
          transform: translateX(22px);
        }
        .toggle-status-label {
          font-weight: 600;
          font-size: 0.9rem;
          color: #334155;
        }

        /* REPEATER / ROW-BASED TABLE STYLES */
        .repeater-table-container {
          width: 100%;
          overflow-x: auto;
          margin-top: 10px;
          border: 1px solid #086078;
          border-radius: 2px;
        }
        .repeater-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }
        .repeater-table th {
          background-color: #086078;
          color: #ffffff;
          padding: 10px 8px;
          border: 1px solid #064b5e;
          text-align: center;
          font-weight: 600;
        }
        .repeater-table td {
          padding: 8px 6px;
          border: 1px solid #d1d5db;
          vertical-align: middle;
          background-color: #ffffff;
        }
        .repeater-table input, .repeater-table select {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #cccccc;
          border-radius: 3px;
          box-sizing: border-box;
          font-size: 0.82rem;
          outline: none;
        }
        .repeater-btn-add, .repeater-btn-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .repeater-btn-remove {
          background-color: #ef4444;
        }
        .repeater-info-banner {
          color: #dc2626;
          font-size: 0.88rem;
          font-weight: 500;
          margin-top: 12px;
          margin-bottom: 8px;
        }
      `}</style>

      {/* PROFESSIONAL FORM HEADER */}
      <header className="form-structural-header">
        <div className="icon-container">
          {iconMap[schema.form_icon] || <Briefcase size={20} style={{ color: '#2563eb' }} />}
        </div>
        <div>
          <h2>{schema.form_name || 'Dynamic Data Sheet'}</h2>
          <p>{recordId ? 'Modify and update workspace profile fields' : 'Complete below details'}</p>
        </div>
      </header>

      <form onSubmit={handleFormSubmission}>
        {/* SCROLL VIEWPORT WRAPPER */}
        <div className="form-scroll-viewport">
          {/* DYNAMIC 12-COLUMN RESPONSIVE LAYOUT GRID */}
          <div className="mac-form-grid-12x">
            {(schema.fields || [])
              .filter(f => (f.is_active !== false) && isFieldVisible(f))
              .map((field) => {
                const { 
                  field_key, 
                  label, 
                  input_type, 
                  options, 
                  validations, 
                  sub_fields, 
                  banner_note,
                  grid_span,
                  grid_width_span,
                  has_disclaimer,
                  disclaimer_text
                } = field;

                // Compute standard grid span
                const computedSpan = grid_span || grid_width_span || (['textarea', 'repeater'].includes(input_type) ? '12' : '12');
                const spanClass = `grid-span-${computedSpan}`;
                const parsedOptions = normalizeOptions(options);

                // --- REPEATER TABLE TYPE ---
                if (input_type === 'repeater') {
                  const rows = formData[field_key] || [];

                  return (
                    <div key={field_key} className={`form-control-block ${spanClass}`}>
                      {banner_note && (
                        <div className="repeater-info-banner">{banner_note}</div>
                      )}
                      
                      <div className="repeater-table-container">
                        <table className="repeater-table">
                          <thead>
                            <tr>
                              {(sub_fields || []).map(sub => (
                                <th key={sub.field_key}>{sub.label}</th>
                              ))}
                              <th>Click (+) icon to add more positions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {(sub_fields || []).map(sub => (
                                  <td key={sub.field_key}>
                                    {renderRepeaterCellInput(field_key, rowIndex, row, sub)}
                                  </td>
                                ))}
                                <td style={{ textAlign: 'center', width: '70px' }}>
                                  {rowIndex === rows.length - 1 ? (
                                    <button
                                      type="button"
                                      className="repeater-btn-add"
                                      onClick={() => handleAddRepeaterRow(field_key, sub_fields)}
                                    >
                                      <Plus size={16} />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="repeater-btn-remove"
                                      onClick={() => handleRemoveRepeaterRow(field_key, rowIndex)}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                // --- STANDARD FIELD TYPES WITH DYNAMIC SPAN & DISCLAIMER SUPPORT ---
                return (
                  <div key={field_key} className={`form-control-block ${spanClass}`}>
                    <label>
                      {label} 
                      {validations?.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                    </label>
                    
                    {/* FIELD TYPE ROUTER */}

                    {/* 1. BOOLEAN TOGGLE SWITCH */}
                    {input_type === 'boolean_toggle' ? (
                      <div className="toggle-switch-container">
                        <label className="toggle-switch">
                          <input 
                            type="checkbox"
                            checked={Boolean(formData[field_key])}
                            onChange={e => handleInputChange(field_key, e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                        <span className="toggle-status-label">
                          {formData[field_key] ? 'Active / True' : 'Inactive / False'}
                        </span>
                      </div>

                    /* 2. TEXTAREA */
                    ) : input_type === 'textarea' ? (
                      <textarea 
                        value={formData[field_key] || ''} 
                        required={validations?.required}
                        minLength={validations?.min_length || undefined}
                        maxLength={validations?.max_length || undefined}
                        onChange={e => handleInputChange(field_key, e.target.value)}
                        rows={4}
                      />

                    /* 3. DYNAMIC DATABASE LOOKUP DROPDOWN */
                    ) : input_type === 'database_lookup' ? (
                      <div style={{ position: 'relative' }}>
                        <select
                          value={formData[field_key] || ''}
                          required={validations?.required}
                          disabled={loadingLookups[field_key]}
                          onChange={e => handleInputChange(field_key, e.target.value)}
                        >
                          <option value="">
                            {loadingLookups[field_key] ? 'Loading choices...' : `-- Select ${label} --`}
                          </option>
                          {(lookupOptions[field_key] || []).map(opt => (
                            <option key={opt.id} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {loadingLookups[field_key] && (
                          <Loader2 
                            size={14} 
                            className="spin-loader" 
                            style={{ position: 'absolute', right: '12px', top: '35%', pointerEvents: 'none' }} 
                          />
                        )}
                      </div>

                    /* 4. STATIC DROPDOWNS & SELECTION CONTROLS */
                    ) : ['select', 'radio', 'checkbox_group', 'multi_select'].includes(input_type) ? (
                      <select 
                        value={formData[field_key] || ''} 
                        required={validations?.required}
                        onChange={e => handleInputChange(field_key, e.target.value)}
                      >
                        <option value="">-- Choose Option --</option>
                        {parsedOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>

                    /* 5. FILE & IMAGE UPLOADS */
                    ) : ['file', 'image'].includes(input_type) ? (
                      <div className="file-upload-wrapper">
                        <input 
                          type="file"
                          accept={input_type === 'image' ? 'image/*' : (validations?.allowed_file_types || '*')}
                          onChange={e => handleInputChange(field_key, e.target.files[0]?.name || '')}
                        />
                      </div>

                    /* 6. TEMPORAL PICKERS (Date, DateTime, Time) */
                    ) : ['date', 'datetime', 'time', 'date_range'].includes(input_type) ? (
                      <input 
                        type={input_type === 'datetime' ? 'datetime-local' : input_type === 'date_range' ? 'text' : input_type}
                        value={formData[field_key] || ''}
                        required={validations?.required}
                        placeholder={input_type === 'date_range' ? 'YYYY-MM-DD to YYYY-MM-DD' : ''}
                        onChange={e => handleInputChange(field_key, e.target.value)}
                      />

                    /* 7. TEXT / NUMERIC / OTHER STANDARD INPUT TYPES */
                    ) : (
                      <input 
                        type={['currency', 'percentage', 'number'].includes(input_type) ? 'number' : input_type}
                        value={formData[field_key] || ''}
                        required={validations?.required}
                        minLength={validations?.min_length || undefined}
                        maxLength={validations?.max_length || undefined}
                        pattern={validations?.regex_pattern || undefined}
                        onChange={e => handleInputChange(field_key, e.target.value)}
                      />
                    )}

                    {/* FIELD DISCLAIMER RENDERER */}
                    {has_disclaimer && disclaimer_text && (
                      <div className="field-disclaimer-box">
                        <Info size={13} />
                        <span>{disclaimer_text}</span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* ALIGNED FOOTER ACTION AREA */}
        <footer>
          <button 
            type="submit" 
            className="mac-btn-action primary" 
            disabled={isSubmitting}
          >
            <Save size={15}/> {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </footer>
      </form>
    </div>
  );
}