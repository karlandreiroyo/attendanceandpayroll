import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./admincss/adminDashboard.css";
import "./admincss/adminAnnouncements.css";
import { API_BASE_URL } from "../config/api";
import { getSessionUserProfile, subscribeToProfileUpdates } from "../utils/currentUser";
import { handleLogout as logout } from "../utils/logout";
import { useSidebarState } from "../hooks/useSidebarState";

const initialFormState = { title: "", body: "", audience: "" };

export default function AdminAnnouncements() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = useCallback(
    (path) => location.pathname.startsWith(path),
    [location.pathname]
  );
  const { isSidebarOpen, toggleSidebar, closeSidebar, isMobileView } = useSidebarState();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => getSessionUserProfile());
  const [formData, setFormData] = useState(initialFormState);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToProfileUpdates(setProfileData);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isMobileView) {
      closeSidebar();
    }
  }, [location.pathname, isMobileView, closeSidebar]);

  const loadAnnouncements = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API_BASE_URL}/announcements`, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Failed to load announcements (${res.status})`);
      }
      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load announcements:", error);
      setStatus({ type: "error", message: "Unable to load announcements. Please try again." });
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.title.trim()) {
      setStatus({ type: "error", message: "Announcement title is required." });
      return;
    }

    setSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const payload = {
        title: formData.title.trim(),
        body: formData.body.trim() || null,
        audience: formData.audience.trim() || null,
      };

      const res = await fetch(`${API_BASE_URL}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed with status ${res.status}`);
      }

      setFormData(initialFormState);
      setStatus({ type: "success", message: "Announcement published successfully." });
      await loadAnnouncements();
    } catch (error) {
      console.error("Failed to create announcement:", error);
      setStatus({ type: "error", message: "Unable to publish announcement. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const confirmed = window.confirm("Remove this announcement?");
    if (!confirmed) return;

    setDeletingId(id);
    setStatus({ type: "", message: "" });
    try {
      const res = await fetch(`${API_BASE_URL}/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed with status ${res.status}`);
      }

      setStatus({ type: "success", message: "Announcement removed." });
      await loadAnnouncements();
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      setStatus({ type: "error", message: "Unable to delete announcement." });
    } finally {
      setDeletingId(null);
    }
  };

  const decoratedAnnouncements = useMemo(
    () =>
      announcements.map((item) => ({
        ...item,
        publishedLabel: item.publishedAt
          ? new Date(item.publishedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "Unpublished",
      })),
    [announcements]
  );

  return (
    <div className={`admin-layout${isSidebarOpen ? "" : " sidebar-collapsed"}`}>
      <aside className={`admin-sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
        <div className="brand">
          <div className="brand-avatar">TI</div>
          <div className="brand-name">Tatay Ilio</div>
        </div>
        <nav className="nav">
          <Link className={`nav-item${isActive('/admin/dashboard') ? ' active' : ''}`} to="/admin/dashboard">Dashboard</Link>
          <Link className={`nav-item${isActive('/admin/employee') ? ' active' : ''}`} to="/admin/employee">Employees</Link>
          <Link className={`nav-item${isActive('/admin/schedules') ? ' active' : ''}`} to="/admin/schedules">Schedules</Link>
          <Link className={`nav-item${isActive('/admin/attendance') ? ' active' : ''}`} to="/admin/attendance">Attendance</Link>
          <Link className={`nav-item${isActive('/admin/leave-requests') ? ' active' : ''}`} to="/admin/leave-requests">Leave Requests</Link>
          <Link className={`nav-item${isActive('/admin/announcements') ? ' active' : ''}`} to="/admin/announcements">Announcements</Link>
          <Link className={`nav-item${isActive('/admin/payroll') ? ' active' : ''}`} to="/admin/payroll">Payroll</Link>
          <Link className={`nav-item${isActive('/admin/reports') ? ' active' : ''}`} to="/admin/reports">Reports</Link>
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
            <h1>Announcements</h1>
          </div>
          <div className="top-actions">
            <button
              className="profile-btn"
              onClick={() => setIsProfileOpen((prev) => !prev)}
            >
              <span className="profile-avatar">{profileData.initials}</span>
              <span>{profileData.displayName}</span>
            </button>
            <div className={`profile-popover${isProfileOpen ? " open" : ""}`}>
              <div
                className="profile-row"
                role="button"
                tabIndex={0}
                onClick={() => {
                  navigate("/admin/profile");
                  setIsProfileOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    navigate("/admin/profile");
                    setIsProfileOpen(false);
                  }
                }}
              >
                Profile
              </div>
              <div className="profile-row" onClick={handleLogout} role="button" tabIndex={0}>
                Log out
              </div>
            </div>
          </div>
        </header>

        <section className="announcements-grid">
          <div className="announcement-form card">
            <div className="card-title">Publish New Announcement</div>
            <form onSubmit={handleSubmit} className="announcement-form-fields">
              <label className="form-field">
                <span>Title</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g. Office Holiday Schedule"
                  required
                />
              </label>
              <label className="form-field">
                <span>Message</span>
                <textarea
                  rows={4}
                  value={formData.body}
                  onChange={(e) => handleInputChange("body", e.target.value)}
                  placeholder="Share details employees should know..."
                ></textarea>
              </label>
              <label className="form-field">
                <span>Audience (Optional)</span>
                <input
                  type="text"
                  value={formData.audience}
                  onChange={(e) => handleInputChange("audience", e.target.value)}
                  placeholder="Leave blank for all employees (e.g. Finance)"
                />
              </label>
              {status.message && (
                <div className={`form-status ${status.type}`}>
                  {status.message}
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? "Publishing..." : "Publish Announcement"}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setFormData(initialFormState)}
                  disabled={saving}
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          <div className="announcement-list card">
            <div className="card-title">Recent Announcements</div>
            {loadingList ? (
              <div className="empty-state">Loading announcements...</div>
            ) : decoratedAnnouncements.length === 0 ? (
              <div className="empty-state">
                Published announcements will appear here.
              </div>
            ) : (
              <div className="announcement-list-items">
                {decoratedAnnouncements.map((item) => (
                  <article className="announcement-item" key={item.id}>
                    <div className="announcement-item-head">
                      <div>
                        <div className="announcement-item-title">{item.title}</div>
                        <div className="announcement-item-meta">
                          {item.publishedLabel}
                          {" • "}
                          {item.audience ? `Audience: ${item.audience}` : "All employees"}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? "Removing..." : "Delete"}
                      </button>
                    </div>
                    {item.body && <p className="announcement-item-body">{item.body}</p>}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

