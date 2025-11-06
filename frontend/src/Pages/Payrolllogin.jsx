import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Pages/employeecss/payrollLogin.css";
import { API_BASE_URL } from "../config/api";

export default function PayrollLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Redirect logged-in users immediately
  useEffect(() => {
    const role = sessionStorage.getItem("userRole");
    if (role === "admin") navigate("/admin/dashboard", { replace: true });
    else if (role === "employee") navigate("/employee/dashboard", { replace: true });
  }, [navigate]);

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
      console.log("API response:", data);

      if (!res.ok || !data.success) {
        setError(data.message || "Invalid username or password.");
        setLoading(false);
        return;
      }

      const role = data.user?.role?.toLowerCase();
      if (!role) {
        setError("Login succeeded but no role found.");
        setLoading(false);
        return;
      }

      // ✅ Save session
      sessionStorage.setItem("userRole", role);
      sessionStorage.setItem("username", data.user.username);
      sessionStorage.setItem("loginTime", new Date().toISOString());

      // ✅ Navigate to dashboard
      if (role === "admin") navigate("/admin/dashboard", { replace: true });
      else if (role === "employee") navigate("/employee/dashboard", { replace: true });
      else setError(`Unknown role: ${role}`);
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src="tata_Ilio_logo-removebg-preview.png" alt="Company Logo" className="login-logo" />
        <h1 className="login-title">Payroll and Attendance System</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            placeholder="Username"
            className="login-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="toggle-password-btn"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="login-button employee-btn submit-btn">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
