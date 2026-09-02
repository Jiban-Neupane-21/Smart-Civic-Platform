import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";
import SmartCitizenLanding from "../pages/common/LandingPage";
import Login from "../pages/auth/Login";
import { Register } from "../pages/auth/CitizenRegister";
import FirstLoginPasswordChange from "../pages/auth/FirstLoginPasswordChange";
import KycRequired from "../pages/auth/KycRequired";
import { AuthProvider } from "../components/layout/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

import { CitizenDashboard } from "../pages/citizen/Dashboard";
import { Profile } from "../pages/citizen/ProfilePage";
import { Notifications } from "../pages/citizen/Notification";
import { ComplaintReport } from "../pages/citizen/ComplainHistory";
import { SubmitComplaint } from "../pages/citizen/SubmitComplain";
import { CitizenComplaintDetailPage } from "../pages/citizen/ComplaintDetail";

import NotFoundPage from "../pages/common/NotFoundPage";
import SuperadminDashboard from "../pages/Superadmin/Dashboard";
import AuditLog from "../pages/Superadmin/AuditLog";
import ManageMuniciple from "../pages/Superadmin/ManageMuniciple";
import UserManagement from "../pages/Superadmin/UserManagement";
import SystemSetting from "../pages/Superadmin/SystemSetting";
// Department Head Routes
import { DeptDashboard } from "../pages/dept_head/Dept_Dashboard";
import DeptManageStaff from "../pages/dept_head/ManageStaff";
import DeptManageTeam from "../pages/dept_head/ManageTeam";
import DeptComplainDetails from "../pages/dept_head/ComplainDetails";
import DeptNotification from "../pages/dept_head/Notification";
import DeptProfilePage from "../pages/dept_head/DeptProfilePage";

// Staff Pages
import StaffDashboard from "../pages/staff/Homepage";
import StaffTeamPage from "../pages/staff/Team";
import StaffComplaintPage from "../pages/staff/Complaint";
import StaffComplaintDetailPage from "../pages/staff/ComplaintDetail";
import StaffProfilePage from "../pages/staff/ProfilePage";
import StaffNotification from "../pages/staff/Notification";

// Municipality Head Pages
import MunicHomepage from "../pages/munic_head/Homepage";
import MunicManageDept from "../pages/munic_head/ManageDept";
import MunicManageStaff from "../pages/munic_head/ManageStaff";
import MunicComplainDetails from "../pages/munic_head/ComplainDetails";
import MunicReportAnalytics from "../pages/munic_head/ReportAnalytics";
import MunicAdminNoticeCenter from "../pages/munic_head/AdminNoticeCenter";
import MunicNotification from "../pages/munic_head/Notification";
import MunicProfilePage from "../pages/munic_head/ProfilePage";
import ManageCrossDeptTeam from "../pages/munic_head/ManageCrossDeptTeam";
import MunicipalityKycUpdatePage from "../pages/munic_head/MunicipalityKycUpdatePage";

function AppRoute() {
  return (
    <AuthProvider>
      <Routes>
        {/* Pages without Navbar - Public/Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route index element={<SmartCitizenLanding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/change-password" element={<FirstLoginPasswordChange />} />
          <Route path="/kyc" element={<KycRequired />} />
        </Route>

        {/* --- Protected Routes --- */}

        {/* Citizen Routes */}
        <Route element={<ProtectedRoute allowedRoles={["citizen"]} />}>
          <Route element={<MainLayout />}>
            <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
            <Route path="/citizen/submit-complaint" element={<SubmitComplaint />} />
            <Route path="/citizen/complaint-history" element={<ComplaintReport />} />
            <Route path="/citizen/complaints" element={<ComplaintReport />} />
            <Route path="/citizen/complaints/:id" element={<CitizenComplaintDetailPage />} />
            <Route path="/citizen/notification" element={<Notifications />} />
            <Route path="/citizen/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Superadmin Routes */}
        <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
          <Route element={<MainLayout />}>
            <Route path="/superadmin/dashboard" element={<SuperadminDashboard />} />
            <Route path="/superadmin/manage-municipality" element={<ManageMuniciple />} />
            <Route path="/superadmin/users" element={<UserManagement />} />
            <Route path="/superadmin/audit-log" element={<AuditLog />} />
            <Route path="/superadmin/system-setting" element={<SystemSetting />} />
          </Route>
        </Route>

        {/* Municipality Head Routes */}
        <Route
          element={<ProtectedRoute allowedRoles={["municipality_head"]} />}
        >
          <Route element={<MainLayout />}>
            <Route path="/municipality_head/dashboard" element={<MunicHomepage />} />
            <Route path="/municipality_head/manage-department-staff" element={<MunicManageDept />} />
            <Route path="/municipality_head/manage-staff" element={<MunicManageStaff />} />
            <Route path="/municipality_head/complaint-detail" element={<MunicComplainDetails />} />
            <Route path="/municipality_head/report-&-analytics" element={<MunicReportAnalytics />} />
            <Route path="/municipality_head/notices" element={<MunicAdminNoticeCenter />} />
            <Route path="/municipality_head/notification" element={<MunicNotification />} />
            <Route path="/municipality_head/profile" element={<MunicProfilePage />} />
            <Route path="/municipality_head/update-kyc" element={<MunicipalityKycUpdatePage />} />
            <Route path="/municipality_head/cross-dept-teams" element={<ManageCrossDeptTeam />} />
          </Route>
        </Route>

        {/* Department Head Routes */}
        <Route element={<ProtectedRoute allowedRoles={["department_head"]} />}>
          <Route element={<MainLayout />}>
            <Route
              path="/department_head/dashboard"
              element={<DeptDashboard />}
            />
            <Route
              path="/department_head/staff"
              element={<DeptManageStaff />}
            />
            <Route
              path="/department_head/team"
              element={<DeptManageTeam />}
            />
            <Route
              path="/department_head/complaint-queue"
              element={<DeptComplainDetails />}
            />
            <Route
              path="/department_head/notification"
              element={<DeptNotification />}
            />
            <Route
              path="/department_head/profile"
              element={<DeptProfilePage />}
            />
          </Route>
        </Route>

        {/* Staff Routes */}
        <Route element={<ProtectedRoute allowedRoles={["staff"]} />}>
          <Route element={<MainLayout />}>
            <Route
              path="/staff/dashboard"
              element={<StaffDashboard />}
            />
            <Route
              path="/staff/team"
              element={<StaffTeamPage />}
            />
            <Route
              path="/staff/complaint"
              element={<StaffComplaintPage />}
            />
            <Route
              path="/staff/complaint/:id"
              element={<StaffComplaintDetailPage />}
            />
            <Route
              path="/staff/profile"
              element={<StaffProfilePage />}
            />
            <Route
              path="/staff/notification"
              element={<StaffNotification />}
            />
          </Route>
        </Route>

        {/* --- The Catch-All 404 Route --- */}
        {/* This route MUST be the last one in the list. */}
        {/* It will match any path that was not matched by the routes above. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default AppRoute;
