// client/src/components/dynamic-engine/DynamicPageRouterEngine.jsx
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import DynamicFormRenderer from './DynamicFormRenderer';
import DynamicListingTable from './DynamicListingTable';
import { AUTH_ENDPOINTS } from '../../config/api';
import '../../styles/DynamicPageRouterEngine.css';

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

  // Dynamically load custom component if has_custom_page is enabled
  const CustomPageComponent = useMemo(() => {
    if (!schema || !schema.has_custom_page) return null;

    const fileSlug = activeCode.toLowerCase();
    
    return React.lazy(() => 
      import(`../../pages/custom/${fileSlug}.jsx`)
        .catch(err => {
          console.error(`Failed to load custom page component at pages/custom/${fileSlug}.jsx:`, err);
          // Return a dummy fallback component if the file is missing on disk
          return {
            default: () => (
              <div style={{ padding: '20px', color: '#dc2626' }}>
                Custom page file <code>client/src/pages/custom/{fileSlug}.jsx</code> could not be loaded.
              </div>
            )
          };
        })
    );
  }, [schema, activeCode]);

  if (loading) return <div style={{ padding: '30px', textAlign: 'center' }}>Loading Workspace Architecture...</div>;
  if (!schema || !schema.fields) return <div style={{ padding: '30px', textAlign: 'center' }}>404 Custom Workspace Schema Template Not Found</div>;

  // 1. RENDER CUSTOM PAGE IF FLAG IS ACTIVE (e.g., has_custom_page === 1 or true)
  if (schema.has_custom_page && CustomPageComponent) {
    return (
      <div className="dynamic-workspace-engine-shell">
        <Suspense fallback={<div style={{ padding: '30px', textAlign: 'center' }}>Loading Custom Page...</div>}>
          <CustomPageComponent 
            schema={schema}
            selectedRecordId={selectedRecordId}
            onEditRecord={handleEditRecord}
            onSaveSuccess={handleSaveSuccess}
          />
        </Suspense>
      </div>
    );
  }

  // 2. STANDARD DYNAMIC LAYOUT ENGINE FALLBACK
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