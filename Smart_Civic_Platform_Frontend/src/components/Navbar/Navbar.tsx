import type { ReactNode } from "react";
import type { Role } from "../../types/navbar.types";
import { useNavbar } from "../../hooks/useNavbar";
import { DrawerNav } from "./DrawerNav";
import type { UserRole } from "../../types/userRole.type";

interface NavbarProps {
  role: Role;
  children?: ReactNode;
}

export function Navbar({ role, children }: NavbarProps) {
  const { config, activePath, navigate } = useNavbar(role);

  const items = config?.desktop || [];

  return (
    <DrawerNav
      items={items}
      activePath={activePath}
      onNavigate={navigate}
      role={role as UserRole}
    >
      {children}
    </DrawerNav>
  );
}
