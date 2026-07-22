import React from 'react';

export default function UserManagementTab({
  userForm,
  setUserForm,
  editingUserId,
  unlinkedStaff,
  roleList,
  userList,
  errors,
  handleUserCreation,
  cancelUserEdit,
  startEditUser,
  toggleUserStatus
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
      <form onSubmit={handleUserCreation} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>
          {editingUserId ? 'Modify Access Credentials' : 'Access Credentials'}
        </h3>
        
        {errors.general && (
          <div style={{ color: '#ef4444', fontSize: '12px', backgroundColor: '#fef2f2', padding: '8px', borderRadius: '4px', border: '1px solid #fee2e2' }}>
            {errors.general}
          </div>
        )}

        <div>
          <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Employee *</label>
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
          <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Username *</label>
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
            Secure Password {editingUserId ? '(Leave blank to retain)' : '*'}
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
        <h3 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', margin: 0 }}>Active Users</h3>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px' }}>User</th>
                <th style={{ padding: '10px' }}>Email</th>
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
                  <td style={{ padding: '10px' }}>
                    <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500' }}>
                      {u.role_name ? u.role_name : u.role_id?.role_name}
                    </span>
                  </td>
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
  );
}