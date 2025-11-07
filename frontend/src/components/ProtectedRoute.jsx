import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Check authentication on mount and whenever location changes (including forward/back navigation)
  useEffect(() => {
    // Check if user was logged out (prevents back/forward button from restoring session)
    const isLoggedOut = sessionStorage.getItem("isLoggedOut");
    
    // Check if user is logged in
    const userRole = sessionStorage.getItem("userRole");
    const username = sessionStorage.getItem("username");

    // If logged out flag exists or not logged in, deny access
    if (isLoggedOut || !userRole || !username) {
      // Clear any residual session data if logout flag exists
      if (isLoggedOut) {
        sessionStorage.clear();
      }
      setShouldRedirect(true);
      setIsAuthenticated(false);
      return;
    }

    // Check role requirement
    if (requiredRole && userRole !== requiredRole) {
      setShouldRedirect(true);
      setIsAuthenticated(false);
      return;
    }

    // User is authenticated
    setIsAuthenticated(true);
    setShouldRedirect(false);
  }, [location, requiredRole]);

  // If logged out flag exists or not logged in, redirect to login
  if (shouldRedirect) {
    const isLoggedOut = sessionStorage.getItem("isLoggedOut");
    const userRole = sessionStorage.getItem("userRole");
    
    // If there's a role mismatch, redirect to appropriate dashboard
    if (!isLoggedOut && userRole) {
      if (userRole === "admin") {
        return <Navigate to="/admin/dashboard" replace />;
      } else {
        return <Navigate to="/employee/dashboard" replace />;
      }
    }
    
    return <Navigate to="/" replace />;
  }

  // User is authenticated, render the protected component
  if (isAuthenticated) {
    return children;
  }

  // Loading state while checking
  return null;
}

