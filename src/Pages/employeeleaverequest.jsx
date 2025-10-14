import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../AdminPages/admincss/admindashboard.css"; // Use admin layout CSS
import "../Pages/employeecss/employeeleaverequest.css"; // Keep employee-specific styles

export default function EmployeeLeaveRequest() {
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const balances = useMemo(
    () => [
      { key: "sick", label: "Sick Leave", used: 2, remaining: 13 },
      { key: "vacation", label: "Vacation", used: 5, remaining: 10 },
      { key: "personal", label: "Personal Leave", used: 1, remaining: 4 }
    ],
    []
  );

  const history = [
    {
      type: "Sick Leave",
      range: "6/5/2023 - 6/6/2023",
      duration: "2 day(s)",
      requestedOn: "5/30/2023",
      status: "Approved"
    },
    {
      type: "Vacation",
      range: "5/15/2023 - 5/19/2023",
      duration: "5 day(s)",
      requestedOn: "4/25/2023",
      status: "Approved"
    },
    {
      type: "Personal Leave",
      range: "4/10/2023 - 4/10/2023",
      duration: "1 day(s)",
      requestedOn: "4/3/2023",
      status: "Approved"
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Submitted: ${type} from ${startDate} to ${endDate}\nReason: ${reason}`);
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
              onClick={() => {
                const el = document.getElementById("user-popover-lr");
                if (el) el.classList.toggle("open");
              }}
            >
              <span className="profile-avatar">EO</span>
              <span>Ezra Orizal</span>
            </button>
            <div id="user-popover-lr" className="profile-popover">
              <div className="profile-row">Profile</div>
              <div className="profile-row" onClick={() => (window.location.href = "/")}>Log out</div>
            </div>
          </div>
        </header>

        <section className="grid-3 lr-grid">
          {balances.map((b) => {
            const total = b.used + b.remaining;
            const pct = Math.round((b.used / total) * 100);
            return (
              <div key={b.key} className="lr-card">
                <div className="lr-title">{b.label}</div>
                <div className="lr-progress">
                  <div className="lr-progress-fill" style={{ width: `${pct}%` }}></div>
                </div>
                <div className="lr-legend">
                  <span>Used: {b.used} days</span>
                  <span>Remaining: {b.remaining} days</span>
                </div>
              </div>
            );
          })}
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
          <div className="table">
            <div className="thead">
              <div>Type</div>
              <div>Date Range</div>
              <div>Duration</div>
              <div>Requested On</div>
              <div>Status</div>
            </div>
            {history.map((h, i) => (
              <div key={i} className="trow">
                <div>{h.type}</div>
                <div>{h.range}</div>
                <div>{h.duration}</div>
                <div>{h.requestedOn}</div>
                <div><span className="badge success">{h.status}</span></div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}


