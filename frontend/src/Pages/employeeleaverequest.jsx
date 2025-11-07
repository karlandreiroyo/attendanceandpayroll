import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css"; // Use admin layout CSS
import "../Pages/employeecss/employeeLeaveRequest.css"; // Keep employee-specific styles
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";

export default function EmployeeLeaveRequest() {
  const navigate = useNavigate();
  const [isTopUserOpen, setIsTopUserOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState(getSessionUserProfile());
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTopUserOpen(false);
    logout();
  };

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileInfo);
    return () => unsubscribe();
  }, []);

  const [balances] = useState([]);
  const [history] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: integrate with API
  };

  return (
    <div className="admin-layout">
      {/* Sidebar - matches admin layout */}
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-avatar">TI</div>
          <div className="brand-name">Tatay Ilio</div>
        </div>
        <nav className="nav">
          <Link className="nav-item" to="/employee/dashboard">Dashboard</Link>
          <Link className="nav-item" to="/employee/schedules">Schedules</Link>
          <Link className="nav-item active" to="/employee/leave-requests">Leave Requests</Link>
          <Link className="nav-item" to="/employee/payslips">Payslips</Link>
        </nav>
      </aside>

      <main className="admin-content">
        <header className="admin-topbar">
          <h1>Leave Requests</h1>
          <div className="top-actions">
            <button
              className="profile-btn"
              onClick={() => setIsTopUserOpen((open) => !open)}
            >
              <span className="profile-avatar">{profileInfo.initials}</span>
              <span>{profileInfo.displayName}</span>
            </button>
            <div className={`profile-popover${isTopUserOpen ? " open" : ""}`}>
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

        <section className="grid-3 lr-grid">
          {balances.length === 0 ? (
            <div className="lr-card lr-card--empty">
              <div className="lr-title">Leave Balances</div>
              <div className="lr-empty">
                Leave balances will appear here once your account is synced.
              </div>
            </div>
          ) : (
            balances.map((b) => {
              const total = (b.used ?? 0) + (b.remaining ?? 0);
              const pct =
                total > 0 ? Math.round(((b.used ?? 0) / total) * 100) : 0;
              return (
                <div key={b.key || b.label} className="lr-card">
                  <div className="lr-title">{b.label}</div>
                  <div className="lr-progress">
                    <div
                      className="lr-progress-fill"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <div className="lr-legend">
                    <span>Used: {b.used ?? 0} days</span>
                    <span>Remaining: {b.remaining ?? 0} days</span>
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="card lr-request">
          <div className="card-title">Request Leave</div>
          <form className="lr-form" onSubmit={handleSubmit}>
            <div className="lr-row">
              <label>Leave Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} required>
                <option value="">Select leave type</option>
                <option>Sick Leave</option>
                <option>Vacation</option>
                <option>Personal leave</option>
                <option>Other</option>
              </select>
            </div>
            <div className="lr-row two">
              <div className="col">
                <label>Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="col">
                <label>End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>
            <div className="lr-row">
              <label>Reason for Leave</label>
              <textarea rows={4} placeholder="Provide details about your leave request" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="lr-actions">
              <button type="submit" className="lr-submit">Submit Request</button>
            </div>
          </form>
        </section>

        <section className="card lr-history">
          <div className="card-title">Leave History</div>
          {history.length === 0 ? (
            <div className="lr-empty">
              Leave requests will be listed here after you submit one.
            </div>
          ) : (
            <div className="table">
              <div className="thead">
                <div>Type</div>
                <div>Date Range</div>
                <div>Duration</div>
                <div>Requested On</div>
                <div>Status</div>
              </div>
              {history.map((h, i) => (
                <div key={h.id || i} className="trow">
                  <div>{h.type}</div>
                  <div>{h.range}</div>
                  <div>{h.duration}</div>
                  <div>{h.requestedOn}</div>
                  <div>
                    <span className={`badge ${h.statusClass || "neutral"}`}>
                      {h.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


