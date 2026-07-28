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
