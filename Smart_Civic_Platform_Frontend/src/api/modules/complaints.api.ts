import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';
import type {
  Complaint,
  CreateComplaintDto,
  UpdateComplaintStatusDto,
  AssignStaffDto,
  ComplaintComment,
  ComplaintFilterQuery,
  SubmitComplaintPayload,
  ComplaintCategory,
  ComplaintHistoryEntry,
  ComplaintUpdate,
  ComplaintHistoryResponse,
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
   * Get my submitted complaints (citizen view)
   */
  getMyComplaints: async (status?: string): Promise<ApiResponse<ComplaintHistoryResponse[]>> => {
    const response = await apiClient.get<ApiResponse<ComplaintHistoryResponse[]>>('/citizen/complaints', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  /**
   * Get complaint by ID (citizen)
   */
  getComplaintById: async (id: string): Promise<ApiResponse<Complaint>> => {
    const response = await apiClient.get<ApiResponse<Complaint>>(`/citizen/complaints/${id}`);
    return response.data;
  },

  /**
   * Submit a new complaint
   */
  createComplaint: async (data: CreateComplaintDto | SubmitComplaintPayload): Promise<ApiResponse<Complaint>> => {
    const response = await apiClient.post<ApiResponse<Complaint>>('/citizen/complaints', data);
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

  /**
   * Get complaint history
   */
  getComplaintHistory: async (id: string): Promise<ApiResponse<ComplaintHistoryEntry[]>> => {
    const response = await apiClient.get<ApiResponse<ComplaintHistoryEntry[]>>(`/citizen/complaints/${id}/history`);
    return response.data;
  },

  /**
   * Get complaint updates
   */
  getComplaintUpdates: async (id: string): Promise<ApiResponse<ComplaintUpdate[]>> => {
    const response = await apiClient.get<ApiResponse<ComplaintUpdate[]>>(`/citizen/complaints/${id}/updates`);
    return response.data;
  },

  /**
   * Add a complaint note
   */
  addComplaintNote: async (id: string, note: string): Promise<ApiResponse<ComplaintUpdate>> => {
    const response = await apiClient.post<ApiResponse<ComplaintUpdate>>(`/citizen/complaints/${id}/updates`, { note });
    return response.data;
  },

  /**
   * Upload media for a complaint
   */
  uploadMedia: async (id: string, mediaBase64: string, fileName: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/citizen/complaints/${id}/media`, { media_base64: mediaBase64, file_name: fileName });
    return response.data;
  },

  /**
   * Reopen a complaint
   */
  reopenComplaint: async (id: string, reason: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/citizen/complaints/${id}/reopen`, { reopen_reason: reason });
    return response.data;
  },

  /**
   * Submit feedback
   */
  submitFeedback: async (id: string, rating: number, comment?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/citizen/complaints/${id}/feedback`, { rating, comment });
    return response.data;
  },

  /**
   * Get categories for a municipality
   */
  getCategories: async (municipalityId: string): Promise<ApiResponse<ComplaintCategory[]>> => {
    const response = await apiClient.get<ApiResponse<ComplaintCategory[]>>(`/citizen/municipalities/${municipalityId}/categories`);
    return response.data;
  },
};

export default complaintsApi;
