import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";



import PayrollLogin from "./Pages/PayrollLogin";
import AdminDashboard from "./AdminPages/adminDashboard";
import AdminEmployee from "./AdminPages/adminEmployee";
import AdminSchedules from "./AdminPages/adminSchedules";
import AdminAttendance from "./AdminPages/adminAttendance";
import AdminOvertime from "./AdminPages/adminOvertime";
import AdminPayroll from "./AdminPages/adminPayroll";
import AdminReports from "./AdminPages/adminReports";


// Unified login is used for both admin and employee
import EmployeeDashboard from "./Pages/employeeDashboard";
import EmployeeSchedules from "./Pages/employeeSchedules";
import EmployeeLeaveRequest from "./Pages/employeeLeaveRequest";
import EmployeePayslips from "./Pages/employeePayslips";

function App() {
  return (


    <Router>
      <Routes>

        <Route path="/" element={<PayrollLogin />} />


        <Route path="/admin" element={<PayrollLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/employee" element={<AdminEmployee />} />
        <Route path="/admin/schedules" element={<AdminSchedules />} />
        <Route path="/admin/attendance" element={<AdminAttendance />} />
        <Route path="/admin/overtime" element={<AdminOvertime />} />
        <Route path="/admin/payroll" element={<AdminPayroll />} />
        <Route path="/admin/reports" element={<AdminReports />} />


        <Route path="/employee" element={<PayrollLogin />} />
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/schedules" element={<EmployeeSchedules />} />
        <Route path="/employee/leave-requests" element={<EmployeeLeaveRequest />} />
        <Route path="/employee/payslips" element={<EmployeePayslips />} />
      </Routes>
    </Router>
  );
}

export default App;
