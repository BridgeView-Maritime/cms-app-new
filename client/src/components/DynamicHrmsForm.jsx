import React, { useState, useEffect } from 'react';

export default function DynamicHrmsForm({ formCode }) {
  const [meta, setMeta] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({});
  const [systemCreds, setSystemCreds] = useState({ username: '', email: '', password: '' });
  const [empCode, setEmpCode] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    // Corrected path location context from '/api/employees/meta/form/' to matching admin routes structure:
    fetch(`/api/admin/metadata/form/${formCode}`, { headers })
      .then(res => res.json())
      .then(data => {
        const targetData = data.data || data;
        setMeta(targetData);
        
        const defaults = {};
        targetData.fields?.forEach(f => { defaults[f.field_key] = ''; });
        setFormData(defaults);
        setLoading(false);
      })
      .catch(err => console.error("Error pulling form blueprint layout:", err));
  }, [formCode]);

  // Handle dynamic form alterations mapping logic
  const handleFieldChange = (key, val) => {
    setFormData(prev => {
      const updated = { ...prev, [key]: val };
      
      // Auto credential validation generation updates loop
      if (key === 'first_name' || key === 'last_name') {
        const fName = (updated.first_name || '').toLowerCase().trim();
        const lName = (updated.last_name || '').toLowerCase().trim();
        if (fName) {
          setSystemCreds({
            username: `${fName}${lName ? '.' + lName : '2026'}`,
            email: `${fName}@bridgeviewmaritime.com`,
            password: `${fName}@123`
          });
        }
      }
      return updated;
    });
  };

  const submitHRMSForm = async (e) => {
    e.preventDefault();
    setErrors({});

    const submissionPayload = {
      employee_code: empCode,
      form_code: formCode,
      system_credentials: systemCreds,
      dynamic_fields_payload: formData
    };

    try {
      const res = await fetch('/api/employees/register-dynamic', {
        method: 'POST',
        headers,
        body: JSON.stringify(submissionPayload)
      });
      const result = await res.json();

      if (result.success) {
        alert('Success! Employee identity registered and login parameters spawned.');
        setEmpCode('');
        const cleared = {};
        meta.fields?.forEach(f => { cleared[f.field_key] = ''; });
        setFormData(cleared);
        setSystemCreds({ username: '', email: '', password: '' });
      } else {
        setErrors(result.errors || { general: result.message });
      }
    } catch (err) {
      setErrors({ general: 'Network delivery breakdown sending transaction.' });
    }
  };

  if (loading) return <div className="p-6 text-center text-sm text-slate-500 font-medium">Loading Dynamic Layout Blueprint Grid Matrices...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col max-w-5xl mx-auto border border-slate-200">
      <div className="bg-slate-800 text-white p-4">
        <h2 className="text-base font-bold tracking-wide uppercase text-slate-100">{meta?.form_name || 'Dynamic HR Registry Workspace'}</h2>
      </div>

      {/* Tabs Layout matching existing design schema structure view */}
      <div className="flex bg-slate-50 border-b border-slate-200">
        <button type="button" onClick={() => setActiveTab('personal')} className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'personal' ? 'bg-white border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
          Locations & Contact
        </button>
        <button type="button" onClick={() => setActiveTab('employment')} className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'employment' ? 'bg-white border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
          Core HR & Contracts
        </button>
      </div>

      <form onSubmit={submitHRMSForm} className="p-6 space-y-6">
        {errors.general && (
          <div className="text-xs bg-red-50 border border-red-200 p-3 rounded text-red-600 font-medium">
            {errors.general}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Employee Identifier Code *</label>
            <input type="text" required value={empCode} onChange={e => setEmpCode(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500" placeholder="EMP-2026-001" />
          </div>
        </div>

        {/* Dynamic Mapping Matrix Viewports */}
        <div className="grid grid-cols-3 gap-4">
          {meta?.fields?.filter(f => f.section === activeTab).map(field => (
            <div key={field.field_key} className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600 mb-1">
                {field.label} {field.validations?.required && <span className="text-red-500">*</span>}
              </label>
              {field.input_type === 'select' ? (
                <select value={formData[field.field_key] || ''} onChange={e => handleFieldChange(field.field_key, e.target.value)} className="p-2 border border-slate-300 rounded bg-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">-- Choose Option --</option>
                  {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={field.input_type} value={formData[field.field_key] || ''} onChange={e => handleFieldChange(field.field_key, e.target.value)} className="p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500" />
              )}
              {errors[field.field_key] && <span className="text-xs text-red-500 mt-1 font-medium">{errors[field.field_key]}</span>}
            </div>
          ))}
        </div>

        {/* Credentials Generation Monitoring Panel */}
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h4 className="text-xs font-bold uppercase text-blue-700 tracking-wider mb-2">Automated Identity Login Provisions</h4>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div><span className="text-slate-500 block mb-0.5 font-medium">Username Handle</span> <span className="text-slate-800 font-mono font-bold bg-white px-2 py-1 border rounded block">{systemCreds.username || '(Awaiting First Name Input)'}</span></div>
            <div><span className="text-slate-500 block mb-0.5 font-medium">Email Channel</span> <span className="text-slate-800 font-mono font-bold bg-white px-2 py-1 border rounded block">{systemCreds.email || '(Awaiting First Name Input)'}</span></div>
            <div><span className="text-slate-500 block mb-0.5 font-medium">Password Sequence</span> <span className="text-slate-800 font-mono font-bold bg-white px-2 py-1 border rounded block">{systemCreds.password ? '•••••••• (Fixed Default Active)' : '(Awaiting Data)'}</span></div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all">
            Save Record & Auto Provision Account
          </button>
        </div>
      </form>
    </div>
  );
}