import React, { useState } from 'react';
import { 
  Box, IconButton, Badge, Menu, MenuItem, Typography, 
  Divider, Button, CircularProgress, alpha, useTheme 
} from '@mui/material';
import { FiBell, FiAlertCircle, FiInfo, FiCheckCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationPolling } from '../../hooks/useNotificationPolling';
import type { NotificationType } from '../../api/types';

interface NotificationDropdownProps {
  role: string;
}

export function NotificationDropdown({ role }: NotificationDropdownProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { unreadCount, notifications, loading, markAsRead, markAllAsRead } = useNotificationPolling();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleViewAll = () => {
    handleClose();
    // Redirect to the user's notification inbox
    navigate(`/${role}/notification`);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationClick = async (id: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(id);
    }
    // Could navigate to specific related entity here based on type/id if needed
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'sla_warning':
      case 'sla_escalation':
        return <FiAlertCircle color={theme.palette.error.main} size={20} />;
      case 'assignment':
      case 'handoff':
      case 'complaint_update':
        return <FiCheckCircle color={theme.palette.success.main} size={20} />;
      case 'system':
      case 'broadcast':
      default:
        return <FiInfo color={theme.palette.primary.main} size={20} />;
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: 'text.secondary',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            color: 'primary.main',
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <FiBell size={22} />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 4,
          sx: {
            width: 360,
            maxHeight: 480,
            mt: 1.5,
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead} sx={{ textTransform: 'none', fontWeight: 500 }}>
              Mark all as read
            </Button>
          )}
        </Box>
        <Divider />

        {loading && notifications.length === 0 ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={30} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <FiBell size={40} color={theme.palette.text.disabled} style={{ marginBottom: 8 }} />
            <Typography variant="body2" color="text.secondary">
              No new notifications
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
            {notifications.map((notif) => {
              const isUnread = !notif.read_at;
              return (
                <MenuItem
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.id, !isUnread)}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    bgcolor: isUnread ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    whiteSpace: 'normal',
                  }}
                >
                  <Box sx={{ mt: 0.5 }}>
                    {getIcon(notif.type)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: isUnread ? 700 : 500,
                        color: isUnread ? 'text.primary' : 'text.secondary',
                        mb: 0.5
                      }}
                    >
                      {notif.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 0.5,
                        fontSize: '0.85rem'
                      }}
                    >
                      {notif.body}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                      {notif.created_at ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }) : ''}
                    </Typography>
                  </Box>
                  {isUnread && (
                    <Box 
                      sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main',
                        mt: 1
                      }} 
                    />
                  )}
                </MenuItem>
              );
            })}
          </Box>
        )}

        <Divider />
        <Box sx={{ p: 1 }}>
          <Button 
            fullWidth 
            onClick={handleViewAll} 
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            View all notifications
          </Button>
        </Box>
      </Menu>
    </>
  );
}
