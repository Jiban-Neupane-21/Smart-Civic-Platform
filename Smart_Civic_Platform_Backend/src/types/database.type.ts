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
export type ComplaintStatus = "pending" | "ongoing" | "resolved" | "rejected";
export type RecordType = "complaint" | "request" | "inquiry";
export type AssignmentStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";
export type Priority = "low" | "medium" | "high" | "urgent";

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
export type NotificationAudience =
  | "all_departments"
  | "all_staff"
  | "particular_department"
  | "particular_staff"
  | "department_internal_staff";
export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "ROLE_CHANGE";
export type Severity = "info" | "warning" | "critical";
export type MediaContext =
  | "complaint"
  | "assignment_proof"
  | "announcement"
  | "profile_picture";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type NotificationPref = "email" | "sms" | "both" | "none";

type Address = {
  country: string;
  state: string;
  street: string;
  ward_no: string;
};
export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  account_status: AccountStatus;
  force_password_reset: boolean;
  created_at: string;
  updated_at: string;
}

export interface MunicipalityRow {
  m_uid: string;
  official_name: string;
  official_email: string;
  head_name: string;
  head_email: string;
  head_profile_id: string | null;
  official_contact_no: string | null;
  head_contact_no: string | null;
  province: string | null;
  district: string | null;
  municipality_type: string | null;
  total_wards: number;
  official_logo: string | null;
  about_description: string | null;
  mayor_chairperson_name: string | null;
  deputy_mayor_vice_chairperson_name: string | null;
  is_active: boolean;
  registered_at: string;
  updated_at: string;
}

