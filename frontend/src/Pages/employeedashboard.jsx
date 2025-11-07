import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css"; // Use admin layout CSS
import "../Pages/employeecss/employeeDashboard.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [isTopUserOpen, setIsTopUserOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState(getSessionUserProfile());
  const [todayLabel] = useState(() =>
    new Date().toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  );
  const [leaveBalances] = useState([]);
  const [announcements] = useState([]);

  // Session destroyer function
  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Close profile popover
    setIsTopUserOpen(false);
    // Call logout utility
    logout();
  };

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileInfo);
    return () => unsubscribe();
  }, []);

  return (
    <div className="admin-layout">
      {/* Sidebar - matches admin layout */}
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-avatar">TI</div>
          <div className="brand-name">Tatay Ilio</div>
        </div>
        <nav className="nav">
          <Link className="nav-item active" to="/employee/dashboard">Dashboard</Link>
          <Link className="nav-item" to="/employee/schedules">Schedules</Link>
          <Link className="nav-item" to="/employee/leave-requests">Leave Requests</Link>
          <Link className="nav-item" to="/employee/payslips">Payslips</Link>
        </nav>
      </aside>

      {/* Main content - matches admin layout */}
      <main className="admin-content">
        <header className="admin-topbar">
          <h1>Dashboard</h1>
          <div className="top-actions">
            <button
              className="profile-btn"
              onClick={() => setIsTopUserOpen((v) => !v)}
            >
              <span className="profile-avatar">{profileInfo.initials}</span>
              <span>{profileInfo.displayName}</span>
            </button>
            <div
              className={`profile-popover${isTopUserOpen ? " open" : ""}`}
            >
              <div
                className="profile-row"
                onClick={() => {
                  navigate("/employee/profile");
                  setIsTopUserOpen(false);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("/employee/profile");
                    setIsTopUserOpen(false);
                  }
                }}
              >
                Profile
              </div>
              <div 
                className="profile-row" 
                onClick={handleLogout}
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLogout(e);
                  }
                }}
              >
                Log out
              </div>
            </div>
          </div>
        </header>

        <section className="welcome-card">
          <div className="welcome-title">
            Welcome, <strong>{profileInfo.displayName}</strong>
          </div>
          <div className="welcome-sub">{todayLabel}</div>
        </section>

        <section className="quick-grid">
          <Link className="quick-card" to="/employee/schedules">
            <div className="qc-left">
              <div className="qc-icon">📅</div>
              <div>
                <div className="qc-title">Work Schedules</div>
                <div className="qc-sub">View your upcoming work shifts</div>
              </div>
            </div>
            <div className="qc-chevron">›</div>
          </Link>

          <Link className="quick-card" to="/employee/leave-requests">
            <div className="qc-left">
              <div className="qc-icon">⏱️</div>
              <div>
                <div className="qc-title">Leave Requests</div>
                <div className="qc-sub">Request time o`ff or report absence</div>
              </div>
            </div>
            <div className="qc-chevron">›</div>
          </Link>

          <Link className="quick-card" to="/employee/payslips">
            <div className="qc-left">
              <div className="qc-icon">📄</div>
              <div>
                <div className="qc-title">Payslips</div>
                <div className="qc-sub">Access and download your payslips</div>
              </div>
            </div>
            <div className="qc-chevron">›</div>
          </Link>
        </section>

        <section className="grid-2">
          <div className="card">
            <div className="card-title">Leave Balance</div>
            {leaveBalances.length === 0 ? (
              <div className="empty-state">
                Leave balance data will appear here once available.
              </div>
            ) : (
              <div className="bars">
                {leaveBalances.map((leave) => (
                  <div className="bar-row" key={leave.type || leave.label}>
                    <span>{leave.label || leave.type}</span>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Number.isFinite((leave.used / leave.total) * 100)
                              ? Math.round((leave.used / leave.total) * 100)
                              : 0
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link className="link" to="/employee/leave-requests">Request leave →</Link>
          </div>

          <div className="card">
            <div className="card-title">Recent Announcements</div>
            {announcements.length === 0 ? (
              <div className="empty-state">
                Announcements will appear here once they are published.
              </div>
            ) : (
              announcements.map((item) => (
                <div className="announcement" key={item.id}>
                  <div className="ann-title">{item.title}</div>
                  <div className="ann-body">{item.body}</div>
                  <div className="ann-date">{item.date}</div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <div className="section-head">
            <div className="section-title">Your Attendance</div>
          </div>
          <div className="empty-state">
            Attendance analytics will appear here once your records are available.
          </div>
        </section>
      </main>
    </div>
  );
}
