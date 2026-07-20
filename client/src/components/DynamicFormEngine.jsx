import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { AUTH_ENDPOINTS } from '../config/api';

export default function DynamicFormEngine({ formCode, onSubmissionComplete }) {
  const [formConfig, setFormConfig] = useState(null);
  const [formData, setFormData] = useState({});
  const [systemCreds, setSystemCreds] = useState({ username: '', email: '', password: '' });
  const [empCode, setEmpCode] = useState('');
  const [uiErrors, setUiErrors] = useState({});
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    
    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/${formCode}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        // If the backend wraps the document schema inside a 'data' block or returns it directly:
        const targetData = data.data || data;
        setFormConfig(targetData);
        
        const initial = {};
        targetData.fields?.forEach(f => { initial[f.field_key] = f.default_value || ''; });
        setFormData(initial);
      })
      .catch(err => console.error("Error streaming blueprint matrix:", err));
  }, [formCode]);

  const handleDynamicChange = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
    if (uiErrors[key]) setUiErrors(prev => ({ ...prev, [key]: null }));
  };

  const executeFormSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setUiErrors({});

    const compositePayload = {
      employee_code: empCode,
      form_code: formCode,
      system_credentials: systemCreds,
      dynamic_fields_payload: formData
    };

    try {
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/employees/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compositePayload)
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('Workforce Profile Node & System Access Privileges Synchronized Successfully.');
        if (onSubmissionComplete) onSubmissionComplete();
      } else {
        setUiErrors(data.errors || { general: data.message });
      }
    } catch (err) {
      setUiErrors({ general: err.message });
    } finally {
      setProcessing(false);
    }
  };

  if (!formConfig) return <div className="p-4 flex items-center gap-2"><Loader2 className="animate-spin"/> Streaming Form Architecture Elements...</div>;

  return (
    <form onSubmit={executeFormSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-xl font-bold border-b pb-2 text-slate-800">{formConfig.form_name}</h2>
      
      {uiErrors.general && (
        <div className="bg-red-50 text-red-700 p-3 rounded flex items-center gap-2"><AlertCircle size={16}/>{uiErrors.general}</div>
      )}

      {/* SECTION 1: CORE SEED CRITICAL IDENTIFIERS */}
      <div className="bg-slate-50 p-4 rounded-md space-y-4">
        <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider">System Core Assignment Indices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Employee Code *</label>
            <input type="text" value={empCode} onChange={e => setEmpCode(e.target.value)} required className="w-full border p-2 rounded" placeholder="EMP-2026-X1" />
          </div>
        </div>
      </div>

      {/* SECTION 2: AUTO GENERATED DYNAMIC FORM ATTRIBUTES FIELDS */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Form Field Schema Variables</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formConfig.fields?.map(field => (
            <div key={field.field_key} className="flex flex-col">
              <label className="text-sm font-medium mb-1">
                {field.label} {field.validations?.required && <span className="text-red-500">*</span>}
              </label>
              
              {field.input_type === 'select' ? (
                <select 
                  value={formData[field.field_key]} 
                  onChange={e => handleDynamicChange(field.field_key, e.target.value)}
                  className="border p-2 rounded bg-white"
                >
                  <option value="">-- Choose Option Matrix --</option>
                  {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input 
                  type={field.input_type} 
                  value={formData[field.field_key] || ''} 
                  onChange={e => handleDynamicChange(field.field_key, e.target.value)}
                  className={`border p-2 rounded ${uiErrors[field.field_key] ? 'border-red-500 bg-red-50' : ''}`}
                />
              )}
              {uiErrors[field.field_key] && <span className="text-xs text-red-600 mt-1">{uiErrors[field.field_key]}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: AUTOMATED INSTANT USER MANAGEMENT PROVISION CREDENTIALS LAYOUT */}
      <div className="bg-blue-50 p-4 rounded-md space-y-4 border border-blue-100">
        <h3 className="text-sm font-semibold uppercase text-blue-700 tracking-wider flex items-center gap-1"><ShieldCheck size={16}/> Direct Core Identity Access Provisioning</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">System Account Username *</label>
            <input type="text" required value={systemCreds.username} onChange={e => setSystemCreds(p => ({ ...p, username: e.target.value }))} className="w-full border p-2 rounded bg-white" placeholder="Identity login string" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Corporate Email Secure Address *</label>
            <input type="email" required value={systemCreds.email} onChange={e => setSystemCreds(p => ({ ...p, email: e.target.value }))} className="w-full border p-2 rounded bg-white" placeholder="name@company.com" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Access Passphrase Sequence *</label>
            <input type="password" required value={systemCreds.password} onChange={e => setSystemCreds(p => ({ ...p, password: e.target.value }))} className="w-full border p-2 rounded bg-white" placeholder="••••••••" />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded shadow transition-all">
          {processing ? 'Processing Record Frameworks...' : 'Commit Record and Sprout Nodes'}
        </button>
      </div>
    </form>
  );
}