import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react'; 
import '../styles/EmployeeForm.css';
import { AUTH_ENDPOINTS } from '../config/api';

const INITIAL_FORM_STATE = {
  address_details: [{ address_type: 'Current', address_line1: '', city: '', state: '', postal_code: '', country: 'India' }],
  contact_details: [{ contact_type: 'Personal_Mobile', contact_value: '', is_primary: 1 }],
  salary_details: { basic_salary: '', hra: '', allowances: '', deductions: '' },
  education: [],
  dynamic_data: {}
};

// Fallback icon registry mapping normalized string keys to Lucide Components
const ICON_REGISTRY = {
  personal: Icons.User,
  personal_info: Icons.User,
  employment: Icons.Briefcase,
  addresses: Icons.MapPin,
  locations: Icons.MapPin,
  finance: Icons.Wallet,
  compensation: Icons.Wallet,
  security: Icons.ShieldCheck,
  fallback: Icons.FileText
};

// Human-readable titles fallback map for dynamically generated tabs
const SECTION_LABEL_MAP = {
  personal: 'Personal Info',
  personal_info: 'Personal Info',
  employment: 'Employment Status',
  addresses: 'Locations & Contact',
  finance: 'Financial Matrix',
  security: 'System Access & Roles'
};

export default function EmployeeMasterForm({ employeeId = null, formCode = 'EMPLOYEE_MASTER_DIRECTORY', onSaveSuccess }) {
  const [activeTab, setActiveTab] = useState('');
  const [tabsConfig, setTabsConfig] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [metaSchema, setMetaSchema] = useState(null);
  const [systemCreds, setSystemCreds] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Fetch Metadata Layout Schema on Component Mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    
    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/${formCode}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const targetData = data.data || data;
        
        if (targetData && targetData.fields) {
          setMetaSchema(targetData);
          
          // 1. Process fields dynamically to build the Tabs list
          const sectionsPresent = new Set();
          const initializedFields = {};

          targetData.fields.forEach(f => {
            if (f.is_active && f.section) {
              sectionsPresent.add(f.section.toLowerCase());
            }
            initializedFields[f.field_key] = f.input_type === 'select' && f.options?.length ? f.options[0] : ''; 
          });

          // Convert sections Set into structured array configurations
          const parsedTabs = Array.from(sectionsPresent).map(secString => {
            // Find an icon component or default to fallback
            const IconComponent = ICON_REGISTRY[secString] || ICON_REGISTRY.fallback;
            
            // Format a nice display name: check our human map or capitalize the raw string
            const displayLabel = SECTION_LABEL_MAP[secString] || 
              secString.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return {
              id: secString,
              label: displayLabel,
              icon: IconComponent
            };
          });

          setTabsConfig(parsedTabs);
          
          // Set initial active tab to the first calculated section if available
          if (parsedTabs.length > 0) {
            setActiveTab(parsedTabs[0].id);
          }
          
          setFormData(prev => ({
            ...prev,
            dynamic_data: { ...initializedFields, ...prev.dynamic_data }
          }));
        }
      })
      .catch(err => console.error("Could not trace dynamic metadata configurations:", err));
  }, [formCode]);

  // Handle updates when editing an existing worker record instance
  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData(employeeId);
    }
  }, [employeeId]);

  const fetchEmployeeData = async (id) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/employees/profile/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setFormData({
          address_details: data.addresses?.length ? data.addresses : INITIAL_FORM_STATE.address_details,
          contact_details: data.contacts?.length ? data.contacts : INITIAL_FORM_STATE.contact_details,
          salary_details: data.current_compensation || INITIAL_FORM_STATE.salary_details,
          education: data.academic_records || [],
          dynamic_data: data.profile?.dynamic_data || data.profile || {}
        });
      }
    } catch (err) {
      console.error("Error pulling database metadata profiles:", err);
    }
  };

  const handleFieldChange = (key, value) => {
    setFormData(prev => {
      const updatedDynamic = { ...prev.dynamic_data, [key]: value };
      
      // Auto-credential generation listener matching your schema properties
      if (key === 'first_name' || key === 'last_name') {
        const fName = (updatedDynamic.first_name || '').toLowerCase().trim();
        const lName = (updatedDynamic.last_name || '').toLowerCase().trim();
        if (fName) {
          setSystemCreds({
            username: `${fName}${lName ? '.' + lName : '2026'}`,
            password: `${fName}@123`
          });
        }
      }
      
      return {
        ...prev,
        dynamic_data: updatedDynamic
      };
    });

    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const handleComplexSectionChange = (e, targetBlock) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [targetBlock]: { ...prev[targetBlock], [name]: value }
    }));
  };

  const handleArrayRowChange = (index, field, value, sectionKey) => {
    setFormData(prev => {
      const workingArray = [...prev[sectionKey]];
      workingArray[index] = { ...workingArray[index], [field]: value };
      return { ...prev, [sectionKey]: workingArray };
    });
  };

  const appendNewRow = (sectionKey, skeletonStructure) => {
    setFormData(prev => ({ ...prev, [sectionKey]: [...prev[sectionKey], skeletonStructure] }));
  };

  const sliceRowOut = (index, sectionKey) => {
    setFormData(prev => ({
      ...prev,
      [sectionKey]: prev[sectionKey].filter((_, i) => i !== index)
    }));
  };

  const runValidationProcedures = () => {
    const newErrors = {};
    if (!metaSchema?.fields) return true;

    metaSchema.fields.forEach(field => {
      if (!field.is_active) return;

      const val = formData.dynamic_data[field.field_key];
      const valStr = val !== undefined && val !== null ? val.toString().trim() : '';

      // Check structural constraints
      if (field.validations?.required && !valStr) {
        newErrors[field.field_key] = `${field.label} is a mandatory field.`;
        return;
      }
      if (valStr && field.validations?.min_length && valStr.length < field.validations.min_length) {
        newErrors[field.field_key] = `${field.label} requires a minimum of ${field.validations.min_length} characters.`;
      }
      if (valStr && field.validations?.max_length && valStr.length > field.validations.max_length) {
        newErrors[field.field_key] = `${field.label} exceeds maximum allowed boundary size (${field.validations.max_length}).`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmission = async (e) => {
    e.preventDefault();
    if (!runValidationProcedures()) {
      setSubmitStatus({ type: 'error', message: 'Schema requirements failed. Review validation errors across panels.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    // Safely declare the payload parameters so they are defined
    const safeDynamicData = formData.dynamic_data || {};
    const empCode = safeDynamicData.employee_code || '';
    const empEmail = safeDynamicData.employee_email || safeDynamicData.emp_email || '';
    const empRole = safeDynamicData.employee_role || '';

    const packedPayload = {
      form_code: formCode,
      employee_code: empCode,
      employee_email: empEmail,
      employee_role: empRole,
      addresses: formData.address_details,
      contacts: formData.contact_details,
      salary_structure: formData.salary_details,
      academic_records: formData.education,
      system_credentials: systemCreds,
      
      // THIS IS THE CRITICAL MATCH FOR YOUR ROUTE:
      dynamic_fields_payload: safeDynamicData, 
      
      // Kept as fallbacks just in case other backend endpoints or hooks use them
      dynamic_data: safeDynamicData,
      profile: {
        ...safeDynamicData,
        employee_code: empCode,
        employee_email: empEmail,
        employee_role: empRole
      }
    };

    try {
      const token = localStorage.getItem('accessToken');
      const endpointRoute = employeeId ? `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/employees/update/${employeeId}` : `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/employees/register-dynamic`;
      const requestMethod = employeeId ? 'PUT' : 'POST';

      const networkTransmission = await fetch(endpointRoute, {
        method: requestMethod,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(packedPayload)
      });

      const parsedResponse = await networkTransmission.json();

      if (networkTransmission.ok || parsedResponse.success) {
        setSubmitStatus({ type: 'success', message: parsedResponse.message || 'Data sets written safely to ledger structures.' });
        if (onSaveSuccess) onSaveSuccess(parsedResponse.employeeId || employeeId);
      } else {
        setSubmitStatus({ type: 'error', message: parsedResponse.message || 'Error processing transaction submission.' });
      }
    } catch (err) {
      setSubmitStatus({ type: 'error', message: `Engine connection failure occurred: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic grouping processor that reads schema structure values directly
  const renderSchemaSectionFields = (sectionName) => {
    if (!metaSchema?.fields) return null;

    const matchedSchemaFields = metaSchema.fields.filter(
      field => field.is_active && field.section?.toLowerCase() === sectionName.toLowerCase()
    );

    if (matchedSchemaFields.length === 0) return null;

    return (
      <div className="mac-form-grid-3x">
        {matchedSchemaFields.map(field => {
          const currentFieldValue = formData.dynamic_data[field.field_key] || '';
          const hasError = errors[field.field_key];

          return (
            <div key={field.field_key} className="form-control-block">
              <label>
                {field.label} {field.validations?.required && <span className="req">*</span>}
              </label>

              {field.input_type === 'select' ? (
                <select
                  value={currentFieldValue}
                  onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                  className={hasError ? 'input-error' : ''}
                >
                  <option value="">-- Choose Option --</option>
                  {field.options?.map(optionItem => (
                    <option key={optionItem} value={optionItem}>{optionItem}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.input_type === 'email' ? 'email' : field.input_type === 'date' ? 'date' : 'text'}
                  value={field.input_type === 'date' && currentFieldValue ? currentFieldValue.substring(0, 10) : currentFieldValue}
                  onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                  className={hasError ? 'input-error' : ''}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                />
              )}
              {hasError && <span className="error-lbl">{errors[field.field_key]}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mac-form-wrapper-canvas">
      <div className="mac-form-window-frame">
        
        <header className="mac-form-header">
          <h2 className="window-title-text">
            {metaSchema?.form_name || 'Dynamic Schema Form Manager'} {formData.dynamic_data.employee_code && `[${formData.dynamic_data.employee_code}]`}
          </h2>
        </header>

        <div className="mac-form-layout-body">
          <nav className="mac-form-tabs-sidebar">
            {tabsConfig.map(tabItem => {
              const TabIconComponent = tabItem.icon;
              return (
                <button 
                  key={tabItem.id}
                  type="button" 
                  className={`tab-btn ${activeTab === tabItem.id ? 'active' : ''}`} 
                  onClick={() => setActiveTab(tabItem.id)}
                >
                  <TabIconComponent size={16} /> {tabItem.label}
                </button>
              );
            })}
          </nav>

          <form className="mac-form-content-view" onSubmit={handleFormSubmission}>
            <div className="form-scroll-viewport">
              
              {/* RENDER DYNAMIC FIELDS BASED ON ACTIVE TAB KEY */}
              {activeTab && !['addresses', 'finance'].includes(activeTab) && (
                <section className="form-fade-view">
                  <h3 className="section-pane-heading">
                    {tabsConfig.find(t => t.id === activeTab)?.label || 'Registry Content'} Panel
                  </h3>
                  {renderSchemaSectionFields(activeTab)}

                  {/* Contextual System generated credential visualization banner */}
                  {activeTab.startsWith('personal') && !employeeId && formData.dynamic_data.first_name && (
                    <div style={{ backgroundColor: '#f4f6fa', padding: '12px', borderLeft: '4px solid #4a6cf7', borderRadius: '4px', marginTop: '20px' }}>
                      <span style={{ fontSize: '11px', display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>PROPOSED SYSTEM ACCESS PARAMS:</span>
                      <code style={{ fontSize: '12px' }}>User: {systemCreds.username} | Pass: {systemCreds.password}</code>
                    </div>
                  )}
                </section>
              )}

              {/* HARDCODED SUB-PANELS RETAINED FOR SPECIAL STRUCTURED COLLECTION ARRAYS */}
              {activeTab === 'addresses' && (
                <section className="form-fade-view">
                  <div className="section-sub-header flex-split">
                    <h3 className="section-pane-heading">Geographic Address Nodes</h3>
                    <button 
                      type="button" 
                      className="mac-btn-action small" 
                      onClick={() => appendNewRow('address_details', { address_type: 'Current', address_line1: '', city: '', state: '', postal_code: '', country: 'India' })}
                    >
                      <Icons.Plus size={14}/> Add Address Node
                    </button>
                  </div>
                  
                  {formData.address_details.map((addressNode, idx) => (
                    <div key={idx} className="mac-form-array-card" style={{ marginBottom: '12px', padding: '12px', border: '1px solid #ddd', borderRadius: '6px' }}>
                      <div className="card-header-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Record # {idx + 1}</span>
                        {formData.address_details.length > 1 && <Icons.Trash2 size={14} style={{ color: 'red', cursor: 'pointer' }} onClick={() => sliceRowOut(idx, 'address_details')} />}
                      </div>
                      <div className="mac-form-grid-3x">
                        <select value={addressNode.address_type} onChange={(e) => handleArrayRowChange(idx, 'address_type', e.target.value, 'address_details')}>
                          <option value="Current">Current</option><option value="Permanent">Permanent</option><option value="Office">Office</option>
                        </select>
                        <input type="text" placeholder="Address Line 1" value={addressNode.address_line1} onChange={(e) => handleArrayRowChange(idx, 'address_line1', e.target.value, 'address_details')} />
                        <input type="text" placeholder="City" value={addressNode.city} onChange={(e) => handleArrayRowChange(idx, 'city', e.target.value, 'address_details')} />
                        <input type="text" placeholder="State" value={addressNode.state} onChange={(e) => handleArrayRowChange(idx, 'state', e.target.value, 'address_details')} />
                        <input type="text" placeholder="Postal Code" value={addressNode.postal_code} onChange={(e) => handleArrayRowChange(idx, 'postal_code', e.target.value, 'address_details')} />
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {activeTab === 'finance' && (
                <section className="form-fade-view">
                  <h3 className="section-pane-heading">Compensation Matrix Setup</h3>
                  <div className="mac-form-grid-4x">
                    <div className="form-control-block">
                      <label>Basic Pay Scale</label>
                      <input type="number" name="basic_salary" value={formData.salary_details.basic_salary} onChange={(e) => handleComplexSectionChange(e, 'salary_details')} />
                    </div>
                    <div className="form-control-block">
                      <label>House Rent Allowance</label>
                      <input type="number" name="hra" value={formData.salary_details.hra} onChange={(e) => handleComplexSectionChange(e, 'salary_details')} />
                    </div>
                    <div className="form-control-block">
                      <label>Flexible Perks</label>
                      <input type="number" name="allowances" value={formData.salary_details.allowances} onChange={(e) => handleComplexSectionChange(e, 'salary_details')} />
                    </div>
                    <div className="form-control-block">
                      <label>Regulatory Deductions</label>
                      <input type="number" name="deductions" value={formData.salary_details.deductions} onChange={(e) => handleComplexSectionChange(e, 'salary_details')} />
                    </div>
                  </div>
                </section>
              )}

            </div>

            <footer className="mac-form-footer-action-row">
              {submitStatus && (
                <div className={`form-inline-alert ${submitStatus.type === 'success' ? 'success' : 'error'}`}>
                  {submitStatus.type === 'success' ? <Icons.CheckCircle2 size={16} /> : <Icons.AlertCircle size={16} />}
                  <span className="alert-text-span">{submitStatus.message}</span>
                </div>
              )}
              <div className="action-buttons-end-group">
                <button 
                  type="button" 
                  className="mac-btn-action secondary-reset" 
                  disabled={isSubmitting}
                  onClick={() => {
                    if (window.confirm("Purge inputs?")) {
                      setFormData(INITIAL_FORM_STATE);
                      setErrors({});
                      setSubmitStatus(null);
                    }
                  }}
                >
                  Reset
                </button>
                <button type="submit" className="mac-btn-action primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Syncing...' : employeeId ? 'Update' : 'Save'}
                </button>
              </div>
            </footer>
          </form>
        </div>

      </div>
    </div>
  );
}