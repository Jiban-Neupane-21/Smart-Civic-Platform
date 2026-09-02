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

  /**
   * Get logged-in staff profile
   */
  getMyProfile: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>('/staff/profile');
    return response.data;
  },

  /**
   * Update logged-in staff contact / address
   */
  updateMyProfile: async (data: { phone?: string; contact_number?: string; personal_address?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch<ApiResponse<any>>('/staff/profile', data);
    return response.data;
  },

  /**
   * Get logged-in staff department details
   */
  getMyDepartment: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>('/staff/my-department');
    return response.data;
  },

  /**
   * Get logged-in staff assigned complaints across all squads
   */
  getMyComplaints: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/staff/my-complaints');
    return response.data;
  },

  /**
   * Get logged-in staff assigned teams / memberships
   */
  getMyTeams: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/staff/my-assignments');
    return response.data;
  },

  /**
   * Get logged-in staff field work schedule and task timeline
   */
  getMySchedule: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/staff/schedule');
    return response.data;
  },

  /**
   * Accept ticket assignment
   */
  acceptAssignment: async (assignmentId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/staff/assignments/${assignmentId}/accept`);
    return response.data;
  },

  /**
   * Start field work on assignment
   */
  startAssignment: async (assignmentId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/staff/assignments/${assignmentId}/start`);
    return response.data;
  },

  /**
   * Complete field work assignment
   */
  completeAssignment: async (assignmentId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/staff/assignments/${assignmentId}/complete`);
    return response.data;
  },

  /**
   * Transfer assignment to peer
   */
  transferAssignment: async (id: string, data: { to_staff_id: string; reason: string; note?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/staff/assignments/${id}/transfer`, data);
    return response.data;
  },

  /**
   * Return assignment to department head
   */
  returnAssignmentToDeptHead: async (id: string, data: { reason: string; note?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/staff/assignments/${id}/return-to-dept`, data);
    return response.data;
  },

  /**
   * Get complaint detail for staff
   */
  getComplaintDetail: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>(`/staff/complaints/${id}`);
    return response.data;
  },

  /**
   * Get complaint status timeline updates for staff
   */
  getComplaintUpdates: async (id: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/staff/complaints/${id}/updates`);
    return response.data;
  },
};

export default staffApi;
