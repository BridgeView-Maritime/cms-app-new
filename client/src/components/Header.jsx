// client/src/components/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, SlidersHorizontal, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import '../styles/Header.css';

const formatTopBarDate = (date) => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + 
    ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Formats timestamp as DD/MM/YYYY, HH:MM:SS AM/PM
const formatNotificationDate = (dateString) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Just now';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

export default function Header({ currentTime, notifications = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null); 
  const navigate = useNavigate();

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleNotificationClick = () => {
    setIsOpen(false);
    navigate('/dashboard/my-history');
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter out any entries that have already been marked as read
  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <header className="mac-os-status-bar">
      <div className="status-bar-left">
        <span className="apple-logo-icon"></span>
        <span className="app-focused-title">Bridgeview</span>
      </div>
      
      <div className="status-bar-right">
        <Search size={14} className="status-bar-icon" />
        
        <div ref={dropdownRef} className="notification-trigger-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={toggleDropdown} 
            className={`status-bar-btn ${isOpen ? 'active-panel-trigger' : ''}`}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Bell size={14} className="status-bar-icon" />
            {unreadNotifications.length > 0 && (
              <span className="notification-ping-badge" />
            )}
          </button>

          {isOpen && (
            <div className="notification-overlay-dropdown">
              <div className="dropdown-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3>Platform Notifications</h3>
                  <span className="count-tag">{unreadNotifications.length} Unread</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="dropdown-close-btn"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280', padding: '2px' }}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="dropdown-body-scroll">
                {unreadNotifications.length === 0 ? (
                  <div className="empty-notification-state">
                    <ShieldCheck size={20} color="#10b981" />
                    <p>No new notification dispatches or unread updates.</p>
                  </div>
                ) : (
                  unreadNotifications.map((item, index) => {
                    const title = item.notificationId?.title || item.title || 'System Alert';
                    const message = item.notificationId?.message || item.message || '';
                    const time = item.notificationId?.createdAt || item.createdAt || null;

                    return (
                      <div 
                        key={item._id || index} 
                        className="notification-item-card risk-high"
                        onClick={handleNotificationClick}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="item-title-row">
                          <AlertTriangle size={14} className="risk-alert-icon" />
                          <h4>{title}</h4>
                        </div>
                        <p className="item-message-details">{message}</p>
                        
                        {item.notificationId?.attachments?.length > 0 && (
                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#4b5563' }}>
                            📎 Has Attachments ({item.notificationId.attachments.length})
                          </div>
                        )}

                        <span className="item-timestamp">
                          {formatNotificationDate(time)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <SlidersHorizontal size={14} className="status-bar-icon" />
        <span className="status-bar-clock">{formatTopBarDate(currentTime)}</span>
      </div>
    </header>
  );
}