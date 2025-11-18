import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../AdminPages/admincss/adminPayroll.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { API_BASE_URL } from "../config/api";
import { useSidebarState } from "../hooks/useSidebarState";

function peso(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function recalcEntry(entry) {
  const daysWorked = Number(entry.daysWorked) || 0;
  const dailyRate = Number(entry.dailyRate) || 0;
  const deductions = Number(entry.deductions) || 0;
  const grossPay = Math.round((daysWorked * dailyRate + Number.EPSILON) * 100) / 100;
  const netPay = Math.round((grossPay - deductions + Number.EPSILON) * 100) / 100;
  return { ...entry, daysWorked, dailyRate, deductions, grossPay, netPay };
}

export default function AdminPayroll() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => getSessionUserProfile());
  const { isSidebarOpen, toggleSidebar, closeSidebar, isMobileView } = useSidebarState();

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileData);
    return unsubscribe;
  }, []);

  useEffect(() => {
    setIsProfileOpen(false);
  }, [location.pathname]);

  const initialPeriod = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);

  const [period, setPeriod] = useState(initialPeriod);
  const [entries, setEntries] = useState([]);
  const [runInfo, setRunInfo] = useState(null);
  const [processed, setProcessed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const sessionUserId = useMemo(() => sessionStorage.getItem("userId"), []);
  const monthValue = `${period.year}-${String(period.month).padStart(2, "0")}`;

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE_URL}/payroll?year=${period.year}&month=${period.month}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load payroll data");
      }
      const data = await res.json();
      const mapped = (data.entries || []).map((entry) => ({
        ...entry,
        status: data.processed ? "Processed" : "Pending",
      }));
      setEntries(mapped.map(recalcEntry));
      setProcessed(Boolean(data.processed));
      setRunInfo(data.run);
    } catch (error) {
      console.error(error);
      setNotice(error.message || "Unable to load payroll data");
      setEntries([]);
      setProcessed(false);
      setRunInfo(null);
    } finally {
      setLoading(false);
    }
  }, [period.year, period.month]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  const departmentOptions = useMemo(() => {
    const set = new Set(entries.map((entry) => entry.department).filter(Boolean));
    return ["All Departments", ...Array.from(set).sort()];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let list = entries;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((entry) => `${entry.name} ${entry.position} ${entry.department}`.toLowerCase().includes(q));
    }
    if (deptFilter !== "All Departments") {
      list = list.filter((entry) => entry.department === deptFilter);
    }
    if (statusFilter !== "All Status") {
      list = list.filter((entry) => entry.status === statusFilter);
    }
    return list;
  }, [entries, query, deptFilter, statusFilter]);

  const totals = useMemo(() => {
    return entries.reduce((acc, entry) => {
      acc.gross += entry.grossPay;
      acc.deduct += entry.deductions;
      acc.net += entry.netPay;
      return acc;
    }, { gross: 0, deduct: 0, net: 0 });
  }, [entries]);

  const sanitizeNumericInput = (value) => {
    if (!value || value === '') return '';
    // Remove all non-numeric and non-decimal characters
    let cleaned = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Remove leading zeros (except for "0." or standalone "0")
    // If input is "024", it becomes "24"
    // If input is "0", it stays "0"
    // If input is "0.5", it stays "0.5"
    if (cleaned.length > 1 && cleaned[0] === '0' && cleaned[1] !== '.') {
      // Remove leading zeros but keep at least one digit
      cleaned = cleaned.replace(/^0+/, '');
      // If we removed everything (edge case), return empty string
      if (cleaned === '') {
        return '';
      }
    }
    
    return cleaned;
  };

  const handleEntryChange = (userId, field, value) => {
    if (processed) return;
    const sanitized = sanitizeNumericInput(value);
    setEntries((prev) => prev.map((entry) => {
      if (entry.userId !== userId) return entry;
      const updated = recalcEntry({ ...entry, [field]: sanitized });
      return updated;
    }));
  };

  const processPayroll = async () => {
    if (processed) {
      if (!window.confirm("Payroll for this month is already processed. Do you want to overwrite it?")) {
        return;
      }
    }

    if (!window.confirm("Process payroll and save these amounts?")) {
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        year: period.year,
        month: period.month,
        processedBy: sessionUserId ?? null,
        entries: entries.map((entry) => ({
          userId: entry.userId,
          daysWorked: entry.daysWorked,
          dailyRate: entry.dailyRate,
          deductions: entry.deductions,
          remarks: entry.remarks ?? null,
        })),
      };

      const res = await fetch(`${API_BASE_URL}/payroll`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to save payroll");
      }

      const data = await res.json();
      const mapped = (data.entries || []).map((entry) => ({
        ...entry,
        status: "Processed",
      }));
      setEntries(mapped.map(recalcEntry));
      setProcessed(true);
      setRunInfo(data.run);
      setNotice("Payroll processed successfully.");
    } catch (error) {
      console.error(error);
      setNotice(error.message || "Unable to process payroll.");
    } finally {
      setSaving(false);
    }
  };

  const exportPayroll = () => {
    if (!entries.length) {
      setNotice("Nothing to export.");
      return;
    }
    const csvContent = [
      ["Employee", "Position", "Department", "Daily Rate", "Days Worked", "Gross Pay", "Deductions", "Net Pay"],
      ...filteredEntries.map((entry) => [
        entry.name,
        entry.position,
        entry.department,
        entry.dailyRate,
        entry.daysWorked,
        entry.grossPay,
        entry.deductions,
        entry.netPay,
      ]),
    ].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${monthValue}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const openPayrollDetails = (entry) => {
    setSelectedEmployee(entry);
    setIsDetailsOpen(true);
  };

  const periodLabel = useMemo(() => {
    const date = new Date(period.year, period.month - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [period]);

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
            <h1>Payroll</h1>
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
              <div className="profile-row" onClick={() => { setIsProfileOpen(false); logout(); }}>Log out</div>
            </div>
          </div>
        </header>

        <section className="payroll-card">
          <div className="pay-period">
            <div className="period-left">
              <span className="calendar-icon">📅</span>
              <div className="period-range">{periodLabel}</div>
            </div>
            <div className="period-controls">
              <input
                type="month"
                value={monthValue}
                onChange={(e) => {
                  const [yr, mo] = e.target.value.split("-").map(Number);
                  if (!Number.isNaN(yr) && !Number.isNaN(mo)) {
                    setPeriod({ year: yr, month: mo });
                  }
                }}
              />
              <button className="btn" type="button" onClick={loadPayroll} disabled={loading}>
                Refresh Preview
              </button>
              <button className="btn warn" onClick={processPayroll} disabled={saving}>
                {saving ? "Saving..." : processed ? "Reprocess Payroll" : "Process Payroll"}
              </button>
            </div>
          </div>

          {notice && <div className="payroll-notice">{notice}</div>}
          {runInfo && processed && (
            <div className="payroll-run-info">
              Processed on {new Date(runInfo.processedAt).toLocaleString()} {runInfo.notes ? `• ${runInfo.notes}` : ""}
            </div>
          )}

          <div className="totals">
            <div className="total-card">
              <div className="total-title">Total Gross Pay</div>
              <div className="total-value">{peso(totals.gross)}</div>
            </div>
            <div className="total-card">
              <div className="total-title">Total Deductions</div>
              <div className="total-value">{peso(totals.deduct)}</div>
            </div>
            <div className="total-card">
              <div className="total-title">Total Net Pay</div>
              <div className="total-value">{peso(totals.net)}</div>
            </div>
          </div>

          <div className="toolbar">
            <input className="search" placeholder="Search employees..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="toolbar-right">
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                {departmentOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All Status</option>
                <option>Pending</option>
                <option>Processed</option>
              </select>
              <button className="btn" onClick={exportPayroll}>Export</button>
            </div>
          </div>

          <div className="payroll-table">
            <div className="p-head">
              <div className="cell heading">Employee</div>
              <div className="cell heading">Position</div>
              <div className="cell heading numeric">Daily Rate</div>
              <div className="cell heading numeric">Days Worked</div>
              <div className="cell heading numeric">Gross Pay</div>
              <div className="cell heading numeric">Deductions</div>
              <div className="cell heading numeric">Net Pay</div>
              <div className="cell heading">Status</div>
              <div className="cell heading">Actions</div>
            </div>
            <div className="p-body">
              {loading ? (
                <div className="p-row">
                  <div>Loading payroll data…</div>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-row">
                  <div>No employees found for this period.</div>
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <div key={entry.userId} className="p-row">
                    <div className="cell">
                      <div className="emp">
                        <div className="emp-avatar">{entry.name[0] || '?'}</div>
                        <div className="emp-meta">
                          <div className="emp-name">{entry.name}</div>
                          <div className="emp-email">{entry.department}</div>
                        </div>
                      </div>
                    </div>
                    <div className="cell">
                      <div>{entry.position || '—'}</div>
                    </div>
                    <div className="cell numeric">{peso(entry.dailyRate)}</div>
                    <div className="cell numeric">
                      <div className="numeric-input-wrapper">
                        <input
                          className="numeric-input"
                          type="text"
                          inputMode="decimal"
                          value={entry.daysWorked || ''}
                          disabled={processed}
                          onChange={(e) => {
                            handleEntryChange(entry.userId, 'daysWorked', e.target.value);
                          }}
                        />
                      </div>
                    </div>
                    <div className="cell numeric">{peso(entry.grossPay)}</div>
                    <div className="cell numeric">
                      <div className="numeric-input-wrapper">
                        <input
                          className="numeric-input"
                          type="text"
                          inputMode="decimal"
                          value={entry.deductions || ''}
                          disabled={processed}
                          onChange={(e) => {
                            handleEntryChange(entry.userId, 'deductions', e.target.value);
                          }}
                        />
                      </div>
                    </div>
                    <div className="cell numeric">{peso(entry.netPay)}</div>
                    <div className="cell status">
                      <span className={`pill ${processed ? 'pill-success' : 'pill-warn'}`}>{entry.status}</span>
                    </div>
                    <div className="cell actions">
                      <button className="link" onClick={() => openPayrollDetails(entry)}>Details</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {isDetailsOpen && selectedEmployee && (
          <div className="modal" role="dialog">
            <div className="modal-body payroll-details-modal">
              <div className="modal-header">
                <div className="modal-title">Payroll Details - {selectedEmployee.name}</div>
                <button className="icon-btn" onClick={() => setIsDetailsOpen(false)}>✖</button>
              </div>

              <div className="payroll-details">
                <div className="employee-header">
                  <div className="employee-avatar-large">
                    {selectedEmployee.name[0] || '?'}
                  </div>
                  <div className="employee-info">
                    <h2 className="employee-name">{selectedEmployee.name}</h2>
                    <p className="employee-position">{selectedEmployee.position}</p>
                    <span className="employee-dept">{selectedEmployee.department}</span>
                  </div>
                </div>

                <div className="payroll-breakdown">
                  <div className="breakdown-section">
                    <h3>Earnings</h3>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Daily Rate</span>
                      <span className="breakdown-value">{peso(selectedEmployee.dailyRate)}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Days Worked</span>
                      <span className="breakdown-value">{selectedEmployee.daysWorked}</span>
                    </div>
                    <div className="breakdown-item total">
                      <span className="breakdown-label">Gross Pay</span>
                      <span className="breakdown-value">{peso(selectedEmployee.grossPay)}</span>
                    </div>
                  </div>

                  <div className="breakdown-section">
                    <h3>Deductions</h3>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Deductions</span>
                      <span className="breakdown-value">{peso(selectedEmployee.deductions)}</span>
                    </div>
                    <div className="breakdown-item total">
                      <span className="breakdown-label">Net Pay</span>
                      <span className="breakdown-value">{peso(selectedEmployee.netPay)}</span>
                    </div>
                  </div>

                  <div className="breakdown-section net-pay">
                    <h3>Notes</h3>
                    <div className="net-pay-amount">
                      <span className="net-pay-label">Remarks</span>
                      <span className="net-pay-value">{selectedEmployee.remarks || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="payroll-summary">
                  <div className="summary-item">
                    <span className="summary-label">Pay Period</span>
                    <span className="summary-value">{periodLabel}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Status</span>
                    <span className="summary-value">
                      <span className={`status-badge ${processed ? 'processed' : 'pending'}`}>
                        {processed ? 'Processed' : 'Pending'}
                      </span>
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Processed On</span>
                    <span className="summary-value">{runInfo?.processedAt ? new Date(runInfo.processedAt).toLocaleString() : '—'}</span>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn" onClick={() => setIsDetailsOpen(false)}>Close</button>
                  <button className="btn primary" onClick={() => window.print()}>Print Payslip</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


