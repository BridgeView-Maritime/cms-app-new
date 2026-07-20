// client/src/components/dynamic-engine/DynamicPageRouterEngine.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import DynamicFormRenderer from './DynamicFormRenderer';
import DynamicListingTable from './DynamicListingTable';
import { AUTH_ENDPOINTS } from '../config/api';

export default function DynamicPageRouterEngine() {
  const { formCode } = useParams();
  const location = useLocation();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- ORCHESTRATION STATES FOR SYNCHRONIZATION & CRASH FIXES ---
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Derive structural code even if deep path configurations match
  const activeCode = formCode 
    ? formCode.toUpperCase().replace(/-/g, '_')
    : location.pathname.split('/').pop().toUpperCase().replace(/-/g, '_');

  useEffect(() => {
    setLoading(true);
    setSelectedRecordId(null); // Reset active edits on route change
    const token = localStorage.getItem('accessToken');
    
    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/${activeCode}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setSchema(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error retrieving custom configuration matrix:", err);
        setLoading(false);
      });
  }, [activeCode]);

  // Handlers to bridge table actions and form completion
  const handleEditRecord = useCallback((recordId) => {
    setSelectedRecordId(recordId);
  }, []);

  const handleSaveSuccess = useCallback(() => {
    setSelectedRecordId(null); // Clear editing state context
    setRefreshTrigger(prev => prev + 1); // Triggers key re-mount to pull fresh data
  }, []);

  if (loading) return <div style={{ padding: '30px', textAlign: 'center' }}>Loading Workspace Architecture...</div>;
  if (!schema || !schema.fields) return <div style={{ padding: '30px', textAlign: 'center' }}>404 Custom Workspace Schema Template Not Found</div>;

  return (
    <div className="dynamic-workspace-engine-shell">
      {schema.target_layout_mode === 'LISTING_ONLY' && (
        <DynamicListingTable 
          key={`list-${activeCode}-${refreshTrigger}`} 
          schema={schema} 
          onEditRecord={handleEditRecord} 
        />
      )}
      
      {schema.target_layout_mode === 'FORM_ONLY' && (
        <DynamicFormRenderer 
          schema={schema} 
          recordId={selectedRecordId} 
          onSaveSuccess={handleSaveSuccess} 
        />
      )}
      
      {schema.target_layout_mode === 'LISTING_AND_FORM' && (
        <div className="split-workspace-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Table side: Listens for edit triggers and forces re-mounts on update */}
          <DynamicListingTable 
            key={`list-${activeCode}-${refreshTrigger}`} 
            schema={schema} 
            onEditRecord={handleEditRecord} 
          />
          {/* Form side: Passes selected edit state context and triggers table re-fetches */}
          <DynamicFormRenderer 
            schema={schema} 
            recordId={selectedRecordId} 
            onSaveSuccess={handleSaveSuccess} 
          />
        </div>
      )}
    </div>
  );
}