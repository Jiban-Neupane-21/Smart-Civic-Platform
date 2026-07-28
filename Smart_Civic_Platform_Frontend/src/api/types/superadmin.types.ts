export interface SuperadminStats {
  total_municipalities: number;
  total_departments: number;
  total_staff: number;
  total_citizens: number;
  total_active_users: number;
  total_suspended_users: number;
  total_pending_complaints: number;
  total_resolved_complaints: number;
}

export interface ProvinceRow {
  id: string;
  name: string;
  capital: string;
  created_at: string;
}

export interface DistrictRow {
  id: string;
  province_id: string;
  name: string;
  created_at: string;
}

export interface MunicipalityReference {
  id: string;
  official_name: string;
  local_level_type: string;
  total_wards: number;
  district_id: string;
  is_active: boolean;
  official_email?: string;
  official_contact_no?: string;
  mayor_chairperson_name?: string;
  deputy_mayor_vice_chairperson_name?: string;
  about_description?: string;
}

export interface MunicipalityDetail {
  id: string;
  district_id: string;
  official_name: string;
  local_level_type: string;
  total_wards: number;
  is_active: boolean;
  head_name: string;
  head_email: string;
  district_name: string;
  province_name: string;
  official_email?: string;
  official_contact_no?: string;
  mayor_chairperson_name?: string;
  deputy_mayor_vice_chairperson_name?: string;
  about_description?: string;
  registered_at?: string;
  created_at?: string;
  updated_at?: string;
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

export interface ProvisionRequest {
  municipality_id: string;
  head_name: string;
  head_email: string;
  head_password?: string;
}

export interface ProvisionResponse {
  municipality_id: string;
  official_name: string;
  head_email: string;
  head_password: string;
  local_level_type: string;
  total_wards: number;
}

export interface RoleAssignRequest {
  targetUserId: string;
  newRole: string;
}

export interface StatusManageRequest {
  targetUserId: string;
  status: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: string;
  municipality_id: string;
  department_id?: string;
  phone?: string;
}

export interface AuditLogEntry {
  id: string;
  // DB column is "action" (enum: LOGIN, LOGOUT, INSERT, UPDATE, DELETE, STATUS_CHANGE, ROLE_CHANGE, ASSIGN, EXPORT)
  action: string;
  action_by: string;                     // UUID of actor
  action_by_name?: string;               // joined: profiles.full_name
  action_by_email?: string;              // joined: profiles.email
  action_by_role: string;
  municipality_id?: string;              // UUID
  municipality_name?: string;            // joined: municipalities.official_name
  target_user_id?: string;               // UUID
  target_user_name?: string;             // joined: profiles.full_name
  target_user_email?: string;            // joined: profiles.email
  table_name: string;                    // which table was affected
  record_id: string;                     // PK of affected record
  old_value?: Record<string, unknown>;   // JSONB — previous state
  new_value?: Record<string, unknown>;   // JSONB — new state
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

export interface MunicipalityJoined {
  id: string;
  official_name: string;
  district_name: string;
  province_name: string;
  local_level_type: string;
  is_active: boolean;
  head_name: string;
  head_email: string;
  official_email?: string;
  official_contact_no?: string;
  mayor_chairperson_name?: string;
  deputy_mayor_vice_chairperson_name?: string;
  about_description?: string;
  head_contact_no?: string;
  total_wards?: number;
  province_id?: string;
  district_id?: string;
  registered_at?: string;
}

export interface SuperadminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  account_status: string;
  municipality_id?: string;
  municipality_name?: string;
  department_id?: string;
  created_at?: string;
  force_password_reset?: boolean;
}

export interface FeatureFlag {
  id: string;
  key: string;
  description?: string;
  is_enabled: boolean;
  allowed_roles?: string[];
  updated_at: string;
}
