/**
 * Types aligned with smart_civic_platform.sql
 */

export type UserRole =
  | "superadmin"
  | "municipality_head"
  | "department_head"
  | "staff"
  | "citizen";

export type AccountStatus = "active" | "inactive" | "suspended";
export type EmployeeStatus = "active" | "inactive" | "suspended" | "terminated";
export type TeamRole = "assistant_head" | "member";
export type ComplaintStatus =
  | "pending"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "reopened";
export type RecordType = "complaint" | "request" | "inquiry";
export type AssignmentStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";
export type Priority = "low" | "medium" | "high" | "urgent";
export type VehicleStatus = "available" | "in_use" | "maintenance" | "retired";
export type RouteStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";
export type StopStatus = "pending" | "arrived" | "completed" | "skipped";
export type BudgetStatus =
  | "draft"
  | "proposed"
  | "approved"
  | "rejected"
  | "closed";
export type TransactionType =
  | "purchase"
  | "payment"
  | "refund"
  | "salary"
  | "misc";
export type PaymentType = "online" | "cash" | "cheque";
export type TransactionStatus = "pending" | "successful" | "failed";
export type BroadcastType =
  | "individual"
  | "department"
  | "municipality"
  | "all"
  | "team";
export type DepartmentType =
  | "electricity"
  | "water"
  | "road"
  | "plumbing"
  | "health"
  | "education"
  | "public_works";
export type AnnouncementAudience =
  | "all"
  | "citizen"
  | "staff"
  | "all_staff"
  | "all_citizen"
  | "all_department"
  | "department"
  | "all_team"
  | "team";
export type AuditAction =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "ASSIGN"
  | "REASSIGN"
  | "STATUS_CHANGE"
  | "APPROVE"
  | "REJECT"
  | "EXPORT"
  | "INVITE"
  | "PASSWORD_RESET";
export type Severity = "info" | "warning" | "critical";
export type MediaContext =
  | "complaint"
  | "assignment_proof"
  | "route_stop_proof"
  | "announcement"
  | "profile_picture";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type NotificationPref = "email" | "sms" | "both" | "none";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

