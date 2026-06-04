import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { UserRole } from "../../types/userRole.type";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (token: string, profile: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Load user from local storage when the app first loads
    const storedUser = localStorage.getItem("user_profile");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (token: string, profile: UserProfile) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("user_profile", JSON.stringify(profile));
    setUser(profile);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_profile");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
