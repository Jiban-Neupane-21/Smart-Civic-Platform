import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, List, ListItem, ListItemAvatar, 
  ListItemText, Avatar, Divider, Button, Tabs, Tab, 
  CircularProgress, alpha, useTheme 
} from '@mui/material';
import { 
  FiCheckCircle, FiAlertCircle, FiInfo, FiClock, FiCheck
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationPolling } from '../../hooks/useNotificationPolling';
import type { NotificationType } from '../../api/types';
import notificationsApi from '../../api/modules/notifications.api';

export function NotificationInbox() {
  const theme = useTheme();
  const { unreadCount, markAllAsRead, refresh } = useNotificationPolling();
  const [tab, setTab] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab indices: 0 = All, 1 = Unread, 2 = System, 3 = Broadcast, 4 = Alerts
  
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getNotifications({ limit: 50 });
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
  }, [unreadCount]); // Reload when unread count changes globally (via polling)

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
      refresh(); // Refresh polling hook globally
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    loadNotifications();
  };

  const filteredNotifications = notifications.filter(n => {
    if (tab === 1) return !n.read_at;
    if (tab === 2) return n.type === 'system';
    if (tab === 3) return n.type === 'broadcast';
    if (tab === 4) return n.type === 'sla_warning' || n.type === 'sla_escalation';
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
        <Typography variant="h4" fontWeight="bold">
          Notifications
        </Typography>
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
          <Tab label="System" />
          <Tab label="Broadcast" />
          <Tab label="Alerts" />
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
                    sx={{ 
                      p: 2.5, 
                      bgcolor: isUnread ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) },
                      cursor: 'pointer'
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
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="subtitle1" fontWeight={isUnread ? 700 : 500} color={isUnread ? 'text.primary' : 'text.secondary'}>
                            {notif.title}
                          </Typography>
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
                            sx={{ display: 'block', mb: 1, opacity: isUnread ? 1 : 0.8 }}
                          >
                            {notif.body}
                          </Typography>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <FiClock size={12} />
                              {notif.created_at ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }) : ''}
                            </Typography>
                            {isUnread && (
                              <Button 
                                size="small" 
                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0 }}
                              >
                                Mark read
                              </Button>
                            )}
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