type Address = {
  "country": String,
  "state": string,
  "street": string,
  "ward_no": string,

}
export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  full_address: Address;
  role: UserRole;
  account_status: AccountStatus;
  municipality_id: string | null;
  department_id: string | null;
  profile_picture: string | null;
  last_login_at: string | null;
  force_password_reset: boolean;
  invited_by: string | null;
  email_verified_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MunicipalityRow {
  m_uid: string;
  official_name: string;
  slug: string | null;
  boundary: unknown | null;
  region_state: string | null;
  country_code: string;
  time_zone: string;
  office_address: string | null;
  login_email: string;
  support_email: string | null;
  emergency_contact: string | null;
  website_url: string | null;
  head_id: string | null;
  login_domain: string | null;
  registration_code: string | null;
  is_active: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentRow {
  d_uid: string;
  municipality_id: string;
  dept_name: string;
  department_type: DepartmentType | null;
  head_id: string | null;
  dept_contact: string | null;
  dept_email: string | null;
  operating_budget: number | null;
  is_active: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffRow {
  s_uid: string;
  profile_id: string;
  municipality_id: string | null;
  department_id: string | null;
  employee_id: string | null;
  staff_role: UserRole;
  shift_start: string | null;
  shift_end: string | null;
  employee_status: EmployeeStatus;
  joined_date: string | null;
  invited_at: string | null;
  onboarded_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CitizenRow {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string | null;
  gender: Gender | null;
  home_address: Address | null;
  permanent_address: Address | null;
  notification_pref: NotificationPref;
  last_active_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffInvitationRow {
  inv_uid: string;
  token_hash: string;
  target_email: string;
  target_role: UserRole;
  municipality_id: string;
  department_id: string | null;
  invited_by: string;
  status: InviteStatus;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface RefreshTokenRow {
  rt_uid: string;
  profile_id: string;
  token_hash: string;
  issued_at: string;
  expires_at: string;
  is_revoked: boolean;
  revoked_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface ComplaintRow {
  co_uid: string;
  citizen_id: string;
  municipality_id: string;
  department_id: string | null;
  category_id: string | null;
  record_type: RecordType;
  priority: Priority;
  title: string;
  description: string | null;
  status: ComplaintStatus;
  resolved_at: string | null;
  resolution_note: string | null;
  latitude: number | null;
  longitude: number | null;
  address_hint: string | null;
  reported_at: string;
  is_anonymous: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  updated_at: string;
}

export interface ComplaintCategoryRow {
  category_id: string;
  municipality_id: string | null;
  name: string;
  description: string | null;
  icon_name: string | null;
  color_hex: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementRow {
  ann_uid: string;
  municipality_id: string;
  department_id: string | null;
  created_by: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  target_department_id: string | null;
  target_team_id: string | null;
  is_pinned: boolean;
  published_at: string | null;
  expires_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackRow {
  f_uid: string;
  complaint_id: string;
  citizen_id: string;
  team_id: string | null;
  staff_id: string | null;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  al_uid: string;
  action_by: string | null;
  action_role: UserRole;
  municipality_id: string | null;
  department_id: string | null;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  severity: Severity;
  note: string | null;
  created_at: string;
}

export type ProfileInsert = Pick<ProfileRow, "id" | "full_name" | "email"> &
  Partial<Omit<ProfileRow, "id" | "full_name" | "email">>;
export type CitizenInsert = Pick<CitizenRow, "id" | "first_name" | "last_name"> &
  Partial<Omit<CitizenRow, "id" | "first_name" | "last_name">>;
export type StaffInsert = Pick<StaffRow, "profile_id" | "staff_role"> &
  Partial<Omit<StaffRow, "s_uid" | "profile_id" | "staff_role">>;
export type MunicipalityInsert = Pick<
  MunicipalityRow,
  "official_name" | "login_email" | "country_code" | "time_zone"
> &
  Partial<Omit<MunicipalityRow, "m_uid" | "official_name" | "login_email">>;
export type DepartmentInsert = Pick<DepartmentRow, "municipality_id" | "dept_name"> &
  Partial<Omit<DepartmentRow, "d_uid" | "municipality_id" | "dept_name">>;
export type StaffInvitationInsert = Pick<
  StaffInvitationRow,
  "token_hash" | "target_email" | "target_role" | "municipality_id" | "invited_by"
> &
  Partial<Omit<StaffInvitationRow, "inv_uid">>;
export type RefreshTokenInsert = Pick<
  RefreshTokenRow,
  "profile_id" | "token_hash" | "expires_at"
> &
  Partial<Omit<RefreshTokenRow, "rt_uid">>;
export type ProfileUpdate = Partial<Omit<ProfileRow, "id" | "created_at" | "email">>;
export type StaffUpdate = Partial<Omit<StaffRow, "s_uid" | "created_at">>;
export type MunicipalityUpdate = Partial<Omit<MunicipalityRow, "m_uid" | "created_at">>;
export type DepartmentUpdate = Partial<Omit<DepartmentRow, "d_uid" | "created_at">>;
export type StaffInvitationUpdate = Partial<
  Omit<StaffInvitationRow, "inv_uid" | "created_at" | "token_hash">
>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      municipalities: {
        Row: MunicipalityRow;
        Insert: MunicipalityInsert;
        Update: MunicipalityUpdate; Relationships: []
      };
      departments: {
        Row: DepartmentRow;
        Insert: DepartmentInsert;
        Update: DepartmentUpdate; Relationships: []
      };
      staff: {
        Row: StaffRow;
        Insert: StaffInsert;
        Update: StaffUpdate;
        Relationships: [];
      };
      citizens: {
        Row: CitizenRow;
        Insert: CitizenInsert;
        Update: Partial<Omit<CitizenRow, "id" | "created_at">>; Relationships: []
      };
      staff_invitations: {
        Row: StaffInvitationRow;
        Insert: StaffInvitationInsert;
        Update: StaffInvitationUpdate; Relationships: []
      };
      refresh_tokens: {
        Row: RefreshTokenRow;
        Insert: RefreshTokenInsert;
        Update: Partial<Omit<RefreshTokenRow, "rt_uid">>; Relationships: []
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, "al_uid" | "created_at">;
        Update: never; Relationships: []
      };
      complaints: {
        Row: ComplaintRow;
        Insert: Partial<ComplaintRow> &
        Pick<ComplaintRow, "citizen_id" | "municipality_id" | "title">;
        Update: Partial<Omit<ComplaintRow, "co_uid" | "reported_at">>; Relationships: []
      };
      complaint_categories: {
        Row: ComplaintCategoryRow;
        Insert: Partial<ComplaintCategoryRow> & Pick<ComplaintCategoryRow, "name">;
        Update: Partial<Omit<ComplaintCategoryRow, "category_id" | "created_at">>; Relationships: []
      };
      announcements: {
        Row: AnnouncementRow;
        Insert: Partial<AnnouncementRow> &
        Pick<
          AnnouncementRow,
          "municipality_id" | "created_by" | "title" | "body" | "audience"
        >;
        Update: Partial<Omit<AnnouncementRow, "ann_uid" | "created_at">>; Relationships: []
      };
      feedback: {
        Row: FeedbackRow;
        Insert: Partial<FeedbackRow> &
        Pick<FeedbackRow, "complaint_id" | "citizen_id" | "rating">;
        Update: Partial<Omit<FeedbackRow, "f_uid" | "created_at">>; Relationships: []
      };
    };
    Views: {
      v_complaints: { Row: Record<string, unknown>; Relationships: [] };
      v_budget_utilisation: { Row: Record<string, unknown>; Relationships: [] };
      v_team_workload: { Row: Record<string, unknown>; Relationships: [] };
      v_sla_breaches: { Row: Record<string, unknown>; Relationships: [] };
      v_pending_invitations: { Row: Record<string, unknown>; Relationships: [] };
    };
    Functions: {
      auth_role: { Args: Record<never, never>; Returns: UserRole };
      auth_municipality_id: { Args: Record<never, never>; Returns: string };
      auth_department_id: { Args: Record<never, never>; Returns: string };
      expire_stale_invitations: { Args: Record<never, never>; Returns: void };
    };
    Enums: {
      user_role: UserRole;
      account_status: AccountStatus;
      employee_status: EmployeeStatus;
      team_role: TeamRole;
      complaint_status: ComplaintStatus;
      record_type: RecordType;
      assignment_status: AssignmentStatus;
      priority: Priority;
      vehicle_status: VehicleStatus;
      route_status: RouteStatus;
      stop_status: StopStatus;
      budget_status: BudgetStatus;
      transaction_type: TransactionType;
      payment_type: PaymentType;
      transaction_status: TransactionStatus;
      broadcast_type: BroadcastType;
      department_type: DepartmentType;
      announcement_audience: AnnouncementAudience;
      audit_action: AuditAction;
      severity: Severity;
      media_context: MediaContext;
      gender: Gender;
      notification_pref: NotificationPref;
    };
  };
}
