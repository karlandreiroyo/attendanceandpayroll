import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../AdminPages/admincss/adminProfile.css";
import { API_BASE_URL } from "../config/api";
import { notifyProfileUpdated } from "../utils/currentUser";

export default function AdminProfile() {
  const navigate = useNavigate();
  const storedFirstName = sessionStorage.getItem('firstName') || '';
  const storedLastName = sessionStorage.getItem('lastName') || '';
  const storedEmail = sessionStorage.getItem('email') || '';
  const storedUsername = sessionStorage.getItem('username') || '';
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({
    first_name: storedFirstName,
    last_name: storedLastName,
    email: storedEmail,
    username: storedUsername,
    password: '',
    confirm_password: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImagePreview] = useState(null);

  const getDisplayName = () => {
    const firstName = (formData.first_name || '').trim() || currentUser?.first_name || sessionStorage.getItem('firstName') || '';
    const lastName = (formData.last_name || '').trim() || currentUser?.last_name || sessionStorage.getItem('lastName') || '';
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return formData.username || currentUser?.username || sessionStorage.getItem('username') || 'User';
  };

  const sessionKeyMap = {
    first_name: 'firstName',
    last_name: 'lastName',
    email: 'email',
    department: 'department',
    position: 'position',
  };

  const getFieldValue = (field, fallback = 'N/A') => {
    const sessionKey = sessionKeyMap[field];
    const sessionValue = sessionKey ? sessionStorage.getItem(sessionKey) : sessionStorage.getItem(field);
    const value = currentUser?.[field] ?? sessionValue;
    return value || fallback;
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

const updateUserSessionCache = (user) => {
  if (!user) return;

  if (user.username) sessionStorage.setItem('username', user.username);
  if (user.user_id || user.id) sessionStorage.setItem('userId', String(user.user_id ?? user.id));

  if (user.first_name) sessionStorage.setItem('firstName', user.first_name);
  else sessionStorage.removeItem('firstName');

  if (user.last_name) sessionStorage.setItem('lastName', user.last_name);
  else sessionStorage.removeItem('lastName');

  if (user.email) sessionStorage.setItem('email', user.email);
  else sessionStorage.removeItem('email');

  if (user.department) sessionStorage.setItem('department', user.department);
  else sessionStorage.removeItem('department');

  if (user.position) sessionStorage.setItem('position', user.position);
  else sessionStorage.removeItem('position');

  notifyProfileUpdated();
};

  async function loadCurrentUser() {
    try {
      setLoading(true);
      const username = sessionStorage.getItem("username");
      if (!username) {
        navigate("/");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/users?username=${username}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load user");
      const users = await res.json();
      const user = Array.isArray(users) ? users.find(u => u.username === username) : users;
      
      if (user) {
        setCurrentUser(user);
        setFormData(prev => ({
          ...prev,
          first_name: user.first_name || prev.first_name,
          last_name: user.last_name || prev.last_name,
          email: user.email || prev.email,
          username: user.username || '',
        }));
      updateUserSessionCache(user);
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to load profile' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  const validatePassword = (value) => {
    if (!value) return null; // Password is optional for updates
    if (value.length < 6) return "Password must be at least 6 characters";
    if (!/[0-9]/.test(value)) return "Password must contain at least 1 number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Password must contain at least 1 special character";
    if (!/[A-Z]/.test(value)) return "Password must contain at least 1 capital letter";
    if (/\s/.test(value)) return "Password cannot contain spaces";
    return null;
  };

  const validateName = (value, label) => {
    if (!value.trim()) return `${label} is required`;
    if (value.trim().length < 2) return `${label} must be at least 2 characters`;
    return null;
  };

  const validateEmailField = (value) => {
    if (!value.trim()) return "Email is required";
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value.trim())) return "Invalid email format";
    return null;
  };

  const validateConfirmPassword = (value) => {
    if (!formData.password) return null; // Only validate if password is provided
    if (!value) return "Confirm password is required";
    if (value !== formData.password) return "Passwords do not match";
    return null;
  };

  const handleInputChange = (field, value) => {
    let processedValue = value;

    if (field === 'first_name' || field === 'last_name') {
      processedValue = value.replace(/[^a-zA-Z\s]/g, '');
      if (processedValue.length > 0) {
        processedValue = processedValue.charAt(0).toUpperCase() + processedValue.slice(1);
      }
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    const errors = { ...formErrors };
    let error = null;
    
    switch (field) {
      case 'first_name':
        error = validateName(processedValue, 'First name');
        break;
      case 'last_name':
        error = validateName(processedValue, 'Last name');
        break;
      case 'email':
        error = validateEmailField(processedValue);
        break;
      case 'password':
        error = validatePassword(processedValue);
        if (formData.confirm_password) {
          errors.confirm_password = validateConfirmPassword(formData.confirm_password);
        }
        break;
      case 'confirm_password':
        error = validateConfirmPassword(processedValue);
        break;
      default:
        break;
    }
    
    if (error) {
      errors[field] = error;
    } else {
      delete errors[field];
    }
    
    setFormErrors(errors);
  };

  async function handleUpdate(e) {
    e.preventDefault();
    
    const errors = {};
    const firstNameError = validateName(formData.first_name, 'First name');
    if (firstNameError) errors.first_name = firstNameError;

    const lastNameError = validateName(formData.last_name, 'Last name');
    if (lastNameError) errors.last_name = lastNameError;

    const emailError = validateEmailField(formData.email);
    if (emailError) errors.email = emailError;

    if (formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) errors.password = passwordError;
      
      const confirmPasswordError = validateConfirmPassword(formData.confirm_password);
      if (confirmPasswordError) errors.confirm_password = confirmPasswordError;
    }
    
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setUpdating(true);
      const userId = currentUser.id || currentUser.user_id;
      
      // Update username and password
      const updateData = {};
      const currentFirst = currentUser?.first_name || sessionStorage.getItem('firstName') || '';
      const currentLast = currentUser?.last_name || sessionStorage.getItem('lastName') || '';
      const currentEmail = currentUser?.email || sessionStorage.getItem('email') || '';
      const currentUsername = currentUser?.username || sessionStorage.getItem('username') || '';

      if (formData.first_name.trim() !== currentFirst) {
        updateData.first_name = formData.first_name.trim();
      }
      if (formData.last_name.trim() !== currentLast) {
        updateData.last_name = formData.last_name.trim();
      }
      if (formData.email.trim() !== currentEmail) {
        updateData.email = formData.email.trim();
      }
      if (formData.username !== currentUsername) {
        updateData.username = formData.username.trim();
      }
      if (formData.password) {
        updateData.password = formData.password;
      }

      if (Object.keys(updateData).length > 0) {
        const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updateData),
        });
        
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || 'Failed to update profile');
        }

        if (updateData.username) {
          sessionStorage.setItem('username', updateData.username);
        }
        if (updateData.first_name) {
          sessionStorage.setItem('firstName', updateData.first_name);
        }
        if (updateData.last_name) {
          sessionStorage.setItem('lastName', updateData.last_name);
        }
        if (updateData.email) {
          sessionStorage.setItem('email', updateData.email);
        }
        notifyProfileUpdated();
      }

      setNotification({ type: 'success', message: 'Profile updated successfully' });
      setTimeout(() => setNotification(null), 3000);
      
      // Reload user data
      await loadCurrentUser();
      setFormData(prev => ({ ...prev, password: '', confirm_password: '' }));
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: err.message || 'Failed to update profile' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setUpdating(false);
    }
  }

