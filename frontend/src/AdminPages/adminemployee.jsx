import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../AdminPages/admincss/adminEmployee.css";
import { API_BASE_URL } from "../config/api";
import Papa from 'papaparse';

export default function AdminEmployee() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);
  const [batchAddData, setBatchAddData] = useState([]);
  const [batchAddFileName, setBatchAddFileName] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [openActionsId, setOpenActionsId] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewEmployee, setViewEmployee] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editDept, setEditDept] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editAddress, setEditAddress] = useState('');
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

  const formatJoinDate = (value) => {
    if (!value) return new Date().toISOString().slice(0, 10);
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toISOString().slice(0, 10);
  };

  const handleDownloadCSV = () => {
    const headers = [
      "user_id", "first_name", "last_name", "username", "email", 
      "role", "dept", "position", "status", "joinDate", "address"
    ];

    const csvData = rows.map(row => 
      headers.map(header => {
        let value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        if (/[",\n]/.test(value)) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "employees.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "first_name", "last_name", "email", "phone", "dept", "position", 
      "status", "role", "username", "password", "address"
    ];
    const csvContent = headers.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "employee_template.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBatchFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setBatchAddData([]);
      setBatchAddFileName("");
      return;
    }
    setBatchAddFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setBatchAddData(results.data);
      },
      error: (error) => {
        console.error("Error parsing batch CSV:", error);
        setNotification({ type: 'error', message: 'Failed to parse CSV file for batch add.' });
        setTimeout(() => setNotification(null), 4000);
      }
    });
    event.target.value = null; // Reset file input
  };

  const handleProcessBatchAdd = async () => {
    if (batchAddData.length === 0) {
      setNotification({ type: 'error', message: 'No employees to add. Please upload a valid CSV.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setSubmitLoading(true);
    let successCount = 0;
    let errorCount = 0;
    const addedEmployees = [];

    for (const employee of batchAddData) {
      const payload = {
        username: employee.username,
        password: employee.password,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        department: employee.dept,
        position: employee.position,
        status: employee.status || "Active",
        phone: employee.phone || undefined,
        address: employee.address || undefined,
        role: employee.role === 'admin' ? 'admin' : 'employee',
      };

      if (!payload.username || !payload.password || !payload.first_name || !payload.last_name || !payload.email) {
        errorCount++;
        continue;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        if (res.ok) {
          successCount++;
          const created = await res.json();
          addedEmployees.push({
            id: created.id || created.user_id,
            user_id: created.user_id || created.id,
            name: [created.first_name, created.last_name].filter(Boolean).join(" ") || created.username,
            first_name: created.first_name || '',
            last_name: created.last_name || '',
            username: created.username,
            role: created.role || 'employee',
            email: created.email,
            dept: created.department,
            position: created.position,
            status: created.status || "Active",
            joinDate: formatJoinDate(created.join_date),
            address: created.address || '',
          });
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
        console.error("Error adding employee via batch:", err);
      }
    }

    if (addedEmployees.length > 0) {
      setRows(prev => [...prev, ...addedEmployees]);
    }

    setSubmitLoading(false);
    setIsBatchAddOpen(false);
    setBatchAddData([]);
    setBatchAddFileName("");
    setNotification({
      type: successCount > 0 ? 'success' : 'error',
      message: `Batch add complete. ${successCount} added, ${errorCount} failed.`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUploadCSV = (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const updatedRows = results.data;
        // Basic validation: Check for required headers
        const requiredHeaders = ["user_id", "first_name", "last_name", "username"];
        const fileHeaders = results.meta.fields;
        const hasRequiredHeaders = requiredHeaders.every(h => fileHeaders.includes(h));

        if (!hasRequiredHeaders) {
          setNotification({ type: 'error', message: 'Invalid CSV format. Missing required headers.' });
          setTimeout(() => setNotification(null), 4000);
          return;
        }

        // Create a map for quick lookups
        const updatedRowsMap = new Map();
        updatedRows.forEach(row => {
          if (row.user_id) {
            updatedRowsMap.set(String(row.user_id), row);
          }
        });

        // Merge updates into existing rows (in-memory only)
        let changesCount = 0;
        const mergedRows = rows.map(existingRow => {
          const updatedRow = updatedRowsMap.get(String(existingRow.user_id));
          if (updatedRow) {
            changesCount++;
            // Merge fields, keeping existing ones if not in CSV
            return { ...existingRow, ...updatedRow };
          }
          return existingRow;
        });

        setRows(mergedRows);
        if (changesCount > 0) {
          setNotification({ type: 'success', message: `${changesCount} employee(s) updated in table (not saved to server).` });
        } else {
          setNotification({ type: 'error', message: 'No matching employees found in the CSV to update.' });
        }
        setTimeout(() => setNotification(null), 3000);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        setNotification({ type: 'error', message: 'Failed to parse CSV file.' });
        setTimeout(() => setNotification(null), 4000);
      }
    });

    // Reset file input to allow re-uploading the same file
    event.target.value = null;
  };

  const handleBatchUpdate = async (updatedRows) => {
    setSubmitLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of updatedRows) {
      const userId = row.user_id || row.id;
      if (!userId) continue;

      try {
        const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(row),
        });

        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
        console.error(`Failed to update user ${userId}:`, err);
      }
    }

    setSubmitLoading(false);
    setNotification({
      type: 'success',
      message: `CSV import complete. ${successCount} updated, ${errorCount} failed.`
    });
    setTimeout(() => setNotification(null), 4000);

    // Refresh data from server after update
    // This is a simplified way to refetch. You might have a dedicated function for this.
    const res = await fetch(`${API_BASE_URL}/users`, { credentials: "include" });
    const users = await res.json();
    const mapped = (users || []).map((u) => ({
      id: u.id || u.user_id,
      user_id: u.user_id || u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username,
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      username: u.username,
      role: u.role || 'employee',
      email: u.email,
      dept: u.department,
      position: u.position,
      status: u.status || "Active",
      joinDate: formatJoinDate(u.join_date),
      address: u.address || '',
    }));
    setRows(mapped);
  };

  // Department -> Positions mapping based on provided positions list
  const departmentPositions = useMemo(() => ({
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

  React.useEffect(() => {
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
          dept: u.department,
          position: u.position,
          status: u.status || "Active",
          joinDate: formatJoinDate(u.join_date),
          address: u.address || '',
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
    setEditAddress(row.address || '');
    setIsEditOpen(true);
  }

  function openView(row) {
    setViewEmployee(row);
    setIsViewOpen(true);
  }

  async function handleUpdate(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    const body = {
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      email: data.get("email"),
      department: editDept,
      position: editPosition,
      status: data.get("status"),
      address: editAddress,
    };

    const userId = selected.user_id || selected.id;

    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to update employee (${res.status})`);
      }
      const updatedFromServer = await res.json();
      const updatedRow = {
        id: updatedFromServer.user_id || updatedFromServer.id,
        user_id: updatedFromServer.user_id || updatedFromServer.id,
        name: [updatedFromServer.first_name, updatedFromServer.last_name].filter(Boolean).join(' ') || updatedFromServer.username,
        first_name: updatedFromServer.first_name || '',
        last_name: updatedFromServer.last_name || '',
        username: updatedFromServer.username,
        role: updatedFromServer.role || 'employee',
        email: updatedFromServer.email,
        dept: updatedFromServer.department,
        position: updatedFromServer.position,
        status: updatedFromServer.status || 'Active',
        joinDate: formatJoinDate(updatedFromServer.join_date),
        address: updatedFromServer.address || '',
      };
      setRows(prev => prev.map(r => (r.user_id === updatedRow.user_id || r.id === updatedRow.id ? updatedRow : r)));
      setNotification({ type: 'success', message: 'Employee updated successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: err.message || 'Failed to update employee' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsEditOpen(false);
      setSelected(null);
      setEditDept('');
      setEditPosition('');
      setEditFirstName('');
      setEditLastName('');
      setOpenActionsId(null);
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
    if (!value.trim()) return null; // Phone is optional
    const phoneRegex = /^\+63\d{10}$/;
    if (!phoneRegex.test(value.trim())) return "Phone must start with +63 followed by 10 digits";
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
      // Remove all non-numeric characters
      const numbersOnly = value.replace(/\D/g, '');
      // If it doesn't start with 63, add it
      if (numbersOnly && !numbersOnly.startsWith('63')) {
        processedValue = '+63' + numbersOnly.slice(0, 10);
      } else if (numbersOnly.startsWith('63')) {
        processedValue = '+' + numbersOnly.slice(0, 12); // +63 + 10 digits
      } else {
        processedValue = '+63' + numbersOnly.slice(0, 10);
      }
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
        dept: created.department,
        position: created.position,
        status: created.status || "Active",
        joinDate: formatJoinDate(created.join_date),
        address: created.address || '',
      };
      setRows(prev => [...prev, newRow]);
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

  async function deleteEmployee(id) {
    if (!window.confirm("Are you sure you want to delete this employee?")) {
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to delete employee (${res.status})`);
      }
      
      setRows(prev => prev.filter(x => (x.user_id || x.id) !== id));
      setNotification({ type: 'success', message: 'Employee deleted successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: err.message || 'Failed to delete employee' });
      setTimeout(() => setNotification(null), 4000);
    }
  }

  React.useEffect(() => {
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
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-avatar">TI</div>
          <div className="brand-name">Tatay Ilio</div>
        </div>
        <nav className="nav">
          <Link className={`nav-item${isActive('/admin/dashboard') ? ' active' : ''}`} to="/admin/dashboard">Dashboard</Link>
          <Link className={`nav-item${isActive('/admin/employee') ? ' active' : ''}`} to="/admin/employee">Employees</Link>
          <Link className={`nav-item${isActive('/admin/schedules') ? ' active' : ''}`} to="/admin/schedules">Schedules</Link>
          <Link className={`nav-item${isActive('/admin/attendance') ? ' active' : ''}`} to="/admin/attendance">Attendance</Link>
          <Link className={`nav-item${isActive('/admin/overtime') ? ' active' : ''}`} to="/admin/overtime">Overtime</Link>
          <Link className={`nav-item${isActive('/admin/payroll') ? ' active' : ''}`} to="/admin/payroll">Payroll</Link>
          <Link className={`nav-item${isActive('/admin/reports') ? ' active' : ''}`} to="/admin/reports">Reports</Link>
        </nav>
      </aside>

      <main className="admin-content">
        <header className="admin-topbar">
          <h1>Employees</h1>
          <div className="top-actions">
            <button className="profile-btn" onClick={() => setIsProfileOpen(v => !v)}>
              <span className="profile-avatar">AU</span>
              <span>Admin User</span>
            </button>
            <div className={`profile-popover${isProfileOpen ? " open" : ""}`}>
              <div className="profile-row">Profile</div>
              <div className="profile-row" onClick={() => navigate("/")}>Log out</div>
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
              <button className="btn outline" onClick={handleDownloadCSV}>Export CSV</button>
              <button className="btn outline" onClick={() => setIsBatchAddOpen(true)}>Batch Add</button>
              <button className="btn primary" onClick={() => setIsAddOpen(true)} disabled={loading}>Add Employee</button>
            </div>
          </div>

          {filterOpen && (
            <div className="filters">
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option>All Departments</option>
                {Object.keys(departmentPositions).map((dept) => (
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
              <div>Username</div>
              <div>Role</div>
              <div>Status</div>
              <div>Join Date</div>
              
            </div>
            <div className="tbody">
              {loading ? (
                <div className="tr"><div>Loading...</div></div>
              ) : (
                filteredRows.map(r => (
                  <div key={r.user_id || r.id} className="tr">
                    <div>
                      <div className="emp">
                        <div className="emp-avatar">{r.name?.[0]}</div>
                        <div className="emp-meta">
                          <div className="emp-name">{r.name}</div>
                          <div className="emp-email">{r.email}</div>
                        </div>
                      </div>
                    </div>
                    <div>{r.username}</div>
                    <div>
                      <span className={`role-badge ${r.role === 'admin' ? 'admin' : 'employee'}`}>
                        {r.role === 'admin' ? 'Admin' : 'Employee'}
                      </span>
                    </div>
                    <div><span className={`status ${r.status === 'Inactive' ? 'danger' : 'success'}`}>{r.status}</span></div>
                    <div>{r.joinDate}</div>
                    <div className="right">
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
                  <div className="detail-section">
                    <h3>Personal Information</h3>
                    <div className="detail-row two">
                      <div className="detail-item">
                        <span className="detail-label">First Name</span>
                        <input 
                          name="first_name" 
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          className="detail-input"
                          required 
                        />
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Last Name</span>
                        <input 
                          name="last_name" 
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          className="detail-input"
                          required 
                        />
                      </div>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email Address</span>
                      <input 
                        type="email" 
                        name="email" 
                        defaultValue={selected.email} 
                        className="detail-input"
                        required 
                      />
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Address</span>
                      <input
                        name="address"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="detail-input"
                        placeholder="Enter address"
                      />
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Employee ID</span>
                      <span className="detail-value">EMP{String(selected.user_id || selected.id).padStart(3, '0')}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Work Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Department</span>
                      <select
                        name="dept"
                        className="detail-select"
                        value={editDept}
                        onChange={(e) => {
                          setEditDept(e.target.value);
                          setEditPosition('');
                        }}
                        required
                      >
                        <option value="">Select Department</option>
                        {Object.keys(departmentPositions).map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Position</span>
                      <select
                        name="position"
                        className="detail-select"
                        value={editPosition}
                        onChange={(e) => setEditPosition(e.target.value)}
                        required
                        disabled={!editDept}
                      >
                        <option value="">{editDept ? 'Select Position' : 'Select a department first'}</option>
                        {(departmentPositions[editDept] || []).map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <select name="status" defaultValue={selected.status} className="detail-select" required>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Join Date</span>
                      <span className="detail-value">{selected.joinDate}</span>
                    </div>
                  </div>

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
                          setFormData(prev => ({ ...prev, dept: nextDept, position: '' }));
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
                        {Object.keys(departmentPositions).map((dept) => (
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
                        {(departmentPositions[formData.dept] || []).map((pos) => (
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
                      >
                        <option value="employee">User/Employee</option>
                        <option value="admin">Admin</option>
                      </select>
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

        {isBatchAddOpen && (
          <div className="modal" role="dialog">
            <div className="modal-body">
              <div className="modal-header">
                <div className="modal-title">Batch Add Employees</div>
                <button className="icon-btn" onClick={() => setIsBatchAddOpen(false)}>✖</button>
              </div>
              <div className="batch-add-content">
                <p>Upload a CSV file with new employee data. Please use the provided template to ensure correct formatting.</p>
                <button className="btn outline" onClick={handleDownloadTemplate}>Download Template</button>
                <div className="batch-add-upload-area">
                  <label htmlFor="batch-csv-upload" className="btn primary">Upload CSV File</label>
                  <input type="file" id="batch-csv-upload" style={{ display: 'none' }} accept=".csv" onChange={handleBatchFileSelect} />
                  <span>{batchAddFileName || "No file chosen"}</span>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setIsBatchAddOpen(false)} disabled={submitLoading}>Cancel</button>
                <button className="btn primary" onClick={handleProcessBatchAdd} disabled={submitLoading || batchAddData.length === 0}>
                  {submitLoading ? 'Adding...' : `Add ${batchAddData.length} Employees`}
                </button>
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
                      <span className="detail-value">+63 912 345 6789</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Address</span>
                      <span className="detail-value">{viewEmployee.address || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn" onClick={() => setIsViewOpen(false)}>Cancel</button>
                  <button className="btn" onClick={() => { setIsViewOpen(false); deleteEmployee(viewEmployee.user_id || viewEmployee.id); }}>Delete</button>
                  <button className="btn primary" onClick={() => { setIsViewOpen(false); openEdit(viewEmployee); }}>Edit</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {notification && (
          <div className={`notification notification-${notification.type}`}>
            <div className="notification-icon">✓</div>
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


