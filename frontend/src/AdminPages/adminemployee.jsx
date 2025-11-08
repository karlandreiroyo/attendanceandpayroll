import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../AdminPages/admincss/adminEmployee.css";
import { API_BASE_URL } from "../config/api";
import { handleLogout as logout } from "../utils/logout";
import { notifyProfileUpdated, getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";

export default function AdminEmployee() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [openActionsId, setOpenActionsId] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewEmployee, setViewEmployee] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editDept, setEditDept] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    dept: '',
    position: '',
    status: 'Active',
    role: 'employee',
    username: '',
    password: '',
    confirm_password: ''
  });

  const [rows, setRows] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileSession, setProfileSession] = useState(() => getSessionUserProfile());

  // Departments that allow admin role
  const adminAllowedDepartments = useMemo(() => ['HR', 'Management', 'Accounting', 'Branch'], []);

  const formatPhoneDisplay = (value) => {
    if (!value && value !== 0) return '';
    const numbersOnly = String(value).replace(/\D/g, '');
    if (!numbersOnly) return '';
    let digits = numbersOnly;
    if (digits.startsWith('63')) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    return '+63' + digits.slice(0, 10);
  };

  // Department -> Positions mapping based on provided positions list
  const defaultDepartmentPositions = useMemo(() => ({
    HR: [
      'HR Manager',
    ],
    Management: [
      'Company Secretary',
      'Area Manager',
      'Branch Manager',
    ],
    Accounting: [
      'Accounting Manager',
    ],
    Kitchen: [
      'Kitchen Manager',
      'Kitchen Staff',
    ],
    Commissary: [
      'Commissary Manager',
      'Commissary Staff',
      'BBQ Commissary OIC',
      'BBQ Commissary Staff',
    ],
    Supplies: [
      'Supplies Manager',
      'Supplies Staff',
    ],
    Operations: [
      'Officer In-Charge',
      'Service Crew',
    ],
    Service: [
      'Service Crew',
    ],
    Cashier: [
      'Cashier Staff',
    ],
    BBQ: [
      'BBQ Staff',
    ],
    Billiard: [
      'Billiard Staff',
    ],
    Lemon: [
      'Lemon Staff',
    ],
    Branch: [
      'Branch Manager',
    ],
  }), []);

  const departmentPositions = useMemo(() => {
    const mapping = { ...defaultDepartmentPositions };
    rows.forEach((user) => {
      const dept = user.department;
      if (!dept) return;
      if (!mapping[dept]) {
        mapping[dept] = [];
      }
      const position = user.position;
      if (position && !mapping[dept].includes(position)) {
        mapping[dept] = [...mapping[dept], position];
      }
    });
    return mapping;
  }, [rows, defaultDepartmentPositions]);

  const availableDepartments = useMemo(() => Object.keys(departmentPositions).sort(), [departmentPositions]);

  const notifyEmployeesUpdated = () => {
    window.dispatchEvent(new Event('employees-refresh'));
  };

  // Format date uniformly as MM/DD/YYYY
  const formatDate = (dateString) => {
    if (!dateString) {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const year = today.getFullYear();
      return `${month}/${day}/${year}`;
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return dateString;
    }
  };

  const updateUserSessionCache = (user) => {
    if (!user) return;
    if (user.user_id || user.id) sessionStorage.setItem('userId', String(user.user_id ?? user.id));
    if (user.username) sessionStorage.setItem('username', user.username);
    if (user.first_name) sessionStorage.setItem('firstName', user.first_name);
    else sessionStorage.removeItem('firstName');

    if (user.last_name) sessionStorage.setItem('lastName', user.last_name);
    else sessionStorage.removeItem('lastName');

    if (user.email) sessionStorage.setItem('email', user.email);
    else sessionStorage.removeItem('email');

    if (user.profile_picture) sessionStorage.setItem('profilePicture', user.profile_picture);
    else sessionStorage.removeItem('profilePicture');

    if (user.department) sessionStorage.setItem('department', user.department);
    else sessionStorage.removeItem('department');

    if (user.position) sessionStorage.setItem('position', user.position);
    else sessionStorage.removeItem('position');

    notifyProfileUpdated();
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileSession);
    return unsubscribe;
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
  };

  async function loadCurrentUser() {
    try {
      const username = sessionStorage.getItem("username");
      if (!username) return;

      const res = await fetch(`${API_BASE_URL}/users?username=${username}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const users = await res.json();
      const user = Array.isArray(users) ? users.find(u => u.username === username) : users;
      if (user) {
        setCurrentUser(user);
        updateUserSessionCache(user);
      }
    } catch (err) {
      console.error("Failed to load current user:", err);
    }
  }

  const getInitials = () => profileSession.initials;

  useEffect(() => {
    let aborted = false;
    async function loadEmployees() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/users`, { credentials: "include" });
        if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
        const users = await res.json();
        if (aborted) return;
        const mapped = (users || []).map((u) => ({
          id: u.id || u.user_id,
          user_id: u.user_id || u.id,
          name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username,
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          username: u.username,
          role: u.role || 'employee',
          email: u.email,
          phone: formatPhoneDisplay(u.phone),
          address: u.address || '',
          dept: u.department,
          position: u.position,
          status: u.status || "Active",
          joinDate: formatDate(u.join_date),
        }));
        setRows(mapped);
        setOpenActionsId(null); // Reset dropdown state when data loads
      } catch (err) {
        console.error(err);
        setNotification({ type: "error", message: "Failed to load employees" });
        setTimeout(() => setNotification(null), 3000);
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    loadEmployees();
    return () => { aborted = true; };
  }, []);

  const filteredRows = useMemo(() => {
    let filtered = rows;

    const q = query.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(r => `${r.name} ${r.username} ${r.role} ${r.email}`.toLowerCase().includes(q));
    }

    if (deptFilter !== "All Departments") {
      filtered = filtered.filter(r => r.dept === deptFilter);
    }

    if (statusFilter !== "All Status") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    return filtered;
  }, [rows, query, deptFilter, statusFilter]);

  function openEdit(row) {
    setSelected(row);
    setEditDept(row.dept || '');
    setEditPosition(row.position || '');
    setEditFirstName(row.first_name || '');
    setEditLastName(row.last_name || '');
    setEditPhone(formatPhoneDisplay(row.phone));
    setEditAddress(row.address || '');
    setEditEmail(row.email || '');
    setEditStatus(row.status || 'Active');
    setEditFormErrors({});
    setIsEditOpen(true);
  }

  function openView(row) {
    setViewEmployee(row);
    setIsViewOpen(true);
  }

  function validateEditForm() {
    const errors = {};
    
    const firstNameError = validateFirstName(editFirstName);
    if (firstNameError) errors.first_name = firstNameError;
    
    const lastNameError = validateLastName(editLastName);
    if (lastNameError) errors.last_name = lastNameError;
    
    const emailError = validateEmail(editEmail);
    if (emailError) errors.email = emailError;
    
    const phoneError = validatePhone(editPhone);
    if (phoneError) errors.phone = phoneError;
    
    if (!editDept) errors.dept = "Department is required";
    if (!editPosition) errors.position = "Position is required";
    
    return errors;
  }

  async function handleUpdate(e) {
    e.preventDefault();

    const errors = validateEditForm();
    setEditFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      console.log('Validation errors:', errors);
      return;
    }

    const body = {
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim() || '',
      department: editDept || '',
      position: editPosition || '',
      status: editStatus,
      address: editAddress.trim() || '',
    };

    const userId = selected?.user_id || selected?.id;
    if (!userId) {
      setNotification({ type: 'error', message: 'Employee ID is missing' });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    try {
      console.log('Updating employee:', userId, body);
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errText = await res.text();
        console.error('Update failed:', res.status, errText);
        throw new Error(errText || `Failed to update employee (${res.status})`);
      }
      
      const updatedFromServer = await res.json();
      console.log('Update successful:', updatedFromServer);
      
      const updatedRow = {
        id: updatedFromServer.id || updatedFromServer.user_id,
        user_id: updatedFromServer.user_id || updatedFromServer.id,
        name: [updatedFromServer.first_name, updatedFromServer.last_name].filter(Boolean).join(' ') || updatedFromServer.username,
        first_name: updatedFromServer.first_name || '',
        last_name: updatedFromServer.last_name || '',
        username: updatedFromServer.username,
        phone: formatPhoneDisplay(updatedFromServer.phone),
        address: updatedFromServer.address || '',
        role: updatedFromServer.role || 'employee',
        email: updatedFromServer.email,
        dept: updatedFromServer.department,
        position: updatedFromServer.position,
        status: updatedFromServer.status || 'Active',
        joinDate: formatDate(updatedFromServer.join_date),
      };
      
      setRows(prev => prev.map(r => (r.user_id === updatedRow.user_id || r.id === updatedRow.id ? updatedRow : r)));
      notifyEmployeesUpdated();
      setIsEditOpen(false);
      setSelected(null);
      setEditDept('');
      setEditPosition('');
      setEditFirstName('');
      setEditLastName('');
      setEditPhone('');
      setEditAddress('');
      setEditEmail('');
      setEditStatus('Active');
      setEditFormErrors({});
      setOpenActionsId(null);
      setNotification({ type: 'success', message: 'Employee updated successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Update error:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to update employee' });
      setTimeout(() => setNotification(null), 4000);
    }
  }

  // Live validation functions
  const validateFirstName = (value) => {
    if (!value.trim()) return "First name is required";
    if (value.trim().length < 2) return "First name must be at least 2 letters";
    if (!/^[a-zA-Z\s]+$/.test(value.trim())) return "First name can only contain letters";
    return null;
  };

  const validateLastName = (value) => {
    if (!value.trim()) return "Last name is required";
    if (value.trim().length < 2) return "Last name must be at least 2 letters";
    if (!/^[a-zA-Z\s]+$/.test(value.trim())) return "Last name can only contain letters";
    return null;
  };

  const validateEmail = (value) => {
    if (!value.trim()) return "Email is required";
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value.trim())) return "Invalid email format";
    const localPart = value.split('@')[0];
    if (localPart.length < 2) return "Email must have at least 2 characters before @";
    return null;
  };

  const validatePhone = (value) => {
    if (!value) return null; // Phone is optional
    const normalized = typeof value === 'string' ? value.trim() : String(value).trim();
    if (!normalized) return null;
    const phoneRegex = /^\+63\d{10}$/;
    if (!phoneRegex.test(normalized)) return "Phone must start with +63 followed by 10 digits";
    return null;
  };

  const validateUsername = (value) => {
    if (!value.trim()) return "Username is required";
    if (value.trim().length < 3) return "Username must be at least 3 characters";
    if (/\s/.test(value)) return "Username cannot contain spaces";
    return null;
  };

  const validatePassword = (value) => {
    if (!value) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters";
    if (!/[0-9]/.test(value)) return "Password must contain at least 1 number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Password must contain at least 1 special character";
    if (!/[A-Z]/.test(value)) return "Password must contain at least 1 capital letter";
    if (/\s/.test(value)) return "Password cannot contain spaces";
    return null;
  };

  const validateConfirmPassword = (value) => {
    if (!value) return "Confirm password is required";
    if (value !== formData.password) return "Passwords do not match";
    return null;
  };

  const handleInputChange = (field, value) => {
    let processedValue = value;
    
    // Auto-capitalize first letter for names and remove numbers/special characters
    if (field === 'first_name' || field === 'last_name') {
      // Remove all non-letter characters (keep only letters and spaces)
      processedValue = value.replace(/[^a-zA-Z\s]/g, '');
      // Auto-capitalize first letter
      if (processedValue.length > 0) {
        processedValue = processedValue.charAt(0).toUpperCase() + processedValue.slice(1);
      }
    }
    
    // Auto-add +63 prefix for phone and only allow numbers
    if (field === 'phone') {
      processedValue = formatPhoneDisplay(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Live validation
    const errors = { ...formErrors };
    let error = null;
    
    switch (field) {
      case 'first_name':
        error = validateFirstName(processedValue);
        break;
      case 'last_name':
        error = validateLastName(processedValue);
        break;
      case 'email':
        error = validateEmail(processedValue);
        break;
      case 'phone':
        error = validatePhone(processedValue);
        break;
      case 'username':
        error = validateUsername(processedValue);
        break;
      case 'password':
        error = validatePassword(processedValue);
        // Also validate confirm password if it exists
        if (formData.confirm_password) {
          errors.confirm_password = validateConfirmPassword(formData.confirm_password);
        }
        break;
      case 'confirm_password':
        error = validateConfirmPassword(processedValue);
        break;
    }
    
    if (error) {
      errors[field] = error;
    } else {
      delete errors[field];
    }
    
    setFormErrors(errors);
  };

  const handleEditInputChange = (field, value) => {
    let processedValue = value;
    
    // Auto-capitalize first letter for names and remove numbers/special characters
    if (field === 'first_name' || field === 'last_name') {
      // Remove all non-letter characters (keep only letters and spaces)
      processedValue = value.replace(/[^a-zA-Z\s]/g, '');
      // Auto-capitalize first letter
      if (processedValue.length > 0) {
        processedValue = processedValue.charAt(0).toUpperCase() + processedValue.slice(1);
      }
    }
    
    // Auto-add +63 prefix for phone and only allow numbers
    if (field === 'phone') {
      processedValue = formatPhoneDisplay(value);
    }
    
    // Update the appropriate state
    switch (field) {
      case 'first_name':
        setEditFirstName(processedValue);
        setEditFormErrors(prev => {
          const errors = { ...prev };
          const err = validateFirstName(processedValue);
          if (err) errors.first_name = err; else delete errors.first_name;
          return errors;
        });
        break;
      case 'last_name':
        setEditLastName(processedValue);
        setEditFormErrors(prev => {
          const errors = { ...prev };
          const err = validateLastName(processedValue);
          if (err) errors.last_name = err; else delete errors.last_name;
          return errors;
        });
        break;
      case 'email':
        setEditEmail(processedValue);
        setEditFormErrors(prev => {
          const errors = { ...prev };
          const err = validateEmail(processedValue);
          if (err) errors.email = err; else delete errors.email;
          return errors;
        });
        break;
      case 'phone':
        setEditPhone(processedValue);
        setEditFormErrors(prev => {
          const errors = { ...prev };
          const err = validatePhone(processedValue);
          if (err) errors.phone = err; else delete errors.phone;
          return errors;
        });
        break;
      case 'address':
        setEditAddress(processedValue);
        break;
      default:
        break;
    }
  };

  function validateAddForm() {
    const errors = {};
    const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    
    const firstNameError = validateFirstName(formData.first_name);
    if (firstNameError) errors.first_name = firstNameError;
    
    const lastNameError = validateLastName(formData.last_name);
    if (lastNameError) errors.last_name = lastNameError;
    
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
    
    const phoneError = validatePhone(formData.phone);
    if (phoneError) errors.phone = phoneError;
    
    if (!formData.dept) errors.dept = "Department is required";
    if (!formData.position) errors.position = "Position is required";
    if (!formData.status) errors.status = "Status is required";
    
    const usernameError = validateUsername(formData.username);
    if (usernameError) errors.username = usernameError;
    // Duplicate username check (case-insensitive)
    const desiredUsername = normalize(formData.username);
    const usernameExists = rows.some(r => normalize(r.username) === desiredUsername);
    if (!errors.username && desiredUsername && usernameExists) {
      errors.username = 'Username already exists';
    }
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;
    
    const confirmPasswordError = validateConfirmPassword(formData.confirm_password);
    if (confirmPasswordError) errors.confirm_password = confirmPasswordError;
    
    // Duplicate name check (first_name + last_name, case-insensitive)
    const desiredFullName = normalize(`${formData.first_name} ${formData.last_name}`);
    const nameExists = rows.some(r => normalize(r.name) === desiredFullName);
    if (desiredFullName && nameExists) {
      errors.first_name = errors.first_name || 'An account with this name already exists';
      errors.last_name = errors.last_name || 'An account with this name already exists';
    }
    
    return errors;
  }

  async function handleAdd(e) {
    e.preventDefault();

    const errors = validateAddForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      username: formData.username,
      password: formData.password,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      department: formData.dept,
      position: formData.position,
      status: formData.status || "Active",
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      role: formData.role === 'user/employee' ? 'employee' : formData.role,
    };

    try {
      setSubmitLoading(true);
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to add employee (${res.status})`);
      }
      const created = await res.json();
      const newRow = {
        id: created.id || created.user_id,
        user_id: created.user_id || created.id,
        name: [created.first_name, created.last_name].filter(Boolean).join(" ") || created.username,
        first_name: created.first_name || '',
        last_name: created.last_name || '',
        username: created.username,
        role: created.role || 'employee',
        email: created.email,
        phone: formatPhoneDisplay(created.phone),
        address: created.address || '',
        dept: created.department,
        position: created.position,
        status: created.status || "Active",
        joinDate: formatDate(created.join_date),
      };
      setRows(prev => [...prev, newRow]);
      notifyEmployeesUpdated();
      setIsAddOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        dept: '',
        position: '',
        status: 'Active',
        role: 'employee',
        username: '',
        password: '',
        confirm_password: ''
      });
      setFormErrors({});
      setShowPassword(false);
      setShowConfirmPassword(false);
      setOpenActionsId(null); // Reset dropdown state after adding
      setNotification({ type: 'success', message: `Employee "${newRow.name}" has been added successfully!` });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: err.message || 'Failed to add employee' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setSubmitLoading(false);
    }
  }

  function toggleEmployeeStatus(id) {
    setRows(prev => prev.map(r => 
      r.id === id ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" } : r
    ));
  }

  function openDeleteConfirmation(employee) {
    const currentId = currentUser?.user_id || currentUser?.id;
    const currentUsername = currentUser?.username;
    if (
      (currentId && (employee.user_id === currentId || employee.id === currentId)) ||
      (currentUsername && employee.username === currentUsername)
    ) {
      setNotification({ type: 'error', message: "You cannot delete your own account while you're logged in." });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    setEmployeeToDelete(employee);
    setIsDeleteOpen(true);
  }

  function closeDeleteConfirmation() {
    setIsDeleteOpen(false);
    setEmployeeToDelete(null);
  }

  async function confirmDelete() {
    if (!employeeToDelete) return;
    
    const id = employeeToDelete.user_id || employeeToDelete.id;
    
    try {
      setDeleteLoading(true);
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to delete employee (${res.status})`);
      }
      
      setRows(prev => prev.filter(x => (x.user_id || x.id) !== id));
      notifyEmployeesUpdated();
      setIsDeleteOpen(false);
      setEmployeeToDelete(null);
      setNotification({ type: 'success', message: `Employee "${employeeToDelete.name}" has been deleted successfully` });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: err.message || 'Failed to delete employee' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setDeleteLoading(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (openActionsId && !event.target.closest('.actions-dropdown')) {
        setOpenActionsId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openActionsId]);

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar${isSidebarOpen ? " open" : ""}`}>
        <div className="brand">
          <div className="brand-avatar">TI</div>
          <div className="brand-name">Tatay Ilio</div>
        </div>
        <nav className="nav">
          <Link className={`nav-item${isActive('/admin/dashboard') ? ' active' : ''}`} to="/admin/dashboard">Dashboard</Link>
          <Link className={`nav-item${isActive('/admin/employee') ? ' active' : ''}`} to="/admin/employee">Employees</Link>
          <Link className={`nav-item${isActive('/admin/schedules') ? ' active' : ''}`} to="/admin/schedules">Schedules</Link>
          <Link className={`nav-item${isActive('/admin/attendance') ? ' active' : ''}`} to="/admin/attendance">Attendance</Link>
          <Link className={`nav-item${isActive('/admin/leave-requests') ? ' active' : ''}`} to="/admin/leave-requests">Leave Requests</Link>
          <Link className={`nav-item${isActive('/admin/overtime') ? ' active' : ''}`} to="/admin/overtime">Overtime</Link>
          <Link className={`nav-item${isActive('/admin/payroll') ? ' active' : ''}`} to="/admin/payroll">Payroll</Link>
          <Link className={`nav-item${isActive('/admin/reports') ? ' active' : ''}`} to="/admin/reports">Reports</Link>
        </nav>
      </aside>
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

      <main className="admin-content">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="mobile-nav-toggle"
              type="button"
              aria-label="Toggle navigation"
              onClick={() => setIsSidebarOpen((open) => !open)}
            >
              ☰
            </button>
            <h1>Employees</h1>
          </div>
          <div className="top-actions">
            <button className="profile-btn" onClick={() => setIsProfileOpen(v => !v)}>
              <span className="profile-avatar">
                {(profileSession.profilePicture) ? (
                  <img 
                    src={profileSession.profilePicture} 
                    alt="Profile" 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  getInitials()
                )}
              </span>
              <span>{profileSession.displayName}</span>
            </button>
            <div className={`profile-popover${isProfileOpen ? " open" : ""}`}>
              <div className="profile-row" onClick={() => { setIsProfileOpen(false); navigate('/admin/profile'); }}>Profile</div>
              <div className="profile-row" onClick={handleLogout}>Log out</div>
            </div>
          </div>
        </header>

        <section className="employee-card">
          <div className="employee-card__header">
            <input
              className="employee-search"
              placeholder="Search employees..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <div className="header-actions">
              <button className="btn outline" onClick={() => setFilterOpen(v => !v)}>Filter</button>
              <button className="btn primary" onClick={() => setIsAddOpen(true)} disabled={loading}>Add Employee</button>
            </div>
          </div>

          {filterOpen && (
            <div className="filters">
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option>All Departments</option>
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          )}

          <div className="table">
            <div className="thead">
              <div>Full Name</div>
              <div className="username-header">Username</div>
              <div className="center">Role</div>
              <div className="center">Status</div>
              <div className="right">Join Date</div>
              <div className="actions-header right"></div>
            </div>
            <div className="tbody">
              {loading ? (
                <div className="tr"><div>Loading...</div></div>
              ) : (
                filteredRows.map(r => (
                  <div key={r.id} className="tr">
                    <div className="emp-cell" data-title="Full Name">
                      <div className="emp">
                        <div className="emp-avatar">{r.name?.[0]}</div>
                        <div className="emp-meta">
                          <div className="emp-name">{r.name}</div>
                          <div className="emp-email">{r.email}</div>
                        </div>
                      </div>
                    </div>
                    <div className="username-cell" data-title="Username">{r.username}</div>
                    <div className="center" data-title="Role">
                      <span className={`role-badge ${r.role === 'admin' ? 'admin' : 'employee'}`}>
                        {r.role === 'admin' ? 'Admin' : 'Employee'}
                      </span>
                    </div>
                    <div className="center" data-title="Status">
                      <span className={`status ${r.status === 'Inactive' ? 'danger' : 'success'}`}>{r.status}</span>
                    </div>
                    <div className="right" data-title="Join Date">{r.joinDate}</div>
                    <div className="right action-cell" data-title="Actions">
                      <div className="actions-dropdown">
                        <button 
                          className="actions-btn" 
                          onClick={() => openView(r)}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {isEditOpen && selected && (
          <div className="modal" role="dialog">
            <div className="modal-body view-modal">
              <div className="modal-header">
                <div className="modal-title">Edit Employee</div>
                <button className="icon-btn" onClick={() => setIsEditOpen(false)}>✖</button>
              </div>
              
              <div className="employee-details">
                <div className="employee-header">
                  <div className="employee-avatar-large">
                    {selected.name?.[0]}
                  </div>
                  <div className="employee-info">
                    <h2 className="employee-name">{selected.name}</h2>
                    <p className="employee-position">{selected.position}</p>
                    <span className={`status-badge ${selected.status.toLowerCase()}`}>
                      {selected.status}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleUpdate} className="details-grid">
                  {/* === PERSONAL INFORMATION === */}
                  <div className="detail-section">
                    <h3>Personal Information</h3>

                    <div className="detail-row two">
                      <div className="detail-item">
                        <span className="detail-label">First Name</span>
                        <input 
                          name="first_name" 
                          value={editFirstName}
                          onChange={(e) => handleEditInputChange('first_name', e.target.value)}
                          className={`detail-input ${editFormErrors.first_name ? 'error' : ''}`}
                          required 
                        />
                        {editFormErrors.first_name && <div className="field-error">{editFormErrors.first_name}</div>}
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Last Name</span>
                        <input 
                          name="last_name" 
                          value={editLastName}
                          onChange={(e) => handleEditInputChange('last_name', e.target.value)}
                          className={`detail-input ${editFormErrors.last_name ? 'error' : ''}`}
                          required 
                        />
                        {editFormErrors.last_name && <div className="field-error">{editFormErrors.last_name}</div>}
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Email Address</span>
                      <input 
                        type="email" 
                        name="email" 
                        value={editEmail}
                        onChange={(e) => handleEditInputChange('email', e.target.value)}
                        className={`detail-input ${editFormErrors.email ? 'error' : ''}`}
                        required 
                      />
                      {editFormErrors.email && <div className="field-error">{editFormErrors.email}</div>}
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Phone</span>
                      <input 
                        type="text"
                        name="phone" 
                        value={editPhone}
                        onChange={(e) => handleEditInputChange('phone', e.target.value)}
                        placeholder="+63XXXXXXXXXX"
                        className={`detail-input ${editFormErrors.phone ? 'error' : ''}`}
                      />
                      {editFormErrors.phone && <div className="field-error">{editFormErrors.phone}</div>}
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Address</span>
                      <input
                        type="text"
                        name="address"
                        value={editAddress}
                        onChange={(e) => handleEditInputChange('address', e.target.value)}
                        placeholder="Enter address"
                        className="detail-input"
                        required
                      />
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Employee ID</span>
                      <span className="detail-value">
                        EMP{String(selected.user_id || selected.id).padStart(3, '0')}
                      </span>
                    </div>
                  </div>

                  {/* === WORK INFORMATION === */}
                  <div className="detail-section">
                    <h3>Work Information</h3>

                    <div className="detail-item">
                      <span className="detail-label">Department</span>
                      <select
                        name="dept"
                        className={`detail-select ${editFormErrors.dept ? 'error' : ''}`}
                        value={editDept}
                        onChange={(e) => {
                          setEditDept(e.target.value);
                          setEditPosition('');
                          const errors = { ...editFormErrors };
                          if (e.target.value) {
                            delete errors.dept;
                          } else {
                            errors.dept = "Department is required";
                          }
                          delete errors.position; // Clear position error when department changes
                          setEditFormErrors(errors);
                        }}
                        required
                      >
                        <option value="">Select Department</option>
                        {availableDepartments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      {editFormErrors.dept && <div className="field-error">{editFormErrors.dept}</div>}
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Position</span>
                      <select
                        name="position"
                        className={`detail-select ${editFormErrors.position ? 'error' : ''}`}
                        value={editPosition}
                        onChange={(e) => {
                          setEditPosition(e.target.value);
                          const errors = { ...editFormErrors };
                          if (e.target.value) {
                            delete errors.position;
                          } else {
                            errors.position = "Position is required";
                          }
                          setEditFormErrors(errors);
                        }}
                        required
                        disabled={!editDept}
                      >
                        <option value="">{editDept ? 'Select Position' : 'Select a department first'}</option>
                        {(departmentPositions[editDept] || (editPosition ? [editPosition] : [])).map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                      {editFormErrors.position && <div className="field-error">{editFormErrors.position}</div>}
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <select 
                        name="status" 
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="detail-select" 
                        required
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Join Date</span>
                      <span className="detail-value">{selected.joinDate}</span>
                    </div>
                  </div>

                  {/* === ACTIONS === */}
                  <div className="modal-actions">
                    <button type="button" className="btn" onClick={() => setIsEditOpen(false)}>Cancel</button>
                    <button className="btn primary" type="submit">Update Employee</button>
                  </div>  
                </form>
              </div>
            </div>
          </div>
        )}


        {isAddOpen && (
          <div className="modal" role="dialog">
            <div className="modal-body view-modal add-employee-modal">
              <div className="modal-header">
                <div className="modal-title">Add Employee</div>
                <button className="icon-btn" onClick={() => setIsAddOpen(false)}>✖</button>
              </div>
              
              <div className="employee-details">

                <form onSubmit={handleAdd} className="details-grid" autoComplete="off">
                  <div className="detail-section">
                    <h3>Personal Information</h3>
                    <div className="detail-row two">
                      <div className="detail-item">
                        <span className="detail-label">First Name</span>
                        <input 
                          name="first_name" 
                          placeholder="Enter first name" 
                          className={`detail-input ${formErrors.first_name ? 'error' : ''}`}
                          value={formData.first_name}
                          onChange={(e) => handleInputChange('first_name', e.target.value)}
                          required 
                        />
                        {formErrors.first_name && <div className="field-error">{formErrors.first_name}</div>}
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Last Name</span>
                        <input 
                          name="last_name" 
                          placeholder="Enter last name" 
                          className={`detail-input ${formErrors.last_name ? 'error' : ''}`}
                          value={formData.last_name}
                          onChange={(e) => handleInputChange('last_name', e.target.value)}
                          required 
                        />
                        {formErrors.last_name && <div className="field-error">{formErrors.last_name}</div>}
                      </div>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email Address</span>
                      <input 
                        type="email" 
                        name="email" 
                        placeholder="Enter email address" 
                        className={`detail-input ${formErrors.email ? 'error' : ''}`}
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required 
                      />
                      {formErrors.email && <div className="field-error">{formErrors.email}</div>}
                    </div>
                    <div className="detail-row two">
                      <div className="detail-item">
                        <span className="detail-label">Phone </span>
                        <input 
                          name="phone" 
                          placeholder="+63XXXXXXXXXX" 
                          className={`detail-input ${formErrors.phone ? 'error' : ''}`}
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                        {formErrors.phone && <div className="field-error">{formErrors.phone}</div>}
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Address </span>
                        <input 
                          name="address" 
                          placeholder="Enter address" 
                          className="detail-input"
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Work Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Department</span>
                      <select 
                        name="dept" 
                        className={`detail-select ${formErrors.dept ? 'error' : ''}`}
                        value={formData.dept}
                        onChange={(e) => {
                          const nextDept = e.target.value;
                          // Automatically set role to employee if department doesn't allow admin
                          const allowedAdmin = adminAllowedDepartments.includes(nextDept);
                          const newRole = allowedAdmin ? formData.role : 'employee';
                          setFormData(prev => ({ ...prev, dept: nextDept, position: '', role: newRole }));
                          const errors = { ...formErrors };
                          if (nextDept) {
                            delete errors.dept;
                          } else {
                            errors.dept = "Department is required";
                          }
                          // Clear any prior position error when department changes
                          delete errors.position;
                          setFormErrors(errors);
                        }}
                        required
                      >
                        <option value="">Select Department</option>
                        {availableDepartments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      {formErrors.dept && <div className="field-error">{formErrors.dept}</div>}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Position</span>
                      <select 
                        name="position" 
                        className={`detail-select ${formErrors.position ? 'error' : ''}`}
                        value={formData.position}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, position: e.target.value }));
                          const errors = { ...formErrors };
                          if (e.target.value) {
                            delete errors.position;
                          } else {
                            errors.position = "Position is required";
                          }
                          setFormErrors(errors);
                        }}
                        required
                        disabled={!formData.dept}
                      >
                        <option value="">{formData.dept ? 'Select Position' : 'Select a department first'}</option>
                        {(departmentPositions[formData.dept] || (formData.position ? [formData.position] : [])).map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                      {formErrors.position && <div className="field-error">{formErrors.position}</div>}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <select
                        name="status"
                        className={`detail-select ${formErrors.status ? 'error' : ''}`}
                        value={formData.status}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, status: e.target.value }));
                          const errors = { ...formErrors };
                          if (e.target.value) {
                            delete errors.status;
                          } else {
                            errors.status = 'Status is required';
                          }
                          setFormErrors(errors);
                        }}
                        required
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      {formErrors.status && <div className="field-error">{formErrors.status}</div>}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Role</span>
                      <select 
                        name="role" 
                        className="detail-select"
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        required
                        disabled={!formData.dept || !adminAllowedDepartments.includes(formData.dept)}
                      >
                        <option value="employee">User/Employee</option>
                        {formData.dept && adminAllowedDepartments.includes(formData.dept) && (
                          <option value="admin">Admin</option>
                        )}
                      </select>
                      {formData.dept && !adminAllowedDepartments.includes(formData.dept) && (
                        <div className="field-info" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          Admin role is only available for HR, Management, Accounting, and Branch departments
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Account</h3>
                    <div className="detail-item">
                      <span className="detail-label">Username</span>
                      <input 
                        name="username" 
                        placeholder="Choose a username" 
                        className={`detail-input ${formErrors.username ? 'error' : ''}`}
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        autoComplete="off"
                        pattern="\S+"
                        title="Spaces are not allowed"
                        required 
                      />
                      {formErrors.username && <div className="field-error">{formErrors.username}</div>}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Password</span>
                      <div className="password-input-container">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          name="password" 
                          placeholder="Create a password" 
                          className={`detail-input ${formErrors.password ? 'error' : ''}`}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          autoComplete="new-password"
                          required 
                        />
                        <button 
                          type="button" 
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                      {formErrors.password && <div className="field-error">{formErrors.password}</div>}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Confirm Password</span>
                      <div className="password-input-container">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          name="confirm_password" 
                          placeholder="Re-enter password" 
                          className={`detail-input ${formErrors.confirm_password ? 'error' : ''}`}
                          value={formData.confirm_password}
                          onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                          autoComplete="new-password"
                          required 
                        />
                        <button 
                          type="button" 
                          className="password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                      {formErrors.confirm_password && <div className="field-error">{formErrors.confirm_password}</div>}
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn" onClick={() => setIsAddOpen(false)} disabled={submitLoading}>Cancel</button>
                    <button className="btn primary" type="submit" disabled={submitLoading}>{submitLoading ? 'Adding...' : 'Add Employee'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {isViewOpen && viewEmployee && (
          <div className="modal" role="dialog">
            <div className="modal-body view-modal">
              <div className="modal-header">
                <div className="modal-title">Employee Details</div>
                <button className="icon-btn" onClick={() => setIsViewOpen(false)}>✖</button>
              </div>
              
              <div className="employee-details">
                <div className="employee-header">
                  <div className="employee-avatar-large">
                    {viewEmployee.name?.[0]}
                  </div>
                  <div className="employee-info">
                    <h2 className="employee-name">{viewEmployee.name}</h2>
                    <p className="employee-position">{viewEmployee.position}</p>
                    <span className={`status-badge ${viewEmployee.status.toLowerCase()}`}>
                      {viewEmployee.status}
                    </span>
                  </div>
                </div>

                <div className="details-grid">
                  <div className="detail-section">
                    <h3>Personal Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Full Name</span>
                      <span className="detail-value">{viewEmployee.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email Address</span>
                      <span className="detail-value">{viewEmployee.email}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Username</span>
                      <span className="detail-value">{viewEmployee.username}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Employee ID</span>
                      <span className="detail-value">EMP{String(viewEmployee.user_id || viewEmployee.id).padStart(3, '0')}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Work Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Department</span>
                      <span className="detail-value">{viewEmployee.dept}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Position</span>
                      <span className="detail-value">{viewEmployee.position}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Join Date</span>
                      <span className="detail-value">{viewEmployee.joinDate}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className="detail-value">
                        <span className={`status-badge ${viewEmployee.status.toLowerCase()}`}>
                          {viewEmployee.status}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Contact Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Email</span>
                      <span className="detail-value">
                        <a href={`mailto:${viewEmployee.email}`} className="email-link">
                          {viewEmployee.email}
                        </a>
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone</span>
                      <span className="detail-value">{viewEmployee.phone || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Address</span>
                      <span className="detail-value">{viewEmployee.address || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn" onClick={() => setIsViewOpen(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={() => { setIsViewOpen(false); openDeleteConfirmation(viewEmployee); }}>Delete</button>
                  <button className="btn primary" onClick={() => { setIsViewOpen(false); openEdit(viewEmployee); }}>Edit</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isDeleteOpen && employeeToDelete && (
          <div className="modal" role="dialog">
            <div className="modal-body delete-confirmation-modal">
              <div className="delete-modal-header">
                <div className="delete-icon">⚠️</div>
                <h2 className="delete-modal-title">Delete Employee</h2>
                <p className="delete-modal-message">
                  Are you sure you want to delete <strong>{employeeToDelete.name}</strong>? This action cannot be undone.
                </p>
              </div>
              <div className="delete-modal-actions">
                <button 
                  className="btn" 
                  onClick={closeDeleteConfirmation}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Employee'}
                </button>
              </div>
            </div>
          </div>
        )}

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
}


