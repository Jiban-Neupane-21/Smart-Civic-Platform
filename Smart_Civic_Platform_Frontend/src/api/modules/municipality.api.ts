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
   * Fetch municipality dashboard analytics (for municipality_head)
   */
  getDashboard: async (): Promise<ApiResponse<MunicipalityDashboardData>> => {
    const response = await apiClient.get<ApiResponse<MunicipalityDashboardData>>('/municipality/analytics');
    return response.data;
  },

  // ===== Department Methods =====

  getDepartments: async (municipalityId: string): Promise<ApiResponse<{ departments: Department[] }>> => {
    const response = await apiClient.get<ApiResponse<{ departments: Department[] }>>(
      `/municipality/${municipalityId}/departments`
    );
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

  // ===== Staff Methods =====

  getStaff: async (municipalityId: string, departmentId?: string): Promise<ApiResponse<StaffMember[]>> => {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await apiClient.get<ApiResponse<StaffMember[]>>(
      `/municipality/${municipalityId}/staff`,
      { params }
    );
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
};

export default municipalityApi;
