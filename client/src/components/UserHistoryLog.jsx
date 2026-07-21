// client/src/components/UserHistoryLog.jsx
import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import '../styles/UserHistoryLog.css';
import { AUTH_ENDPOINTS } from '../config/api';

// Helper function to format timestamp into DD/MM/YYYY, HH:MM:SS AM/PM
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';

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

export default function UserHistoryLog({ 
  currentUserId, 
  currentUserRole, 
  globalNotifications, 
  onMarkAsRead,
  onRefreshNeeded 
}) {
  const [fetching, setFetching] = useState(false);
  const [localLogs, setLocalLogs] = useState([]);
  const [activeModalItem, setActiveModalItem] = useState(null);

  useEffect(() => {
    if (globalNotifications && globalNotifications.length > 0) {
      const validLogs = globalNotifications.filter(item => item.notificationId || item.title);
      setLocalLogs(validLogs);
    } else {
      loadStandaloneHistoryData();
    }
  }, [globalNotifications, currentUserId]);

  const loadStandaloneHistoryData = () => {
    const isSuperAdmin = currentUserRole === 'Super Administrator' || currentUserRole === 'SUPER_ADMIN';
    if (!isSuperAdmin && (!currentUserId || currentUserId === '')) return;

    setFetching(true);
    const token = localStorage.getItem('accessToken');
    const queryId = currentUserId || 'ALL';

    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/notifications/my-history?userId=${queryId}&role=${currentUserRole || 'employee'}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const historyArray = Array.isArray(data) ? data : (data?.history || []);
        const validHistory = historyArray.filter(item => item.notificationId);
        setLocalLogs(validHistory);
        
        if (activeModalItem) {
          const updatedItem = validHistory.find(log => log._id === activeModalItem._id);
          if (updatedItem) setActiveModalItem(updatedItem);
        }
      })
      .catch(err => console.error("Error drawing standalone records table view layout: ", err))
      .finally(() => setFetching(false));
  };

  const executeMarkRead = async (itemId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/notifications/mark-read/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: currentUserId })
      });
      
      const resData = await response.json();
      if (!response.ok) {
        console.error("Server API rejection: ", resData.error);
      }
    } catch (err) {
      console.error("Error in patch workflow operation: ", err);
    }
    
    if (onRefreshNeeded) onRefreshNeeded();
    loadStandaloneHistoryData();
  };

  const handleOpenDispatch = (item) => {
    setActiveModalItem(item);
    if (!item.isRead) {
      executeMarkRead(item._id);
    }
  };

  const isSuperAdmin = currentUserRole === 'Super Administrator' || currentUserRole === 'SUPER_ADMIN';
  if (!isSuperAdmin && (!currentUserId || currentUserId === '')) {
    return (
      <div className="history-log-loading-context">
        <p>Establishing secure context session profile...</p>
      </div>
    );
  }

  const getDownloadUrl = (fileUrl) => {
    if (!fileUrl) return '#';
    if (fileUrl.startsWith('http')) return fileUrl;
    return `${window.location.origin}${fileUrl}`;
  };

  return (
    <div className="history-log-container">
      <div className="history-log-card">
        
        <div className="history-log-header">
          <div>
            <h2>Your Notification History Log</h2>
            <p>Review operational dispatches and tracking logs mapped to your clearance account profile.</p>
          </div>
          <button 
            type="button"
            className="btn-sync-log"
            onClick={() => { if (onRefreshNeeded) { onRefreshNeeded(); } else { loadStandaloneHistoryData(); } }}
          >
            <Icons.RefreshCw size={12} /> Sync Log View
          </button>
        </div>

        {fetching ? (
          <div className="history-log-state-msg">
            <p>Parsing database distribution lists...</p>
          </div>
        ) : localLogs.length === 0 ? (
          <div className="history-log-empty-state">
            <Icons.Inbox size={36} className="icon-empty" />
            <p>No logs or advisory alerts routed to this account profile signature yet.</p>
          </div>
        ) : (
          <div className="history-table-wrapper custom-scrollbar">
            <table>
              <thead>
                <tr>
                  <th>Sender Identity</th>
                  <th>Title Heading</th>
                  <th>Sent Date &amp; Time</th>
                  <th style={{ width: '120px' }}>Read Status</th>
                  <th style={{ width: '160px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {localLogs.map((item, index) => {
                  const title = item.notificationId?.title || item.title;
                  const sender = item.notificationId?.senderId || item.senderId;
                  const createdAt = item.notificationId?.createdAt || item.createdAt;
                  
                  let senderText = 'Bridgeview Admin';
                  if (sender && typeof sender === 'object') {
                    senderText = sender.first_name ? `${sender.first_name} ${sender.last_name || ''}` : 'Bridgeview Admin';
                  }

                  return (
                    <tr 
                      key={item._id || index} 
                      className={item.isRead ? 'row-read' : 'row-unread'}
                    >
                      <td className="cell-sender">{senderText}</td>
                      <td className="cell-title">{title}</td>
                      <td className="cell-timestamp">{formatDateTime(createdAt)}</td>
                      <td>
                        <span className={`status-badge ${item.isRead ? 'status-read' : 'status-unread'}`}>
                          {item.isRead ? '✓ Read' : '● Unread'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-review-dispatch"
                          onClick={() => handleOpenDispatch(item)}
                        >
                          <Icons.Eye size={13} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DISPATCH DETAILS MODAL CONTAINER */}
      {activeModalItem && (() => {
        const modalTitle = activeModalItem.notificationId?.title || activeModalItem.title;
        const modalMessage = activeModalItem.notificationId?.message || activeModalItem.message;
        const modalSender = activeModalItem.notificationId?.senderId || activeModalItem.senderId;
        const modalCreatedAt = activeModalItem.notificationId?.createdAt || activeModalItem.createdAt;
        const modalAttachments = activeModalItem.notificationId?.attachments || activeModalItem.attachments || [];
        
        let modalSenderText = 'Bridgeview Admin';
        if (modalSender && typeof modalSender === 'object') {
          modalSenderText = modalSender.first_name ? `${modalSender.first_name} ${modalSender.last_name || ''}` : 'Bridgeview Admin';
        }

        return (
          <div className="modal-backdrop">
            <div className="modal-container">
              
              <div className="modal-header">
                <div>
                  <span className="modal-subtitle">Dispatch Log Record</span>
                  <h3>{modalTitle}</h3>
                </div>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setActiveModalItem(null)}
                >
                  <Icons.X size={20} />
                </button>
              </div>

              <div className="modal-meta-bar" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Sender Identity:</strong> {modalSenderText}</span>
                <span><strong>Sent:</strong> {formatDateTime(modalCreatedAt)}</span>
              </div>

              <div className="modal-body custom-scrollbar">
                <h4>Message Body Context</h4>
                <p className="message-content-box">{modalMessage}</p>

                <div className="attachments-section">
                  <h4>File Attachments ({modalAttachments.length})</h4>
                  {modalAttachments.length > 0 ? (
                    <div className="attachments-list">
                      {modalAttachments.map((file, fIndex) => (
                        <div key={file._id || fIndex} className="attachment-item">
                          <div className="attachment-info">
                            <Icons.FileText size={16} className="icon-file" />
                            <span title={file.fileName}>{file.fileName || 'Unnamed Attachment'}</span>
                          </div>
                          <a
                            href={getDownloadUrl(file.fileUrl)}
                            download={file.fileName}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-download-attachment"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Icons.Download size={12} /> Download File
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-attachments-text">
                      No attachments are linked with this distribution.
                    </p>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-dismiss-modal"
                  onClick={() => setActiveModalItem(null)}
                >
                  Dismiss Log View
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}