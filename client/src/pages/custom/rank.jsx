import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { AUTH_ENDPOINTS } from '../../config/api';
import DynamicFormRenderer from '../../components/dynamic-engine/DynamicFormRenderer';
import '../../styles/custom/rank.css';

/**
 * Standalone FORM_ONLY Custom Page Component
 * Form Code: RANK
 * Destination Path: client/src/pages/custom/rank.jsx
 */
export default function RankCustomPage() {
  const [schema, setSchema] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const FORM_CODE = 'RANK';

  useEffect(() => {
    fetchFormSchema();
  }, []);

  /**
   * Helper hook to inject or override custom fields into fetched schema metadata manually.
   * Add any extra dynamic/custom form fields here before binding to local state.
   */
  const customizeSchemaFields = (fetchedSchema) => {
    if (!fetchedSchema) return fetchedSchema;

    const existingFields = fetchedSchema.fields || [];

    // Custom manual dynamic field injections placeholder
    const customAdditionalFields = [];

    return {
      ...fetchedSchema,
      fields: [...existingFields, ...customAdditionalFields]
    };
  };

  const fetchFormSchema = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/${FORM_CODE}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (response.ok && (data.success || data.form_code)) {
        const rawSchema = data.data || data;
        const processedSchema = customizeSchemaFields(rawSchema);
        setSchema(processedSchema);
      } else {
        setError(data.message || 'Failed to fetch metadata schema.');
      }
    } catch (err) {
      console.error('Schema retrieval error:', err);
      setError('Network exception encountered while fetching form structure: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSaveSuccess = () => {
    alert('Record saved successfully!');
    fetchFormSchema();
  };

  if (isLoading) {
    return (
      <div className="custom-page-wrapper" style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading Rank Management Form configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="custom-page-wrapper" style={{ padding: '24px' }}>
        <div className="custom-alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-page-wrapper">
      <div className="custom-card">
        <DynamicFormRenderer
          schema={schema}
          formCode={FORM_CODE}
          onSaveSuccess={handleFormSaveSuccess}
        />
      </div>
    </div>
  );
}
