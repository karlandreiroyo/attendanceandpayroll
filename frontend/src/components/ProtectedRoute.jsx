import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ProtectedRoute({ children, requiredRole }) {
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedOut = sessionStorage.getItem("isLoggedOut");
    const userRole = sessionStorage.getItem("userRole");
    const username = sessionStorage.getItem("username");

    // Check if user is logged out or missing credentials
    if (isLoggedOut || !userRole || !username) {
      // Clear any residual data and redirect to login
      sessionStorage.clear();
      navigate("/", { replace: true });
      return;
    }

    // Check if user has the required role
    if (userRole !== requiredRole) {
      // Redirect to appropriate dashboard based on actual role
      if (userRole === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (userRole === "employee") {
        navigate("/employee/dashboard", { replace: true });
      } else {
        // Unknown role, redirect to login
        sessionStorage.clear();
        navigate("/", { replace: true });
      }
      return;
    }
  }, [navigate, requiredRole]);

  // Check authentication status
  const isLoggedOut = sessionStorage.getItem("isLoggedOut");
  const userRole = sessionStorage.getItem("userRole");
  const username = sessionStorage.getItem("username");

  // Don't render children if not authenticated or wrong role
  if (isLoggedOut || !userRole || !username || userRole !== requiredRole) {
    return null; // Will redirect in useEffect
  }

  // User is authenticated and has correct role
  return <>{children}</>;
}

