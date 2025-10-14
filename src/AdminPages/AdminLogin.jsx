import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminlogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
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

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone number validation function
  const validatePhone = (phone) => {
    // Remove all non-digit characters for validation
    const cleanPhone = phone.replace(/\D/g, '');
    // Check if it's a valid phone number (10-15 digits)
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  };

  // Check if input is email or phone
  const isEmail = (input) => {
    return input.includes('@');
  };

  // Generate 6-digit verification code
  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Handle verification code submission
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

    // Check if code has already been used
    if (codeUsed) {
      setVerificationError("This verification code has already been used. Please request a new one.");
      return;
    }

    if (verificationCode !== generatedCode) {
      setVerificationError("Invalid verification code. Please try again.");
      return;
    }

    // Mark code as used to prevent reuse
    setCodeUsed(true);

    // Verification successful - redirect to admin dashboard
    setShowVerification(false);
    setShowForgotPassword(false);
    setForgotContact("");
    setVerificationCode("");
    setVerificationError("");
    setGeneratedCode("");
    setCodeUsed(false);
    
    // Auto-login the user (simulate successful verification)
    navigate("/admin/dashboard");
  };

  // Handle forgot password form submission
  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    // Validation checks
    if (!forgotContact.trim()) {
      setForgotError("Please enter your email address or phone number.");
      return;
    }

    // Determine if input is email or phone and validate accordingly
    if (isEmail(forgotContact)) {
      if (!validateEmail(forgotContact)) {
        setForgotError("Please enter a valid email address.");
        return;
      }
      
      // Check if email matches admin email
      if (forgotContact.toLowerCase() !== "admin@tatayilio.com") {
        setForgotError("No account found with this email address.");
        return;
      }
    } else {
      if (!validatePhone(forgotContact)) {
        setForgotError("Please enter a valid phone number (10-15 digits).");
        return;
      }
      
      // Check if phone matches admin phone (simulating a valid phone)
      const validPhone = "09123456789"; // Example admin phone
      const cleanInputPhone = forgotContact.replace(/\D/g, '');
      const cleanValidPhone = validPhone.replace(/\D/g, '');
      
      if (cleanInputPhone !== cleanValidPhone) {
        setForgotError("No account found with this phone number.");
        return;
      }
    }

    // Generate verification code
    const code = generateVerificationCode();
    setGeneratedCode(code);
    setCodeUsed(false); // Reset code usage status for new code
    
    // Show verification code in console for testing (in real app, this would be sent via SMS/email)
    console.log(`Verification code for ${forgotContact}: ${code}`);
    
    // Show verification form
    setShowVerification(true);
    setShowForgotPassword(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validEmail = "admin@tatayilio.com";
    const validPassword = "admin123";
    if (email.trim().toLowerCase() === validEmail && password === validPassword) {
      setError("");
      navigate("/admin/dashboard");
    } else {
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="admin-login-wrap">
      <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
        ←
      </button>

      <div className="admin-login-layout">
        <div className="brand-side">
          <img src="tata_Ilio_logo-removebg-preview.png" alt="Company Logo" className="brand-logo" />
        </div>

        <div className="form-card">
          <div className="form-title">Manager/Admin Login</div>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="admin@tatayilio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <div className="forgot-row">
              <button type="button" className="link-btn" onClick={() => setShowForgotPassword(true)}>Forgot password?</button>
            </div>

            {error && (
              <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 10 }}>{error}</div>
            )}

            <button type="submit" className="signin-btn">Sign in</button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
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

      {/* Verification Code Modal */}
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
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                  }}
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


