import { useState } from "react";
import {
  Paper,
  alpha,
  useTheme,
  Box,
  Typography,
  AppBar,
  Toolbar,
  Container,
  Button,
  Drawer,
  IconButton,
} from "@mui/material";
import { FiMenu, FiX } from "react-icons/fi";
import type { MobileNavItem } from "../../types/navbar.types";
import { MobileNavItemComponent } from "./NavItem";
import type { UserRole } from "../../types/userRole.type";

interface MobileNavProps {
  // Receives the split mobile structure from parent
  items: {
    primary: MobileNavItem[];
    secondary: MobileNavItem[];
  };
  activePath: string;
  role: UserRole;
  onNavigate: (href: string) => void;
}

export function MobileNav({
  items,
  activePath,
  onNavigate,
  role,
}: MobileNavProps) {
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fallback structures if values are undefined during dynamic initialization
  const primaryItems = items?.primary || [];
  const secondaryItems = items?.secondary || [];

  const handleMenuClick = (href: string) => {
    setDrawerOpen(false);
    onNavigate(href);
  };

  return (
    <>
      {/* Mobile Header Banner */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          display: { xs: "flex", md: "none" },
          height: "60px",
          bgcolor: alpha(theme.palette.background.paper, 0.92),
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          justifyContent: "center",
          boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            sx={{
              minHeight: "60px !important",
              px: 2,
              justifyContent: "left",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                cursor: "pointer",
                transition: "transform 0.2s ease",
                "&:hover": { transform: "scale(1.02)" },
              }}
              onClick={() => onNavigate(primaryItems[0]?.href || "/")}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
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
                    letterSpacing: "-0.3px",
                    lineHeight: 1.1,
                  }}
                >
                  CivicDesk
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.9rem",
                    letterSpacing: "0.2px",
                    display: "block",
                  }}
                >
                  {role} - Smart Governance
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Bottom Navigation Bar */}
      <Paper
        elevation={8}
        sx={{
          display: { xs: "flex", md: "none" },
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: "blur(20px)",
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 0,
          padding: "8px 16px",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
          gap: 1,
          transition: "all 0.3s ease",
        }}
        component="nav"
        aria-label="Mobile navigation"
      >
        {/* Render Primary Action Buttons */}
        {primaryItems.map((item) => (
          <MobileNavItemComponent
            key={item.href}
            item={item}
            isActive={activePath === item.href}
            onClick={onNavigate}
          />
        ))}

        {/* Dynamic "More Menu" Trigger Button */}
        <Button
          onClick={() => setDrawerOpen(true)}
          aria-label="More navigation links"
          fullWidth
          sx={{
            fontSize: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 1.5,
            px: 1,
            borderRadius: 2,
            textTransform: "none",
            color: drawerOpen ? "primary.main" : "text.secondary",
            bgcolor: "transparent",
            transition: "all 0.2s",
            "&:hover": {
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: "primary.main",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiMenu size={24} />
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: "10px",
              fontWeight: 600,
              mt: 0.5,
              color: "text.secondary",
            }}
          >
            More
          </Typography>
        </Button>
      </Paper>

      {/* Slide-Up Overlay Sheet for Secondary Actions */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
              padding: "20px",
              paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
              backgroundColor: theme.palette.background.paper,
              maxHeight: "75vh",
            },
          }
        }}
        sx={{ zIndex: 1200 }}
      >
        {/* Drawer Header Close Row */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "between",
            alignItems: "center",
            mb: 3,
            pb: 1,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: "text.primary", flexGrow: 1 }}
          >
            All Features
          </Typography>
          <IconButton
            onClick={() => setDrawerOpen(false)}
            size="small"
            sx={{ color: "text.secondary" }}
          >
            <FiX size={20} />
          </IconButton>
        </Box>

        {/* Responsive Content Grid Layout for Drawer Items */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2,
          }}
        >
          {secondaryItems.map((item) => {
            const isItemActive = activePath === item.href;
            return (
              <Box
                key={item.href}
                onClick={() => handleMenuClick(item.href)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 1.5,
                  borderRadius: 3,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                  bgcolor: isItemActive
                    ? alpha(theme.palette.primary.main, 0.08)
                    : "transparent",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 1.2,
                    borderRadius: 2,
                    bgcolor: isItemActive
                      ? alpha(theme.palette.primary.main, 0.12)
                      : alpha(theme.palette.action.hover, 0.4),
                    color: isItemActive ? "primary.main" : "text.secondary",
                    mb: 1,
                    "& svg": { fontSize: "24px" },
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isItemActive ? 600 : 500,
                    color: isItemActive ? "text.primary" : "text.secondary",
                    fontSize: "11px",
                    lineHeight: 1.2,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Drawer>
    </>
  );
}
