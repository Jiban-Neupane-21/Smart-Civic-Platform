export interface DashboardSummary {
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  activeIncidentsReported: number;
  unreadNotifications: number;
}

export interface ListItem {
  id: string;
  co_uid?: string;
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

export type DepartmentComplaintStatus =
  | "pending"
  | "under_review"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "closed";

export interface DepartmentRecentComplaint {
  co_uid: string;
  title: string;
  status: DepartmentComplaintStatus;
  priority: string;
  submitted_date: string;
  category_id: string;
}

export interface DepartmentDashboardData {
  department_name: string;
  totalComplaints: number;
  pending: number;
  under_review: number;
  in_progress: number;
  resolved: number;
  rejected: number;
  closed: number;
  resolutionRate: number;
  totalStaff: number;
  activeTeams: number;
  recentComplaints: DepartmentRecentComplaint[];
}