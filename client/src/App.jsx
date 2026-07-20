// client/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import MacDynamicDashboard from './components/Dashboard';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  return token ? children : <Navigate to="/" replace />;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  return token ? <Navigate to="/dashboard" replace /> : children;
};

export default function App() {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
        
        {/* Dynamic Catch-All Route Handles standard layouts under /dashboard/* including broadcast and history */}
        <Route 
          path="/dashboard/*" 
          element={<ProtectedRoute><MacDynamicDashboard onLogout={handleLogout} /></ProtectedRoute>} 
        />
        
        {/* Dynamic Interceptor matching custom root paths like /app/workspace/* inside the main frame container context */}
        <Route 
          path="/app/workspace/*" 
          element={<ProtectedRoute><MacDynamicDashboard onLogout={handleLogout} /></ProtectedRoute>} 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}