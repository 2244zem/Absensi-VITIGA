import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardAdminPage from './pages/admin/DashboardAdminPage';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import AttendanceReportsPage from './pages/admin/AttendanceReportsPage';
import DailyAuditPage from './pages/admin/DailyAuditPage';
import ManageOfficesPage from './pages/admin/ManageOfficesPage';
import ManageShiftsPage from './pages/admin/ManageShiftsPage';
import AttendanceActionPage from './pages/employee/AttendanceActionPage';
import LeaveFormPage from './pages/employee/LeaveFormPage';
import UserProfilePage from './pages/employee/UserProfilePage';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleGuard from './components/auth/RoleGuard';
import AdminLayout from './components/layout/AdminLayout';
import EmployeeLayout from './components/layout/EmployeeLayout';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Routes with Sidebar */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route element={<RoleGuard allowedRoles={['admin']} />}>
            <Route path="/admin" element={<DashboardAdminPage />} />
            <Route path="/admin/manage-users" element={<ManageUsersPage />} />
            <Route path="/admin/reports" element={<AttendanceReportsPage />} />
            <Route path="/admin/daily-audit" element={<DailyAuditPage />} />
            <Route path="/admin/offices" element={<ManageOfficesPage />} />
            <Route path="/admin/shifts" element={<ManageShiftsPage />} />
          </Route>
        </Route>

        {/* Employee Routes with Bottom Nav */}
        <Route element={<EmployeeLayout />}>
          <Route element={<RoleGuard allowedRoles={['employee', 'admin']} />}>
            <Route path="/attendance" element={<AttendanceActionPage />} />
            <Route path="/leave" element={<LeaveFormPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
          </Route>
        </Route>
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
