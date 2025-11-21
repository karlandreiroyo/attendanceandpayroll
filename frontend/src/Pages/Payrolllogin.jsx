import React, { useState, useEffect, useMemo, useRef } from "react";
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

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-start fingerprint scanning on mount
  useEffect(() => {
    startFingerprintScanning();
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
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
  
  // Time In/Out states
  const [isListening, setIsListening] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [scanStatus, setScanStatus] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [notification, setNotification] = useState(null);
  const eventSourceRef = useRef(null);

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

  // Time In/Out handlers
  const startFingerprintScanning = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Check device status first
    try {
      const statusRes = await fetch(`${API_BASE_URL}/fingerprint/status`, {
        credentials: "include",
      });
      const statusData = await statusRes.json();
      
      if (!statusData.connected) {
        setScanStatus("Device not connected");
        setScanError(statusData.message || "Fingerprint device is not connected. Please check the connection.");
        setIsListening(false);
        return;
      }
    } catch (err) {
      console.error("Failed to check device status:", err);
      setScanError("Could not check device status. Please ensure the backend is running.");
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setScanError("");
    setScanStatus("Ready - Place your finger on the scanner now");

    const eventSource = new EventSource(`${API_BASE_URL}/fingerprint/events`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("✅ EventSource connected to fingerprint stream");
      console.log("EventSource readyState:", eventSource.readyState);
      console.log("EventSource URL:", `${API_BASE_URL}/fingerprint/events`);
      setScanStatus("Ready - Place your finger on the scanner now");
      console.log("⏳ Now waiting for fingerprint events...");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📥 Fingerprint event received:", data);
        
        if (data.type === "scanning") {
          console.log("🔍 Fingerprint scanning detected!");
          setScanLoading(true);
          setScanStatus("Scanning fingerprint... Please keep your finger on the scanner");
          setNotification({
            type: "info",
            message: "🔍 Scanning fingerprint... Please keep your finger on the scanner",
            details: null,
          });
        } else if (data.type === "detected" && data.id) {
          console.log("✅ Fingerprint detected, ID:", data.id);
          handleFingerprintDetected(data.id);
        } else if (data.type === "unregistered") {
          console.log("❌ Unregistered fingerprint detected");
          setScanLoading(false);
          setScanStatus("Unregistered fingerprint. Please contact administrator.");
          setScanError("This fingerprint is not registered in the system.");
          setNotification({
            type: "error",
            message: "❌ Unregistered fingerprint. Please contact administrator.",
            details: null,
          });
          setTimeout(() => {
            setScanStatus("Ready - Place your finger on the scanner now");
            setScanError("");
            setNotification(null);
          }, 3000);
        } else if (data.type === "raw") {
          // Log ALL raw data for debugging
          console.log("📨 Raw fingerprint data:", data.raw);
          
          // Show scanning status if we see scanning-related messages
          if (data.raw && (data.raw.includes("scanning") || data.raw.includes("Scanning") || data.raw.includes("Fingerprint scanning"))) {
            console.log("🔍 Detected scanning message in raw data!");
            setScanLoading(true);
            setScanStatus("Scanning fingerprint... Please keep your finger on the scanner");
            setNotification({
              type: "info",
              message: "🔍 Scanning fingerprint... Please keep your finger on the scanner",
              details: null,
            });
          }
          
          // Check for detection in raw data (in case parsing missed it)
          const detectedMatch = data.raw.match(/Detected ID:\s*(\d+)/i) || data.raw.match(/Found ID\s*#?\s*(\d+)/i);
          if (detectedMatch && detectedMatch[1]) {
            const id = Number(detectedMatch[1]);
            console.log("✅ Found detection in raw data, ID:", id);
            handleFingerprintDetected(id);
          }
          
          // Check for unregistered in raw data
          if (data.raw && data.raw.includes("Unregistered")) {
            console.log("❌ Unregistered fingerprint in raw data");
            setScanLoading(false);
            setScanStatus("Unregistered fingerprint. Please contact administrator.");
            setScanError("This fingerprint is not registered in the system.");
            setNotification({
              type: "error",
              message: "❌ Unregistered fingerprint. Please contact administrator.",
              details: null,
            });
            setTimeout(() => {
              setScanStatus("Ready - Place your finger on the scanner now");
              setScanError("");
              setNotification(null);
            }, 3000);
          }
          
          // Log DEBUG messages from Arduino for troubleshooting
          if (data.raw && data.raw.includes("DEBUG:")) {
            console.log("🔧 Arduino DEBUG:", data.raw);
            // Show sensor errors to user
            if (data.raw.includes("error code")) {
              setScanStatus(`Sensor issue: ${data.raw}`);
              setScanError("Sensor error detected. Check sensor connection.");
              setNotification({
                type: "error",
                message: `⚠️ Sensor error detected. Check sensor connection. ${data.raw}`,
                details: null,
              });
              setTimeout(() => {
                setScanStatus("Ready - Place your finger on the scanner now");
                setScanError("");
                setNotification(null);
              }, 5000);
            }
          }
        }
      } catch (err) {
        console.error("❌ Error parsing fingerprint event:", err, "Raw data:", event.data);
      }
    };

    eventSource.onerror = (err) => {
      console.error("❌ EventSource error:", err);
      console.log("EventSource readyState:", eventSource.readyState);
      console.log("EventSource URL:", eventSource.url);
      
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log("⚠️ EventSource connection closed - will attempt to reconnect");
        setScanStatus("Connection closed. Attempting to reconnect...");
        setScanError("Connection to fingerprint scanner closed. Attempting to reconnect...");
        setIsListening(false);
        // Try to reconnect after 3 seconds
        setTimeout(() => {
          if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
            console.log("🔄 Attempting to reconnect EventSource...");
            startFingerprintScanning();
          }
        }, 3000);
      } else {
        console.log("⚠️ EventSource error state:", eventSource.readyState);
        setScanError("Connection to fingerprint scanner lost. Please check if the device is connected.");
        setIsListening(false);
      }
    };
  };

  const handleFingerprintDetected = async (fingerprintId) => {
    const fid = Number(fingerprintId);
    if (!Number.isFinite(fid)) {
      setScanError("Invalid fingerprint ID received from scanner");
      setTimeout(() => {
        setScanError("");
        setScanStatus("Waiting for fingerprint scan...");
      }, 3000);
      return;
    }

    setScanLoading(true);
    setScanStatus(`Processing fingerprint ID: ${fid}...`);
    setScanError("");
    setNotification(null);

    try {
      const response = await fetch(`${API_BASE_URL}/attendance/record`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fingerprintId: fid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to record attendance");
      }

      if (data.success) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedTime = now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });

        setLastScan({
          type: data.type,
          timestamp: data.timestamp,
          employee: data.employee,
          message: data.message,
        });
        
        // Show success notification with all details
        setNotification({
          type: "success",
          message: `✅ ${data.type} Successful!`,
          details: {
            employeeName: data.employee?.name || "Unknown",
            date: formattedDate,
            time: formattedTime,
            type: data.type,
            message: data.message,
          },
        });

        setScanStatus(`${data.type} recorded successfully for ${data.employee?.name || "Employee"}`);
        
        // Clear notification after 10 seconds
        setTimeout(() => {
          setNotification(null);
          setScanStatus("Ready - Place your finger on the scanner now");
        }, 10000);
      } else {
        throw new Error(data.message || "Failed to record attendance");
      }
    } catch (err) {
      setScanError(err.message || "An error occurred while recording attendance");
      setScanStatus("");
      setNotification({
        type: "error",
        message: `❌ ${err.message || "Failed to record attendance"}`,
      });
      setTimeout(() => {
        setScanError("");
        setScanStatus("Ready - Place your finger on the scanner now");
        setNotification(null);
      }, 5000);
    } finally {
      setScanLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    };
  };

  return (
    <div className="login-container">
      <div className="login-layout">
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
      </div>

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

      {/* Notification Toast */}
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          <div className="notification-content">
            <div className="notification-header">
              <span className="notification-icon">
                {notification.type === "success" ? "✅" : "❌"}
              </span>
              <h3 className="notification-title">{notification.message}</h3>
            </div>
            {notification.details && (
              <div className="notification-details">
                <div className="notification-detail-item">
                  <strong>Employee:</strong> {notification.details.employeeName}
                </div>
                <div className="notification-detail-item">
                  <strong>Date:</strong> {notification.details.date}
                </div>
                <div className="notification-detail-item">
                  <strong>Time:</strong> {notification.details.time}
                </div>
                <div className="notification-detail-item">
                  <strong>Type:</strong>{" "}
                  <span
                    className={`type-badge ${
                      notification.details.type === "Time In"
                        ? "time-in"
                        : "time-out"
                    }`}
                  >
                    {notification.details.type}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Time In/Out Section */}
        <div className="time-in-out-card">
          <div className="time-in-out-header">
            <h2 className="time-in-out-title">Time In / Time Out</h2>
            <p className="time-in-out-subtitle">Automatic fingerprint capture</p>
          </div>

          {/* Scanner Status Display */}
          <div className="scanner-status-container">
            {scanLoading && (
              <div className="scanner-loading">
                <div className="spinner"></div>
                <p className="scanner-status-text">Processing fingerprint...</p>
              </div>
            )}
            {!scanLoading && scanStatus && (
              <div className={`status-message ${scanError ? "error" : "success"}`}>
                {scanStatus}
              </div>
            )}
            {scanError && !scanLoading && (
              <div className="status-message error">{scanError}</div>
            )}
            {!scanLoading && !scanStatus && !scanError && (
              <div className="scanner-ready">
                <svg
                  className="scanner-icon scanning"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="scanner-status-text">Ready for fingerprint scan</p>
              </div>
            )}
          </div>

          <div className="attendance-display">
            {(() => {
              const timeData = formatTime(lastScan?.timestamp || currentDateTime.toISOString());
              return (
                <>
                  {lastScan && lastScan.employee ? (
                    <div className="success-record-display">
                      <div className="success-record-header">
                        <span className="success-icon-large">✅</span>
                        <h3 className="success-record-title">Attendance Recorded</h3>
                      </div>
                      <div className="success-record-details">
                        <div className="success-record-item">
                          <strong>Employee:</strong> {lastScan.employee.name}
                        </div>
                        <div className="success-record-item">
                          <strong>Date:</strong> {timeData.date}
                        </div>
                        <div className="success-record-item">
                          <strong>Time:</strong> {timeData.time}
                        </div>
                        <div className="success-record-item">
                          <strong>Type:</strong> <span className={`type-badge-inline ${lastScan.type === "Time In" ? "time-in" : "time-out"}`}>{lastScan.type}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="time-date-display">
                      <div className="time-date-header">
                        <h3 className="time-date-title">Current Time</h3>
                      </div>
                      <div className="time-date-details">
                        <div className="time-date-item">
                          <strong>Date:</strong> {timeData.date}
                        </div>
                        <div className="time-date-item">
                          <strong>Time:</strong> {timeData.time}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

        </div>
      </div>
    </div>
  );
}