const getInitials = () => {
  const firstName = (formData.first_name || '').trim() || currentUser?.first_name || sessionStorage.getItem('firstName') || '';
  const lastName = (formData.last_name || '').trim() || currentUser?.last_name || sessionStorage.getItem('lastName') || '';
  const username = formData.username || currentUser?.username || sessionStorage.getItem('username') || '';

  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) return firstName[0].toUpperCase();
  if (lastName) return lastName[0].toUpperCase();
  if (username) return username[0].toUpperCase();
  return 'AU';
};

  if (loading) {
    return (
      <div className="admin-layout">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-avatar">TI</div>
          <div className="brand-name">Tatay Ilio</div>
        </div>
        <nav className="nav">
          <Link className="nav-item" to="/admin/dashboard">Dashboard</Link>
          <Link className="nav-item" to="/admin/employee">Employees</Link>
          <Link className="nav-item" to="/admin/schedules">Schedules</Link>
          <Link className="nav-item" to="/admin/attendance">Attendance</Link>
          <Link className="nav-item" to="/admin/overtime">Overtime</Link>
          <Link className="nav-item" to="/admin/payroll">Payroll</Link>
          <Link className="nav-item" to="/admin/reports">Reports</Link>
        </nav>
      </aside>

      <main className="admin-content">
        <header className="admin-topbar">
          <h1>My Profile</h1>
          <div className="top-actions">
            <button className="profile-btn" onClick={() => navigate(-1)}>
              <span className="profile-avatar">
                {getInitials()}
              </span>
              <span>{getDisplayName()}</span>
            </button>
          </div>
        </header>

        <section className="profile-card">
          <form onSubmit={handleUpdate} className="profile-grid">
            <div className="profile-section">
              <h3>Personal Information</h3>
              <div className="profile-row profile-row--split">
                <div className="profile-field profile-field--compact">
                  <span className="profile-label">First Name</span>
                  <input
                    type="text"
                    className={`profile-input ${formErrors.first_name ? 'error' : ''}`}
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    required
                  />
                  {formErrors.first_name && <div className="profile-error">{formErrors.first_name}</div>}
                </div>
                <div className="profile-field profile-field--compact">
                  <span className="profile-label">Last Name</span>
                  <input
                    type="text"
                    className={`profile-input ${formErrors.last_name ? 'error' : ''}`}
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    required
                  />
                  {formErrors.last_name && <div className="profile-error">{formErrors.last_name}</div>}
                </div>
              </div>
              <div className="profile-field">
                <span className="profile-label">Email</span>
                <input
                  type="email"
                  className={`profile-input ${formErrors.email ? 'error' : ''}`}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
                {formErrors.email && <div className="profile-error">{formErrors.email}</div>}
              </div>
              <div className="profile-field">
                <span className="profile-label">Department</span>
                <input
                  type="text"
                  className="profile-input"
                  value={getFieldValue('department', '')}
                  readOnly
                />
              </div>
              <div className="profile-field">
                <span className="profile-label">Position</span>
                <input
                  type="text"
                  className="profile-input"
                  value={getFieldValue('position', '')}
                  readOnly
                />
              </div>
            </div>

            <div className="profile-section">
              <h3>Account Settings</h3>
              <div className="profile-field">
                <span className="profile-label">Username</span>
                <input
                  type="text"
                  className="profile-input"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  required
                />
              </div>
              <div className="profile-field">
                <span className="profile-label">New Password</span>
                <div className="profile-password">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`profile-input ${formErrors.password ? 'error' : ''}`}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="profile-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {formErrors.password && <div className="profile-error">{formErrors.password}</div>}
                <div className="profile-help">
                  Leave blank if you don't want to change your password
                </div>
              </div>
              {formData.password && (
                <div className="profile-field">
                  <span className="profile-label">Confirm New Password</span>
                  <div className="profile-password">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className={`profile-input ${formErrors.confirm_password ? 'error' : ''}`}
                      value={formData.confirm_password}
                      onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="profile-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {formErrors.confirm_password && <div className="profile-error">{formErrors.confirm_password}</div>}
                </div>
              )}
            </div>

            <div className="profile-actions">
              <button type="button" className="btn outline" onClick={() => navigate(-1)} disabled={updating}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={updating}>
                {updating ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </section>

        {notification && (
          <div className={`notification notification-${notification.type}`}>
            <div className="notification-icon">
              {notification.type === 'success' ? '✓' : '✕'}
            </div>
            <div className="notification-content">
              <div className="notification-message">{notification.message}</div>
              <div className="notification-timestamp">{new Date().toLocaleTimeString()}</div>
            </div>
            <button className="notification-close" onClick={() => setNotification(null)}>✖</button>
          </div>
        )}
      </main>
    </div>
  );
};

