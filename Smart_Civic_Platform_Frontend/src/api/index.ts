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
    GET_MUNICIPALITIES: `${BASE_URL}/superadmin/municipalities`,
    CREATE_MUNICIPALITY: `${BASE_URL}/superadmin/municipalities/provision`,
    UPDATE_MUNICIPALITY: (id: string) =>
      `${BASE_URL}/superadmin/municipalities/${id}`,
    DELETE_MUNICIPALITY: (id: string) =>
      `${BASE_URL}/superadmin/municipalities/${id}`,
  },
  // Stubs for future modules based on your database structure
  MUNICIPALITIES: {
    BASE: `${BASE_URL}/municipality`,
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

  if (!token) {
    console.warn("fetchWithAuth: No access token found. Redirecting to login.");
    // Clear user state entirely as a safety measure
    localStorage.removeItem("user_profile");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
    throw new Error("Authentication token is missing. Please log in again.");
  }

  // Safely construct headers using a plain object instead of Headers for maximum compatibility
  let userHeaders: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        userHeaders[key] = value;
      });
    } else {
      userHeaders = { ...(options.headers as Record<string, string>) };
    }
  }

  const headers = {
    "Content-Type": "application/json",
    ...userHeaders,
    Authorization: `Bearer ${token}`,
  };

  const finalOptions = { ...options, headers };
  console.log(`fetchWithAuth [REQUEST]: Sending ${options.method || "GET"} to ${url}`);
  console.log(`fetchWithAuth [HEADERS]:`, headers);

  const response = await fetch(url, finalOptions);
  
  // Clone the response to log its raw text without consuming the stream for the caller
  const clone = response.clone();
  const text = await clone.text();
  console.log(`fetchWithAuth [RESPONSE]: ${response.status} ${response.statusText} - Body:`, text);

  // Global 401 handling
  if (response.status === 401) {
    console.warn("fetchWithAuth: Received 401 Unauthorized. Redirecting to login.");
    localStorage.removeItem("user_profile");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  }

  return response;
};
