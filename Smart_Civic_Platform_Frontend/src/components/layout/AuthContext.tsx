import { useState } from "react";
import type { ReactNode } from "react";
import { AuthContext, type UserProfile } from "../../hooks/useAuth";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    const storedUser = localStorage.getItem("user_profile");
    return storedUser ? (JSON.parse(storedUser) as UserProfile) : null;
  });

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
