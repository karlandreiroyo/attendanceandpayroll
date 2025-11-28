import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../AdminPages/admincss/adminAttendance.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { useSidebarState } from "../hooks/useSidebarState";
import { API_BASE_URL } from "../config/api";

export default function AdminAttendance() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => getSessionUserProfile());
  const { isSidebarOpen, toggleSidebar, closeSidebar, isMobileView } = useSidebarState();
  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileData);
    return unsubscribe;
  }, []);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [deptFilter, setDeptFilter] = useState("All Departments");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState(["All Departments"]);

  const filtered = useMemo(() => {
    let filtered = rows;
    
    // Text search filter
    const q = query.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(r => `${r.name} ${r.empId}`.toLowerCase().includes(q));
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
    present: rows.filter(r => r.status === "Present").length,
    late: rows.filter(r => r.status === "Late").length,
    absent: rows.filter(r => r.status === "Absent").length,
    total: rows.length,
  }), [rows]);

  useEffect(() => {
    if (isMobileView) {
      closeSidebar();
    }
  }, [location.pathname, isMobileView, closeSidebar]);

  // Load departments
  useEffect(() => {
    async function loadDepartments() {
      try {
        const res = await fetch(`${API_BASE_URL}/users`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const unique = new Set(["All Departments"]);
        (Array.isArray(data) ? data : []).forEach((user) => {
          const department = user.department || user.dept || "Unassigned";
          if (department) unique.add(department);
        });
        setDepartments(Array.from(unique));
      } catch (err) {
        console.error("Failed to load departments", err);
      }
    }
    loadDepartments();
  }, []);

  // Load attendance data
  useEffect(() => {
    async function loadAttendance() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          date: date,
        });
        if (deptFilter && deptFilter !== "All Departments") {
          params.append("department", deptFilter);
        }

        const res = await fetch(`${API_BASE_URL}/attendance/summary?${params.toString()}`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to load attendance data");
        }

        const data = await res.json();
        
        // The backend returns { present, late, absent, total, records }
        // records contains the formatted attendance data
        if (data && data.records) {
          setRows(data.records || []);
        } else {
          setRows([]);
        }
      } catch (err) {
        console.error("Error loading attendance:", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, [date, deptFilter]);

  function exportAttendance() {
    const csvContent = [
      ["Employee", "Employee ID", "Department", "Date", "Time In", "Time Out", "Status", "Total Hours", "Overtime"],
      ...filtered.map(row => [
        row.name,
        row.empId, 
        row.dept,
        row.date,
        row.in,
        row.out,
        row.status,
        row.total,
        "-"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function addManualEntry() {
    const name = prompt("Employee Name:");
    const empId = prompt("Employee ID:");
    const dept = prompt("Department:");
    const timeIn = prompt("Time In (HH:MM):");
    const timeOut = prompt("Time Out (HH:MM):");
    
    if (name && empId && dept && timeIn && timeOut) {
      const newEntry = {
        id: Math.max(...rows.map(r => r.id)) + 1,
        name,
        empId,
        dept,
        date: new Date().toLocaleDateString(),
        in: timeIn,
        out: timeOut,
        status: "Present",
        total: "8:00", // Simplified calculation
        ot: "0:00"
      };
      setRows(prev => [...prev, newEntry]);
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
          <Link className={`nav-item${isActive('/admin/dashboard') ? ' active' : ''}`} to="/admin/dashboard">Dashboard</Link>
          <Link className={`nav-item${isActive('/admin/employee') ? ' active' : ''}`} to="/admin/employee">Employees</Link>
          <Link className={`nav-item${isActive('/admin/schedules') ? ' active' : ''}`} to="/admin/schedules">Schedules</Link>
          <Link className={`nav-item${isActive('/admin/attendance') ? ' active' : ''}`} to="/admin/attendance">Attendance</Link>
          <Link className={`nav-item${isActive('/admin/leave-requests') ? ' active' : ''}`} to="/admin/leave-requests">Leave Requests</Link>
          <Link className={`nav-item${isActive('/admin/announcements') ? ' active' : ''}`} to="/admin/announcements">Announcements</Link>
          <Link className={`nav-item${isActive('/admin/payroll') ? ' active' : ''}`} to="/admin/payroll">Payroll</Link>
          <Link className={`nav-item${isActive('/admin/reports') ? ' active' : ''}`} to="/admin/reports">Reports</Link>
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
            <h1>Attendance</h1>
          </div>
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

        <section className="attendance-grid">
          <div className="cards">
            <div className="mini-card">
              <div className="mini-title">Present</div>
              <div className="mini-value">{summary.present}</div>
            </div>
            <div className="mini-card">
              <div className="mini-title">Late</div>
              <div className="mini-value">{summary.late}</div>
            </div>
            <div className="mini-card">
              <div className="mini-title">Absent</div>
              <div className="mini-value">{summary.absent}</div>
            </div>
            <div className="mini-card">
              <div className="mini-title">Total</div>
              <div className="mini-value">{summary.total}</div>
            </div>
          </div>

          <div className="toolbar">
            <input className="search" placeholder="Search employee..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="toolbar-right">
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All Status</option>
                <option>Present</option>
                <option>Late</option>
                <option>Absent</option>
              </select>
              <input className="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <button className="btn" onClick={addManualEntry}>Add Entry</button>
              <button className="btn warn" onClick={exportAttendance}>Export</button>
            </div>
          </div>

          <div className="att-table">
            <div className="att-head">
              <div>Employee</div>
              <div>Date</div>
              <div>Time In</div>
              <div>Time Out</div>
              <div>Status</div>
              <div>Total Hours</div>
              <div>Overtime</div>
            </div>
            <div className="att-body">
              {loading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                  Loading attendance data...
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                  No attendance records found for this date.
                </div>
              ) : (
                filtered.map((r, index) => (
                  <div key={r.id || index} className="att-row">
                    <div>
                      <div className="emp">
                        <div className="emp-avatar">{(r.name && r.name[0]) || "?"}</div>
                        <div className="emp-meta">
                          <div className="emp-name">{r.name || "Unknown"}</div>
                          <div className="emp-email">{r.empId || ""}</div>
                        </div>
                      </div>
                    </div>
                    <div>{r.date || date}</div>
                    <div>{r.in || "-"}</div>
                    <div>{r.out || "-"}</div>
                    <div>
                      {r.status === "Present" && <span className="pill pill-success">Present</span>}
                      {r.status === "Late" && <span className="pill pill-warn">Late</span>}
                      {r.status === "Absent" && <span className="pill pill-danger">Absent</span>}
                    </div>
                    <div>{r.total || "0:00"}</div>
                    <div>-</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


