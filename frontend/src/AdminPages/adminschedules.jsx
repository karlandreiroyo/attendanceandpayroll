import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/admindashboard.css";
import "../AdminPages/admincss/adminschedules.css";

// Simple helpers for month navigation
function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = last.getDate();
  const matrix = [];
  for (let d = 1; d <= days; d++) matrix.push({ day: d, dow: new Date(year, month, d).getDay() });
  return matrix; // [{day, dow}]
}

export default function AdminSchedules() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const employees = useMemo(() => ([
    { id: 1, name: "Ezra Orizal", dept: "IT" },
    { id: 2, name: "Heuben Clyde Dagami", dept: "HR" },
    { id: 3, name: "Jheff Cruz", dept: "Finance" },
    { id: 4, name: "John Ivan Santos", dept: "Marketing" },
    { id: 5, name: "Karl Andrei Royo", dept: "Operations" },
  ]), []);

  const days = useMemo(() => getMonthMatrix(current.year, current.month), [current]);

  const monthLabel = useMemo(() =>
    new Date(current.year, current.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
  , [current]);

  const [shifts, setShifts] = useState({}); // key: `${empId}-${day}` -> 'M' | 'A' | 'N' | 'O'
  const [templates, setTemplates] = useState([
    { id: 1, name: "Standard 8-5", shifts: { "M": "8:00-17:00", "A": "14:00-22:00", "N": "22:00-6:00" } },
    { id: 2, name: "Flexible Hours", shifts: { "M": "9:00-18:00", "A": "15:00-23:00", "N": "23:00-7:00" } },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  function toggleShift(empId, day) {
    const key = `${empId}-${day}`;
    const order = ["", "M", "A", "N", "O"]; // Morning, Afternoon, Night, Day Off
    const next = order[(order.indexOf(shifts[key] || "") + 1) % order.length];
    setShifts(prev => ({ ...prev, [key]: next }));
  }

  function saveSchedule() {
    const scheduleData = {
      month: current.month,
      year: current.year,
      shifts: shifts,
      savedAt: new Date().toISOString()
    };
    
    // In a real app, this would save to a database
    localStorage.setItem(`schedule-${current.year}-${current.month}`, JSON.stringify(scheduleData));
    alert("Schedule saved successfully!");
  }

  function loadSchedule() {
    const saved = localStorage.getItem(`schedule-${current.year}-${current.month}`);
    if (saved) {
      const scheduleData = JSON.parse(saved);
      setShifts(scheduleData.shifts || {});
    }
  }

  function applyTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const newShifts = {};
    employees.forEach(emp => {
      days.forEach(day => {
        // Apply template logic - for example, alternating shifts
        const dayOfWeek = new Date(current.year, current.month, day.day).getDay();
        let shiftType = "";
        
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Weekdays
          shiftType = emp.id % 2 === 0 ? "M" : "A";
        } else if (dayOfWeek === 0) { // Sunday
          shiftType = "O"; // Day off
        } else { // Saturday
          shiftType = "N";
        }
        
        newShifts[`${emp.id}-${day.day}`] = shiftType;
      });
    });
    
    setShifts(newShifts);
    alert(`Template "${template.name}" applied successfully!`);
  }

  function createTemplate() {
    const templateName = prompt("Enter template name:");
    if (!templateName) return;

    const newTemplate = {
      id: Math.max(...templates.map(t => t.id)) + 1,
      name: templateName,
      shifts: shifts
    };
    
    setTemplates(prev => [...prev, newTemplate]);
    alert(`Template "${templateName}" created successfully!`);
  }

  // Load saved schedule when month changes
  React.useEffect(() => {
    loadSchedule();
  }, [current]);

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
          <h1>Schedules</h1>
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

        <section className="schedule-card">
          <div className="schedule-toolbar">
            <div className="month-nav">
              <button className="icon-btn" onClick={() => setCurrent(c => ({ year: c.month === 0 ? c.year - 1 : c.year, month: (c.month + 11) % 12 }))}>◀</button>
              <div className="month-label">{monthLabel}</div>
              <button className="icon-btn" onClick={() => setCurrent(c => ({ year: c.month === 11 ? c.year + 1 : c.year, month: (c.month + 1) % 12 }))}>▶</button>
            </div>
            <div className="toolbar-actions">
              <select 
                value={selectedTemplate || ""} 
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="template-select"
              >
                <option value="">Select Template</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              <button 
                className="btn outline" 
                onClick={() => selectedTemplate && applyTemplate(parseInt(selectedTemplate))}
                disabled={!selectedTemplate}
              >
                Apply Template
              </button>
              <button className="btn warn" onClick={saveSchedule}>Save Schedule</button>
              <button className="btn primary" onClick={createTemplate}>Create Template</button>
            </div>
          </div>

          <div className="schedule-grid">
            <div className="grid-head sticky">
              <div className="head-cell sticky-col">Employee</div>
              {days.map(d => (
                <div key={d.day} className="head-cell">
                  <div className="head-day">{d.day}</div>
                  <div className="head-dow">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.dow]}</div>
                </div>
              ))}
            </div>

            {employees.map(emp => (
              <div key={emp.id} className="grid-row">
                <div className="emp-col sticky-col">
                  <div className="emp-name">{emp.name}</div>
                  <div className="emp-dept">{emp.dept}</div>
                </div>
                {days.map(d => {
                  const key = `${emp.id}-${d.day}`;
                  const val = shifts[key] || "";
                  return (
                    <button key={key} className={`cell ${val ? `cell-${val}` : ""}`} onClick={() => toggleShift(emp.id, d.day)} />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="legend">
            <span className="legend-item"><span className="dot dot-M" />Morning (8:00 AM - 4:00 PM)</span>
            <span className="legend-item"><span className="dot dot-A" />Afternoon (2:00 PM - 10:00 PM)</span>
            <span className="legend-item"><span className="dot dot-N" />Night (10:00 PM - 6:00 AM)</span>
            <span className="legend-item"><span className="dot dot-O" />Day Off</span>
          </div>
        </section>
      </main>
    </div>
  );
}


