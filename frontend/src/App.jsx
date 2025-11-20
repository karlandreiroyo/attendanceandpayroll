import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import PayrollLogin from "./Pages/PayrollLogin";
import AdminDashboard from "./AdminPages/adminDashboard";
import AdminEmployee from "./AdminPages/adminEmployee";
import AdminSchedules from "./AdminPages/adminSchedules";
import AdminAttendance from "./AdminPages/adminAttendance";
import AdminLeaveRequests from "./AdminPages/adminLeaveRequests";
import AdminPayroll from "./AdminPages/adminPayroll";
import AdminReports from "./AdminPages/adminReports";
import AdminAnnouncements from "./AdminPages/adminAnnouncements";
import AdminProfile from "./AdminPages/adminProfile";

// Unified login is used for both admin and employee
import EmployeeDashboard from "./Pages/employeeDashboard";
import EmployeeSchedules from "./Pages/employeeSchedules";
import EmployeeLeaveRequest from "./Pages/employeeLeaveRequest";
import EmployeePayslips from "./Pages/employeePayslips";
import EmployeeProfile from "./Pages/employeeProfile";
import TimeInOut from "./Pages/timeInOut";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (


    <Router>
      <Routes>
        <Route path="/" element={<PayrollLogin />} />
        <Route path="/admin" element={<PayrollLogin />} />
        <Route path="/employee" element={<PayrollLogin />} />

        {/* Protected Admin Routes */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/employee" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminEmployee />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/schedules" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminSchedules />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/attendance" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminAttendance />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/leave-requests" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLeaveRequests />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/announcements" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminAnnouncements />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/payroll" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPayroll />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/reports" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminReports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/profile" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminProfile />
            </ProtectedRoute>
          } 
        />

        {/* Protected Employee Routes */}
        <Route 
          path="/employee/dashboard" 
          element={
            <ProtectedRoute requiredRole="employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/employee/schedules" 
          element={
            <ProtectedRoute requiredRole="employee">
              <EmployeeSchedules />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/employee/leave-requests" 
          element={
            <ProtectedRoute requiredRole="employee">
              <EmployeeLeaveRequest />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/employee/payslips" 
          element={
            <ProtectedRoute requiredRole="employee">
              <EmployeePayslips />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/employee/profile" 
          element={
            <ProtectedRoute requiredRole="employee">
              <EmployeeProfile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/employee/time-in-out" 
          element={
            <ProtectedRoute requiredRole="employee">
              <TimeInOut />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
