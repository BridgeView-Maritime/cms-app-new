import React from 'react';
import DynamicFormRenderer from '../../components/dynamic-engine/DynamicFormRenderer';

/**
 * Dynamic Custom Page for Form Code: VACANCY_CREATE
 * Label: Vacancy Create Management
 * Path: client/src/pages/custom/vacancy_create.jsx
 */
export default function VacancyCreateCustomPage() {
  return (
    <div className="custom-page-container">
      <div className="custom-page-header">
        {/* <h2>Vacancy Create Management Workspace</h2> */}
      </div>
      <DynamicFormRenderer formCode="VACANCY_CREATE" />
      {/* <p>custom form start</p> */}
    </div>
  );
}
