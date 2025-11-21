import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./employeecss/timeInOut.css";
import { API_BASE_URL } from "../config/api";

export default function TimeInOut() {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startListening = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsListening(true);
    setError("");
    setStatus("Waiting for fingerprint scan...");

    const eventSource = new EventSource(`${API_BASE_URL}/fingerprint/events`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "detected" && data.id) {
          handleFingerprintDetected(data.id);
        } else if (data.type === "unregistered") {
          setStatus("Unregistered fingerprint. Please contact administrator.");
          setError("This fingerprint is not registered in the system.");
          setTimeout(() => {
            setStatus("Waiting for fingerprint scan...");
            setError("");
          }, 3000);
        } else if (data.type === "status") {
          // Device status messages
          console.log("Fingerprint device status:", data.raw);
        }
      } catch (err) {
        console.error("Error parsing fingerprint event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource error:", err);
      setError(
        "Connection to fingerprint scanner lost. Please check if the device is connected."
      );
      setIsListening(false);
      eventSource.close();
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
        setLastScan({
          type: data.type,
          timestamp: data.timestamp,
          employee: data.employee,
          message: data.message,
        });
        setStatus(data.message);

        // Reset status after 8 seconds (longer so user can see it)
        setTimeout(() => {
          setStatus("Waiting for fingerprint scan...");
        }, 8000);
      } else {
        throw new Error(data.message || "Failed to record attendance");
      }
    } catch (err) {
      setError(err.message || "An error occurred while recording attendance");
      setStatus("");
      setTimeout(() => {
        setError("");
        setStatus("Waiting for fingerprint scan...");
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

  return (
    <div className="time-in-out-container">
      <div className="time-in-out-card">
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

          {!isListening ? (
            <button
              className="start-scan-btn"
              onClick={startListening}
              disabled={loading}
            >
              Start Scanning
            </button>
          ) : (
            <button
              className="stop-scan-btn"
              onClick={stopListening}
              disabled={loading}
            >
              Stop Scanning
            </button>
          )}

          {status && (
            <div className={`status-message ${error ? "error" : "success"}`}>
              {status.includes("recorded") ? "✅ " : ""}
              {status}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {loading && (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          )}
        </div>

        {lastScan && (
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

        <div className="time-in-out-footer">
          <button
            className="back-btn"
            onClick={() => navigate("/employee/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
