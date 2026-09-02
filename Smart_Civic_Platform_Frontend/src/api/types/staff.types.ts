import type { UserRole, AccountStatus } from './auth.types';

export interface StaffUser {
  id: string;
  profile_id?: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
  status?: AccountStatus;
  phoneNumber?: string;
  municipalityId?: string;
  departmentId?: string;
  departmentName?: string;
  designation?: string;
  createdAt?: string;
  updatedAt?: string;
  // Database schema fields
  employee_id?: string | null;
  expertise?: string | null;
  contact_number?: string | null;
  gender?: string | null;
  employee_status?: string;
  onboarded_at?: string | null;
  profiles?: {
    id?: string;
    full_name: string;
    email: string;
    phone?: string;
    role?: string;
    account_status?: string;
  } | null;
}

export interface CreateStaffDto {
  email: string;
  fullName?: string;
  full_name?: string;
  password?: string;
  role?: 'staff' | 'department_head';
  departmentId?: string;
  department_id?: string;
  municipalityId?: string;
  phoneNumber?: string;
  phone?: string;
  designation?: string;
  expertise?: string;
}

export interface UpdateStaffDto {
  fullName?: string;
  full_name?: string;
  phoneNumber?: string;
  phone?: string;
  departmentId?: string;
  primary_department_id?: string;
  designation?: string;
  expertise?: string;
  contact_number?: string;
  employee_status?: string;
  gender?: string;
  status?: AccountStatus;
}

export interface StaffProfile {
  id: string;
  employee_id?: string | null;
  expertise?: string | null;
  contact_number?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  personal_address?: string | null;
  onboarded_at?: string | null;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    role: string;
    account_status: string;
    created_at?: string;
  };
  department?: {
    id: string;
    department_name: string;
    department_category: string;
  };
  municipality?: {
    id: string;
    official_name: string;
  };
}

export interface StaffDepartmentInfo {
  id: string;
  department_name: string;
  department_category: string;
  head_name?: string;
  head_email?: string;
  official_email?: string;
}

export interface StaffTeamMembership {
  id: string;
  is_leader: boolean;
  joined_at: string;
  teams: {
    id: string;
    team_name: string;
    is_active: boolean;
  } | null;
}

export interface StaffScheduleAssignment {
  id: string;
  start_date: string;
  end_date: string | null;
  released_at?: string | null;
  release_reason?: string | null;
  is_emergency_override: boolean;
  override_reason?: string | null;
  created_at?: string;
  team?: {
    id: string;
    team_name: string;
    description?: string;
    team_type?: string;
    is_active: boolean;
  } | null;
}

export interface UpdateStaffProfileDto {
  phone?: string;
  contact_number?: string;
  personal_address?: string;
}

export interface StaffAssignedComplaint {
  assignment_id: string;
  complaint_id: string;
  tracking_id: string;
  title: string;
  description: string;
  status: string;
  assignment_status: string;
  priority: string;
  severity_level: string;
  address: string;
  submitted_date: string;
  resolution_note?: string | null;
  category_name: string;
  department_name: string;
  team_name: string;
  team_id: string;
  is_leader: boolean;
  assigned_at?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
}

