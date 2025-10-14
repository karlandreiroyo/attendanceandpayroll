import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/admindashboard.css";
import "../AdminPages/admincss/adminattendance.css";

export default function AdminAttendance() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [deptFilter, setDeptFilter] = useState("All Departments");

  const [rows, setRows] = useState([
    { id: 1, name: "Ezra Orizal", empId: "EMP001", dept: "IT", date: "6/1/2023", in: "07:55:23", out: "17:05:12", status: "Present", total: "9:10", ot: "1:05" },
    { id: 2, name: "Heuben Clyde Dagami", empId: "EMP002", dept: "HR", date: "6/1/2023", in: "08:15:05", out: "17:00:30", status: "Late", total: "8:45", ot: "0:00" },
    { id: 3, name: "Jheff Cruz", empId: "EMP003", dept: "Finance", date: "6/1/2023", in: "07:50:11", out: "18:30:22", status: "Present", total: "10:40", ot: "2:30" },
    { id: 4, name: "John Ivan Santos", empId: "EMP004", dept: "Marketing", date: "6/1/2023", in: "08:05:33", out: "17:10:45", status: "Present", total: "9:05", ot: "1:10" },
    { id: 5, name: "Karl Andrei Royo", empId: "EMP005", dept: "Operations", date: "6/1/2023", in: "-", out: "-", status: "Absent", total: "0:00", ot: "0:00" },
  ]);

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
        row.ot
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
          <h1>Attendance</h1>
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
                <option>All Departments</option>
                <option>IT</option>
                <option>HR</option>
                <option>Finance</option>
                <option>Marketing</option>
                <option>Operations</option>
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
              {filtered.map(r => (
                <div key={r.id} className="att-row">
                  <div>
                    <div className="emp">
                      <div className="emp-avatar">{r.name[0]}</div>
                      <div className="emp-meta">
                        <div className="emp-name">{r.name}</div>
                        <div className="emp-email">{r.empId}</div>
                      </div>
                    </div>
                  </div>
                  <div>{r.date}</div>
                  <div>{r.in}</div>
                  <div>{r.out}</div>
                  <div>
                    {r.status === "Present" && <span className="pill pill-success">Present</span>}
                    {r.status === "Late" && <span className="pill pill-warn">Late</span>}
                    {r.status === "Absent" && <span className="pill pill-danger">Absent</span>}
                  </div>
                  <div>{r.total}</div>
                  <div>{r.ot}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


