import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../Pages/employeecss/employeePayslips.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { API_BASE_URL } from "../config/api";

function formatPeso(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function EmployeePayslips() {
  const navigate = useNavigate();
  const [isTopUserOpen, setIsTopUserOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState(() => getSessionUserProfile());
  const [payslips, setPayslips] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const userId = useMemo(() => sessionStorage.getItem("userId"), []);

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileInfo);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadPayslips() {
      if (!userId) return;
      setLoading(true);
      setNotice(null);
      try {
        const res = await fetch(`${API_BASE_URL}/payroll/employee/${userId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || "Failed to load payslips");
        }
        const data = await res.json();
        const formatted = (data || []).map((item) => ({
          period: item.periodLabel,
          issueDate: item.processedAt ? new Date(item.processedAt).toLocaleDateString() : "—",
          netPay: formatPeso(item.netPay),
          grossPay: formatPeso(item.grossPay),
          deductionsTotal: formatPeso(item.deductions),
          daysWorked: item.daysWorked,
          dailyRate: formatPeso(item.dailyRate),
          remarks: item.remarks || item.notes || "",
          earnings: [
            { label: "Daily Rate", amount: formatPeso(item.dailyRate) },
            { label: "Days Worked", amount: item.daysWorked },
            { label: "Gross Pay", amount: formatPeso(item.grossPay) },
          ],
          deductions: [
            { label: "Total Deductions", amount: formatPeso(item.deductions) },
          ],
        }));
        setPayslips(formatted);
        setSelectedIndex(0);
      } catch (error) {
        console.error(error);
        setNotice(error.message || "Unable to load payslips.");
        setPayslips([]);
      } finally {
        setLoading(false);
      }
    }
    loadPayslips();
  }, [userId]);

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

  return (
    <div className="admin-layout">
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

        {notice && <div className="ps-notice">{notice}</div>}

        <section className="card ps-list">
          <div className="card-title">Recent Payslips</div>
          <div className="ps-table">
            {loading ? (
              <div className="ps-empty">Loading payslips…</div>
            ) : payslips.length === 0 ? (
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
                <button className="ps-btn" type="button" onClick={() => window.print()}>
                  Download / Print
                </button>
              </div>
              <div className="ps-detail-grid">
                <div className="ps-block">
                  <div className="ps-subtitle">Employee Information</div>
                  <div className="ps-kv">
                    <span>Name:</span>
                    <span>{profileInfo.displayName}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Employee ID:</span>
                    <span>{profileInfo.userId || "—"}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Position:</span>
                    <span>{profileInfo.position || "—"}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Department:</span>
                    <span>{profileInfo.department || "—"}</span>
                  </div>
                </div>

                <div className="ps-block">
                  <div className="ps-subtitle">Pay Summary</div>
                  <div className="ps-kv">
                    <span>Days Worked:</span>
                    <span>{selected.daysWorked}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Daily Rate:</span>
                    <span>{formatPeso(selected.dailyRate)}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Gross Pay:</span>
                    <span>{selected.grossPay}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Deductions:</span>
                    <span>{selected.deductionsTotal}</span>
                  </div>
                  <div className="ps-kv total">
                    <span>Net Pay:</span>
                    <span>{selected.netPay}</span>
                  </div>
                </div>
              </div>

              <div className="ps-earnings">
                <div className="ps-subtitle">Earnings</div>
                {selected.earnings.map((item, idx) => (
                  <div key={item.label || idx} className="ps-kv">
                    <span>{item.label}</span>
                    <span>{item.amount}</span>
                  </div>
                ))}
              </div>

              <div className="ps-deductions">
                <div className="ps-subtitle">Deductions</div>
                {selected.deductions.map((item, idx) => (
                  <div key={item.label || idx} className="ps-kv">
                    <span>{item.label}</span>
                    <span>{item.amount}</span>
                  </div>
                ))}
              </div>

              <div className="ps-notes">
                <div className="ps-subtitle">Remarks</div>
                <div className="ps-note-text">{selected.remarks || "—"}</div>
              </div>
            </>
          ) : (
            <div className="ps-empty">
              {loading ? "Loading payslip details…" : "Select a payslip to view its details once they are available."}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


