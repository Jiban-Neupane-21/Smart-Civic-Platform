import { BASE_URL, fetchWithAuth } from "./index";
import type { DepartmentDashboardData } from "../types/dashboard.type";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const departmentApi = {
  getDashboard: async (): Promise<DepartmentDashboardData> => {
    const response = await fetchWithAuth(`${BASE_URL}/department/dashboard`);
    const result = (await response.json()) as ApiResponse<DepartmentDashboardData>;

    if (!result.success) {
      throw new Error("Failed to fetch department dashboard data.");
    }

    return result.data;
  },
};
