import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage.jsx';
import Login from './pages/Auth/Login.jsx';
import Register from './pages/Auth/Register.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import BankStatementUpload from './pages/Dashboard/BankStatementUpload.jsx';
import StatementTransactions from './pages/Dashboard/StatementTransactions.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/upload"
        element={
          <ProtectedRoute>
            <BankStatementUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/statements/:id/transactions"
        element={
          <ProtectedRoute>
            <StatementTransactions />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
