// client\src\pages\EmployeeDirectory.jsx
import React, { useState, useEffect } from 'react';
import { Search, UserPlus, SlidersHorizontal, Edit3, ToggleLeft, ToggleRight, Loader2, ArrowLeft } from 'lucide-react';
import { AUTH_ENDPOINTS } from '../config/api';
import EmployeeMasterForm from '../components/EmployeeMasterForm';
import '../styles/EmployeeDirectory.css';

export default function EmployeeDirectory() {
  // --- View Control States ---
  const [isAdding, setIsAdding] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  // --- Grid Core Data States ---
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [alert, setAlert] = useState(null);

  // Fetch the data matrix immediately on mount
  useEffect(() => {
    if (!isAdding && !editingEmployeeId) {
      fetchDirectoryGridData();
    }
  }, [isAdding, editingEmployeeId]);

  const fetchDirectoryGridData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const baseEndpoint = AUTH_ENDPOINTS?.EMPLOYEE_LIST || `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/employees/list`;
      const targetUrl = `${baseEndpoint}?_cb=${new Date().getTime()}`;

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      const resData = await response.json();
      
      if (resData && Array.isArray(resData)) {
        setEmployees(resData);
      } else if (resData && resData.success && Array.isArray(resData.data)) {
        setEmployees(resData.data);
      } else if (resData && resData.data && Array.isArray(resData.data)) {
        setEmployees(resData.data);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error("Data pipeline fetch failure:", err);
      triggerToast('error', `Failed to load corporate directory: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Safe Helper to Extract String ID representation from MongoDB _id properties
  const getEmployeeIdString = (id) => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (typeof id === 'object') {
      if (id.$oid) return id.$oid;
      if (id.toString && typeof id.toString === 'function') return id.toString();
    }
    return String(id);
  };

  // Helper engine to determine if an employee profile is definitively active
  const checkIsActive = (emp) => {
    if (!emp) return false;
    // Check possible active status variants ('status' field or 'is_active' field flag)
    if (emp.status !== undefined) {
      return String(emp.status).toLowerCase() === 'active';
    }
    if (emp.is_active !== undefined) {
      return emp.is_active === true || emp.is_active === 1 || String(emp.is_active) === '1';
    }
    return false;
  };

  const handleToggleStatus = async (id, emp) => {
    const cleanId = getEmployeeIdString(id);
    const currentlyActive = checkIsActive(emp);
    
    // Determine target payload depending on your backend expectations
    const targetStatus = currentlyActive ? 'Suspended' : 'Active';
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/employees/status/${cleanId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          new_status: targetStatus,
          is_active: !currentlyActive ? 1 : 0, // sends numeric fallback alongside string status
          change_reason: 'Administrative dashboard action toggle mutation.'
        })
      });
      const resData = await response.json();
      if (resData.success) {
        triggerToast('success', `Profile updated to ${targetStatus}.`);
        fetchDirectoryGridData();
      } else {
        triggerToast('error', resData.message || 'Failed to update status.');
      }
    } catch (err) {
      triggerToast('error', `State mutation fault: ${err.message}`);
    }
  };

  const triggerToast = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleFormSaveCompletion = () => {
    setIsAdding(false);
    setEditingEmployeeId(null);
    triggerToast('success', 'Master data stream synchronized successfully.');
  };

  // --- Filter and Search Array Evaluation ---
  const filteredEmployees = employees.filter(emp => {
    if (!emp) return false;
    const fName = emp.first_name || '';
    const lName = emp.last_name || '';
    const code = emp.employee_code || '';

    const matchesSearch = `${fName} ${lName} ${code}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isActive = checkIsActive(emp);
    let matchesStatus = true;
    if (statusFilter !== 'All') {
      if (statusFilter === 'Active') matchesStatus = isActive;
      if (statusFilter === 'Suspended' || statusFilter === 'Terminated') matchesStatus = !isActive;
    }

    return matchesSearch && matchesStatus;
  });

  // --- Dynamic Columns Core Deduction Engine ---
  const getDynamicColumns = () => {
    if (employees.length === 0) return [];
    
    const templateRecord = employees[0];
    
    const keysToOmit = [
      '_id', 'id', '__v', 'user_id', 'created_by', 'addresses', 'contacts', 
      'bank_accounts', 'education_history', 'experience_history', 'skills', 
      'dynamic_data', 'createdAt', 'updatedAt'
    ];

    return Object.keys(templateRecord).filter(key => {
      const val = templateRecord[key];
      const lowerKey = key.toLowerCase();
      
      const isOmittedKey = keysToOmit.includes(key) || lowerKey === 'id' || lowerKey.endsWith('_id') || lowerKey.endsWith('id');
      return !isOmittedKey && !Array.isArray(val);
    });
  };

  const activeColumns = getDynamicColumns();

  // Unified Helper to force Date structures into clean 'dd/mm/yyyy' representations
  const formatToDDMMYYYY = (dateInput) => {
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return 'N/A';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return 'N/A';
    }
  };

  // Clean formatting lookup helper for dynamic cell data rendering
  const parseCellContent = (value, keyName = '') => {
    if (value === null || value === undefined) return 'N/A';
    
    if (value && typeof value === 'object' && value.$date) {
      return formatToDDMMYYYY(value.$date);
    }
    
    const isDateKey = keyName.toLowerCase().includes('date') || keyName.toLowerCase().includes('dob');
    const isISOString = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(Date.parse(value));

    if (isDateKey || isISOString) {
      return formatToDDMMYYYY(value);
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  };

  // Humanize snake_case keys for layout headers
  const humanizeHeaderLabel = (snakeCaseStr) => {
    return snakeCaseStr
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // --- RENDER CONDITIONAL SUB-FORM VIEWPORTS ---
  if (isAdding || editingEmployeeId) {
    return (
      <div className="directory-canvas">
        <div style={{ marginBottom: '15px' }}>
          <button 
            type="button" 
            className="mac-action-btn-blue" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#6c757d' }}
            onClick={() => { setIsAdding(false); setEditingEmployeeId(null); }}
          >
            <ArrowLeft size={14} /> Back to Directory Grid
          </button>
        </div>
        <EmployeeMasterForm 
          employeeId={editingEmployeeId} 
          onSaveSuccess={handleFormSaveCompletion} 
        />
      </div>
    );
  }

  // --- DEFAULT ROUTE GRID DIRECTORY LOOKUP ---
  return (
    <div className="directory-canvas">
      {alert && (
        <div className={`global-toast-banner ${alert.type}`} style={{ padding: '10px', background: alert.type === 'success' ? '#d4edda' : '#f8d7da', color: alert.type === 'success' ? '#155724' : '#721c24', marginBottom: '15px', borderRadius: '4px' }}>
          <span>{alert.message}</span>
        </div>
      )}

      <div className="directory-header-row">
        <div>
          <h2>Employee Master</h2>
          <p>Employee profile records.</p>
        </div>
        <button className="mac-action-btn-blue" onClick={() => setIsAdding(true)}>
          <UserPlus size={14} /> Add Employee Profile
        </button>
      </div>

      <div className="directory-toolbar">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon-inside" />
          <input 
            type="text" 
            placeholder="Filter profiles by identity index or name strings..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-select-wrapper">
          <SlidersHorizontal size={14} className="filter-select-icon" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Lifecycles</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="directory-table-frame" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="grid-loading-backdrop" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px' }}>
            <Loader2 size={24} className="animate-spin" />
            <p>Streaming core directory records directly...</p>
          </div>
        ) : (
          <table className="directory-data-table">
            <thead>
              <tr>
                {activeColumns.map(colKey => (
                  <th key={colKey}>{humanizeHeaderLabel(colKey)}</th>
                ))}
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} className="empty-grid-placeholder">
                    No data found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const stringId = getEmployeeIdString(emp._id || emp.id);
                  const isActiveProfile = checkIsActive(emp);

                  return (
                    <tr key={stringId} className={!isActiveProfile ? 'row-state-dimmed' : ''}>
                      {activeColumns.map(colKey => {
                        const cellRawValue = emp[colKey];
                        
                        if (colKey === 'employee_code') {
                          return (
                            <td key={colKey}>
                              <code className="emp-code-id">{parseCellContent(cellRawValue, colKey)}</code>
                            </td>
                          );
                        }

                        // FIXED: Intercepts both 'status' and 'is_active' columns to render the color badge properly
                        if (colKey === 'status' || colKey === 'is_active') {
                          return (
                            <td key={colKey}>
                              <span className={`deployment-pill ${isActiveProfile ? 'status-green' : 'status-gray'}`}>
                                {isActiveProfile ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={colKey}>
                            {parseCellContent(cellRawValue, colKey)}
                          </td>
                        );
                      })}

                      {/* Interactive Control Row Actions */}
                      <td>
                        <div className="action-button-group-cell">
                          <button 
                            className="icon-action-trigger" 
                            title="Modify Structure Elements" 
                            onClick={() => setEditingEmployeeId(stringId)}
                          >
                            <Edit3 size={13} />
                          </button>
                          
                          {/* FIXED: Uses unified isActiveProfile flag to safely update classes and toggle icons */}
                          <button 
                            className={`icon-action-trigger toggle-action-btn ${isActiveProfile ? 'active' : 'inactive'}`}
                            title={isActiveProfile ? 'Deactivate Profile' : 'Activate Profile'}
                            onClick={() => handleToggleStatus(stringId, emp)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            {isActiveProfile ? (
                              <ToggleRight size={20} style={{ color: '#28a745' }} />
                            ) : (
                              <ToggleLeft size={20} style={{ color: '#6c757d' }} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}