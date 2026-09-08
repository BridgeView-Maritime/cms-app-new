import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, Briefcase, User, Shield, Settings, Folder, Database, FileText, 
  Layers, Link2, Download, ExternalLink, Columns, Plus, Trash2, ArrowUp, ArrowDown, Edit3
} from 'lucide-react';
import '../styles/GlobalParametersPanel.css';
import { AUTH_ENDPOINTS } from '../config/api';

const MASTER_ICON_OPTIONS = [
  { value: 'Briefcase', label: 'Briefcase / HR Management', icon: Briefcase },
  { value: 'User', label: 'User Profile Matrix', icon: User },
  { value: 'Shield', label: 'Shield Security Lock', icon: Shield },
  { value: 'Settings', label: 'Gear Control Engine', icon: Settings },
  { value: 'Folder', label: 'Directory Data Folder', icon: Folder },
  { value: 'Database', label: 'Storage Cluster Node', icon: Database },
  { value: 'FileText', label: 'Document Ledger Sheet', icon: FileText },
  { value: 'Layers', label: 'Structural Tree Layers', icon: Layers }
];

export default function GlobalParametersPanel({ 
  formCode, setFormCode, 
  formName, setFormName, 
  formIcon, setFormIcon, 
  targetLayoutMode, setTargetLayoutMode,
  menuId, setMenuId, 
  menuList = [], 
  availableForms = [],
  listingConfig = {}, setListingConfig,
  isEditMode, fieldsLength,
  systemRoles = []
}) {
  const [targetSchemaFields, setTargetSchemaFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);

  // Recursively maps and formats menu items into clear hierarchical labels
  const getDropdownLabel = (menu) => {
    if (menu.parent_id) {
      const parent = menuList.find(p => p._id === menu.parent_id);
      return `└─ ${parent ? parent.menu_name : 'Parent'} > ${menu.menu_name}`;
    }
    return `📁 ${menu.menu_name} (Top Level Node)`;
  };

  // Fetch available fields when listing source form code changes
  useEffect(() => {
    if (targetLayoutMode === 'LISTING_ONLY' && listingConfig?.sourceFormCode) {
      setLoadingFields(true);
      const token = localStorage.getItem('accessToken');
      fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/${listingConfig.sourceFormCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.fields)) {
            setTargetSchemaFields(data.fields);
          } else {
            setTargetSchemaFields([]);
          }
        })
        .catch(err => console.error("Error fetching schema fields:", err))
        .finally(() => setLoadingFields(false));
    }
  }, [targetLayoutMode, listingConfig?.sourceFormCode]);

  const handleListingConfigChange = (key, value) => {
    setListingConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleColumnToggle = (fieldKey) => {
    const currentCols = listingConfig?.selectedColumns || [];
    const updatedCols = currentCols.includes(fieldKey)
      ? currentCols.filter(c => c !== fieldKey)
      : [...currentCols, fieldKey];
    handleListingConfigChange('selectedColumns', updatedCols);
  };

  // Dynamic Multi-Button Configurations
  const redirectButtons = listingConfig?.redirectButtons || [
    {
      id: 'btn_1',
      label: listingConfig?.redirectButtonLabel || 'Create Record',
      href: listingConfig?.redirectButtonHref || '',
      allowed_roles: [],
      order: 1
    }
  ];

  const updateRedirectButtons = (newButtons) => {
    handleListingConfigChange('redirectButtons', newButtons);
  };

  const handleAddRedirectButton = () => {
    const newBtn = {
      id: `btn_${Date.now()}`,
      label: 'New Action',
      href: '',
      allowed_roles: [],
      order: redirectButtons.length + 1
    };
    updateRedirectButtons([...redirectButtons, newBtn]);
  };

  const handleRemoveRedirectButton = (index) => {
    const updated = redirectButtons.filter((_, i) => i !== index);
    updateRedirectButtons(updated);
  };

  const handleRedirectButtonChange = (index, key, value) => {
    const updated = [...redirectButtons];
    updated[index] = { ...updated[index], [key]: value };
    updateRedirectButtons(updated);
  };

  const toggleButtonRolePermission = (index, role) => {
    const updated = [...redirectButtons];
    const currentRoles = updated[index].allowed_roles || [];
    if (currentRoles.includes(role)) {
      updated[index].allowed_roles = currentRoles.filter(r => r !== role);
    } else {
      updated[index].allowed_roles = [...currentRoles, role];
    }
    updateRedirectButtons(updated);
  };

  const moveButtonOrder = (index, direction) => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= redirectButtons.length) return;
    const updated = [...redirectButtons];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    // Normalize order index
    const reordered = updated.map((btn, i) => ({ ...btn, order: i + 1 }));
    updateRedirectButtons(reordered);
  };

  // Row-Wise Data Actions Configuration
  const rowActionsConfig = listingConfig?.rowActionsConfig || {
    enableActionColumn: true,
    allowEdit: true,
    allowDelete: true,
    allowInlineAdd: false,
    inlineAddFormCode: '',
    customRowButtons: []
  };

  const handleRowActionsConfigChange = (key, value) => {
    handleListingConfigChange('rowActionsConfig', {
      ...rowActionsConfig,
      [key]: value
    });
  };

  return (
    <div className="mac-form-grid-4x global-parameters-panel">
      
      {/* 1. Target Nav Bind Selector Block */}
      <div className="form-control-block">
        <label className="param-label-flex">
          <Link2 size={13} /> Target Active App Menu Link
        </label>
        <select
          value={menuId || ''}
          onChange={(e) => {
            const selectedMenuId = e.target.value;
            setMenuId(selectedMenuId);
            
            const selectedMenu = menuList.find(m => m._id === selectedMenuId);
            if (selectedMenu) {
              const computedCode = selectedMenu.menu_name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
              setFormCode(computedCode);
              setFormName(`${selectedMenu.menu_name} Management Interface Matrix`);
              setFormIcon(selectedMenu.menu_icon || 'Folder');
            } else {
              setFormCode('');
              setFormName('');
            }
          }}
          disabled={!isEditMode && fieldsLength > 0}
        >
          <option value="">-- Choose Target Active View Menu Node --</option>
          {menuList.map((m) => (
            <option key={m._id} value={m._id}>
              {getDropdownLabel(m)}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Auto-Populated Code Variable Identifier */}
      <div className="form-control-block">
        <label>Form Auto-Generated Key Code</label>
        <input 
          type="text" 
          value={formCode} 
          disabled 
          placeholder="Select a menu to generate code"
          className="param-input-disabled" 
        />
      </div>

      {/* 3. Component Workspace UI Title */}
      <div className="form-control-block">
        <label>Workspace Component Name</label>
        <input 
          type="text" 
          value={formName} 
          onChange={(e) => setFormName(e.target.value)} 
          placeholder="Form Window Title Label" 
        />
      </div>

      {/* 4. Display Configuration Split Options Matrix */}
      <div className="form-control-block param-mode-block">
        <label className="param-mode-label">
          <LayoutGrid size={13} /> View Runtime Engine Mode
        </label>
        <select 
          value={targetLayoutMode} 
          onChange={(e) => setTargetLayoutMode(e.target.value)}
          className="param-mode-select"
        >
          <option value="LISTING_AND_FORM">LISTING_AND_FORM (Ledger Table & Editor Split)</option>
          <option value="FORM_ONLY">FORM_ONLY (Direct Input Form Wizard Matrix)</option>
          <option value="LISTING_ONLY">LISTING_ONLY (Standalone Immutable Data Grid)</option>
        </select>
      </div>

      {/* 5. LISTING_ONLY Extended Configuration Panel */}
      {targetLayoutMode === 'LISTING_ONLY' && (
        <div className="listing-only-config-wrapper" style={{ gridColumn: 'span 4', background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '10px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={15} color="#086982" /> LISTING_ONLY Data Grid & Action Configuration
          </h4>

          {/* Source Schema & Data Download Options */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <div className="form-control-block">
              <label><Database size={13} /> Target Data Source Form Code</label>
              <select
                value={listingConfig?.sourceFormCode || ''}
                onChange={(e) => handleListingConfigChange('sourceFormCode', e.target.value)}
              >
                <option value="">-- Select Source Form Data --</option>
                {availableForms.map(f => (
                  <option key={f.form_code} value={f.form_code}>
                    {f.form_name} ({f.form_code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '0 12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={14} /> Export Options:
              </span>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={!!listingConfig?.allowExcelExport} 
                  onChange={(e) => handleListingConfigChange('allowExcelExport', e.target.checked)}
                /> Enable Excel
              </label>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={!!listingConfig?.allowPdfExport} 
                  onChange={(e) => handleListingConfigChange('allowPdfExport', e.target.checked)}
                /> Enable PDF
              </label>
            </div>
          </div>

          {/* Multi-Button Options, Sequence Ordering & Role Permissions */}
          <div style={{ marginTop: '16px', background: '#ffffff', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ExternalLink size={14} color="#086982" /> Header Action & Navigation Target Redirect Buttons
              </span>
              <button
                type="button"
                className="mac-btn-action primary small"
                onClick={handleAddRedirectButton}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                <Plus size={12} /> Add Header Redirect Button
              </button>
            </div>

            {redirectButtons.map((btn, index) => (
              <div key={btn.id || index} style={{ border: '1px dashed #cbd5e1', borderRadius: '4px', padding: '10px', marginBottom: '8px', background: '#fafafa' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 2fr auto', gap: '10px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button type="button" onClick={() => moveButtonOrder(index, 'up')} disabled={index === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                      <ArrowUp size={12} color={index === 0 ? '#ccc' : '#475569'} />
                    </button>
                    <button type="button" onClick={() => moveButtonOrder(index, 'down')} disabled={index === redirectButtons.length - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                      <ArrowDown size={12} color={index === redirectButtons.length - 1 ? '#ccc' : '#475569'} />
                    </button>
                  </div>

                  <div>
                    <input 
                      type="text" 
                      value={btn.label} 
                      onChange={(e) => handleRedirectButtonChange(index, 'label', e.target.value)}
                      placeholder="Button Label (e.g., Create Record)"
                      style={{ width: '100%', fontSize: '12px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>

                  <div>
                    <input 
                      type="text" 
                      value={btn.href} 
                      onChange={(e) => handleRedirectButtonChange(index, 'href', e.target.value)}
                      placeholder="Target Href / Route (e.g., /app/workspace/create-record)"
                      style={{ width: '100%', fontSize: '12px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>

                  <button type="button" onClick={() => handleRemoveRedirectButton(index)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Role Wise Show Permissions Selection */}
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Visible To Roles:</span>
                  {systemRoles.length === 0 ? (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>All Roles (Public)</span>
                  ) : (
                    systemRoles.map(role => {
                      const isChecked = (btn.allowed_roles || []).includes(role);
                      return (
                        <label key={role} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: isChecked ? '#e0f2fe' : '#fff', padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: '3px' }}>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleButtonRolePermission(index, role)}
                          />
                          {role}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Row Wise Data Edit "Action" Column Controls & Row Wise Data Add Button Configuration */}
          <div style={{ marginTop: '16px', background: '#ffffff', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit3 size={14} color="#086982" /> Row-Wise "Action" Column Data & In-line Row Data Operations
            </h5>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={!!rowActionsConfig.enableActionColumn} 
                  onChange={(e) => handleRowActionsConfigChange('enableActionColumn', e.target.checked)}
                /> Show "Action" Column
              </label>

              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={!!rowActionsConfig.allowEdit} 
                  onChange={(e) => handleRowActionsConfigChange('allowEdit', e.target.checked)}
                  disabled={!rowActionsConfig.enableActionColumn}
                /> Allow Row Edit
              </label>

              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={!!rowActionsConfig.allowDelete} 
                  onChange={(e) => handleRowActionsConfigChange('allowDelete', e.target.checked)}
                  disabled={!rowActionsConfig.enableActionColumn}
                /> Allow Row Delete
              </label>

              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={!!rowActionsConfig.allowInlineAdd} 
                  onChange={(e) => handleRowActionsConfigChange('allowInlineAdd', e.target.checked)}
                  disabled={!rowActionsConfig.enableActionColumn}
                /> Enable Row-Wise Data Add Button
              </label>
            </div>

            {rowActionsConfig.allowInlineAdd && (
              <div className="form-control-block" style={{ marginTop: '8px' }}>
                <label><Plus size={12} /> Target Form / Target Href for Row Data Add Button</label>
                <input 
                  type="text" 
                  value={rowActionsConfig.inlineAddFormCode || ''} 
                  onChange={(e) => handleRowActionsConfigChange('inlineAddFormCode', e.target.value)}
                  placeholder="e.g., /app/workspace/add-child-item or CHILD_FORM_CODE"
                  style={{ width: '100%', fontSize: '12px', padding: '6px' }}
                />
              </div>
            )}
          </div>

          {/* Display Grid Columns Selection */}
          <div className="form-control-block" style={{ marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Columns size={13} /> Select Display Grid Columns for ({listingConfig?.sourceFormCode || 'None'})
            </label>
            {loadingFields ? (
              <span style={{ fontSize: '12px', color: '#64748b' }}>Loading schema column attributes...</span>
            ) : targetSchemaFields.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Please select a target form code schema above to view column choices.</span>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', maxHeight: '140px', overflowY: 'auto', background: '#fff', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                {targetSchemaFields.map(field => {
                  const isChecked = (listingConfig?.selectedColumns || []).includes(field.field_key);
                  return (
                    <label key={field.field_key} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleColumnToggle(field.field_key)}
                      />
                      {field.label} <code style={{ fontSize: '10px', color: '#64748b' }}>({field.field_key})</code>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}