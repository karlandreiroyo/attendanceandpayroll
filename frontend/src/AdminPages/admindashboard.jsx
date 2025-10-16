import React, { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "..//AdminPages/admincss/admindashboard.css";

export default function AdminDashboard() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  // Sample data - in a real app, this would come from an API
  const employees = useMemo(() => [
    { id: 1, name: "Ezra Orizal", dept: "IT", status: "Active" },
    { id: 2, name: "Heuben Clyde Dagami", dept: "HR", status: "Active" },
    { id: 3, name: "Jheff Cruz", dept: "Finance", status: "Active" },
    { id: 4, name: "John Ivan Santos", dept: "Marketing", status: "Active" },
    { id: 5, name: "Karl Andrei Royo", dept: "Operations", status: "Active" },
  ], []);

  const attendanceData = useMemo(() => [
    { id: 1, name: "Ezra Orizal", date: new Date().toISOString().slice(0, 10), status: "Present", timeIn: "07:55", timeOut: "17:05" },
    { id: 2, name: "Heuben Clyde Dagami", date: new Date().toISOString().slice(0, 10), status: "Late", timeIn: "08:15", timeOut: "17:00" },
    { id: 3, name: "Jheff Cruz", date: new Date().toISOString().slice(0, 10), status: "Present", timeIn: "07:50", timeOut: "18:30" },
    { id: 4, name: "John Ivan Santos", date: new Date().toISOString().slice(0, 10), status: "Present", timeIn: "08:05", timeOut: "17:10" },
    { id: 5, name: "Karl Andrei Royo", date: new Date().toISOString().slice(0, 10), status: "Absent", timeIn: "-", timeOut: "-" },
  ], []);

  const overtimeRequests = useMemo(() => [
    { id: 1, name: "Ezra Orizal", date: "6/10/2023", hours: 2, status: "Pending" },
    { id: 2, name: "John Ivan Santos", date: "6/12/2023", hours: 2, status: "Pending" },
    { id: 3, name: "Karl Andrei Royo", date: "6/15/2023", hours: 3, status: "Pending" },
  ], []);

  const dashboardStats = useMemo(() => {
    const totalEmployees = employees.length;
    const presentToday = attendanceData.filter(a => a.status === "Present").length;
    const lateToday = attendanceData.filter(a => a.status === "Late").length;
    const absentToday = attendanceData.filter(a => a.status === "Absent").length;
    const pendingOvertime = overtimeRequests.filter(o => o.status === "Pending").length;

    return {
      totalEmployees,
      presentToday,
      lateToday,
      absentToday,
      pendingOvertime
    };
  }, [employees, attendanceData, overtimeRequests]);

  const recentActivities = useMemo(() => [
    { id: 1, action: "clocked in", employee: "Ezra Orizal", time: "7:55 AM", type: "attendance" },
    { id: 2, action: "clocked in late", employee: "Heuben Clyde Dagami", time: "8:15 AM", type: "attendance" },
    { id: 3, action: "requested overtime", employee: "Karl Andrei Royo", time: "5:30 PM", type: "overtime" },
    { id: 4, action: "payroll processed", employee: "System", time: "6:00 PM", type: "payroll" },
  ], []);

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
          <h1>Dashboard</h1>
          <div className="top-actions">
            <button className="profile-btn" onClick={() => setIsProfileOpen((v) => !v)}>
              <span className="profile-avatar">AU</span>
              <span>Admin User</span>
            </button>
            <div className={`profile-popover${isProfileOpen ? " open" : ""}`}>
              <div className="profile-row">Profile</div>
              <div className="profile-row" onClick={() => navigate("/")}>Log out</div>
            </div>
          </div>
        </header>

        <section className="grid grid-4">
          <div className="kpi">
            <div className="kpi-title">Total Employees</div>
            <div className="kpi-value">{dashboardStats.totalEmployees}</div>
          </div>
          <div className="kpi">
            <div className="kpi-title">Present Today</div>
            <div className="kpi-value">{dashboardStats.presentToday}</div>
          </div>
          <div className="kpi">
            <div className="kpi-title">Absent</div>
            <div className="kpi-value">{dashboardStats.absentToday}</div>
          </div>
          <div className="kpi">
            <div className="kpi-title">Late Today</div>
            <div className="kpi-value">{dashboardStats.lateToday}</div>
          </div>
        </section>

        <section className="grid grid-2">
          <div className="card big">
            <div className="card-title">Attendance Overview</div>
            <div className="placeholder">Attendance chart will be displayed here</div>
          </div>
          <div className="card big">
            <div className="card-title">Recent Activities</div>
            <ul className="activity">
              {recentActivities.map(activity => (
                <li key={activity.id}>
                  <span className={`activity-type ${activity.type}`}>
                    {activity.type === 'attendance' && '🕐'}
                    {activity.type === 'overtime' && '⏰'}
                    {activity.type === 'payroll' && '💰'}
                  </span>
                  <span className="activity-text">
                    {activity.employee} {activity.action} at {activity.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid grid-3">
          <div className="card">
            <div className="card-title">Pending Overtime</div>
            <div className="muted">{dashboardStats.pendingOvertime} Pending</div>
            <Link to="/admin/overtime" className="card-link">View Details →</Link>
          </div>
          <div className="card">
            <div className="card-title">Upcoming Payroll</div>
            <div className="muted">Next Payroll Date: {new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
            <Link to="/admin/payroll" className="card-link">Process Payroll →</Link>
          </div>
          <div className="card">
            <div className="card-title">Quick Links</div>
            <ul className="links">
              <li><Link to="/admin/employee">Manage Employees</Link></li>
              <li><Link to="/admin/schedules">Update Schedules</Link></li>
              <li><Link to="/admin/attendance">View Attendance</Link></li>
              <li><Link to="/admin/reports">Generate Reports</Link></li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}


