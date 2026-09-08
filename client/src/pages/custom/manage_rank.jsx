import React, { useState, useEffect } from 'react';
import { Save, Plus } from 'lucide-react';
import { AUTH_ENDPOINTS } from '../../config/api';
import '../../styles/custom/manage_rank.css';

/**
 * Standalone Custom Page Component for Form Code: MANAGE_RANK
 * Label: Manage Rank
 * Path: client/src/pages/custom/manage_rank.jsx
 */
export default function ManageRankCustomPage() {
  const [listData, setListData] = useState([]);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const targetLayoutMode = "LISTING_ONLY";
  const sourceCode = "RANK";
  const selectedCols = [];

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/${sourceCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setListData(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/forms/submit/MANAGE_RANK`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ type: 'success', message: 'Record saved successfully!' });
        setFormData({});
        fetchRecords();
      } else {
        setStatus({ type: 'error', message: data.message || 'Error processing request.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Submission failed: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="custom-page-wrapper">
      <div className="custom-card">
        <div className="custom-header">
          <h2>Manage Rank Workspace</h2>
        </div>

        {targetLayoutMode !== 'FORM_ONLY' && (
          <div className="custom-listing-section">
            <div className="custom-toolbar">
              {false && (
                [].map(btn => (
                  <a key={btn.id} href={btn.href} className="btn-secondary">
                    <Plus size={16} /> {btn.label}
                  </a>
                ))
              )}
            </div>

            <div className="custom-table-container">
              {isLoading ? (
                <p>Loading collection records...</p>
              ) : listData.length === 0 ? (
                <p>No records found in collection.</p>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      {selectedCols.map(col => (
                        <th key={col}>{col.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listData.map((row, idx) => (
                      <tr key={row._id || idx}>
                        {selectedCols.map(col => (
                          <td key={col}>{row[col] !== undefined ? String(row[col]) : ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {targetLayoutMode !== 'LISTING_ONLY' && (
          <form onSubmit={handleSubmit} style={{ marginTop: targetLayoutMode !== 'FORM_ONLY' ? '32px' : 0 }}>
            <div className="custom-form-grid">
              
            </div>

            {status && (
              <div className={`custom-alert alert-${status.type}`}>
                {status.message}
              </div>
            )}

            <div className="custom-actions">
              <button type="submit" disabled={isSubmitting} className="btn-submit">
                <Save size={18} /> {isSubmitting ? 'Saving...' : 'Submit Entry'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
