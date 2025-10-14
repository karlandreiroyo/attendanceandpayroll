import React from "react";
import { useNavigate } from "react-router-dom";
import "../Pages/employeecss/Payrolllogin.css";

export default function PayrollLogin() {
  const navigate = useNavigate();

  const handleEmployeeClick = () => {
    navigate("/employee");
  };

  const handleAdminClick = () => {
    navigate("/admin");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* ✅ Added Image on Top */}
        <img
          src="tata_Ilio_logo-removebg-preview.png"
          alt="Company Logo"
          className="login-logo"
        />

        <h1 className="login-title">Payroll and Attendance System</h1>
        <button onClick={handleEmployeeClick} className="login-button employee-btn">
          Employee Login
        </button>
        <button onClick={handleAdminClick} className="login-button admin-btn">
          Admin Login
        </button>
      </div>
    </div>
  );
}
