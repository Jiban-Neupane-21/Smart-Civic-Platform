import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Stack,
  useTheme,
  Container,
  alpha,
} from "@mui/material";
import type { DesktopNavItem } from "../../types/navbar.types";
import { DesktopNavItemComponent } from "./NavItem";
import type { UserRole } from "../../types/userRole.type";

interface DesktopNavProps {
  items: DesktopNavItem[];
  activePath: string;
  onNavigate: (href: string) => void;
  role?: UserRole;
  brandName?: string;
}

export function DesktopNav({
  items,
  activePath,
  onNavigate,
  role,
  brandName = "CivicDesk",
}: DesktopNavProps) {
  const theme = useTheme();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        display: { xs: "none", md: "flex" },
        height: "70px",
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
            minHeight: "70px !important",
            px: { xs: 2, md: 3 },
            justifyContent: "space-between",
            gap: 4,
          }}
        >
          {/* Brand */}
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
            onClick={() => onNavigate(items[0]?.href || "/")}
          >
            {/* Logo with gradient */}
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
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                },
              }}
            >
              CD
            </Box>

            {/* Brand text with gradient */}
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
                }}
              >
                {brandName}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "1rem",
                  letterSpacing: "0.3px",
                  display: "block",
                }}
              >
                {role} - Smart Governance
              </Typography>
            </Box>
          </Box>

          {/* Nav links */}
          <Stack
            component="nav"
            direction="row"
            spacing={1}
            aria-label="Main navigation"
            sx={{
              p: "6px",
              borderRadius: "999px",

              background:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.75)",

              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",

              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,

              boxShadow:
                theme.palette.mode === "dark"
                  ? `
          0 4px 30px rgba(0,0,0,0.35),
          inset 0 1px 0 rgba(255,255,255,0.04)
        `
                  : `
          0 8px 30px rgba(0,0,0,0.08),
          inset 0 1px 0 rgba(255,255,255,0.9)
        `,

              transition: "all 0.3s ease",
            }}
          >
            {items.map((item) => (
              <DesktopNavItemComponent
                key={item.href}
                item={item}
                isActive={activePath === item.href}
                onClick={onNavigate}
              />
            ))}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
