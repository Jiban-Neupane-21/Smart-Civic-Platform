import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import type { Role } from "../types/navbar.types";
import { NavbarItems } from "../config/navbar.config";

export function useNavbar(role: Role) {
  const navigate = useNavigate();
  const location = useLocation();

  const config = NavbarItems[role];

  const activePath = location.pathname;

  const handleNavigate = useCallback(
    (href: string) => {
      navigate(href);
    },
    [navigate],
  );

  return {
    config,
    activePath,
    navigate: handleNavigate,
  };
}
