import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, requiredRole }) {
  // Check if user is logged in
  const userRole = sessionStorage.getItem("userRole");
  const username = sessionStorage.getItem("username");

  // If not logged in, redirect to login
  if (!userRole || !username) {
    return <Navigate to="/" replace />;
  }

  // If role is specified and doesn't match, redirect to appropriate dashboard
  if (requiredRole && userRole !== requiredRole) {
    if (userRole === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/employee/dashboard" replace />;
    }
  }

  // User is authenticated, render the protected component
  return children;
}

