import { Outlet } from "react-router-dom";
import { Navbar } from "../Navbar";
import { useAuth } from "../../hooks/useAuth";
import type { Role } from "../../types/navbar.types";

function MainLayout() {
  const { user } = useAuth();

  // Get the role from the logged-in user, default to citizen if not logged in
  const currentRole = (user?.role || "citizen") as Role;

  return (
    <>
      <header>
        <Navbar role={currentRole} />
      </header>
      <main style={{ padding: "5px", margin: "5px" }}>
        <Outlet />
      </main>
    </>
  );
}
export default MainLayout;
