// client/src/pages/AttendanceRecordsPage.jsx
import React, { useState, useEffect } from 'react';
import { CalendarCheck, Users, AlertTriangle } from 'lucide-react';
import { AUTH_ENDPOINTS, ATTENDANCE_ENDPOINTS } from '../config/api';

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('accessToken')}` });

const thStyle = { padding: '10px', textAlign: 'left' };
const tdStyle = { padding: '10px', color: '#334155' };

export default function AttendanceRecordsPage() {
  const [activeTab, setActiveTab] = useState('records'); // records | summary
  const [users, setUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Records tab state
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);

  // Summary tab state
  const now = new Date();
  const [summary, setSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);

  useEffect(() => {
    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/users/list`, { headers: authHeader() })
      .then(res => res.json())
      .then(data => { if (data.success) setUsers(data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab !== 'records') return;
    let cancelled = false;

    const loadRecords = async () => {
      setRecordsLoading(true);
      setErrorMessage('');
      try {
        const params = new URLSearchParams();
        if (filterUserId) params.set('userId', filterUserId);
        if (filterFrom) params.set('from', filterFrom);
        if (filterTo) params.set('to', filterTo);

        const res = await fetch(`${ATTENDANCE_ENDPOINTS.ADMIN_RECORDS}?${params.toString()}`, { headers: authHeader() });
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setRecords(data.records || []);
        } else {
          setErrorMessage(data.message || 'Failed to load attendance records.');
        }
      } catch {
        if (!cancelled) setErrorMessage('Network error while loading attendance records.');
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    };

    loadRecords();
    return () => { cancelled = true; };
  }, [activeTab, recordsRefreshKey]);

  useEffect(() => {
    if (activeTab !== 'summary') return;
    let cancelled = false;

    const loadSummary = async () => {
      setSummaryLoading(true);
      setErrorMessage('');
      try {
        const params = new URLSearchParams({ month: summaryMonth, year: summaryYear });
        const res = await fetch(`${ATTENDANCE_ENDPOINTS.ADMIN_SUMMARY}?${params.toString()}`, { headers: authHeader() });
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setSummary(data.summary || []);
        } else {
          setErrorMessage(data.message || 'Failed to load monthly summary.');
        }
      } catch {
        if (!cancelled) setErrorMessage('Network error while loading monthly summary.');
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    loadSummary();
    return () => { cancelled = true; };
  }, [activeTab, summaryRefreshKey]);

  return (
    <div style={{ padding: '4px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>
        <CalendarCheck size={18} color="#2563eb" /> Attendance Records
      </h2>
      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
        Review daily attendance check-ins and monthly presence summaries across all users.
      </p>

      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', padding: '8px 10px', borderRadius: '4px', fontSize: '12px', marginBottom: '12px' }}>
          <AlertTriangle size={14} /> {errorMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
        {['records', 'summary'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === tab ? '#2563eb' : '#64748b'
            }}
          >
            {tab === 'records' ? 'Records' : 'Monthly Summary'}
          </button>
        ))}
      </div>

      {activeTab === 'records' && (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>User</label>
              <select value={filterUserId} onChange={e => setFilterUserId(e.target.value)} style={{ padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', minWidth: '180px' }}>
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.first_name} {u.last_name} ({u.username})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>From</label>
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>To</label>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }} />
            </div>
            <button onClick={() => setRecordsRefreshKey(k => k + 1)} style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Apply Filters
            </button>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Leave Time</th>
                  <th style={thStyle}>Marked At</th>
                </tr>
              </thead>
              <tbody>
                {recordsLoading ? (
                  <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading records...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No attendance records found for this filter.</td></tr>
                ) : (
                  records.map(r => (
                    <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>{r.date}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{r.user?.first_name} {r.user?.last_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{r.user?.email}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ backgroundColor: r.type === 'full' ? '#dcfce7' : '#fef9c3', color: r.type === 'full' ? '#15803d' : '#854d0e', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                          {r.type === 'full' ? 'Full Day' : 'Half Day'}
                        </span>
                      </td>
                      <td style={tdStyle}>{r.leave_time || '—'}</td>
                      <td style={tdStyle}>{new Date(r.marked_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'summary' && (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Month</label>
              <select value={summaryMonth} onChange={e => setSummaryMonth(Number(e.target.value))} style={{ padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Year</label>
              <input type="number" value={summaryYear} onChange={e => setSummaryYear(Number(e.target.value))} style={{ padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', width: '90px' }} />
            </div>
            <button onClick={() => setSummaryRefreshKey(k => k + 1)} style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Load Summary
            </button>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={thStyle}><Users size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />User</th>
                  <th style={thStyle}>Full Days</th>
                  <th style={thStyle}>Half Days</th>
                  <th style={thStyle}>Total Marked</th>
                </tr>
              </thead>
              <tbody>
                {summaryLoading ? (
                  <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading summary...</td></tr>
                ) : summary.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No attendance activity for this month.</td></tr>
                ) : (
                  summary.map(row => (
                    <tr key={row.user_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{row.first_name} {row.last_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{row.email}</div>
                      </td>
                      <td style={tdStyle}>{row.full_days}</td>
                      <td style={tdStyle}>{row.half_days}</td>
                      <td style={tdStyle}>{row.total_marked}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
