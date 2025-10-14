import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../AdminPages/admincss/admindashboard.css"; // Use admin layout CSS
import "../Pages/employeecss/employeedashboard.css";

export default function EmployeeDashboard() {
  const [view, setView] = useState("Monthly");
  const [currentDate] = useState(new Date());
  const [isTopUserOpen, setIsTopUserOpen] = useState(false);

  useEffect(() => {
    const today = new Date();
    const todayElement = document.getElementById("today");
    if (todayElement) {
      todayElement.textContent = today.toDateString();
    }

    const leaveBars = document.getElementById("leaveBars");
    if (leaveBars) {
      leaveBars.innerHTML = `
        <div class="bar-row"><span>Vacation Leave</span><div class="bar"><div class="bar-fill" style="width: 70%"></div></div></div>
        <div class="bar-row"><span>Sick Leave</span><div class="bar"><div class="bar-fill" style="width: 50%"></div></div></div>
        <div class="bar-row"><span>Emergency Leave</span><div class="bar"><div class="bar-fill" style="width: 30%"></div></div></div>
      `;
    }
  }, []);

  const attendanceDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      let status = "Present";
      if (isWeekend) status = "Weekend";
      if ([4, 12, 18, 26].includes(d)) status = "Absent";
      days.push({ day: d, status });
    }
    return days;
  }, [currentDate]);

  const attendancePercentage = useMemo(() => {
    const present = attendanceDays.filter((d) => d.status === "Present").length;
    const workingDays = attendanceDays.filter((d) => d.status !== "Weekend").length;
    if (workingDays === 0) return 0;
    return Math.round((present / workingDays) * 100);
  }, [attendanceDays]);

  const monthName = useMemo(() =>
    currentDate.toLocaleString("default", { month: "long" }),
  [currentDate]);

  const dailySummary = useMemo(() => {
    const today = currentDate.getDate();
    const todayRec = attendanceDays.find((d) => d.day === today);
    if (!todayRec) return { label: "No Data", percentage: 0 };
    if (todayRec.status === "Present") return { label: "Present", percentage: 100 };
    if (todayRec.status === "Weekend") return { label: "Weekend", percentage: 100 };
    return { label: "Absent", percentage: 0 };
  }, [attendanceDays, currentDate]);

  return (
    <div className="admin-layout">
      {/* Sidebar - matches admin layout */}
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-avatar">TI</div>
          <div className="brand-name">Tatay Ilio</div>
        </div>
        <nav className="nav">
          <Link className="nav-item active" to="/employee/dashboard">Dashboard</Link>
          <Link className="nav-item" to="/employee/schedules">Schedules</Link>
          <Link className="nav-item" to="/employee/leave-requests">Leave Requests</Link>
          <Link className="nav-item" to="/employee/payslips">Payslips</Link>
        </nav>
      </aside>

      {/* Main content - matches admin layout */}
      <main className="admin-content">
        <header className="admin-topbar">
          <h1>Dashboard</h1>
          <div className="top-actions">
            <button
              className="profile-btn"
              onClick={() => setIsTopUserOpen((v) => !v)}
            >
              <span className="profile-avatar">EO</span>
              <span>Ezra Orizal</span>
            </button>
            <div
              className={`profile-popover${isTopUserOpen ? " open" : ""}`}
            >
              <div className="profile-row">Profile</div>
              <div className="profile-row" onClick={() => (window.location.href = "/")}>Log out</div>
            </div>
          </div>
        </header>

        <section className="welcome-card">
          <div className="welcome-title">
            Welcome, <strong>Ezra Orizal</strong>
          </div>
          <div className="welcome-sub" id="today"></div>
        </section>

        <section className="quick-grid">
          <Link className="quick-card" to="/employee/schedules">
            <div className="qc-left">
              <div className="qc-icon">📅</div>
              <div>
                <div className="qc-title">Work Schedules</div>
                <div className="qc-sub">View your upcoming work shifts</div>
              </div>
            </div>
            <div className="qc-chevron">›</div>
          </Link>

          <Link className="quick-card" to="/employee/leave-requests">
            <div className="qc-left">
              <div className="qc-icon">⏱️</div>
              <div>
                <div className="qc-title">Leave Requests</div>
                <div className="qc-sub">Request time off or report absence</div>
              </div>
            </div>
            <div className="qc-chevron">›</div>
          </Link>

          <Link className="quick-card" to="/employee/payslips">
            <div className="qc-left">
              <div className="qc-icon">📄</div>
              <div>
                <div className="qc-title">Payslips</div>
                <div className="qc-sub">Access and download your payslips</div>
              </div>
            </div>
            <div className="qc-chevron">›</div>
          </Link>
        </section>

        <section className="grid-2">
          <div className="card">
            <div className="card-title">Leave Balance</div>
            <div className="bars" id="leaveBars"></div>
            <div className="bar-legend">
              <div className="legend-row">
                <span className="legend-label">Sick Leave</span>
                <span className="legend-value">13 | 15 days</span>
              </div>
              <div className="legend-row">
                <span className="legend-label">Vacation</span>
                <span className="legend-value">10 | 15 days</span>
              </div>
              <div className="legend-row">
                <span className="legend-label">Personal Leave</span>
                <span className="legend-value">4 | 5 days</span>
              </div>
            </div>
            <Link className="link" to="/employee/leave-requests">Request leave →</Link>
          </div>

          <div className="card">
            <div className="card-title">Recent Announcements</div>
            <div className="announcement">
              <div className="ann-title">Company Holiday</div>
              <div className="ann-body">
                Office closed on June 12 for Independence Day.
              </div>
              <div className="ann-date">Posted on June 1, 2023</div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="section-head">
            <div className="section-title">
              Your Attendance {view === "Monthly" ? `- ${monthName}` : view === "Daily" ? "- Daily" : "- Yearly"}
            </div>
            <div className="seg">
              {[
                "Daily",
                "Monthly",
                "Yearly"
              ].map((label) => (
                <button
                  key={label}
                  className={`seg-btn${view === label ? " active" : ""}`}
                  onClick={() => setView(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="card flat">
              <div className="subtle-title">
                {view === "Daily"
                  ? "This Week's Status"
                  : view === "Monthly"
                  ? `This Month's Status — ${monthName}`
                  : `This Year's Status — ${currentDate.getFullYear()}`}
              </div>
              <div className="att-grid">
                {attendanceDays.map((d) => (
                  <div
                    key={d.day}
                    className={`att-cell ${
                      d.status === "Present"
                        ? "att-present"
                        : d.status === "Absent"
                        ? "att-absent"
                        : "att-weekend"
                    }`}
                  >
                    <div className="att-day">{d.day}</div>
                    <div className="att-status">{d.status}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card flat">
              <div className="subtle-title">
                {view === "Daily" ? `Today: ${dailySummary.label}` : "Attendance Summary"}
              </div>
              <div className="summary-wrap">
                <div className="summary-pie">
                  <svg viewBox="0 0 36 36" className="circular-chart">
                    <path
                      className="circle-bg"
                      d="M18 2.0845
                         a 15.9155 15.9155 0 0 1 0 31.831
                         a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="circle"
                      strokeDasharray={`${view === "Daily" ? dailySummary.percentage : attendancePercentage}, 100`}
                      d="M18 2.0845
                         a 15.9155 15.9155 0 0 1 0 31.831
                         a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="20.35" className="percentage">
                      {view === "Daily" ? `${dailySummary.percentage}%` : `${attendancePercentage}%`}
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
