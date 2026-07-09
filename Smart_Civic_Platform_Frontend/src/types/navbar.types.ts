import type { ReactElement } from "react";
import type { UserRole } from "./userRole.type";

export type Role =
  | "SuperAdmin"
  | "Municipality-head"
  | "Department-head"
  | "Staff"
  | "Citizen";

export interface DesktopNavItem {
  label: string;
  icon: ReactElement;
  Role : Role;
  href: string;
  type: "desktop";
}

export interface MobileNavItem {
  label: string;
  icon: ReactElement;
  Role : Role;
  href: string;
  type: "mobile";
}

export interface NavItemConfig {
  desktop: DesktopNavItem;
  mobile: MobileNavItem;
}

export interface RoleNavConfig {
  desktop: DesktopNavItem[];
  mobile: {
    primary: MobileNavItem[];
    secondary: MobileNavItem[];
  };
}

export type NavbarConfig = Record<UserRole, RoleNavConfig>;
