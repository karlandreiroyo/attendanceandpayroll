import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../AdminPages/admincss/adminEmployee.css";
import { API_BASE_URL } from "../config/api";
import { handleLogout as logout } from "../utils/logout";
import {
  notifyProfileUpdated,
  getSessionUserProfile,
  subscribeToProfileUpdates,
} from "../utils/currentUser";
import { useSidebarState } from "../hooks/useSidebarState";

export default function AdminEmployee() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Status");
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
  const [editDept, setEditDept] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState("Active");
  const [editFingerprint, setEditFingerprint] = useState("");
  const [deleteFingerprintLoading, setDeleteFingerprintLoading] = useState(false);
  const [scanListening, setScanListening] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const eventSourceRef = useRef(null);
  const [isFingerprintManagerOpen, setIsFingerprintManagerOpen] = useState(false);
  const [fingerprintManagerLoading, setFingerprintManagerLoading] = useState(false);
  const [deletingFingerprintIds, setDeletingFingerprintIds] = useState(new Set());
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    dept: "",
    position: "",
    status: "Active",
    role: "employee",
    username: "",
    password: "",
    confirm_password: "",
    finger_template_id: "",
  });

  const [rows, setRows] = useState([]);
  const isAdminRole = (role) => (role || 'employee').toLowerCase() === 'admin';
  const [currentUser, setCurrentUser] = useState(null);
  const [profileSession, setProfileSession] = useState(() =>
    getSessionUserProfile()
  );
  const { isSidebarOpen, toggleSidebar, closeSidebar, isMobileView } = useSidebarState();

  // Departments that allow admin role
  const adminAllowedDepartments = useMemo(
    () => ["HR", "Management", "Accounting", "Branch"],
    []
  );

  const formatPhoneDisplay = (value) => {
    if (!value && value !== 0) return "";
    const numbersOnly = String(value).replace(/\D/g, "");
    if (!numbersOnly) return "";
    let digits = numbersOnly;
    if (digits.startsWith("63")) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    return "+63" + digits.slice(0, 10);
  };

  // stop event source when modal closes
  useEffect(() => {
    if (!isAddOpen) {
      stopFingerprintStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddOpen]);

  // Department -> Positions mapping based on provided positions list
  const defaultDepartmentPositions = useMemo(
    () => ({
      HR: ["HR Manager"],
      Management: ["Company Secretary", "Area Manager", "Branch Manager"],
      Accounting: ["Accounting Manager"],
      Kitchen: ["Kitchen Manager", "Kitchen Staff"],
      Commissary: [
        "Commissary Manager",
        "Commissary Staff",
        "BBQ Commissary OIC",
        "BBQ Commissary Staff",
      ],
      Supplies: ["Supplies Manager", "Supplies Staff"],
      Operations: ["Officer In-Charge", "Service Crew"],
      Service: ["Service Crew"],
      Cashier: ["Cashier Staff"],
      BBQ: ["BBQ Staff"],
      Billiard: ["Billiard Staff"],
      Lemon: ["Lemon Staff"],
      Branch: ["Branch Manager"],
    }),
    []
  );

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

  const availableDepartments = useMemo(
    () => Object.keys(departmentPositions).sort(),
    [departmentPositions]
  );

  const notifyEmployeesUpdated = () => {
    window.dispatchEvent(new Event("employees-refresh"));
  };

  // Format date uniformly as MM/DD/YYYY
  const formatDate = (dateString) => {
    if (!dateString) {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const year = today.getFullYear();
      return `${month}/${day}/${year}`;
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return dateString;
    }
  };

  const updateUserSessionCache = (user) => {
    if (!user) return;
    if (user.user_id || user.id)
      sessionStorage.setItem("userId", String(user.user_id ?? user.id));
    if (user.username) sessionStorage.setItem("username", user.username);
    if (user.first_name) sessionStorage.setItem("firstName", user.first_name);
    else sessionStorage.removeItem("firstName");

    if (user.last_name) sessionStorage.setItem("lastName", user.last_name);
    else sessionStorage.removeItem("lastName");

    if (user.email) sessionStorage.setItem("email", user.email);
    else sessionStorage.removeItem("email");

    if (user.profile_picture)
      sessionStorage.setItem("profilePicture", user.profile_picture);
    else sessionStorage.removeItem("profilePicture");

    if (user.department) sessionStorage.setItem("department", user.department);
    else sessionStorage.removeItem("department");

    if (user.position) sessionStorage.setItem("position", user.position);
    else sessionStorage.removeItem("position");

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
    if (isMobileView) {
      closeSidebar();
    }
  }, [location.pathname, isMobileView, closeSidebar]);

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
      const user = Array.isArray(users)
        ? users.find((u) => u.username === username)
        : users;
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
        const res = await fetch(`${API_BASE_URL}/users?includeInactive=true`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
        const users = await res.json();
        if (aborted) return;
        const mapped = (users || []).map((u) => {
          // Handle fingerprint ID: convert to string, handle null/undefined/0
          const fingerprintId = u.finger_template_id;
          const fingerprintIdStr =
            fingerprintId !== null && fingerprintId !== undefined && fingerprintId !== ""
              ? String(fingerprintId)
              : "";
          
          return {
            id: u.id || u.user_id,
            user_id: u.user_id || u.id,
            name:
              [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username,
            first_name: u.first_name || "",
            last_name: u.last_name || "",
            username: u.username,
            role: u.role || "employee",
            email: u.email,
            phone: formatPhoneDisplay(u.phone),
            address: u.address || "",
            dept: u.department,
            position: u.position,
            status: u.status || "Active",
            joinDate: formatDate(u.join_date),
            finger_template_id: fingerprintIdStr,
          };
        });
        const employeesOnly = mapped.filter((user) => !isAdminRole(user.role));
        setRows(employeesOnly);
      } catch (err) {
        console.error(err);
        setNotification({ type: "error", message: "Failed to load employees" });
        setTimeout(() => setNotification(null), 3000);
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    loadEmployees();
    return () => {
      aborted = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    let filtered = rows;

    const q = query.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((r) =>
        `${r.name} ${r.username} ${r.role} ${r.email}`.toLowerCase().includes(q)
      );
    }

    if (deptFilter !== "All Departments") {
      filtered = filtered.filter((r) => r.dept === deptFilter);
    }

    if (statusFilter !== "All Status") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    return filtered;
  }, [rows, query, deptFilter, statusFilter]);

  function openEdit(row) {
    if (!row) {
      console.error("Cannot edit: row is null or undefined");
      return;
    }
    
    // Ensure row has required properties
    if (!row.id && !row.user_id) {
      console.error("Cannot edit: row missing id or user_id", row);
      setNotification({
        type: "error",
        message: "Employee data is incomplete. Cannot open edit form.",
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    try {
      console.log("Opening edit for employee:", row);
      
      // Set selected first to ensure modal can render
      setSelected(row);
      
      // Set all form fields with defensive checks
      setEditDept(row.dept || "");
      setEditPosition(row.position || "");
      setEditFirstName(row.first_name || "");
      setEditLastName(row.last_name || "");
      
      // Handle phone formatting safely
      try {
        const phoneValue = row.phone || "";
        setEditPhone(phoneValue ? formatPhoneDisplay(phoneValue) : "");
      } catch (err) {
        console.error("Error formatting phone:", err);
        setEditPhone(row.phone || "");
      }
      
      setEditAddress(row.address || "");
      setEditEmail(row.email || "");
      setEditStatus(row.status || "Active");
      
      // Handle fingerprint ID: convert to string, handle null/undefined
      try {
        const fingerprintId = row.finger_template_id;
        // Convert to string if it exists, otherwise use empty string
        // Handle null, undefined, empty string, and ensure it's always a string
        let fingerprintStr = "";
        if (fingerprintId != null && fingerprintId !== "") {
          const str = String(fingerprintId).trim();
          fingerprintStr = str || "";
        }
        setEditFingerprint(fingerprintStr);
      } catch (err) {
        console.error("Error setting fingerprint ID:", err, "fingerprintId:", row.finger_template_id);
        setEditFingerprint("");
      }
      
      setEditFormErrors({});
      setIsEditOpen(true);
    } catch (err) {
      console.error("Error opening edit modal:", err, row);
      // Even if there's an error, try to open the modal with what we have
      setSelected(row);
      setIsEditOpen(true);
      setNotification({
        type: "error",
        message: "Some fields may not have loaded correctly. Please check the form.",
      });
      setTimeout(() => setNotification(null), 4000);
    }
  }

  async function handleDeleteFingerprintFromDevice() {
    const trimmed = (editFingerprint || "").trim();
    if (!trimmed) {
      setNotification({
        type: "error",
        message: "No fingerprint ID to delete. Enter or detect an ID first.",
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    const id = Number(trimmed);
    if (!Number.isFinite(id) || id < 1 || id > 127) {
      setNotification({
        type: "error",
        message: "Fingerprint ID must be a number between 1 and 127.",
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    try {
      setDeleteFingerprintLoading(true);
      const res = await fetch(`${API_BASE_URL}/fingerprint/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(
          data.message ||
            `Failed to delete fingerprint ID ${id}. Please try again.`,
        );
      }

      setNotification({
        type: "success",
        message: data.message || `Fingerprint ID ${id} deleted from device.`,
      });
      setEditFingerprint("");
      setRows((prev) =>
        prev.map((row) =>
          row.id === selected?.id || row.user_id === selected?.user_id
            ? { ...row, finger_template_id: "" }
            : row,
        ),
      );
      if (selected) {
        setSelected((prev) => (prev ? { ...prev, finger_template_id: "" } : prev));
      }
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Failed to delete fingerprint:", err);
      setNotification({
        type: "error",
        message: err.message || "Failed to delete fingerprint ID.",
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setDeleteFingerprintLoading(false);
    }
  }

  // Analyze fingerprint IDs to find orphaned ones
  const analyzeFingerprints = useMemo(() => {
    // Create a map of fingerprint ID to employee
    const fingerprintMap = new Map();
    rows.forEach((employee) => {
      const fpId = employee.finger_template_id;
      if (fpId && fpId.trim() !== "") {
        const id = String(fpId).trim();
        fingerprintMap.set(id, {
          employeeId: employee.id || employee.user_id,
          employeeName: employee.name || `${employee.first_name} ${employee.last_name}`.trim() || employee.username,
          status: employee.status,
        });
      }
    });

    // Generate list of all possible IDs (1-127) with their status
    const allFingerprints = [];
    for (let i = 1; i <= 127; i++) {
      const idStr = String(i);
      const employee = fingerprintMap.get(idStr);
      allFingerprints.push({
        id: i,
        idStr: idStr,
        isUsed: !!employee,
        employee: employee || null,
        isOrphaned: false, // We can't know if it's on device without checking, so we'll mark as "potentially orphaned" if not in our DB
      });
    }

    return {
      allFingerprints,
      usedCount: fingerprintMap.size,
      availableCount: 127 - fingerprintMap.size,
    };
  }, [rows]);

  // Delete an orphaned fingerprint by ID
  async function deleteOrphanedFingerprint(fingerprintId) {
    const id = Number(fingerprintId);
    if (!Number.isFinite(id) || id < 1 || id > 127) {
      setNotification({
        type: "error",
        message: "Invalid fingerprint ID. Must be between 1 and 127.",
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    // Check if this ID is actually used by an employee
    const fingerprintInfo = analyzeFingerprints.allFingerprints.find((fp) => fp.id === id);
    if (fingerprintInfo && fingerprintInfo.isUsed) {
      setNotification({
        type: "error",
        message: `Cannot delete fingerprint ID ${id}. It is assigned to employee: ${fingerprintInfo.employee.employeeName}`,
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    try {
      setDeletingFingerprintIds((prev) => new Set(prev).add(id));
      const res = await fetch(`${API_BASE_URL}/fingerprint/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(
          data.message || `Failed to delete fingerprint ID ${id}. Please try again.`
        );
      }

      setNotification({
        type: "success",
        message: data.message || `Fingerprint ID ${id} deleted from device successfully.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Failed to delete orphaned fingerprint:", err);
      setNotification({
        type: "error",
        message: err.message || `Failed to delete fingerprint ID ${id}.`,
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setDeletingFingerprintIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
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
      console.log("Validation errors:", errors);
      return;
    }

    const body = {
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim() || "",
      department: editDept || "",
      position: editPosition || "",
      status: editStatus,
      address: editAddress.trim() || "",
    };

    const trimmedFingerprint = editFingerprint.trim();
    if (trimmedFingerprint) {
      body.finger_template_id = trimmedFingerprint;
    }

    const userId = selected?.user_id || selected?.id;
    if (!userId) {
      setNotification({ type: "error", message: "Employee ID is missing" });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    try {
      console.log("Updating employee:", userId, body);
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Update failed:", res.status, errText);
        throw new Error(errText || `Failed to update employee (${res.status})`);
      }

      const updatedFromServer = await res.json();
      console.log("Update successful:", updatedFromServer);

      // Handle fingerprint ID: convert to string, handle null/undefined/0
      const updatedFingerprintId = updatedFromServer.finger_template_id;
      const updatedFingerprintIdStr =
        updatedFingerprintId !== null && updatedFingerprintId !== undefined && updatedFingerprintId !== ""
          ? String(updatedFingerprintId)
          : "";
      
      const updatedRow = {
        id: updatedFromServer.id || updatedFromServer.user_id,
        user_id: updatedFromServer.user_id || updatedFromServer.id,
        name:
          [updatedFromServer.first_name, updatedFromServer.last_name]
            .filter(Boolean)
            .join(" ") || updatedFromServer.username,
        first_name: updatedFromServer.first_name || "",
        last_name: updatedFromServer.last_name || "",
        username: updatedFromServer.username,
        phone: formatPhoneDisplay(updatedFromServer.phone),
        address: updatedFromServer.address || "",
        role: updatedFromServer.role || "employee",
        email: updatedFromServer.email,
        dept: updatedFromServer.department,
        position: updatedFromServer.position,
        status: updatedFromServer.status || "Active",
        joinDate: formatDate(updatedFromServer.join_date),
        finger_template_id: updatedFingerprintIdStr,
      };
      const updatedIsAdmin = isAdminRole(updatedRow.role);
      const identifier = updatedRow.user_id || updatedRow.id;

      setRows((prev) => {
        if (updatedIsAdmin) {
          return prev.filter((r) => (r.user_id || r.id) !== identifier);
        }
        let replaced = false;
        const next = prev.map((r) => {
          if ((r.user_id || r.id) === identifier) {
            replaced = true;
            return updatedRow;
          }
          return r;
        });
        return replaced ? next : [...next, updatedRow];
      });
      notifyEmployeesUpdated();
      setIsEditOpen(false);
      setSelected(null);
      setEditDept("");
      setEditPosition("");
      setEditFirstName("");
      setEditLastName("");
      setEditPhone("");
      setEditAddress("");
      setEditEmail("");
      setEditStatus("Active");
      setEditFingerprint("");
      setEditFormErrors({});
      setNotification({
        type: "success",
        message: updatedIsAdmin
          ? "Account updated to admin role. You can view it in Reports → Admin List."
          : "Employee updated successfully",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error("Update error:", err);
      setNotification({
        type: "error",
        message: err.message || "Failed to update employee",
      });
      setTimeout(() => setNotification(null), 4000);
    }
  }

  // Live validation functions
  const validateFirstName = (value) => {
    if (!value.trim()) return "First name is required";
    if (value.trim().length < 2) return "First name must be at least 2 letters";
    if (!/^[a-zA-Z\s]+$/.test(value.trim()))
      return "First name can only contain letters";
    return null;
  };

  const validateLastName = (value) => {
    if (!value.trim()) return "Last name is required";
    if (value.trim().length < 2) return "Last name must be at least 2 letters";
    if (!/^[a-zA-Z\s]+$/.test(value.trim()))
      return "Last name can only contain letters";
    return null;
  };

  const validateEmail = (value) => {
    if (!value.trim()) return "Email is required";
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value.trim())) return "Invalid email format";
    const localPart = value.split("@")[0];
    if (localPart.length < 2)
      return "Email must have at least 2 characters before @";
    return null;
  };

  const validatePhone = (value) => {
    if (!value) return null; // Phone is optional
    const normalized =
      typeof value === "string" ? value.trim() : String(value).trim();
    if (!normalized) return null;
    const phoneRegex = /^\+63\d{10}$/;
    if (!phoneRegex.test(normalized))
      return "Phone must start with +63 followed by 10 digits";
    return null;
  };

  const validateUsername = (value) => {
    if (!value.trim()) return "Username is required";
    if (value.trim().length < 3)
      return "Username must be at least 3 characters";
    if (/\s/.test(value)) return "Username cannot contain spaces";
    return null;
  };

  const validatePassword = (value) => {
    if (!value) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters";
    if (!/[0-9]/.test(value)) return "Password must contain at least 1 number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value))
      return "Password must contain at least 1 special character";
    if (!/[A-Z]/.test(value))
      return "Password must contain at least 1 capital letter";
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
    if (field === "first_name" || field === "last_name") {
      // Remove all non-letter characters (keep only letters and spaces)
      processedValue = value.replace(/[^a-zA-Z\s]/g, "");
      // Auto-capitalize first letter
      if (processedValue.length > 0) {
        processedValue =
          processedValue.charAt(0).toUpperCase() + processedValue.slice(1);
      }
    }

    // Auto-add +63 prefix for phone and only allow numbers
    if (field === "phone") {
      processedValue = formatPhoneDisplay(value);
    }

    setFormData((prev) => ({ ...prev, [field]: processedValue }));

    // Live validation
    const errors = { ...formErrors };
    let error = null;

    switch (field) {
      case "first_name":
        error = validateFirstName(processedValue);
        break;
      case "last_name":
        error = validateLastName(processedValue);
        break;
      case "email":
        error = validateEmail(processedValue);
        break;
      case "phone":
        error = validatePhone(processedValue);
        break;
      case "username":
        error = validateUsername(processedValue);
        break;
      case "password":
        error = validatePassword(processedValue);
        // Also validate confirm password if it exists
        if (formData.confirm_password) {
          errors.confirm_password = validateConfirmPassword(
            formData.confirm_password
          );
        }
        break;
      case "confirm_password":
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
    if (value === null || value === undefined) {
      value = "";
    }
    let processedValue = String(value || "");

    // Auto-capitalize first letter for names and remove numbers/special characters
    if (field === "first_name" || field === "last_name") {
      // Remove all non-letter characters (keep only letters and spaces)
      processedValue = processedValue.replace(/[^a-zA-Z\s]/g, "");
      // Auto-capitalize first letter
      if (processedValue.length > 0) {
        processedValue =
          processedValue.charAt(0).toUpperCase() + processedValue.slice(1);
      }
    }

    // Auto-add +63 prefix for phone and only allow numbers
    if (field === "phone") {
      try {
        processedValue = formatPhoneDisplay(processedValue);
      } catch (err) {
        console.error("Error formatting phone:", err);
        processedValue = processedValue || "";
      }
    }

    // Update the appropriate state
    switch (field) {
      case "first_name":
        setEditFirstName(processedValue);
        setEditFormErrors((prev) => {
          const errors = { ...prev };
          const err = validateFirstName(processedValue);
          if (err) errors.first_name = err;
          else delete errors.first_name;
          return errors;
        });
        break;
      case "last_name":
        setEditLastName(processedValue);
        setEditFormErrors((prev) => {
          const errors = { ...prev };
          const err = validateLastName(processedValue);
          if (err) errors.last_name = err;
          else delete errors.last_name;
          return errors;
        });
        break;
      case "email":
        setEditEmail(processedValue);
        setEditFormErrors((prev) => {
          const errors = { ...prev };
          const err = validateEmail(processedValue);
          if (err) errors.email = err;
          else delete errors.email;
          return errors;
        });
        break;
      case "phone":
        setEditPhone(processedValue);
        setEditFormErrors((prev) => {
          const errors = { ...prev };
          const err = validatePhone(processedValue);
          if (err) errors.phone = err;
          else delete errors.phone;
          return errors;
        });
        break;
      case "address":
        setEditAddress(processedValue);
        break;
      default:
        break;
    }
  };

  function validateAddForm() {
    const errors = {};
    const normalize = (s) =>
      (s || "").trim().toLowerCase().replace(/\s+/g, " ");

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
    const usernameExists = rows.some(
      (r) => normalize(r.username) === desiredUsername
    );
    if (!errors.username && desiredUsername && usernameExists) {
      errors.username = "Username already exists";
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(
      formData.confirm_password
    );
    if (confirmPasswordError) errors.confirm_password = confirmPasswordError;

    // Duplicate name check (first_name + last_name, case-insensitive)
    const desiredFullName = normalize(
      `${formData.first_name} ${formData.last_name}`
    );
    const nameExists = rows.some((r) => normalize(r.name) === desiredFullName);
    if (desiredFullName && nameExists) {
      errors.first_name =
        errors.first_name || "An account with this name already exists";
      errors.last_name =
        errors.last_name || "An account with this name already exists";
    }
    // REQUIRED fingerprint id validation
    if (!formData.finger_template_id || !formData.finger_template_id.trim()) {
      errors.finger_template_id = "Fingerprint enrollment is required. Please enroll the employee's fingerprint before adding them.";
    } else if (!/^\d+$/.test(String(formData.finger_template_id).trim())) {
      errors.finger_template_id = "Invalid fingerprint template ID. Must be a number between 1-127.";
    } else {
      const fingerprintId = Number(formData.finger_template_id);
      if (fingerprintId < 1 || fingerprintId > 127) {
        errors.finger_template_id = "Fingerprint ID must be between 1 and 127.";
      } else {
        const existing = rows.find(
          (r) => r.finger_template_id === formData.finger_template_id
        );
        if (existing) {
          errors.finger_template_id =
            "This fingerprint ID is already assigned to another employee";
        }
      }
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
      finger_template_id: formData.finger_template_id.trim(), // Required - validation ensures it exists
      role: formData.role === "user/employee" ? "employee" : formData.role,
    };

    try {
      setSubmitLoading(true);
      const res = await fetch(`${API_BASE_URL}/users?includeInactive=true`, {
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
        name:
          [created.first_name, created.last_name].filter(Boolean).join(" ") ||
          created.username,
        first_name: created.first_name || "",
        last_name: created.last_name || "",
        username: created.username,
        role: created.role || "employee",
        email: created.email,
        phone: formatPhoneDisplay(created.phone),
        address: created.address || "",
        dept: created.department,
        position: created.position,
        status: created.status || "Active",
        joinDate: formatDate(created.join_date),
        finger_template_id: (() => {
          const fpId = created.finger_template_id;
          return fpId !== null && fpId !== undefined && fpId !== ""
            ? String(fpId)
            : "";
        })(),
      };
      const createdIsAdmin = isAdminRole(newRow.role);
      if (!createdIsAdmin) {
        setRows((prev) => [...prev, newRow]);
      }
      notifyEmployeesUpdated();
      setIsAddOpen(false);
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        address: "",
        dept: "",
        position: "",
        status: "Active",
        role: "employee",
        username: "",
        password: "",
        confirm_password: "",
        finger_template_id: "",
      });
      setFormErrors({});
      setShowPassword(false);
      setShowConfirmPassword(false);
      setNotification({
        type: "success",
        message: createdIsAdmin
          ? `Admin "${newRow.name}" created successfully. You can view it in Reports → Admin List.`
          : `Employee "${newRow.name}" has been added successfully!`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: err.message || "Failed to add employee",
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setSubmitLoading(false);
    }
  }

  const startFingerprintStream = async () => {
    if (scanListening) return;

    // Check device status first
    try {
      const statusRes = await fetch(`${API_BASE_URL}/fingerprint/status`, {
        credentials: "include",
      });
      const statusData = await statusRes.json();

      if (!statusData.connected) {
        setScanStatus("Device not connected");
        setScanListening(false);
        setNotification({
          type: "error",
          message: statusData.message || "Fingerprint device is not connected. Please connect the device and try again, or manually enter the fingerprint ID.",
        });
        setTimeout(() => setNotification(null), 5000);
        return;
      }
    } catch (err) {
      console.error("Failed to check device status:", err);
      // Continue anyway - let EventSource handle it
    }

    setScanListening(true);
    setScanStatus("Connecting to fingerprint scanner...");
    const url = `${API_BASE_URL}/fingerprint/events`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    console.log("🔍 Starting fingerprint stream for testing enrolled fingerprints...");

    es.onopen = () => {
      console.log("✅ EventSource connected for fingerprint testing");
      setScanStatus("Ready - Place your enrolled finger on the scanner");
    };

    es.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        console.log("📥 Fingerprint event received:", payload);

        if (payload.type === "scanning") {
          console.log("🔍 Fingerprint scanning detected");
          setScanStatus("🔍 Scanning fingerprint... Please keep your finger on the scanner");
          setNotification({
            type: "info",
            message: "🔍 Scanning fingerprint... Please keep your finger on the scanner",
          });
        } else if (payload.type === "detected" && payload.id) {
          console.log("✅ Fingerprint detected, ID:", payload.id);
          const fingerprintId = String(payload.id);
          // Update both add form and edit form if edit modal is open
          setFormData((prev) => ({
            ...prev,
            finger_template_id: fingerprintId,
          }));
          // Also update edit form if it's open
          if (isEditOpen) {
            setEditFingerprint(fingerprintId);
          }
          setScanStatus(`✅ Detected ID: ${payload.id} - Fingerprint is working!`);
          setNotification({
            type: "success",
            message: `✅ Fingerprint ID ${payload.id} detected successfully! The fingerprint is working correctly.`,
          });
          setTimeout(() => {
            setNotification(null);
            setScanStatus(`Ready - Place your enrolled finger on the scanner (Last detected: ID ${payload.id})`);
          }, 5000);
        } else if (payload.type === "unregistered") {
          console.log("❌ Unregistered fingerprint detected");
          setScanStatus("❌ Unregistered fingerprint - This fingerprint is not enrolled");
          setNotification({
            type: "error",
            message: "❌ Unregistered fingerprint. This fingerprint is not enrolled in the device. Please enroll it first.",
          });
          setTimeout(() => {
            setNotification(null);
            setScanStatus("Ready - Place your enrolled finger on the scanner");
          }, 5000);
        } else if (payload.type === "raw") {
          console.log("📨 Raw fingerprint data:", payload.raw);

          // Check for scanning message in raw data
          if (payload.raw && (payload.raw.includes("scanning") || payload.raw.includes("Scanning") || payload.raw.includes("Fingerprint scanning"))) {
            setScanStatus("🔍 Scanning fingerprint... Please keep your finger on the scanner");
            setNotification({
              type: "info",
              message: "🔍 Scanning fingerprint... Please keep your finger on the scanner",
            });
          }

          // Check for detection in raw data (fallback)
          const detectedMatch = payload.raw?.match(/Detected ID:\s*(\d+)/i) || payload.raw?.match(/Found ID\s*#?\s*(\d+)/i);
          if (detectedMatch && detectedMatch[1]) {
            const id = Number(detectedMatch[1]);
            console.log("✅ Found detection in raw data, ID:", id);
            const fingerprintId = String(id);
            setFormData((prev) => ({
              ...prev,
              finger_template_id: fingerprintId,
            }));
            // Also update edit form if it's open
            if (isEditOpen) {
              setEditFingerprint(fingerprintId);
            }
            setScanStatus(`✅ Detected ID: ${id} - Fingerprint is working!`);
            setNotification({
              type: "success",
              message: `✅ Fingerprint ID ${id} detected successfully! The fingerprint is working correctly.`,
            });
            setTimeout(() => {
              setNotification(null);
              setScanStatus(`Ready - Place your enrolled finger on the scanner (Last detected: ID ${id})`);
            }, 5000);
          }

          // Check for unregistered in raw data
          if (payload.raw && payload.raw.includes("Unregistered")) {
            setScanStatus("❌ Unregistered fingerprint - This fingerprint is not enrolled");
            setNotification({
              type: "error",
              message: "❌ Unregistered fingerprint. This fingerprint is not enrolled in the device. Please enroll it first.",
            });
            setTimeout(() => {
              setNotification(null);
              setScanStatus("Ready - Place your enrolled finger on the scanner");
            }, 5000);
          }
        } else if (payload.type === "enroll_status") {
          // Handle enrollment status messages with notifications
          const statusMessage = payload.message || payload.raw || "";
          setScanStatus(statusMessage);

          // Show notifications for all enrollment steps
          if (payload.step === "enroll_started") {
            setNotification({
              type: "success",
              message: statusMessage,
            });
            setTimeout(() => setNotification(null), 4000);
          } else if (payload.step === "waiting_id") {
            setNotification({
              type: "success",
              message: statusMessage,
            });
            setTimeout(() => setNotification(null), 3000);
          } else if (payload.step === "place_finger") {
            setNotification({
              type: "success",
              message: statusMessage,
            });
            setTimeout(() => setNotification(null), 8000); // Longer timeout for action steps
          } else if (payload.step === "first_image") {
            setNotification({
              type: "success",
              message: statusMessage,
            });
            setTimeout(() => setNotification(null), 6000);
          } else if (payload.step === "remove_finger") {
            setNotification({
              type: "success",
              message: statusMessage,
            });
            setTimeout(() => setNotification(null), 8000);
          } else if (payload.step === "place_again") {
            setNotification({
              type: "success",
              message: statusMessage,
            });
            setTimeout(() => setNotification(null), 8000);
          } else if (payload.step === "second_image") {
            setNotification({
              type: "success",
              message: statusMessage,
            });
            setTimeout(() => setNotification(null), 6000);
          } else if (payload.step === "model_created") {
            setNotification({
              type: "success",
              message: statusMessage,
            });
            setTimeout(() => setNotification(null), 5000);
          } else if (payload.step === "success") {
            setNotification({
              type: "success",
              message: statusMessage,
            });
            setTimeout(() => setNotification(null), 10000); // Keep success message longer
          } else if (payload.step === "failed") {
            setNotification({
              type: "error",
              message: statusMessage,
            });
            setTimeout(() => setNotification(null), 10000);
          }
        } else if (payload.type === "status") {
          // Device status messages
          console.log("📡 Device status:", payload.raw);
          if (payload.raw && (payload.raw.includes("ready") || payload.raw.includes("READY"))) {
            setScanStatus("Ready - Place your enrolled finger on the scanner");
          }
        }
      } catch (err) {
        console.error("❌ Error parsing fingerprint event:", err, "Raw data:", evt.data);
        setScanStatus("Error parsing event data");
      }
    };
    es.onerror = (err) => {
      console.error("❌ EventSource error:", err);
      console.log("EventSource readyState:", es.readyState);

      if (es.readyState === EventSource.CLOSED) {
        setScanStatus("Connection closed. Click Listen again to reconnect.");
        setScanListening(false);
      } else {
        setScanStatus("Device connection error - Check backend connection");
        setScanListening(false);
      }
      setNotification({
        type: "error",
        message: "Unable to connect to fingerprint device. Please check the connection or manually enter the fingerprint ID.",
      });
      setTimeout(() => setNotification(null), 5000);
      try {
        es.close();
      } catch (e) { }
    };
  };

  const stopFingerprintStream = () => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (e) { }
      eventSourceRef.current = null;
    }
    setScanListening(false);
    setScanStatus("Stopped");
  };

  const enrollOnDevice = async () => {
    const idStr = window.prompt(
      "Enter ID # (1-127) to enroll on fingerprint device:"
    );
    if (!idStr) return;
    const id = Number(idStr);
    if (!id || id < 1 || id > 127) {
      setNotification({
        type: "error",
        message: "Invalid fingerprint ID. Must be 1-127",
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    // Make sure we're listening to enrollment events BEFORE starting enrollment
    if (!scanListening) {
      setNotification({
        type: "success",
        message: "Starting fingerprint listener... Please wait.",
      });
      startFingerprintStream();
      // Wait a moment for EventSource to connect
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Show enrollment started message
    setNotification({
      type: "success",
      message: `🚀 Starting enrollment for ID ${id}. Watch for step-by-step instructions below.`,
    });
    setScanStatus(`⏳ Enrolling ID ${id}... Waiting for device to respond...`);

    try {
      const res = await fetch(`${API_BASE_URL}/fingerprint/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        // If device is not connected, still allow manual entry
        if (json.deviceNotConnected) {
          setNotification({
            type: "error",
            message: json.message || "Device not connected. You can manually enter the fingerprint ID above.",
          });
          // Still set the ID in the form so user can use it
          const fingerprintId = String(id);
          setFormData((prev) => ({ ...prev, finger_template_id: fingerprintId }));
          // Also update edit form if it's open
          if (isEditOpen) {
            setEditFingerprint(fingerprintId);
          }
        } else if (json.timeout) {
          setNotification({
            type: "error",
            message: json.message || "Enrollment timed out. Please try again and follow the device instructions carefully.",
          });
          setScanStatus("Enrollment failed - try again");
        } else {
          throw new Error(json.message || "Enroll request failed");
        }
      } else {
        // Enrollment successful!
        setNotification({
          type: "success",
          message: `✅ Fingerprint enrollment successful for ID ${id}! The fingerprint is now ready for attendance scanning.`,
        });
        // Automatically set the fingerprint ID in the form
        const fingerprintId = String(id);
        setFormData((prev) => ({ ...prev, finger_template_id: fingerprintId }));
        // Also update edit form if it's open
        if (isEditOpen) {
          setEditFingerprint(fingerprintId);
        }
        setScanStatus(`✅ Enrollment successful! ID ${id} is ready. Click "Listen" to test it.`);

        // Show additional info about testing
        setTimeout(() => {
          setNotification({
            type: "success",
            message: `To test the enrolled fingerprint: 1) Click "Listen" button, 2) Place the enrolled finger on the scanner. It should detect ID ${id}. Then save the employee to use it for attendance.`,
          });
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: String(err)
      });
      setScanStatus("Enrollment error occurred");
    } finally {
      setTimeout(() => setNotification(null), 8000);
    }
  };

  function toggleEmployeeStatus(id) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" }
          : r
      )
    );
  }

  function openDeleteConfirmation(employee) {
    const currentId = currentUser?.user_id || currentUser?.id;
    const currentUsername = currentUser?.username;
    if (
      (currentId &&
        (employee.user_id === currentId || employee.id === currentId)) ||
      (currentUsername && employee.username === currentUsername)
    ) {
      setNotification({
        type: "error",
        message: "You cannot deactivate your own account while you're logged in.",
      });
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
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to delete employee (${res.status})`);
      }

      const employeeName = employeeToDelete.name;
      setRows((prev) =>
        prev.map((row) => {
          if ((row.user_id || row.id) !== id) return row;
          return { ...row, status: "Inactive" };
        })
      );
      notifyEmployeesUpdated();
      setIsDeleteOpen(false);
      setEmployeeToDelete(null);
      setNotification({
        type: "success",
        message: `Employee "${employeeName}" has been deactivated successfully`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: err.message || "Failed to deactivate employee",
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className={`admin-layout${isSidebarOpen ? "" : " sidebar-collapsed"}`}>
      <aside className={`admin-sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
        <div className="brand">
          <div className="brand-avatar">TI</div>
          <div className="brand-name">Tatay Ilio</div>
        </div>
        <nav className="nav">
          <Link
            className={`nav-item${isActive("/admin/dashboard") ? " active" : ""
              }`}
            to="/admin/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className={`nav-item${isActive("/admin/employee") ? " active" : ""
              }`}
            to="/admin/employee"
          >
            Employees
          </Link>
          <Link
            className={`nav-item${isActive("/admin/schedules") ? " active" : ""
              }`}
            to="/admin/schedules"
          >
            Schedules
          </Link>
          <Link
            className={`nav-item${isActive("/admin/attendance") ? " active" : ""
              }`}
            to="/admin/attendance"
          >
            Attendance
          </Link>
          <Link
            className={`nav-item${isActive("/admin/leave-requests") ? " active" : ""
              }`}
            to="/admin/leave-requests"
          >
            Leave Requests
          </Link>
          <Link
            className={`nav-item${isActive("/admin/announcements") ? " active" : ""
              }`}
            to="/admin/announcements"
          >
            Announcements
          </Link>
          <Link
            className={`nav-item${isActive("/admin/payroll") ? " active" : ""}`}
            to="/admin/payroll"
          >
            Payroll
          </Link>
          <Link
            className={`nav-item${isActive("/admin/reports") ? " active" : ""}`}
            to="/admin/reports"
          >
            Reports
          </Link>
        </nav>
      </aside>
      {isSidebarOpen && isMobileView && (
        <div className="sidebar-backdrop open" onClick={closeSidebar} />
      )}

      <main className="admin-content">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle"
              type="button"
              aria-label={isSidebarOpen ? "Collapse navigation" : "Expand navigation"}
              onClick={toggleSidebar}
            >
              <span aria-hidden="true">{isSidebarOpen ? "✕" : "☰"}</span>
            </button>
            <h1>Employees</h1>
          </div>
          <div className="top-actions">
            <button
              className="profile-btn"
              onClick={() => setIsProfileOpen((v) => !v)}
            >
              <span className="profile-avatar">
                {profileSession.profilePicture ? (
                  <img
                    src={profileSession.profilePicture}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  getInitials()
                )}
              </span>
              <span>{profileSession.displayName}</span>
            </button>
            <div className={`profile-popover${isProfileOpen ? " open" : ""}`}>
              <div
                className="profile-row"
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate("/admin/profile");
                }}
              >
                Profile
              </div>
              <div className="profile-row" onClick={handleLogout}>
                Log out
              </div>
            </div>
          </div>
        </header>

        <section className="employee-card">
          <div className="employee-card__header">
            <input
              className="employee-search"
              placeholder="Search employees..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="header-actions">
              <button
                className="btn outline"
                onClick={() => setFilterOpen((v) => !v)}
              >
                Filter
              </button>
              <button
                className="btn"
                onClick={() => setIsFingerprintManagerOpen(true)}
                disabled={loading}
                style={{ marginRight: "10px" }}
              >
                Manage Fingerprints
              </button>
              <button
                className="btn primary"
                onClick={() => setIsAddOpen(true)}
                disabled={loading}
              >
                Add Employee
              </button>
            </div>
          </div>

          {filterOpen && (
            <div className="filters">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option>All Departments</option>
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
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
            </div>
            <div className="tbody">
              {loading ? (
                <div className="tr">
                  <div>Loading...</div>
                </div>
              ) : (
                filteredRows.map((r) => (
                  <div
                    key={r.id}
                    className="tr clickable-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => openView(r)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openView(r);
                      }
                    }}
                  >
                    <div className="emp-cell" data-title="Full Name">
                      <div className="emp">
                        <div className="emp-avatar">{r.name?.[0]}</div>
                        <div className="emp-meta">
                          <div className="emp-name">{r.name}</div>
                          <div className="emp-email">{r.email}</div>
                        </div>
                      </div>
                    </div>
                    <div className="username-cell" data-title="Username">
                      {r.username}
                    </div>
                    <div className="center" data-title="Role">
                      <span
                        className={`role-badge ${r.role === "admin" ? "admin" : "employee"
                          }`}
                      >
                        {r.role === "admin" ? "Admin" : "Employee"}
                      </span>
                    </div>
                    <div className="center" data-title="Status">
                      <span
                        className={`status ${r.status === "Inactive" ? "danger" : "success"
                          }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="right" data-title="Join Date">
                      {r.joinDate}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {isEditOpen && (
          <div className="modal" role="dialog">
            <div className="modal-body view-modal">
              <div className="modal-header">
                <div className="modal-title">Edit Employee</div>
                <button
                  className="icon-btn"
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelected(null);
                  }}
                >
                  ✖
                </button>
              </div>

              {!selected || (!selected.id && !selected.user_id) ? (
                <div className="employee-details" style={{ padding: "20px", textAlign: "center" }}>
                  <p>Error: Employee data is incomplete. Please try again.</p>
                  <button className="btn" onClick={() => {
                    setIsEditOpen(false);
                    setSelected(null);
                  }}>
                    Close
                  </button>
                </div>
              ) : (
              <div className="employee-details">
                <div className="employee-header">
                  <div className="employee-avatar-large">
                    {(() => {
                      const name = selected?.name || selected?.first_name || "?";
                      return String(name)[0] || "?";
                    })()}
                  </div>
                  <div className="employee-info">
                    <h2 className="employee-name">
                      {selected?.name || 
                       (selected?.first_name && selected?.last_name 
                         ? `${selected.first_name} ${selected.last_name}` 
                         : selected?.first_name || selected?.username || "Unknown Employee")}
                    </h2>
                    <p className="employee-position">{selected?.position || "No Position"}</p>
                    <span
                      className={`status-badge ${(
                        (selected?.status || "Inactive")
                      ).toLowerCase()}`}
                    >
                      {selected?.status || "Unknown"}
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
                          onChange={(e) =>
                            handleEditInputChange("first_name", e.target.value)
                          }
                          className={`detail-input ${editFormErrors.first_name ? "error" : ""
                            }`}
                          required
                        />
                        {editFormErrors.first_name && (
                          <div className="field-error">
                            {editFormErrors.first_name}
                          </div>
                        )}
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Last Name</span>
                        <input
                          name="last_name"
                          value={editLastName}
                          onChange={(e) =>
                            handleEditInputChange("last_name", e.target.value)
                          }
                          className={`detail-input ${editFormErrors.last_name ? "error" : ""
                            }`}
                          required
                        />
                        {editFormErrors.last_name && (
                          <div className="field-error">
                            {editFormErrors.last_name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Email Address</span>
                      <input
                        type="email"
                        name="email"
                        value={editEmail}
                        onChange={(e) =>
                          handleEditInputChange("email", e.target.value)
                        }
                        className={`detail-input ${editFormErrors.email ? "error" : ""
                          }`}
                        required
                      />
                      {editFormErrors.email && (
                        <div className="field-error">
                          {editFormErrors.email}
                        </div>
                      )}
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Phone</span>
                      <input
                        type="text"
                        name="phone"
                        value={editPhone}
                        onChange={(e) =>
                          handleEditInputChange("phone", e.target.value)
                        }
                        placeholder="+63XXXXXXXXXX"
                        className={`detail-input ${editFormErrors.phone ? "error" : ""
                          }`}
                      />
                      {editFormErrors.phone && (
                        <div className="field-error">
                          {editFormErrors.phone}
                        </div>
                      )}
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Address</span>
                      <input
                        type="text"
                        name="address"
                        value={editAddress}
                        onChange={(e) =>
                          handleEditInputChange("address", e.target.value)
                        }
                        placeholder="Enter address"
                        className="detail-input"
                        required
                      />
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Employee ID</span>
                      <span className="detail-value">
                        EMP
                        {String(selected?.user_id || selected?.id || "000").padStart(
                          3,
                          "0"
                        )}
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
                        className={`detail-select ${editFormErrors.dept ? "error" : ""
                          }`}
                        value={editDept}
                        onChange={(e) => {
                          setEditDept(e.target.value);
                          setEditPosition("");
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
                        {(availableDepartments || []).map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      {editFormErrors.dept && (
                        <div className="field-error">{editFormErrors.dept}</div>
                      )}
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Position</span>
                      <select
                        name="position"
                        className={`detail-select ${editFormErrors.position ? "error" : ""
                          }`}
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
                        <option value="">
                          {editDept
                            ? "Select Position"
                            : "Select a department first"}
                        </option>
                        {(
                          (departmentPositions && editDept && departmentPositions[editDept]) ||
                          (editPosition ? [editPosition] : []) ||
                          []
                        ).map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                      {editFormErrors.position && (
                        <div className="field-error">
                          {editFormErrors.position}
                        </div>
                      )}
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
                      <span className="detail-value">{selected?.joinDate || "N/A"}</span>
                    </div>
                  </div>

                  <div className="detail-section biometric-section">
                    <h3>Biometrics</h3>
                    <div className="biometric-item">
                      <div className="biometric-left">
                        <span className="detail-label">
                          Fingerprint Template ID
                        </span>
                      </div>
                      <div className="biometric-right">
                        <input
                          name="finger_template_id"
                          value={editFingerprint || ""}
                          onChange={(e) => setEditFingerprint(e.target.value || "")}
                          placeholder="Enter template ID or scan"
                          autoComplete="off"
                          className="detail-input fingerprint-input"
                        />
                        <div className="bio-actions">
                          <button
                            type="button"
                            className="btn scan-btn"
                            onClick={startFingerprintStream}
                            disabled={scanListening}
                          >
                            Listen
                            <div
                              className={`scan-indicator ${scanListening ? "on" : "off"
                                }`}
                            ></div>
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={stopFingerprintStream}
                            disabled={!scanListening}
                          >
                            Stop
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={enrollOnDevice}
                          >
                            Enroll
                          </button>
                        </div>
                        <div
                          className="field-info"
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            marginTop: "4px",
                            minHeight: "20px",
                            fontWeight: scanStatus ? "500" : "400",
                            color: scanStatus && scanStatus.includes("✅") ? "#10b981" :
                              scanStatus && scanStatus.includes("❌") ? "#ef4444" : scanStatus && scanStatus.includes("🔍") ? "#3b82f6" : "#6b7280",
                          }}
                        >
                          {scanStatus || (
                            <>
                              <strong>Instructions:</strong>
                              <br />
                              1) Click <strong>"Listen"</strong> to start listening for fingerprints
                              <br />
                              2) Click <strong>"Enroll"</strong> and enter ID (1-127) to enroll a new fingerprint
                              <br />
                              3) After enrollment, click <strong>"Listen"</strong> again and place your enrolled finger to test it
                              <br />
                              4) The fingerprint ID will be automatically filled in
                              <br />
                              <em>Update this if the employee re-enrolls on a fingerprint device.</em>
                            </>
                          )}
                        </div>
                        <div className="fingerprint-delete-row">
                          <button
                            type="button"
                            className="btn delete-fingerprint-btn"
                            onClick={handleDeleteFingerprintFromDevice}
                            disabled={
                              deleteFingerprintLoading ||
                              !editFingerprint ||
                              !editFingerprint.trim()
                            }
                          >
                            {deleteFingerprintLoading
                              ? "Deleting..."
                              : "Delete Fingerprint on Device"}
                          </button>
                          <p className="fingerprint-delete-hint">
                            Removes the stored template from the scanner so this ID
                            can be reused confidently.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* === ACTIONS === */}
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setIsEditOpen(false)}
                    >
                      Cancel
                    </button>
                    <button className="btn primary" type="submit">
                      Update Employee
                    </button>
                  </div>
                </form>
              </div>
              )}
            </div>
          </div>
        )}

        {isAddOpen && (
          <div className="modal" role="dialog">
            <div className="modal-body view-modal add-employee-modal">
              <div className="modal-header">
                <div className="modal-title">Add Employee</div>
                <button
                  className="icon-btn"
                  onClick={() => setIsAddOpen(false)}
                >
                  ✖
                </button>
              </div>
              <div className="employee-details">
                <form
                  onSubmit={handleAdd}
                  className="details-grid"
                  autoComplete="off"
                >
                  <div className="detail-section">
                    <h3>Personal Information</h3>
                    <div className="detail-row two">
                      <div className="detail-item">
                        <span className="detail-label">First Name</span>
                        <input
                          name="first_name"
                          placeholder="Enter first name"
                          className={`detail-input ${formErrors.first_name ? "error" : ""
                            }`}
                          value={formData.first_name}
                          onChange={(e) =>
                            handleInputChange("first_name", e.target.value)
                          }
                          required
                        />
                        {formErrors.first_name && (
                          <div className="field-error">
                            {formErrors.first_name}
                          </div>
                        )}
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Last Name</span>
                        <input
                          name="last_name"
                          placeholder="Enter last name"
                          className={`detail-input ${formErrors.last_name ? "error" : ""
                            }`}
                          value={formData.last_name}
                          onChange={(e) =>
                            handleInputChange("last_name", e.target.value)
                          }
                          required
                        />
                        {formErrors.last_name && (
                          <div className="field-error">
                            {formErrors.last_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email Address</span>
                      <input
                        type="email"
                        name="email"
                        placeholder="Enter email address"
                        className={`detail-input ${formErrors.email ? "error" : ""
                          }`}
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        required
                      />
                      {formErrors.email && (
                        <div className="field-error">{formErrors.email}</div>
                      )}
                    </div>
                    <div className="detail-row two">
                      <div className="detail-item">
                        <span className="detail-label">Phone </span>
                        <input
                          name="phone"
                          placeholder="+63XXXXXXXXXX"
                          className={`detail-input ${formErrors.phone ? "error" : ""
                            }`}
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                        />
                        {formErrors.phone && (
                          <div className="field-error">{formErrors.phone}</div>
                        )}
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Address </span>
                        <input
                          name="address"
                          placeholder="Enter address"
                          className="detail-input"
                          value={formData.address}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
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
                        className={`detail-select ${formErrors.dept ? "error" : ""
                          }`}
                        value={formData.dept}
                        onChange={(e) => {
                          const nextDept = e.target.value;
                          // Automatically set role to employee if department doesn't allow admin
                          const allowedAdmin =
                            adminAllowedDepartments.includes(nextDept);
                          const newRole = allowedAdmin
                            ? formData.role
                            : "employee";
                          setFormData((prev) => ({
                            ...prev,
                            dept: nextDept,
                            position: "",
                            role: newRole,
                          }));
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
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      {formErrors.dept && (
                        <div className="field-error">{formErrors.dept}</div>
                      )}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Position</span>
                      <select
                        name="position"
                        className={`detail-select ${formErrors.position ? "error" : ""
                          }`}
                        value={formData.position}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            position: e.target.value,
                          }));
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
                        <option value="">
                          {formData.dept
                            ? "Select Position"
                            : "Select a department first"}
                        </option>
                        {(
                          departmentPositions[formData.dept] ||
                          (formData.position ? [formData.position] : [])
                        ).map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                      {formErrors.position && (
                        <div className="field-error">{formErrors.position}</div>
                      )}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <select
                        name="status"
                        className={`detail-select ${formErrors.status ? "error" : ""
                          }`}
                        value={formData.status}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }));
                          const errors = { ...formErrors };
                          if (e.target.value) {
                            delete errors.status;
                          } else {
                            errors.status = "Status is required";
                          }
                          setFormErrors(errors);
                        }}
                        required
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      {formErrors.status && (
                        <div className="field-error">{formErrors.status}</div>
                      )}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Role</span>
                      <select
                        name="role"
                        className="detail-select"
                        value={formData.role}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            role: e.target.value,
                          }))
                        }
                        required
                        disabled={
                          !formData.dept ||
                          !adminAllowedDepartments.includes(formData.dept)
                        }
                      >
                        <option value="employee">User/Employee</option>
                        {formData.dept &&
                          adminAllowedDepartments.includes(formData.dept) && (
                            <option value="admin">Admin</option>
                          )}
                      </select>
                      {formData.dept &&
                        !adminAllowedDepartments.includes(formData.dept) && (
                          <div
                            className="field-info"
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "4px",
                            }}
                          >
                            Admin role is only available for HR, Management,
                            Accounting, and Branch departments
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
                        className={`detail-input ${formErrors.username ? "error" : ""
                          }`}
                        value={formData.username}
                        onChange={(e) =>
                          handleInputChange("username", e.target.value)
                        }
                        autoComplete="off"
                        pattern="\S+"
                        title="Spaces are not allowed"
                        required
                      />
                      {formErrors.username && (
                        <div className="field-error">{formErrors.username}</div>
                      )}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Password</span>
                      <div className="password-input-container">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Create a password"
                          className={`detail-input ${formErrors.password ? "error" : ""
                            }`}
                          value={formData.password}
                          onChange={(e) =>
                            handleInputChange("password", e.target.value)
                          }
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                      {formErrors.password && (
                        <div className="field-error">{formErrors.password}</div>
                      )}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Confirm Password</span>
                      <div className="password-input-container">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirm_password"
                          placeholder="Re-enter password"
                          className={`detail-input ${formErrors.confirm_password ? "error" : ""
                            }`}
                          value={formData.confirm_password}
                          onChange={(e) =>
                            handleInputChange(
                              "confirm_password",
                              e.target.value
                            )
                          }
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                      {formErrors.confirm_password && (
                        <div className="field-error">
                          {formErrors.confirm_password}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="detail-section biometric-section">
                    <h3>Biometrics <span style={{ color: "#ef4444", fontSize: "14px" }}>*Required</span></h3>
                    <div className="biometric-item">
                      <div className="biometric-left">
                        <span className="detail-label">
                          Fingerprint Template ID <span style={{ color: "#ef4444" }}>*</span>
                        </span>
                      </div>
                      <div className="biometric-right">
                        <input
                          name="finger_template_id"
                          placeholder="Enter template ID or scan"
                          autoComplete="off"
                          className={`detail-input fingerprint-input ${formErrors.finger_template_id ? "error" : ""
                            }`}
                          value={formData.finger_template_id}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              finger_template_id: e.target.value,
                            }))
                          }
                          required
                        />
                        <div className="bio-actions">
                          <button
                            type="button"
                            className="btn scan-btn"
                            onClick={startFingerprintStream}
                            disabled={scanListening}
                          >
                            Listen
                            <div
                              className={`scan-indicator ${scanListening ? "on" : "off"
                                }`}
                            ></div>
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={stopFingerprintStream}
                            disabled={!scanListening}
                          >
                            Stop
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={enrollOnDevice}
                          >
                            Enroll
                          </button>
                        </div>
                        {formErrors.finger_template_id && (
                          <div className="field-error">
                            {formErrors.finger_template_id}
                          </div>
                        )}
                        <div
                          className="field-info"
                          style={{
                            fontSize: "12px",
                            marginTop: "4px",
                            minHeight: "20px",
                            fontWeight: scanStatus ? "500" : "400",
                            color: scanStatus && scanStatus.includes("✅") ? "#10b981" :
                              scanStatus && scanStatus.includes("❌") ? "#ef4444" : "#6b7280",
                          }}
                        >
                          {scanStatus ? (
                            <div style={{ color: scanStatus.includes("✅") ? "#10b981" : scanStatus.includes("❌") ? "#ef4444" : scanStatus.includes("🔍") ? "#3b82f6" : "#6b7280" }}>
                              {scanStatus}
                            </div>
                          ) : (
                            <>
                              <strong style={{ color: "#ef4444" }}>⚠️ Required:</strong> Fingerprint enrollment is mandatory.
                              <br />
                              <strong>Instructions:</strong>
                              <br />
                              1) Click <strong>"Listen"</strong> to start listening for fingerprints
                              <br />
                              2) Click <strong>"Enroll"</strong> and enter ID (1-127) to enroll a new fingerprint
                              <br />
                              3) After enrollment, click <strong>"Listen"</strong> again and place your enrolled finger to test it
                              <br />
                              4) Follow the step-by-step notifications that appear
                              <br />
                              <strong style={{ color: "#ef4444" }}>The employee cannot be added without a fingerprint ID.</strong>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setIsAddOpen(false)}
                      disabled={submitLoading}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn primary"
                      type="submit"
                      disabled={submitLoading}
                    >
                      {submitLoading ? "Adding..." : "Add Employee"}
                    </button>
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
                <button
                  className="icon-btn"
                  onClick={() => setIsViewOpen(false)}
                >
                  ✖
                </button>
              </div>

              <div className="employee-details">
                <div className="employee-header">
                  <div className="employee-avatar-large">
                    {viewEmployee.name?.[0]}
                  </div>
                  <div className="employee-info">
                    <h2 className="employee-name">{viewEmployee.name}</h2>
                    <p className="employee-position">{viewEmployee.position}</p>
                    <span
                      className={`status-badge ${(
                        viewEmployee.status || "Inactive"
                      ).toLowerCase()}`}
                    >
                      {viewEmployee.status || "Unknown"}
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
                      <span className="detail-value">
                        {viewEmployee.username}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Employee ID</span>
                      <span className="detail-value">
                        EMP
                        {String(
                          viewEmployee.user_id || viewEmployee.id
                        ).padStart(3, "0")}
                      </span>
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
                      <span className="detail-value">
                        {viewEmployee.position}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Join Date</span>
                      <span className="detail-value">
                        {viewEmployee.joinDate}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className="detail-value">
                        <span
                          className={`status-badge ${(
                            viewEmployee.status || "Inactive"
                          ).toLowerCase()}`}
                        >
                          {viewEmployee.status || "Unknown"}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Biometrics</h3>
                    <div className="detail-item">
                      <span className="detail-label">Fingerprint Template</span>
                      <span className="detail-value">
                        {viewEmployee.finger_template_id
                          ? viewEmployee.finger_template_id
                          : "Not yet enrolled"}
                      </span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Contact Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Email</span>
                      <span className="detail-value">
                        <a
                          href={`mailto:${viewEmployee.email}`}
                          className="email-link"
                        >
                          {viewEmployee.email}
                        </a>
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone</span>
                      <span className="detail-value">
                        {viewEmployee.phone || "N/A"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Address</span>
                      <span className="detail-value">
                        {viewEmployee.address || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn" onClick={() => setIsViewOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => {
                      setIsViewOpen(false);
                      openEdit(viewEmployee);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      setIsViewOpen(false);
                      openDeleteConfirmation(viewEmployee);
                    }}
                  >
                    Deactivate
                  </button>
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
                <h2 className="delete-modal-title">Deactivate Employee</h2>
                <p className="delete-modal-message">
                  Are you sure you want to deactivate{" "}
                  <strong>{employeeToDelete.name}</strong>? This keeps their
                  history but removes access.
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
                  {deleteLoading ? "Updating..." : "Deactivate Employee"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isFingerprintManagerOpen && (
          <div className="modal" role="dialog">
            <div className="modal-body view-modal" style={{ maxWidth: "900px", maxHeight: "90vh", overflow: "auto" }}>
              <div className="modal-header">
                <div className="modal-title">Fingerprint ID Management</div>
                <button
                  className="icon-btn"
                  onClick={() => setIsFingerprintManagerOpen(false)}
                >
                  ✖
                </button>
              </div>
              <div className="employee-details" style={{ padding: "20px" }}>
                <div style={{ marginBottom: "20px" }}>
                  <p style={{ marginBottom: "10px", color: "#666" }}>
                    Manage fingerprint IDs (1-127). Orphaned IDs are registered on the device but not assigned to any employee.
                  </p>
                  <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                    <div style={{ padding: "10px", background: "#e8f5e9", borderRadius: "4px" }}>
                      <strong>Used:</strong> {analyzeFingerprints.usedCount}
                    </div>
                    <div style={{ padding: "10px", background: "#fff3e0", borderRadius: "4px" }}>
                      <strong>Available:</strong> {analyzeFingerprints.availableCount}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
                  gap: "10px",
                  maxHeight: "60vh",
                  overflowY: "auto",
                  padding: "10px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "4px"
                }}>
                  {analyzeFingerprints.allFingerprints.map((fp) => (
                    <div
                      key={fp.id}
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        background: fp.isUsed ? "#e8f5e9" : "#fff",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <strong>ID: {fp.id}</strong>
                        {fp.isUsed && (
                          <span style={{ 
                            fontSize: "10px", 
                            background: "#4caf50", 
                            color: "white", 
                            padding: "2px 6px", 
                            borderRadius: "10px" 
                          }}>
                            USED
                          </span>
                        )}
                      </div>
                      {fp.isUsed && fp.employee ? (
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          <div><strong>Employee:</strong> {fp.employee.employeeName}</div>
                          <div><strong>Status:</strong> {fp.employee.status}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: "12px", color: "#999" }}>
                          Not assigned
                        </div>
                      )}
                      {!fp.isUsed && (
                        <button
                          className="btn"
                          style={{
                            marginTop: "8px",
                            width: "100%",
                            fontSize: "11px",
                            padding: "6px",
                            background: "#ff9800",
                            color: "white",
                            border: "none",
                          }}
                          onClick={() => deleteOrphanedFingerprint(fp.id)}
                          disabled={deletingFingerprintIds.has(fp.id)}
                        >
                          {deletingFingerprintIds.has(fp.id) ? "Deleting..." : "Delete from Device"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "20px", padding: "15px", background: "#fff3cd", borderRadius: "4px", fontSize: "13px" }}>
                  <strong>Note:</strong> "Delete from Device" removes the fingerprint from the physical scanner device. 
                  This is useful for cleaning up orphaned fingerprints (IDs registered on device but not linked to employees). 
                  Only unassigned IDs can be deleted this way.
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn primary"
                  onClick={() => setIsFingerprintManagerOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {notification && (
          <div className={`notification notification-${notification.type}`}>
            <div className="notification-icon">
              {notification.type === "success" ? "✓" : "✕"}
            </div>
            <div className="notification-content">
              <div className="notification-message">{notification.message}</div>
              <div className="notification-timestamp">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
            <button
              className="notification-close"
              onClick={() => setNotification(null)}
            >
              ✖
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
