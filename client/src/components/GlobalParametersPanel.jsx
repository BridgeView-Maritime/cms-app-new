import React from 'react';
import { LayoutGrid, Briefcase, User, Shield, Settings, Folder, Database, FileText, Layers, Link2 } from 'lucide-react';

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
  menuId, setMenuId,          // Added bindings for parent state
  menuList = [],              // Receives navigation options array from context
  isEditMode, fieldsLength 
}) {

  // Recursively maps and formats menu items into clear hierarchical labels
  const getDropdownLabel = (menu) => {
    if (menu.parent_id) {
      const parent = menuList.find(p => p._id === menu.parent_id);
      return `└─ ${parent ? parent.menu_name : 'Parent'} > ${menu.menu_name}`;
    }
    return `📁 ${menu.menu_name} (Top Level Node)`;
  };

  return (
    <div className="mac-form-grid-4x" style={{ marginBottom: '25px', gap: '15px' }}>
      
      {/* 1. Target Nav Bind Selector Block */}
      <div className="form-control-block">
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
          <Link2 size={13} /> Target Active App Menu Link
        </label>
        <select
          value={menuId || ''}
          onChange={(e) => {
            const selectedMenuId = e.target.value;
            setMenuId(selectedMenuId);
            
            const selectedMenu = menuList.find(m => m._id === selectedMenuId);
            if (selectedMenu) {
              // Sanitize and transform the label to automatically create the uniform database key code
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

      {/* 2. Auto-Populated Code Variable Identifier (Disabled to ensure strict structural validation matching) */}
      <div className="form-control-block">
        <label>Form Auto-Generated Key Code</label>
        <input 
          type="text" 
          value={formCode} 
          disabled 
          placeholder="Select a menu to generate code"
          style={{ backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: '700', cursor: 'not-allowed' }} 
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
      <div className="form-control-block" style={{ borderLeft: '2px dashed #3b82f6', paddingLeft: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e3a8a', fontWeight: 'bold' }}>
          <LayoutGrid size={13} /> View Runtime Engine Mode
        </label>
        <select 
          value={targetLayoutMode} 
          onChange={(e) => setTargetLayoutMode(e.target.value)}
          style={{ backgroundColor: '#eff6ff', borderColor: '#93c5fd', fontWeight: '600', color: '#1e40af' }}
        >
          <option value="LISTING_AND_FORM">LISTING_AND_FORM (Ledger Table & Editor Split)</option>
          <option value="FORM_ONLY">FORM_ONLY (Direct Input Form Wizard Matrix)</option>
          <option value="LISTING_ONLY">LISTING_ONLY (Standalone Immutable Data Grid)</option>
        </select>
      </div>

    </div>
  );
}