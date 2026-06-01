import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";
import SmartCitizenLanding from "../pages/LandingPage";
import { Login } from "../pages/auth/Login";
import { CitizenDashboard } from "../pages/citizen/Homepage";
import { Register } from "../pages/auth/CitizenRegister";

function AppRoute() {
  return (
    <Routes>
      {/* Pages without Navbar - Public/Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route index element={<SmartCitizenLanding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Pages with Navbar - Protected Routes */}
      <Route element={<MainLayout />}>
        <Route path="/home" element={<CitizenDashboard />} />
      </Route>
    </Routes>
  );
}

export default AppRoute;
