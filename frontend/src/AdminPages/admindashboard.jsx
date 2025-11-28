import React, { useState, useMemo, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import { API_BASE_URL } from "../config/api";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { useSidebarState } from "../hooks/useSidebarState";

export default function AdminDashboard() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => getSessionUserProfile());
  const [employeeCount, setEmployeeCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const { isSidebarOpen, toggleSidebar, closeSidebar, isMobileView } = useSidebarState();

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileData);
    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadEmployeeCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users`, { credentials: "include" });
        if (!res.ok) return;
        const users = await res.json();
        if (isMounted) {
          setEmployeeCount(Array.isArray(users) ? users.length : 0);
        }
      } catch (err) {
        console.error("Failed to load employee count:", err);
      }
    };

    loadEmployeeCount();

    const handler = () => loadEmployeeCount();
    window.addEventListener('employees-refresh', handler);

    return () => {
      isMounted = false;
      window.removeEventListener('employees-refresh', handler);
    };
  }, []);

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
  };

  const [attendanceData, setAttendanceData] = useState({
    present: 0,
    late: 0,
    absent: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);

  // Load today's attendance summary
  useEffect(() => {
    const loadTodayAttendance = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`${API_BASE_URL}/attendance/summary?date=${today}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setAttendanceData({
            present: data.present || 0,
            late: data.late || 0,
            absent: data.absent || 0,
          });
        }
      } catch (err) {
        console.error("Failed to load today's attendance:", err);
      }
    };

    loadTodayAttendance();
    // Refresh every 5 minutes
    const interval = setInterval(loadTodayAttendance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load recent activities
  useEffect(() => {
    const loadRecentActivities = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`${API_BASE_URL}/attendance/records?startDate=${today}&endDate=${today}`, {
          credentials: "include",
        });
        if (res.ok) {
          const records = await res.json();
          const activities = records.slice(0, 10).map((record) => {
            // Handle nested structure: record.employees.users
            const employees = Array.isArray(record.employees) ? record.employees[0] : record.employees;
            const users = Array.isArray(employees?.users) ? employees.users[0] : employees?.users;
            const userName = users 
              ? `${users.first_name || ''} ${users.last_name || ''}`.trim() || 'Unknown'
              : 'Unknown';
            const timeIn = record.time_in || '-';
            const timeOut = record.time_out || '-';
            return {
              id: record.attendance_id || record.id,
              type: 'attendance',
              employee: userName,
              action: record.time_out ? 'timed out' : 'timed in',
              time: record.time_out || record.time_in || '-',
            };
          });
          setRecentActivities(activities);
        }
      } catch (err) {
        console.error("Failed to load recent activities:", err);
      }
    };

    loadRecentActivities();
    // Refresh every 2 minutes
    const interval = setInterval(loadRecentActivities, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const dashboardStats = useMemo(() => {
    return {
      totalEmployees: employeeCount,
      presentToday: attendanceData.present,
      lateToday: attendanceData.late,
      absentToday: attendanceData.absent,
    };
  }, [employeeCount, attendanceData]);

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
            <h1>Dashboard</h1>
          </div>
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
            <div className="card-title">Leave Requests</div>
            <div className="muted">Review pending submissions from employees.</div>
            <Link to="/admin/leave-requests" className="card-link">Manage Leave Requests →</Link>
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


