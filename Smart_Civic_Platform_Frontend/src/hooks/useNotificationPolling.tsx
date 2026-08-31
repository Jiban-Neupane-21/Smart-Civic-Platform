import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import notificationsApi from '../api/modules/notifications.api';
import type { NotificationRow } from '../api/types';

export interface NotificationContextType {
  unreadCount: number;
  notifications: NotificationRow[];
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode; intervalMs?: number }> = ({ 
  children, 
  intervalMs = 30000 
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Fetch both unread count and latest notifications
      const [countRes, notifsRes] = await Promise.all([
        notificationsApi.getUnreadCount(),
        notificationsApi.getNotifications({ limit: 10 })
      ]);
      
      if (countRes.success && countRes.data) {
        setUnreadCount(countRes.data.unread_count || 0);
      }
      
      if (notifsRes.success && notifsRes.data) {
        setNotifications(notifsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    refresh();

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchNotifications, intervalMs, refresh]);

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      // Update local state optimistically
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Refresh to get actual state
      refresh();
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      // Update local state optimistically
      setUnreadCount(0);
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      refresh();
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        loading,
        refresh,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotificationPolling(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationPolling must be used within a NotificationProvider');
  }
  return context;
}
