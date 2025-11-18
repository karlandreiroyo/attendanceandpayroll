import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./admincss/adminDashboard.css";
import "./admincss/adminLeaveRequests.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { API_BASE_URL } from "../config/api";
import { useSidebarState } from "../hooks/useSidebarState";

const STATUS_OPTIONS = ["All Statuses", "Pending", "Approved", "Rejected", "Cancelled"];
const TYPE_OPTIONS = ["All Types", "Vacation", "Sick Leave", "Personal Leave", "Emergency Leave"];

function getDurationInDays(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  const diff = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}

function formatDate(value, includeTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, includeTime ? { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" } : { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminLeaveRequests() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => getSessionUserProfile());
  const [rawRequests, setRawRequests] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [updating, setUpdating] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const { isSidebarOpen, toggleSidebar, closeSidebar, isMobileView } = useSidebarState();

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileData);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isMobileView) {
      closeSidebar();
    }
  }, [location.pathname, isMobileView, closeSidebar]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch(`${API_BASE_URL}/users`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();
        const map = {};
        (Array.isArray(data) ? data : []).forEach((user) => {
          const id = user.user_id ?? user.id;
          if (!id) return;
          const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "";
          map[String(id)] = {
            fullName,
            department: user.department || "",
          };
        });
        setUsersById(map);
      } catch (error) {
        console.error(error);
      }
    }
    loadUsers();
  }, []);

  const requests = useMemo(() => {
    return rawRequests.map((request) => {
      const employeeKey = request.employee_id != null ? String(request.employee_id) : "";
      const user = usersById[employeeKey];
      const department = (request.department || user?.department || "").trim();
      const employeeName = (request.employee_name || user?.fullName || "Unknown").trim();
      return {
        id: request.id,
        employeeId: request.employee_id,
        employee: employeeName || "Unknown",
        department,
        type: request.type,
        status: request.status,
        startDate: request.start_date,
        endDate: request.end_date,
        submittedAt: request.submitted_at,
        adminNote: request.admin_note,
        reason: request.reason || "",
      };
    });
  }, [rawRequests, usersById]);

  const selectedRequest = useMemo(
    () => requests.find((req) => req.id === selectedRequestId) || null,
    [requests, selectedRequestId]
  );

  useEffect(() => {
    let isMounted = true;
    async function loadRequests() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/leave-requests`, { credentials: "include" });
        if (!res.ok) {
          throw new Error("Failed to load leave requests");
        }
        const data = await res.json();
        if (isMounted) {
          const normalised = Array.isArray(data) ? data : [];
          setRawRequests(normalised);
        }
      } catch (error) {
        if (isMounted) {
          setNotice({ type: "error", message: error.message || "Unable to load leave requests." });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadRequests();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const departments = useMemo(() => {
    const deptSet = new Set(["All Departments"]);
    requests.forEach((req) => {
      if (req.department) deptSet.add(req.department);
    });
    return Array.from(deptSet);
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const { from, to } = dateRange;
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    return requests.filter((req) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        [req.employee, req.id, req.type, req.department]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase());

      const matchesStatus =
        statusFilter === "All Statuses" || req.status === statusFilter;
      const matchesType = typeFilter === "All Types" || req.type === typeFilter;
      const matchesDept = deptFilter === "All Departments" || req.department === deptFilter;

      const requestStart = new Date(req.startDate);
      const requestEnd = new Date(req.endDate);

      const matchesDate =
        (!fromDate || requestEnd >= fromDate) &&
        (!toDate || requestStart <= toDate);

      return matchesSearch && matchesStatus && matchesType && matchesDept && matchesDate;
    });
  }, [requests, searchTerm, statusFilter, typeFilter, deptFilter, dateRange]);

  async function updateRequestStatus(id, status) {
    setUpdating((prev) => [...prev, id]);
    try {
      const res = await fetch(`${API_BASE_URL}/leave-requests/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to update status");
      }
      const updated = await res.json();
      setRawRequests((prev) => prev.map((req) => (req.id === id ? updated : req)));
      setNotice({ type: "success", message: `Request ${id} marked as ${status}.` });
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Failed to update status." });
    } finally {
      setUpdating((prev) => prev.filter((item) => item !== id));
    }
  }

  const closeDetails = () => setSelectedRequestId(null);

  useEffect(() => {
    if (!selectedRequestId) return;
    const handler = (event) => {
      if (event.key === "Escape") {
        closeDetails();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedRequestId]);

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
  };

  return (
    <div className={`admin-layout${isSidebarOpen ? "" : " sidebar-collapsed"}`}>
      <aside className={`admin-sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
        <div className="brand">
          <div className="brand-avatar">TI</div>
          <div className="brand-name">Tatay Ilio</div>
        </div>
        <nav className="nav">
          <Link className={`nav-item${isActive("/admin/dashboard") ? " active" : ""}`} to="/admin/dashboard">Dashboard</Link>
          <Link className={`nav-item${isActive("/admin/employee") ? " active" : ""}`} to="/admin/employee">Employees</Link>
          <Link className={`nav-item${isActive("/admin/schedules") ? " active" : ""}`} to="/admin/schedules">Schedules</Link>
          <Link className={`nav-item${isActive("/admin/attendance") ? " active" : ""}`} to="/admin/attendance">Attendance</Link>
          <Link className={`nav-item${isActive("/admin/leave-requests") ? " active" : ""}`} to="/admin/leave-requests">Leave Requests</Link>
          <Link className={`nav-item${isActive("/admin/payroll") ? " active" : ""}`} to="/admin/payroll">Payroll</Link>
          <Link className={`nav-item${isActive("/admin/reports") ? " active" : ""}`} to="/admin/reports">Reports</Link>
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
            <h1>Leave Requests</h1>
          </div>
          <div className="top-actions">
            <button className="profile-btn" onClick={() => setIsProfileOpen((open) => !open)}>
              <span className="profile-avatar">
                {profileData.profilePicture ? (
                  <img
                    src={profileData.profilePicture}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  profileData.initials
                )}
              </span>
              <span>{profileData.displayName}</span>
            </button>
            <div className={`profile-popover${isProfileOpen ? " open" : ""}`}>
              <div
                className="profile-row"
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate("/admin/profile");
                }}
              >
                Profile
              </div>
              <div className="profile-row" onClick={handleLogout}>Log out</div>
            </div>
          </div>
        </header>

        <section className="lr-filters card">
          {notice && <div className={`lr-alert ${notice.type}`}>{notice.message}</div>}
          <div className="lr-filters-row">
            <input
              type="search"
              placeholder="Search by employee, request ID, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div className="lr-filters-row">
            <div className="lr-date-field">
              <label htmlFor="lr-from">From</label>
              <input
                id="lr-from"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div className="lr-date-field">
              <label htmlFor="lr-to">To</label>
              <input
                id="lr-to"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("All Statuses");
                setTypeFilter("All Types");
                setDeptFilter("All Departments");
                setDateRange({ from: "", to: "" });
              }}
            >
              Clear Filters
            </button>
          </div>
        </section>

        <section className="card lr-table">
          <div className="lr-table-head">
            <div>Request ID</div>
            <div>Employee</div>
            <div>Dates</div>
            <div>Duration</div>
            <div>Type</div>
            <div>Status</div>
            <div>Submitted</div>
            <div>Actions</div>
          </div>
          {loading ? (
            <div className="lr-empty">Loading leave requests…</div>
          ) : filteredRequests.length === 0 ? (
            <div className="lr-empty">
              No leave requests match your filters yet.
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div
                key={req.id}
                className="lr-table-row"
                onClick={() => setSelectedRequestId(req.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedRequestId(req.id);
                  }
                }}
              >
                <div className="lr-badge">{req.id}</div>
                <div>
                  <div className="lr-emp-name">{req.employee}</div>
              {req.department ? (
                <div className="lr-emp-meta">{req.department}</div>
              ) : null}
                </div>
                <div>
                  <div>{new Date(req.startDate).toLocaleDateString()}</div>
                  <div className="lr-muted">to {new Date(req.endDate).toLocaleDateString()}</div>
                </div>
                <div>{getDurationInDays(req.startDate, req.endDate)} day(s)</div>
                <div>{req.type}</div>
                <div>
                  <span className={`pill ${req.status.toLowerCase()}`}>{req.status}</span>
                </div>
                <div>{new Date(req.submittedAt).toLocaleDateString()}</div>
                <div
                  className="lr-actions"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="btn mini"
                    onClick={() => updateRequestStatus(req.id, "Approved")}
                    disabled={req.status === "Approved" || updating.includes(req.id)}
                  >
                    {updating.includes(req.id) ? "Updating…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="btn mini warn"
                    onClick={() => updateRequestStatus(req.id, "Rejected")}
                    disabled={req.status === "Rejected" || updating.includes(req.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
      {selectedRequest && (
        <div className="lr-modal-backdrop" role="presentation" onClick={closeDetails}>
          <div
            className="lr-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lr-modal-header">
              <h2 id="leave-modal-title">Leave Request Details</h2>
              <button type="button" className="lr-modal-close" onClick={closeDetails} aria-label="Close">
                ×
              </button>
            </div>
            <div className="lr-modal-body">
              <div className="lr-modal-section">
                <div className="lr-modal-label">Employee</div>
                <div className="lr-modal-value">{selectedRequest.employee}</div>
                {selectedRequest.department && (
                  <div className="lr-modal-subvalue">{selectedRequest.department}</div>
                )}
              </div>
              <div className="lr-modal-grid">
                <div>
                  <div className="lr-modal-label">Type</div>
                  <div className="lr-modal-value">{selectedRequest.type}</div>
                </div>
                <div>
                  <div className="lr-modal-label">Status</div>
                  <div className={`lr-modal-status ${selectedRequest.status.toLowerCase()}`}>
                    {selectedRequest.status}
                  </div>
                </div>
                <div>
                  <div className="lr-modal-label">Start Date</div>
                  <div className="lr-modal-value">{formatDate(selectedRequest.startDate)}</div>
                </div>
                <div>
                  <div className="lr-modal-label">End Date</div>
                  <div className="lr-modal-value">{formatDate(selectedRequest.endDate)}</div>
                </div>
                <div>
                  <div className="lr-modal-label">Duration</div>
                  <div className="lr-modal-value">
                    {getDurationInDays(selectedRequest.startDate, selectedRequest.endDate)} day(s)
                  </div>
                </div>
                <div>
                  <div className="lr-modal-label">Submitted</div>
                  <div className="lr-modal-value">{formatDate(selectedRequest.submittedAt, true)}</div>
                </div>
              </div>
              <div className="lr-modal-section">
                <div className="lr-modal-label">Reason</div>
                <div className="lr-modal-text">
                  {selectedRequest.reason ? selectedRequest.reason : <span className="lr-muted">No reason provided.</span>}
                </div>
              </div>
              {selectedRequest.adminNote && (
                <div className="lr-modal-section">
                  <div className="lr-modal-label">Admin Note</div>
                  <div className="lr-modal-text">{selectedRequest.adminNote}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


