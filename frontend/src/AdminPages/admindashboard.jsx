import React, { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";

export default function AdminDashboard() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to check active sidebar link
  const isActive = (path) => location.pathname.startsWith(path);

  // Dummy data (replace with API/data fetching later)
  const employees = useMemo(() => [
    { id: 1, name: "John Doe" },
    { id: 2, name: "Jane Smith" },
  ], []);

  const attendanceData = useMemo(() => [
    { id: 1, status: "Present" },
    { id: 2, status: "Late" },
  ], []);

  const overtimeRequests = useMemo(() => [
    { id: 1, status: "Pending" },
  ], []);

  const dashboardStats = useMemo(() => {
    const totalEmployees = employees.length;
    const presentToday = attendanceData.filter(a => a.status === "Present").length;
    const lateToday = attendanceData.filter(a => a.status === "Late").length;
    const absentToday = attendanceData.filter(a => a.status === "Absent").length;
    const pendingOvertime = overtimeRequests.filter(o => o.status === "Pending").length;

    return { totalEmployees, presentToday, lateToday, absentToday, pendingOvertime };
  }, [employees, attendanceData, overtimeRequests]);

  const recentActivities = useMemo(() => [
    { id: 1, type: "attendance", employee: "John Doe", action: "clocked in", time: "9:00 AM" },
    { id: 2, type: "overtime", employee: "Jane Smith", action: "requested overtime", time: "10:00 AM" },
  ], []);

  // --- Logout Function ---
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
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

      {/* Main Content */}
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
              <div className="profile-row" onClick={handleLogout}>Log out</div>
            </div>
          </div>
        </header>

        {/* KPI Section */}
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

        {/* Attendance & Activities */}
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
      </main>
    </div>
  );
}
