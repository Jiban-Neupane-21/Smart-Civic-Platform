import apiClient from '../client';
import type { ApiResponse } from '../types';
import type {
  Municipality,
  ProvisionMunicipalityDto,
  UpdateMunicipalityDto,
  MunicipalityStats,
  MunicipalityDashboardData,
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  ReplaceHeadDto,
  StaffMember,
  CreateStaffDto,
  CreateStaffUserDto,
  UpdateStaffDto,
  MunicipComplaint,
  CrossDeptTeam,
  CreateCrossDeptTeamDto,
  StaffAvailabilityResult,
  MunicipTeamComplaintAssignment,
} from '../types';

export const municipalityApi = {
  /**
   * List all registered municipalities
   */
  getMunicipalities: async (): Promise<ApiResponse<Municipality[]>> => {
    const response = await apiClient.get<ApiResponse<Municipality[]>>('/municipality');
    return response.data;
  },

  /**
   * Get municipality by ID
   */
  getMunicipalityById: async (id: string): Promise<ApiResponse<Municipality>> => {
    const response = await apiClient.get<ApiResponse<Municipality>>(`/municipality/${id}`);
    return response.data;
  },

  /**
   * Provision / create a new municipality with admin user
   */
  provisionMunicipality: async (data: ProvisionMunicipalityDto): Promise<ApiResponse<Municipality>> => {
    const response = await apiClient.post<ApiResponse<Municipality>>('/municipality/provision', data);
    return response.data;
  },

  /**
   * Update municipality details
   */
  updateMunicipality: async (id: string, data: UpdateMunicipalityDto): Promise<ApiResponse<Municipality>> => {
    const response = await apiClient.put<ApiResponse<Municipality>>(`/municipality/${id}`, data);
    return response.data;
  },

  /**
   * Fetch municipality statistics summary
   */
  getStats: async (id: string): Promise<ApiResponse<MunicipalityStats>> => {
    const response = await apiClient.get<ApiResponse<MunicipalityStats>>(`/municipality/${id}/stats`);
    return response.data;
  },

  /**
   * Fetch municipality operational analytics (for municipality_head)
   */
  getDashboard: async (): Promise<ApiResponse<MunicipalityDashboardData>> => {
    const response = await apiClient.get<ApiResponse<MunicipalityDashboardData>>('/municipality/analytics');
    return response.data;
  },

  /**
   * Fetch own municipality full profile including KYC status
   */
  getMyProfile: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>('/municipality/profile');
    return response.data;
  },

  /**
   * Update municipality profile and/or submit KYC documents (base64 images)
   */
  updateMyProfile: async (data: {
    official_name?: string;
    official_email?: string;
    official_contact_no?: string;
    about_description?: string;
    mayor_chairperson_name?: string;
    deputy_mayor_vice_chairperson_name?: string;
    head_name?: string;
    head_email?: string;
    head_contact_no?: string;
    head_identity_type?: string;
    head_identity_number?: string;
    head_identity_front_base64?: string;
    head_identity_back_base64?: string;
    registration_document_base64?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch<ApiResponse<any>>('/municipality/profile', data);
    return response.data;
  },

  // ===== Department Methods =====

  getDepartments: async (municipalityId: string): Promise<ApiResponse<{ departments: Department[] }>> => {
    const response = await apiClient.get<ApiResponse<{ departments: Department[] }>>(
      `/municipality/${municipalityId}/departments`
    );
    return response.data;
  },

  /** Context-resolved: uses middleware municipalityId */
  getMyDepartments: async (): Promise<ApiResponse<{ departments: Department[] }>> => {
    const response = await apiClient.get<ApiResponse<{ departments: Department[] }>>('/municipality/departments');
    return response.data;
  },

  getDepartmentById: async (municipalityId: string, departmentId: string): Promise<ApiResponse<Department>> => {
    const response = await apiClient.get<ApiResponse<Department>>(
      `/municipality/${municipalityId}/departments/${departmentId}`
    );
    return response.data;
  },

  createDepartment: async (municipalityId: string, data: CreateDepartmentDto): Promise<ApiResponse<Department>> => {
    const response = await apiClient.post<ApiResponse<Department>>(
      `/municipality/${municipalityId}/departments`,
      data
    );
    return response.data;
  },

  updateDepartment: async (municipalityId: string, departmentId: string, data: UpdateDepartmentDto): Promise<ApiResponse<Department>> => {
    const response = await apiClient.patch<ApiResponse<Department>>(
      `/municipality/${municipalityId}/departments/${departmentId}`,
      data
    );
    return response.data;
  },

  deleteDepartment: async (municipalityId: string, departmentId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/municipality/${municipalityId}/departments/${departmentId}`
    );
    return response.data;
  },

  getDepartmentCategories: async (): Promise<ApiResponse<string[]>> => {
    const response = await apiClient.get<ApiResponse<string[]>>('/municipality/departments/categories');
    return response.data;
  },

  replaceDepartmentHead: async (municipalityId: string, departmentId: string, data: ReplaceHeadDto): Promise<ApiResponse<Department>> => {
    const response = await apiClient.post<ApiResponse<Department>>(
      `/municipality/departments/${departmentId}/replace-head`,
      data
    );
    return response.data;
  },

  reviewDepartmentKyc: async (municipalityId: string, departmentId: string, data: { status: "verified" | "rejected"; rejection_reason?: string }): Promise<ApiResponse<Department>> => {
    const response = await apiClient.patch<ApiResponse<Department>>(
      `/municipality/${municipalityId}/departments/${departmentId}/kyc`,
      data
    );
    return response.data;
  },

  // ===== Staff Methods =====

  getStaff: async (municipalityId: string, departmentId?: string): Promise<ApiResponse<StaffMember[]>> => {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await apiClient.get<ApiResponse<StaffMember[]>>(
      `/municipality/${municipalityId}/staff`,
      { params }
    );
    return response.data;
  },

  /** Context-resolved: uses middleware municipalityId */
  getMyStaff: async (departmentId?: string): Promise<ApiResponse<StaffMember[]>> => {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await apiClient.get<ApiResponse<StaffMember[]>>('/municipality/staff', { params });
    return response.data;
  },

  createStaff: async (municipalityId: string, data: CreateStaffDto): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/municipality/${municipalityId}/staff`,
      data
    );
    return response.data;
  },

  createStaffUser: async (data: CreateStaffUserDto): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(
      '/municipality/users/create',
      data
    );
    return response.data;
  },

  updateStaff: async (municipalityId: string, staffId: string, data: UpdateStaffDto): Promise<ApiResponse<StaffMember>> => {
    const response = await apiClient.patch<ApiResponse<StaffMember>>(
      `/municipality/${municipalityId}/staff/${staffId}`,
      data
    );
    return response.data;
  },

  deleteStaff: async (municipalityId: string, staffId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/municipality/${municipalityId}/staff/${staffId}`
    );
    return response.data;
  },

  updateStaffStatus: async (municipalityId: string, staffId: string, status: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>(
      `/municipality/${municipalityId}/staff/${staffId}/status`,
      { status }
    );
    return response.data;
  },

  resetStaffPassword: async (municipalityId: string, staffId: string): Promise<ApiResponse<{ temp_password: string }>> => {
    const response = await apiClient.post<ApiResponse<{ temp_password: string }>>(
      `/municipality/${municipalityId}/staff/${staffId}/reset-password`
    );
    return response.data;
  },

  /**
   * Get all complaints for the municipality
   */
  getComplaints: async (status?: string): Promise<ApiResponse<MunicipComplaint[]>> => {
    const response = await apiClient.get<ApiResponse<MunicipComplaint[]>>('/municipality/complaints', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  /**
   * Intervene on a complaint (Admin action)
   */
  interveneOnComplaint: async (
    municipalityId: string, 
    complaintId: string, 
    data: { action: 'reassign' | 'force_resolve' | 'force_reject' | 'update_status'; note: string; new_department_id?: string; new_status?: string }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/municipality/${municipalityId}/complaints/${complaintId}/intervene`,
      data
    );
    return response.data;
  },

  // ===== Cross-Department Team Methods =====

  getCrossDeptTeams: async (): Promise<ApiResponse<CrossDeptTeam[]>> => {
    const response = await apiClient.get<ApiResponse<CrossDeptTeam[]>>('/municipality/teams');
    return response.data;
  },

  createCrossDeptTeam: async (data: CreateCrossDeptTeamDto): Promise<ApiResponse<CrossDeptTeam>> => {
    const response = await apiClient.post<ApiResponse<CrossDeptTeam>>('/municipality/teams', data);
    return response.data;
  },

  deactivateCrossDeptTeam: async (teamId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/municipality/teams/${teamId}`);
    return response.data;
  },

  getCrossDeptTeamDetail: async (teamId: string): Promise<ApiResponse<CrossDeptTeam>> => {
    const response = await apiClient.get<ApiResponse<CrossDeptTeam>>(`/municipality/teams/${teamId}`);
    return response.data;
  },

  checkStaffAvailability: async (staffIds: string[], startDate: string, endDate: string): Promise<ApiResponse<StaffAvailabilityResult[]>> => {
    const response = await apiClient.post<ApiResponse<StaffAvailabilityResult[]>>('/municipality/staff/availability', {
      staff_ids: staffIds,
      start_date: startDate,
      end_date: endDate,
    });
    return response.data;
  },

  assignComplaintToTeam: async (teamId: string, complaintId: string): Promise<ApiResponse<MunicipTeamComplaintAssignment>> => {
    const response = await apiClient.post<ApiResponse<MunicipTeamComplaintAssignment>>(`/municipality/teams/${teamId}/assign-complaint`, {
      complaint_id: complaintId,
    });
    return response.data;
  },

  getTeamComplaints: async (teamId: string): Promise<ApiResponse<MunicipTeamComplaintAssignment[]>> => {
    const response = await apiClient.get<ApiResponse<MunicipTeamComplaintAssignment[]>>(`/municipality/teams/${teamId}/complaints`);
    return response.data;
  },

  reviewStaffKyc: async (
    staffId: string,
    data: { status: 'verified' | 'rejected'; rejection_reason?: string }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch<ApiResponse<any>>(`/municipality/staff/${staffId}/kyc`, data);
    return response.data;
  },
};

export default municipalityApi;
