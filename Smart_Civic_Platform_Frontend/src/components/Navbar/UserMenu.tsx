import React, { useState } from "react";
import {
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  Divider,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import {
  FiUser,
  FiSettings,
  FiLogOut,
  FiCheckCircle,
  FiHelpCircle,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../types/userRole.type";

interface UserMenuProps {
  role?: UserRole | string;
  onNavigate: (href: string) => void;
}

export function UserMenu({ role = "Citizen", onNavigate }: UserMenuProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (href: string) => {
    handleClose();
    onNavigate(href);
  };

  // Extract initials
  const fullName = user?.full_name || "Civic User";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const userEmail = user?.email || "user@civicdesk.org";
  const roleDisplay = (user?.role || role || "Citizen").toString().replace(/_/g, " ");

  const rolePrefix = `/${(user?.role || role || "citizen").toString().toLowerCase().replace(/_/g, "-")}`;

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        aria-controls={open ? "youtube-account-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        sx={{
          p: 0.5,
          border: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
          "&:hover": {
            border: `2px solid ${theme.palette.primary.main}`,
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`,
          },
          transition: "all 0.2s ease",
        }}
      >
        <Avatar
          sx={{
            width: 34,
            height: 34,
            fontSize: "0.88rem",
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            color: "white",
          }}
        >
          {initials}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        id="youtube-account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          elevation: 6,
          sx: {
            width: 280,
            borderRadius: 3,
            mt: 1.5,
            p: 0.5,
            overflow: "visible",
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.12)}`,
            "&::before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: 0,
              right: 18,
              width: 10,
              height: 10,
              bgcolor: "background.paper",
              transform: "translateY(-50%) rotate(45deg)",
              zIndex: 0,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            },
          },
        }}
      >
        {/* User profile card header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1.5,
            p: 2,
            pb: 1.5,
          }}
        >
          <Avatar
            sx={{
              width: 44,
              height: 44,
              fontSize: "1.1rem",
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              color: "white",
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ overflow: "hidden", flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                lineHeight: 1.2,
                mb: 0.3,
              }}
              noWrap
            >
              {fullName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                mb: 0.8,
              }}
              noWrap
            >
              {userEmail}
            </Typography>
            <Chip
              label={roleDisplay}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.68rem",
                fontWeight: 600,
                textTransform: "capitalize",
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
                borderRadius: "10px",
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Menu Items */}
        <MenuItem
          onClick={() => handleMenuItemClick(`${rolePrefix}/profile`)}
          sx={{
            borderRadius: 2,
            mx: 0.5,
            py: 1,
            "&:hover": { bgcolor: alpha(theme.palette.action.hover, 0.1) },
          }}
        >
          <ListItemIcon sx={{ color: "text.secondary", minWidth: 36 }}>
            <FiUser size={18} />
          </ListItemIcon>
          <ListItemText
            primary="Your Profile"
            slotProps={{
              primary: { fontSize: "0.9rem", fontWeight: 500 },
            }}
          />
        </MenuItem>

        {role === "Citizen" && (
          <MenuItem
            onClick={() => handleMenuItemClick(`${rolePrefix}/complaint-history`)}
            sx={{
              borderRadius: 2,
              mx: 0.5,
              py: 1,
              "&:hover": { bgcolor: alpha(theme.palette.action.hover, 0.1) },
            }}
          >
            <ListItemIcon sx={{ color: "text.secondary", minWidth: 36 }}>
              <FiCheckCircle size={18} />
            </ListItemIcon>
            <ListItemText
              primary="Complaints Activity"
              slotProps={{
                primary: { fontSize: "0.9rem", fontWeight: 500 },
              }}
            />
          </MenuItem>
        )}

        <MenuItem
          onClick={() => handleMenuItemClick(`${rolePrefix}/notification`)}
          sx={{
            borderRadius: 2,
            mx: 0.5,
            py: 1,
            "&:hover": { bgcolor: alpha(theme.palette.action.hover, 0.1) },
          }}
        >
          <ListItemIcon sx={{ color: "text.secondary", minWidth: 36 }}>
            <FiSettings size={18} />
          </ListItemIcon>
          <ListItemText
            primary="Account Notifications"
            slotProps={{
              primary: { fontSize: "0.9rem", fontWeight: 500 },
            }}
          />
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={() => handleMenuItemClick("/logout")}
          sx={{
            borderRadius: 2,
            mx: 0.5,
            py: 1,
            color: "error.main",
            "&:hover": {
              bgcolor: alpha(theme.palette.error.main, 0.08),
            },
          }}
        >
          <ListItemIcon sx={{ color: "error.main", minWidth: 36 }}>
            <FiLogOut size={18} />
          </ListItemIcon>
          <ListItemText
            primary="Sign out"
            slotProps={{
              primary: {
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "error.main",
              },
            }}
          />
        </MenuItem>
      </Menu>
    </>
  );
}
