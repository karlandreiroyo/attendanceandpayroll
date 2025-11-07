import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Pages/employeecss/payrollLogin.css";
import { API_BASE_URL } from "../config/api";
import { notifyProfileUpdated } from "../utils/currentUser";

export default function PayrollLogin() {
  const navigate = useNavigate();

  // Check if user is already logged in and redirect them
  // BUT only if they haven't logged out (prevents forward button from auto-logging in)
  useEffect(() => {
    const isLoggedOut = sessionStorage.getItem("isLoggedOut");
    const userRole = sessionStorage.getItem("userRole");
    const username = sessionStorage.getItem("username");

    // Only redirect if user is logged in AND hasn't logged out
    if (!isLoggedOut && userRole && username) {
      // User is already logged in, redirect to their dashboard
      if (userRole === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/employee/dashboard", { replace: true });
      }
    } else if (isLoggedOut) {
      // Clear logout flag and any residual data when on login page
      sessionStorage.clear();
    }
  }, [navigate]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Invalid username or password.");
        return;
      }

      // Clear any previous logout flags
      sessionStorage.removeItem("isLoggedOut");
      
      // Store session info
      sessionStorage.setItem("userRole", data.user.role);
      sessionStorage.setItem("username", data.user.username);
      sessionStorage.setItem("loginTime", new Date().toISOString());
      if (data.user.first_name) sessionStorage.setItem("firstName", data.user.first_name);
      else sessionStorage.removeItem("firstName");

      if (data.user.last_name) sessionStorage.setItem("lastName", data.user.last_name);
      else sessionStorage.removeItem("lastName");

      if (data.user.email) sessionStorage.setItem("email", data.user.email);
      else sessionStorage.removeItem("email");

      if (data.user.profile_picture) sessionStorage.setItem("profilePicture", data.user.profile_picture);
      else sessionStorage.removeItem("profilePicture");

      if (data.user.id) sessionStorage.setItem("userId", String(data.user.id));

      notifyProfileUpdated();

      if (data.user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/employee/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img
          src="tata_Ilio_logo-removebg-preview.png"
          alt="Company Logo"
          className="login-logo"
        />

        <h1 className="login-title">Payroll and Attendance System</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            placeholder="Username"
            className="login-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            required
          />
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="toggle-password-btn"
            >
              {showPassword ? (
                // eye-off icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
                  <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 5.09A10.94 10.94 0 0112 5c5 0 9.27 3.11 11 7.5-.512 1.292-1.27 2.472-2.22 3.47M6.28 6.28C4.12 7.44 2.45 9.23 1 12c1.73 4.39 6 7.5 11 7.5 1.39 0 2.72-.23 3.95-.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                // eye icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
                  <path d="M1 12C2.73 7.61 7 4.5 12 4.5s9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
              )}
            </button>
          </div>
          {error && (
            <div className="error-message">{error}</div>
          )}
          <button type="submit" disabled={loading} className="login-button employee-btn submit-btn">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
