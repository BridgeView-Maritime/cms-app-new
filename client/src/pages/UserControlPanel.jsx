import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import FormSchemaBuilder from '../components/FormSchemaBuilder'; // Adjust path if necessary

export default function UserManagementWorkspace({ renderIcon }) {
  const [activePanel, setActivePanel] = useState('users'); // users | roles | menus | custom_fields
  const [userList, setUserList] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [menuList, setMenuList] = useState([]);
  const [unlinkedStaff, setUnlinkedStaff] = useState([]);

  // Refined form states supporting dynamic binding assignment loops
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', role_id: '', employee_id: '' });
  const [roleForm, setRoleForm] = useState({ role_code: '', role_name: '', allowed_menus: [] });
  const [menuForm, setMenuForm] = useState({ menu_name: '', menu_icon: 'Folder', route: '', parent_id: '', sort_order: 0 });
  
  // Tracking structural states for items currently being modified
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingMenuId, setEditingMenuId] = useState(null);

  const [errors, setErrors] = useState({});

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    // Only fetch default administrative items if we aren't viewing the meta field engine tab
    if (activePanel !== 'custom_fields') {
      refreshDataPools();
    }
  }, [activePanel]);

  const refreshDataPools = async () => {
    try {
      const uRes = await fetch('/api/admin/users/list', { headers });
      const uData = await uRes.json();
      if (uData.success) setUserList(uData.data || []);

      const rRes = await fetch('/api/admin/roles', { headers });
      const rData = await rRes.json();
      if (rData.success) setRoleList(rData.data || []);

      const mRes = await fetch('/api/admin/menus', { headers });
      const mData = await mRes.json();
      if (mData.success) setMenuList(mData.data || []);

      const empRes = await fetch('/api/admin/employees/unlinked', { headers });
      const empData = await empRes.json();
      if (empData.success) setUnlinkedStaff(empData.data || []);
    } catch (e) { 
      console.error("Data fetch breakdown: ", e); 
    }
  };

  // =========================================================================
  // SOFT DELETE / TOGGLE STATUS HANDLERS
  // =========================================================================
  const toggleUserStatus = async (user) => {
    const nextStatus = user.is_active === false ? true : false;
    try {
      const res = await fetch(`/api/admin/users/update/${user._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        alert(`User status changed to ${nextStatus ? 'Active' : 'Inactive'}.`);
        refreshDataPools();
      }
    } catch (e) {
      console.error("Failed to toggle user status:", e);
    }
  };

  const toggleRoleStatus = async (role) => {
    const nextStatus = role.is_active === false ? true : false;
    try {
      const res = await fetch(`/api/admin/roles/update/${role._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: nextStatus })
      });
      if (res.ok) {
        alert(`Role status changed to ${nextStatus ? 'Active' : 'Inactive'}.`);
        refreshDataPools();
      }
    } catch (e) {
      console.error("Failed to toggle role status:", e);
    }
  };

  const toggleMenuStatus = async (menu) => {
    const nextStatus = menu.is_active === false ? true : false;
    try {
      const res = await fetch(`/api/admin/menus/update/${menu._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: nextStatus })
      });
      if (res.ok) {
        alert(`Menu status changed to ${nextStatus ? 'Active' : 'Inactive'}.`);
        refreshDataPools();
      }
    } catch (e) {
      console.error("Failed to toggle menu status:", e);
    }
  };

  // =========================================================================
  // USER HANDLERS (CREATE / UPDATE / EDIT SELECTION)
  // =========================================================================
  const startEditUser = (user) => {
    setEditingUserId(user._id);
    setUserForm({
      username: user.username,
      email: user.email,
      password: '', // Kept empty for optional updates
      role_id: user.role_id || '',
      employee_id: user.employee_id || ''
    });
  };

  const cancelUserEdit = () => {
    setEditingUserId(null);
    setUserForm({ username: '', email: '', password: '', role_id: '', employee_id: '' });
    setErrors({});
  };

  const handleUserCreation = async (e) => {
    e.preventDefault();
    setErrors({});
    
    const endpoint = editingUserId 
      ? `/api/admin/users/update/${editingUserId}` 
      : '/api/admin/users/create';
      
    const method = editingUserId ? 'PUT' : 'POST';

    const res = await fetch(endpoint, { 
      method, 
      headers, 
      body: JSON.stringify(userForm) 
    });
    
    const data = await res.json();
    if (data.success) {
      alert(editingUserId ? 'User account details updated.' : 'Access account provisioned successfully.');
      cancelUserEdit();
      refreshDataPools();
    } else { 
      setErrors(data.errors || { general: data.message }); 
    }
  };

  // =========================================================================
  // ROLE HANDLERS (CREATE / UPDATE / EDIT SELECTION)
  // =========================================================================
  const startEditRole = (role) => {
    setEditingRoleId(role._id);
    setRoleForm({
      role_code: role.role_code,
      role_name: role.role_name,
      allowed_menus: role.allowed_menus || []
    });
  };

  const cancelRoleEdit = () => {
    setEditingRoleId(null);
    setRoleForm({ role_code: '', role_name: '', allowed_menus: [] });
  };

  const handleRoleSubmission = async (e) => {
    e.preventDefault();
    
    const endpoint = editingRoleId 
      ? `/api/admin/roles/update/${editingRoleId}` 
      : '/api/admin/roles/create';
      
    const method = editingRoleId ? 'PUT' : 'POST';

    const res = await fetch(endpoint, { 
      method, 
      headers, 
      body: JSON.stringify(roleForm) 
    });
    
    if (res.ok) {
      alert(editingRoleId ? 'Successfully updated.' : 'Successfully save.');
      cancelRoleEdit();
      refreshDataPools();
    }
  };

  // =========================================================================
  // MENU HANDLERS (CREATE / UPDATE / EDIT SELECTION)
  // =========================================================================
  const startEditMenu = (menu) => {
    setEditingMenuId(menu._id);
    setMenuForm({
      menu_name: menu.menu_name,
      menu_icon: menu.menu_icon || 'Folder',
      route: menu.route,
      parent_id: menu.parent_id || '',
      sort_order: menu.sort_order || 0
    });
  };

  const cancelMenuEdit = () => {
    setEditingMenuId(null);
    setMenuForm({ menu_name: '', menu_icon: 'Folder', route: '', parent_id: '', sort_order: 0 });
  };

  const handleMenuSubmission = async (e) => {
    e.preventDefault();
    
    const endpoint = editingMenuId 
      ? `/api/admin/menus/update/${editingMenuId}` 
      : '/api/admin/menus/create';
      
    const method = editingMenuId ? 'PUT' : 'POST';

    const res = await fetch(endpoint, { 
      method, 
      headers, 
      body: JSON.stringify(menuForm) 
    });
    
    if (res.ok) {
      alert(editingMenuId ? 'Successfully updated' : 'Successfully save');
      cancelMenuEdit();
      refreshDataPools();
    }
  };

  const toggleMenuPermission = (menuId) => {
    setRoleForm(prev => {
      const alreadyAllowed = prev.allowed_menus.includes(menuId);
      return {
        ...prev,
        allowed_menus: alreadyAllowed 
          ? prev.allowed_menus.filter(id => id !== menuId) 
          : [...prev.allowed_menus, menuId]
      };
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#ffffff' }}>
      
      {/* 1. Sub-Panel Switcher Segment */}
      <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '8px', borderBottom: '1px solid #e2e8f0', gap: '8px' }}>
        <button onClick={() => setActivePanel('users')} style={{ padding: '6px 16px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: '0', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: activePanel === 'users' ? '#ffffff' : 'transparent', color: activePanel === 'users' ? '#2563eb' : '#475569', boxShadow: activePanel === 'users' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
          User Management & Credentials
        </button>
        <button onClick={() => setActivePanel('roles')} style={{ padding: '6px 16px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: '0', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: activePanel === 'roles' ? '#ffffff' : 'transparent', color: activePanel === 'roles' ? '#2563eb' : '#475569', boxShadow: activePanel === 'roles' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
          Role Management
        </button>
        <button onClick={() => setActivePanel('menus')} style={{ padding: '6px 16px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: '0', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: activePanel === 'menus' ? '#ffffff' : 'transparent', color: activePanel === 'menus' ? '#2563eb' : '#475569', boxShadow: activePanel === 'menus' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
          Menus or Navigation Management
        </button>
        <button onClick={() => setActivePanel('custom_fields')} style={{ padding: '6px 16px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: '0', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: activePanel === 'custom_fields' ? '#ffffff' : 'transparent', color: activePanel === 'custom_fields' ? '#2563eb' : '#475569', boxShadow: activePanel === 'custom_fields' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
          Custom Fields Form Management
        </button>
      </div>

      {/* 2. Content View Container Workspace Grid */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* PANEL A: USER AND PASS CREDENTIAL PROVISIONS */}
        {activePanel === 'users' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <form onSubmit={handleUserCreation} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>
                {editingUserId ? 'Modify Access Credentials' : 'Deploy Access Credentials'}
              </h3>
              
              {errors.general && (
                <div style={{ color: '#ef4444', fontSize: '12px', backgroundColor: '#fef2f2', padding: '8px', borderRadius: '4px', border: '1px solid #fee2e2' }}>
                  {errors.general}
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Anchor Workforce Employee *</label>
                <select 
                  required 
                  disabled={!!editingUserId}
                  value={userForm.employee_id} 
                  onChange={e => setUserForm({...userForm, employee_id: e.target.value})} 
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', backgroundColor: editingUserId ? '#e2e8f0' : '#ffffff' }}
                >
                  <option value="">-- Choose Unlinked Staff Record --</option>
                  {editingUserId && <option value={userForm.employee_id}>Locked Linked Record</option>}
                  {unlinkedStaff.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      [{emp.employee_code}] - {emp.dynamic_data?.first_name || ''} {emp.dynamic_data?.last_name || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Username Alpha String *</label>
                <input type="text" required value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
                {errors.username && <span style={{ color: '#ef4444', fontSize: '11px' }}>{errors.username}</span>}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Corporate Email Address *</label>
                <input type="email" required value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
                {errors.email && <span style={{ color: '#ef4444', fontSize: '11px' }}>{errors.email}</span>}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                  Secure Passphrase {editingUserId ? '(Leave blank to retain)' : '*'}
                </label>
                <input type="password" required={!editingUserId} value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} placeholder="••••••••" />
                {errors.password && <span style={{ color: '#ef4444', fontSize: '11px' }}>{errors.password}</span>}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Assigned Core Role *</label>
                <select 
                  required 
                  value={userForm.role_id} 
                  onChange={e => setUserForm({...userForm, role_id: e.target.value})} 
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', backgroundColor: '#ffffff' }}
                >
                  <option value="">-- Choose Role Profile --</option>
                  {roleList.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: '#ffffff', border: '0', padding: '10px', fontSize: '12px', fontWeight: '600', borderRadius: '4px', cursor: 'pointer' }}>
                  {editingUserId ? 'Update Access Account' : 'Save Access Account'}
                </button>
                {editingUserId && (
                  <button type="button" onClick={cancelUserEdit} style={{ backgroundColor: '#64748b', color: '#ffffff', border: '0', padding: '10px', fontSize: '12px', fontWeight: '600', borderRadius: '4px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', margin: 0 }}>Active Core Security Node Registrations</h3>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px' }}>User Context</th>
                      <th style={{ padding: '10px' }}>Access Channel Email</th>
                      <th style={{ padding: '10px' }}>Role</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.map((u, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', opacity: u.is_active === false ? 0.6 : 1 }}>
                        <td style={{ padding: '10px', color: '#334155' }}>
                          <div style={{ fontWeight: '600' }}>{u.username}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{u.first_name} {u.last_name}</div>
                        </td>
                        <td style={{ padding: '10px', fontFamily: 'monospace', color: '#475569' }}>{u.email}</td>
                        <td style={{ padding: '10px' }}><span style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500' }}>{u.role_name?u.role_name : u.role_id.role_name}</span></td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ backgroundColor: u.is_active !== false ? '#dcfce7' : '#fee2e2', color: u.is_active !== false ? '#15803d' : '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                            {u.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => startEditUser(u)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                            Edit
                          </button>
                          <button onClick={() => toggleUserStatus(u)} style={{ background: 'none', border: 'none', color: u.is_active !== false ? '#dc2626' : '#16a34a', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                            {u.is_active !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {userList.length === 0 && (
                      <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No identity core nodes broadcasted.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PANEL B: ROLE PERMISSION MATRIX STRATIFICATION */}
        {activePanel === 'roles' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <form onSubmit={handleRoleSubmission} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                {editingRoleId ? 'Modify Authorization Bounds' : 'Define Authorization Bounds'}
              </h3>
              
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Unique Role Code Variable *</label>
                <input type="text" placeholder="e.g. OPERATIONS_DESK" required value={roleForm.role_code} onChange={e => setRoleForm({...roleForm, role_code: e.target.value.toUpperCase()})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Interface Description Tag *</label>
                <input type="text" placeholder="e.g. Vessel Control Officer" required value={roleForm.role_name} onChange={e => setRoleForm({...roleForm, role_name: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Assign Navigation Components (Live Binding)</label>
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', backgroundColor: '#ffffff' }}>
                  ={menuList.map(menu => (
                    <label key={menu._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '6px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={roleForm.allowed_menus.includes(menu._id)} onChange={() => toggleMenuPermission(menu._id)} />
                      {menu.menu_name}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: '#ffffff', border: '0', padding: '10px', fontSize: '12px', fontWeight: '600', borderRadius: '4px', cursor: 'pointer' }}>
                  {editingRoleId ? 'Update' : 'Save'}
                </button>
                {editingRoleId && (
                  <button type="button" onClick={cancelRoleEdit} style={{ backgroundColor: '#64748b', color: '#ffffff', border: '0', padding: '10px', fontSize: '12px', fontWeight: '600', borderRadius: '4px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', margin: 0 }}>Functional Authorization Tree Structures</h3>
              {roleList.map((role, idx) => (
                <div key={idx} style={{ padding: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: role.is_active === false ? 0.6 : 1 }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {role.role_name}
                      <span style={{ fontSize: '10px', backgroundColor: role.is_active !== false ? '#dcfce7' : '#fee2e2', color: role.is_active !== false ? '#15803d' : '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                        {role.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </h4>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>{role.role_code}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: '#475569', fontWeight: '500' }}>
                      {role.allowed_menus?.length || 0} Modules
                    </span>
                    <button onClick={() => startEditRole(role)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button onClick={() => toggleRoleStatus(role)} style={{ background: 'none', border: 'none', color: role.is_active !== false ? '#dc2626' : '#16a34a', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      {role.is_active !== false ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL C: MENUS AND SUB-NAVIGATION ARCHITECTURE TREE */}
        {activePanel === 'menus' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <form onSubmit={handleMenuSubmission} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                {editingMenuId ? 'Modify Custom View Module' : 'Custom View Module'}
              </h3>
              
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Menu Structural Label *</label>
                <input type="text" placeholder="e.g. Operations Map" required value={menuForm.menu_name} onChange={e => setMenuForm({...menuForm, menu_name: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '8px', color: '#334155' }}>
                    Select Menu Icon
                </label>
                
                {/* GRID DISPLAY FOR ACTUAL ICON SELECTION */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
                    gap: '8px',
                    padding: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    maxHeight: '150px',
                    overflowY: 'auto'
                }}>
                    {[
                    'Shield', 'Anchor', 'Briefcase', 'FileText', 'User', 'Settings', 'Bell', 
                    'Layers', 'Grid', 'Cpu', 'Database', 'Folder', 'Activity', 'BarChart', 'Lock', 
                    'MapPin', 'Landmark', 'GraduationCap', 'ShieldAlert', 'HelpCircle', 'Plus', 
                    'Save', 'Eye', 'Edit3', 'Layers3', 'FolderPlus', 'Trash2', 'Edit2', 'Check', 'X', 'EyeOff', 'Send', 'History'
                    ].map((iconName) => {
                    // Map names to Lucide elements dynamically for rendering inside the selector loops
                    const IconComponent = Icons[iconName] || Icons.HelpCircle;
                    const isSelected = menuForm.menu_icon === iconName;

                    return (
                        <button
                        key={iconName}
                        type="button"
                        title={iconName}
                        onClick={() => setMenuForm({ ...menuForm, menu_icon: iconName })}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px',
                            border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                            borderRadius: '6px',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            color: isSelected ? '#2563eb' : '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                            if (!isSelected) {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.background = '#f1f5f9';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isSelected) {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.background = '#ffffff';
                            }
                        }}
                        >
                        <IconComponent size={18} strokeWidth={isSelected ? 2.5 : 2} />
                        </button>
                    );
                    })}
                </div>
                
                {/* SMALL COMPACT FEEDBACK NOTIFIER */}
                {menuForm.menu_icon && (
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                    Selected Identifier: <strong>{menuForm.menu_icon}</strong>
                    </span>
                )}
                </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Interface Target App Route (URL) *</label>
                <input type="text" placeholder="e.g. /dashboard/user-control" required value={menuForm.route} onChange={e => setMenuForm({...menuForm, route: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Parent Structure Assignment (For Submenus)</label>
                <select value={menuForm.parent_id} onChange={e => setMenuForm({...menuForm, parent_id: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', backgroundColor: '#ffffff' }}>
                  <option value="">-- Set as Top Level Parent Head --</option>
                  {menuList.filter(m => !m.parent_id && m._id !== editingMenuId).map(parent => (
                    <option key={parent._id} value={parent._id}>{parent.menu_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: '#ffffff', border: '0', padding: '10px', fontSize: '12px', fontWeight: '600', borderRadius: '4px', cursor: 'pointer' }}>
                  {editingMenuId ? 'Update Custom Menu' : 'Save Custom Menu'}
                </button>
                {editingMenuId && (
                  <button type="button" onClick={cancelMenuEdit} style={{ backgroundColor: '#64748b', color: '#ffffff', border: '0', padding: '10px', fontSize: '12px', fontWeight: '600', borderRadius: '4px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', margin: 0 }}>Navigation Hierarchy Realtime Output</h3>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', maxHeight: '420px', overflowY: 'auto' }}>
                {menuList.map((menu, mIdx) => (
                  <div key={mIdx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f1f5f9', opacity: menu.is_active === false ? 0.6 : 1 }}>
                    {renderIcon(menu.menu_icon)}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {menu.menu_name}
                        <span style={{ fontSize: '9px', backgroundColor: menu.is_active !== false ? '#dcfce7' : '#fee2e2', color: menu.is_active !== false ? '#15803d' : '#b91c1c', padding: '1px 4px', borderRadius: '3px', fontWeight: '600' }}>
                          {menu.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#3b82f6' }}>{menu.route}</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {menu.parent_id && <span style={{ fontSize: '10px', backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>SUBMENU CHILD</span>}
                      <button onClick={() => startEditMenu(menu)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                        Edit
                      </button>
                      <button onClick={() => toggleMenuStatus(menu)} style={{ background: 'none', border: 'none', color: menu.is_active !== false ? '#dc2626' : '#16a34a', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                        {menu.is_active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PANEL D: DYNAMIC CUSTOM META FIELDS PIPELINE DESIGNER */}
        {activePanel === 'custom_fields' && (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <FormSchemaBuilder 
              menuList={menuList} 
              onSaveSuccess={() => alert('Custom structure updated successfully.')} 
            />
          </div>
        )}

      </div>
    </div>
  );
}