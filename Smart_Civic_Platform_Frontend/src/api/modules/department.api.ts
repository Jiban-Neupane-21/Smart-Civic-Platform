import apiClient from '../client';
import type { ApiResponse } from '../types';
import type { Department, CreateDepartmentDto, UpdateDepartmentDto } from '../types';

export const departmentApi = {
  /**
   * Get all departments for current municipality
   */
  getDepartments: async (municipalityId?: string): Promise<ApiResponse<Department[]>> => {
    const response = await apiClient.get<ApiResponse<Department[]>>('/department', {
      params: municipalityId ? { municipalityId } : undefined,
    });
    return response.data;
  },

  /**
   * Get department details by ID
   */
  getDepartmentById: async (id: string): Promise<ApiResponse<Department>> => {
    const response = await apiClient.get<ApiResponse<Department>>(`/department/${id}`);
    return response.data;
  },

  /**
   * Create a new department
   */
  createDepartment: async (data: CreateDepartmentDto): Promise<ApiResponse<Department>> => {
    const response = await apiClient.post<ApiResponse<Department>>('/department', data);
    return response.data;
  },

  /**
   * Update existing department
   */
  updateDepartment: async (id: string, data: UpdateDepartmentDto): Promise<ApiResponse<Department>> => {
    const response = await apiClient.put<ApiResponse<Department>>(`/department/${id}`, data);
    return response.data;
  },

  /**
   * Delete department by ID
   */
  deleteDepartment: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/department/${id}`);
    return response.data;
  },
};

export default departmentApi;
