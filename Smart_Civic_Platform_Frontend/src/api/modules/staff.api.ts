import apiClient from '../client';
import type { ApiResponse } from '../types';
import type { StaffUser, CreateStaffDto, UpdateStaffDto } from '../types';

export const staffApi = {
  /**
   * List staff members for department
   */
  getStaffMembers: async (params?: { departmentId?: string; role?: string }): Promise<ApiResponse<StaffUser[]>> => {
    const response = await apiClient.get<ApiResponse<StaffUser[]>>('/department/staff-roster', { params });
    return response.data;
  },

  /**
   * Get staff member by ID
   */
  getStaffById: async (id: string): Promise<ApiResponse<StaffUser>> => {
    const response = await apiClient.get<ApiResponse<StaffUser>>(`/department/staff/${id}`);
    return response.data;
  },

  /**
   * Create / Provision a new staff member account
   */
  createStaff: async (data: CreateStaffDto): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/department/staff/create', data);
    return response.data;
  },

  /**
   * Update staff member profile & assignment
   */
  updateStaff: async (id: string, data: UpdateStaffDto): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch<ApiResponse<any>>(`/department/staff/${id}`, data);
    return response.data;
  },

  /**
   * Delete / Archive a staff member
   */
  deleteStaff: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete<ApiResponse<any>>(`/department/staff/${id}`);
    return response.data;
  },

  /**
   * Update staff account status (e.g. active, suspended)
   */
  updateStaffStatus: async (id: string, status: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch<ApiResponse<any>>(`/department/staff/${id}/status`, { status });
    return response.data;
  },

  /**
   * Reset staff password
   */
  resetStaffPassword: async (id: string, newPassword?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/department/staff/${id}/reset-password`, { newPassword });
    return response.data;
  },

  /**
   * Fetch current staff KYC status and submitted documents
   */
  getKyc: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>('/staff/kyc');
    return response.data;
  },

  /**
   * Submit / Update staff KYC onboarding details
   */
  submitKyc: async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put<ApiResponse<any>>('/staff/kyc', data);
    return response.data;
  },
};

export default staffApi;
