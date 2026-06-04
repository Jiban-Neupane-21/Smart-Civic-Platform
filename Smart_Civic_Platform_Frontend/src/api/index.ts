// Base URL setup - dynamically switches based on your environment (.env)
export const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: `${BASE_URL}/auth/register`,
    LOGIN: `${BASE_URL}/auth/login`,
    REFRESH: `${BASE_URL}/auth/refresh`,
    LOGOUT: `${BASE_URL}/auth/logout`,
    ME: `${BASE_URL}/auth/me`,
    INVITE: `${BASE_URL}/auth/invite`,
    ACCEPT_INVITE: `${BASE_URL}/auth/accept-invite`,
    FORGOT_PASSWORD: `${BASE_URL}/auth/forgot-password`,
  },
  SUPERADMIN: {
    STATS: `${BASE_URL}/superadmin/stats`,
    USERS: `${BASE_URL}/superadmin/users`,
    USER_BY_ID: (id: string) => `${BASE_URL}/superadmin/users/${id}`,
    USER_STATUS: (id: string) => `${BASE_URL}/superadmin/users/${id}/status`,
    USER_IMPERSONATE: (id: string) =>
      `${BASE_URL}/superadmin/users/${id}/impersonate`,
    ADMINS: `${BASE_URL}/superadmin/admins`,
    AUDIT_LOGS: `${BASE_URL}/superadmin/audit-logs`,
    FEATURE_FLAGS: `${BASE_URL}/superadmin/feature-flags`,
    TOGGLE_FEATURE_FLAG: (id: string) =>
      `${BASE_URL}/superadmin/feature-flags/${id}/toggle`,
  },
  // Stubs for future modules based on your database structure
  MUNICIPALITIES: {
    BASE: `${BASE_URL}/municipalities`,
  },
  COMPLAINTS: {
    BASE: `${BASE_URL}/complaints`,
  },
  STAFF: {
    BASE: `${BASE_URL}/staff`,
  },
};

/**
 * Standardized fetch wrapper that automatically attaches the JWT token
 * from localStorage to the request headers.
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, { ...options, headers });

  // You can add global 401 handling here in the future (e.g., calling /auth/refresh)

  return response;
};
