import {
  Paper,
  alpha,
  useTheme,
  Box,
  Typography,
  AppBar,
  Toolbar,
  Container,
} from "@mui/material";
import type { MobileNavItem } from "../../types/navbar.types";
import { MobileNavItemComponent } from "./NavItem";
import type { UserRole } from "../../types/userRole.type";

interface MobileNavProps {
  items: MobileNavItem[];
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

  return (
    <>
      {/* Mobile Header */}
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
                "&:hover": {
                  transform: "scale(1.02)",
                },
              }}
              onClick={() => onNavigate("/dashboard")}
            >
              {/* Logo */}
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

              {/* Brand text */}
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

      {/* Mobile Bottom Navigation */}
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
        {items.map((item) => (
          <MobileNavItemComponent
            key={item.href}
            item={item}
            isActive={activePath === item.href}
            onClick={onNavigate}
          />
        ))}
      </Paper>
    </>
  );
}
