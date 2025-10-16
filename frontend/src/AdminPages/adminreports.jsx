import React, { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/admindashboard.css";
import "..//AdminPages/admincss/adminreports.css";

export default function AdminReports() {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [dept, setDept] = useState("All Departments");
  const [selectedReport, setSelectedReport] = useState("Attendance Summary");
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  // Sample data for reports
  const attendanceData = useMemo(() => [
    { dept: "IT", total: 10, present: 8, late: 1, absent: 1, rate: "90%" },
    { dept: "HR", total: 5, present: 5, late: 0, absent: 0, rate: "100%" },
    { dept: "Finance", total: 8, present: 7, late: 0, absent: 1, rate: "87.5%" },
    { dept: "Marketing", total: 12, present: 10, late: 1, absent: 1, rate: "91.7%" },
    { dept: "Operations", total: 15, present: 12, late: 2, absent: 1, rate: "93.3%" },
  ], []);

  const overtimeData = useMemo(() => [
    { dept: "IT", requests: 5, approved: 3, rejected: 1, pending: 1, totalHours: 12 },
    { dept: "HR", requests: 2, approved: 2, rejected: 0, pending: 0, totalHours: 6 },
    { dept: "Finance", requests: 3, approved: 1, rejected: 1, pending: 1, totalHours: 8 },
    { dept: "Marketing", requests: 4, approved: 2, rejected: 1, pending: 1, totalHours: 10 },
    { dept: "Operations", requests: 6, approved: 4, rejected: 1, pending: 1, totalHours: 15 },
  ], []);

  const payrollData = useMemo(() => [
    { dept: "IT", employees: 10, grossPay: 285000, deductions: 30000, netPay: 255000 },
    { dept: "HR", employees: 5, grossPay: 165000, deductions: 23250, netPay: 141750 },
    { dept: "Finance", employees: 8, grossPay: 212000, deductions: 22000, netPay: 190000 },
    { dept: "Marketing", employees: 12, grossPay: 282000, deductions: 36000, netPay: 246000 },
    { dept: "Operations", employees: 15, grossPay: 525000, deductions: 60000, netPay: 465000 },
  ], []);

  const employeeListData = useMemo(() => [
    { id: 1, name: "Ezra Orizal", email: "ezra@tatayilio.com", dept: "IT", position: "Software Developer", status: "Active", joinDate: "5/15/2021" },
    { id: 2, name: "Heuben Clyde Dagami", email: "heuben@tatayilio.com", dept: "HR", position: "HR Manager", status: "Active", joinDate: "3/10/2020" },
    { id: 3, name: "Jheff Cruz", email: "jheff@tatayilio.com", dept: "Finance", position: "Accountant", status: "Active", joinDate: "1/5/2022" },
    { id: 4, name: "John Ivan Santos", email: "john@tatayilio.com", dept: "Marketing", position: "Marketing Specialist", status: "Active", joinDate: "8/22/2021" },
    { id: 5, name: "Karl Andrei Royo", email: "karl@tatayilio.com", dept: "Operations", position: "Operations Manager", status: "Active", joinDate: "11/30/2019" },
  ], []);

  const leaveData = useMemo(() => [
    { dept: "IT", totalEmployees: 10, pendingLeaves: 2, approvedLeaves: 5, rejectedLeaves: 1, totalDays: 15 },
    { dept: "HR", totalEmployees: 5, pendingLeaves: 1, approvedLeaves: 3, rejectedLeaves: 0, totalDays: 8 },
    { dept: "Finance", totalEmployees: 8, pendingLeaves: 3, approvedLeaves: 4, rejectedLeaves: 1, totalDays: 12 },
    { dept: "Marketing", totalEmployees: 12, pendingLeaves: 4, approvedLeaves: 6, rejectedLeaves: 2, totalDays: 20 },
    { dept: "Operations", totalEmployees: 15, pendingLeaves: 5, approvedLeaves: 8, rejectedLeaves: 2, totalDays: 25 },
  ], []);

  function generateReport() {
    const reportData = getReportData();
    alert(`Report generated successfully!\n\n${reportData.summary}`);
  }

  function getReportData() {
    switch (selectedReport) {
      case "Attendance Summary":
        return {
          summary: `Attendance Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nTotal Employees: ${attendanceData.reduce((sum, d) => sum + d.total, 0)}\nOverall Attendance Rate: 92%`
        };
      case "Overtime Summary":
        return {
          summary: `Overtime Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nTotal Requests: ${overtimeData.reduce((sum, d) => sum + d.requests, 0)}\nTotal Hours: ${overtimeData.reduce((sum, d) => sum + d.totalHours, 0)}`
        };
      case "Payroll Summary":
        return {
          summary: `Payroll Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nTotal Gross Pay: ₱${payrollData.reduce((sum, d) => sum + d.grossPay, 0).toLocaleString()}\nTotal Net Pay: ₱${payrollData.reduce((sum, d) => sum + d.netPay, 0).toLocaleString()}`
        };
      case "Employee List":
        return {
          summary: `Employee List Report\nTotal Employees: ${employeeListData.length}\nActive Employees: ${employeeListData.filter(e => e.status === "Active").length}\nDepartments: ${[...new Set(employeeListData.map(e => e.dept))].join(", ")}`
        };
      case "Leave Summary":
        return {
          summary: `Leave Summary Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nTotal Leave Requests: ${leaveData.reduce((sum, d) => sum + d.pendingLeaves + d.approvedLeaves + d.rejectedLeaves, 0)}\nTotal Leave Days: ${leaveData.reduce((sum, d) => sum + d.totalDays, 0)}`
        };
      case "Custom Report":
        return {
          summary: `Custom Report\nPeriod: ${dateRange.start} to ${dateRange.end}\nDepartment: ${dept}\nThis is a customizable report that can be configured based on specific requirements.`
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
              <span className="profile-avatar">AU</span>
              <span>Admin User</span>
            </button>
            <div className={`profile-popover${isProfileOpen ? " open" : ""}`}>
              <div className="profile-row">Profile</div>
              <div className="profile-row" onClick={() => navigate("/")}>Log out</div>
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
                  <div className="t-head">
                    <div>Department</div>
                    <div>Total Employees</div>
                    <div>Present</div>
                    <div>Late</div>
                    <div>Absent</div>
                    <div>Attendance Rate</div>
                  </div>
                  {attendanceData.map((d, i) => (
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
                    <div>92%</div>
                  </div>
                </div>
              )}

              {selectedReport === "Employee List" && (
                <div className="summary-table">
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
                      <div><span className="status-badge active">{emp.status}</span></div>
                      <div>{emp.joinDate}</div>
                      <div>{emp.email}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedReport === "Leave Summary" && (
                <div className="summary-table">
                  <div className="t-head">
                    <div>Department</div>
                    <div>Total Employees</div>
                    <div>Pending Leaves</div>
                    <div>Approved Leaves</div>
                    <div>Rejected Leaves</div>
                    <div>Total Days</div>
                  </div>
                  {leaveData.map((d, i) => (
                    <div key={d.dept} className="t-row">
                      <div>{d.dept}</div>
                      <div>{d.totalEmployees}</div>
                      <div>{d.pendingLeaves}</div>
                      <div>{d.approvedLeaves}</div>
                      <div>{d.rejectedLeaves}</div>
                      <div>{d.totalDays}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedReport === "Custom Report" && (
                <div className="custom-report-content">
                  <div className="custom-section">
                    <h3>Report Configuration</h3>
                    <p>This is a customizable report that can be configured based on specific requirements.</p>
                    <div className="config-options">
                      <div className="config-item">
                        <label>Include Employee Details</label>
                        <input type="checkbox" defaultChecked />
                      </div>
                      <div className="config-item">
                        <label>Include Financial Data</label>
                        <input type="checkbox" />
                      </div>
                      <div className="config-item">
                        <label>Include Attendance Data</label>
                        <input type="checkbox" defaultChecked />
                      </div>
                    </div>
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


