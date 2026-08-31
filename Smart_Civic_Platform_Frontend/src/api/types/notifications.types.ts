export type NotificationType =
  | 'system'
  | 'broadcast'
  | 'sla_warning'
  | 'sla_escalation'
  | 'handoff'
  | 'assignment'
  | 'complaint_update';

export interface NotificationRow {
  id: string;
  sender_id: string | null;
  audience: 'individual' | 'team' | 'department' | 'all_staff' | 'all_citizens' | 'everyone';
  target_profile_id?: string | null;
  target_team_id?: string | null;
  target_department_id?: string | null;
  title: string;
  body: string;
  type: NotificationType;
  channel: string[];            // in_app | push | sms | email
  is_urgent: boolean;
  complaint_id?: string | null;
  ward_id?: string | null;
  created_at: string;
  sent_at?: string | null;
  read_at?: string | null;
}

export interface NotificationFilter {
  type?: NotificationType;
  is_read?: boolean | null;
  page?: number;
  limit?: number;
}
