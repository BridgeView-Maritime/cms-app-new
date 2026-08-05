// client/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './components/LoginPage';
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
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        
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