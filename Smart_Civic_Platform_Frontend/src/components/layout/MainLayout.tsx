import { Outlet } from "react-router-dom";
import { Navbar } from "../Navbar";
import { useAuth } from "../../hooks/useAuth";
import type { Role } from "../../types/navbar.types";
import { UrgentBanner } from "../notification/UrgentBanner";
import { NotificationToast } from "../notification/NotificationToast";

function MainLayout() {
  const { user } = useAuth();
  const currentRole = (user?.role || "citizen") as Role;

  return (
    <>
      <UrgentBanner />
      <Navbar role={currentRole}>
        <Outlet />
      </Navbar>
      <NotificationToast />
    </>
  );
}
export default MainLayout;
