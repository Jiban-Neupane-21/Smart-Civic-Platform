import apiClient from '../client';
import type { ApiResponse } from '../types';
import type { CitizenDetails, UpdateCitizenProfileDto } from '../types';
import type { Complaint, Province, District, Municipality, Ward, AddressPayload, IdentityPayload } from '../types';

export const citizenApi = {
  /**
   * Get citizen profile details
   */
  getProfile: async (): Promise<ApiResponse<CitizenDetails>> => {
    const response = await apiClient.get<ApiResponse<CitizenDetails>>('/citizen/profile');
    return response.data;
  },

  /**
   * Update citizen profile details
   */
  updateProfile: async (data: UpdateCitizenProfileDto): Promise<ApiResponse<CitizenDetails>> => {
    const response = await apiClient.put<ApiResponse<CitizenDetails>>('/citizen/profile', data);
    return response.data;
  },

  /**
   * Get complaints submitted by the authenticated citizen
   */
  getMyComplaints: async (): Promise<ApiResponse<Complaint[]>> => {
    const response = await apiClient.get<ApiResponse<Complaint[]>>('/citizen/complaints');
    return response.data;
  },

  /**
   * Get all provinces
   */
  getProvinces: async (): Promise<ApiResponse<Province[]>> => {
    const response = await apiClient.get<ApiResponse<Province[]>>('/citizen/provinces');
    return response.data;
  },

  /**
   * Get districts by province
   */
  getDistricts: async (provinceId: string): Promise<ApiResponse<District[]>> => {
    const response = await apiClient.get<ApiResponse<District[]>>('/citizen/districts', {
      params: { province_id: provinceId },
    });
    return response.data;
  },

  /**
   * Get municipalities by district
   */
  getMunicipalities: async (districtId: string): Promise<ApiResponse<Municipality[]>> => {
    const response = await apiClient.get<ApiResponse<Municipality[]>>('/citizen/municipalities', {
      params: { district_id: districtId },
    });
    return response.data;
  },

  /**
   * Get wards by municipality
   */
  getWards: async (municipalityId: string): Promise<ApiResponse<Ward[]>> => {
    const response = await apiClient.get<ApiResponse<Ward[]>>('/citizen/wards', {
      params: { municipality_id: municipalityId },
    });
    return response.data;
  },

  /**
   * Update citizen structured address
   */
  updateAddress: async (data: AddressPayload): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/citizen/address', data);
    return response.data;
  },

  /**
   * Upload identity documents for KYC
   */
  uploadIdentity: async (data: IdentityPayload): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/citizen/identity', data);
    return response.data;
  },

  /**
   * Check for nearby similar / duplicate complaints in real-time
   */
  checkDuplicates: async (data: DuplicateCheckPayload): Promise<ApiResponse<DuplicateCheckResponse>> => {
    const response = await apiClient.post<ApiResponse<DuplicateCheckResponse>>('/citizen/complaints/check-duplicates', data);
    return response.data;
  },

  /**
   * Upvote / endorse an existing complaint
   */
  upvoteComplaint: async (complaintId: string): Promise<ApiResponse<UpvoteResponse>> => {
    const response = await apiClient.post<ApiResponse<UpvoteResponse>>(`/citizen/complaints/${complaintId}/upvote`);
    return response.data;
  },

  /**
   * Permanently delete citizen account and all associated data
   */
  deleteAccount: async (password: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    try {
      const response = await apiClient.delete<ApiResponse<{ success: boolean; message: string }>>('/citizen/account', {
        headers: { 'Content-Type': 'application/json' },
        data: { password },
      });
      return response.data;
    } catch (err: any) {
      // Fallback alias to /citizen/profile in case of route caching
      if (err?.response?.status === 404) {
        const fallbackRes = await apiClient.delete<ApiResponse<{ success: boolean; message: string }>>('/citizen/profile', {
          headers: { 'Content-Type': 'application/json' },
          data: { password },
        });
        return fallbackRes.data;
      }
      throw err;
    }
  },
};

export interface DuplicateCheckPayload {
  title: string;
  description?: string;
  category_id?: string;
  municipality_id: string;
  ward_number?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DuplicateMatch {
  complaint: {
    co_uid: string;
    tracking_id: string;
    title: string;
    description: string;
    category_name?: string;
    department_name?: string;
    status: string;
    severity_level?: string;
    priority?: string;
    ward_number?: number | null;
    upvote_count: number;
    submitted_date: string;
  };
  similarity_score: number;
  confidence_level: 'high' | 'medium';
  distance_meters: number | null;
  distance_label: string;
  reasons: string[];
  has_user_upvoted: boolean;
  is_user_author: boolean;
}

export interface DuplicateCheckResponse {
  duplicates: DuplicateMatch[];
}

export interface UpvoteResponse {
  success: boolean;
  already_upvoted?: boolean;
  tracking_id: string;
  upvote_count: number;
  priority_escalated?: boolean;
  new_priority?: string;
  message: string;
}

export default citizenApi;

