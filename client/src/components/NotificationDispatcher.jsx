// client/src/components/NotificationDispatcher.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Send, FileUp, Users, Mail, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { AUTH_ENDPOINTS } from '../config/api';
import '../styles/NotificationDispatcher.css';

// Helper function to decode JWT token payload securely
const getUserIdFromToken = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed._id || parsed.id || null; 
  } catch (err) {
    console.error("Failed to extract dynamic sender token contextual metadata:", err);
    return null;
  }
};

export default function NotificationDispatcher() {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [files, setFiles] = useState([]);
  
  const [dispatchStatus, setDispatchStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch active users with valid email addresses
  useEffect(() => {
    const fetchPlatformUsers = async () => {
      try {
        const res = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/users/list`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if (res.ok) {
          const payload = await res.json();
          
          if (payload && Array.isArray(payload.data)) {
            const activeUsers = payload.data.filter(u => u.status === 'Active' && u.email);
            setUsers(activeUsers);
          }
        }
      } catch (err) {
        console.error("Failed to fetch target recipients:", err);
      }
    };
    fetchPlatformUsers();
  }, []);

  // Handle multi-recipient selection
  const handleUserToggle = (id) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(uId => uId !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u._id));
    }
  };

  // File size validation (5MB max per file)
  const processFiles = (uploadedFiles) => {
    setErrorMessage('');
    const MAX_BYTES = 5 * 1024 * 1024; 
    const structuredFiles = [];

    for (let file of uploadedFiles) {
      if (file.size > MAX_BYTES) {
        setErrorMessage(`File "${file.name}" exceeds the maximum allowance limit of 5MB.`);
        return;
      }
      structuredFiles.push(file);
    }
    setFiles(prev => [...prev, ...structuredFiles]);
  };

  const handleFileChange = (e) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (indexToRemove) => {
    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      alert("Please select at least one recipient user.");
      return;
    }

    const dynamicSenderId = getUserIdFromToken();
    if (!dynamicSenderId) {
      setErrorMessage("Authentication failure. Could not identify your sender session ID.");
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('message', message);
    formData.append('sendEmail', sendEmail);
    formData.append('userIds', JSON.stringify(selectedUsers));
    formData.append('currentUserId', dynamicSenderId);
    
    files.forEach(file => {
      formData.append('attachments', file);
    });

    try {
      setDispatchStatus('processing');
      const res = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/notifications/dispatch`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });

      if (res.ok) {
        setDispatchStatus('success');
        setTitle('');
        setMessage('');
        setSelectedUsers([]);
        setFiles([]);
      } else {
        const errData = await res.json();
        setDispatchStatus('failed');
        setErrorMessage(errData.message || 'Notification failed.');
      }
    } catch {
      setDispatchStatus('failed');
      setErrorMessage('Network error occurred. Please try again.');
    }
  };

  return (
    <div className="nd-container">
      <h2 className="nd-header">
        <Send size={18} color="#2563eb" /> Notification Center
      </h2>

      {dispatchStatus === 'success' && (
        <div className="nd-alert nd-alert-success">
          <CheckCircle size={16} /> Notification send successfully!
        </div>
      )}

      {errorMessage && (
        <div className="nd-alert nd-alert-error">
          <AlertTriangle size={16} /> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="nd-form">
        <div className="nd-form-group">
          <label className="nd-label">Alert Title</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
            className="nd-input" 
            placeholder="e.g., Scheduled System Maintenance Update" 
          />
        </div>

        <div className="nd-form-group">
          <label className="nd-label">Message Content</label>
          <textarea 
            rows={4} 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            required 
            className="nd-textarea" 
            placeholder="Write clear instruction directives here..." 
          />
        </div>

        <div className="nd-form-group">
          <div className="nd-user-header">
            <label className="nd-label">
              <Users size={14} /> Target Recipients ({selectedUsers.length} Selected)
            </label>
            <button type="button" onClick={handleSelectAllToggle} className="nd-link-btn">
              {selectedUsers.length === users.length ? 'Deselect All' : 'Select All Active Users'}
            </button>
          </div>
          
          <div className="nd-user-list">
            {users.length === 0 ? (
              <span className="nd-empty-text">No active user profiles registered.</span>
            ) : (
              users.map(u => (
                <label key={u._id} className="nd-user-checkbox">
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.includes(u._id)} 
                    onChange={() => handleUserToggle(u._id)} 
                  />
                  <span>
                    {u.first_name} {u.last_name} 
                    <span className="nd-email-text">({u.email})</span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="nd-form-group">
          <label className="nd-label">
            <FileUp size={14} /> Attachments (5MB Limit per file)
          </label>
          
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            className={`nd-dropzone ${isDragging ? 'dragging' : ''}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
            <FileUp size={24} className="nd-dropzone-icon" />
            <p className="nd-dropzone-text">
              Drag files here or <span className="nd-browse-text">browse local files</span>
            </p>
          </div>

          {files.length > 0 && (
            <div className="nd-staged-container">
              <span className="nd-staged-title">Staged Files:</span>
              <div className="nd-file-pills">
                {files.map((file, idx) => (
                  <div key={idx} className="nd-file-pill">
                    <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }} 
                      className="nd-remove-file-btn"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <label className="nd-email-toggle-label">
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
          <Mail size={14} /> Notification copy delivery via Email
        </label>

        <button 
          type="submit" 
          disabled={dispatchStatus === 'processing'}
          className="nd-submit-btn"
        >
          <Send size={14} /> {dispatchStatus === 'processing' ? 'Sending Notification...' : 'Send'}
        </button>
      </form>
    </div>
  );
}