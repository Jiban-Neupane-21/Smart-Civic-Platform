import type { ReactElement } from "react";
import type { UserRole } from "./userRole.type";

export type Role = "SuperAdmin" | "Municipality" | "Department" | "Staff" | "Citizen";

export interface DesktopNavItem {
  label: string;
  icon: ReactElement;
  href: string;
  type: "desktop";
}

export interface MobileNavItem {
  label: string;
  icon: ReactElement;
  href: string;
  type: "mobile";
}

export interface NavItemConfig {
  desktop: DesktopNavItem;
  mobile: MobileNavItem;
}

export interface RoleNavConfig {
  desktop: DesktopNavItem[];
  mobile: MobileNavItem[];
}

export type NavbarConfig = Record<UserRole, RoleNavConfig>;
