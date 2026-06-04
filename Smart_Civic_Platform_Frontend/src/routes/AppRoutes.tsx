import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";
import SmartCitizenLanding from "../pages/LandingPage";
import Login from "../pages/auth/Login";
import { CitizenDashboard } from "../pages/citizen/Homepage";
import { Register } from "../pages/auth/CitizenRegister";
import { AuthProvider } from "../components/layout/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

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
          </Route>
        </Route>

        {/* Superadmin Routes */}
        <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
          <Route element={<MainLayout />}>
            <Route
              path="/superadmin/dashboard"
              element={<div>Superadmin Dashboard Placeholder</div>}
            />
          </Route>
        </Route>

        {/* Municipality Head Routes */}
        <Route
          element={<ProtectedRoute allowedRoles={["municipality_head"]} />}
        >
          <Route element={<MainLayout />}>
            <Route
              path="/municipality/dashboard"
              element={<div>Municipality Head Dashboard Placeholder</div>}
            />
          </Route>
        </Route>

        {/* Department Head Routes */}
        <Route element={<ProtectedRoute allowedRoles={["department_head"]} />}>
          <Route element={<MainLayout />}>
            <Route
              path="/department/dashboard"
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
      </Routes>
    </AuthProvider>
  );
}

export default AppRoute;
