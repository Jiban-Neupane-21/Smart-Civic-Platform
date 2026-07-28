import apiClient from '../client';
import type { ApiResponse } from '../types';
import type { CitizenDetails, UpdateCitizenProfileDto } from '../types';
import type { Complaint } from '../types';

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
};

export default citizenApi;
