import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./employeecss/timeInOut.css";
import { API_BASE_URL } from "../config/api";

export default function TimeInOut({
  backTo = "/employee/dashboard",
  backLabel = "Back to Dashboard",
  onBack,
  active = true,
  variant = "default",
  showFooter = true,
}) {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const eventSourceRef = useRef(null);
  const isCompact = variant === "compact";

  // Auto-start scanning when component is active
  useEffect(() => {
    if (!active) {
      stopListening();
      return;
    }
    setDeviceStatus(null);

    startListening();

    return () => {
      stopListening();
    };
  }, [active]);

  const startListening = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Check device status first
    console.log("🔍 Checking device status...");
    try {
      const statusRes = await fetch(`${API_BASE_URL}/fingerprint/status`, {
        credentials: "include",
      });
      const statusData = await statusRes.json();
      console.log("📊 Device status response:", statusData);
      
      if (!statusData.connected) {
        console.error("❌ Device not connected:", statusData.message);
        setDeviceStatus({
          level: "error",
          message:
            statusData.message ||
            "Fingerprint device is not connected. Please check the connection.",
        });
        setStatus("Device not connected");
        setError(
          statusData.message ||
            "Fingerprint device is not connected. Please check the connection.",
        );
        setNotification({
          type: "error",
          message: `❌ ${
            statusData.message ||
            "Device not connected. Please check the connection and restart the backend."
          }`,
          show: true,
        });
        setIsListening(false);
        return;
      }
      console.log("✅ Device is connected!");
    } catch (err) {
      console.error("❌ Failed to check device status:", err);
      setError("Could not check device status. Please ensure the backend is running.");
      setDeviceStatus({
        level: "error",
        message: "Could not check device status. Please ensure the backend is running.",
      });
      setNotification({
        type: "error",
        message: "❌ Could not check device status. Please ensure the backend is running.",
        show: true,
      });
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setDeviceStatus(null);
    setError("");
    setStatus("Ready - Place your finger on the scanner now");
    setNotification({
      type: "info",
      message: "👆 Ready! Place your finger on the scanner now",
      show: true,
    });

    const eventSource = new EventSource(`${API_BASE_URL}/fingerprint/events`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("✅ EventSource connected to fingerprint stream");
      console.log("EventSource readyState:", eventSource.readyState);
      console.log("EventSource URL:", `${API_BASE_URL}/fingerprint/events`);
      setStatus("Ready - Place your finger on the scanner now");
      
      // Log that we're waiting for data
      console.log("⏳ Waiting for fingerprint events from backend...");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📥 Fingerprint event received:", data);

        if (data.type === "scanning") {
          console.log("🔍 Fingerprint scanning...");
          setLoading(true);
          setStatus("Scanning fingerprint...");
          setNotification({
            type: "info",
            message: "🔍 Scanning fingerprint... Please keep your finger on the scanner",
            show: true,
          });
        } else if (data.type === "detected" && data.id) {
          console.log("✅ Fingerprint detected, ID:", data.id);
          handleFingerprintDetected(data.id);
        } else if (data.type === "unregistered") {
          console.log("❌ Unregistered fingerprint detected");
          setLoading(false);
          setStatus("Unregistered fingerprint. Please contact administrator.");
          setError("This fingerprint is not registered in the system.");
          setNotification({
            type: "error",
            message: "❌ Unregistered fingerprint. Please contact administrator.",
            show: true,
          });
          setTimeout(() => {
            setStatus("Ready - Place your finger on the scanner now");
            setError("");
            setNotification({
              type: "info",
              message: "👆 Ready! Place your finger on the scanner now",
              show: true,
            });
          }, 3000);
        } else if (data.type === "status") {
          // Device status messages
          console.log("📡 Fingerprint device status:", data.raw);
          // Show ready status when device is ready
          if (data.raw.includes("ready") || data.raw.includes("READY") || data.raw.includes("opened")) {
            setStatus("Ready - Place your finger on the scanner now");
            setNotification({
              type: "info",
              message: "👆 Ready! Place your finger on the scanner now",
              show: true,
            });
          }
        } else if (data.type === "device-error") {
          setDeviceStatus({
            level: "error",
            message: data.raw || "Device reported an error.",
          });
          setError("Fingerprint device reported an error.");
          setNotification({
            type: "error",
            message: `❌ ${data.raw || "Fingerprint device error."}`,
            show: true,
          });
        } else if (data.type === "raw") {
          // Log ALL raw data for debugging
          console.log("📨 Raw fingerprint data:", data.raw);
          
          // Show scanning status if we see scanning-related messages
          if (data.raw.includes("scanning") || data.raw.includes("Scanning") || data.raw.includes("Fingerprint scanning")) {
            setLoading(true);
            setStatus("Scanning fingerprint...");
            setNotification({
              type: "info",
              message: "🔍 Scanning fingerprint... Please keep your finger on the scanner",
              show: true,
            });
          }
          
          // Show heartbeat messages in console only
          if (data.raw.includes("HEARTBEAT")) {
            console.log("💓 Heartbeat received - device is communicating");
          }
        }
      } catch (err) {
        console.error("❌ Error parsing fingerprint event:", err, "Raw data:", event.data);
      }
    };

    eventSource.onerror = (err) => {
      console.error("❌ EventSource error:", err);
      console.log("EventSource readyState:", eventSource.readyState);
      
      if (eventSource.readyState === EventSource.CLOSED) {
        setError("Connection to fingerprint scanner closed. Attempting to reconnect...");
        setDeviceStatus({
          level: "warning",
          message: "Connection closed. Reconnecting...",
        });
        setIsListening(false);
        // Try to reconnect after 3 seconds
        setTimeout(() => {
          if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
            console.log("🔄 Attempting to reconnect...");
            startListening();
          }
        }, 3000);
      } else {
        setError("Connection to fingerprint scanner lost. Please check if the device is connected.");
        setDeviceStatus({
          level: "error",
          message: "Scanner connection lost. Check device cabling.",
        });
        setIsListening(false);
      }
    };
  };

  const stopListening = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsListening(false);
    setStatus("");
  };

  const handleFingerprintDetected = async (fingerprintId) => {
    const fid = Number(fingerprintId);
    if (!Number.isFinite(fid)) {
      setError("Invalid fingerprint ID received from scanner");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setLoading(true);
    setStatus(`Processing fingerprint ID: ${fid}...`);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/attendance/record`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fingerprintId: fid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to record attendance");
      }

      if (data.success) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedTime = now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });

        setLastScan({
          type: data.type,
          timestamp: data.timestamp,
          employee: data.employee,
          message: data.message,
        });
        setStatus(data.message);

        // Show success notification with all details
        setNotification({
          type: "success",
          message: `✅ ${data.type} Successful!`,
          details: {
            employeeName: data.employee?.name || "Unknown",
            date: formattedDate,
            time: formattedTime,
            type: data.type,
          },
          show: true,
        });

        // Clear notification after 10 seconds and reset status
        setTimeout(() => {
          setNotification({
            type: "info",
            message: "👆 Ready! Place your finger on the scanner now",
            show: true,
          });
          setStatus("Ready - Place your finger on the scanner now");
        }, 10000);
      } else {
        throw new Error(data.message || "Failed to record attendance");
      }
    } catch (err) {
      setError(err.message || "An error occurred while recording attendance");
      setStatus("");
      setNotification({
        type: "error",
        message: `❌ ${err.message || "Failed to record attendance"}`,
        show: true,
      });
      setTimeout(() => {
        setError("");
        setStatus("Ready - Place your finger on the scanner now");
        setNotification({
          type: "info",
          message: "👆 Ready! Place your finger on the scanner now",
          show: true,
        });
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const containerClasses = [
    "time-in-out-container",
    isCompact ? "time-in-out-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const cardClasses = [
    "time-in-out-card",
    isCompact ? "time-in-out-card-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClasses}>
      {deviceStatus && deviceStatus.level !== "ok" && (
        <div className={`device-status-banner ${deviceStatus.level}`}>
          <span className="device-status-icon">
            {deviceStatus.level === "error" ? "⚠️" : "⏳"}
          </span>
          <div className="device-status-text">
            <strong>
              {deviceStatus.level === "error" ? "Device Issue" : "Reconnecting"}
            </strong>
            <span>{deviceStatus.message}</span>
          </div>
        </div>
      )}
      <div className={cardClasses}>
        <div className="time-in-out-header">
          <h1>Time In / Time Out</h1>
          <p>Scan your fingerprint to record attendance</p>
        </div>

        <div className="fingerprint-scanner-area">
          <div className={`scanner-icon ${isListening ? "scanning" : ""}`}>
            <svg
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z"
                fill="currentColor"
              />
            </svg>
          </div>

          {loading && (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          )}

          {/* Notification Display */}
          {notification && notification.show && (
            <div className={`notification-banner ${notification.type}`}>
              <div className="notification-content">
                <div className="notification-header">
                  <span className="notification-icon-large">
                    {notification.type === "success"
                      ? "✅"
                      : notification.type === "error"
                      ? "❌"
                      : "👆"}
                  </span>
                  <h3 className="notification-title">{notification.message}</h3>
                </div>
                {notification.details && (
                  <div
                    className={`notification-details${
                      isCompact ? " notification-details-compact" : ""
                    }`}
                  >
                    <div className="notification-detail-item">
                      <strong>Employee:</strong>{" "}
                      {notification.details.employeeName}
                    </div>
                    {!isCompact && (
                      <div className="notification-detail-item">
                        <strong>Date:</strong> {notification.details.date}
                      </div>
                    )}
                    <div className="notification-detail-item">
                      <strong>{isCompact ? "Date & Time:" : "Time:"}</strong>{" "}
                      {isCompact
                        ? `${notification.details.date} · ${notification.details.time}`
                        : notification.details.time}
                    </div>
                    <div className="notification-detail-item">
                      <strong>Type:</strong>{" "}
                      <span
                        className={`type-badge ${
                          notification.details.type === "Time In"
                            ? "time-in"
                            : "time-out"
                        }`}
                      >
                        {notification.details.type}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {status && !notification?.show && (
            <div className={`status-message ${error ? "error" : "success"}`}>
              {status.includes("recorded") ? "✅ " : ""}
              {status}
            </div>
          )}

          {error && !notification?.show && (
            <div className="error-message">{error}</div>
          )}

        </div>

        {lastScan && !isCompact && (
          <div className="last-scan-info">
            <h3>Last Recorded:</h3>
            <div className="scan-details">
              <div className="scan-type">
                <span
                  className={`type-badge ${
                    lastScan.type === "Time In" ? "time-in" : "time-out"
                  }`}
                >
                  {lastScan.type}
                </span>
              </div>
              {lastScan.employee && (
                <div className="employee-info">
                  <p className="employee-name">{lastScan.employee.name}</p>
                  <p className="employee-dept">
                    {lastScan.employee.department}
                  </p>
                </div>
              )}
              <div className="scan-time">{formatTime(lastScan.timestamp)}</div>
            </div>
          </div>
        )}

        {showFooter && (
          <div className="time-in-out-footer">
            <button
              className="back-btn"
              onClick={() => (onBack ? onBack() : navigate(backTo))}
            >
              {backLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
