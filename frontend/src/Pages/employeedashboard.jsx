import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css"; // Use admin layout CSS
import "../Pages/employeecss/employeeDashboard.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { useSidebarState } from "../hooks/useSidebarState";
import { API_BASE_URL } from "../config/api";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [isTopUserOpen, setIsTopUserOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState(getSessionUserProfile());
  const [todayLabel] = useState(() =>
    new Date().toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  );
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const { isSidebarOpen, toggleSidebar, closeSidebar, isMobileView } = useSidebarState();

  // Session destroyer function
  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Close profile popover
    setIsTopUserOpen(false);
    // Call logout utility
    logout();
  };

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileInfo);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log("=== Dashboard useEffect triggered ===");
    const loadDashboardData = async () => {
      const username = sessionStorage.getItem("username") || "";
      let employeeId = sessionStorage.getItem("userId") || "";
      let currentDept = sessionStorage.getItem("department") || "";
      console.log("SessionStorage:", { username, employeeId, currentDept });

      if (!username && !employeeId) {
        console.error("❌ No username or employeeId found in sessionStorage");
        setStatusMessage("We couldn't detect your session. Please sign in again to load your dashboard.");
        setLoading(false);
        return;
      }

      console.log("✅ Starting to load dashboard data...");
      setLoading(true);
      try {
        // First, fetch user data to get the correct user_id
        if (username) {
          try {
            const userRes = await fetch(`${API_BASE_URL}/users?username=${encodeURIComponent(username)}`, {
              credentials: "include",
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              const user = Array.isArray(userData)
                ? userData.find((u) => u.username === username)
                : userData;

              if (user) {
                // Prefer user_id over id, as that's what the backend uses
                const userId = user.user_id ?? user.id;
                if (userId) {
                  employeeId = String(userId);
                  sessionStorage.setItem("userId", employeeId);
                }
                if (user.department) {
                  currentDept = user.department;
                  sessionStorage.setItem("department", currentDept);
                }
              }
            } else {
              console.warn("Failed to fetch user data, status:", userRes.status);
            }
          } catch (err) {
            console.error("Failed to fetch user data:", err);
          }
        } else {
          console.warn("Username not found in session storage. Falling back to stored userId.");
        }

        if (!employeeId) {
          console.warn("No employeeId found - cannot load dashboard data");
          setStatusMessage("We couldn't find your employee record. Please log out and sign back in.");
          setLoading(false);
          return;
        }

        // Now fetch dashboard data
        const url = `${API_BASE_URL}/employee-dashboard/overview?employeeId=${encodeURIComponent(employeeId)}${currentDept ? `&department=${encodeURIComponent(currentDept)}` : ""}`;
        console.log("Fetching dashboard data from:", url);

        const res = await fetch(url, { credentials: "include" });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("API Error:", res.status, errorText);
          throw new Error(`Failed to load dashboard data: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        console.log("Dashboard data received:", JSON.stringify(data, null, 2));
        console.log("Leave balances raw:", data.leaveBalances);
        console.log("Announcements raw:", data.announcements);
        console.log("Attendance raw:", data.attendance);

        // Format leave balances
        // The backend should always return at least the default leave types
        let balances = data.leaveBalances || [];
        if (!Array.isArray(balances)) {
          console.warn("leaveBalances is not an array:", balances);
          balances = [];
        }

        // If balances is empty, try fetching directly from the balances endpoint (same as leave requests page)
        if (balances.length === 0 && employeeId) {
          console.log("Leave balances is empty, trying direct balances endpoint...");
          try {
            const balanceRes = await fetch(`${API_BASE_URL}/leave-requests/balances?employeeId=${encodeURIComponent(employeeId)}`, {
              credentials: "include",
            });
            if (balanceRes.ok) {
              const balanceData = await balanceRes.json();
              balances = Array.isArray(balanceData) ? balanceData : [];
              console.log("Direct balances endpoint returned:", balances.length, "items");
            }
          } catch (err) {
            console.error("Failed to fetch from direct balances endpoint:", err);
          }
        }

        // If still empty, use default types
        if (balances.length === 0) {
          console.log("Still empty, using default leave types");
          balances = [
            { type: "Vacation", allocated: 15, used: 0, remaining: 15 },
            { type: "Sick Leave", allocated: 10, used: 0, remaining: 10 },
            { type: "Personal Leave", allocated: 5, used: 0, remaining: 5 },
            { type: "Emergency Leave", allocated: 3, used: 0, remaining: 3 },
          ];
        }

        const formattedBalances = balances.map((balance) => ({
          type: balance.type || "Unknown",
          label: balance.type || "Leave",
          total: balance.allocated || 0,
          used: balance.used || 0,
          remaining: balance.remaining || 0,
        }));
        console.log("Formatted leave balances:", formattedBalances);
        console.log("Setting leave balances count:", formattedBalances.length);
        console.log("First balance example:", formattedBalances[0]);
        setLeaveBalances(formattedBalances);
        console.log("✅ Leave balances state updated, count:", formattedBalances.length);

        // Format announcements
        const formattedAnnouncements = Array.isArray(data.announcements)
          ? data.announcements.map((ann) => ({
            id: ann.id,
            title: ann.title || "Untitled",
            body: ann.body || "",
            date: ann.publishedAt
              ? new Date(ann.publishedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
              : "",
          }))
          : [];
        console.log("Formatted announcements:", formattedAnnouncements);
        console.log("Setting announcements count:", formattedAnnouncements.length);
        setAnnouncements(formattedAnnouncements);
        console.log("✅ Announcements state updated, count:", formattedAnnouncements.length);

        // Set attendance data
        console.log("Attendance data:", data.attendance);
        const attendanceInfo = data.attendance || null;
        if (attendanceInfo) {
          console.log("Attendance summary:", attendanceInfo.summary);
          console.log("Attendance recent count:", attendanceInfo.recent?.length || 0);
        }
        setAttendanceData(attendanceInfo);
        console.log("✅ All data loaded successfully");
        setStatusMessage("");
      } catch (error) {
        console.error("❌ Error loading dashboard data:", error);
        console.error("Error details:", error.message, error.stack);
        // Keep empty states on error
        setLeaveBalances([]);
        setAnnouncements([]);
        setAttendanceData(null);
        setStatusMessage("We couldn't load your dashboard data. Please refresh the page or try again later.");
      } finally {
        console.log("Setting loading to false");
        setLoading(false);
        console.log("=== Dashboard data loading completed ===");
      }
    };

    loadDashboardData();

    // Also test if API_BASE_URL is accessible
    console.log("API_BASE_URL:", API_BASE_URL);
    fetch(`${API_BASE_URL}/employee-dashboard/overview?employeeId=test`, { credentials: "include" })
      .then(res => console.log("Test API call status:", res.status, res.statusText))
      .catch(err => console.error("Test API call failed:", err));
  }, []);

  // Debug effect to track state changes
  useEffect(() => {
    console.log("State update - Loading:", loading, "Leave Balances:", leaveBalances.length, "Announcements:", announcements.length, "Attendance:", attendanceData ? "present" : "null");
  }, [loading, leaveBalances, announcements, attendanceData]);

  return (
    <div className={`admin-layout${isSidebarOpen ? "" : " sidebar-collapsed"}`}>
      <aside className={`admin-sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
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
            <h1>Dashboard</h1>
          </div>
          <div className="top-actions">
            <button
              className="profile-btn"
              onClick={() => setIsTopUserOpen((v) => !v)}
            >
              <span className="profile-avatar">{profileInfo.initials}</span>
              <span>{profileInfo.displayName}</span>
            </button>
            <div
              className={`profile-popover${isTopUserOpen ? " open" : ""}`}
            >
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

        <section className="welcome-card">
          <div className="welcome-title">
            Welcome, <strong>{profileInfo.displayName}</strong>
          </div>
          <div className="welcome-sub">{todayLabel}</div>
          {statusMessage && (
            <div className="dashboard-status">
              {statusMessage}
            </div>
          )}
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
                <div className="qc-sub">Request time o`ff or report absence</div>
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
            {loading ? (
              <div className="empty-state">Loading leave balance...</div>
            ) : leaveBalances.length === 0 ? (
              <div className="empty-state">
                Leave balance data will appear here once available.
                {process.env.NODE_ENV === 'development' && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
                    Debug: leaveBalances.length = {leaveBalances.length}, loading = {String(loading)}
                  </div>
                )}
              </div>
            ) : (
              <div className="bars">
                {leaveBalances.map((leave) => (
                  <div className="bar-row" key={leave.type || leave.label}>
                    <span>{leave.label || leave.type}</span>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            leave.total > 0 && Number.isFinite((leave.used / leave.total) * 100)
                              ? Math.round((leave.used / leave.total) * 100)
                              : 0
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6b7280" }}>
                      Used {leave.used || 0} of {leave.total || 0} • Remaining {leave.remaining || 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link className="link" to="/employee/leave-requests">Request leave →</Link>
          </div>

          <div className="card">
            <div className="card-title">Recent Announcements</div>
            {loading ? (
              <div className="empty-state">Loading announcements...</div>
            ) : announcements.length === 0 ? (
              <div className="empty-state">
                Announcements will appear here once they are published.
              </div>
            ) : (
              announcements.map((item) => (
                <div className="announcement" key={item.id}>
                  <div className="ann-title">{item.title}</div>
                  <div className="ann-body">{item.body}</div>
                  <div className="ann-date">{item.date}</div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <div className="section-head">
            <div className="section-title">Your Attendance</div>
          </div>
          {loading ? (
            <div className="empty-state">Loading attendance data...</div>
          ) : !attendanceData || (attendanceData.summary && Object.values(attendanceData.summary).every(v => v === 0)) ? (
            <div className="empty-state">
              Attendance analytics will appear here once your records are available.
            </div>
          ) : attendanceData.summary ? (
            <div>
              <div className="attendance-summary">
                <div className="att-summary-card present">
                  <div className="att-summary-value">
                    {attendanceData.summary.Present || 0}
                  </div>
                  <div className="att-summary-label">Present</div>
                </div>
                <div className="att-summary-card late">
                  <div className="att-summary-value">
                    {attendanceData.summary.Late || 0}
                  </div>
                  <div className="att-summary-label">Late</div>
                </div>
                <div className="att-summary-card absent">
                  <div className="att-summary-value">
                    {attendanceData.summary.Absent || 0}
                  </div>
                  <div className="att-summary-label">Absent</div>
                </div>
              </div>
              {attendanceData.recent && attendanceData.recent.length > 0 && (
                <div className="attendance-recent">
                  <div className="attendance-recent-title">Recent Records</div>
                  <div className="attendance-recent-list">
                    {attendanceData.recent.slice(0, 5).map((record) => (
                      <div key={record.id} className="attendance-record">
                        <span className="attendance-record-date">
                          {new Date(record.timestamp).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className={`attendance-record-status ${record.status.toLowerCase()}`}>
                          {record.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              Attendance analytics will appear here once your records are available.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
