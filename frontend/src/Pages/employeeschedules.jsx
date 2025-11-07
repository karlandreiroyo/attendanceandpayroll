import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css"; // Use admin layout CSS
import "../Pages/employeecss/employeeSchedules.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";

export default function EmployeeSchedules() {
  const navigate = useNavigate();
  const [isTopUserOpen, setIsTopUserOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState(getSessionUserProfile());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleEntries] = useState([]);
  const [legendItems] = useState([]);

  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTopUserOpen(false);
    logout();
  };

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileInfo);
    return () => unsubscribe();
  }, []);

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

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const blanks = Array.from({ length: firstDay.getDay() }, (_, i) => ({ key: `b-${i}`, empty: true }));
    const days = Array.from({ length: lastDay.getDate() }, (_, i) => ({ day: i + 1 }));
    return [...blanks, ...days];
  }, [currentDate]);

  const scheduleLookup = useMemo(() => {
    const map = new Map();
    scheduleEntries.forEach((entry) => {
      if (entry && typeof entry.day === "number") {
        map.set(entry.day, entry);
      }
    });
    return map;
  }, [scheduleEntries]);

  const renderShiftPill = (day) => {
    const entry = scheduleLookup.get(day);
    if (!entry) return null;

    const label = entry.label || entry.shift || "Scheduled";
    const time = entry.time ? ` (${entry.time})` : "";

    return <div className="shift-pill">{`${label}${time}`}</div>;
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
                style={{ cursor: "pointer" }}
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

        <section className="card legend">
          {legendItems.length === 0 ? (
            <div className="empty-state">
              Shift legend will appear here once your manager assigns schedules.
            </div>
          ) : (
            legendItems.map((item) => (
              <div className="legend-row" key={item.key || item.label}>
                <span className={`dot ${item.className || ""}`}></span>{item.label}
              </div>
            ))
          )}
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
            {scheduleEntries.length === 0 ? (
              <div className="empty-state calendar-empty">
                Your assigned shifts will appear on this calendar once they are available.
              </div>
            ) : (
              daysInMonth.map((d) =>
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
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
