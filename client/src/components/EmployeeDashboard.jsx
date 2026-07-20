// client\src\components\EmployeeDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Users, ShieldAlert, CheckCircle, ArrowLeft } from 'lucide-react';
import EmployeeDirectory from '../pages/EmployeeDirectory';
import EmployeeMasterForm from './EmployeeMasterForm';
import '../styles/EmployeeDashboard.css';
import { AUTH_ENDPOINTS } from '../config/api';

export default function EmployeeDashboard() {
  const [viewMode, setViewMode] = useState('GRID'); 
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [alert, setAlert] = useState(null);

  // Triggered automatically whenever this dashboard page renders on screen
  useEffect(() => {
    fetchDirectoryGrid();
  }, []);

  const fetchDirectoryGrid = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Safety Fallback: Ensure endpoint variable points to your config string perfectly
      const baseEndpoint = AUTH_ENDPOINTS?.EMPLOYEE_LIST || 'http://localhost:5000/api/employees/list';
      
      // Append a cache-buster query string to prevent browsers from returning cached 304 results
      const finalUrl = `${baseEndpoint}?_cb=${new Date().getTime()}`;
      
      console.log(`==> Dispatching Request to Endpoint: ${finalUrl}`);

      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      console.log(`==> Network pipeline responded with status: ${response.status}`);
      const resData = await response.json();
      console.log("==> Decoded payload matching MongoDB collection schema:", resData);
      
      // Normalize different backend response structures smoothly
      if (resData && Array.isArray(resData)) {
        setEmployees(resData);
      } else if (resData && resData.success && Array.isArray(resData.data)) {
        setEmployees(resData.data);
      } else if (resData && resData.data && Array.isArray(resData.data)) {
        setEmployees(resData.data);
      } else {
        console.warn("==> Request completed but response array format did not match typical collections.", resData);
        setEmployees([]);
      }
    } catch (err) {
      console.error("==> Error caught within fetching runtime pipeline:", err);
      triggerAlert('error', `Failed to load corporate directory: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleLifecycleState = async (id, currentStatus) => {
    const targetStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/employees/status/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          new_status: targetStatus,
          change_reason: 'Administrative dashboard quick-action toggle mutation.'
        })
      });
      const resData = await response.json();
      if (resData.success) {
        triggerAlert('success', `Details modified to ${targetStatus}.`);
        fetchDirectoryGrid();
      } else {
        triggerAlert('error', resData.message);
      }
    } catch (err) {
      triggerAlert('error', `State change error context: ${err.message}`);
    }
  };

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleEditTrigger = (id) => {
    setSelectedEmpId(id);
    setViewMode('EDIT');
  };

  const handleSaveCompletion = () => {
    setViewMode('GRID');
    setSelectedEmpId(null);
    fetchDirectoryGrid();
    triggerAlert('success', 'Master record pipeline synchronized.');
  };

  const filteredEmployees = employees.filter(emp => {
    if (!emp) return false;
    
    const fName = emp.first_name || '';
    const lName = emp.last_name || '';
    const code = emp.employee_code || '';

    const matchesSearch = `${fName} ${lName} ${code}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'All' || 
      String(emp.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="employee-viewport-container">
      <div className="mac-menu-action-bar">
        <div className="action-bar-brand">
          <Users size={18} className="brand-icon-accent" />
          <h2 className="module-title">Employee Registry Hub</h2>
        </div>
        
        {viewMode !== 'GRID' && (
          <button type="button" className="action-btn-secondary" onClick={() => { setViewMode('GRID'); setSelectedEmpId(null); }}>
            <ArrowLeft size={14} /> Back to Directory
          </button>
        )}
      </div>

      {alert && (
        <div className={`global-toast-banner ${alert.type}`}>
          <span>{alert.message}</span>
        </div>
      )}

      <div className="employee-scrollable-canvas">
        {viewMode === 'GRID' ? (
          <EmployeeDirectory 
            employees={filteredEmployees}
            loading={loading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onProvisionTrigger={() => setViewMode('PROVISION')}
            onEditTrigger={handleEditTrigger}
            onToggleStatus={toggleLifecycleState}
          />
        ) : (
          <div className="form-canvas-container">
            <EmployeeMasterForm 
              employeeId={selectedEmpId} 
              onSaveSuccess={handleSaveCompletion} 
              onCancel={() => { setViewMode('GRID'); setSelectedEmpId(null); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}