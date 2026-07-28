export type UserRole = 
  | 'citizen' 
  | 'staff' 
  | 'department_head' 
  | 'municipality_head' 
  | 'superadmin';

export type AccountStatus = 
  | 'invited' 
  | 'pending_onboarding' 
  | 'active' 
  | 'expired' 
  | 'suspended';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: AccountStatus;
  phoneNumber?: string;
  municipalityId?: string;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  citizen_details?: {
    home_address?: string;
    permanent_address?: string;
    ward_number?: number;
    citizenship_no?: string;
  };
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegisterRequest {
  email: string;
  password?: string;
  fullName: string;
  role?: UserRole;
  phoneNumber?: string;
  municipalityId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface AuthResponseData {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface SendOtpRequest {
  phoneNumber: string;
  purpose?: 'login' | 'verify' | 'reset_password';
}

export interface VerifyOtpRequest {
  phoneNumber: string;
  code: string;
}

export interface MobileLoginRequest {
  phoneNumber: string;
  code: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword?: string;
}
