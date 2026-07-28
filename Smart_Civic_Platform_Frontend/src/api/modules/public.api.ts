import apiClient from '../client';
import type { ApiResponse } from '../types';
import type { PublicStats, PublicAnnouncement } from '../types';

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
};

export default publicApi;
