import apiClient from '../client';
import type { ApiResponse } from '../types';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponseData,
  UserProfile,
  SendOtpRequest,
  VerifyOtpRequest,
  MobileLoginRequest,
  ForgotPasswordRequest,
  ChangePasswordRequest,
} from '../types';

export const authApi = {
  /**
   * Citizen self-registration
   */
  register: async (data: RegisterRequest): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/register', data);
    return response.data;
  },

  /**
   * User login (email + password)
   */
  login: async (data: LoginRequest): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', data);
    return response.data;
  },

  /**
   * Dispatch SMS OTP code
   */
  sendOtp: async (data: SendOtpRequest): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/send-otp', data);
    return response.data;
  },

  /**
   * Verify SMS OTP code
   */
  verifyOtp: async (data: VerifyOtpRequest): Promise<ApiResponse<{ verified: boolean }>> => {
    const response = await apiClient.post<ApiResponse<{ verified: boolean }>>('/auth/verify-otp', data);
    return response.data;
  },

  /**
   * Passwordless login via mobile OTP
   */
  loginMobile: async (data: MobileLoginRequest): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login-mobile', data);
    return response.data;
  },

  /**
   * Refresh JWT access token using refresh token
   */
  refresh: async (refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken?: string }>> => {
    const response = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken?: string }>>('/auth/refresh', { refreshToken });
    return response.data;
  },

  /**
   * Fetch authenticated user profile
   */
  getMe: async (): Promise<ApiResponse<UserProfile>> => {
    const response = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
    return response.data;
  },

  /**
   * Logout user and invalidate refresh token
   */
  logout: async (refreshToken: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/auth/logout', { refreshToken });
    return response.data;
  },

  /**
   * Change user password
   */
  changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>('/auth/change-password', data);
    return response.data;
  },

  /**
   * Send password reset email link
   */
  forgotPassword: async (data: ForgotPasswordRequest): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/auth/forgot-password', data);
    return response.data;
  },
};

export default authApi;
