import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const toggleCustomPage = async (req, res) => {
  try {
    const { form_code, form_name, sections = [], fields = [], create } = req.body;

    if (!form_code) {
      return res.status(400).json({ success: false, message: 'Missing form_code parameter' });
    }

    const cleanCode = form_code.trim().toLowerCase();
    const targetPath = path.join(__dirname, `../../client/src/pages/custom/${cleanCode}.jsx`);
    const componentName = form_code
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('') + 'CustomPage';

    if (create) {
      // Form default state initialization
      const initialFormState = fields.reduce((acc, f) => {
        acc[f.field_key] = f.input_type === 'checkbox' ? false : '';
        return acc;
      }, {});

      // Build field JSX strings
      const renderFieldsCode = fields.map(f => {
        const fieldKey = f.field_key;
        const label = f.label || f.field_key;
        const type = f.input_type || 'text';
        const isRequired = f.validations?.required ? 'required' : '';
        const optionsList = Array.isArray(f.options)
          ? f.options
          : (typeof f.options === 'string' ? f.options.split(',') : []);

        if (type === 'select') {
          return `
            <div className="form-group" style={{ marginBottom: '16px' }} key="${fieldKey}">
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                ${label} ${f.validations?.required ? '<span style={{ color: "red" }}>*</span>' : ''}
              </label>
              <select 
                name="${fieldKey}" 
                value={formData.${fieldKey} || ''} 
                onChange={handleChange} 
                ${isRequired} 
                className="form-control"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Select ${label}</option>
                ${optionsList.map(opt => `<option value="${opt.trim()}">${opt.trim()}</option>`).join('\n                ')}
              </select>
            </div>`;
        }

        if (type === 'textarea') {
          return `
            <div className="form-group" style={{ marginBottom: '16px' }} key="${fieldKey}">
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                ${label} ${f.validations?.required ? '<span style={{ color: "red" }}>*</span>' : ''}
              </label>
              <textarea 
                name="${fieldKey}" 
                value={formData.${fieldKey} || ''} 
                onChange={handleChange} 
                ${isRequired} 
                className="form-control" 
                rows={3} 
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>`;
        }

        if (type === 'checkbox') {
          return `
            <div className="form-group" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }} key="${fieldKey}">
              <input 
                type="checkbox" 
                name="${fieldKey}" 
                checked={Boolean(formData.${fieldKey})} 
                onChange={handleChange} 
                id="${fieldKey}"
              />
              <label htmlFor="${fieldKey}" style={{ fontWeight: 'bold' }}>
                ${label} ${f.validations?.required ? '<span style={{ color: "red" }}>*</span>' : ''}
              </label>
            </div>`;
        }

        return `
          <div className="form-group" style={{ marginBottom: '16px' }} key="${fieldKey}">
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
              ${label} ${f.validations?.required ? '<span style={{ color: "red" }}>*</span>' : ''}
            </label>
            <input 
              type="${type}" 
              name="${fieldKey}" 
              value={formData.${fieldKey} || ''} 
              onChange={handleChange} 
              ${isRequired} 
              className="form-control" 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>`;
      }).join('\n');

      // Standalone React File Template
      const fileContent = `import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { AUTH_ENDPOINTS } from '../../config/api';

/**
 * Standalone Custom Page Component for Form Code: ${form_code}
 * Label: ${form_name}
 * Path: client/src/pages/custom/${cleanCode}.jsx
 */
export default function ${componentName}() {
  const [formData, setFormData] = useState(${JSON.stringify(initialFormState, null, 4)});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(\`\${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/forms/submit/${form_code}\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ type: 'success', message: 'Record saved successfully!' });
      } else {
        setStatus({ type: 'error', message: data.message || 'Error processing request.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Submission failed: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="custom-page-container" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div className="custom-page-header" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <h2>${form_name} Workspace</h2>
      </div>

      <form onSubmit={handleSubmit} className="custom-form-layout">
        ${renderFieldsCode}

        {status && (
          <div className={\`alert alert-\${status.type === 'success' ? 'success' : 'danger'}\`} style={{ marginTop: '15px', padding: '10px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#d4edda' : '#f8d7da', color: status.type === 'success' ? '#155724' : '#721c24' }}>
            {status.message}
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            <Save size={16} /> {isSubmitting ? 'Saving...' : 'Submit Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
`;

      fs.writeFileSync(targetPath, fileContent, 'utf-8');
      return res.json({ success: true, message: `Successfully created standalone page at client/src/pages/custom/${cleanCode}.jsx` });
    } else {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      return res.json({ success: true, message: `Removed custom page at ${targetPath}` });
    }
  } catch (err) {
    console.error("Custom page operation failed:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const checkCustomPageExists = async (req, res) => {
  try {
    const { form_code } = req.params;
    const cleanCode = form_code.trim().toLowerCase();
    const targetPath = path.join(__dirname, `../../client/src/pages/custom/${cleanCode}.jsx`);
    return res.json({ success: true, exists: fs.existsSync(targetPath) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};