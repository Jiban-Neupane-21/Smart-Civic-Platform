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
};

export default citizenApi;
