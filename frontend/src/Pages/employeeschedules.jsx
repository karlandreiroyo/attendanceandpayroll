import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css";
import "../Pages/employeecss/employeeSchedules.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { API_BASE_URL } from "../config/api";
import { useSidebarState } from "../hooks/useSidebarState";

const SHIFT_DEFINITIONS = {
  M: { label: "Morning", hours: "8:00 AM - 4:00 PM" },
  A: { label: "Afternoon", hours: "2:00 PM - 10:00 PM" },
  N: { label: "Night", hours: "10:00 PM - 6:00 AM" },
  O: { label: "Day Off", hours: "" },
};

export default function EmployeeSchedules() {
  const navigate = useNavigate();
  const [isTopUserOpen, setIsTopUserOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState(getSessionUserProfile());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [legendItems, setLegendItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const { isSidebarOpen, toggleSidebar, closeSidebar, isMobileView } = useSidebarState();

  const userId = useMemo(() => sessionStorage.getItem("userId"), []);

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

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
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const blanks = Array.from({ length: firstDay.getDay() }, (_, i) => ({ key: `b-${i}`, empty: true }));
    const days = Array.from({ length: lastDay.getDate() }, (_, i) => ({ day: i + 1 }));
    return [...blanks, ...days];
  }, [year, month]);

  const loadSchedule = useCallback(async () => {
    if (!userId) {
      setScheduleEntries([]);
      setLegendItems([]);
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE_URL}/schedules?year=${year}&month=${month}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load schedule");
      }
      const data = await res.json();
      const shiftMap = (data && data.shifts) || {};
      const legendMap = new Map();
      const entries = [];
      const daysCount = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysCount; day += 1) {
        const code = shiftMap[`${userId}-${day}`];
        if (!code) continue;
        const definition = SHIFT_DEFINITIONS[code] || { label: code, hours: "" };
        entries.push({
          day,
          shift: code,
          label: definition.label,
          time: definition.hours,
        });
        if (!legendMap.has(code)) {
          legendMap.set(code, definition);
        }
      }

      setScheduleEntries(entries);
      setLegendItems(
        Array.from(legendMap.entries()).map(([code, def]) => ({
          key: code,
          label: `${def.label}${def.hours ? ` (${def.hours})` : ""}`,
          className: `dot-${code}`,
        }))
      );
    } catch (error) {
      console.error(error);
      setScheduleEntries([]);
      setLegendItems([]);
      setNotice(error.message || "Unable to load schedule.");
    } finally {
      setLoading(false);
    }
  }, [userId, year, month]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

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

    const definition = SHIFT_DEFINITIONS[entry.shift] || {};
    const label = definition.label || entry.label || entry.shift || "Scheduled";
    const time = definition.hours || entry.time || "";

    return (
      <div className={`shift-pill shift-${entry.shift}`}>
        <span className="shift-pill-label">{label}</span>
        {time && <span className="shift-pill-hours">{time}</span>}
      </div>
    );
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  return (
    <div className={`admin-layout${isSidebarOpen ? "" : " sidebar-collapsed"}`}>
      <aside className={`admin-sidebar employee-sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
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
            <h1>Schedules</h1>
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

        <section className="card legend">
          {legendItems.length === 0 ? (
            <div className="empty-state">
              {loading ? "Loading shifts..." : "Shift legend will appear here once your manager assigns schedules."}
            </div>
          ) : (
            legendItems.map((item) => (
              <div className="legend-row" key={item.key}>
                <span className={`dot ${item.className}`}></span>{item.label}
              </div>
            ))
          )}
        </section>

        <section className="card">
          <div className="calendar-head">
            <div className="title">Work Schedule</div>
            <div className="nav">
              <button onClick={handlePrev} aria-label="Previous month">‹</button>
              <div id="monthLabel">{`${monthName} ${year}`}</div>
              <button onClick={handleNext} aria-label="Next month">›</button>
            </div>
          </div>

          {notice && <div className="schedule-notice">{notice}</div>}

          <div className="weekday-grid">
            {weekdayLabels.map((w) => (
              <div className="weekday" key={w}>{w}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {loading ? (
              <div className="empty-state calendar-empty">Loading your shifts…</div>
            ) : scheduleEntries.length === 0 ? (
              <div className="empty-state calendar-empty">
                Your assigned shifts will appear on this calendar once they are available.
              </div>
            ) : (
              daysInMonth.map((d) =>
                d.empty ? (
                  <div key={d.key} className="calendar-cell empty"></div>
                ) : (
                  <div
                    key={d.day}
                    className={`calendar-cell day${isToday(d.day) ? " is-today" : ""}${
                      scheduleLookup.has(d.day) ? " has-shift" : ""
                    }`}
                  >
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
