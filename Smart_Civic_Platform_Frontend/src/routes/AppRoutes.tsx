import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import LandingPage from "../pages/LandingPag";

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
      </Route>
    </Routes>
  );
}

export default AppRoute;
