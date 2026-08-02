import React from 'react';
import { Navigate } from 'react-router-dom';

function getToken() {
  try {
    return localStorage.getItem('authToken') || sessionStorage.getItem('token') || null;
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ children }) {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
