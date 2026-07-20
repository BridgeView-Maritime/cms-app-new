
import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { AUTH_ENDPOINTS } from '../../config/api';

export default function DynamicListingTable({ schema, onEditRecord }) {
  const [dataset, setDataset] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derive target configuration rows directly out of the Active Blueprint Mapping Grid
  const visibleColumns = schema.fields.filter(f => f.is_active).slice(0, 4);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/collections/${schema.form_code.toLowerCase()}/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => {
        if (Array.isArray(res.data)) setDataset(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("System pipeline query failure execution context:", err);
        setLoading(false);
      });
  }, [schema]);

  if (loading) return <div>Querying data clusters...</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="mac-data-grid-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
            {visibleColumns.map(col => (
              <th key={col.field_key} style={{ padding: '12px', fontWeight: '600', color: '#475569' }}>{col.label}</th>
            ))}
            <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {dataset.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length + 1} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                No active collection indices initialized inside this route template workspace yet.
              </td>
            </tr>
          ) : (
            dataset.map((row) => (
              <tr key={row._id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-data-row">
                {visibleColumns.map(col => (
                  <td key={col.field_key} style={{ padding: '12px', color: '#334155' }}>
                    {typeof row[col.field_key] === 'object' ? JSON.stringify(row[col.field_key]) : String(row[col.field_key] || '')}
                  </td>
                ))}
                <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button 
                        className="mac-btn-action small structural" 
                        onClick={() => {
                        // SAFE GUARD CHECK: Verifies property safety prior to thread execution
                        if (typeof onEditRecord === 'function') {
                            onEditRecord(row._id);
                        } else {
                            console.warn("Operational Error: 'onEditRecord' callback is missing on parent implementation.");
                        }
                        }}
                    >
                        <FileText size={12}/> Edit
                    </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

