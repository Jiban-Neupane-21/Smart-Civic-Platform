import apiClient from '../client';
import type { ApiResponse } from '../types';
import type { OnboardingStatus, SubmitOnboardingDto } from '../types';

export const onboardingApi = {
  /**
   * Get current user onboarding status
   */
  getStatus: async (): Promise<ApiResponse<OnboardingStatus>> => {
    const response = await apiClient.get<ApiResponse<OnboardingStatus>>('/onboarding/status');
    return response.data;
  },

  /**
   * Submit citizen onboarding profile information
   */
  submitOnboarding: async (data: SubmitOnboardingDto): Promise<ApiResponse<OnboardingStatus>> => {
    const response = await apiClient.post<ApiResponse<OnboardingStatus>>('/onboarding/submit', data);
    return response.data;
  },
};

export default onboardingApi;
