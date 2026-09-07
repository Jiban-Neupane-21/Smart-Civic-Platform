import { useState, useCallback, useEffect, type ReactNode } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Drawer,
  IconButton,
  List,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import { FiMenu, FiPlus } from "react-icons/fi";
import type { DesktopNavItem } from "../../types/navbar.types";
import type { UserRole } from "../../types/userRole.type";
import { NotificationDropdown } from "../notification/NotificationDropdown";
import { NavbarSearch } from "./NavbarSearch";
import { UserMenu } from "./UserMenu";
import { ExpandedNavItem, MiniRailNavItem } from "./NavItem";

interface DrawerNavProps {
  items: DesktopNavItem[];
  activePath: string;
  onNavigate: (href: string) => void;
  role?: UserRole;
  brandName?: string;
  children?: ReactNode;
}

const DRAWER_WIDTH_FULL = 240;
const DRAWER_WIDTH_MINI = 72;
const APPBAR_HEIGHT = 58;

export function DrawerNav({
  items,
  activePath,
  onNavigate,
  role,
  brandName = "CivicDesk",
  children,
}: DrawerNavProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Desktop sidebar expanded/collapsed state (YouTube Guide mode)
  const [isDesktopExpanded, setIsDesktopExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("civicdesk_desktop_nav_expanded");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Mobile temporary drawer open/close
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "civicdesk_desktop_nav_expanded",
        JSON.stringify(isDesktopExpanded)
      );
    } catch {
      // Ignore storage write errors
    }
  }, [isDesktopExpanded]);

  // Handle Hamburger click (YouTube behavior)
  const handleHamburgerToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setIsDesktopExpanded((prev) => !prev);
    }
  }, [isMobile]);

  const handleListItemClick = useCallback(
    (href: string) => {
      onNavigate(href);
      if (isMobile) {
        setMobileOpen(false);
      }
    },
    [onNavigate, isMobile]
  );

  // Filter out Logout from the left sidebar list (Logout is located inside the UserMenu)
  const navItems = items.filter((item) => item.label.toLowerCase() !== "logout");

  // Calculate current desktop drawer width
  const currentDrawerWidth = isMobile
    ? 0
    : isDesktopExpanded
    ? DRAWER_WIDTH_FULL
    : DRAWER_WIDTH_MINI;

  // ── Expanded Drawer Content (Desktop expanded & Mobile overlay) ──
  const expandedListContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        "&::-webkit-scrollbar": { width: "6px" },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: alpha(theme.palette.text.secondary, 0.2),
          borderRadius: "3px",
        },
      }}
    >
      <List sx={{ flex: 1, py: 1.5, px: 0.5 }}>
        {navItems.map((item) => (
          <ExpandedNavItem
            key={item.href}
            item={item}
            isActive={activePath === item.href}
            onClick={handleListItemClick}
          />
        ))}
      </List>

      {/* YouTube-style sidebar footer */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          color: "text.secondary",
        }}
      >
        <Typography
          variant="caption"
          sx={{ display: "block", fontSize: "0.75rem", lineHeight: 1.4 }}
        >
          &copy; {new Date().getFullYear()} {brandName}
        </Typography>
        <Typography
          variant="caption"
          sx={{ display: "block", fontSize: "0.7rem", color: "text.disabled" }}
        >
          Smart Civic Platform
        </Typography>
      </Box>
    </Box>
  );

  // ── Mini Rail Content (YouTube desktop collapsed mode) ──────────
  const miniRailContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        py: 1,
        "&::-webkit-scrollbar": { width: 0 },
      }}
    >
      <List sx={{ p: 0 }}>
        {navItems.map((item) => (
          <MiniRailNavItem
            key={item.href}
            item={item}
            isActive={activePath === item.href}
            onClick={handleListItemClick}
          />
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: theme.palette.background.default }}>
      {/* ── YouTube-Style Full Width Top AppBar ────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: "100%",
          top: 0,
          left: 0,
          height: `${APPBAR_HEIGHT}px`,
          bgcolor: alpha(theme.palette.background.paper, 0.96),
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          zIndex: theme.zIndex.drawer + 2,
          color: "text.primary",
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            minHeight: `${APPBAR_HEIGHT}px !important`,
            height: `${APPBAR_HEIGHT}px`,
            px: { xs: 1.5, sm: 2.5 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Left section: Hamburger Guide Button + Logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              onClick={handleHamburgerToggle}
              aria-label="Toggle navigation drawer"
              sx={{
                color: "text.secondary",
                p: 1,
                "&:hover": {
                  bgcolor: alpha(theme.palette.action.hover, 0.1),
                  color: "text.primary",
                },
              }}
            >
              <FiMenu size={20} />
            </IconButton>

            {/* Brand Logo & Name */}
            <Box
              onClick={() => handleListItemClick(navItems[0]?.href || "/")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                cursor: "pointer",
                userSelect: "none",
                ml: 0.5,
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "10px",
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.28)}`,
                }}
              >
                CD
              </Box>
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: "-0.4px",
                    lineHeight: 1.1,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontSize: "1.1rem",
                  }}
                >
                  {brandName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.68rem",
                    fontWeight: 500,
                    letterSpacing: "0.2px",
                    display: "block",
                  }}
                >
                  {role ? `${role} Portal` : "Smart Governance"}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Center section: YouTube-style Pill Search Bar */}
          <NavbarSearch
            items={navItems}
            onNavigate={handleListItemClick}
            isMobile={isMobile}
          />

          {/* Right section: Action Buttons + Notification + User Profile Menu */}
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 } }}>
            {/* Quick Action button for citizen / staff */}
            {role === "Citizen" && !isMobile && (
              <Button
                variant="contained"
                size="small"
                startIcon={<FiPlus />}
                onClick={() => handleListItemClick("/citizen/submit-complaint")}
                sx={{
                  borderRadius: "20px",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  px: 2,
                  py: 0.7,
                  boxShadow: "none",
                  "&:hover": {
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
                  },
                }}
              >
                Create
              </Button>
            )}

            {/* Notification Bell with Badge */}
            <NotificationDropdown role={role || "citizen"} />

            {/* User Account Popover Avatar */}
            <UserMenu role={role} onNavigate={handleListItemClick} />
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Desktop Left Sidebar (Under AppBar) ────────────────────── */}
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            position: "fixed",
            top: `${APPBAR_HEIGHT}px`,
            left: 0,
            bottom: 0,
            width: `${currentDrawerWidth}px`,
            bgcolor: theme.palette.background.paper,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            zIndex: theme.zIndex.drawer,
            transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
          }}
        >
          {isDesktopExpanded ? expandedListContent : miniRailContent}
        </Box>
      )}

      {/* ── Mobile Temporary Drawer (Overlay with Backdrop) ──────── */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleHamburgerToggle}
          ModalProps={{ keepMounted: true }}
          slotProps={{
            paper: {
              sx: {
                width: DRAWER_WIDTH_FULL,
                bgcolor: theme.palette.background.paper,
                boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.16)}`,
                borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              },
            },
          }}
        >
          {/* Header inside mobile drawer */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 2,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <IconButton
              onClick={handleHamburgerToggle}
              size="small"
              sx={{ color: "text.secondary" }}
            >
              <FiMenu size={20} />
            </IconButton>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "0.8rem",
                fontWeight: 800,
              }}
            >
              CD
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {brandName}
            </Typography>
          </Box>
          {expandedListContent}
        </Drawer>
      )}

      {/* ── Main Page Content (Offset smoothly by drawer width) ───── */}
      <Box
        component="main"
        sx={{
          pt: `${APPBAR_HEIGHT}px`,
          ml: isMobile ? 0 : `${currentDrawerWidth}px`,
          minHeight: "100vh",
          bgcolor: theme.palette.background.default,
          transition: "margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
