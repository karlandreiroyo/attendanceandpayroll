import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../Pages/employeecss/payrollLogin.css";
import { API_BASE_URL } from "../config/api";
import { notifyProfileUpdated } from "../utils/currentUser";
import TimeInOut from "./timeInOut";

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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotContact, setForgotContact] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeUsed, setCodeUsed] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [showTimeInOut, setShowTimeInOut] = useState(false);

  const validateEmail = useMemo(
    () => (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    [],
  );
  const validatePhone = useMemo(
    () => (phone) => {
      const clean = phone.replace(/\D/g, "");
      return clean.length >= 10 && clean.length <= 15;
    },
    [],
  );
  const isEmail = useMemo(() => (value) => value.includes("@"), []);

  const generateVerificationCode = useMemo(
    () => () => Math.floor(100000 + Math.random() * 900000).toString(),
    [],
  );

  const resetForgotState = () => {
    setForgotContact("");
    setForgotError("");
    setForgotSuccess("");
    setVerificationCode("");
    setVerificationError("");
    setGeneratedCode("");
    setCodeUsed(false);
    setShowVerification(false);
    setShowResetForm(false);
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setResetSuccess("");
  };

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

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotContact.trim()) {
      setForgotError("Please enter your registered email address or phone number.");
      return;
    }

    if (isEmail(forgotContact)) {
      if (!validateEmail(forgotContact)) {
        setForgotError("Please enter a valid email address.");
        return;
      }
    } else if (!validatePhone(forgotContact)) {
      setForgotError("Please enter a valid phone number (10-15 digits).");
      return;
    }

    const code = generateVerificationCode();
    setGeneratedCode(code);
    setCodeUsed(false);
    console.info(`Verification code for ${forgotContact}: ${code}`);
    setShowForgotPassword(false);
    setShowVerification(true);
  };

  const handleVerification = (e) => {
    e.preventDefault();
    setVerificationError("");

    if (!verificationCode.trim()) {
      setVerificationError("Please enter the verification code.");
      return;
    }
    if (verificationCode.length !== 6) {
      setVerificationError("Verification code must be 6 digits.");
      return;
    }
    if (codeUsed) {
      setVerificationError("This verification code has already been used. Please request a new one.");
      return;
    }
    if (verificationCode !== generatedCode) {
      setVerificationError("Invalid verification code. Please try again.");
      return;
    }

    setCodeUsed(true);
    setShowVerification(false);
    setShowResetForm(true);
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setResetError("Please enter and confirm your new password.");
      return;
    }
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match. Please try again.");
      return;
    }

    setResetSuccess(
      "Password reset request recorded. Our administrators will verify your identity and complete the reset shortly.",
    );
    setTimeout(() => {
      setShowResetForm(false);
      resetForgotState();
    }, 2500);
  };

  return (
    <div className="login-container">
      <div className="login-layout">
        {!showTimeInOut ? (
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
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 5.09A10.94 10.94 0 0112 5c5 0 9.27 3.11 11 7.5-.512 1.292-1.27 2.472-2.22 3.47M6.28 6.28C4.12 7.44 2.45 9.23 1 12c1.73 4.39 6 7.5 11 7.5 1.39 0 2.72-.23 3.95-.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    // eye icon
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
                      <path d="M1 12C2.73 7.61 7 4.5 12 4.5s9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>
              {error && (
                <div className="error-message">{error}</div>
              )}
              <div className="forgot-row">
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    resetForgotState();
                    setShowForgotPassword(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={loading} className="login-button employee-btn submit-btn">
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
            <div className="time-access">
              <p className="time-access-text">Need to record attendance without signing in?</p>
              <button
                type="button"
                className="login-button time-access-btn"
                onClick={() => setShowTimeInOut(true)}
              >
                Open Time In / Time Out
              </button>
            </div>
          </div>
        ) : (
          <div className="time-panel">
            <TimeInOut
              active={showTimeInOut}
              backLabel="Back to Login"
              onBack={() => setShowTimeInOut(false)}
              backTo="/"
              variant="compact"
              showFooter={false}
            />
            <button
              type="button"
              className="login-button time-back-btn"
              onClick={() => setShowTimeInOut(false)}
            >
              Back to Login
            </button>
          </div>
        )}

        {showForgotPassword && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Reset Password</h3>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowForgotPassword(false);
                    resetForgotState();
                  }}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleForgotPassword}>
                <div className="field">
                  <span>Email Address or Phone Number</span>
                  <input
                    type="text"
                    placeholder="Enter your contact details"
                    value={forgotContact}
                    onChange={(e) => setForgotContact(e.target.value)}
                    required
                  />
                  <small className="field-hint">
                    Enter the email or mobile number associated with your account.
                  </small>
                </div>
                {forgotError && <div className="error-message">{forgotError}</div>}
                {forgotSuccess && <div className="success-message">{forgotSuccess}</div>}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowForgotPassword(false);
                      resetForgotState();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="reset-btn">
                    Send Verification
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showVerification && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Enter Verification Code</h3>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowVerification(false);
                    resetForgotState();
                  }}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleVerification}>
                <div className="field">
                  <span>6-Digit Verification Code</span>
                  <input
                    type="text"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    maxLength={6}
                    required
                    className="verification-input"
                  />
                  <small className="field-hint">
                    Enter the code sent to {forgotContact || "your contact"}.
                  </small>
                </div>
                {verificationError && <div className="error-message">{verificationError}</div>}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowVerification(false);
                      resetForgotState();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="reset-btn">
                    Verify Code
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showResetForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Create New Password</h3>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowResetForm(false);
                    resetForgotState();
                  }}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handlePasswordReset}>
                <div className="field">
                  <span>New Password</span>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="field">
                  <span>Confirm Password</span>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <small className="field-hint">
                  Password must contain at least 8 characters. For security, an administrator will validate the change.
                </small>
                {resetError && <div className="error-message">{resetError}</div>}
                {resetSuccess && <div className="success-message">{resetSuccess}</div>}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowResetForm(false);
                      resetForgotState();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="reset-btn">
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
