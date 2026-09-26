// client/src/pages/bmpl/customPages.jsx
// Route -> element for the hand-built BMPL pages. Anything not listed here
// renders as an honest "not rebuilt yet" placeholder in BmplModule.
import React from 'react';
import BmplHome from './pages/BmplHome';
import CandidatesPage from './pages/CandidatesPage';
import CandidateDetailPage from './pages/CandidateDetailPage';
import VacanciesPage from './pages/VacanciesPage';
import VacancyDetailPage from './pages/VacancyDetailPage';
import SourcingTasksPage from './pages/SourcingTasksPage';
import ProposalsPage from './pages/ProposalsPage';
import DocumentationTasksPage from './pages/DocumentationTasksPage';
import CancelledJoinersPage from './pages/CancelledJoinersPage';
import DocumentUploadPage from './pages/DocumentUploadPage';
import TravelDiaryPage from './pages/TravelDiaryPage';
import CrewSignonPage from './pages/CrewSignonPage';
import ReportsPage from './pages/ReportsPage';
import MasterDataPage from './pages/MasterDataPage';
import CmsControlPanelPage from './pages/CmsControlPanelPage';
import PendingDgPage from './pages/PendingDgPage';
import SeaServiceCorrectionPage from './pages/SeaServiceCorrectionPage';
import LetterPage from './pages/LetterPage';
import GenerateInvoicePage from './pages/GenerateInvoicePage';
import OtherNationalityPage from './pages/OtherNationalityPage';
import ShoreCvsPage from './pages/ShoreCvsPage';
import SeafarerRequirementsPage from './pages/SeafarerRequirementsPage';
import PooledCrewPage from './pages/PooledCrewPage';

export const CUSTOM_PAGES = {
  '': <BmplHome />,
  'candidates': <CandidatesPage />,
  'candidates/:id': <CandidateDetailPage />,
  'vacancies': <VacanciesPage />,
  'vacancies/:id': <VacancyDetailPage />,
  'sourcing-tasks': <SourcingTasksPage />,
  'proposals': <ProposalsPage />,
  'documentation-tasks': <DocumentationTasksPage />,
  'cancelled-joiners': <CancelledJoinersPage />,
  'document-upload': <DocumentUploadPage />,
  'pooled-crew': <PooledCrewPage />,
  'travel-diary': <TravelDiaryPage />,
  'crew-signon': <CrewSignonPage />,
  'reports/month-end': <ReportsPage report="month-end" />,
  'reports/candidate': <ReportsPage report="candidate" />,
  'reports/crew-welfare': <ReportsPage report="crew-welfare" />,
  'reports/crew-welfare-govt': <ReportsPage report="crew-welfare-govt" />,
  'reports/all': <ReportsPage report="all" />,
  'reports/expenses': <ReportsPage report="expenses" />,
  'reports/signoff': <ReportsPage report="signoff" />,
  'master-data': <MasterDataPage />,
  'cms-control-panel': <CmsControlPanelPage />,
  'pending-dg': <PendingDgPage />,
  'sea-service-correction': <SeaServiceCorrectionPage />,
  'letters/visa': <LetterPage kind="visa" />,
  'letters/nedpass': <LetterPage kind="nedpass" />,
  'invoices/generate': <GenerateInvoicePage kind="crew" />,
  'invoices/generate-vendor': <GenerateInvoicePage kind="vendor" />,
  'invoices/vendor': <GenerateInvoicePage kind="vendor-list" />,
  'invoices/account-documents': <GenerateInvoicePage kind="account-documents" />,
  'other-nationality': <OtherNationalityPage />,
  'shore-cvs': <ShoreCvsPage />,
  'seafarer-requirements': <SeafarerRequirementsPage />,
  'dg-related': <DocumentUploadPage dgMode />,
  'website-links': <MasterDataPage websiteLinks />,
};
