import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../AdminPages/admincss/adminReports.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { API_BASE_URL } from "../config/api";

const REPORT_TYPES = [
  { label: "Attendance Summary", value: "attendance" },
  { label: "Leave Summary", value: "leave" },
  { label: "Payroll Summary", value: "payroll" },
  { label: "Employee List", value: "employees" },
  { label: "Admin List", value: "admins" },
  { label: "Custom Report", value: "custom" },
];

export default function AdminReports() {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => getSessionUserProfile());
  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileData);
    return unsubscribe;
  }, []);
  const [dept, setDept] = useState("All Departments");
  const [selectedReport, setSelectedReport] = useState("Attendance Summary");
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });
  const [departments, setDepartments] = useState(["All Departments"]);
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectedType = useMemo(
    () => REPORT_TYPES.find((type) => type.label === selectedReport),
    [selectedReport]
  );

  useEffect(() => {
    async function loadDepartments() {
      try {
        const res = await fetch(`${API_BASE_URL}/users`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const unique = new Set(["All Departments"]);
        (Array.isArray(data) ? data : []).forEach((user) => {
          const department = user.department || user.dept || "Unassigned";
          unique.add(department);
        });
        setDepartments(Array.from(unique));
      } catch (err) {
        console.error("Failed to load departments", err);
      }
    }
    loadDepartments();
  }, []);

  function buildQueryParams() {
    const params = new URLSearchParams();
    if (dateRange.start) params.set("start", dateRange.start);
    if (dateRange.end) params.set("end", dateRange.end);
    if (dept && dept !== "All Departments") params.set("department", dept);
    return params;
  }

  useEffect(() => {
    if (!selectedType || selectedType.value === "custom") {
      setReportData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchReport() {
      setLoading(true);
      setError(null);
      try {
        const params = buildQueryParams();
        const res = await fetch(`${API_BASE_URL}/reports/${selectedType.value}?${params.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || "Failed to load report data.");
        }
        const payload = await res.json();
        setReportData(payload);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setReportData(null);
        setError(err.message || "Unable to load report data.");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();

    return () => controller.abort();
  }, [selectedType, dateRange.start, dateRange.end, dept]);

  function generateReport() {
    const summary = buildReportSummary();
    alert(`Report generated successfully!\n\n${summary}`);
  }

  function buildReportSummary() {
    const header = `${selectedReport} Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nDepartment: ${dept}`;

    if (!selectedType || selectedType.value === "custom") {
      return `${header}\nCustom report configuration will be available soon.`;
    }

    if (loading) {
      return `${header}\nReport is still loading.`;
    }

    if (error) {
      return `${header}\nError: ${error}`;
    }

    if (!reportData) {
      return `${header}\nNo data available.`;
    }

    switch (selectedType.value) {
      case "attendance": {
        const departments = reportData.departments ?? [];
        const totals = reportData.totals ?? {};
        if (!departments.length && (!totals || totals.totalEmployees === 0)) {
          return `${header}\nNo attendance records found for the selected filters.`;
        }
        const rate =
          totals.totalEmployees > 0
            ? Math.round(((totals.present ?? 0) / Math.max(totals.totalEmployees, 1)) * 100)
            : 0;
        return `${header}\nTotal Employees: ${totals.totalEmployees ?? 0}\nPresent: ${totals.present ?? 0}\nLate: ${totals.late ?? 0}\nAbsent: ${totals.absent ?? 0}\nAttendance Rate: ${rate}%`;
      }
      case "leave": {
        const departments = reportData.departments ?? [];
        const totals = reportData.totals ?? {};
        if (!departments.length && (totals.pending ?? 0) === 0 && (totals.approved ?? 0) === 0 && (totals.rejected ?? 0) === 0) {
          return `${header}\nNo leave activity found for the selected filters.`;
        }
        const totalRequests = (totals.pending ?? 0) + (totals.approved ?? 0) + (totals.rejected ?? 0) + (totals.cancelled ?? 0);
        return `${header}\nTotal Leave Requests: ${totalRequests}\nApproved: ${totals.approved ?? 0}\nPending: ${totals.pending ?? 0}\nRejected: ${totals.rejected ?? 0}\nTotal Leave Days: ${totals.totalDays ?? 0}`;
      }
      case "payroll": {
        const totals = reportData.totals ?? {};
        if ((reportData.periods ?? []).length === 0) {
          return `${header}\nNo payroll runs found for the selected period.`;
        }
        return `${header}\nPayroll Runs: ${(reportData.periods ?? []).length}\nHeadcount (entries): ${totals.headcount ?? 0}\nTotal Gross Pay: ₱${Number(totals.totalGross ?? 0).toLocaleString()}\nTotal Net Pay: ₱${Number(totals.totalNet ?? 0).toLocaleString()}`;
      }
      case "employees": {
        const employees = reportData.employees ?? [];
        if (!employees.length) {
          return `${header}\nNo employees found for the selected filters.`;
        }
        const activeCount = employees.filter((emp) => (emp.status ?? '').toLowerCase() === "active").length;
        const departmentsSet = Array.from(new Set(employees.map((emp) => emp.department ?? 'Unassigned')));
        return `${header}\nTotal Employees: ${employees.length}\nActive Employees: ${activeCount}\nDepartments: ${departmentsSet.join(", ")}`;
      }
      case "admins": {
        const admins = reportData.admins ?? [];
        if (!admins.length) {
          return `${header}\nNo admins found for the selected filters.`;
        }
        const activeCount = admins.filter((admin) => (admin.status ?? '').toLowerCase() === "active").length;
        const departmentsSet = Array.from(new Set(admins.map((admin) => admin.department ?? 'Unassigned')));
        return `${header}\nTotal Admins: ${admins.length}\nActive Admins: ${activeCount}\nDepartments: ${departmentsSet.join(", ")}`;
      }
      default:
        return `${header}\nNo data available.`;
    }
  }

  function exportReport() {
    if (!selectedType || selectedType.value === "custom") {
      const csvContent = `Report Type,${selectedReport}\nPeriod,${dateRange.start} to ${dateRange.end}\nDepartment,${dept}\n\nCustom report configuration will be available soon.`;
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReport.toLowerCase().replace(/\s+/g, '-')}-${dateRange.start}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      return;
    }

    const headerRows = [
      ["Report Type", selectedReport],
      ["Period", `${dateRange.start} to ${dateRange.end}`],
      ["Department", dept],
      []
    ];

    let dataRows = [["No data available."]];

    if (!loading && !error && reportData) {
      switch (selectedType.value) {
        case "attendance": {
          const departments = reportData.departments ?? [];
          const totals = reportData.totals ?? {};
          dataRows = [
            ["Department", "Total Employees", "Present", "Late", "Absent"],
            ...departments.map((item) => [
              item.department,
              item.totalEmployees,
              item.present,
              item.late,
              item.absent,
            ]),
            [],
            [
              "Totals",
              totals.totalEmployees ?? 0,
              totals.present ?? 0,
              totals.late ?? 0,
              totals.absent ?? 0,
            ],
          ];
          break;
        }
        case "leave": {
          const departments = reportData.departments ?? [];
          const totals = reportData.totals ?? {};
          dataRows = [
            ["Department", "Total Employees", "Pending", "Approved", "Rejected", "Cancelled", "Total Days"],
            ...departments.map((item) => [
              item.department,
              item.totalEmployees,
              item.pending,
              item.approved,
              item.rejected,
              item.cancelled,
              item.totalDays,
            ]),
            [],
            [
              "Totals",
              totals.totalEmployees ?? 0,
              totals.pending ?? 0,
              totals.approved ?? 0,
              totals.rejected ?? 0,
              totals.cancelled ?? 0,
              totals.totalDays ?? 0,
            ],
          ];
          break;
        }
        case "payroll": {
          const periods = reportData.periods ?? [];
          const totals = reportData.totals ?? {};
          dataRows = [
            ["Period", "Headcount", "Total Gross", "Total Net", "Total Deductions"],
            ...periods.map((item) => [
              item.label,
              item.headcount,
              item.totalGross,
              item.totalNet,
              item.totalDeductions,
            ]),
            [],
            [
              "Totals",
              totals.headcount ?? 0,
              totals.totalGross ?? 0,
              totals.totalNet ?? 0,
              totals.totalDeductions ?? 0,
            ],
          ];
          break;
        }
        case "employees": {
          const employees = reportData.employees ?? [];
          dataRows = [
            ["Employee", "Department", "Position", "Status", "Join Date", "Email"],
            ...employees.map((emp) => [
              emp.name,
              emp.department,
              emp.position,
              emp.status,
              emp.joinDate ?? "",
              emp.email,
            ]),
          ];
          break;
        }
        case "admins": {
          const admins = reportData.admins ?? [];
          dataRows = [
            ["Admin", "Department", "Position", "Status", "Join Date", "Email"],
            ...admins.map((admin) => [
              admin.name,
              admin.department,
              admin.position,
              admin.status,
              admin.joinDate ?? "",
              admin.email,
            ]),
          ];
          break;
        }
        default:
          break;
      }
    }

    const csvContent = [...headerRows, ...dataRows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedReport.toLowerCase().replace(/\s+/g, '-')}-${dateRange.start}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

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
          <Link className={`nav-item${isActive('/admin/leave-requests') ? ' active' : ''}`} to="/admin/leave-requests">Leave Requests</Link>
          <Link className={`nav-item${isActive('/admin/announcements') ? ' active' : ''}`} to="/admin/announcements">Announcements</Link>
          <Link className={`nav-item${isActive('/admin/payroll') ? ' active' : ''}`} to="/admin/payroll">Payroll</Link>
          <Link className={`nav-item${isActive('/admin/reports') ? ' active' : ''}`} to="/admin/reports">Reports</Link>
        </nav>
      </aside>

      <main className="admin-content">
        <header className="admin-topbar">
          <h1>Reports</h1>
          <div className="top-actions">
            <button className="profile-btn" onClick={() => setIsProfileOpen(v => !v)}>
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

        <div className="reports-layout">
          <aside className="report-types">
            <div className="rt-title">Report Types</div>
            {REPORT_TYPES.map((type) => (
              <button
                key={type.value}
                className={`rt-item ${selectedReport === type.label ? "active" : ""}`}
                onClick={() => setSelectedReport(type.label)}
              >
                {type.label}
              </button>
            ))}
          </aside>

          <section className="report-content">
            <div className="params-bar">
              <div className="param">
                <div className="param-title">Date Range</div>
                <div className="param-inputs">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
              <div className="param">
                <div className="param-title">Department</div>
                <select className="param-select" value={dept} onChange={e => setDept(e.target.value)}>
                  {departments.map((departmentOption) => (
                    <option key={departmentOption} value={departmentOption}>
                      {departmentOption}
                    </option>
                  ))}
                </select>
              </div>
              <div className="param-actions">
                <button className="btn" onClick={exportReport}>Export</button>
                <button className="btn" onClick={printReport}>Print</button>
                <button className="btn primary" onClick={generateReport}>Generate Report</button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">{selectedReport} Report</div>
                <div className="card-info">
                  <div className="period">Period: {dateRange.start} to {dateRange.end}</div>
                  {dept && <div className="department-info">Department: {dept}</div>}
                </div>
              </div>

              {loading && (
                <div className="table-empty">Generating report...</div>
              )}

              {!loading && error && (
                <div className="table-empty error">Unable to load report data: {error}</div>
              )}

              {selectedReport === "Attendance Summary" && (
                <div className="summary-table">
                  {!loading && !error && (!reportData || !reportData.departments || reportData.departments.length === 0) ? (
                    <div className="table-empty">
                      Attendance records will appear here once data is available.
                    </div>
                  ) : (
                    <>
                      <div className="t-head columns-6">
                        <div>Department</div>
                        <div>Total Employees</div>
                        <div>Present</div>
                        <div>Late</div>
                        <div>Absent</div>
                        <div>Attendance Rate</div>
                      </div>
                      {(reportData?.departments ?? []).map((d) => {
                        const rate =
                          d.totalEmployees > 0
                            ? Math.round((d.present / Math.max(d.totalEmployees, 1)) * 100)
                            : 0;
                        return (
                          <div key={d.department} className="t-row columns-6">
                            <div>{d.department}</div>
                            <div>{d.totalEmployees}</div>
                            <div>{d.present}</div>
                            <div>{d.late}</div>
                            <div>{d.absent}</div>
                            <div>{rate}%</div>
                          </div>
                        );
                      })}
                      {reportData?.totals && (
                        <div className="t-row total-row columns-6">
                          <div>Total</div>
                          <div>{reportData.totals.totalEmployees}</div>
                          <div>{reportData.totals.present}</div>
                          <div>{reportData.totals.late}</div>
                          <div>{reportData.totals.absent}</div>
                          <div>
                            {reportData.totals.totalEmployees > 0
                              ? Math.round(
                                (reportData.totals.present /
                                  Math.max(reportData.totals.totalEmployees, 1)) *
                                100
                              )
                              : 0}
                            %
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {selectedReport === "Employee List" && (
                <div className="summary-table">
                  {!loading && !error && (!reportData || !reportData.employees || reportData.employees.length === 0) ? (
                    <div className="table-empty">
                      Employee records will appear here once present.
                    </div>
                  ) : (
                    <>
                      <div className="t-head columns-6">
                        <div>Employee</div>
                        <div>Department</div>
                        <div>Position</div>
                        <div>Status</div>
                        <div>Join Date</div>
                        <div>Email</div>
                      </div>
                      {(reportData?.employees ?? []).map((emp) => (
                        <div key={emp.id} className="t-row columns-6">
                          <div>{emp.name}</div>
                          <div>{emp.department}</div>
                          <div>{emp.position}</div>
                          <div>
                            <span className={`status-badge ${emp.status === "Active" ? "active" : ""}`}>
                              {emp.status}
                            </span>
                          </div>
                          <div>{emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : "-"}</div>
                          <div>{emp.email}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {selectedReport === "Admin List" && (
                <div className="summary-table">
                  {!loading && !error && (!reportData || !reportData.admins || reportData.admins.length === 0) ? (
                    <div className="table-empty">
                      Admin records will appear here once available.
                    </div>
                  ) : (
                    <>
                      <div className="t-head columns-6">
                        <div>Admin</div>
                        <div>Department</div>
                        <div>Position</div>
                        <div>Status</div>
                        <div>Join Date</div>
                        <div>Email</div>
                      </div>
                      {(reportData?.admins ?? []).map((admin) => (
                        <div key={admin.id} className="t-row columns-6">
                          <div>{admin.name}</div>
                          <div>{admin.department}</div>
                          <div>{admin.position}</div>
                          <div>
                            <span className={`status-badge ${admin.status === "Active" ? "active" : ""}`}>
                              {admin.status}
                            </span>
                          </div>
                          <div>{admin.joinDate ? new Date(admin.joinDate).toLocaleDateString() : "-"}</div>
                          <div>{admin.email}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {selectedReport === "Leave Summary" && (
                <div className="summary-table">
                  {!loading && !error && (!reportData || !reportData.departments || reportData.departments.length === 0) ? (
                    <div className="table-empty">
                      Leave activity will appear here once data is available.
                    </div>
                  ) : (
                    <>
                      <div className="t-head columns-7">
                        <div>Department</div>
                        <div>Total Employees</div>
                        <div>Pending Leaves</div>
                        <div>Approved Leaves</div>
                        <div>Rejected Leaves</div>
                        <div>Cancelled Leaves</div>
                        <div>Total Days</div>
                      </div>
                      {(reportData?.departments ?? []).map((d) => (
                        <div key={d.department} className="t-row columns-7">
                          <div>{d.department}</div>
                          <div>{d.totalEmployees}</div>
                          <div>{d.pending}</div>
                          <div>{d.approved}</div>
                          <div>{d.rejected}</div>
                          <div>{d.cancelled}</div>
                          <div>{d.totalDays}</div>
                        </div>
                      ))}
                      {reportData?.totals && (
                        <div className="t-row total-row columns-7">
                          <div>Total</div>
                          <div>{reportData.totals.totalEmployees}</div>
                          <div>{reportData.totals.pending}</div>
                          <div>{reportData.totals.approved}</div>
                          <div>{reportData.totals.rejected}</div>
                          <div>{reportData.totals.cancelled}</div>
                          <div>{reportData.totals.totalDays}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {selectedReport === "Payroll Summary" && (
                <div className="summary-table">
                  {!loading && !error && (!reportData || !reportData.periods || reportData.periods.length === 0) ? (
                    <div className="table-empty">
                      Payroll runs will appear here after you process payroll for this period.
                    </div>
                  ) : (
                    <>
                      <div className="t-head columns-5">
                        <div>Period</div>
                        <div>Headcount (entries)</div>
                        <div>Total Gross Pay</div>
                        <div>Total Net Pay</div>
                        <div>Total Deductions</div>
                      </div>
                      {(reportData?.periods ?? []).map((period) => (
                        <div key={`${period.year}-${period.month}`} className="t-row columns-5">
                          <div>{period.label}</div>
                          <div>{period.headcount}</div>
                          <div>₱{Number(period.totalGross).toLocaleString()}</div>
                          <div>₱{Number(period.totalNet).toLocaleString()}</div>
                          <div>₱{Number(period.totalDeductions).toLocaleString()}</div>
                        </div>
                      ))}
                      {reportData?.totals && (
                        <div className="t-row total-row columns-5">
                          <div>Totals</div>
                          <div>{reportData.totals.headcount}</div>
                          <div>₱{Number(reportData.totals.totalGross).toLocaleString()}</div>
                          <div>₱{Number(reportData.totals.totalNet).toLocaleString()}</div>
                          <div>₱{Number(reportData.totals.totalDeductions).toLocaleString()}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {selectedReport === "Custom Report" && (
                <div className="custom-report-content">
                  <div className="custom-placeholder">
                    Custom report configuration will be available once reporting
                    templates are defined. Select a date range and department to
                    prepare your filters.
                  </div>
                </div>
              )}

              <div className="trend">
                {selectedReport} trend chart will be displayed here
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}


