import type { DesktopNavItem, MobileNavItem } from "../../types/navbar.types";
import { Button, alpha, useTheme, Box, Typography } from "@mui/material";

// ── Desktop nav item ──────────────────────────────────────────────
interface DesktopNavItemProps {
  item: DesktopNavItem;
  isActive: boolean;
  onClick: (href: string) => void;
}

export function DesktopNavItemComponent({
  item,
Role,
  isActive,
  onClick,
}: DesktopNavItemProps) {
  const theme = useTheme();

  return (
    <Button
      onClick={() => onClick(item.href)}
      aria-current={isActive ? "page" : undefined}
      startIcon={item.icon}
      disableRipple={false}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2.5,
        py: 1,
        borderRadius: "40px",
        fontSize: "1rem",
        fontWeight: isActive ? 600 : 500,
        textTransform: "none",
        whiteSpace: "nowrap",
        minWidth: "unset",
        position: "relative",
        color: isActive ? "text.primary" : "text.secondary",
        bgcolor: isActive
          ? alpha(theme.palette.primary.main, 0.1)
          : "transparent",
        transition: "all 0.2s ease-in-out",

        // Icon styling
        "& .MuiButton-startIcon": {
          margin: 0,
          color: "inherit",
          "& svg": {
            fontSize: "1.1rem",
          },
        },

        // Hover effects
        "&:hover": {
          bgcolor: isActive ? "#bcc0c4" : "#f5f5f5",

          color: isActive ? "primary.main" : "text.primary",
          transform: "translateY(-1px)",
        },

        // Active indicator
        "&::after": isActive
          ? {
              content: '""',
              position: "absolute",
              bottom: -2,
              left: "50%",
              transform: "translateX(-50%)",
              width: "30%",
              height: 3,
              borderRadius: "4px",
              bgcolor: "primary.main",
              transition: "width 0.2s ease",
            }
          : {},

        "&:hover::after": {
          width: "40%",
        },
      }}
    >
      {item.label}
    </Button>
  );
}

// ── Mobile nav item ───────────────────────────────────────────────
interface MobileNavItemProps {
  item: MobileNavItem;
  isActive: boolean;
  onClick: (href: string) => void;
}

export function MobileNavItemComponent({
  item,
  isActive,
  onClick,
}: MobileNavItemProps) {
  const theme = useTheme();
  return (
    <Button
      onClick={() => onClick(item.href)}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      fullWidth
      sx={{
        fontSize: "1.5rem",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 1.5,
        px: 1,
        borderRadius: 2,
        textTransform: "none",
        color: isActive ? "text.primary" : "text.secondary",
        bgcolor: isActive
          ? alpha(theme.palette.primary.main, 0.1)
          : "transparent",
        transition: "all 0.2s",
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, 0.15),
          color: "primary.main",
        },
        // Hide label by default
        "& .label-text": {
          opacity: 0,
          visibility: "hidden",
          bottom: -24,
        },
        // Show label on hover
        "&:hover .label-text": {
          opacity: 1,
          visibility: "visible",
          bottom: -32,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.3s ease",
          transform: isActive ? "scale(1.1)" : "scale(1)",
        }}
      >
        {item.icon}
      </Box>

      <Typography
        className="label-text"
        variant="caption"
        sx={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "10px",
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: "nowrap",
          transition: "all 0.2s ease",
          bgcolor: alpha(theme.palette.common.black, 0.85),
          color: "white",
          px: 1,
          py: 0.5,
          borderRadius: "12px",
          pointerEvents: "none",
          zIndex: 1,
          ...(isActive && {
            opacity: 1,
            visibility: "visible",
            bottom: -32,
          }),
        }}
      >
        {item.label}
      </Typography>
    </Button>
  );
}
