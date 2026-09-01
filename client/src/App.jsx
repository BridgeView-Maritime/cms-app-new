// client/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import CandidateLoginPage from './pages/CandidateLoginPage';
import CandidateRegisterPage from './pages/CandidateRegisterPage';
import CandidateDashboardPage from './pages/CandidateDashboardPage';
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
        <Route path="/candidate-dashboard" element={<CandidateDashboardPage />} />

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