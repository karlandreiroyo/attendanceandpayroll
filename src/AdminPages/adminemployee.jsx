import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/admindashboard.css";
import "../AdminPages/admincss/adminemployee.css";

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

  const [rows, setRows] = useState([
    { id: 1, name: "Ezra Orizal", email: "ezra@tatayilio.com", dept: "IT", position: "Software Developer", status: "Active", joinDate: "5/15/2021" },
    { id: 2, name: "Heuben Clyde Dagami", email: "heuben@tatayilio.com", dept: "HR", position: "HR Manager", status: "Active", joinDate: "3/10/2020" },
    { id: 3, name: "Jheff Cruz", email: "jheff@tatayilio.com", dept: "Finance", position: "Accountant", status: "Active", joinDate: "1/5/2022" },
    { id: 4, name: "John Ivan Santos", email: "john@tatayilio.com", dept: "Marketing", position: "Marketing Specialist", status: "Active", joinDate: "8/22/2021" },
    { id: 5, name: "Karl Andrei Royo", email: "karl@tatayilio.com", dept: "Operations", position: "Operations Manager", status: "Active", joinDate: "11/30/2019" },
  ]);

  const filteredRows = useMemo(() => {
    let filtered = rows;
    
    // Text search filter
    const q = query.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(r => `${r.name} ${r.email} ${r.dept} ${r.position}`.toLowerCase().includes(q));
    }
    
    // Department filter
    if (deptFilter !== "All Departments") {
      filtered = filtered.filter(r => r.dept === deptFilter);
    }
    
    // Status filter
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
  }

  function handleAdd(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next = {
      id: Math.max(0, ...rows.map(r => r.id)) + 1,
      name: data.get("name"),
      email: data.get("email"),
      dept: data.get("dept"),
      position: data.get("position"),
      status: "Active",
      joinDate: new Date().toLocaleDateString(),
    };
    setRows(prev => [...prev, next]);
    setIsAddOpen(false);
    // Reset form
    e.target.reset();
    // Show success notification
    setNotification({
      type: 'success',
      message: `Employee "${next.name}" has been added successfully!`
    });
    // Auto-hide notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
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

  // Close actions dropdown when clicking outside
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
              <button className="btn primary" onClick={() => setIsAddOpen(true)}>Add Employee</button>
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
              <div>Employee</div>
              <div>Department</div>
              <div>Position</div>
              <div>Status</div>
              <div>Join Date</div>
              <div className="right">Actions</div>
            </div>
            <div className="tbody">
              {filteredRows.map(r => (
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
                  <div>{r.dept}</div>
                  <div>{r.position}</div>
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
              ))}
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
                    <div className="detail-item">
                      <span className="detail-label">Full Name</span>
                      <input 
                        name="name" 
                        placeholder="Enter full name" 
                        className="detail-input"
                        required 
                      />
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
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Employee ID</span>
                      <span className="detail-value">Auto-generated</span>
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
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Position</span>
                      <input 
                        name="position" 
                        placeholder="Enter position" 
                        className="detail-input"
                        required 
                      />
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <select name="status" className="detail-select" required>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Join Date</span>
                      <span className="detail-value">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn" onClick={() => setIsAddOpen(false)}>Cancel</button>
                    <button className="btn primary" type="submit">Add Employee</button>
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

        {/* Notification */}
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


