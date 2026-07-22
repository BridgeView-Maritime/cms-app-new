import React, { useState, useEffect } from 'react';

import { 
  Shield, Anchor, Briefcase, FileText, User, Settings, Bell, Layers, Grid, Cpu, Database, 
  Folder, Activity, BarChart, Lock, MapPin, Landmark, GraduationCap, ShieldAlert, HelpCircle, 
  Plus, Save, Eye, Edit3, Layers3, FolderPlus, Trash2, Edit2, Check, X, EyeOff, Search, SlidersHorizontal, AlertTriangle, ShieldCheck, Globe, ChevronDown
} from 'lucide-react';

import GlobalParametersPanel from './GlobalParametersPanel';
import SystemImmutableCards from './SystemImmutableCards';
import FieldControlCard from './FieldControlCard';

import '../styles/FormBuilder.css';
import '../styles/FormSchemaBuilder.css';
import { AUTH_ENDPOINTS } from '../config/api';

const AVAILABLE_SECTION_ICONS = [
  { name: 'User', component: User },
  { name: 'Briefcase', component: Briefcase },
  { name: 'MapPin', component: MapPin },
  { name: 'Landmark', component: Landmark },
  { name: 'GraduationCap', component: GraduationCap },
  { name: 'ShieldAlert', component: ShieldAlert },
  { name: 'FileText', component: FileText },
  { name: 'HelpCircle', component: HelpCircle },
  { name: 'Shield', component: Shield },
  { name: 'Anchor', component: Anchor },
  { name: 'Settings', component: Settings },
  { name: 'Bell', component: Bell },
  { name: 'Layers', component: Layers },
  { name: 'Grid', component: Grid },
  { name: 'Cpu', component: Cpu },
  { name: 'Database', component: Database },
  { name: 'Folder', component: Folder },
  { name: 'Activity', component: Activity },
  { name: 'BarChart', component: BarChart },
  { name: 'Lock', component: Lock }, 
  { name: 'Plus', component: Plus }, 
  { name: 'Save', component: Save }, 
  { name: 'Eye', component: Eye }, 
  { name: 'Edit3', component: Edit3 }, 
  { name: 'Layers3', component: Layers3 }, 
  { name: 'FolderPlus', component: FolderPlus }, 
  { name: 'Trash2', component: Trash2 },
  { name: 'Edit2', component: Edit2 },
  { name: 'Check', component: Check },
  { name: 'X', component: X },
  { name: 'EyeOff', component: EyeOff },
  { name: 'Search', component: Search },
  { name: 'SlidersHorizontal', component: SlidersHorizontal },
  { name: 'AlertTriangle', component: AlertTriangle },
  { name: 'ShieldCheck', component: ShieldCheck },
  { name: 'Globe', component: Globe },
  { name: 'ChevronDown', component: ChevronDown }
];

const SectionIconRenderer = ({ iconName, size = 14, ...props }) => {
  const matched = AVAILABLE_SECTION_ICONS.find(i => i.name === iconName);
  const IconComponent = matched ? matched.component : HelpCircle;
  return <IconComponent size={size} {...props} />;
};

