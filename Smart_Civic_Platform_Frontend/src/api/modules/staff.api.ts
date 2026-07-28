import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';
import type { StaffUser, CreateStaffDto, UpdateStaffDto } from '../types';

export const staffApi = {
  /**
   * List staff members for municipality or department
   */
  getStaffMembers: async (params?: { departmentId?: string; role?: string }): Promise<PaginatedResponse<StaffUser>> => {
    const response = await apiClient.get<PaginatedResponse<StaffUser>>('/staff', { params });
    return response.data;
  },

  /**
   * Get staff member by ID
   */
  getStaffById: async (id: string): Promise<ApiResponse<StaffUser>> => {
    const response = await apiClient.get<ApiResponse<StaffUser>>(`/staff/${id}`);
    return response.data;
  },

  /**
   * Create / Invite a new staff member
   */
  createStaff: async (data: CreateStaffDto): Promise<ApiResponse<StaffUser>> => {
    const response = await apiClient.post<ApiResponse<StaffUser>>('/staff', data);
    return response.data;
  },

  /**
   * Update staff member profile & assignment
   */
  updateStaff: async (id: string, data: UpdateStaffDto): Promise<ApiResponse<StaffUser>> => {
    const response = await apiClient.put<ApiResponse<StaffUser>>(`/staff/${id}`, data);
    return response.data;
  },

  /**
   * Assign staff to a department
   */
  assignDepartment: async (id: string, departmentId: string): Promise<ApiResponse<StaffUser>> => {
    const response = await apiClient.patch<ApiResponse<StaffUser>>(`/staff/${id}/assign-department`, { departmentId });
    return response.data;
  },
};

export default staffApi;
