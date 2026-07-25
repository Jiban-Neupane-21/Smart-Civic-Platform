/**
 * Types aligned with Supabase_Schema.sql
 */

export type UserRole =
  | "superadmin"
  | "municipality_head"
  | "department_head"
  | "staff"
  | "citizen";

export type AccountStatus = "active" | "inactive" | "suspended";
export type EmployeeStatus = "active" | "inactive" | "suspended" | "terminated";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type NotificationPref = "email" | "sms" | "both" | "none";
export type LocalLevelType =
  | "metropolitan_city"
  | "sub_metropolitan_city"
  | "municipality"
  | "rural_municipality";
export type DepartmentCategory =
  | "water_supply"
  | "electricity"
  | "road_transport"
  | "sanitation"
  | "health"
  | "education"
  | "public_works"
  | "revenue_tax"
  | "agriculture"
  | "disaster_management"
  | "administration"
  | "other";
export type RecordType = "complaint" | "request" | "inquiry";
export type ComplaintStatus =
  | "pending"
  | "under_review"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "closed";
export type AssignmentStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "reassigned";
export type Priority = "low" | "medium" | "high" | "urgent";
export type AudienceScope =
  | "individual"
  | "team"
  | "department"
  | "all_staff"
  | "all_citizens"
  | "everyone";
export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "ROLE_CHANGE"
  | "ASSIGN"
  | "EXPORT";
export type Severity = "info" | "warning" | "critical";
export type MediaContext = "complaint" | "assignment_proof" | "announcement";

export interface ProvinceRow {
  id: string;
  name: string;
  capital: string | null;
  created_at: string;
}

export interface DistrictRow {
  id: string;
  province_id: string;
  name: string;
  created_at: string;
}

export interface MunicipalityRow {
  id: string;
  district_id: string;
  official_name: string;
  official_email: string;
  official_contact_no: string | null;
  local_level_type: LocalLevelType;
  total_wards: number;
  official_logo: string | null;
  about_description: string | null;
  mayor_chairperson_name: string | null;
  deputy_mayor_vice_chairperson_name: string | null;
  head_profile_id: string | null;
  head_name: string | null;
  head_email: string | null;
  head_contact_no: string | null;
  is_active: boolean;
  registered_at: string;
  updated_at: string;
}

