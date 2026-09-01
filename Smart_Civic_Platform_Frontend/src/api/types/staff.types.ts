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
