import React from "react";
import { Routes, Route } from "react-router-dom";

// Login Page
import PayrollLogin from "./Pages/Payrolllogin";

// Admin Pages
import AdminDashboard from "./AdminPages/adminDashboard";
import AdminEmployee from "./AdminPages/adminEmployee";
import AdminSchedules from "./AdminPages/adminSchedules";
import AdminAttendance from "./AdminPages/adminAttendance";
import AdminOvertime from "./AdminPages/adminOvertime";
import AdminPayroll from "./AdminPages/adminPayroll";
import AdminReports from "./AdminPages/adminReports";

// Employee Pages
import EmployeeDashboard from "./Pages/employeeDashboard";
import EmployeeSchedules from "./Pages/employeeSchedules";
import EmployeeLeaveRequest from "./Pages/employeeLeaveRequest";

// ProtectedRoute
import ProtectedRoute from "./Components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public login route */}
      <Route path="/" element={<PayrollLogin />} />

      {/* Admin routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employee"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminEmployee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/schedules"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminSchedules />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/overtime"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminOvertime />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payroll"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminPayroll />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminReports />
          </ProtectedRoute>
        }
      />

      {/* Employee routes */}
      <Route
        path="/employee/dashboard"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/schedules"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeSchedules />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/leave-requests"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeLeaveRequest />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
