import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../AdminPages/admincss/adminEmployee.css";
import { API_BASE_URL } from "../config/api";

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
  const [openActionsId, setOpenActionsId] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewEmployee, setViewEmployee] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [rows, setRows] = useState([]);

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
          id: u.id,
          name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username,
          username: u.username,
          role: u.role || 'employee',
          email: u.email,
          dept: u.department,
          position: u.position,
          status: u.status || "Active",
          joinDate: u.join_date || new Date().toLocaleDateString(),
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
    setIsEditOpen(true);
  }

  function openView(row) {
    setViewEmployee(row);
    setIsViewOpen(true);
  }

  function handleUpdate(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const updated = {
      ...selected,
      name: data.get("name"),
      email: data.get("email"),
      dept: data.get("dept"),
      position: data.get("position"),
      status: data.get("status"),
    };
    setRows(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    setIsEditOpen(false);
    setSelected(null);
    setOpenActionsId(null); // Reset dropdown state after update
  }

  function validateAddForm(formData) {
    const errors = {};
    const firstName = formData.get("first_name")?.trim();
    const lastName = formData.get("last_name")?.trim();
    const email = formData.get("email")?.trim();
    const dept = formData.get("dept")?.trim();
    const position = formData.get("position")?.trim();
    const username = formData.get("username")?.trim();
    const password = formData.get("password") || "";
    const confirmPassword = formData.get("confirm_password") || "";

    if (!firstName) errors.first_name = "First name is required";
    if (!lastName) errors.last_name = "Last name is required";
    if (!email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email";
    if (!dept) errors.dept = "Department is required";
    if (!position) errors.position = "Position is required";
    if (!username) errors.username = "Username is required";
    if (!password) errors.password = "Password is required";
    else if (password.length < 6) errors.password = "Password must be at least 6 characters";
    if (confirmPassword !== password) errors.confirm_password = "Passwords do not match";

    return errors;
  }

  async function handleAdd(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    const errors = validateAddForm(data);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      username: data.get("username"),
      password: data.get("password"),
      first_name: data.get("first_name"),
      last_name: data.get("last_name"),
      email: data.get("email"),
      department: data.get("dept"),
      position: data.get("position"),
      status: data.get("status") || "Active",
      phone: data.get("phone") || undefined,
      address: data.get("address") || undefined,
      role: "employee",
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
        id: created.id,
        name: [created.first_name, created.last_name].filter(Boolean).join(" ") || created.username,
        username: created.username,
        role: created.role || 'employee',
        email: created.email,
        dept: created.department,
        position: created.position,
        status: created.status || "Active",
        joinDate: created.join_date || new Date().toLocaleDateString(),
      };
      setRows(prev => [...prev, newRow]);
      setIsAddOpen(false);
      e.currentTarget.reset();
      setFormErrors({});
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

  function deleteEmployee(id) {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      setRows(prev => prev.filter(x => x.id !== id));
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
              <button className="btn primary" onClick={() => setIsAddOpen(true)} disabled={loading}>Add Employee</button>
            </div>
          </div>

          {filterOpen && (
            <div className="filters">
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option>All Departments</option>
                <option>IT</option>
                <option>HR</option>
                <option>Finance</option>
                <option>Marketing</option>
                <option>Operations</option>
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
              <div className="actions-header">Actions</div>
            </div>
            <div className="tbody">
              {loading ? (
                <div className="tr"><div>Loading...</div></div>
              ) : (
                filteredRows.map(r => (
                  <div key={r.id} className="tr">
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
                    <div><span className="status success">{r.status}</span></div>
                    <div>{r.joinDate}</div>
                    <div className="right">
                      <div className="actions-dropdown">
                        <button 
                          className="actions-btn" 
                          onClick={() => setOpenActionsId(openActionsId === r.id ? null : r.id)}
                        >
                          Details
                        </button>
                        {openActionsId === r.id && (
                          <div className="actions-menu">
                            <button className="action-item" onClick={() => openView(r)}>
                              View
                            </button>
                            <button className="action-item" onClick={() => openEdit(r)}>
                              Edit
                            </button>
                            <button 
                              className="action-item" 
                              onClick={() => toggleEmployeeStatus(r.id)}
                            >
                              {r.status === "Active" ? " Deactivate" : " Activate"}
                            </button>
                            <button className="action-item" onClick={() => deleteEmployee(r.id)}>
                              Delete
                            </button>
                          </div>
                        )}
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
                    <div className="detail-item">
                      <span className="detail-label">Full Name</span>
                      <input 
                        name="name" 
                        defaultValue={selected.name} 
                        className="detail-input"
                        required 
                      />
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
                      <span className="detail-label">Employee ID</span>
                      <span className="detail-value">EMP{String(selected.id).padStart(3, '0')}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Work Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Department</span>
                      <select name="dept" defaultValue={selected.dept} className="detail-select" required>
                        <option>IT</option>
                        <option>HR</option>
                        <option>Finance</option>
                        <option>Marketing</option>
                        <option>Operations</option>
                      </select>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Position</span>
                      <input 
                        name="position" 
                        defaultValue={selected.position} 
                        className="detail-input"
                        required 
                      />
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
                <div className="employee-header">
                  <div className="employee-avatar-large">
                    <span className="add-icon">+</span>
                  </div>
                  <div className="employee-info">
                    <h2 className="employee-name">New Employee</h2>
                    <p className="employee-position">Add employee details below</p>
                    <span className="status-badge active">
                      Active
                    </span>
                  </div>
                </div>

                <form onSubmit={handleAdd} className="details-grid">
                  <div className="detail-section">
                    <h3>Personal Information</h3>
                    <div className="detail-row two">
                      <div className="detail-item">
                        <span className="detail-label">First Name</span>
                        <input 
                          name="first_name" 
                          placeholder="Enter first name" 
                          className="detail-input"
                          required 
                        />
                        {formErrors.first_name && <div className="field-error">{formErrors.first_name}</div>}
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Last Name</span>
                        <input 
                          name="last_name" 
                          placeholder="Enter last name" 
                          className="detail-input"
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
                        className="detail-input"
                        required 
                      />
                      {formErrors.email && <div className="field-error">{formErrors.email}</div>}
                    </div>
                    <div className="detail-row two">
                      <div className="detail-item">
                        <span className="detail-label">Phone </span>
                        <input name="phone" placeholder="Enter phone number" className="detail-input" />
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Address </span>
                        <input name="address" placeholder="Enter address" className="detail-input" />
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Work Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Department</span>
                      <select name="dept" className="detail-select" required>
                        <option value="">Select Department</option>
                        <option>IT</option>
                        <option>HR</option>
                        <option>Finance</option>
                        <option>Marketing</option>
                        <option>Operations</option>
                      </select>
                      {formErrors.dept && <div className="field-error">{formErrors.dept}</div>}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Position</span>
                      <input 
                        name="position" 
                        placeholder="Enter position" 
                        className="detail-input"
                        required 
                      />
                      {formErrors.position && <div className="field-error">{formErrors.position}</div>}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <select name="status" className="detail-select" required defaultValue="Active">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Account</h3>
                    <div className="detail-row two">
                      <div className="detail-item">
                        <span className="detail-label">Username</span>
                        <input name="username" placeholder="Choose a username" className="detail-input" required />
                        {formErrors.username && <div className="field-error">{formErrors.username}</div>}
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Password</span>
                        <input type="password" name="password" placeholder="Create a password" className="detail-input" required />
                        {formErrors.password && <div className="field-error">{formErrors.password}</div>}
                      </div>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Confirm Password</span>
                      <input type="password" name="confirm_password" placeholder="Re-enter password" className="detail-input" required />
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
                      <span className="detail-label">Employee ID</span>
                      <span className="detail-value">EMP{String(viewEmployee.id).padStart(3, '0')}</span>
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
                      <span className="detail-value">123 Main Street, City, Philippines</span>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn" onClick={() => setIsViewOpen(false)}>Close</button>
                  <button className="btn primary" onClick={() => {
                    setIsViewOpen(false);
                    openEdit(viewEmployee);
                  }}>Edit Employee</button>
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


