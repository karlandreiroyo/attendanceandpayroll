import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../AdminPages/admincss/adminReports.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";

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
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  const [attendanceData] = useState([]);
  const [overtimeData] = useState([]);
  const [payrollData] = useState([]);
  const [employeeListData] = useState([]);
  const [leaveData] = useState([]);

  function generateReport() {
    const reportData = getReportData();
    alert(`Report generated successfully!\n\n${reportData.summary}`);
  }

  function getReportData() {
    switch (selectedReport) {
      case "Attendance Summary":
        return attendanceData.length === 0
          ? {
              summary: `Attendance Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nNo attendance data available for the selected range.`,
            }
          : {
              summary: `Attendance Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nTotal Employees: ${attendanceData.reduce((sum, d) => sum + d.total, 0)}\nOverall Attendance Rate: ${Math.round(
                (attendanceData.reduce((sum, d) => sum + d.present, 0) /
                  Math.max(attendanceData.reduce((sum, d) => sum + d.total, 0), 1)) *
                  100
              )}%`,
            };
      case "Overtime Summary":
        return overtimeData.length === 0
          ? {
              summary: `Overtime Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nNo overtime data available for the selected range.`,
            }
          : {
              summary: `Overtime Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nTotal Requests: ${overtimeData.reduce((sum, d) => sum + d.requests, 0)}\nTotal Hours: ${overtimeData.reduce((sum, d) => sum + d.totalHours, 0)}`,
            };
      case "Payroll Summary":
        return payrollData.length === 0
          ? {
              summary: `Payroll Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nNo payroll data available.`,
            }
          : {
              summary: `Payroll Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nTotal Gross Pay: ₱${payrollData.reduce((sum, d) => sum + d.grossPay, 0).toLocaleString()}\nTotal Net Pay: ₱${payrollData.reduce((sum, d) => sum + d.netPay, 0).toLocaleString()}`,
            };
      case "Employee List":
        return employeeListData.length === 0
          ? {
              summary: "Employee List Report\nNo employee data available.",
            }
          : {
              summary: `Employee List Report\nTotal Employees: ${employeeListData.length}\nActive Employees: ${employeeListData.filter(e => e.status === "Active").length}\nDepartments: ${[...new Set(employeeListData.map(e => e.dept))].join(", ")}`,
            };
      case "Leave Summary":
        return leaveData.length === 0
          ? {
              summary: `Leave Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nNo leave data available.`,
            }
          : {
              summary: `Leave Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nTotal Leave Requests: ${leaveData.reduce(
                (sum, d) => sum + d.pendingLeaves + d.approvedLeaves + d.rejectedLeaves,
                0
              )}\nTotal Leave Days: ${leaveData.reduce((sum, d) => sum + d.totalDays, 0)}`,
            };
      case "Custom Report":
        return {
          summary: `Custom Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nDepartment: ${dept}\nConfigure filters and data sources to generate your custom report once available.`,
        };
      default:
        return { summary: "Report generated successfully!" };
    }
  }

  function exportReport() {
    const reportData = getReportData();
    const csvContent = `Report Type,${selectedReport}\nPeriod,${dateRange.start} to ${dateRange.end}\nDepartment,${dept}\n\n${reportData.summary}`;
    
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
          <Link className={`nav-item${isActive('/admin/overtime') ? ' active' : ''}`} to="/admin/overtime">Overtime</Link>
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
            <button 
              className={`rt-item ${selectedReport === "Attendance Summary" ? "active" : ""}`}
              onClick={() => setSelectedReport("Attendance Summary")}
            >
              Attendance Summary
            </button>
            <button 
              className={`rt-item ${selectedReport === "Overtime Summary" ? "active" : ""}`}
              onClick={() => setSelectedReport("Overtime Summary")}
            >
              Overtime Summary
            </button>
            <button 
              className={`rt-item ${selectedReport === "Payroll Summary" ? "active" : ""}`}
              onClick={() => setSelectedReport("Payroll Summary")}
            >
              Payroll Summary
            </button>
            <button 
              className={`rt-item ${selectedReport === "Employee List" ? "active" : ""}`}
              onClick={() => setSelectedReport("Employee List")}
            >
              Employee List
            </button>
            <button 
              className={`rt-item ${selectedReport === "Leave Summary" ? "active" : ""}`}
              onClick={() => setSelectedReport("Leave Summary")}
            >
              Leave Summary
            </button>
            <button 
              className={`rt-item ${selectedReport === "Custom Report" ? "active" : ""}`}
              onClick={() => setSelectedReport("Custom Report")}
            >
              Custom Report
            </button>
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
                  <option>All Departments</option>
                  <option>IT</option>
                  <option>HR</option>
                  <option>Finance</option>
                  <option>Marketing</option>
                  <option>Operations</option>
                </select>
              </div>
              <div className="param-actions">
                <button className="btn" onClick={exportReport}>Export</button>
                <button className="btn" onClick={printReport}>Print</button>
                <button className="btn primary" onClick={generateReport}>Generate Report</button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">{selectedReport} Report</div>
              <div className="period">Period: {dateRange.start} to {dateRange.end}</div>

              {selectedReport === "Attendance Summary" && (
                <div className="summary-table">
                  {attendanceData.length === 0 ? (
                    <div className="table-empty">
                      Attendance records will appear here once data is available.
                    </div>
                  ) : (
                    <>
                      <div className="t-head">
                        <div>Department</div>
                        <div>Total Employees</div>
                        <div>Present</div>
                        <div>Late</div>
                        <div>Absent</div>
                        <div>Attendance Rate</div>
                      </div>
                      {attendanceData.map((d) => (
                        <div key={d.dept} className="t-row">
                          <div>{d.dept}</div>
                          <div>{d.total}</div>
                          <div>{d.present}</div>
                          <div>{d.late}</div>
                          <div>{d.absent}</div>
                          <div>{d.rate}</div>
                        </div>
                      ))}
                      <div className="t-row total-row">
                        <div>Total</div>
                        <div>{attendanceData.reduce((sum, d) => sum + d.total, 0)}</div>
                        <div>{attendanceData.reduce((sum, d) => sum + d.present, 0)}</div>
                        <div>{attendanceData.reduce((sum, d) => sum + d.late, 0)}</div>
                        <div>{attendanceData.reduce((sum, d) => sum + d.absent, 0)}</div>
                        <div>
                          {Math.round(
                            (attendanceData.reduce((sum, d) => sum + d.present, 0) /
                              Math.max(attendanceData.reduce((sum, d) => sum + d.total, 0), 1)) *
                              100
                          )}
                          %
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {selectedReport === "Employee List" && (
                <div className="summary-table">
                  {employeeListData.length === 0 ? (
                    <div className="table-empty">
                      Employee records will appear here once present.
                    </div>
                  ) : (
                    <>
                      <div className="t-head">
                        <div>Employee</div>
                        <div>Department</div>
                        <div>Position</div>
                        <div>Status</div>
                        <div>Join Date</div>
                        <div>Email</div>
                      </div>
                      {employeeListData.map((emp) => (
                        <div key={emp.id} className="t-row">
                          <div>{emp.name}</div>
                          <div>{emp.dept}</div>
                          <div>{emp.position}</div>
                          <div>
                            <span className={`status-badge ${emp.status === "Active" ? "active" : ""}`}>
                              {emp.status}
                            </span>
                          </div>
                          <div>{emp.joinDate}</div>
                          <div>{emp.email}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {selectedReport === "Leave Summary" && (
                <div className="summary-table">
                  {leaveData.length === 0 ? (
                    <div className="table-empty">
                      Leave activity will appear here once data is available.
                    </div>
                  ) : (
                    <>
                      <div className="t-head">
                        <div>Department</div>
                        <div>Total Employees</div>
                        <div>Pending Leaves</div>
                        <div>Approved Leaves</div>
                        <div>Rejected Leaves</div>
                        <div>Total Days</div>
                      </div>
                      {leaveData.map((d) => (
                        <div key={d.dept} className="t-row">
                          <div>{d.dept}</div>
                          <div>{d.totalEmployees}</div>
                          <div>{d.pendingLeaves}</div>
                          <div>{d.approvedLeaves}</div>
                          <div>{d.rejectedLeaves}</div>
                          <div>{d.totalDays}</div>
                        </div>
                      ))}
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


