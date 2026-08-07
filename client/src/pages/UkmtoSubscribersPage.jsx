// client/src/pages/UkmtoSubscribersPage.jsx
import React, { useState, useEffect } from 'react';
import { Ship, Users, CheckCircle, AlertTriangle, Mail } from 'lucide-react';
import { AUTH_ENDPOINTS } from '../config/api';
import '../styles/NotificationDispatcher.css';
import '../styles/UkmtoSubscribersPage.css';

const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` });

export default function UkmtoSubscribersPage() {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, subsRes] = await Promise.all([
          fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/users/list`, { headers: authHeader() }),
          fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/notifications/ukmto-subscribers`, { headers: authHeader() })
        ]);

        const usersPayload = await usersRes.json();
        const subsPayload = await subsRes.json();

        if (usersPayload?.data) {
          setUsers(usersPayload.data.filter(u => u.status === 'Active' && u.email));
        }
        if (Array.isArray(subsPayload?.userIds)) {
          setSelectedUsers(subsPayload.userIds);
        }
      } catch (err) {
        console.error('Failed to load UKMTO subscriber settings:', err);
        setErrorMessage('Failed to load current subscriber list.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

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

  const handleSave = async () => {
    setSaveStatus('saving');
    setErrorMessage('');
    try {
      const res = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/notifications/ukmto-subscribers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ userIds: selectedUsers })
      });

      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        const errData = await res.json();
        setSaveStatus('failed');
        setErrorMessage(errData.error || 'Failed to save subscriber list.');
      }
    } catch {
      setSaveStatus('failed');
      setErrorMessage('Network error occurred while saving.');
    }
  };

  return (
    <div className="nd-container">
      <h2 className="nd-header">
        <Ship size={18} color="#2563eb" /> UKMTO Notification Settings
      </h2>

      <p className="ukmto-sub-description">
        Select which users should receive UKMTO maritime security alerts (bell notification + email)
        whenever a new Warning or Advisory bulletin is automatically detected.
      </p>

      {saveStatus === 'success' && (
        <div className="nd-alert nd-alert-success">
          <CheckCircle size={16} /> Subscriber list saved successfully.
        </div>
      )}

      {errorMessage && (
        <div className="nd-alert nd-alert-error">
          <AlertTriangle size={16} /> {errorMessage}
        </div>
      )}

      <div className="nd-form-group">
        <div className="nd-user-header">
          <label className="nd-label">
            <Users size={14} /> Subscribed Users ({selectedUsers.length} Selected)
          </label>
          <button type="button" onClick={handleSelectAllToggle} className="nd-link-btn">
            {selectedUsers.length === users.length && users.length > 0 ? 'Deselect All' : 'Select All Active Users'}
          </button>
        </div>

        <div className="nd-user-list ukmto-sub-user-list">
          {isLoading ? (
            <span className="nd-empty-text">Loading users...</span>
          ) : users.length === 0 ? (
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

      <div className="ukmto-sub-email-note">
        <Mail size={13} /> Selected users will also receive an email at their registered address for every new bulletin.
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saveStatus === 'saving' || isLoading}
        className="nd-submit-btn"
      >
        {saveStatus === 'saving' ? 'Saving...' : 'Save Subscriber List'}
      </button>
    </div>
  );
}
