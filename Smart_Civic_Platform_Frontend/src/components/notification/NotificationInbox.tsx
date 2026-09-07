import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, List, ListItem, ListItemAvatar, 
  ListItemText, Avatar, Divider, Button, Tabs, Tab, 
  CircularProgress, alpha, useTheme, Chip, Stack
} from '@mui/material';
import { 
  FiCheckCircle, FiAlertCircle, FiInfo, FiClock, FiCheck, FiArrowRight
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationPolling } from '../../hooks/useNotificationPolling';
import { useAuth } from '../../hooks/useAuth';
import type { NotificationType } from '../../api/types';
import notificationsApi from '../../api/modules/notifications.api';

export function NotificationInbox() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'citizen';

  const { unreadCount, markAllAsRead, refresh } = useNotificationPolling();
  const [tab, setTab] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab indices: 0 = All, 1 = Unread, 2 = Grievances, 3 = Alerts, 4 = Broadcast, 5 = System
  
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getNotifications({ limit: 100 });
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (error) {
      console.error('Failed to load notifications inbox', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [unreadCount]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
      refresh();
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    loadNotifications();
  };

  const handleNavigateToEntity = (notif: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!notif.read_at) {
      handleMarkAsRead(notif.id);
    }

    if (notif.complaint_id) {
      if (role === 'citizen') {
        navigate(`/citizen/complaints/${notif.complaint_id}`);
      } else if (role === 'staff') {
        navigate(`/staff/complaint/${notif.complaint_id}`);
      } else if (role === 'department_head') {
        navigate(`/department_head/complaint-queue`);
      } else if (role === 'municipality_head') {
        navigate(`/municipality_head/complaint-detail`);
      }
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (tab === 1) return !n.read_at;
    if (tab === 2) return ['complaint_update', 'assignment', 'handoff'].includes(n.type);
    if (tab === 3) return ['sla_warning', 'sla_escalation'].includes(n.type);
    if (tab === 4) return n.type === 'broadcast';
    if (tab === 5) return n.type === 'system';
    return true;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'sla_warning':
      case 'sla_escalation':
        return <FiAlertCircle size={22} />;
      case 'assignment':
      case 'handoff':
      case 'complaint_update':
        return <FiCheckCircle size={22} />;
      case 'system':
      case 'broadcast':
      default:
        return <FiInfo size={22} />;
    }
  };

  const getColor = (type: NotificationType) => {
    switch (type) {
      case 'sla_warning':
      case 'sla_escalation': return theme.palette.error;
      case 'assignment':
      case 'handoff':
      case 'complaint_update': return theme.palette.success;
      case 'system':
      case 'broadcast':
      default: return theme.palette.primary;
    }
  };

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="md" sx={{ margin: '0 auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stay informed on grievances, operational assignments, and civic notices.
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<FiCheck />} 
          onClick={handleMarkAll}
          disabled={unreadCount === 0}
          sx={{ borderRadius: 2 }}
        >
          Mark all as read
        </Button>
      </Box>

      <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[2] }}>
        <Tabs 
          value={tab} 
          onChange={(_, v) => setTab(v)} 
          variant="scrollable" 
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
        >
          <Tab label="All" />
          <Tab label={`Unread (${unreadCount})`} />
          <Tab label="Grievances" />
          <Tab label="Alerts" />
          <Tab label="Broadcasts" />
          <Tab label="System" />
        </Tabs>

        {loading ? (
          <Box p={6} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box p={6} textAlign="center">
            <FiClock size={48} color={theme.palette.text.disabled} />
            <Typography variant="h6" color="text.secondary" mt={2}>
              No notifications found
            </Typography>
            <Typography variant="body2" color="text.disabled">
              You're all caught up!
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredNotifications.map((notif, index) => {
              const isUnread = !notif.read_at;
              const palette = getColor(notif.type);
              
              return (
                <React.Fragment key={notif.id}>
                  <ListItem
                    alignItems="flex-start"
                    onClick={() => handleNavigateToEntity(notif)}
                    sx={{ 
                      p: 2.5, 
                      bgcolor: isUnread ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) },
                      cursor: notif.complaint_id ? 'pointer' : 'default'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: alpha(palette.main, 0.1), 
                          color: palette.main 
                        }}
                      >
                        {getIcon(notif.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight={isUnread ? 700 : 500} color={isUnread ? 'text.primary' : 'text.secondary'}>
                              {notif.title}
                            </Typography>
                            {notif.is_urgent && (
                              <Chip label="URGENT" size="small" color="error" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                            )}
                          </Box>
                          {isUnread && (
                            <Box 
                              sx={{ 
                                width: 10, height: 10, borderRadius: '50%', 
                                bgcolor: 'primary.main', flexShrink: 0, mt: 0.8
                              }} 
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box mt={0.5}>
                          <Typography
                            variant="body2"
                            color="text.primary"
                            sx={{ display: 'block', mb: 1, opacity: isUnread ? 1 : 0.85 }}
                          >
                            {notif.body}
                          </Typography>
                          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <FiClock size={12} />
                              {notif.created_at ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }) : ''}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                              {notif.complaint_id && (
                                <Button 
                                  size="small" 
                                  variant="outlined"
                                  endIcon={<FiArrowRight />}
                                  onClick={(e) => handleNavigateToEntity(notif, e)}
                                  sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2 }}
                                >
                                  View Details
                                </Button>
                              )}
                              {isUnread && (
                                <Button 
                                  size="small" 
                                  onClick={(e) => handleMarkAsRead(notif.id, e)}
                                  sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2 }}
                                >
                                  Mark read
                                </Button>
                              )}
                            </Stack>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < filteredNotifications.length - 1 && (
                    <Divider component="li" />
                  )}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Card>
    </Box>
  );
}
