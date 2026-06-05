import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import Swal from "sweetalert2";

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
        const result = await Swal.fire({
          title: "Log out",
          text: "Are you sure you want to log out?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Yes, log out",
          cancelButtonText: "Cancel",
        });

        if (!result.isConfirmed) {
          return;
        }

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
