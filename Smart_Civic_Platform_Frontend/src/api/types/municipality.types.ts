export interface Municipality {
  id: string;
  name: string;
  code: string;
  district: string;
  province: string;
  totalWards: number;
  contactEmail: string;
  contactPhone?: string;
  headName?: string;
  headEmail?: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface ProvisionMunicipalityDto {
  name: string;
  code: string;
  district: string;
  province: string;
  totalWards: number;
  contactEmail: string;
  contactPhone?: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword?: string;
}

export interface UpdateMunicipalityDto {
  name?: string;
  district?: string;
  province?: string;
  totalWards?: number;
  contactEmail?: string;
  contactPhone?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface MunicipalityStats {
  totalDepartments: number;
  totalStaff: number;
  totalCitizens: number;
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
}

export interface MunicipalityDashboardData {
  municipality_id?: string;
  official_name?: string;
  pending_count: number;
  ongoing_count: number;
  resolved_count: number;
  rejected_count: number;
  total_complaints: number;
  dynamic_resolution_rate: number;
}

// ===== Department Types =====

export interface Department {
  id: string;
  department_name: string;
  department_category?: string;
  official_email?: string;
  head_name?: string;
  head_email?: string;
  head_profile_id?: string;
  head_contact_no?: string;
  head_identity_type?: string;
  head_identity_number?: string;
  head_identity_front_url?: string;
  kyc_status?: string;
  kyc_rejection_reason?: string;
  is_active: boolean;
  staff_count?: number;
  complaint_count?: number;
  municipality_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateDepartmentDto {
  department_name: string;
  department_category?: string;
  official_email: string;
  head_name: string;
  head_email: string;
  head_contact_no?: string;
}

export interface UpdateDepartmentDto {
  department_name?: string;
  department_category?: string;
  official_email?: string;
  head_name?: string;
  head_email?: string;
  head_contact_no?: string;
  is_active?: boolean;
}

export interface DepartmentHeadCredentials {
  email: string;
  password: string;
  department_name: string;
}

export interface ReplaceHeadDto {
  head_name: string;
  head_email: string;
  head_contact_no?: string;
}

// ===== Staff Types =====

export interface StaffMember {
  id: string;
  employee_id?: string;
  expertise?: string;
  contact_number?: string;
  gender?: string;
  date_of_birth?: string;
  employee_status?: string;
  onboarded_at?: string;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    role: string;
    account_status: string;
  };
  department?: {
    id: string;
    department_name: string;
    department_category?: string;
  };
  primary_department_id?: string;
  municipality_id?: string;
}

export interface CreateStaffDto {
  full_name?: string;
  fullName?: string;
  email: string;
  password?: string;
  role: 'staff' | 'department_head';
  department_id?: string;
  departmentId?: string;
  phone?: string;
  phoneNumber?: string;
}

export interface CreateStaffUserDto {
  email: string;
  password?: string;
  full_name: string;
  role: 'staff' | 'department_head';
  department_id: string;
  phone?: string;
}

export interface UpdateStaffDto {
  full_name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  expertise?: string;
  contact_number?: string;
  employee_status?: string;
  primary_department_id?: string;
  departmentId?: string;
}

// ===== Cross-Department Team Types =====

export interface CrossDeptTeamMemberProfile {
  full_name: string;
  email: string;
  phone?: string;
}

export interface CrossDeptTeamStaff {
  s_uid: string;
  employee_id: string | null;
  expertise: string | null;
  profiles: CrossDeptTeamMemberProfile | null;
}

export interface CrossDeptTeamMember {
  id: string;
  staff_id: string;
  is_leader: boolean;
  joined_at: string;
  staff: CrossDeptTeamStaff | null;
}

export interface CrossDeptTeam {
  id: string;
  team_name: string;
  description: string | null;
  team_type: "cross_departmental";
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_expired?: boolean;
  days_remaining?: number | null;
  member_count?: number;
  municipality_id?: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  team_members: CrossDeptTeamMember[];
}

export interface CreateCrossDeptTeamDto {
  team_name: string;
  description?: string;
  start_date: string;
  end_date: string;
  member_staff_ids: string[];
  leader_staff_id?: string;
  is_emergency_override?: boolean;
  override_reason?: string;
}

export interface StaffAvailabilityResult {
  staff_id: string;
  is_available: boolean;
  conflicting_team_name?: string;
  conflict_start?: string;
  conflict_end?: string;
}

export interface MunicipTeamComplaintAssignment {
  id: string;
  complaint_id: string;
  team_id: string;
  assigned_by: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  assigned_at: string;
  complaint?: {
    tracking_id: string;
    title: string;
    status: string;
    severity_level: string;
    submitted_date: string;
    sla_due_at?: string;
    sla_breached?: boolean;
    complaint_categories: { category_name: string } | null;
    departments: { department_name: string } | null;
  };
}

export interface MunicipComplaint {
  co_uid: string;
  tracking_id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  severity_level: string;
  ward_number?: number;
  citizen_id: string;
  municipality_id: string;
  assigned_department_id?: string;
  category_id?: string;
  submitted_date: string;
  updated_at?: string;
  resolution_date?: string | null;
  resolution_note?: string | null;
  sla_due_at?: string | null;
  sla_breached?: boolean;
  department?: { id: string; department_name: string } | null;
  category?: { id: string; category_name: string } | null;
  citizen?: {
    id: string;
    current_province_id?: string;
    current_district_id?: string;
    current_municipality_id?: string;
    permanent_province_id?: string;
    permanent_district_id?: string;
    permanent_municipality_id?: string;
  } | null;
}
