import React from "react";
import { Paper,  alpha, useTheme } from "@mui/material";
import type { MobileNavItem } from "../../types/navbar.types";
import { MobileNavItemComponent } from "./NavItem";

interface MobileNavProps {
  items: MobileNavItem[];
  activePath: string;
  onNavigate: (href: string) => void;
}

export function MobileNav({ items, activePath, onNavigate }: MobileNavProps) {
  const theme = useTheme();

  return (
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
  );
}