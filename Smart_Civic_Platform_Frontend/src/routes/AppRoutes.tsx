import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";
import SmartCitizenLanding from "../pages/common/LandingPage";
import Login from "../pages/auth/Login";
import { Register } from "../pages/auth/CitizenRegister";
import { AuthProvider } from "../components/layout/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

import { CitizenDashboard } from "../pages/citizen/Dashboard";
import { Profile } from "../pages/citizen/ProfilePage";
import { Notifications } from "../pages/citizen/Notification";
import { ComplaintReport } from "../pages/citizen/ComplainHistory";
import { SubmitComplaint } from "../pages/citizen/SubmitComplain";

import NotFoundPage from "../pages/common/NotFoundPage";
import AuditLog from "../pages/Superadmin/AuditLog";
import ManageMuniciple from "../pages/Superadmin/ManageMuniciple";

// Municipality Head Pages
import MunicHomepage from "../pages/munic_head/Homepage";
import MunicManageDept from "../pages/munic_head/ManageDept";
import MunicManageStaff from "../pages/munic_head/ManageStaff";
import MunicComplainDetails from "../pages/munic_head/ComplainDetails";
import MunicReportAnalytics from "../pages/munic_head/ReportAnalytics";
import MunicNotification from "../pages/munic_head/Notification";
import MunicProfilePage from "../pages/munic_head/ProfilePage";

function AppRoute() {
  return (
    <AuthProvider>
      <Routes>
        {/* Pages without Navbar - Public/Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route index element={<SmartCitizenLanding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* --- Protected Routes --- */}

        {/* Citizen Routes */}
        <Route element={<ProtectedRoute allowedRoles={["citizen"]} />}>
          <Route element={<MainLayout />}>
            <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
            <Route path="/citizen/submit-complaint" element={<SubmitComplaint />} />
            <Route path="/citizen/complaint-history" element={<ComplaintReport />} />
            <Route path="/citizen/notification" element={<Notifications />} />
            <Route path="/citizen/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Superadmin Routes */}
        <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
          <Route element={<MainLayout />}>
            <Route
              path="/superadmin/dashboard"
              element={<div>Superadmin Dashboard Placeholder</div>}
            />
            <Route path="/superadmin/manage-municipality" element={<ManageMuniciple />} />

            <Route path="/superadmin/audit-log" element={<AuditLog />} />
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
            <Route path="/municipality_head/notification" element={<MunicNotification />} />
            <Route path="/municipality_head/profile" element={<MunicProfilePage />} />
          </Route>
        </Route>

        {/* Department Head Routes */}
        <Route element={<ProtectedRoute allowedRoles={["department_head"]} />}>
          <Route element={<MainLayout />}>
            <Route
              path="/department_head/dashboard"
              element={<div>Department Head Dashboard Placeholder</div>}
            />
          </Route>
        </Route>

        {/* Staff Routes */}
        <Route element={<ProtectedRoute allowedRoles={["staff"]} />}>
          <Route element={<MainLayout />}>
            <Route
              path="/staff/dashboard"
              element={<div>Staff Dashboard Placeholder</div>}
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
