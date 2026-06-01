export interface DashboardSummary {
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  activeIncidentsReported: number;
  unreadNotifications: number;
}

export interface ListItem {
  id: string;
  title: string;
  status?: 'pending' | 'in_progress' | 'resolved' | 'closed' | 'open';
  message?: string;
  is_read?: boolean;
  created_at: string;
}

export interface CitizenDashboardData {
  summary: DashboardSummary;
  recentComplaints: ListItem[];
  recentIncidents: ListItem[];
  recentNotifications: ListItem[];
}