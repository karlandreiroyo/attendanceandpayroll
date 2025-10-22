import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css"; // Use admin layout CSS
import "../Pages/employeecss/employeePayslips.css";

export default function EmployeePayslips() {
  const payslips = [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = payslips[selectedIndex] ?? payslips[0];

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
          <Link className="nav-item" to="/employee/leave-requests">Leave Requests</Link>
          <Link className="nav-item active" to="/employee/payslips">Payslips</Link>
        </nav>
      </aside>

      {/* Content - matches admin layout */}
      <main className="admin-content">
        <header className="admin-topbar">
          <h1>Payslips</h1>
          <div className="top-actions">
            <button
              className="profile-btn"
              onClick={() => {
                const el = document.getElementById("user-popover-pay");
                if (el) el.classList.toggle("open");
              }}
            >
              <span className="profile-avatar">U</span>
              <span>User</span>
            </button>
            <div id="user-popover-pay" className="profile-popover">
              <div className="profile-row">Profile</div>
              <div className="profile-row" onClick={() => (window.location.href = "/")}>Log out</div>
            </div>
          </div>
        </header>

        <section className="card ps-list">
          <div className="card-title">Recent Payslips</div>
          <div className="ps-table">
            <div className="ps-head">
              <div>Pay Period</div>
              <div>Issue Date</div>
              <div className="right">Net Pay</div>
            </div>
            {payslips.map((p, i) => (
              <div
                key={i}
                className={`ps-row${selectedIndex === i ? " active" : ""}`}
                onClick={() => setSelectedIndex(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedIndex(i);
                }}
              >
                <div className="ps-doc">
                  <span className="ps-icon">📄</span>
                  {p.period}
                </div>
                <div>{p.issueDate}</div>
                <div className="right">{p.netPay}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card ps-detail">
          <div className="card-title">Payslip Details</div>
          <div className="ps-period-label">{selected.period}</div>
          <div className="ps-actions">
            <button className="ps-btn" onClick={() => window.print()}>Download / Print</button>
          </div>
          <div className="ps-detail-grid">
            <div className="ps-block">
              <div className="ps-subtitle">Employee Information</div>
              <div className="ps-kv"><span>Name:</span> <span>User</span></div>
              <div className="ps-kv"><span>Employee ID:</span> <span>EMP-000</span></div>
              <div className="ps-kv"><span>Position:</span> <span>Employee</span></div>
              <div className="ps-kv"><span>Department:</span> <span>General</span></div>
            </div>

            <div className="ps-block">
              <div className="ps-subtitle">Pay Period</div>
              <div className="ps-kv"><span>Period:</span> <span>{selected.period}</span></div>
              <div className="ps-kv"><span>Issue Date:</span> <span>{selected.issueDate}</span></div>
              <div className="ps-kv"><span>Payment Method:</span> <span>Direct Deposit</span></div>
            </div>
          </div>

          <div className="ps-earnings">
            <div className="ps-subtitle">Earnings</div>
            <div className="ps-kv"><span>Basic Salary</span><span>₱11,000.00</span></div>
            <div className="ps-kv"><span>Overtime Pay</span><span>₱2,000.00</span></div>
            <div className="ps-kv"><span>Allowance</span><span>₱500.00</span></div>
            <div className="ps-kv total"><span>Gross Pay</span><span>₱13,500.00</span></div>
          </div>

          <div className="ps-deductions">
            <div className="ps-subtitle">Deductions</div>
            <div className="ps-kv"><span>Tax</span><span>₱1,500.00</span></div>
            <div className="ps-kv"><span>SSS</span><span>₱300.00</span></div>
            <div className="ps-kv"><span>PhilHealth</span><span>₱200.00</span></div>
            <div className="ps-kv total"><span>Net Pay</span><span>{selected.netPay}</span></div>
          </div>
        </section>
      </main>
    </div>
  );
}


