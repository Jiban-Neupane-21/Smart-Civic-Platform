import React from "react";
import type { NavItemConfig, NavbarConfig } from "../types/navbar.types";
import {
  FiGrid,
  FiBriefcase,
  FiList,
  FiSettings,
  FiGitBranch,
  FiUsers,
  FiFileText,
  FiBarChart2,
  FiBell,
  FiUser,
  FiAlertTriangle,
  FiMessageSquare,
  FiClock,
} from "react-icons/fi";
import { MdOutlinePeople } from "react-icons/md";

// Slugify label to href
const toHref = (label: string): string =>
  "/" + label.toLowerCase().replace(/\s+/g, "-");

function createNavItem(label: string, icon: React.ReactElement): NavItemConfig {
  const href = toHref(label);
  return {
    desktop: { label, icon: cloneWithSize(icon, 18), href, type: "desktop" },
    mobile: { label, icon: cloneWithSize(icon, 24), href, type: "mobile" },
  };
}

// Clone icon element with a specific size prop
function cloneWithSize(
  icon: React.ReactElement,
  size: number,
): React.ReactElement {
  return React.cloneElement(icon, size);
}

export const NavbarItems: NavbarConfig = {
  SuperAdmin: {
    desktop: [
      createNavItem("Dashboard", <FiGrid />).desktop,
      createNavItem("Manage Municipality", <FiBriefcase />).desktop,
      createNavItem("Audit Log", <FiList />).desktop,
      createNavItem("System Setting", <FiSettings />).desktop,
    ],
    mobile: [
      createNavItem("Dashboard", <FiGrid />).mobile,
      createNavItem("Manage Municipality", <FiBriefcase />).mobile,
      createNavItem("Audit Log", <FiList />).mobile,
      createNavItem("System Setting", <FiSettings />).mobile,
    ],
  },

  Municipality: {
    desktop: [
      createNavItem("Dashboard", <FiGrid />).desktop,
      createNavItem("Manage Department", <FiGitBranch />).desktop,
      createNavItem("Manage Staff", <FiUsers />).desktop,
      createNavItem("Complaint Detail", <FiFileText />).desktop,
      createNavItem("Report & Analytics", <FiBarChart2 />).desktop,
      createNavItem("Notification", <FiBell />).desktop,
      createNavItem("Profile", <FiUser />).desktop,
    ],
    mobile: [
      createNavItem("Dashboard", <FiGrid />).mobile,
      createNavItem("Complaint Detail", <FiFileText />).mobile,
      createNavItem("Notification", <FiBell />).mobile,
      createNavItem("Profile", <FiUser />).mobile,
    ],
  },

  Department: {
    desktop: [
      createNavItem("Dashboard", <FiGrid />).desktop,
      createNavItem("Staff", <FiUsers />).desktop,
      createNavItem("Team", <MdOutlinePeople />).desktop,
      createNavItem("Complaint Detail", <FiFileText />).desktop,
      createNavItem("Report & Analytics", <FiBarChart2 />).desktop,
      createNavItem("Notification", <FiBell />).desktop,
      createNavItem("Profile", <FiUser />).desktop,
    ],
    mobile: [
      createNavItem("Dashboard", <FiGrid />).mobile,
      createNavItem("Complaint Detail", <FiFileText />).mobile,
      createNavItem("Notification", <FiBell />).mobile,
      createNavItem("Profile", <FiUser />).mobile,
    ],
  },

  Staff: {
    desktop: [
      createNavItem("Dashboard", <FiGrid />).desktop,
      createNavItem("Complaint", <FiAlertTriangle />).desktop,
      createNavItem("Notification", <FiBell />).desktop,
      createNavItem("Profile", <FiUser />).desktop,
    ],
    mobile: [
      createNavItem("Dashboard", <FiGrid />).mobile,
      createNavItem("Complaint", <FiAlertTriangle />).mobile,
      createNavItem("Notification", <FiBell />).mobile,
      createNavItem("Profile", <FiUser />).mobile,
    ],
  },

  Citizen: {
    desktop: [
      createNavItem("Dashboard", <FiGrid />).desktop,
      createNavItem("Submit Complaint", <FiMessageSquare />).desktop,
      createNavItem("Complaint History", <FiClock />).desktop,
      createNavItem("Notification", <FiBell />).desktop,
      createNavItem("Profile", <FiUser />).desktop,
    ],
    mobile: [
      createNavItem("Dashboard", <FiGrid />).mobile,
      createNavItem("Submit Complaint", <FiMessageSquare />).mobile,
      createNavItem("Complaint History", <FiClock />).mobile,
      createNavItem("Notification", <FiBell />).mobile,
      createNavItem("Profile", <FiUser />).mobile,
    ],
  },
};
