import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../Pages/employeecss/employeelogin.css";

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotContact, setForgotContact] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeUsed, setCodeUsed] = useState(false);

  // --- VALIDATIONS ---
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => {
    const clean = phone.replace(/\D/g, "");
    return clean.length >= 10 && clean.length <= 15;
  };
  const isEmail = (input) => input.includes("@");

  const generateVerificationCode = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  // --- VERIFICATION HANDLER ---
  const handleVerification = (e) => {
    e.preventDefault();
    if (!verificationCode.trim()) return setVerificationError("Please enter the verification code.");
    if (verificationCode.length !== 6) return setVerificationError("Verification code must be 6 digits.");
    if (codeUsed) return setVerificationError("This verification code has already been used. Please request a new one.");
    if (verificationCode !== generatedCode) return setVerificationError("Invalid verification code. Please try again.");

    setCodeUsed(true);
    setShowVerification(false);
    setShowForgotPassword(false);
    navigate("/employee/dashboard");
  };

  // --- FORGOT PASSWORD HANDLER ---
  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotContact.trim())
      return setForgotError("Please enter your email address or phone number.");

    if (isEmail(forgotContact)) {
      if (!validateEmail(forgotContact))
        return setForgotError("Please enter a valid email address.");
    } else {
      if (!validatePhone(forgotContact))
        return setForgotError("Please enter a valid phone number (10-15 digits).");
    }

    const code = generateVerificationCode();
    setGeneratedCode(code);
    setCodeUsed(false);
    console.log(`Verification code for ${forgotContact}: ${code}`);
    setShowVerification(true);
    setShowForgotPassword(false);
  };

  // --- LOGIN HANDLER ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: employeeId.trim(),
          password,
          role: "employee",
        }),
      });


      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Invalid employee ID or password.");
        console.log(username, password, role);
        return;
      }

      // Store session data
      try {
        sessionStorage.setItem("userRole", result.role);
        sessionStorage.setItem("loginTime", new Date().toISOString());
      } catch { }

      navigate("/employee/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    }
  };


  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Employee Login</h1>
        <p className="login-subtitle">Enter your credentials to continue</p>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Employee ID"
            className="login-input"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="forgot-row">
            <button
              type="button"
              className="link-btn"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot password?
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            Log In
          </button>
        </form>

        <Link to="/" className="back-link">
          ← Back to Main Login
        </Link>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotPassword && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotContact("");
                  setForgotError("");
                  setForgotSuccess("");
                  setCodeUsed(false);
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
                  placeholder="Email or Phone Number"
                  value={forgotContact}
                  onChange={(e) => setForgotContact(e.target.value)}
                  required
                />
                <small className="field-hint">
                  Enter your registered email address or phone number
                </small>
              </div>

              {forgotError && (
                <div className="error-message">{forgotError}</div>
              )}
              {forgotSuccess && (
                <div className="success-message">{forgotSuccess}</div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotContact("");
                    setForgotError("");
                    setForgotSuccess("");
                    setCodeUsed(false);
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

      {/* VERIFICATION MODAL */}
      {showVerification && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Enter Verification Code</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowVerification(false);
                  setVerificationCode("");
                  setVerificationError("");
                  setGeneratedCode("");
                  setCodeUsed(false);
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
                    setVerificationCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  maxLength="6"
                  required
                  className="verification-input"
                />
                <small className="field-hint">
                  Enter the 6-digit code sent to {forgotContact}
                </small>
              </div>

              {verificationError && (
                <div className="error-message">{verificationError}</div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowVerification(false);
                    setVerificationCode("");
                    setVerificationError("");
                    setGeneratedCode("");
                    setCodeUsed(false);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="reset-btn">
                  Verify & Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
