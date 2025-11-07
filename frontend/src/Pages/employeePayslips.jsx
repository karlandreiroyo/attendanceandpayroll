import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css"; // Use admin layout CSS
import "../Pages/employeecss/employeePayslips.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";

export default function EmployeePayslips() {
  const navigate = useNavigate();
  const [isTopUserOpen, setIsTopUserOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState(() => getSessionUserProfile());
  const [payslips] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = useMemo(() => {
    if (!payslips || payslips.length === 0) return null;
    return payslips[selectedIndex] ?? payslips[0];
  }, [payslips, selectedIndex]);

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

        <section className="card ps-list">
          <div className="card-title">Recent Payslips</div>
          <div className="ps-table">
            {payslips.length === 0 ? (
              <div className="ps-empty">
                Payslips will appear here once payroll issues them.
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </section>

        <section className="card ps-detail">
          <div className="card-title">Payslip Details</div>
          {selected ? (
            <>
              <div className="ps-period-label">{selected.period}</div>
              <div className="ps-actions">
                <button className="ps-btn" type="button">
                  Download / Print
                </button>
              </div>
              <div className="ps-detail-grid">
                <div className="ps-block">
                  <div className="ps-subtitle">Employee Information</div>
                  <div className="ps-kv">
                    <span>Name:</span>
                    <span>{selected.employeeName || profileInfo.displayName}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Employee ID:</span>
                    <span>{selected.employeeId || "—"}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Position:</span>
                    <span>{selected.position || profileInfo.position || "—"}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Department:</span>
                    <span>{selected.department || profileInfo.department || "—"}</span>
                  </div>
                </div>

                <div className="ps-block">
                  <div className="ps-subtitle">Pay Period</div>
                  <div className="ps-kv">
                    <span>Period:</span>
                    <span>{selected.period}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Issue Date:</span>
                    <span>{selected.issueDate || "—"}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Payment Method:</span>
                    <span>{selected.paymentMethod || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="ps-earnings">
                <div className="ps-subtitle">Earnings</div>
                {(selected.earnings || []).length === 0 ? (
                  <div className="ps-empty-inline">
                    Earnings breakdown will appear once available.
                  </div>
                ) : (
                  (selected.earnings || []).map((item, idx) => (
                    <div key={item.label || idx} className="ps-kv">
                      <span>{item.label}</span>
                      <span>{item.amount}</span>
                    </div>
                  ))
                )}
                {selected.grossPay && (
                  <div className="ps-kv total">
                    <span>Gross Pay</span>
                    <span>{selected.grossPay}</span>
                  </div>
                )}
              </div>

              <div className="ps-deductions">
                <div className="ps-subtitle">Deductions</div>
                {(selected.deductions || []).length === 0 ? (
                  <div className="ps-empty-inline">
                    Deductions will appear here when available.
                  </div>
                ) : (
                  (selected.deductions || []).map((item, idx) => (
                    <div key={item.label || idx} className="ps-kv">
                      <span>{item.label}</span>
                      <span>{item.amount}</span>
                    </div>
                  ))
                )}
                {selected.netPay && (
                  <div className="ps-kv total">
                    <span>Net Pay</span>
                    <span>{selected.netPay}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="ps-empty">
              Select a payslip to view its details once they are available.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


