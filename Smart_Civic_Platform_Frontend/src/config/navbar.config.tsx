import React from "react";
import type { IconBaseProps } from "react-icons";
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
  FiLogOut,
  FiMenu,
} from "react-icons/fi";
import { MdOutlinePeople } from "react-icons/md";

// Slugify label to href
const toHref = (label: string): string =>
  "/" + label.toLowerCase().replace(/\s+/g, "-");

function createNavItem(
  label: string,
  icon: React.ReactElement<IconBaseProps>,
): NavItemConfig {
  const href = toHref(label);
  return {
    desktop: { label, icon: cloneWithSize(icon, 18), href, type: "desktop" },
    mobile: { label, icon: cloneWithSize(icon, 24), href, type: "mobile" },
  };
}

// Clone icon element with a specific size prop
function cloneWithSize(
  icon: React.ReactElement<IconBaseProps>,
  size: number,
): React.ReactElement {
  return React.cloneElement(icon, { size });
}

const dashboardItem = createNavItem("Dashboard", <FiGrid />);
const logoutItem = createNavItem("Logout", <FiLogOut />);
const manageMunicipalityItem = createNavItem(
  "Manage Municipality",
  <FiBriefcase />,
);
const auditLogItem = createNavItem("Audit Log", <FiList />);
const systemSettingItem = createNavItem("System Setting", <FiSettings />);
const manageDepartmentStaffItem = createNavItem(
  "Manage Department Staff",
  <FiGitBranch />,
);
const complaintDetailItem = createNavItem("Complaint Detail", <FiFileText />);
const reportAnalyticsItem = createNavItem(
  "Report & Analytics",
  <FiBarChart2 />,
);
const notificationItem = createNavItem("Notification", <FiBell />);
const profileItem = createNavItem("Profile", <FiUser />);
const staffItem = createNavItem("Staff", <FiUsers />);
const teamItem = createNavItem("Team", <MdOutlinePeople />);
const complaintItem = createNavItem("Complaint", <FiAlertTriangle />);
const submitComplaintItem = createNavItem(
  "Submit Complaint",
  <FiMessageSquare />,
);
const complaintHistoryItem = createNavItem("Complaint History", <FiClock />);
export const moreItem = createNavItem("More", <FiMenu />);

export const NavbarItems: NavbarConfig = {
  SuperAdmin: {
    desktop: [
      dashboardItem.desktop,
      manageMunicipalityItem.desktop,
      auditLogItem.desktop,
      systemSettingItem.desktop,
      logoutItem.desktop,
    ],
    mobile: {
      primary: [
        dashboardItem.mobile,
        manageMunicipalityItem.mobile, // Important admin task
        auditLogItem.mobile,
      ],
      secondary: [systemSettingItem.mobile, logoutItem.mobile],
    },
  },

  Municipality: {
    desktop: [
      dashboardItem.desktop,
      manageDepartmentStaffItem.desktop,
      complaintDetailItem.desktop,
      reportAnalyticsItem.desktop,
      notificationItem.desktop,
      profileItem.desktop,
      logoutItem.desktop,
    ],
    mobile: {
      primary: [
        dashboardItem.mobile,
        manageDepartmentStaffItem.mobile,
        reportAnalyticsItem.mobile, // Heavy tables/graphs usually viewed on desktop
        notificationItem.mobile, // Alerts for new issues
      ],
      secondary: [
        complaintDetailItem.mobile, // Crucial for quick resolution checks
        profileItem.mobile,
        logoutItem.mobile,
      ],
    },
  },

  Department: {
    desktop: [
      dashboardItem.desktop,
      staffItem.desktop,
      teamItem.desktop,
      complaintDetailItem.desktop,
      reportAnalyticsItem.desktop,
      notificationItem.desktop,
      profileItem.desktop,
      logoutItem.desktop,
    ],
    mobile: {
      primary: [
        dashboardItem.mobile,
        complaintDetailItem.mobile,
        reportAnalyticsItem.mobile,
        notificationItem.mobile,
      ],
      secondary: [
        staffItem.mobile,
        teamItem.mobile,
        profileItem.mobile,
        logoutItem.mobile,
      ],
    },
  },

  Staff: {
    desktop: [
      dashboardItem.desktop,
      complaintItem.desktop,
      profileItem.desktop,
      logoutItem.desktop,
      notificationItem.desktop,
    ],
    mobile: {
      primary: [
        dashboardItem.mobile,
        complaintItem.mobile, 
        notificationItem.mobile,
      ],
      secondary: [profileItem.mobile, logoutItem.mobile],
    },
  },

  Citizen: {
    desktop: [
      dashboardItem.desktop,
      submitComplaintItem.desktop,
      complaintHistoryItem.desktop,
      notificationItem.desktop,
      profileItem.desktop,
      logoutItem.desktop,
    ],
    mobile: {
      primary: [
        dashboardItem.mobile,
        submitComplaintItem.mobile, // The #1 reason a citizen uses the app
        complaintHistoryItem.mobile, // Checking status updates on the go
        notificationItem.mobile,
      ],
      secondary: [
        profileItem.mobile,
        logoutItem.mobile,
      ],
    },
  },
};