export interface WardRow {
  id: string;
  municipality_id: string;
  ward_no: number;
  ward_office_name: string | null;
  ward_chairperson_name: string | null;
  contact_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentRow {
  id: string;
  municipality_id: string;
  department_name: string;
  department_category: DepartmentCategory;
  official_email: string;
  department_logo: string | null;
  head_profile_id: string | null;
  head_name: string | null;
  head_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  account_status: AccountStatus;
  municipality_id: string | null;
  department_id: string | null;
  force_password_reset: boolean;
  created_by: string | null;
  last_login_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffRow {
  id: string;
  profile_id: string;
  municipality_id: string;
  primary_department_id: string;
  employee_id: string | null;
  expertise: string | null;
  contact_number: string | null;
  gender: Gender | null;
  date_of_birth: string | null;
  personal_address: string | null;
  onboarded_at: string | null;
  employee_status: EmployeeStatus;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CitizenRow {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  citizenship_id: string | null;
  gender: Gender | null;
  date_of_birth: string | null;
  profile_picture: string | null;
  current_address: string | null;
  permanent_address: string | null;
  ward_id: string | null;
  contact_number: string | null;
  notification_pref: NotificationPref;
  registered_at: string;
  updated_at: string;
}

export interface ComplaintCategoryRow {
  id: string;
  category_name: string;
  department_category: DepartmentCategory;
  default_priority: Priority;
  default_sla_hours: number;
  created_at: string;
}

export interface ComplaintRow {
  co_uid: string;
  citizen_id: string;
  municipality_id: string;
  category_id: string;
  assigned_department_id: string | null;
  ticket_type: RecordType;
  title: string;
  description: string;
  priority: Priority;
  status: ComplaintStatus;
  rejection_reason: string | null;
  resolution_note: string | null;
  sla_due_at: string | null;
  submitted_date: string;
  resolution_date: string | null;
  updated_at: string;
}

export interface MediaRow {
  id: string;
  context: MediaContext;
  context_id: string;
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface TeamRow {
  id: string;
  department_id: string;
  team_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  staff_id: string;
  is_leader: boolean;
  joined_at: string;
}

export interface ComplaintAssignmentRow {
  id: string;
  complaint_id: string;
  team_id: string | null;
  staff_id: string | null;
  assigned_by: string;
  status: AssignmentStatus;
  is_current: boolean;
  notes: string | null;
  assigned_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintUpdateRow {
  id: string;
  complaint_id: string;
  author_id: string;
  note: string;
  is_internal: boolean;
  created_at: string;
}

export interface FeedbackRow {
  id: string;
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

export interface AnnouncementRow {
  id: string;
  municipality_id: string;
  department_id: string | null;
  team_id: string | null;
  created_by: string;
  title: string;
  body: string;
  audience: AudienceScope;
  is_pinned: boolean;
  published_at: string | null;
  expires_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  sender_id: string;
  audience: AudienceScope;
  target_municipality_id: string | null;
  target_department_id: string | null;
  target_team_id: string | null;
  target_profile_id: string | null;
  title: string;
  body: string;
  created_at: string;
}

export interface NotificationReadRow {
  id: string;
  notification_id: string;
  profile_id: string;
  read_at: string;
}

export interface SystemSettingRow {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  action_by: string | null;
  action_by_role: UserRole;
  municipality_id: string | null;
  target_user_id: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  severity: Severity;
  created_at: string;
}

export interface RefreshTokenRow {
  id: string;
  profile_id: string;
  token_hash: string;
  issued_at: string;
  expires_at: string;
  is_revoked: boolean;
  revoked_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

// ------------------------------------------------------------------
// Inferred Insert/Update Types
// ------------------------------------------------------------------

export type ProfileInsert = Pick<ProfileRow, "id" | "full_name" | "email"> &
  Partial<Omit<ProfileRow, "id" | "full_name" | "email">>;
export type CitizenInsert = Pick<CitizenRow, "id"> & Partial<Omit<CitizenRow, "id">>;
export type StaffInsert = Pick<
  StaffRow,
  "profile_id" | "municipality_id" | "primary_department_id"
> &
  Partial<Omit<StaffRow, "id" | "profile_id" | "municipality_id" | "primary_department_id">>;
export type MunicipalityInsert = Pick<
  MunicipalityRow,
  "district_id" | "official_name" | "official_email"
> &
  Partial<
    Omit<
      MunicipalityRow,
      "id" | "district_id" | "official_name" | "official_email"
    >
  >;
export type DepartmentInsert = Pick<
  DepartmentRow,
  "municipality_id" | "department_name" | "official_email"
> &
  Partial<
    Omit<
      DepartmentRow,
      "id" | "municipality_id" | "department_name" | "official_email"
    >
  >;

export type RefreshTokenInsert = Pick<
  RefreshTokenRow,
  "profile_id" | "token_hash" | "expires_at"
> &
  Partial<Omit<RefreshTokenRow, "id">>;
export type ProfileUpdate = Partial<Omit<ProfileRow, "id" | "created_at" | "email">>;
export type StaffUpdate = Partial<Omit<StaffRow, "id" | "created_at">>;
export type MunicipalityUpdate = Partial<Omit<MunicipalityRow, "id" | "registered_at">>;
export type DepartmentUpdate = Partial<Omit<DepartmentRow, "id" | "created_at">>;

// ------------------------------------------------------------------
// Main Database Map
// ------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      provinces: {
        Row: ProvinceRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      districts: {
        Row: DistrictRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      municipalities: {
        Row: MunicipalityRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      wards: {
        Row: WardRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      departments: {
        Row: DepartmentRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      profiles: {
        Row: ProfileRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      staff: {
        Row: StaffRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      citizens: {
        Row: CitizenRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      complaint_categories: {
        Row: ComplaintCategoryRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      complaints: {
        Row: ComplaintRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      media: {
        Row: MediaRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      teams: {
        Row: TeamRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      team_members: {
        Row: TeamMemberRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      complaint_assignments: {
        Row: ComplaintAssignmentRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      complaint_updates: {
        Row: ComplaintUpdateRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      feedback: {
        Row: FeedbackRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      announcements: {
        Row: AnnouncementRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      notifications: {
        Row: NotificationRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      notification_reads: {
        Row: NotificationReadRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      system_settings: {
        Row: SystemSettingRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
      refresh_tokens: {
        Row: RefreshTokenRow;
        Insert: any;
        Update: any;
        Relationships: any[];
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
      gender: Gender;
      notification_pref: NotificationPref;
      local_level_type: LocalLevelType;
      department_category: DepartmentCategory;
      record_type: RecordType;
      complaint_status: ComplaintStatus;
      assignment_status: AssignmentStatus;
      priority: Priority;
      audience_scope: AudienceScope;
      audit_action: AuditAction;
      severity: Severity;
      media_context: MediaContext;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