export interface DepartmentRow {
  d_uid: string;
  municipality_id: string;
  department_name: string;
  official_email: string;
  head_name: string;
  head_email: string;
  head_profile_id: string | null;
  department_logo: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffRow {
  s_uid: string;
  profile_id: string;
  municipality_id: string;
  primary_department_id: string;
  employee_id: string;
  expertise: string;
  contact_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  personal_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface CitizenRow {
  profile_id: string;
  current_address: string;
  permanent_address: string;
  contact_number: string;
  citizenship_id: string;
  gender: string;
  date_of_birth: string;
  profile_picture: string | null;
  registered_at: string;
  updated_at: string;
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
  category_id: string;
  assigned_department_id: string | null;
  title: string;
  description: string;
  attachment_url: string | null;
  status: ComplaintStatus;
  rejection_reason: string | null;
  resolution_note: string | null;
  submitted_date: string;
  resolution_date: string | null;
  updated_at: string;
}

export interface ComplaintCategoryRow {
  category_id: string;
  category_name: string;
  target_department_name: string;
  created_at: string;
}

export interface TeamRow {
  team_id: string;
  department_id: string;
  complaint_id: string;
  team_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberRow {
  tm_id: string;
  team_id: string;
  staff_id: string;
  is_leader: boolean;
  joined_at: string;
}

export interface NotificationRow {
  n_uid: string;
  sender_profile_id: string;
  audience_type: NotificationAudience;
  target_municipality_id: string | null;
  target_department_id: string | null;
  target_staff_profile_id: string | null;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
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
  action_by_role: UserRole;
  target_user_id: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  severity: Severity;
  created_at: string;
}

export type ProfileInsert = Pick<ProfileRow, "id" | "full_name" | "email"> &
  Partial<Omit<ProfileRow, "id" | "full_name" | "email">>;
export type CitizenInsert = Pick<
  CitizenRow,
  | "profile_id"
  | "current_address"
  | "permanent_address"
  | "contact_number"
  | "citizenship_id"
  | "gender"
  | "date_of_birth"
> &
  Partial<
    Omit<
      CitizenRow,
      | "profile_id"
      | "current_address"
      | "permanent_address"
      | "contact_number"
      | "citizenship_id"
      | "gender"
      | "date_of_birth"
    >
  >;
export type StaffInsert = Pick<
  StaffRow,
  | "profile_id"
  | "municipality_id"
  | "primary_department_id"
  | "employee_id"
  | "expertise"
> &
  Partial<
    Omit<
      StaffRow,
      | "s_uid"
      | "profile_id"
      | "municipality_id"
      | "primary_department_id"
      | "employee_id"
      | "expertise"
    >
  >;
export type MunicipalityInsert = Pick<
  MunicipalityRow,
  "official_name" | "official_email" | "head_name" | "head_email"
> &
  Partial<
    Omit<
      MunicipalityRow,
      "m_uid" | "official_name" | "official_email" | "head_name" | "head_email"
    >
  >;
export type DepartmentInsert = Pick<
  DepartmentRow,
  | "municipality_id"
  | "department_name"
  | "official_email"
  | "head_name"
  | "head_email"
> &
  Partial<
    Omit<
      DepartmentRow,
      | "d_uid"
      | "municipality_id"
      | "department_name"
      | "official_email"
      | "head_name"
      | "head_email"
    >
  >;

export type RefreshTokenInsert = Pick<
  RefreshTokenRow,
  "profile_id" | "token_hash" | "expires_at"
> &
  Partial<Omit<RefreshTokenRow, "rt_uid">>;
export type ProfileUpdate = Partial<
  Omit<ProfileRow, "id" | "created_at" | "email">
>;
export type StaffUpdate = Partial<Omit<StaffRow, "s_uid" | "created_at">>;
export type MunicipalityUpdate = Partial<
  Omit<MunicipalityRow, "m_uid" | "registered_at">
>;
export type DepartmentUpdate = Partial<
  Omit<DepartmentRow, "d_uid" | "created_at">
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
        Update: MunicipalityUpdate;
        Relationships: [];
      };
      departments: {
        Row: DepartmentRow;
        Insert: DepartmentInsert;
        Update: DepartmentUpdate;
        Relationships: [];
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
        Update: Partial<Omit<CitizenRow, "profile_id" | "registered_at">>;
        Relationships: [];
      };
      teams: {
        Row: TeamRow;
        Insert: Partial<TeamRow> &
        Pick<TeamRow, "department_id" | "complaint_id" | "team_name">;
        Update: Partial<Omit<TeamRow, "team_id" | "created_at">>;
        Relationships: [];
      };
      team_members: {
        Row: TeamMemberRow;
        Insert: Partial<TeamMemberRow> &
        Pick<TeamMemberRow, "team_id" | "staff_id">;
        Update: Partial<Omit<TeamMemberRow, "tm_id" | "joined_at">>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Partial<NotificationRow> &
        Pick<
          NotificationRow,
          "sender_profile_id" | "audience_type" | "title" | "body"
        >;
        Update: Partial<Omit<NotificationRow, "n_uid" | "created_at">>;
        Relationships: [];
      };

      refresh_tokens: {
        Row: RefreshTokenRow;
        Insert: RefreshTokenInsert;
        Update: Partial<Omit<RefreshTokenRow, "rt_uid">>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, "al_uid" | "created_at">;
        Update: never;
        Relationships: [];
      };
      complaints: {
        Row: ComplaintRow;
        Insert: Partial<ComplaintRow> &
        Pick<
          ComplaintRow,
          | "citizen_id"
          | "municipality_id"
          | "category_id"
          | "title"
          | "description"
        >;
        Update: Partial<Omit<ComplaintRow, "co_uid" | "submitted_date">>;
        Relationships: [];
      };
      complaint_categories: {
        Row: ComplaintCategoryRow;
        Insert: Partial<ComplaintCategoryRow> &
        Pick<
          ComplaintCategoryRow,
          "category_name" | "target_department_name"
        >;
        Update: Partial<
          Omit<ComplaintCategoryRow, "category_id" | "created_at">
        >;
        Relationships: [];
      };
      announcements: {
        Row: AnnouncementRow;
        Insert: Partial<AnnouncementRow> &
        Pick<
          AnnouncementRow,
          "municipality_id" | "created_by" | "title" | "body" | "audience"
        >;
        Update: Partial<Omit<AnnouncementRow, "ann_uid" | "created_at">>;
        Relationships: [];
      };
      feedback: {
        Row: FeedbackRow;
        Insert: Partial<FeedbackRow> &
        Pick<FeedbackRow, "complaint_id" | "citizen_id" | "rating">;
        Update: Partial<Omit<FeedbackRow, "f_uid" | "created_at">>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_set_user_role: {
        Args: {
          target_user_id: string;
          new_role: UserRole;
        };
        Returns: void;
      };
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

      budget_status: BudgetStatus;
      transaction_type: TransactionType;
      payment_type: PaymentType;
      transaction_status: TransactionStatus;
      broadcast_type: BroadcastType;
      department_type: DepartmentType;
      announcement_audience: AnnouncementAudience;
      notification_audience: NotificationAudience;
      audit_action: AuditAction;
      severity: Severity;
      media_context: MediaContext;
      gender: Gender;
      notification_pref: NotificationPref;
    };
  };
}
