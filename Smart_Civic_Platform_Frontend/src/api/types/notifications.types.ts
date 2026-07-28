export type NotificationType = 
  | 'complaint_update' 
  | 'assignment' 
  | 'system_announcement' 
  | 'onboarding_reminder' 
  | 'general';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedEntityId?: string;
  relatedEntityType?: 'complaint' | 'department' | 'user';
  createdAt: string;
}

export interface NotificationFilter {
  isRead?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}
