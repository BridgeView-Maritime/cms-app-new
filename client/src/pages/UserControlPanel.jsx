import React, { useState, useEffect } from 'react';
import FormSchemaBuilder from '../components/FormSchemaBuilder';
import { AUTH_ENDPOINTS } from '../config/api';

import UserManagementTab from '../components/UserManagementTab';
import RoleManagementTab from '../components/RoleManagementTab';
import MenuManagementTab from '../components/MenuManagementTab';
import '../styles/UserControlPanel.css';

export default function UserControlPanel({ renderIcon }) {
  const [activePanel, setActivePanel] = useState('users'); // users | roles | menus | custom_fields
  const [userList, setUserList] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [menuList, setMenuList] = useState([]);
  const [unlinkedStaff, setUnlinkedStaff] = useState([]);

  // Form states
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
    if (activePanel !== 'custom_fields') {
      refreshDataPools();
    }
  }, [activePanel]);

  const refreshDataPools = async () => {
    try {
      const uRes = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/users/list`, { headers });
      const uData = await uRes.json();
      if (uData.success) setUserList(uData.data || []);

      const rRes = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/roles`, { headers });
      const rData = await rRes.json();
      if (rData.success) setRoleList(rData.data || []);

      const mRes = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/menus`, { headers });
      const mData = await mRes.json();
      if (mData.success) setMenuList(mData.data || []);

      const empRes = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/employees/unlinked`, { headers });
      const empData = await empRes.json();
      if (empData.success) setUnlinkedStaff(empData.data || []);
    } catch (e) { 
      console.error("Data fetch breakdown: ", e); 
    }
  };

  // Status Toggles
  const toggleUserStatus = async (user) => {
    const nextStatus = user.is_active === false;
    try {
      const res = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/users/update/${user._id}`, {
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
    const nextStatus = role.is_active === false;
    try {
      const res = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/roles/update/${role._id}`, {
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
    const nextStatus = menu.is_active === false;
    try {
      const res = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/menus/update/${menu._id}`, {
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

  // User Handlers
  const startEditUser = (user) => {
    setEditingUserId(user._id);
    setUserForm({
      username: user.username,
      email: user.email,
      password: '',
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
      ? `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/users/update/${editingUserId}` 
      : `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/users/create`;
      
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

  // Role Handlers
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
      ? `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/roles/update/${editingRoleId}` 
      : `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/roles/create`;
      
    const method = editingRoleId ? 'PUT' : 'POST';

    const res = await fetch(endpoint, { 
      method, 
      headers, 
      body: JSON.stringify(roleForm) 
    });
    
    if (res.ok) {
      alert(editingRoleId ? 'Successfully updated.' : 'Successfully saved.');
      cancelRoleEdit();
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

  // Menu Handlers
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
      ? `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/menus/update/${editingMenuId}` 
      : `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/menus/create`;
      
    const method = editingMenuId ? 'PUT' : 'POST';

    const res = await fetch(endpoint, { 
      method, 
      headers, 
      body: JSON.stringify(menuForm) 
    });
    
    if (res.ok) {
      alert(editingMenuId ? 'Successfully updated' : 'Successfully saved');
      cancelMenuEdit();
      refreshDataPools();
    }
  };

  return (
    <div className="user-control-panel-root">
      {/* 1. Sub-Panel Switcher Segment */}
      <div className="panel-nav-container">
        <button 
          className={`panel-nav-btn ${activePanel === 'users' ? 'active' : ''}`}
          onClick={() => setActivePanel('users')}
        >
          User Management & Credentials
        </button>
        <button 
          className={`panel-nav-btn ${activePanel === 'roles' ? 'active' : ''}`}
          onClick={() => setActivePanel('roles')}
        >
          Role Management
        </button>
        <button 
          className={`panel-nav-btn ${activePanel === 'menus' ? 'active' : ''}`}
          onClick={() => setActivePanel('menus')}
        >
          Menus or Navigation Management
        </button>
        <button 
          className={`panel-nav-btn ${activePanel === 'custom_fields' ? 'active' : ''}`}
          onClick={() => setActivePanel('custom_fields')}
        >
          Custom Fields Form Management
        </button>
      </div>

      {/* 2. Content View Container Workspace Grid */}
      <div className="panel-content-workspace">
        {activePanel === 'users' && (
          <UserManagementTab
            userForm={userForm}
            setUserForm={setUserForm}
            editingUserId={editingUserId}
            unlinkedStaff={unlinkedStaff}
            roleList={roleList}
            userList={userList}
            errors={errors}
            handleUserCreation={handleUserCreation}
            cancelUserEdit={cancelUserEdit}
            startEditUser={startEditUser}
            toggleUserStatus={toggleUserStatus}
          />
        )}

        {activePanel === 'roles' && (
          <RoleManagementTab
            roleForm={roleForm}
            setRoleForm={setRoleForm}
            editingRoleId={editingRoleId}
            menuList={menuList}
            roleList={roleList}
            handleRoleSubmission={handleRoleSubmission}
            cancelRoleEdit={cancelRoleEdit}
            startEditRole={startEditRole}
            toggleRoleStatus={toggleRoleStatus}
            toggleMenuPermission={toggleMenuPermission}
          />
        )}

        {activePanel === 'menus' && (
          <MenuManagementTab
            menuForm={menuForm}
            setMenuForm={setMenuForm}
            editingMenuId={editingMenuId}
            menuList={menuList}
            renderIcon={renderIcon}
            handleMenuSubmission={handleMenuSubmission}
            cancelMenuEdit={cancelMenuEdit}
            startEditMenu={startEditMenu}
            toggleMenuStatus={toggleMenuStatus}
          />
        )}

        {activePanel === 'custom_fields' && (
          <div className="custom-fields-wrapper">
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