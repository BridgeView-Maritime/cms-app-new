import React, { useState, useEffect } from 'react';
import { Save, Briefcase, FileText, HelpCircle } from 'lucide-react';
import '../../styles/DynamicFormRenderer.css';
import { AUTH_ENDPOINTS } from '../config/api';

// Simple map to cleanly match string values to dynamic dashboard icons
const iconMap = {
  Briefcase: <Briefcase size={20} style={{ color: '#2563eb' }} />,
  FileText: <FileText size={20} style={{ color: '#2563eb' }} />
};

export default function DynamicFormRenderer({ schema, recordId, onSaveSuccess }) {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
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
      schema.fields.forEach(f => {
        initial[f.field_key] = f.input_type === 'checkbox_group' || f.input_type === 'multi_select' ? [] : '';
      });
      setFormData(initial);
    }
  }, [schema, recordId]);

  const handleInputChange = (fieldKey, value) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleFormSubmission = async (e) => {
    e.preventDefault();
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

  return (
    <div className="workspace-card-wrapper">
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
        {/* ADDED SCROLL VIEWPORT WRAPPER TO PREVENT OUTSIDE SPILLS */}
        <div className="form-scroll-viewport">
          {/* INPUT LAYOUT GRID */}
          <div className="mac-form-grid-2x">
            {schema.fields.filter(f => f.is_active).map((field) => {
              const { field_key, label, input_type, options, validations } = field;
              const isFullWidth = input_type === 'textarea';

              return (
                <div 
                  key={field_key} 
                  className={`form-control-block ${isFullWidth ? 'full-width' : ''}`}
                >
                  <label>
                    {label} 
                    {validations?.required && <span>*</span>}
                  </label>
                  
                  {/* FIELD TYPE ROUTER */}
                  {input_type === 'textarea' ? (
                    <textarea 
                      value={formData[field_key] || ''} 
                      required={validations?.required}
                      onChange={e => handleInputChange(field_key, e.target.value)}
                    />
                  ) : ['select', 'radio', 'checkbox_group', 'multi_select'].includes(input_type) ? (
                    <select 
                      style={{ appearance: 'none', backgroundPosition: 'right 12px center' }}
                      value={formData[field_key] || ''} 
                      required={validations?.required}
                      onChange={e => handleInputChange(field_key, e.target.value)}
                    >
                      <option value="">-- Choose Option --</option>
                      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : input_type === 'file' ? (
                    <div className="file-upload-wrapper">
                      <input 
                        type="file"
                        accept={validations?.allowed_file_types || '*'}
                        onChange={e => handleInputChange(field_key, e.target.files[0]?.name || '')}
                      />
                    </div>
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
            <Save size={15}/> {isSubmitting ? 'Save...' : 'Save'}
          </button>
        </footer>
      </form>
    </div>
  );
}