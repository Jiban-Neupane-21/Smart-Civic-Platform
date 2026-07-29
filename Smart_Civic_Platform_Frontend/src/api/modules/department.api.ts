import apiClient from '../client';
import type { ApiResponse } from '../types';
import type { 
  Department, 
  CreateDepartmentDto, 
  UpdateDepartmentDto,
  DeptQueueComplaint,
  UpdateComplaintStateDto,
  RequestCollaborationDto,
  SubmitSignOffDto,
  DeptCollaboration,
  Team,
  CreateTeamDto,
  TeamComplaintAssignment,
} from '../types';
export const departmentApi = {
  /**
   * Get all departments for current municipality
   */
  getDepartments: async (municipalityId?: string): Promise<ApiResponse<Department[]>> => {
    const response = await apiClient.get<ApiResponse<Department[]>>('/department', {
      params: municipalityId ? { municipalityId } : undefined,
    });
    return response.data;
  },

  /**
   * Get department details by ID
   */
  getDepartmentById: async (id: string): Promise<ApiResponse<Department>> => {
    const response = await apiClient.get<ApiResponse<Department>>(`/department/${id}`);
    return response.data;
  },

  /**
   * Create a new department
   */
  createDepartment: async (data: CreateDepartmentDto): Promise<ApiResponse<Department>> => {
    const response = await apiClient.post<ApiResponse<Department>>('/department', data);
    return response.data;
  },

  /**
   * Update existing department
   */
  updateDepartment: async (id: string, data: UpdateDepartmentDto): Promise<ApiResponse<Department>> => {
    const response = await apiClient.put<ApiResponse<Department>>(`/department/${id}`, data);
    return response.data;
  },

  /**
   * Delete department by ID
   */
  deleteDepartment: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/department/${id}`);
    return response.data;
  },

  getQueue: async (status?: string): Promise<ApiResponse<DeptQueueComplaint[]>> => {
    const response = await apiClient.get<ApiResponse<DeptQueueComplaint[]>>('/department/queue', {
      params: { status }
    });
    return response.data;
  },

  updateComplaintState: async (complaintId: string, data: UpdateComplaintStateDto): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>(`/department/complaints/${complaintId}/state`, data);
    return response.data;
  },

  requestCollaboration: async (complaintId: string, data: RequestCollaborationDto): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/department/complaints/${complaintId}/collaborate`, data);
    return response.data;
  },

  submitSignOff: async (collaborationId: string, data: SubmitSignOffDto): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/department/collaborations/${collaborationId}/signoff`, data);
    return response.data;
  },

  // ===== TEAM MANAGEMENT METHODS =====

  getTeams: async (): Promise<ApiResponse<Team[]>> => {
    const response = await apiClient.get<ApiResponse<Team[]>>('/department/teams');
    return response.data;
  },

  getTeamDetail: async (teamName: string): Promise<ApiResponse<Team>> => {
    const response = await apiClient.get<ApiResponse<Team>>(`/department/teams/${encodeURIComponent(teamName)}`);
    return response.data;
  },

  createTeam: async (data: CreateTeamDto): Promise<ApiResponse<Team>> => {
    const response = await apiClient.post<ApiResponse<Team>>('/department/teams/create', data);
    return response.data;
  },

  updateTeam: async (teamName: string, data: Partial<CreateTeamDto>): Promise<ApiResponse<Team>> => {
    const response = await apiClient.patch<ApiResponse<Team>>(`/department/teams/${encodeURIComponent(teamName)}`, data);
    return response.data;
  },

  assignComplaintToTeam: async (teamName: string, complaintId: string): Promise<ApiResponse<TeamComplaintAssignment>> => {
    const response = await apiClient.post<ApiResponse<TeamComplaintAssignment>>(`/department/teams/${encodeURIComponent(teamName)}/assign-complaint`, { complaint_id: complaintId });
    return response.data;
  },

  getTeamComplaints: async (teamName: string): Promise<ApiResponse<TeamComplaintAssignment[]>> => {
    const response = await apiClient.get<ApiResponse<TeamComplaintAssignment[]>>(`/department/teams/${encodeURIComponent(teamName)}/complaints`);
    return response.data;
  },

  checkStaffAvailability: async (staffIds: string[], startDate: string, endDate: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.post<ApiResponse<any[]>>('/department/staff/availability', { staff_ids: staffIds, start_date: startDate, end_date: endDate });
    return response.data;
  },

  getCollaborations: async (): Promise<ApiResponse<DeptCollaboration[]>> => {
    const response = await apiClient.get<ApiResponse<DeptCollaboration[]>>('/department/collaborations');
    return response.data;
  },

  getDashboard: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>('/department/dashboard');
    return response.data;
  },
};

export default departmentApi;
