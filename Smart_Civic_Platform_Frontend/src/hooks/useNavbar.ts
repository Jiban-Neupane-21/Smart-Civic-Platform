import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import Swal from "sweetalert2";

// Import your configuration types alongside the Role type
import type { Role, RoleNavConfig } from "../types/navbar.types";
import { NavbarItems } from "../config/navbar.config";

// Explicitly define what this hook returns to prevent TypeScript from creating broken union types
interface UseNavbarReturn {
  config: RoleNavConfig | undefined;
  activePath: string;
  navigate: (href: string) => Promise<void>;
}

export function useNavbar(role: Role): UseNavbarReturn {
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

  // Use a type cast here so TypeScript evaluates this cleanly as NavbarConfigValue
  const items = NavbarItems as Record<string, RoleNavConfig>;
  const config = items[mappedRole] ?? items[role as string];

  const routePrefix = `/${role.toLowerCase()}`;

  const mapHref = (item: any) => {
    if (item.href === "/logout") return item;
    return { ...item, href: `${routePrefix}${item.href}` };
  };

  const dynamicConfig = config
    ? {
        desktop: config.desktop.map(mapHref),
        mobile: {
          primary: config.mobile.primary.map(mapHref),
          secondary: config.mobile.secondary.map(mapHref),
        },
      }
    : undefined;

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
    config: dynamicConfig,
    activePath,
    navigate: handleNavigate,
  };
}
