import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../Pages/employeecss/employeePayslips.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { API_BASE_URL } from "../config/api";
import { useSidebarState } from "../hooks/useSidebarState";

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
  const { isSidebarOpen, toggleSidebar, closeSidebar, isMobileView } = useSidebarState();
  const detailRef = useRef(null);

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

  const handleDownloadAndPrint = () => {
    if (!selected || !detailRef.current) {
      window.print();
      return;
    }

    const printableNode = detailRef.current.cloneNode(true);
    // Remove buttons/interactive elements from printable clone
    printableNode.querySelectorAll(".ps-actions").forEach((el) => el.remove());

    const printableHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Payslip - ${selected.period}</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        background: #f5f5f5;
        margin: 0;
        padding: 24px;
      }
      .print-wrapper {
        max-width: 900px;
        margin: 0 auto;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 32px;
      }
      h1 {
        text-align: center;
        margin-bottom: 8px;
      }
      .meta-row {
        text-align: center;
        color: #6b7280;
        margin-bottom: 24px;
      }
      .ps-block,
      .ps-earnings,
      .ps-deductions,
      .ps-notes {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        margin-top: 16px;
      }
      .ps-kv {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px dashed #e5e7eb;
      }
      .ps-kv:last-child {
        border-bottom: none;
      }
      .ps-kv span:first-child {
        font-weight: 600;
        color: #374151;
      }
      .ps-kv span:last-child {
        color: #111827;
      }
      .ps-netpay-highlight {
        font-size: 18px;
        font-weight: 700;
        background: #dcfce7;
        border: 1px solid #16a34a;
        border-radius: 8px;
        padding: 12px;
      }
    </style>
  </head>
  <body>
    <div class="print-wrapper">
      <h1>Tatay Ilio Attendance And Payroll System</h1>
      <div class="meta-row">Pay Period: ${selected.period} &nbsp;|&nbsp; Issued: ${selected.issueDate ?? "—"}</div>
      ${printableNode.innerHTML}
    </div>
  </body>
</html>`;

    const blob = new Blob([printableHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `Payslip-${selected.period.replace(/[\\s/]/g, "-")}.html`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printableHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
        URL.revokeObjectURL(url);
      };
    } else {
      window.print();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`admin-layout${isSidebarOpen ? "" : " sidebar-collapsed"}`}>
      <aside className={`admin-sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
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
            <h1>Payslips</h1>
          </div>
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

        <section className="card ps-detail" ref={detailRef}>
          <div className="card-title">Payslip Details</div>
          {selected ? (
            <>
              <div className="ps-print-header">
                <div className="ps-company">
                  <div className="ps-company-name">Tatay Ilio Attendance and Payroll System</div>
                  <div className="ps-company-tagline">Employee Payslip</div>
                </div>
                <div className="ps-print-meta">
                  <div className="ps-kv">
                    <span>Pay Period:</span>
                    <span>{selected.period}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Issued:</span>
                    <span>{selected.issueDate ?? "—"}</span>
                  </div>
                </div>
              </div>
              <div className="ps-actions">
                <button className="ps-btn" type="button" onClick={handleDownloadAndPrint}>
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
                    <span>{profileInfo.employeeId || profileInfo.userId || profileInfo.id || "—"}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Position:</span>
                    <span>{profileInfo.position || selected.position || "—"}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Department:</span>
                    <span>{profileInfo.department || selected.department || "—"}</span>
                  </div>
                </div>

                <div className="ps-block">
                  <div className="ps-subtitle">Pay Summary</div>
                  <div className="ps-kv ps-time-highlight">
                    <span>Days Worked:</span>
                    <span>{selected.daysWorked}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Daily Rate:</span>
                    <span>{selected.dailyRate}</span>
                  </div>
                  <div className="ps-kv">
                    <span>Gross Pay:</span>
                    <span>{selected.grossPay}</span>
                  </div>
                  <div className="ps-kv ps-deductions-highlight">
                    <span>Deductions:</span>
                    <span>{selected.deductionsTotal}</span>
                  </div>
                  <div className="ps-kv total ps-netpay-highlight">
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


