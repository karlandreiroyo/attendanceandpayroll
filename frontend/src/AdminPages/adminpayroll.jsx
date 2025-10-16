import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/admindashboard.css";
import "../AdminPages/admincss/adminpayroll.css";

export default function AdminPayroll() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState({ start: "2023-06-01", end: "2023-06-15" });
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [rows, setRows] = useState([
    { id: 1, name: "Ezra Orizal", empId: "EMP001", position: "Software Developer", dept: "IT", basic: 25000, allow: 2000, ot: 1500, gross: 28500, deduct: 3000, net: 25500, status: "Pending" },
    { id: 2, name: "Heuben Clyde Dagami", empId: "EMP002", position: "HR Manager", dept: "HR", basic: 30000, allow: 3000, ot: 0, gross: 33000, deduct: 4650, net: 28350, status: "Pending" },
    { id: 3, name: "Jheff Cruz", empId: "EMP003", position: "Accountant", dept: "Finance", basic: 23000, allow: 1500, ot: 2000, gross: 26500, deduct: 2750, net: 23750, status: "Pending" },
    { id: 4, name: "John Ivan Santos", empId: "EMP004", position: "Marketing Specialist", dept: "Marketing", basic: 22000, allow: 1500, ot: 0, gross: 23500, deduct: 3000, net: 20500, status: "Pending" },
    { id: 5, name: "Karl Andrei Royo", empId: "EMP005", position: "Operations Manager", dept: "Operations", basic: 32000, allow: 3000, ot: 0, gross: 35000, deduct: 4000, net: 31000, status: "Pending" },
  ]);

  const filtered = useMemo(() => {
    let filtered = rows;
    
    // Text search filter
    const q = query.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(r => `${r.name} ${r.empId} ${r.position}`.toLowerCase().includes(q));
    }
    
    // Department filter
    if (deptFilter !== "All Departments") {
      filtered = filtered.filter(r => r.dept === deptFilter);
    }
    
    // Status filter
    if (statusFilter !== "All Status") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    return filtered;
  }, [rows, query, deptFilter, statusFilter]);

  const totals = useMemo(() => ({
    gross: rows.reduce((t, r) => t + r.gross, 0),
    deduct: rows.reduce((t, r) => t + r.deduct, 0),
    net: rows.reduce((t, r) => t + r.net, 0),
  }), [rows]);

  function peso(n) {
    return `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
  }

  function processPayroll() {
    if (window.confirm("Are you sure you want to process payroll for this period?")) {
      setRows(prev => prev.map(r => ({ ...r, status: "Processed" })));
      alert("Payroll processed successfully!");
    }
  }

  function exportPayroll() {
    const csvContent = [
      ["Employee", "Employee ID", "Position", "Department", "Basic Salary", "Allowances", "Overtime", "Gross Pay", "Deductions", "Net Pay", "Status"],
      ...filtered.map(row => [
        row.name,
        row.empId,
        row.position,
        row.dept,
        row.basic,
        row.allow,
        row.ot,
        row.gross,
        row.deduct,
        row.net,
        row.status
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${period.start}-to-${period.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function updatePeriod(newPeriod) {
    setPeriod(newPeriod);
    // In a real app, this would fetch payroll data for the new period
    alert(`Payroll period updated to ${newPeriod.start} - ${newPeriod.end}`);
  }

  function openPayrollDetails(employee) {
    setSelectedEmployee(employee);
    setIsDetailsOpen(true);
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
          <h1>Payroll</h1>
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

        <section className="payroll-card">
          <div className="pay-period">
            <div className="period-left">
              <span className="calendar-icon">📅</span>
              <div className="period-range">{new Date(period.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(period.end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, 2023</div>
            </div>
            <button className="btn warn" onClick={processPayroll}>Process Payroll</button>
          </div>

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
                <option>All Departments</option>
                <option>IT</option>
                <option>HR</option>
                <option>Finance</option>
                <option>Marketing</option>
                <option>Operations</option>
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
              <div>Employee</div>
              <div>Position</div>
              <div>Basic Salary</div>
              <div>Allowances</div>
              <div>Overtime</div>
              <div>Gross Pay</div>
              <div>Deductions</div>
              <div>Net Pay</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            <div className="p-body">
              {filtered.map(r => (
                <div key={r.id} className="p-row">
                  <div>
                    <div className="emp">
                      <div className="emp-avatar">{r.name[0]}</div>
                      <div className="emp-meta">
                        <div className="emp-name">{r.name}</div>
                        <div className="emp-email">{r.empId}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div>{r.position}</div>
                    <div className="sub">{r.dept}</div>
                  </div>
                  <div>{peso(r.basic)}</div>
                  <div>{peso(r.allow)}</div>
                  <div>{peso(r.ot)}</div>
                  <div>{peso(r.gross)}</div>
                  <div>{peso(r.deduct)}</div>
                  <div>{peso(r.net)}</div>
                  <div><span className="pill pill-warn">{r.status}</span></div>
                  <div className="actions"><button className="link" onClick={() => openPayrollDetails(r)}>Details</button></div>
                </div>
              ))}
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
                    {selectedEmployee.name[0]}
                  </div>
                  <div className="employee-info">
                    <h2 className="employee-name">{selectedEmployee.name}</h2>
                    <p className="employee-position">{selectedEmployee.position}</p>
                    <span className="employee-dept">{selectedEmployee.dept}</span>
                  </div>
                </div>

                <div className="payroll-breakdown">
                  <div className="breakdown-section">
                    <h3>Earnings</h3>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Basic Salary</span>
                      <span className="breakdown-value">{peso(selectedEmployee.basic)}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Allowances</span>
                      <span className="breakdown-value">{peso(selectedEmployee.allow)}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Overtime Pay</span>
                      <span className="breakdown-value">{peso(selectedEmployee.ot)}</span>
                    </div>
                    <div className="breakdown-item total">
                      <span className="breakdown-label">Gross Pay</span>
                      <span className="breakdown-value">{peso(selectedEmployee.gross)}</span>
                    </div>
                  </div>

                  <div className="breakdown-section">
                    <h3>Deductions</h3>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Tax (10%)</span>
                      <span className="breakdown-value">{peso(selectedEmployee.gross * 0.1)}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">SSS Contribution</span>
                      <span className="breakdown-value">{peso(800)}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">PhilHealth</span>
                      <span className="breakdown-value">{peso(400)}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Pag-IBIG</span>
                      <span className="breakdown-value">{peso(200)}</span>
                    </div>
                    <div className="breakdown-item total">
                      <span className="breakdown-label">Total Deductions</span>
                      <span className="breakdown-value">{peso(selectedEmployee.deduct)}</span>
                    </div>
                  </div>

                  <div className="breakdown-section net-pay">
                    <h3>Net Pay</h3>
                    <div className="net-pay-amount">
                      <span className="net-pay-label">Take Home Pay</span>
                      <span className="net-pay-value">{peso(selectedEmployee.net)}</span>
                    </div>
                  </div>
                </div>

                <div className="payroll-summary">
                  <div className="summary-item">
                    <span className="summary-label">Pay Period</span>
                    <span className="summary-value">{period.start} to {period.end}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Status</span>
                    <span className="summary-value">
                      <span className={`status-badge ${selectedEmployee.status.toLowerCase()}`}>
                        {selectedEmployee.status}
                      </span>
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Employee ID</span>
                    <span className="summary-value">{selectedEmployee.empId}</span>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn" onClick={() => setIsDetailsOpen(false)}>Close</button>
                  <button className="btn primary" onClick={() => {
                    alert(`Printing payroll details for ${selectedEmployee.name}`);
                  }}>Print Payslip</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


