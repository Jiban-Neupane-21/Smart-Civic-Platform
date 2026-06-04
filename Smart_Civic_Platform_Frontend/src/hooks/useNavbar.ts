import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../components/layout/AuthContext";

import type { Role } from "../types/navbar.types";
import { NavbarItems } from "../config/navbar.config";

export function useNavbar(role: Role) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  // Map lowercase database roles to TitleCase Navbar configuration keys
  const roleMapping: Record<string, string> = {
    superadmin: "SuperAdmin",
    municipality_head: "Municipality",
    department_head: "Department",
    staff: "Staff",
    citizen: "Citizen",
  };

  const mappedRole = roleMapping[role as string] || role;
  const config = NavbarItems[mappedRole as Role] || NavbarItems[role];

  const activePath = location.pathname;

  const handleNavigate = useCallback(
    async (href: string) => {
      if (href === "/logout") {
        await logout(); // Clears user session and tokens
        navigate("/login", { replace: true });
        return;
      }
      navigate(href);
    },
    [navigate, logout],
  );

  return {
    config,
    activePath,
    navigate: handleNavigate,
  };
}
