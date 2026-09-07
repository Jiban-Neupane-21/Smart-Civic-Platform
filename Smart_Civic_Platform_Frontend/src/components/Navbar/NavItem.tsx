import React from "react";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
  useTheme,
  alpha,
  Box,
} from "@mui/material";
import type { DesktopNavItem } from "../../types/navbar.types";

interface ExpandedNavItemProps {
  item: DesktopNavItem;
  isActive: boolean;
  onClick: (href: string) => void;
}

export function ExpandedNavItem({
  item,
  isActive,
  onClick,
}: ExpandedNavItemProps) {
  const theme = useTheme();

  return (
    <ListItem disablePadding sx={{ px: 1.5, mb: 0.3 }}>
      <ListItemButton
        onClick={() => onClick(item.href)}
        aria-current={isActive ? "page" : undefined}
        sx={{
          minHeight: 42,
          borderRadius: "10px",
          px: 1.5,
          py: 0.8,
          bgcolor: isActive
            ? alpha(theme.palette.primary.main, 0.12)
            : "transparent",
          color: isActive ? "primary.main" : "text.primary",
          "&:hover": {
            bgcolor: isActive
              ? alpha(theme.palette.primary.main, 0.18)
              : alpha(theme.palette.action.hover, 0.08),
          },
          transition: "background-color 0.15s ease",
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 40,
            color: isActive ? "primary.main" : "text.secondary",
            "& svg": {
              fontSize: "1.25rem",
              transition: "transform 0.15s ease",
            },
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          slotProps={{
            primary: {
              fontSize: "0.89rem",
              fontWeight: isActive ? 600 : 450,
              color: isActive ? "primary.main" : "text.primary",
              noWrap: true,
            },
          }}
        />
        {isActive && (
          <Box
            sx={{
              width: 4,
              height: 18,
              borderRadius: "2px",
              bgcolor: "primary.main",
            }}
          />
        )}
      </ListItemButton>
    </ListItem>
  );
}

interface MiniRailNavItemProps {
  item: DesktopNavItem;
  isActive: boolean;
  onClick: (href: string) => void;
}

export function MiniRailNavItem({
  item,
  isActive,
  onClick,
}: MiniRailNavItemProps) {
  const theme = useTheme();

  return (
    <Tooltip title={item.label} placement="right" arrow>
      <ListItem disablePadding sx={{ px: 0.8, mb: 0.5 }}>
        <ListItemButton
          onClick={() => onClick(item.href)}
          aria-current={isActive ? "page" : undefined}
          sx={{
            minHeight: 66,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "10px",
            px: 0.5,
            py: 1,
            bgcolor: isActive
              ? alpha(theme.palette.primary.main, 0.12)
              : "transparent",
            color: isActive ? "primary.main" : "text.secondary",
            "&:hover": {
              bgcolor: isActive
                ? alpha(theme.palette.primary.main, 0.18)
                : alpha(theme.palette.action.hover, 0.08),
              color: "text.primary",
            },
            transition: "all 0.15s ease",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 0.6,
              color: isActive ? "primary.main" : "inherit",
              "& svg": {
                fontSize: "1.35rem",
              },
            }}
          >
            {item.icon}
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: "10px",
              fontWeight: isActive ? 600 : 450,
              lineHeight: 1.1,
              textAlign: "center",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: isActive ? "primary.main" : "inherit",
              maxWidth: "100%",
            }}
          >
            {item.label}
          </Typography>
        </ListItemButton>
      </ListItem>
    </Tooltip>
  );
}
