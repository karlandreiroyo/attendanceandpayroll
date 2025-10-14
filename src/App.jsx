import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


        import PayrollLogin from "./Pages/Payrolllogin";


        import AdminLogin from "./AdminPages/AdminLogin";
        import AdminDashboard from "./AdminPages/admindashboard";
        import AdminEmployee from "./AdminPages/adminemployee";
        import AdminSchedules from "./AdminPages/adminschedules";
        import AdminAttendance from "./AdminPages/adminattendance";
        import AdminOvertime from "./AdminPages/adminovertime";
        import AdminPayroll from "./AdminPages/adminpayroll";
        import AdminReports from "./AdminPages/adminreports";


        import EmployeeLogin from "./Pages/employeelogin";
        import EmployeeDashboard from "./Pages/employeedashboard";
        import EmployeeSchedules from "./Pages/employeeschedules";
        import EmployeeLeaveRequest from "./Pages/employeeleaverequest";
        import EmployeePayslips from "./Pages/employeepayslips";

function App() {
  return (
    
    
    <Router>
      <Routes>
        
        <Route path="/" element={<PayrollLogin />} />

        
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/employee" element={<AdminEmployee />} />
        <Route path="/admin/schedules" element={<AdminSchedules />} />
        <Route path="/admin/attendance" element={<AdminAttendance />} />
        <Route path="/admin/overtime" element={<AdminOvertime />} />
        <Route path="/admin/payroll" element={<AdminPayroll />} />
        <Route path="/admin/reports" element={<AdminReports />} />

      
        <Route path="/employee" element={<EmployeeLogin />} />
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/schedules" element={<EmployeeSchedules />} />
        <Route path="/employee/leave-requests" element={<EmployeeLeaveRequest />} />
        <Route path="/employee/payslips" element={<EmployeePayslips />} />
      </Routes>
    </Router>
  );
}

export default App;
