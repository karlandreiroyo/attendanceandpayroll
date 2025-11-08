import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AdminPages/admincss/adminDashboard.css"; // Use admin layout CSS
import "../Pages/employeecss/employeeLeaveRequest.css"; // Keep employee-specific styles
import { handleLogout as logout } from "../utils/logout";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { API_BASE_URL } from "../config/api";

const LEAVE_TYPES = ["Sick Leave", "Vacation", "Personal Leave", "Emergency Leave", "Other"];
const STATUS_CLASS_MAP = {
  Pending: "pending",
  Approved: "success",
  Rejected: "danger",
  Cancelled: "neutral",
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function calculateDuration(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "-";
  const diff = Math.abs(endDate.getTime() - startDate.getTime());
  return `${Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1)} day(s)`;
}

const normalizeRequest = (request) => ({
  id: request.id,
  type: request.type,
  startDate: request.start_date,
  endDate: request.end_date,
  reason: request.reason,
  status: request.status,
  submittedAt: request.submitted_at,
  adminNote: request.admin_note,
});

export default function EmployeeLeaveRequest() {
  const navigate = useNavigate();
  const [isTopUserOpen, setIsTopUserOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState(getSessionUserProfile());
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requests, setRequests] = useState([]);
  const [cancellingRequests, setCancellingRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [errors, setErrors] = useState({});

  const employeeId = useMemo(() => sessionStorage.getItem("userId"), []);
  const department = useMemo(() => sessionStorage.getItem("department") || "", []);
  const activeRequests = useMemo(
    () => requests.filter((req) => req.status === "Pending" || req.status === "Approved"),
    [requests]
  );

  const refreshBalances = useCallback(async () => {
    if (!employeeId) return;
    setLoadingBalances(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leave-requests/balances?employeeId=${employeeId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to load leave balances");
      }
      const data = await res.json();
      setBalances(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Unable to load leave balances." });
    } finally {
      setLoadingBalances(false);
    }
  }, [employeeId]);

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

  useEffect(() => {
    let isMounted = true;
    async function loadRequests() {
      if (!employeeId) return;
      setLoadingRequests(true);
      try {
        const res = await fetch(`${API_BASE_URL}/leave-requests?employeeId=${employeeId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to load leave requests");
        }
        const data = await res.json();
        if (isMounted) {
          const normalised = Array.isArray(data) ? data.map(normalizeRequest) : [];
          setRequests(normalised);
        }
      } catch (error) {
        if (isMounted) {
          setNotice({ type: "error", message: error.message || "Unable to load leave requests." });
        }
      } finally {
        if (isMounted) {
          setLoadingRequests(false);
        }
      }
    }

    loadRequests();
    refreshBalances();
    return () => {
      isMounted = false;
    };
  }, [employeeId, refreshBalances]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const validate = useCallback(() => {
    const issues = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minStart = new Date(today);
    minStart.setDate(minStart.getDate() + 1);

    const parseDay = (value) => {
      if (!value) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    };

    const rangeStart = parseDay(startDate);
    const rangeEnd = parseDay(endDate);

    if (!type) {
      issues.type = "Please select a leave type.";
    }

    if (!rangeStart) {
      issues.startDate = "Select a valid start date.";
    } else {
      if (rangeStart <= today) {
        issues.startDate = "Start date must be at least one day in advance.";
      }
      if (rangeStart < minStart) {
        issues.startDate = "Start date cannot be in the past.";
      }
    }

    if (!rangeEnd) {
      issues.endDate = "Select a valid end date.";
    } else if (rangeEnd <= today) {
      issues.endDate = "End date cannot be in the past.";
    }

    if (rangeStart && rangeEnd) {
      if (rangeEnd <= rangeStart) {
        issues.endDate = "End date must be after the start date.";
      }
    }

    if (rangeStart && rangeEnd) {
      const overlaps = activeRequests.some((req) => {
        if (!req.startDate || !req.endDate) return false;
        const reqStart = new Date(req.startDate);
        const reqEnd = new Date(req.endDate);
        reqStart.setHours(0, 0, 0, 0);
        reqEnd.setHours(0, 0, 0, 0);
        return reqEnd >= rangeStart && rangeEnd >= reqStart;
      });

      if (overlaps) {
        issues.range = "Selected dates overlap with an existing leave request.";
      }
    }

    if (activeRequests.length >= 3) {
      issues.limit = "You have reached the maximum of three active leave requests.";
    }

    return issues;
  }, [type, startDate, endDate, activeRequests]);

  useEffect(() => {
    setErrors(validate());
  }, [validate]);

  const formHasErrors = Object.keys(errors).length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentErrors = validate();
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      setNotice({ type: "error", message: "Please fix the highlighted issues before submitting." });
      return;
    }
    if (!employeeId) {
      setNotice({ type: "error", message: "Unable to identify your employee account. Please sign in again." });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        employee_id: employeeId,
        employee_name: profileInfo.displayName || sessionStorage.getItem("username") || "Employee",
        department,
        type,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || undefined,
      };

      const res = await fetch(`${API_BASE_URL}/leave-requests`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to submit leave request.");
      }

      const created = normalizeRequest(await res.json());
      setRequests((prev) => [created, ...prev]);
      setType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setNotice({ type: "success", message: "Leave request submitted successfully." });
      setErrors({});
      await refreshBalances();
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Failed to submit leave request." });
    } finally {
      setSubmitting(false);
    }
  };

  const historyRows = useMemo(() => {
    return requests.map((req) => ({
      id: req.id,
      type: req.type,
      range: `${formatDate(req.startDate)} – ${formatDate(req.endDate)}`,
      duration: calculateDuration(req.startDate, req.endDate),
      requestedOn: formatDate(req.submittedAt),
      status: req.status,
      statusClass: STATUS_CLASS_MAP[req.status] || "neutral",
      canCancel: req.status === "Pending",
    }));
  }, [requests]);

  const handleCancelRequest = async (requestId) => {
    if (!requestId) return;
    setCancellingRequests((prev) => [...prev, requestId]);
    try {
      const res = await fetch(`${API_BASE_URL}/leave-requests/${requestId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Cancelled" }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to cancel leave request.");
      }
      const updated = normalizeRequest(await res.json());
      setRequests((prev) => prev.map((req) => (req.id === requestId ? updated : req)));
      setNotice({ type: "success", message: "Leave request cancelled." });
      await refreshBalances();
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Unable to cancel leave request." });
    } finally {
      setCancellingRequests((prev) => prev.filter((id) => id !== requestId));
    }
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
          <Link className="nav-item" to="/employee/dashboard">
            Dashboard
          </Link>
          <Link className="nav-item" to="/employee/schedules">
            Schedules
          </Link>
          <Link className="nav-item active" to="/employee/leave-requests">
            Leave Requests
          </Link>
          <Link className="nav-item" to="/employee/payslips">
            Payslips
          </Link>
        </nav>
      </aside>

      <main className="admin-content">
        <header className="admin-topbar">
          <h1>Leave Requests</h1>
          <div className="top-actions">
            <button className="profile-btn" onClick={() => setIsTopUserOpen((open) => !open)}>
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

        <section className="grid-3 lr-grid">
          {loadingBalances ? (
            <div className="lr-card lr-card--empty">
              <div className="lr-title">Leave Balances</div>
              <div className="lr-empty">Loading balances…</div>
            </div>
          ) : balances.length === 0 ? (
            <div className="lr-card lr-card--empty">
              <div className="lr-title">Leave Balances</div>
              <div className="lr-empty">No leave balance information available yet.</div>
            </div>
          ) : (
            balances.map((balance) => (
              <div key={balance.type} className="lr-card">
                <div className="lr-title">{balance.type}</div>
                <div className="lr-balance-remaining">{balance.remaining} day(s) left</div>
                <div className="lr-balance-legend">
                  <span>Total: {balance.allocated}</span>
                  <span>Used: {balance.used}</span>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="card lr-request">
          <div className="card-title">Request Leave</div>
          {notice && (
            <div className={`lr-alert ${notice.type}`}>
              {notice.message}
            </div>
          )}
          {errors.limit && <div className="lr-alert error">{errors.limit}</div>}
          <form className="lr-form" onSubmit={handleSubmit}>
            <div className="lr-row">
              <label>Leave Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} required disabled={submitting}>
                <option value="">Select leave type</option>
                {LEAVE_TYPES.map((leaveType) => (
                  <option key={leaveType} value={leaveType}>
                    {leaveType}
                  </option>
                ))}
              </select>
              {errors.type && <div className="lr-error">{errors.type}</div>}
            </div>
            <div className="lr-row two">
              <div className="col">
                <label>Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required disabled={submitting} />
                {errors.startDate && <div className="lr-error">{errors.startDate}</div>}
              </div>
              <div className="col">
                <label>End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required disabled={submitting} />
                {errors.endDate && <div className="lr-error">{errors.endDate}</div>}
              </div>
            </div>
            {errors.range && <div className="lr-error">{errors.range}</div>}
            <div className="lr-row">
              <label>Reason for Leave</label>
              <textarea rows={4} placeholder="Provide details about your leave request" value={reason} onChange={(e) => setReason(e.target.value)} disabled={submitting} />
            </div>
            <div className="lr-actions">
              <button type="submit" className="lr-submit" disabled={submitting || formHasErrors}>
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </section>

        <section className="card lr-history">
          <div className="card-title">Leave History</div>
          {loadingRequests ? (
            <div className="lr-empty">Loading your leave requests…</div>
          ) : historyRows.length === 0 ? (
            <div className="lr-empty">Leave requests will be listed here after you submit one.</div>
          ) : (
            <div className="table">
              <div className="thead">
                <div>Type</div>
                <div>Date Range</div>
                <div>Duration</div>
                <div>Requested On</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              {historyRows.map((row) => (
                <div key={row.id} className="trow">
                  <div>{row.type}</div>
                  <div>{row.range}</div>
                  <div>{row.duration}</div>
                  <div>{row.requestedOn}</div>
                  <div>
                    <span className={`badge ${row.statusClass}`}>{row.status}</span>
                  </div>
                  <div className="lr-history-actions">
                    <button
                      type="button"
                      className="lr-cancel"
                      onClick={() => handleCancelRequest(row.id)}
                      disabled={!row.canCancel || cancellingRequests.includes(row.id)}
                    >
                      {cancellingRequests.includes(row.id) ? "Cancelling..." : "Cancel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
