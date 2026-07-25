import { useState, useCallback, type ReactNode } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Container,
  alpha,
} from "@mui/material";
import { FiMenu } from "react-icons/fi";
import type { DesktopNavItem } from "../../types/navbar.types";
import type { UserRole } from "../../types/userRole.type";

interface DrawerNavProps {
  items: DesktopNavItem[];
  activePath: string;
  onNavigate: (href: string) => void;
  role?: UserRole;
  brandName?: string;
  children?: ReactNode;
}

const DRAWER_WIDTH_FULL = 260;
const DRAWER_WIDTH_MINI = 72;
const APPBAR_HEIGHT = 70;
const APPBAR_HEIGHT_MOBILE = 60;

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
  const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [miniExpanded, setMiniExpanded] = useState(false);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleListItemClick = useCallback(
    (href: string) => {
      onNavigate(href);
      if (isMobile) {
        setMobileOpen(false);
      }
    },
    [onNavigate, isMobile],
  );

  const handleMouseEnter = useCallback(() => {
    if (isTablet) {
      setMiniExpanded(true);
    }
  }, [isTablet]);

  const handleMouseLeave = useCallback(() => {
    if (isTablet) {
      setMiniExpanded(false);
    }
  }, [isTablet]);

  const lastItem = items[items.length - 1];
  const mainItems = lastItem?.label === "Logout" ? items.slice(0, -1) : items;
  const secondaryItems = lastItem?.label === "Logout" ? [lastItem] : [];

  // Compute the current drawer width and text visibility
  const drawerWidth = isMobile
    ? 0
    : isDesktop
      ? DRAWER_WIDTH_FULL
      : miniExpanded
        ? DRAWER_WIDTH_FULL
        : DRAWER_WIDTH_MINI;

  const showText = isMobile || miniExpanded || isDesktop;
  const barHeight = isMobile ? APPBAR_HEIGHT_MOBILE : APPBAR_HEIGHT;

  // ── Drawer content shared across all breakpoints ──────────────
  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Brand in drawer (mobile only) */}
      {isMobile && (
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "0.8rem",
              fontWeight: "bold",
              boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            CD
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1.1,
              }}
            >
              {brandName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.75rem",
                display: "block",
              }}
            >
              {role} - Smart Governance
            </Typography>
          </Box>
        </Box>
      )}

      {/* Mini drawer logo (tablet collapsed) */}
      {!isMobile && !miniExpanded && isTablet && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: `${barHeight}px`,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "1rem",
              fontWeight: "bold",
              boxShadow: `0 6px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            CD
          </Box>
        </Box>
      )}

      {/* Main nav list */}
      <List sx={{ flex: 1, px: 1.5, py: 1 }}>
        {mainItems.map((item) => {
          const isActive = activePath === item.href;

          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleListItemClick(item.href)}
                aria-current={isActive ? "page" : undefined}
                sx={{
                  minHeight: 48,
                  px: showText ? 2 : 0,
                  justifyContent: showText ? "initial" : "center",
                  borderRadius: 2,
                  position: "relative",
                  transition: "all 0.2s ease",
                  bgcolor: isActive
                    ? alpha(theme.palette.primary.main, 0.1)
                    : "transparent",
                  "&:hover": {
                    bgcolor: isActive
                      ? alpha(theme.palette.primary.main, 0.15)
                      : alpha(theme.palette.action.hover, 0.6),
                  },
                }}
              >
                {isActive && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: "60%",
                      borderRadius: "0 4px 4px 0",
                      bgcolor: "primary.main",
                    }}
                  />
                )}

                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    justifyContent: "center",
                    color: isActive ? "primary.main" : "text.secondary",
                    mr: showText ? 2 : 0,
                    transition: "color 0.2s ease",
                    "& svg": { fontSize: isMobile ? "1.3rem" : "1.15rem" },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {showText && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: "0.9rem",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "text.primary" : "text.secondary",
                      noWrap: true,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Secondary items (logout) */}
      {secondaryItems.length > 0 && (
        <>
          <Divider sx={{ mx: 2, mb: 1 }} />
          <List sx={{ px: 1.5, pb: 2 }}>
            {secondaryItems.map((item) => {
              const isActive = activePath === item.href;

              return (
                <ListItem key={item.href} disablePadding>
                  <ListItemButton
                    onClick={() => handleListItemClick(item.href)}
                    sx={{
                      minHeight: 48,
                      px: showText ? 2 : 0,
                      justifyContent: showText ? "initial" : "center",
                      borderRadius: 2,
                      "&:hover": {
                        bgcolor: alpha(theme.palette.error.main, 0.08),
                        color: "error.main",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        justifyContent: "center",
                        color: "text.secondary",
                        mr: showText ? 2 : 0,
                        "& svg": { fontSize: isMobile ? "1.3rem" : "1.15rem" },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {showText && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: "0.9rem",
                          fontWeight: 500,
                          color: "text.secondary",
                          noWrap: true,
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh" }}>
      {/* ── Top AppBar ──────────────────────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: alpha(theme.palette.background.paper, 0.92),
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
          zIndex: theme.zIndex.drawer + 1,
          width: isMobile ? "100%" : `calc(100% - ${drawerWidth}px)`,
          ml: isMobile ? 0 : `${drawerWidth}px`,
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Container maxWidth="xl" disableGutters>
          <Toolbar
            sx={{
              minHeight: `${barHeight}px !important`,
              px: { xs: 2, md: 3 },
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <IconButton
                onClick={handleDrawerToggle}
                aria-label="Toggle navigation drawer"
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: "primary.main",
                  },
                }}
              >
                <FiMenu size={22} />
              </IconButton>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  cursor: "pointer",
                  transition: "transform 0.2s ease",
                  "&:hover": { transform: "scale(1.02)" },
                }}
                onClick={() => handleListItemClick(items[0]?.href || "/")}
              >
                <Box
                  sx={{
                    width: { xs: 32, md: 40 },
                    height: { xs: 32, md: 40 },
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: { xs: "0.8rem", md: "1rem" },
                    fontWeight: "bold",
                    boxShadow: `0 6px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  CD
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      letterSpacing: "-0.5px",
                      lineHeight: 1.2,
                      fontSize: { xs: "1rem", md: "1.25rem" },
                    }}
                  >
                    {brandName}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontSize: { xs: "0.7rem", md: "0.8rem" },
                      letterSpacing: "0.3px",
                      display: "block",
                    }}
                  >
                    {role} - Smart Governance
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* ── Mobile temporary drawer (overlay) ────────────────── */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          slotProps={{
            paper: {
              sx: {
                width: DRAWER_WIDTH_FULL,
                boxSizing: "border-box",
                bgcolor: theme.palette.background.paper,
                borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              },
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* ── Tablet persistent mini drawer (fixed) ───────────── */}
      {isTablet && (
        <Box
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: miniExpanded ? DRAWER_WIDTH_FULL : DRAWER_WIDTH_MINI,
            zIndex: theme.zIndex.drawer,
            bgcolor: theme.palette.background.paper,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflowX: "hidden",
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
          }}
        >
          {drawerContent}
        </Box>
      )}

      {/* ── Desktop permanent full drawer (fixed) ───────────── */}
      {isDesktop && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: DRAWER_WIDTH_FULL,
            zIndex: theme.zIndex.drawer,
            bgcolor: theme.palette.background.paper,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflowX: "hidden",
          }}
        >
          {drawerContent}
        </Box>
      )}

      {/* ── Main content area (offset by drawer width) ─────── */}
      <Box
        component="main"
        sx={{
          pt: `${barHeight}px`,
          ml: isMobile ? 0 : `${drawerWidth}px`,
          minHeight: "100vh",
          bgcolor: theme.palette.background.default,
          transition: theme.transitions.create("margin", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
