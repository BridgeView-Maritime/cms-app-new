// client/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import CandidateLoginPage from './pages/CandidateLoginPage';
import CandidateRegisterPage from './pages/CandidateRegisterPage';
import CandidatePortalLayout from './components/CandidatePortalLayout';
import CandidateOverviewPage from './pages/candidate/CandidateOverviewPage';
import CandidateProfilePage from './pages/candidate/CandidateProfilePage';
import CandidateResumePage from './pages/candidate/CandidateResumePage';
import CandidateSeaServicesPage from './pages/candidate/CandidateSeaServicesPage';
import CandidateQualificationPage from './pages/candidate/CandidateQualificationPage';
import CandidateNokPage from './pages/candidate/CandidateNokPage';
import CandidatePreviousEmployersPage from './pages/candidate/CandidatePreviousEmployersPage';
import CandidateBankDetailsPage from './pages/candidate/CandidateBankDetailsPage';
import CandidateCocPage from './pages/candidate/CandidateCocPage';
import CandidateOffshoreCertificatesPage from './pages/candidate/CandidateOffshoreCertificatesPage';
import CandidateOtherCertificatesPage from './pages/candidate/CandidateOtherCertificatesPage';
import CandidateStcwPage from './pages/candidate/CandidateStcwPage';
import CandidateJobsPage from './pages/candidate/CandidateJobsPage';
import CandidateSavedJobsPage from './pages/candidate/CandidateSavedJobsPage';
import CandidateAppliedJobsPage from './pages/candidate/CandidateAppliedJobsPage';
import CandidateContractDetailsPage from './pages/candidate/CandidateContractDetailsPage';
import CandidateGrievancesPage from './pages/candidate/CandidateGrievancesPage';
import CandidateHelpPage from './pages/candidate/CandidateHelpPage';
import CandidateChangePasswordPage from './pages/candidate/CandidateChangePasswordPage';
import ProductsPage from './pages/ProductsPage';
import MacDynamicDashboard from './components/Dashboard';
import FloatingChatbot from './components/FloatingChatbot';

// Route Guard for Authenticated Routes
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  return token ? children : <Navigate to="/" replace />;
};

// Route Guard for Guest/Public Routes
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  return token ? <Navigate to="/dashboard" replace /> : children;
};

// Wrapper Component to extract form context from URL/path and render the Chatbot
const AuthenticatedLayout = ({ onLogout }) => {
  const location = useLocation();

  // Extract form_code dynamically from the URL path if available (e.g. /dashboard/EMPLOYEE_ONBOARDING)
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const activeFormCode = pathSegments.length > 1 ? pathSegments[pathSegments.length - 1] : 'GLOBAL_WORKSPACE';

  return (
    <>
      <MacDynamicDashboard onLogout={onLogout} />
      
      {/* Floating Voice + Text Chatbot overlayed on protected views */}
      <FloatingChatbot 
        formCode={activeFormCode} 
        formDescription={`Context generated for section: ${activeFormCode.replace(/_/g, ' ')}`} 
      />
    </>
  );
};

export default function App() {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <Router>
      <Routes>
        {/* Public marketing / candidate landing page — the app's new home page */}
        <Route path="/" element={<LandingPage />} />

        {/* Admin/staff login flow, reached via the "Admin Login" button on the landing page */}
        <Route
          path="/admin-login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Candidate portal — its own login page and post-login dashboard.
            Each page self-guards via useCandidateSession (async /me check),
            so no synchronous route guard is needed here. */}
        <Route path="/candidate-login" element={<CandidateLoginPage />} />
        <Route path="/candidate-register" element={<CandidateRegisterPage />} />
        {/* The logged-in candidate portal. Everything lives under /candidate/*
            behind a shared layout (sidebar + auth gate). Sections whose legacy
            tables aren't migrated yet render an explicit placeholder. */}
        <Route path="/candidate" element={<CandidatePortalLayout />}>
          <Route index element={<CandidateOverviewPage />} />
          <Route path="profile" element={<CandidateProfilePage />} />
          <Route path="resume" element={<CandidateResumePage />} />

          <Route path="jobs" element={<CandidateJobsPage />} />
          <Route path="saved-jobs" element={<CandidateSavedJobsPage />} />
          <Route path="applied-jobs" element={<CandidateAppliedJobsPage />} />
          <Route path="sea-services" element={<CandidateSeaServicesPage />} />
          <Route path="grievances" element={<CandidateGrievancesPage />} />
          <Route path="qualification" element={<CandidateQualificationPage />} />
          <Route path="nok" element={<CandidateNokPage />} />
          <Route path="previous-employers" element={<CandidatePreviousEmployersPage />} />
          <Route path="stcw" element={<CandidateStcwPage />} />
          <Route path="contracts" element={<CandidateContractDetailsPage />} />
          <Route path="coc" element={<CandidateCocPage />} />
          <Route path="offshore-certificates" element={<CandidateOffshoreCertificatesPage />} />
          <Route path="other-certificates" element={<CandidateOtherCertificatesPage />} />
          <Route path="bank-details" element={<CandidateBankDetailsPage />} />
          <Route path="help" element={<CandidateHelpPage />} />
          <Route path="change-password" element={<CandidateChangePasswordPage />} />
        </Route>

        {/* Old flat path kept working so existing links don't break */}
        <Route path="/candidate-dashboard" element={<Navigate to="/candidate" replace />} />

        {/* Product catalogue — public browsing, candidate-only cart/order actions */}
        <Route path="/products" element={<ProductsPage />} />

        {/* Dynamic Catch-All Route: Handles standard layouts under /dashboard/* including broadcast and history */}
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        
        {/* Dynamic Interceptor matching custom root paths like /app/workspace/* inside the main frame container context */}
        <Route 
          path="/app/workspace/*" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}