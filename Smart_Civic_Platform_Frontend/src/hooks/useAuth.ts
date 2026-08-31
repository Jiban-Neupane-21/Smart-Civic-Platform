import { createContext, useContext } from "react";
import type { UserRole } from "../types/userRole.type";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  municipality_id?: string;
  municipalityId?: string;
  departmentId?: string;
  force_password_reset?: boolean;
  account_status?: string;
  identity_type?: string;
  identity_number?: string;
  identity_document_url?: string;
  identity_verified_at?: string;
  citizen_details?: {
    kyc_status?: string;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  kycCompleted: boolean;
  login: (token: string, profile: UserProfile, refreshToken?: string) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
