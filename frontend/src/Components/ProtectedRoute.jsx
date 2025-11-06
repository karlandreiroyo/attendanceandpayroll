import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles, children }) {
    const userRole = sessionStorage.getItem("userRole");

    if (!userRole) {
        // User not logged in
        return <Navigate to="/" replace />;
    }

    if (!allowedRoles.includes(userRole)) {
        // User logged in but wrong role
        return <Navigate to="/" replace />;
    }

    return children;
}
