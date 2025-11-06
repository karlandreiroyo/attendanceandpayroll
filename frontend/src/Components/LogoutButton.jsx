import React from "react";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Clear session
        sessionStorage.clear();

        // Redirect to login page and replace history
        navigate("/", { replace: true });
    };

    return (
        <button onClick={handleLogout} className="logout-button">
            Logout
        </button>
    );
}
