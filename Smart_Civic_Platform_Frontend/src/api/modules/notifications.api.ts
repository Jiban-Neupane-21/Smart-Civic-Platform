import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';
import type { NotificationItem, NotificationFilter } from '../types';

export const notificationsApi = {
  /**
   * Get notifications for authenticated user
   */
  getNotifications: async (params?: NotificationFilter): Promise<PaginatedResponse<NotificationItem>> => {
    const response = await apiClient.get<PaginatedResponse<NotificationItem>>('/notifications', { params });
    return response.data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return response.data;
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (id: string): Promise<ApiResponse<NotificationItem>> => {
    const response = await apiClient.patch<ApiResponse<NotificationItem>>(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/notifications/read-all');
    return response.data;
  },
};

export default notificationsApi;
