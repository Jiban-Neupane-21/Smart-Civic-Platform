import apiClient from '../client';
import type { ApiResponse } from '../types';
import type { NotificationRow, NotificationFilter } from '../types';

export const notificationsApi = {
  /**
   * Get notifications for authenticated user
   */
  getNotifications: async (params?: NotificationFilter): Promise<ApiResponse<NotificationRow[]>> => {
    const response = await apiClient.get<ApiResponse<NotificationRow[]>>('/notifications', { params });
    return response.data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<ApiResponse<{ unread_count: number }>> => {
    const response = await apiClient.get<ApiResponse<{ unread_count: number }>>('/notifications/unread-count');
    return response.data;
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    const response = await apiClient.patch<ApiResponse<{ success: boolean }>>(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<ApiResponse<void>> => {
    try {
      const response = await notificationsApi.getNotifications({ is_read: false });
      const notifications = response.data;
      if (notifications && Array.isArray(notifications)) {
        await Promise.all(notifications.map(n => notificationsApi.markAsRead(n.id)));
      }
      return { success: true, message: 'All marked as read', data: undefined };
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw error;
    }
  },
};

export default notificationsApi;
