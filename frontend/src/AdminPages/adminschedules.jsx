import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../AdminPages/admincss/adminSchedules.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { API_BASE_URL } from "../config/api";

const SHIFT_DEFINITIONS = {
  M: { label: "Morning", hours: "8:00 AM - 4:00 PM" },
  A: { label: "Afternoon", hours: "2:00 PM - 10:00 PM" },
  N: { label: "Night", hours: "10:00 PM - 6:00 AM" },
  O: { label: "Day Off", hours: "" },
};

const DEPARTMENT_COLOR_PALETTE = [
  "#93c5fd",
  "#fda4af",
  "#c4b5fd",
  "#fdba74",
  "#99f6e4",
  "#f9a8d4",
  "#bef264",
  "#fbcfe8",
  "#fbbf24",
  "#86efac",
];

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
  const [profileData, setProfileData] = useState(() => getSessionUserProfile());
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState(null);

  const days = useMemo(() => getMonthMatrix(current.year, current.month), [current]);

  const monthLabel = useMemo(() =>
    new Date(current.year, current.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
  , [current]);

  const [shifts, setShifts] = useState({}); // key: `${empId}-${day}` -> 'M' | 'A' | 'N' | 'O'

  const departmentColors = useMemo(() => {
    const map = {};
    let index = 0;
    employees.forEach(emp => {
      const dept = emp.dept || "Unassigned";
      if (!map[dept]) {
        map[dept] = DEPARTMENT_COLOR_PALETTE[index % DEPARTMENT_COLOR_PALETTE.length];
        index += 1;
      }
    });
    return map;
  }, [employees]);

  const today = useMemo(() => new Date(), []);
  const minYear = today.getFullYear();
  const minMonth = today.getMonth();
  const minMonthValue = `${minYear}-${String(minMonth + 1).padStart(2, "0")}`;
  const canGoPrevious =
    current.year > minYear || (current.year === minYear && current.month > minMonth);

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
    setScheduleNotice("Schedule saved locally. Connect a backend service to persist it for everyone.");
  }

  function loadSchedule() {
    const saved = localStorage.getItem(`schedule-${current.year}-${current.month}`);
    if (saved) {
      const scheduleData = JSON.parse(saved);
      setShifts(scheduleData.shifts || {});
    }
  }

  useEffect(() => {
    async function loadEmployees() {
      try {
        setLoadingEmployees(true);
        const res = await fetch(`${API_BASE_URL}/users`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load employees");
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : [])
          .filter(emp => (emp.role || "").toLowerCase() !== "admin")
          .map(emp => ({
            id: emp.user_id ?? emp.id,
            name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.username || "Unnamed",
            dept: emp.department || "Unassigned",
            position: emp.position || "",
          }));
        setEmployees(mapped);
      } catch (err) {
        console.error(err);
        setScheduleNotice(err.message || "Unable to load employees.");
      } finally {
        setLoadingEmployees(false);
      }
    }
    loadEmployees();
  }, []);

  function autoAssignSchedule() {
    if (!employees.length) {
      setScheduleNotice("No employees available to schedule yet.");
      return;
    }
    if (!days.length) return;

    const rotations = ["M", "A", "N"];
    const generated = {};

    employees.forEach((emp, empIndex) => {
      days.forEach((day) => {
        const key = `${emp.id}-${day.day}`;
        const rotationIndex = (empIndex + day.day - 1) % rotations.length;
        generated[key] = rotations[rotationIndex];
      });
    });

    setShifts(generated);
    setScheduleNotice("Auto-assigned shifts generated for all employees. Review and save to keep them.");
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

        <section className="schedule-card">
          <div className="schedule-toolbar">
            <div className="month-nav">
              <button
                className="icon-btn"
                onClick={() => {
                  if (!canGoPrevious) return;
                  setCurrent((c) => ({
                    year: c.month === 0 ? c.year - 1 : c.year,
                    month: (c.month + 11) % 12,
                  }));
                }}
                aria-label="Previous month"
                disabled={!canGoPrevious}
              >
                ◀
              </button>
              <input
                className="month-picker"
                type="month"
                value={`${current.year}-${String(current.month + 1).padStart(2, "0")}`}
                min={minMonthValue}
                onChange={(e) => {
                  const [year, month] = e.target.value.split("-").map(Number);
                  if (!Number.isNaN(year) && !Number.isNaN(month)) {
                    if (
                      year < minYear ||
                      (year === minYear && month - 1 < minMonth)
                    ) {
                      return;
                    }
                    setCurrent({ year, month: month - 1 });
                  }
                }}
              />
              <button
                className="icon-btn"
                onClick={() =>
                  setCurrent((c) => ({
                    year: c.month === 11 ? c.year + 1 : c.year,
                    month: (c.month + 1) % 12,
                  }))
                }
                aria-label="Next month"
              >
                ▶
              </button>
            </div>
            <div className="toolbar-actions">
              <button className="btn" onClick={autoAssignSchedule} disabled={!employees.length}>
                Auto Assign
              </button>
              <button className="btn warn" onClick={saveSchedule}>Save Schedule</button>
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

            {loadingEmployees ? (
              <div className="grid-empty">Loading employees...</div>
            ) : employees.length === 0 ? (
              <div className="grid-empty">
                Employee list is empty. Add employees first to start scheduling.
              </div>
            ) : (
              employees.map(emp => (
                <div key={emp.id} className="grid-row">
                  <div className="emp-col sticky-col">
                    <span
                      className="emp-indicator"
                      style={{ backgroundColor: departmentColors[emp.dept || "Unassigned"] || "#d1d5db" }}
                    />
                    <div className="emp-name">{emp.name}</div>
                    <div className="emp-dept">{emp.dept}</div>
                  </div>
                  {days.map(d => {
                    const key = `${emp.id}-${d.day}`;
                    const val = shifts[key] || "";
                    const shiftInfo = SHIFT_DEFINITIONS[val];
                    return (
                      <button
                        key={key}
                        className={`cell ${val ? `cell-${val}` : ""}`}
                        onClick={() => toggleShift(emp.id, d.day)}
                        title={shiftInfo ? `${shiftInfo.label}${shiftInfo.hours ? ` (${shiftInfo.hours})` : ""}` : ""}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="legend">
            <span className="legend-item"><span className="dot dot-M" />Morning (8:00 AM - 4:00 PM)</span>
            <span className="legend-item"><span className="dot dot-A" />Afternoon (2:00 PM - 10:00 PM)</span>
            <span className="legend-item"><span className="dot dot-N" />Night (10:00 PM - 6:00 AM)</span>
            <span className="legend-item"><span className="dot dot-O" />Day Off</span>
          </div>
          {!!Object.keys(departmentColors).length && (
            <div className="department-legend">
              {Object.entries(departmentColors).map(([dept, color]) => (
                <span key={dept} className="department-legend-item">
                  <span className="dept-dot" style={{ backgroundColor: color }} />
                  {dept}
                </span>
              ))}
            </div>
          )}
          {scheduleNotice && (
            <div className="schedule-notice">
              {scheduleNotice}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


