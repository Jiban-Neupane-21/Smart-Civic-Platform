import apiClient from '../client';
import type { ApiResponse } from '../types';
import type {
  SuperadminStats,
  ProvinceRow,
  DistrictRow,
  MunicipalityReference,
  MunicipalityDetail,
  WardRow,
  ProvisionRequest,
  ProvisionResponse,
  RoleAssignRequest,
  StatusManageRequest,
  CreateUserRequest,
  AuditLogEntry,
  MunicipalityJoined,
  SuperadminUser,
  FeatureFlag,
} from '../types';

export const superadminApi = {
  getAnalytics: async (): Promise<ApiResponse<SuperadminStats>> => {
    const response = await apiClient.get<ApiResponse<SuperadminStats>>('/superadmin/analytics');
    return response.data;
  },

  getProvinces: async (): Promise<ApiResponse<ProvinceRow[]>> => {
    const response = await apiClient.get<ApiResponse<ProvinceRow[]>>('/superadmin/provinces');
    return response.data;
  },

  getDistricts: async (provinceId?: string): Promise<ApiResponse<DistrictRow[]>> => {
    const params = provinceId ? { province_id: provinceId } : undefined;
    const response = await apiClient.get<ApiResponse<DistrictRow[]>>('/superadmin/districts', { params });
    return response.data;
  },

  getReferenceMunicipalities: async (districtId?: string, isActive?: boolean): Promise<ApiResponse<MunicipalityReference[]>> => {
    const params: Record<string, string> = {};
    if (districtId) params.district_id = districtId;
    if (isActive !== undefined) params.is_active = String(isActive);
    const response = await apiClient.get<ApiResponse<MunicipalityReference[]>>('/superadmin/municipalities/reference', { params });
    return response.data;
  },

  getMunicipalityDetail: async (id: string): Promise<ApiResponse<MunicipalityDetail>> => {
    const response = await apiClient.get<ApiResponse<MunicipalityDetail>>(`/superadmin/municipalities/${id}/detail`);
    return response.data;
  },

  getWards: async (municipalityId: string): Promise<ApiResponse<WardRow[]>> => {
    const response = await apiClient.get<ApiResponse<WardRow[]>>(`/superadmin/wards/${municipalityId}`);
    return response.data;
  },

  provisionMunicipality: async (data: ProvisionRequest): Promise<ApiResponse<ProvisionResponse>> => {
    const response = await apiClient.post<ApiResponse<ProvisionResponse>>('/superadmin/municipalities/provision', data);
    return response.data;
  },

  assignUserRole: async (data: RoleAssignRequest): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.patch<ApiResponse<{ message: string }>>('/superadmin/users/assign-role', data);
    return response.data;
  },

  manageUserStatus: async (data: StatusManageRequest): Promise<ApiResponse<SuperadminUser>> => {
    const response = await apiClient.patch<ApiResponse<SuperadminUser>>('/superadmin/users/manage-status', data);
    return response.data;
  },

  getAuditLogs: async (params?: { page?: number; limit?: number }): Promise<ApiResponse<AuditLogEntry[]>> => {
    const response = await apiClient.get<ApiResponse<AuditLogEntry[]>>('/superadmin/audit-logs', { params });
    return response.data;
  },

  createUser: async (data: CreateUserRequest): Promise<ApiResponse<SuperadminUser>> => {
    const response = await apiClient.post<ApiResponse<SuperadminUser>>('/superadmin/users/create', data);
    return response.data;
  },

  getMunicipalities: async (): Promise<ApiResponse<MunicipalityJoined[]>> => {
    const response = await apiClient.get<ApiResponse<MunicipalityJoined[]>>('/superadmin/municipalities');
    return response.data;
  },

  updateMunicipality: async (id: string, data: Partial<MunicipalityJoined>): Promise<ApiResponse<MunicipalityJoined>> => {
    const response = await apiClient.put<ApiResponse<MunicipalityJoined>>(`/superadmin/municipalities/${id}`, data);
    return response.data;
  },

  reviewMunicipalityKyc: async (id: string, data: { status: 'verified' | 'rejected', rejection_reason?: string }): Promise<ApiResponse<MunicipalityJoined>> => {
    const response = await apiClient.patch<ApiResponse<MunicipalityJoined>>(`/superadmin/municipalities/${id}/kyc`, data);
    return response.data;
  },

  deleteMunicipality: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/superadmin/municipalities/${id}`);
    return response.data;
  },

  getFeatureFlags: async (): Promise<ApiResponse<FeatureFlag[]>> => {
    const response = await apiClient.get<ApiResponse<FeatureFlag[]>>('/superadmin/feature-flags');
    return response.data;
  },

  toggleFeatureFlag: async (id: string, isEnabled: boolean): Promise<ApiResponse<FeatureFlag>> => {
    const response = await apiClient.patch<ApiResponse<FeatureFlag>>(`/superadmin/feature-flags/${id}/toggle`, { isEnabled });
    return response.data;
  },
};

export default superadminApi;
