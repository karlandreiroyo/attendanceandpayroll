import React, { useState, useMemo, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";

export default function AdminDashboard() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => getSessionUserProfile());
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileData);
    return unsubscribe;
  }, []);

  // Session destroyer function
  const handleLogout = () => {
    // Close profile popover
    setIsProfileOpen(false);
    // Call logout utility
    logout();
  };

  // Employee data will be fetched from API
  const employees = useMemo(() => [], []);

  const attendanceData = useMemo(() => [], []);

  const overtimeRequests = useMemo(() => [], []);

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

  const recentActivities = useMemo(() => [], []);

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
              <div className="profile-row" onClick={handleLogout}>Log out</div>
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


