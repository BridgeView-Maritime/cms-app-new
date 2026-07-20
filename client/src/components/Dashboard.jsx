// client/src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

import UserManagementWorkspace from '../pages/UserControlPanel';
import EmployeeDirectory from '../pages/EmployeeDirectory';
import MetadataConfig from '../pages/MetadataConfig'; 
import DashboardSummary from '../pages/DashboardSummary';

import DynamicPageRouterEngine from './dynamic-engine/DynamicPageRouterEngine';
import FormSchemaBuilder from './FormSchemaBuilder';
import AlertListener from './AlertListener';

import NotificationDispatcher from './NotificationDispatcher';
import UserHistoryLog from './UserHistoryLog';

import '../styles/Dashboard.css';
import { AUTH_ENDPOINTS } from '../config/api';

export default function MacDynamicDashboard({ onLogout }) {
  const [userProfile, setUserProfile] = useState({ id: null, firstName: '', lastName: '', roleName: '' });
  const [menuData, setMenuData] = useState([]);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [activeDockFlyout, setActiveDockFlyout] = useState(null);
  const [isClickLocked, setIsClickLocked] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  
  const leaveTimeoutRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchEnvironmentData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/users/dashboard-init`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await response.json();
        
        if (resData.success && resData.user) {
          let userId = resData.user._id || resData.user.id;
          
          if (!userId && token) {
            try {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const payload = JSON.parse(window.atob(base64));
              userId = payload.id || payload._id || payload.userId;
            } catch (jwtErr) {
              console.error("Failed to decode token fallback:", jwtErr);
            }
          }

          setUserProfile({
            id: userId || null,
            firstName: resData.user.first_name || 'Bridgeview',
            lastName: resData.user.last_name || '',
            roleName: resData.user.role_name || 'Super Administrator'
          });
          setMenuData(resData.menus || []);
        } else {
          localStorage.removeItem('accessToken');
          window.location.href = AUTH_ENDPOINTS.REACT_APP_URL;
        }
      } catch (err) {
        console.error("Initialization breakdown: ", err);
        localStorage.removeItem('accessToken');
        window.location.href = AUTH_ENDPOINTS.REACT_APP_URL;
      }
    };
    fetchEnvironmentData();
  }, []);

  const syncNotificationLogs = () => {
    const isSuperAdmin = userProfile.roleName === 'Super Administrator' || userProfile.roleName === 'SUPER_ADMIN';
    if (!isSuperAdmin && (!userProfile.id || userProfile.id === '')) return;

    const token = localStorage.getItem('accessToken');
    const queryId = userProfile.id || 'ALL';

    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/notifications/my-history?userId=${queryId}&role=${userProfile.roleName || 'employee'}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNotifications(data);
        } else if (data && Array.isArray(data.history)) {
          setNotifications(data.history);
        } else {
          setNotifications([]);
        }
      })
      .catch(err => console.error("Error synchronizing header tracking logs:", err));
  };

  useEffect(() => {
    if (userProfile.roleName) {
      syncNotificationLogs();
    }
  }, [userProfile.id, userProfile.roleName]);

  const handleMarkAsRead = async (logId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/notifications/mark-read/${logId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        // Optimistically update notifications list locally to drop badge values instantly
        setNotifications(prev => 
          prev.map(item => item._id === logId ? { ...item, isRead: true } : item)
        );
      }
    } catch (err) {
      console.error("Failed to update status on read trigger request workflow:", err);
    }
  };

  const toggleSubmenu = (menuId) => {
    setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  const renderIcon = (iconName) => {
    const LucideIcon = Icons[iconName] || Icons.Folder;
    return <LucideIcon size={16} className="sidebar-vector-glyph" />;
  };

  const handleNewAlert = (newAlert) => {
    setNotifications((prev) => [newAlert, ...prev]);
    setActiveToast(newAlert);
    setTimeout(() => setActiveToast(null), 6000);
  };

  const handleNewAdvisoryZone = (newZone) => {
    const mappedAlert = {
      id: newZone.id || Math.random().toString(),
      source: newZone.source || 'UKMTO',
      riskLevel: newZone.riskLevel || 'HIGH',
      title: newZone.title,
      message: `Security Bulletin: ${newZone.message || newZone.title}`,
      timestamp: newZone.publishedAt || new Date()
    };

    setNotifications((prev) => [mappedAlert, ...prev]);
    setActiveToast(mappedAlert);
    setTimeout(() => setActiveToast(null), 6000);
  };

  return (
    <div className="mac-os-canvas-frame">
      <AlertListener 
        onAlertReceived={handleNewAlert} 
        onNewZoneReceived={handleNewAdvisoryZone} 
      />

      {/* Pass handleMarkAsRead callback engine up into headers popover */}
      <Header 
        currentTime={currentTime} 
        notifications={notifications} 
        onMarkAsRead={handleMarkAsRead} 
      />
      
      {activeToast && (
        <div className={`native-system-toast toast-risk-${activeToast.riskLevel?.toLowerCase() || 'high'}`}>
          <div className="toast-content-layout">
            <Icons.AlertTriangle size={18} className="toast-vector" />
            <div className="toast-text-block">
              <h5>⚠️ SECURITY BULLETIN: {activeToast.source || 'SYSTEM'}</h5>
              <p>{activeToast.message}</p>
            </div>
            <button type="button" onClick={() => setActiveToast(null)} className="toast-close-action">
              <Icons.X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="mac-workspace-body">
        <Sidebar 
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          onLogout={onLogout}
          toggleNativeFullscreen={toggleNativeFullscreen}
          userProfile={userProfile}
          structuredMenu={menuData} 
          expandedMenus={expandedMenus}
          toggleSubmenu={toggleSubmenu}
          renderIcon={renderIcon}
        />

        <main className="mac-viewport-scroll-bed">
          <div className="mac-window-sheet-paper">
            <Routes>
              <Route path="/" element={<DashboardSummary />} />
              <Route path="employees" element={<EmployeeDirectory formCode="employee_master_directory" />} />
              <Route path="metadata" element={<MetadataConfig formCode="employee_master_directory" />} />
              <Route path="user-control" element={<UserManagementWorkspace renderIcon={renderIcon} />} />
              <Route path="users" element={<UserManagementWorkspace renderIcon={renderIcon} />} />
              
              <Route path="broadcast" element={<NotificationDispatcher />} />
              <Route 
                path="my-history" 
                element={
                  <UserHistoryLog 
                    currentUserId={userProfile.id} 
                    currentUserRole={userProfile.roleName}
                    globalNotifications={notifications}
                    onMarkAsRead={handleMarkAsRead}
                    onRefreshNeeded={syncNotificationLogs}
                  />
                } 
              />

              <Route path="metadata-config" element={<FormSchemaBuilder />} />
              <Route path="create_company" element={<DynamicPageRouterEngine overrideFormCode="CREATE_COMPANY" />} />
              <Route path="create-company" element={<DynamicPageRouterEngine overrideFormCode="CREATE_COMPANY" />} />
              
              <Route path=":formCode" element={<DynamicPageRouterEngine />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      <Footer 
        structuredMenu={menuData}
        activeDockFlyout={activeDockFlyout}
        setActiveDockFlyout={setActiveDockFlyout}
        isClickLocked={isClickLocked}
        setIsClickLocked={setIsClickLocked}
        leaveTimeoutRef={leaveTimeoutRef}
        renderIcon={renderIcon}
        onLogout={onLogout}
      />
    </div>
  );
}