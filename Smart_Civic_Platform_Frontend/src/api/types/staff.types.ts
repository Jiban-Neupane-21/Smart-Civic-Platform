import type { UserRole, AccountStatus } from './auth.types';

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: AccountStatus;
  phoneNumber?: string;
  municipalityId: string;
  departmentId?: string;
  departmentName?: string;
  designation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffDto {
  email: string;
  fullName?: string;
  full_name?: string;
  password?: string;
  role: 'staff' | 'department_head';
  departmentId?: string;
  department_id?: string;
  municipalityId?: string;
  phoneNumber?: string;
  phone?: string;
  designation?: string;
}

export interface UpdateStaffDto {
  fullName?: string;
  full_name?: string;
  phoneNumber?: string;
  phone?: string;
  departmentId?: string;
  primary_department_id?: string;
  designation?: string;
  status?: AccountStatus;
}
