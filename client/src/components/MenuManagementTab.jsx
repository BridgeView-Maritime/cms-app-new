// client/src/components/MenuManagementTab.jsx
import React from 'react';
import * as Icons from 'lucide-react';
import '../styles/MenuManagementTab.css';

export default function MenuManagementTab({
  menuForm,
  setMenuForm,
  editingMenuId,
  menuList = [],
  renderIcon,
  handleMenuSubmission,
  cancelMenuEdit,
  startEditMenu,
  toggleMenuStatus
}) {
  const iconOptions = [
    'Shield', 'Anchor', 'Briefcase', 'FileText', 'User', 'Settings', 'Bell', 
    'Layers', 'Grid', 'Cpu', 'Database', 'Folder', 'Activity', 'BarChart', 'Lock', 
    'MapPin', 'Landmark', 'GraduationCap', 'ShieldAlert', 'HelpCircle', 'Plus', 
    'Save', 'Eye', 'Edit3', 'Layers3', 'FolderPlus', 'Trash2', 'Edit2', 'Check', 'X', 'EyeOff', 'Send', 'History', 'Search', 'SlidersHorizontal', 'AlertTriangle', 'ShieldCheck', 'Globe', 'ChevronDown'
  ];

  /**
   * Cleans input string by removing special characters and replacing spaces/hyphens with underscores
   */
  const sanitizeSubmenuSegment = (rawText) => {
    // Strip leading `/app/workspace/` if user pastes or types over it
    let cleanText = rawText.replace(/^\/app\/workspace\/?/i, '');
    
    // Replace non-alphanumeric characters (including spaces and dashes) with underscores
    cleanText = cleanText.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Collapses multiple consecutive underscores into a single underscore
    cleanText = cleanText.replace(/_+/g, '_');

    return cleanText ? `/app/workspace/${cleanText.toLowerCase()}` : '/app/workspace/';
  };

  /**
   * Handles parent selection dropdown changes
   */
  const handleParentChange = (e) => {
    const selectedParentId = e.target.value;
    
    if (selectedParentId) {
      // Set parent ID and initialize sub-route default structure
      setMenuForm({
        ...menuForm,
        parent_id: selectedParentId,
        route: '/app/workspace/'
      });
    } else {
      // Revert parent ID to top-level
      setMenuForm({
        ...menuForm,
        parent_id: ''
      });
    }
  };

  /**
   * Handles Route input updates
   */
  const handleRouteInputChange = (e) => {
    const inputValue = e.target.value;

    if (menuForm.parent_id) {
      // Apply strict formatting rules for submenus
      const formattedRoute = sanitizeSubmenuSegment(inputValue);
      setMenuForm({ ...menuForm, route: formattedRoute });
    } else {
      // Normal route typing for top-level menus
      setMenuForm({ ...menuForm, route: inputValue });
    }
  };

  return (
    <div className="menu-management-container">
      {/* Menu Form Side */}
      <form onSubmit={handleMenuSubmission} className="menu-form-card">
        <h3 className="menu-form-title">
          {editingMenuId ? 'Modify Custom View Module' : 'Custom View Module'}
        </h3>
        
        <div className="menu-field-group">
          <label className="menu-field-label">Menu Structural Label *</label>
          <input 
            type="text" 
            placeholder="e.g. Operations Map" 
            required 
            value={menuForm.menu_name || ''} 
            onChange={e => setMenuForm({...menuForm, menu_name: e.target.value})} 
            className="menu-text-input" 
          />
        </div>

        <div className="menu-field-group">
          <label className="menu-field-label">
            Select Menu Icon
          </label>
          
          <div className="menu-icon-picker-grid">
            {iconOptions.map((iconName) => {
              const IconComponent = Icons[iconName] || Icons.HelpCircle;
              const isSelected = menuForm.menu_icon === iconName;

              return (
                <button
                  key={iconName}
                  type="button"
                  title={iconName}
                  onClick={() => setMenuForm({ ...menuForm, menu_icon: iconName })}
                  className={`menu-icon-btn ${isSelected ? 'selected' : ''}`}
                >
                  <IconComponent size={18} strokeWidth={isSelected ? 2.5 : 2} />
                </button>
              );
            })}
          </div>
          
          {menuForm.menu_icon && (
            <span className="menu-icon-selected-hint">
              Selected Identifier: <strong>{menuForm.menu_icon}</strong>
            </span>
          )}
        </div>

        <div className="menu-field-group">
          <label className="menu-field-label">Parent Structure Assignment (For Submenus)</label>
          <select 
            value={menuForm.parent_id || ''} 
            onChange={handleParentChange} 
            className="menu-select-input"
          >
            <option value="">-- Set as Top Level Parent Head --</option>
            {menuList.filter(m => !m.parent_id && m._id !== editingMenuId).map(parent => (
              <option key={parent._id} value={parent._id}>{parent.menu_name}</option>
            ))}
          </select>
        </div>

        <div className="menu-field-group">
          <label className="menu-field-label">Interface Target App Route (URL) *</label>
          <input 
            type="text" 
            placeholder={menuForm.parent_id ? "/app/workspace/my_sub_module" : "e.g. /dashboard/user-control"} 
            required 
            value={menuForm.route || ''} 
            onChange={handleRouteInputChange} 
            className="menu-text-input" 
          />
        </div>

        <div className="menu-form-actions">
          <button type="submit" className="menu-btn-submit">
            {editingMenuId ? 'Update Custom Menu' : 'Save Custom Menu'}
          </button>
          {editingMenuId && (
            <button type="button" onClick={cancelMenuEdit} className="menu-btn-cancel">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Menu Output / Hierarchy Side */}
      <div className="menu-list-column">
        <h3 className="menu-list-title">Navigation Hierarchy Realtime Output</h3>
        <div className="menu-list-viewport">
          {menuList.map((menu, mIdx) => (
            <div 
              key={menu._id || mIdx} 
              className={`menu-item-row ${menu.is_active === false ? 'is-dimmed' : ''}`}
            >
              {renderIcon(menu.menu_icon)}
              <div className="menu-item-info">
                <span className="menu-item-name-group">
                  {menu.menu_name}
                  <span className={`menu-status-badge ${menu.is_active !== false ? 'active' : 'inactive'}`}>
                    {menu.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </span>
                <span className="menu-item-route">{menu.route}</span>
              </div>
              <div className="menu-item-controls">
                {menu.parent_id && <span className="menu-child-badge">SUBMENU CHILD</span>}
                <button 
                  type="button"
                  onClick={() => startEditMenu(menu)} 
                  className="menu-btn-edit"
                >
                  Edit
                </button>
                <button 
                  type="button"
                  onClick={() => toggleMenuStatus(menu)} 
                  className={`menu-btn-toggle ${menu.is_active !== false ? 'deactivate' : 'activate'}`}
                >
                  {menu.is_active !== false ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}