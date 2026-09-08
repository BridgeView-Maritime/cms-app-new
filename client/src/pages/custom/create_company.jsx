import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { AUTH_ENDPOINTS } from '../../config/api';
import '../../styles/custom/create_company.css';

/**
 * Reusable Database Lookup Dropdown Component
 */
function DatabaseLookupSelect({ formCode, fieldKey, label, value, onChange, required, className }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLookupOptions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/metadata/lookup/${formCode}/${fieldKey}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (isMounted && res.ok && Array.isArray(data.options) && data.options.length > 0) {
          setOptions(data.options);
        } else if (isMounted) {
          // Fallback defaults if lookup is empty
          if (fieldKey === 'country') {
            setOptions(['Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'India', 'United States']);
          } else if (fieldKey === 'cperson_prefix') {
            setOptions(['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Capt.']);
          } else {
            setOptions(['Option 1', 'Option 2', 'Option 3']);
          }
        }
      } catch (err) {
        console.error(`Lookup fetch failed for ${fieldKey}:`, err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLookupOptions();
    return () => { isMounted = false; };
  }, [formCode, fieldKey]);

  return (
    <select
      name={fieldKey}
      value={value || ''}
      onChange={onChange}
      required={required}
      className={className || "custom-select"}
    >
      <option value="">{loading ? 'Loading options...' : `-- Select ${label} --`}</option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

/**
 * Reusable Dynamic Repeater Table Component
 */
function DynamicRepeaterTable({ fieldKey, columns, value, onChange }) {
  const rows = Array.isArray(value) && value.length > 0 ? value : [createEmptyRow(columns)];

  function createEmptyRow(cols) {
    return cols.reduce((acc, col) => {
      acc[col.key] = '';
      return acc;
    }, {});
  }

  const handleRowChange = (index, colKey, val) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], [colKey]: val };
    onChange({ target: { name: fieldKey, value: updatedRows } });
  };

  const addRow = () => {
    const updatedRows = [...rows, createEmptyRow(columns)];
    onChange({ target: { name: fieldKey, value: updatedRows } });
  };

  const removeRow = (index) => {
    if (rows.length === 1) {
      // Clear row instead of completely deleting if it's the last remaining row
      onChange({ target: { name: fieldKey, value: [createEmptyRow(columns)] } });
      return;
    }
    const updatedRows = rows.filter((_, idx) => idx !== index);
    onChange({ target: { name: fieldKey, value: updatedRows } });
  };

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #086982', borderRadius: '4px', marginTop: '6px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#086982', color: '#ffffff' }}>
            {columns.map((col) => (
              <th key={col.key} style={{ padding: '10px', fontSize: '13px', fontWeight: '600', borderRight: '1px solid #065468' }}>
                {col.label}
              </th>
            ))}
            <th style={{ padding: '10px', fontSize: '12px', textAlign: 'center', width: '120px' }}>
              Click (+) icon to add more positions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '6px', borderRight: '1px solid #e5e7eb' }}>
                  {col.type === 'select' ? (
                    <select
                      value={row[col.key] || ''}
                      onChange={(e) => handleRowChange(rowIndex, col.key, e.target.value)}
                      className="custom-select"
                      style={{ padding: '6px 8px', fontSize: '13px' }}
                    >
                      <option value="">-- Select --</option>
                      {(col.options || []).map((opt, oIdx) => (
                        <option key={oIdx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={col.type || 'text'}
                      value={row[col.key] || ''}
                      placeholder={col.placeholder || ''}
                      onChange={(e) => handleRowChange(rowIndex, col.key, e.target.value)}
                      className="custom-input"
                      style={{ padding: '6px 8px', fontSize: '13px' }}
                    />
                  )}
                </td>
              ))}
              <td style={{ padding: '6px', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={addRow}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Add Row"
                  >
                    <Plus size={16} />
                  </button>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(rowIndex)}
                      style={{
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove Row"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Default Repeater Column Schemas
 */
const DEFAULT_REPEATER_COLUMNS = {
  crewing_department_repeater: [
    { key: 'salutation', label: 'Salutation', type: 'select', options: ['Mr.', 'Ms.', 'Capt.', 'Dr.'] },
    { key: 'person_name', label: 'Name of Person in Crewing Department', type: 'text', placeholder: 'Name of Person' },
    { key: 'phone', label: 'Phone Number', type: 'text', placeholder: 'Phone' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'Email' },
    { key: 'crew_expiry', label: 'Crew Expiry', type: 'date' }
  ],
  accounts_department_repeater: [
    { key: 'salutation', label: 'Salutation', type: 'select', options: ['Mr.', 'Ms.', 'Capt.', 'Dr.'] },
    { key: 'person_name', label: 'Name of Person in Accounts', type: 'text', placeholder: 'Name of Person' },
    { key: 'phone', label: 'Phone Number', type: 'text', placeholder: 'Phone' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'Email' }
  ],
  generic_rate_columns: [
    { key: 'rank', label: 'Rank/Category', type: 'text', placeholder: 'Rank' },
    { key: 'amount', label: 'Amount / Fee', type: 'number', placeholder: 'Amount' },
    { key: 'currency', label: 'Currency', type: 'select', options: ['USD', 'INR', 'EUR', 'GBP'] },
    { key: 'remarks', label: 'Remarks', type: 'text', placeholder: 'Remarks' }
  ]
};

/**
 * Main Standalone Custom Page Component for CREATE_COMPANY
 */
export default function CreateCompanyCustomPage() {
  const [formData, setFormData] = useState({
    "company_shortname": "",
    "companyid": "",
    "company_name": "",
    "phoneno": "",
    "email": "",
    "address": "",
    "panno": "",
    "gstno": "",
    "country": "",
    "cperson_prefix": "",
    "contactperson": "",
    "type_cash": "",
    "fee_type": "",
    "manning_fee": "",
    "crewing_department_repeater": [],
    "accounts_department_repeater": [],
    "validity_type": "",
    "validity_date": "",
    "agreement_type": "",
    "agreement_upload": "",
    "agreement_upload1": "",
    "fee_structure_upload": "",
    "cr_upload": "",
    "cr_date": "",
    "crew_welfare": "",
    "invoice_type": "",
    "insub_type": "",
    "invoice_services": "",
    "service_type": "",
    "new_joining_officer_repeater": [],
    "rejoining_officer_repeater": [],
    "new_joining_rating_repeater": [],
    "rejoining_rating_repeater": [],
    "nrpanewjoiner": "",
    "nrparejoiner": "",
    "perdaypercrew_oar_repeater": [],
    "perdaypercrew_so_repeater": [],
    "perdaypercrew_jo_repeater": [],
    "perdaypercrew_r_repeater": [],
    "finderfee_so_repeater": [],
    "finderfee_jo_repeater": [],
    "finderfee_r_repeater": [],
    "permonth_o_repeater": [],
    "permonth_r_repeater": [],
    "ogcotf_repeater": [],
    "ageofyearlybasic_repeater": [],
    "medical_fee_info_repeater": [],
    "additional_medical_repeater": [],
    "cccpbo": "",
    "foreign_vessel": "",
    "amount_to_be_added_repeater": [],
    "visa_repeater": [],
    "ppe_equipment_repeater": [],
    "ccrewfees": "",
    "visa_invoice": "",
    "user": "",
    "cdate": "",
    "reason": "",
    "status": "",
    "deactivate_date": "",
    "deactivate_by": "",
    "contract_date": "",
    "reviesed_date": "",
    "com_structure_upload": ""
  });

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
      const res = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/forms/submit/CREATE_COMPANY`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
    <div className="custom-page-wrapper">
      <div className="custom-card">
        <div className="custom-header">
          <h2>CREATE COMPANY Management Workspace</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="custom-form-grid">
            
            <div className="form-group-col col-6" key="company_shortname">
              <label className="custom-label">
                Company Short Name <span className="required-star">*</span>
              </label>
              <input 
                type="text" 
                name="company_shortname" 
                value={formData.company_shortname || ''} 
                onChange={handleChange} 
                required 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="companyid">
              <label className="custom-label">
                Company ID <span className="required-star">*</span>
              </label>
              <input 
                type="number" 
                name="companyid" 
                value={formData.companyid || ''} 
                onChange={handleChange} 
                required 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-12" key="company_name">
              <label className="custom-label">
                Company Name <span className="required-star">*</span>
              </label>
              <input 
                type="text" 
                name="company_name" 
                value={formData.company_name || ''} 
                onChange={handleChange} 
                required 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="phoneno">
              <label className="custom-label">
                Phone Number <span className="required-star">*</span>
              </label>
              <input 
                type="text" 
                name="phoneno" 
                value={formData.phoneno || ''} 
                onChange={handleChange} 
                required 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="email">
              <label className="custom-label">
                Email <span className="required-star">*</span>
              </label>
              <input 
                type="email" 
                name="email" 
                value={formData.email || ''} 
                onChange={handleChange} 
                required 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-12" key="address">
              <label className="custom-label">
                Address <span className="required-star">*</span>
              </label>
              <textarea 
                name="address" 
                value={formData.address || ''} 
                onChange={handleChange} 
                required 
                className="custom-textarea" 
                rows={3} 
              />
            </div>

            <div className="form-group-col col-4" key="panno">
              <label className="custom-label">PAN No</label>
              <input 
                type="text" 
                name="panno" 
                value={formData.panno || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-4" key="gstno">
              <label className="custom-label">GST No</label>
              <input 
                type="text" 
                name="gstno" 
                value={formData.gstno || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            {/* DATABASE LOOKUP: Country */}
            <div className="form-group-col col-4" key="country">
              <label className="custom-label">
                Country <span className="required-star">*</span>
              </label>
              <DatabaseLookupSelect
                formCode="CREATE_COMPANY"
                fieldKey="country"
                label="Country"
                value={formData.country}
                onChange={handleChange}
                required={true}
              />
            </div>

            {/* DATABASE LOOKUP: Contact Person Salutation */}
            <div className="form-group-col col-4" key="cperson_prefix">
              <label className="custom-label">Contact Person Salutation</label>
              <DatabaseLookupSelect
                formCode="CREATE_COMPANY"
                fieldKey="cperson_prefix"
                label="Salutation"
                value={formData.cperson_prefix}
                onChange={handleChange}
                required={false}
              />
            </div>

            <div className="form-group-col col-8" key="contactperson">
              <label className="custom-label">
                Contact Person Name <span className="required-star">*</span>
              </label>
              <input 
                type="text" 
                name="contactperson" 
                value={formData.contactperson || ''} 
                onChange={handleChange} 
                required 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-4" key="type_cash">
              <label className="custom-label">
                Type Cash <span className="required-star">*</span>
              </label>
              <input 
                type="text" 
                name="type_cash" 
                value={formData.type_cash || ''} 
                onChange={handleChange} 
                required 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-4" key="fee_type">
              <label className="custom-label">
                Fee Type <span className="required-star">*</span>
              </label>
              <input 
                type="text" 
                name="fee_type" 
                value={formData.fee_type || ''} 
                onChange={handleChange} 
                required 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-4" key="manning_fee">
              <label className="custom-label">Manning Fee</label>
              <input 
                type="text" 
                name="manning_fee" 
                value={formData.manning_fee || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            {/* REPEATER: Crewing Department Contact Details */}
            <div className="form-group-col col-12" key="crewing_department_repeater">
              <label className="custom-label">Crewing Department Contact Details</label>
              <DynamicRepeaterTable
                fieldKey="crewing_department_repeater"
                columns={DEFAULT_REPEATER_COLUMNS.crewing_department_repeater}
                value={formData.crewing_department_repeater}
                onChange={handleChange}
              />
            </div>

            {/* REPEATER: Accounts Department Contact Details */}
            <div className="form-group-col col-12" key="accounts_department_repeater">
              <label className="custom-label">Accounts Department Contact Details</label>
              <DynamicRepeaterTable
                fieldKey="accounts_department_repeater"
                columns={DEFAULT_REPEATER_COLUMNS.accounts_department_repeater}
                value={formData.accounts_department_repeater}
                onChange={handleChange}
              />
            </div>

            <div className="form-group-col col-6" key="validity_type">
              <label className="custom-label">Validity Type</label>
              <input 
                type="text" 
                name="validity_type" 
                value={formData.validity_type || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="validity_date">
              <label className="custom-label">Validity Date</label>
              <input 
                type="date" 
                name="validity_date" 
                value={formData.validity_date || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            {/* DATABASE LOOKUP: Type of Agreement */}
            <div className="form-group-col col-12" key="agreement_type">
              <label className="custom-label">
                Type of Agreement <span className="required-star">*</span>
              </label>
              <DatabaseLookupSelect
                formCode="CREATE_COMPANY"
                fieldKey="agreement_type"
                label="Agreement Type"
                value={formData.agreement_type}
                onChange={handleChange}
                required={true}
              />
            </div>

            <div className="form-group-col col-6" key="agreement_upload">
              <label className="custom-label">Agreement Upload</label>
              <input 
                type="file" 
                name="agreement_upload" 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="agreement_upload1">
              <label className="custom-label">Agreement Upload 1</label>
              <input 
                type="file" 
                name="agreement_upload1" 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="fee_structure_upload">
              <label className="custom-label">Fee Structure Upload</label>
              <input 
                type="file" 
                name="fee_structure_upload" 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="cr_upload">
              <label className="custom-label">CR Upload</label>
              <input 
                type="file" 
                name="cr_upload" 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="cr_date">
              <label className="custom-label">CR Date</label>
              <input 
                type="date" 
                name="cr_date" 
                value={formData.cr_date || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="crew_welfare">
              <label className="custom-label">Crew Welfare</label>
              <input 
                type="text" 
                name="crew_welfare" 
                value={formData.crew_welfare || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-4" key="invoice_type">
              <label className="custom-label">Invoice Type</label>
              <input 
                type="text" 
                name="invoice_type" 
                value={formData.invoice_type || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-4" key="insub_type">
              <label className="custom-label">Insub Type</label>
              <input 
                type="text" 
                name="insub_type" 
                value={formData.insub_type || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-4" key="invoice_services">
              <label className="custom-label">Invoice Services</label>
              <input 
                type="text" 
                name="invoice_services" 
                value={formData.invoice_services || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-12" key="service_type">
              <label className="custom-label">Service Type</label>
              <input 
                type="text" 
                name="service_type" 
                value={formData.service_type || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            {/* REPEATERS: Rates & Allowance Sections */}
            {[
              { key: "new_joining_officer_repeater", label: "New Joining Officer Rates" },
              { key: "rejoining_officer_repeater", label: "Rejoining Officer Rates" },
              { key: "new_joining_rating_repeater", label: "New Joining Rating Rates" },
              { key: "rejoining_rating_repeater", label: "Rejoining Rating Rates" },
            ].map(rep => (
              <div className="form-group-col col-12" key={rep.key}>
                <label className="custom-label">{rep.label}</label>
                <DynamicRepeaterTable
                  fieldKey={rep.key}
                  columns={DEFAULT_REPEATER_COLUMNS.generic_rate_columns}
                  value={formData[rep.key]}
                  onChange={handleChange}
                />
              </div>
            ))}

            <div className="form-group-col col-6" key="nrpanewjoiner">
              <label className="custom-label">NRPA New Joiner</label>
              <input 
                type="number" 
                name="nrpanewjoiner" 
                value={formData.nrpanewjoiner || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="nrparejoiner">
              <label className="custom-label">NRPA Rejoiner</label>
              <input 
                type="number" 
                name="nrparejoiner" 
                value={formData.nrparejoiner || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            {/* ADDITIONAL REPEATERS */}
            {[
              { key: "perdaypercrew_oar_repeater", label: "Per Day Per Crew OAR Rates" },
              { key: "perdaypercrew_so_repeater", label: "Per Day Per Crew SO Rates" },
              { key: "perdaypercrew_jo_repeater", label: "Per Day Per Crew JO Rates" },
              { key: "perdaypercrew_r_repeater", label: "Per Day Per Crew R Rates" },
              { key: "finderfee_so_repeater", label: "Finder Fee Crew SO Rates" },
              { key: "finderfee_jo_repeater", label: "Finder Fee Crew JO Rates" },
              { key: "finderfee_r_repeater", label: "Finder Fee Crew R Rates" },
              { key: "permonth_o_repeater", label: "Per Month Per Officer Rates" },
              { key: "permonth_r_repeater", label: "Per Month Per Rating Rates" },
              { key: "ogcotf_repeater", label: "OGCOTF Rates" },
              { key: "ageofyearlybasic_repeater", label: "Age Of Yearly Basic Rates" },
              { key: "medical_fee_info_repeater", label: "Medical Fee Paid By Owner Details" },
              { key: "additional_medical_repeater", label: "Additional Medical Fees Details" },
            ].map(rep => (
              <div className="form-group-col col-12" key={rep.key}>
                <label className="custom-label">{rep.label}</label>
                <DynamicRepeaterTable
                  fieldKey={rep.key}
                  columns={DEFAULT_REPEATER_COLUMNS.generic_rate_columns}
                  value={formData[rep.key]}
                  onChange={handleChange}
                />
              </div>
            ))}

            <div className="form-group-col col-6" key="cccpbo">
              <label className="custom-label">CCCPBO</label>
              <input 
                type="text" 
                name="cccpbo" 
                value={formData.cccpbo || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="foreign_vessel">
              <label className="custom-label">Foreign Vessel</label>
              <input 
                type="text" 
                name="foreign_vessel" 
                value={formData.foreign_vessel || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            {[
              { key: "amount_to_be_added_repeater", label: "Amount To Be Added Details" },
              { key: "visa_repeater", label: "Visa Selection Details" },
              { key: "ppe_equipment_repeater", label: "PPE & Safety Items Allowances" },
            ].map(rep => (
              <div className="form-group-col col-12" key={rep.key}>
                <label className="custom-label">{rep.label}</label>
                <DynamicRepeaterTable
                  fieldKey={rep.key}
                  columns={DEFAULT_REPEATER_COLUMNS.generic_rate_columns}
                  value={formData[rep.key]}
                  onChange={handleChange}
                />
              </div>
            ))}

            <div className="form-group-col col-6" key="ccrewfees">
              <label className="custom-label">Crew Fees</label>
              <input 
                type="number" 
                name="ccrewfees" 
                value={formData.ccrewfees || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="visa_invoice">
              <label className="custom-label">Visa Invoice</label>
              <input 
                type="text" 
                name="visa_invoice" 
                value={formData.visa_invoice || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="user">
              <label className="custom-label">
                User <span className="required-star">*</span>
              </label>
              <input 
                type="text" 
                name="user" 
                value={formData.user || ''} 
                onChange={handleChange} 
                required 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="cdate">
              <label className="custom-label">
                Created Date <span className="required-star">*</span>
              </label>
              <input 
                type="date" 
                name="cdate" 
                value={formData.cdate || ''} 
                onChange={handleChange} 
                required 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="reason">
              <label className="custom-label">Reason</label>
              <input 
                type="text" 
                name="reason" 
                value={formData.reason || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="status">
              <label className="custom-label">
                Status <span className="required-star">*</span>
              </label>
              <input 
                type="text" 
                name="status" 
                value={formData.status || ''} 
                onChange={handleChange} 
                required 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="deactivate_date">
              <label className="custom-label">Deactivate Date</label>
              <input 
                type="date" 
                name="deactivate_date" 
                value={formData.deactivate_date || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="deactivate_by">
              <label className="custom-label">Deactivated By</label>
              <input 
                type="text" 
                name="deactivate_by" 
                value={formData.deactivate_by || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="contract_date">
              <label className="custom-label">Contract Date</label>
              <input 
                type="date" 
                name="contract_date" 
                value={formData.contract_date || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="reviesed_date">
              <label className="custom-label">Revised Date</label>
              <input 
                type="text" 
                name="reviesed_date" 
                value={formData.reviesed_date || ''} 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

            <div className="form-group-col col-6" key="com_structure_upload">
              <label className="custom-label">Company Structure Upload</label>
              <input 
                type="file" 
                name="com_structure_upload" 
                onChange={handleChange} 
                className="custom-input" 
              />
            </div>

          </div>

          {status && (
            <div className={`custom-alert alert-${status.type}`}>
              {status.message}
            </div>
          )}

          <div className="custom-actions">
            <button type="submit" disabled={isSubmitting} className="btn-submit">
              <Save size={18} /> {isSubmitting ? 'Saving...' : 'Submit Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}