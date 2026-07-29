import apiClient from '../client';
import type { ApiResponse } from '../types';
import type { PublicStats, PublicAnnouncement, Province, District, Municipality, Ward } from '../types';

export const publicApi = {
  /**
   * Get public overview platform statistics
   */
  getStats: async (): Promise<ApiResponse<PublicStats>> => {
    const response = await apiClient.get<ApiResponse<PublicStats>>('/public/stats');
    return response.data;
  },

  /**
   * Get public announcements and updates
   */
  getAnnouncements: async (municipalityId?: string): Promise<ApiResponse<PublicAnnouncement[]>> => {
    const response = await apiClient.get<ApiResponse<PublicAnnouncement[]>>('/public/announcements', {
      params: municipalityId ? { municipalityId } : undefined,
    });
    return response.data;
  },

  /**
   * Get all provinces
   */
  getProvinces: async (): Promise<ApiResponse<Province[]>> => {
    const response = await apiClient.get<ApiResponse<Province[]>>('/public/provinces');
    return response.data;
  },

  /**
   * Get districts by province
   */
  getDistricts: async (provinceId: string): Promise<ApiResponse<District[]>> => {
    const response = await apiClient.get<ApiResponse<District[]>>('/public/districts', {
      params: { province_id: provinceId },
    });
    return response.data;
  },

  /**
   * Get municipalities by district
   */
  getMunicipalities: async (districtId: string): Promise<ApiResponse<Municipality[]>> => {
    const response = await apiClient.get<ApiResponse<Municipality[]>>('/public/municipalities', {
      params: { district_id: districtId },
    });
    return response.data;
  },

  /**
   * Get wards by municipality
   */
  getWards: async (municipalityId: string): Promise<ApiResponse<Ward[]>> => {
    const response = await apiClient.get<ApiResponse<Ward[]>>('/public/wards', {
      params: { municipality_id: municipalityId },
    });
    return response.data;
  },
};

export default publicApi;
