import React from 'react';
import { LayoutGrid, Briefcase, User, Shield, Settings, Folder, Database, FileText, Layers, Link2 } from 'lucide-react';
import '../styles/GlobalParametersPanel.css';

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

    </div>
  );
}