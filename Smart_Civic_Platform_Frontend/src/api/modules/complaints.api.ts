import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';
import type {
  Complaint,
  CreateComplaintDto,
  UpdateComplaintStatusDto,
  AssignStaffDto,
  ComplaintComment,
  ComplaintFilterQuery,
} from '../types';

export const complaintsApi = {
  /**
   * Get list of complaints with optional pagination and filtering
   */
  getComplaints: async (params?: ComplaintFilterQuery): Promise<PaginatedResponse<Complaint>> => {
    const response = await apiClient.get<PaginatedResponse<Complaint>>('/complaints', { params });
    return response.data;
  },

  /**
   * Get complaint by ID
   */
  getComplaintById: async (id: string): Promise<ApiResponse<Complaint>> => {
    const response = await apiClient.get<ApiResponse<Complaint>>(`/complaints/${id}`);
    return response.data;
  },

  /**
   * Submit a new complaint
   */
  createComplaint: async (data: CreateComplaintDto): Promise<ApiResponse<Complaint>> => {
    const response = await apiClient.post<ApiResponse<Complaint>>('/complaints', data);
    return response.data;
  },

  /**
   * Update complaint status
   */
  updateStatus: async (id: string, data: UpdateComplaintStatusDto): Promise<ApiResponse<Complaint>> => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/status`, data);
    return response.data;
  },

  /**
   * Assign complaint to staff member
   */
  assignStaff: async (id: string, data: AssignStaffDto): Promise<ApiResponse<Complaint>> => {
    const response = await apiClient.post<ApiResponse<Complaint>>(`/complaints/${id}/assign`, data);
    return response.data;
  },

  /**
   * Add a comment / update to a complaint
   */
  addComment: async (id: string, content: string): Promise<ApiResponse<ComplaintComment>> => {
    const response = await apiClient.post<ApiResponse<ComplaintComment>>(`/complaints/${id}/comments`, { content });
    return response.data;
  },
};

export default complaintsApi;
