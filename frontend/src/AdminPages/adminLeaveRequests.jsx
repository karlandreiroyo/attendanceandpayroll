import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./admincss/adminDashboard.css";
import "./admincss/adminLeaveRequests.css";
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { API_BASE_URL } from "../config/api";

const STATUS_OPTIONS = ["All Statuses", "Pending", "Approved", "Rejected", "Cancelled"];
const TYPE_OPTIONS = ["All Types", "Vacation", "Sick Leave", "Personal Leave", "Emergency Leave"];

function getDurationInDays(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  const diff = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}

const mapLeaveRequest = (request) => ({
  id: request.id,
  employeeId: request.employee_id,
  employee: request.employee_name || "Unknown",
  department: request.department || "Unassigned",
  type: request.type,
  status: request.status,
  startDate: request.start_date,
  endDate: request.end_date,
  submittedAt: request.submitted_at,
  adminNote: request.admin_note,
});

export default function AdminLeaveRequests() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => getSessionUserProfile());
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [updating, setUpdating] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileData);
    return unsubscribe;
  }, []);

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
          const normalised = Array.isArray(data) ? data.map(mapLeaveRequest) : [];
          setRequests(normalised);
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

  const summary = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((req) => req.status === "Pending").length;
    const approved = requests.filter((req) => req.status === "Approved").length;
    const rejected = requests.filter((req) => req.status === "Rejected").length;
    return { total, pending, approved, rejected };
  }, [requests]);

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
      const updated = mapLeaveRequest(await res.json());
      setRequests((prev) => prev.map((req) => (req.id === id ? updated : req)));
      setNotice({ type: "success", message: `Request ${id} marked as ${status}.` });
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Failed to update status." });
    } finally {
      setUpdating((prev) => prev.filter((item) => item !== id));
    }
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
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
          <Link className={`nav-item${isActive("/admin/overtime") ? " active" : ""}`} to="/admin/overtime">Overtime</Link>
          <Link className={`nav-item${isActive("/admin/payroll") ? " active" : ""}`} to="/admin/payroll">Payroll</Link>
          <Link className={`nav-item${isActive("/admin/reports") ? " active" : ""}`} to="/admin/reports">Reports</Link>
        </nav>
      </aside>

      <main className="admin-content">
        <header className="admin-topbar">
          <h1>Leave Requests</h1>
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
              <div
                className="profile-row"
                onClick={() => {
                  setIsProfileOpen(false);
                  logout();
                }}
              >
                Log out
              </div>
            </div>
          </div>
        </header>

        <section className="lr-cards">
          <div className="lr-card">
            <div className="lr-card-label">Total Requests</div>
            <div className="lr-card-value">{summary.total}</div>
          </div>
          <div className="lr-card">
            <div className="lr-card-label">Pending</div>
            <div className="lr-card-value pending">{summary.pending}</div>
          </div>
          <div className="lr-card">
            <div className="lr-card-label">Approved</div>
            <div className="lr-card-value approved">{summary.approved}</div>
          </div>
          <div className="lr-card">
            <div className="lr-card-label">Rejected</div>
            <div className="lr-card-value rejected">{summary.rejected}</div>
          </div>
        </section>

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
              <div key={req.id} className="lr-table-row">
                <div className="lr-badge">{req.id}</div>
                <div>
                  <div className="lr-emp-name">{req.employee}</div>
                  <div className="lr-emp-meta">{req.department}</div>
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
                <div className="lr-actions">
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
    </div>
  );
}


