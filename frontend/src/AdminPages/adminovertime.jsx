import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../AdminPages/admincss/adminOvertime.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";

export default function AdminOvertime() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => getSessionUserProfile());
  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileData);
    return unsubscribe;
  }, []);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [deptFilter, setDeptFilter] = useState("All Departments");

  const [rows, setRows] = useState([]);

  const filtered = useMemo(() => {
    let filtered = rows;
    
    // Text search filter
    const q = query.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(r => `${r.name} ${r.dept}`.toLowerCase().includes(q));
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

  const summary = useMemo(() => ({
    pending: rows.filter(r => r.status === "Pending").length,
    approved: rows.filter(r => r.status === "Approved").length,
    rejected: rows.filter(r => r.status === "Rejected").length,
    hours: rows.reduce((t, r) => t + Number(r.hours || 0), 0),
  }), [rows]);

  function setStatus(id, newStatus) {
    setRows(prev => prev.map(r => 
      r.id === id ? { ...r, status: newStatus } : r
    ));
    alert(`Overtime request #${id} ${newStatus.toLowerCase()}d successfully!`);
  }

  function addOvertimeRequest() {
    const name = prompt("Employee Name:");
    const dept = prompt("Department:");
    const date = prompt("Overtime Date (MM/DD/YYYY):");
    const hours = prompt("Hours:");
    const time = prompt("Time Range (e.g., 17:00 - 19:00):");
    
    if (name && dept && date && hours && time) {
      const newRequest = {
        id: Math.max(...rows.map(r => r.id)) + 1,
        name,
        dept,
        date,
        req: new Date().toLocaleDateString(),
        hours: parseFloat(hours),
        time,
        status: "Pending"
      };
      setRows(prev => [...prev, newRequest]);
    }
  }

  function exportOvertime() {
    const csvContent = [
      ["Employee", "Department", "Date", "Request Date", "Hours", "Time", "Status"],
      ...filtered.map(row => [
        row.name,
        row.dept,
        row.date,
        row.req,
        row.hours,
        row.time,
        row.status
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overtime-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

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
          <Link className={`nav-item${isActive('/admin/leave-requests') ? ' active' : ''}`} to="/admin/leave-requests">Leave Requests</Link>
          <Link className={`nav-item${isActive('/admin/overtime') ? ' active' : ''}`} to="/admin/overtime">Overtime</Link>
          <Link className={`nav-item${isActive('/admin/payroll') ? ' active' : ''}`} to="/admin/payroll">Payroll</Link>
          <Link className={`nav-item${isActive('/admin/reports') ? ' active' : ''}`} to="/admin/reports">Reports</Link>
        </nav>
      </aside>

      <main className="admin-content">
        <header className="admin-topbar">
          <h1>Overtime Requests</h1>
          <div className="top-actions">
            <button className="profile-btn" onClick={() => setIsProfileOpen(v => !v)}>
              <span className="profile-avatar">
                {profileData.profilePicture ? (
                  <img
                    src={profileData.profilePicture}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  profileData.initials
                )}
              </span>
              <span>{profileData.displayName}</span>
            </button>
            <div className={`profile-popover${isProfileOpen ? " open" : ""}`}>
              <div className="profile-row" onClick={() => { setIsProfileOpen(false); navigate('/admin/profile'); }}>Profile</div>
              <div className="profile-row" onClick={() => { setIsProfileOpen(false); logout(); }}>Log out</div>
            </div>
          </div>
        </header>

        <section className="ot-grid">
          <div className="cards">
            <div className="mini-card">
              <div className="mini-title">Pending</div>
              <div className="mini-value">{summary.pending}</div>
            </div>
            <div className="mini-card">
              <div className="mini-title">Approved</div>
              <div className="mini-value">{summary.approved}</div>
            </div>
            <div className="mini-card">
              <div className="mini-title">Rejected</div>
              <div className="mini-value">{summary.rejected}</div>
            </div>
            <div className="mini-card">
              <div className="mini-title">Total Hours</div>
              <div className="mini-value">{summary.hours}</div>
            </div>
          </div>

          <div className="toolbar">
            <input className="search" placeholder="Search requests..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="toolbar-right">
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
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
              <button className="btn" onClick={addOvertimeRequest}>Add Request</button>
              <button className="btn warn" onClick={exportOvertime}>Export</button>
            </div>
          </div>

          <div className="ot-table">
            <div className="ot-head">
              <div>Employee</div>
              <div>Date</div>
              <div>Hours</div>
              <div>Time</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            <div className="ot-body">
              {filtered.map(r => (
                <div key={r.id} className="ot-row">
                  <div>
                    <div className="emp">
                      <div className="emp-avatar">{r.name[0]}</div>
                      <div className="emp-meta">
                        <div className="emp-name">{r.name}</div>
                        <div className="emp-email">{r.dept}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div>{r.date}</div>
                    <div className="sub">Requested: {r.req}</div>
                  </div>
                  <div>{r.hours} hrs</div>
                  <div>{r.time}</div>
                  <div>
                    {r.status === "Approved" && <span className="pill pill-success">Approved</span>}
                    {r.status === "Pending" && <span className="pill pill-warn">Pending</span>}
                    {r.status === "Rejected" && <span className="pill pill-danger">Rejected</span>}
                  </div>
                  <div className="actions">
                    <button className="btn success" onClick={() => setStatus(r.id, "Approve")}>✓ Approve</button>
                    <button className="btn danger" onClick={() => setStatus(r.id, "Reject")}>✕ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


