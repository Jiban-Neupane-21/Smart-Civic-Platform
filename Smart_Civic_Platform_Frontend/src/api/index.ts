// Core HTTP Client & Configuration
export { default as apiClient, API_BASE_URL } from './client';

// Legacy Fetch Support & Backward Compatibility Endpoints
export const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

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
    ANALYTICS: `${BASE_URL}/superadmin/analytics`,
    PROVINCES: `${BASE_URL}/superadmin/provinces`,
    DISTRICTS: `${BASE_URL}/superadmin/districts`,
    MUNICIPALITIES_REFERENCE: `${BASE_URL}/superadmin/municipalities/reference`,
    MUNICIPALITY_DETAIL: (id: string) => `${BASE_URL}/superadmin/municipalities/${id}/detail`,
    WARDS: (municipalityId: string) => `${BASE_URL}/superadmin/wards/${municipalityId}`,
    PROVISION_MUNICIPALITY: `${BASE_URL}/superadmin/municipalities/provision`,
    ASSIGN_ROLE: `${BASE_URL}/superadmin/users/assign-role`,
    MANAGE_STATUS: `${BASE_URL}/superadmin/users/manage-status`,
    AUDIT_LOGS: `${BASE_URL}/superadmin/audit-logs`,
    CREATE_USER: `${BASE_URL}/superadmin/users/create`,
    GET_MUNICIPALITIES: `${BASE_URL}/superadmin/municipalities`,
    UPDATE_MUNICIPALITY: (id: string) => `${BASE_URL}/superadmin/municipalities/${id}`,
    DELETE_MUNICIPALITY: (id: string) => `${BASE_URL}/superadmin/municipalities/${id}`,
  },
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

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('access_token');

  if (!token) {
    console.warn('fetchWithAuth: No access token found. Redirecting to login.');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    throw new Error('Authentication token is missing. Please log in again.');
  }

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
    'Content-Type': 'application/json',
    ...userHeaders,
    Authorization: `Bearer ${token}`,
  };

  return fetch(url, { ...options, headers });
};

// TypeScript Types & Contracts
export * from './types';

// API Service Modules
export { default as authApi } from './modules/auth.api';
export { default as citizenApi } from './modules/citizen.api';
export { default as complaintsApi } from './modules/complaints.api';
export { default as departmentApi } from './modules/department.api';
export { default as municipalityApi } from './modules/municipality.api';
export { default as notificationsApi } from './modules/notifications.api';
export { default as onboardingApi } from './modules/onboarding.api';
export { default as publicApi } from './modules/public.api';
export { default as staffApi } from './modules/staff.api';
export { default as superadminApi } from './modules/superadmin.api';

// Consolidated Master API Object
import authApi from './modules/auth.api';
import citizenApi from './modules/citizen.api';
import complaintsApi from './modules/complaints.api';
import departmentApi from './modules/department.api';
import municipalityApi from './modules/municipality.api';
import notificationsApi from './modules/notifications.api';
import onboardingApi from './modules/onboarding.api';
import publicApi from './modules/public.api';
import staffApi from './modules/staff.api';
import superadminApi from './modules/superadmin.api';

export const api = {
  auth: authApi,
  citizen: citizenApi,
  complaints: complaintsApi,
  department: departmentApi,
  municipality: municipalityApi,
  notifications: notificationsApi,
  onboarding: onboardingApi,
  public: publicApi,
  staff: staffApi,
  superadmin: superadminApi,
};

export default api;
