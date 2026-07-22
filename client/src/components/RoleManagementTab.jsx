// client/src/components/RoleManagementTab.jsx
import React from 'react';
import '../styles/RoleManagementTab.css';

export default function RoleManagementTab({
  roleForm,
  setRoleForm,
  editingRoleId,
  menuList = [],
  roleList = [],
  handleRoleSubmission,
  cancelRoleEdit,
  startEditRole,
  toggleRoleStatus,
  toggleMenuPermission
}) {
  /**
   * Helper function to check if a menu is permitted in roleForm.allowed_menus.
   * Handles both array of string IDs: ['60d5...', '60d6...'] 
   * and array of populated objects: [{ _id: '60d5...', menu_name: '...' }]
   */
  const isMenuChecked = (menuId) => {
    if (!roleForm?.allowed_menus || !Array.isArray(roleForm.allowed_menus)) {
      return false;
    }

    return roleForm.allowed_menus.some((allowed) => {
      if (!allowed) return false;
      const allowedId = typeof allowed === 'object' ? allowed._id : allowed;
      return String(allowedId) === String(menuId);
    });
  };

  /**
   * Determines if all available menus are currently selected
   */
  const areAllMenusSelected =
    menuList.length > 0 && menuList.every((menu) => isMenuChecked(menu._id));

  /**
   * Toggles selecting all menus or clearing selection
   */
  const handleSelectAllMenus = () => {
    if (areAllMenusSelected) {
      // Deselect All
      setRoleForm({
        ...roleForm,
        allowed_menus: []
      });
    } else {
      // Select All
      const allMenuIds = menuList.map((menu) => menu._id);
      setRoleForm({
        ...roleForm,
        allowed_menus: allMenuIds
      });
    }
  };

  return (
    <div className="role-management-container">
      {/* Form Section */}
      <form onSubmit={handleRoleSubmission} className="role-form-card">
        <h3 className="role-form-title">
          {editingRoleId ? 'Modify Authorization Bounds' : 'Define Authorization Bounds'}
        </h3>
        
        <div className="role-field-group">
          <label className="role-field-label">Unique Role Code Variable *</label>
          <input 
            type="text" 
            placeholder="e.g. OPERATIONS_DESK" 
            required 
            value={roleForm.role_code || ''} 
            onChange={e => setRoleForm({ ...roleForm, role_code: e.target.value.toUpperCase() })} 
            className="role-text-input" 
          />
        </div>

        <div className="role-field-group">
          <label className="role-field-label">Interface Description Tag *</label>
          <input 
            type="text" 
            placeholder="e.g. Vessel Control Officer" 
            required 
            value={roleForm.role_name || ''} 
            onChange={e => setRoleForm({ ...roleForm, role_name: e.target.value })} 
            className="role-text-input" 
          />
        </div>

        <div className="role-field-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="role-field-label" style={{ margin: 0 }}>
              Assign Navigation Components (Live Binding)
            </label>
            
            {/* Select All Toggle */}
            {menuList.length > 0 && (
              <label 
                className="role-select-all-label" 
                style={{ fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#3b82f6' }}
              >
                <input 
                  type="checkbox" 
                  checked={areAllMenusSelected} 
                  onChange={handleSelectAllMenus} 
                />
                Select All
              </label>
            )}
          </div>

          <div className="role-menu-checkbox-container">
            {menuList.map(menu => (
              <label key={menu._id} className="role-menu-checkbox-item">
                <input 
                  type="checkbox" 
                  checked={isMenuChecked(menu._id)} 
                  onChange={() => toggleMenuPermission(menu._id)} 
                />
                {menu.menu_name}
              </label>
            ))}
          </div>
        </div>

        <div className="role-form-actions">
          <button type="submit" className="role-btn-submit">
            {editingRoleId ? 'Update' : 'Save'}
          </button>
          {editingRoleId && (
            <button type="button" onClick={cancelRoleEdit} className="role-btn-cancel">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Role Listing Column */}
      <div className="role-list-column">
        <h3 className="role-list-title">Role Authorization Structures</h3>
        {roleList.map((role, idx) => (
          <div 
            key={role._id || idx} 
            className={`role-item-card ${role.is_active === false ? 'is-dimmed' : ''}`}
          >
            <div className="role-item-info">
              <h4 className="role-item-heading">
                {role.role_name}
                <span className={`role-status-badge ${role.is_active !== false ? 'active' : 'inactive'}`}>
                  {role.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </h4>
              <span className="role-item-code">{role.role_code}</span>
            </div>
            
            <div className="role-item-controls">
              <span className="role-module-count-pill">
                {role.allowed_menus?.length || 0} Modules
              </span>
              <button 
                type="button"
                onClick={() => startEditRole(role)} 
                className="role-btn-edit"
              >
                Edit
              </button>
              <button 
                type="button"
                onClick={() => toggleRoleStatus(role)} 
                className={`role-btn-toggle ${role.is_active !== false ? 'deactivate' : 'activate'}`}
              >
                {role.is_active !== false ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}