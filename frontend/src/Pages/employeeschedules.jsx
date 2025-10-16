import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../AdminPages/admincss/admindashboard.css"; // Use admin layout CSS
import "../Pages/employeecss/employeeschedules.css";

export default function EmployeeSchedules() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  const handlePrev = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
  };

  const handleNext = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
  };

  // Sample shift assignments
  const shifts = {
    morning: [1, 3, 5, 7, 9, 11, 13],
    afternoon: [2, 4, 6, 8, 10, 12, 14],
    night: [15, 17, 19, 21, 23, 25, 27],
    dayoff: [16, 22, 28]
  };

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const blanks = Array.from({ length: firstDay.getDay() }, (_, i) => ({ key: `b-${i}`, empty: true }));
    const days = Array.from({ length: lastDay.getDate() }, (_, i) => ({ day: i + 1 }));
    return [...blanks, ...days];
  }, [currentDate]);

  const renderShiftPill = (d) => {
    if (shifts.morning.includes(d)) return <div className="shift-pill">Morning (8:00 AM - 4:00 PM)</div>;
    if (shifts.afternoon.includes(d)) return <div className="shift-pill">Afternoon (2:00 PM - 10:00 PM)</div>;
    if (shifts.night.includes(d)) return <div className="shift-pill">Night (10:00 PM - 6:00 AM)</div>;
    return null;
  };

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
          <Link className="nav-item active" to="/employee/schedules">Schedules</Link>
          <Link className="nav-item" to="/employee/leave-requests">Leave Requests</Link>
          <Link className="nav-item" to="/employee/payslips">Payslips</Link>
        </nav>
      </aside>

      {/* Main Content - matches admin layout */}
      <main className="admin-content">
        <header className="admin-topbar">
          <h1>Schedules</h1>
          <div className="top-actions">
            <button
              className="profile-btn"
              onClick={() => {
                const el = document.getElementById("user-popover-sch");
                if (el) el.classList.toggle("open");
              }}
            >
              <span className="profile-avatar">EO</span>
              <span>Ezra Orizal</span>
            </button>
            <div id="user-popover-sch" className="profile-popover">
              <div className="profile-row">Profile</div>
              <div className="profile-row" onClick={() => (window.location.href = "/")}>Log out</div>
            </div>
          </div>
        </header>

        <section className="card legend">
          <div className="legend-row">
            <span className="dot morning"></span> Morning Shift (8:00 AM - 4:00 PM)
          </div>
          <div className="legend-row">
            <span className="dot afternoon"></span> Afternoon Shift (2:00 PM - 10:00 PM)
          </div>
          <div className="legend-row">
            <span className="dot night"></span> Night Shift (10:00 PM - 6:00 AM)
          </div>
          <div className="legend-row">
            <span className="dot dayoff"></span> Day Off
          </div>
        </section>

        <section className="card">
          <div className="calendar-head">
            <div className="title">Work Schedule</div>
            <div className="nav">
              <button onClick={handlePrev}>‹</button>
              <div id="monthLabel">{`${monthName} ${year}`}</div>
              <button onClick={handleNext}>›</button>
            </div>
          </div>

          <div className="weekday-grid">
            {weekdayLabels.map((w) => (
              <div className="weekday" key={w}>{w}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {daysInMonth.map((d) => (
              d.empty ? (
                <div key={d.key} className="calendar-cell empty"></div>
              ) : (
                <div key={d.day} className="calendar-cell day">
                  <div className="cell-head">
                    <span className="cell-day-number">{d.day}</span>
                  </div>
                  {renderShiftPill(d.day)}
                </div>
              )
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
