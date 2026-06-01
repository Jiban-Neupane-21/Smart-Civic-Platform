import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import LandingPage from "../pages/LandingPag";
import { Login } from "../pages/auth/Login";
import { CitizenDashboard } from "../pages/citizen/Homepage";
import { Register } from "../pages/auth/CitizenRegister";

function AppRoute() {
  return (
    //Use Protected route after fully implementing auth
    <Routes>
      {/* Add Login route here */}
      {/* Pages without Navbar */}

      {/* other pages with navbar can go here */}
      {/* Pages with Navbar */}
      <Route element={<MainLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="/login" element={<Login />} />{" "}
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<CitizenDashboard />} />
      </Route>
    </Routes>
  );
}

export default AppRoute;
