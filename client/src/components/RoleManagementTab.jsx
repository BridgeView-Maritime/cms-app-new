import React from 'react';
import '../styles/RoleManagementTab.css';

export default function RoleManagementTab({
  roleForm,
  setRoleForm,
  editingRoleId,
  menuList,
  roleList,
  handleRoleSubmission,
  cancelRoleEdit,
  startEditRole,
  toggleRoleStatus,
  toggleMenuPermission
}) {
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
            value={roleForm.role_code} 
            onChange={e => setRoleForm({...roleForm, role_code: e.target.value.toUpperCase()})} 
            className="role-text-input" 
          />
        </div>

        <div className="role-field-group">
          <label className="role-field-label">Interface Description Tag *</label>
          <input 
            type="text" 
            placeholder="e.g. Vessel Control Officer" 
            required 
            value={roleForm.role_name} 
            onChange={e => setRoleForm({...roleForm, role_name: e.target.value})} 
            className="role-text-input" 
          />
        </div>

        <div className="role-field-group">
          <label className="role-field-label">Assign Navigation Components (Live Binding)</label>
          <div className="role-menu-checkbox-container">
            {menuList.map(menu => (
              <label key={menu._id} className="role-menu-checkbox-item">
                <input 
                  type="checkbox" 
                  checked={roleForm.allowed_menus.includes(menu._id)} 
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
        <h3 className="role-list-title">Functional Authorization Tree Structures</h3>
        {roleList.map((role, idx) => (
          <div 
            key={idx} 
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