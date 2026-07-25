import { Outlet } from "react-router-dom";
import { Navbar } from "../Navbar";
import { useAuth } from "../../hooks/useAuth";
import type { Role } from "../../types/navbar.types";

function MainLayout() {
  const { user } = useAuth();
  const currentRole = (user?.role || "citizen") as Role;

  return (
    <Navbar role={currentRole}>
      <Outlet />
    </Navbar>
  );
}
export default MainLayout;
