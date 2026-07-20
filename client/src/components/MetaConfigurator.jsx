import React, { useState, useEffect } from 'react';
import { AUTH_ENDPOINTS } from '../config/api';
export default function MetaConfigurator() {
  const [fields, setFields] = useState([]);
  const [newField, setNewField] = useState({ field_key: '', label: '', input_type: 'text', section: 'personal', optionsString: '', required: false });

  useEffect(() => {
    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/employees/meta/form/employee_master_directory`)
      .then(res => res.json())
      .then(data => setFields(data.fields || []));
  }, []);

  const addFieldRow = async () => {
    if (!newField.field_key || !newField.label) return alert('Provide identifier keys and display names.');
    
    const configuredRow = {
      field_key: newField.field_key,
      label: newField.label,
      input_type: newField.input_type,
      section: newField.section,
      options: newField.optionsString ? newField.optionsString.split(',').map(s => s.trim()) : [],
      validations: { required: newField.required }
    };

    const targetList = [...fields, configuredRow];
    
    const res = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/employees/meta/form/employee_master_directory/fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: targetList })
    });
    
    if (res.ok) {
      setFields(targetList);
      setNewField({ field_key: '', label: '', input_type: 'text', section: 'personal', optionsString: '', required: false });
      alert('Dynamic Field Schema Model Updated Live!');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto space-y-6">
      <h2 className="text-lg font-bold text-slate-800 border-b pb-2">Super Admin Live Field Schema Constructor Engine</h2>
      
      <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border rounded text-xs font-semibold">
        <input type="text" placeholder="field_key (e.g. passport_no)" value={newField.field_key} onChange={e => setNewField({...newField, field_key: e.target.value})} className="p-2 border rounded" />
        <input type="text" placeholder="Display Label (e.g. Passport Number)" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} className="p-2 border rounded" />
        <select value={newField.input_type} onChange={e => setNewField({...newField, input_type: e.target.value})} className="p-2 border rounded bg-white">
          <option value="text">Text Input</option>
          <option value="number">Numeric Variable</option>
          <option value="date">Calendar Date Element</option>
          <option value="select">Dropdown Menu Select</option>
        </select>
        <select value={newField.section} onChange={e => setNewField({...newField, section: e.target.value})} className="p-2 border rounded bg-white">
          <option value="personal">Locations & Contact Tab</option>
          <option value="employment">Core HR & Contracts Tab</option>
        </select>
        <input type="text" placeholder="Options comma separated (for select only)" value={newField.optionsString} onChange={e => setNewField({...newField, optionsString: e.target.value})} className="p-2 border rounded col-span-2" />
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={newField.required} onChange={e => setNewField({...newField, required: e.target.checked})} /> Required Validation
        </label>
        <button type="button" onClick={addFieldRow} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded p-2 text-xs font-bold">Incorporate Field Instantly</button>
      </div>

      <table className="w-full border collapse text-sm">
        <thead>
          <tr className="bg-slate-100 border-b text-left">
            <th className="p-2">Key Value</th>
            <th className="p-2">Label Title</th>
            <th className="p-2">Type</th>
            <th className="p-2">Tab Placement</th>
            <th className="p-2">Validation Required</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => (
            <tr key={i} className="border-b">
              <td className="p-2 font-mono text-xs">{f.field_key}</td>
              <td className="p-2">{f.label}</td>
              <td className="p-2 text-xs uppercase text-blue-600">{f.input_type}</td>
              <td className="p-2 text-xs text-purple-600">{f.section}</td>
              <td className="p-2">{f.validations?.required ? 'True' : 'False'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}