export default function FormSchemaBuilder({ activeFormCode = 'EMPLOYEE_MASTER_DIRECTORY', onSaveSuccess, menuList = [] }) {
  const [formCode, setFormCode] = useState(activeFormCode.trim().toUpperCase());
  const [formName, setFormName] = useState('Employee Master Directory Entry Form');
  const [formIcon, setFormIcon] = useState('Briefcase');
  const [targetLayoutMode, setTargetLayoutMode] = useState('LISTING_AND_FORM');
  const [menuId, setMenuId] = useState('');
  
  const [sections, setSections] = useState([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [newSectionLabel, setNewSectionLabel] = useState('');
  const [newSectionIcon, setNewSectionIcon] = useState('FileText');
  
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionLabel, setEditingSectionLabel] = useState('');
  const [editingSectionIcon, setEditingSectionIcon] = useState('');

  const [fields, setFields] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]); 
  const [availableForms, setAvailableForms] = useState([]); 
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const employeeSystemFixedFields = [
    { field_key: 'employee_code', label: 'Employee Identifier Code', input_type: 'text', id: 'employee_code', name: 'employee_code', section: 'personal_info', validations: { required: true, min_length: 3, max_length: 30 }, allowed_roles: [], is_active: true, is_fixed: true },
    { field_key: 'employee_email', label: 'Corporate Employee Email', input_type: 'email', id: 'employee_email', name: 'employee_email', section: 'personal_info', validations: { required: true, min_length: 5, max_length: 100 }, allowed_roles: [], is_active: true, is_fixed: true },
    { 
      field_key: 'employee_role', 
      label: 'System Access Assignment Role', 
      input_type: 'select', 
      section: 'security', 
      options: systemRoles, 
      validations: { required: true }, 
      allowed_roles: [], 
      is_active: true, 
      is_fixed: true 
    }
  ];

  const isEmployeeFormType = formCode === 'EMPLOYEE_MASTER_DIRECTORY';
  const effectiveFixedFields = isEmployeeFormType ? employeeSystemFixedFields : [];

  const fetchFormSectionsFromDb = async (targetCode = formCode) => {
    if (!targetCode) return;
    setIsLoadingSections(true);
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/form_sections/form-sections?form_code=${targetCode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.sections)) {
        setSections(data.sections);
      }
    } catch (err) {
      console.error("Failed to query the form_sections collection repository pipeline:", err);
    } finally {
      setIsLoadingSections(false);
    }
  };

  const fetchSchemaMetadata = (targetCode = formCode) => {
    if (!targetCode) return;
    const token = localStorage.getItem('accessToken');
    
    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/${targetCode.toUpperCase()}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error(`Server returned status code: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data) {
          setFormName(data.form_name || `${targetCode.replace(/_/g, ' ')} Schema Form`);
          setFormIcon(data.form_icon || 'Briefcase');
          setTargetLayoutMode(data.target_layout_mode || 'LISTING_AND_FORM');
          setMenuId(data.menu_id || '');

          if (Array.isArray(data.fields)) {
            const filteredUserFields = data.fields.filter(f => 
              !employeeSystemFixedFields.some(s => s.field_key === f.field_key)
            ).map(f => ({
              ...f,
              options: Array.isArray(f.options) ? f.options.join(', ') : (f.options || ''),
              lookup_form_code: f.lookup_form_code || '',
              lookup_field_key: f.lookup_field_key || ''
            }));
            setFields(filteredUserFields);
          } else {
            setFields([]);
          }
        }
      })
      .catch((err) => {
        console.warn("Initializing blank configuration canvas template:", err.message);
        setFormName(`${targetCode.replace(/_/g, ' ')} Entry Form`);
        setFields([]);
      });
  };

  const loadWorkspaceOptionsList = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/forms/list-all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setAvailableForms(result.data);
      }
    } catch (err) {
      console.error("Could not load form lists configuration drop down:", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/roles`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setSystemRoles(res.data.map(r => r.role_code));
        }
      })
      .catch(err => console.error("Could not seed roles metadata:", err));

    loadWorkspaceOptionsList();
  }, []);

  useEffect(() => {
    if (formCode) {
      fetchSchemaMetadata(formCode);
      fetchFormSectionsFromDb(formCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formCode]);

  const handleDropdownSelectionChange = (selectedCode) => {
    if (!selectedCode) {
      setFormCode('');
      setFormName('New Dynamic Module Entry Form');
      setFormIcon('Briefcase');
      setTargetLayoutMode('LISTING_AND_FORM');
      setFields([]);
      setSections([]);
      setIsEditMode(false);
      return;
    }
    const formattedCode = selectedCode.toUpperCase();
    setFormCode(formattedCode);
    setIsEditMode(true); 
  };

  const handleCreateNewSectionCollectionNode = async () => {
    const trimmedLabel = newSectionLabel.trim();
    if (!trimmedLabel || !formCode) return;

    const targetSectionId = trimmedLabel.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    if (sections.some(sec => sec.id === targetSectionId)) {
      alert("A partition with that id identifier code already exists on this data layout.");
      return;
    }

    const payload = {
      form_code: formCode,
      id: targetSectionId,
      label: trimmedLabel,
      icon: newSectionIcon,
      is_active: true
    };

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/form_sections/form-sections/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        setSections([...sections, data.section || payload]);
        setNewSectionLabel('');
        setNewSectionIcon('FileText');
      } else {
        alert(`Database rejection: ${data.message}`);
      }
    } catch (err) {
      console.error("Failed writing new record block to form_sections collection cluster:", err);
    }
  };

  const startEditingSection = (section) => {
    setEditingSectionId(section.id);
    setEditingSectionLabel(section.label);
    setEditingSectionIcon(section.icon || 'FileText');
  };

  const handleUpdateSectionProperties = async () => {
    const trimmed = editingSectionLabel.trim();
    if (!trimmed) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/form_sections/form-sections/update/${editingSectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ form_code: formCode, label: trimmed, icon: editingSectionIcon })
      });
      const data = await response.json();
      if (data.success) {
        setSections(sections.map(s => s.id === editingSectionId ? { ...s, label: trimmed, icon: editingSectionIcon } : s));
        setEditingSectionId(null);
      }
    } catch (err) {
      console.error("Error updating configuration row index properties:", err);
    }
  };

  const toggleSectionActiveStatus = async (sectionId) => {
    const targetSection = sections.find(s => s.id === sectionId);
    if (!targetSection) return;

    if (targetSection.is_active && fields.some(f => f.section === sectionId && f.is_active)) {
      alert(`Cannot disable section. Hidden targets still contain active linked structural fields inside variables mapping grid.`);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/form_sections/form-sections/toggle/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ form_code: formCode, is_active: !targetSection.is_active })
      });
      if (response.ok) {
        setSections(sections.map(s => s.id === sectionId ? { ...s, is_active: !s.is_active } : s));
      }
    } catch (err) {
      console.error("Status modification pipeline failed to transition state:", err);
    }
  };

  const handleHardDeleteSectionCollectionNode = async (sectionId) => {
    if (fields.some(f => f.section === sectionId)) {
      alert("Database constraints error: variables mapping rules currently rely on this partition node structure.");
      return;
    }
    if (!confirm("Are you certain you want to permanently delete this dynamic layout document node configuration from form_sections?")) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/form_sections/form-sections/delete/${sectionId}?form_code=${formCode}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSections(sections.filter(s => s.id !== sectionId));
      }
    } catch (err) {
      console.error("Deletion operations terminated early:", err);
    }
  };

  const addFieldRow = () => {
    const firstActiveSection = sections.find(s => s.is_active)?.id || 'dynamic_meta';
    setFields([...fields, {
      field_key: '', label: '', input_type: 'text', section: firstActiveSection, options: '',
      lookup_form_code: '', lookup_field_key: '',
      validations: { 
        required: false, min_length: 0, max_length: 255, min_val: '', max_val: '',
        regex_pattern: '', regex_error_msg: '', max_file_size_mb: 5, allowed_file_types: '.pdf,.png,.jpg',
        date_restriction: 'none'
      },
      allowed_roles: [], is_active: true
    }]);
  };

  const removeFieldRow = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index, fieldPath, value) => {
    const updated = [...fields];
    if (fieldPath.startsWith('validations.')) {
      const key = fieldPath.split('.')[1];
      if (!updated[index].validations) updated[index].validations = {};
      updated[index].validations[key] = value;
    } else {
      updated[index][fieldPath] = value;
    }
    setFields(updated);
  };

  const toggleRolePermission = (index, role) => {
    const updated = [...fields];
    const currentRoles = updated[index].allowed_roles || [];
    if (currentRoles.includes(role)) {
      updated[index].allowed_roles = currentRoles.filter(r => r !== role);
    } else {
      updated[index].allowed_roles = [...currentRoles, role];
    }
    setFields(updated);
  };

  const handleSaveSchema = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus(null);

    const processedCustomFields = fields.map(f => {
      const isOptionBased = ['select', 'multi_select', 'radio', 'checkbox_group'].includes(f.input_type);
      const isLookup = f.input_type === 'database_lookup';
      return {
        ...f,
        field_key: f.field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        options: isOptionBased ? (typeof f.options === 'string' ? f.options.split(',').map(o => o.trim()).filter(Boolean) : f.options) : [],
        lookup_form_code: isLookup ? f.lookup_form_code : '',
        lookup_field_key: isLookup ? f.lookup_field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') : ''
      };
    });

    const cleanFormCode = formCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const computedRoutePath = `/app/workspace/${cleanFormCode.toLowerCase().replace(/_/g, '-')}`;

    const finalPayload = {
      form_code: cleanFormCode,
      form_name: formName,
      form_icon: formIcon,
      target_layout_mode: targetLayoutMode,
      menu_id: menuId, 
      app_route_path: computedRoutePath, 
      fields: [...effectiveFixedFields, ...processedCustomFields]
    };

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(finalPayload)
      });
      const data = await response.json();
      if (response.ok || data.success) {
        setStatus({ type: 'success', message: 'Successful save' });
        setIsEditMode(false); 
        loadWorkspaceOptionsList(); 
        if (onSaveSuccess) onSaveSuccess(cleanFormCode);
      } else {
        setStatus({ type: 'error', message: data.message || 'Validation error saving configuration layouts.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: `Submission break: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mac-form-wrapper-canvas">
      <div className="mac-form-window-frame schema-builder-frame">
        <header className="mac-form-header schema-header">
          <div className="schema-header-left">
            <h2 className="window-title-text">Blueprint Engine System Designer</h2>
          </div>
          
          <div className="schema-header-right">
            <button 
              type="button" 
              onClick={() => {
                setIsEditMode(!isEditMode);
                if (!isEditMode) fetchSchemaMetadata(); 
              }}
              className={`mac-btn-action small ${isEditMode ? 'danger' : 'secondary'}`}
            >
              <Edit3 size={14} />
              {isEditMode ? "Cancel Schema Edit Mode" : "Modify Configurations"}
            </button>

            <div className="schema-selector-badge">
              <Layers3 size={14} color="#475569" />
              <select 
                className="schema-selector-dropdown"
                value={formCode} 
                onChange={(e) => handleDropdownSelectionChange(e.target.value)}
              >
                <option value="">-- Start Fresh Design Map --</option>
                {availableForms.map(f => (
                  <option key={f.form_code} value={f.form_code}>
                    {f.form_name} ({f.form_code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <form className="mac-form-content-view" onSubmit={handleSaveSchema}>
          <h3 className="section-pane-heading"><Settings size={16} /> Global System Parameters</h3>
          
          <GlobalParametersPanel 
            formCode={formCode} setFormCode={setFormCode}
            formName={formName} setFormName={setFormName}
            formIcon={formIcon} setFormIcon={setFormIcon}
            targetLayoutMode={targetLayoutMode} setTargetLayoutMode={setTargetLayoutMode}
            menuId={menuId} setMenuId={setMenuId}
            menuList={menuList}
            isEditMode={isEditMode} fieldsLength={fields.length}
          />

          {/* DYNAMIC FORM SECTION WIDGET MANAGER CONNECTED TO form_sections COLLECTION */}
          <div className="dynamic-sections-container">
            <h4 className="dynamic-sections-heading">
              <FolderPlus size={16} color="#475569" /> Dynamic `form_sections` Collection Engine (Linked to: {formCode || 'NONE'})
            </h4>
            
            <div className="section-creator-row">
              <div className="section-input-group">
                <label className="section-label-text">Section UI Label</label>
                <input 
                  type="text" 
                  className="section-input-field"
                  value={newSectionLabel} 
                  onChange={e => setNewSectionLabel(e.target.value)} 
                  placeholder="e.g., Security Rules" 
                  disabled={!formCode}
                />
              </div>

              <div className="section-icon-group">
                <label className="section-label-text">Select Section Icon</label>
                <div className="section-icon-grid">
                  {AVAILABLE_SECTION_ICONS.map((i) => {
                    const isSelected = newSectionIcon === i.name;
                    return (
                      <button
                        key={i.name}
                        type="button"
                        title={i.name}
                        disabled={!formCode}
                        onClick={() => setNewSectionIcon(i.name)}
                        className={`icon-select-btn ${isSelected ? 'selected' : ''}`}
                      >
                        <SectionIconRenderer iconName={i.name} size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="section-button-group">
                <span className="section-selected-tag" style={{ visibility: newSectionIcon ? 'visible' : 'hidden' }}>
                  Selected: <strong>{newSectionIcon}</strong>
                </span>
                <button 
                  type="button" 
                  className="mac-btn-action primary small btn-save-section" 
                  onClick={handleCreateNewSectionCollectionNode}
                  disabled={!formCode}
                >
                  Save to form_sections
                </button>
              </div>
            </div>

            {isLoadingSections ? (
              <div style={{ fontSize: '12px', color: '#64748b' }}>Querying layout metadata collection...</div>
            ) : (
              <div className="sections-chips-wrap">
                {sections.map((sec) => {
                  const isEditing = editingSectionId === sec.id;
                  
                  return (
                    <div 
                      key={sec.id} 
                      className={`section-badge-chip ${!sec.is_active ? 'inactive' : ''}`}
                    >
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="text" 
                            value={editingSectionLabel} 
                            onChange={(e) => setEditingSectionLabel(e.target.value)}
                            style={{ height: '24px', fontSize: '11px', padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '120px' }}
                          />
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0 4px', height: '24px' }}>
                            <select 
                              value={editingSectionIcon}
                              onChange={(e) => setEditingSectionIcon(e.target.value)}
                              style={{ border: 'none', fontSize: '11px', outline: 'none', background: 'transparent' }}
                            >
                              {AVAILABLE_SECTION_ICONS.map(i => (
                                <option key={i.name} value={i.name}>{i.name}</option>
                              ))}
                            </select>
                          </div>

                          <button type="button" onClick={handleUpdateSectionProperties} className="chip-action-btn" style={{ color: '#16a34a' }}>
                            <Check size={14} />
                          </button>
                          <button type="button" onClick={() => setEditingSectionId(null)} className="chip-action-btn" style={{ color: '#dc2626' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <SectionIconRenderer iconName={sec.icon} style={{ opacity: 0.8 }} />
                          <span>
                            {sec.label} <code style={{ fontSize: '10px', opacity: 0.5 }}>[{sec.form_code || formCode}]</code>
                          </span>
                          
                          <div className="section-chip-actions">
                            <button type="button" title="Modify Display Property" onClick={() => startEditingSection(sec)} className="chip-action-btn" style={{ color: '#475569' }}>
                              <Edit2 size={12} />
                            </button>
                            <button type="button" title="Toggle visibility status" onClick={() => toggleSectionActiveStatus(sec.id)} className="chip-action-btn" style={{ color: sec.is_active ? '#3b82f6' : '#ef4444' }}>
                              {sec.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                            <button type="button" title="Drop Section Collection Record" onClick={() => handleHardDeleteSectionCollectionNode(sec.id)} className="chip-action-btn" style={{ color: '#ef4444' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="section-sub-header flex-split" style={{ marginBottom: '15px' }}>
            <h3 className="section-pane-heading"><Eye size={16} /> Variables Mapping</h3>
            <button type="button" className="mac-btn-action primary small" onClick={addFieldRow} disabled={!formCode || sections.length === 0}>
              <Plus size={14}/> Append Variable Element
            </button>
          </div>

          <div className="form-scroll-viewport">
            <SystemImmutableCards effectiveFixedFields={effectiveFixedFields} />

            {fields.map((field, idx) => (
              <FieldControlCard 
                key={idx}
                field={field}
                idx={idx}
                sections={sections.filter(s => s.is_active)} 
                handleFieldChange={handleFieldChange}
                removeFieldRow={removeFieldRow}
                toggleRolePermission={toggleRolePermission}
                availableForms={availableForms}
                systemRoles={systemRoles}
              />
            ))}
          </div>

          <footer className="mac-form-footer-action-row">
            <div>
              {status && (
                <span className={`status-message ${status.type}`}>
                  {status.message}
                </span>
              )}
            </div>
            <button type="submit" className="mac-btn-action primary" disabled={isSaving || !formCode}>
              <Save size={16}/> {isSaving ? 'Synchronizing...' : 'Save Layout'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}