import { useState } from "react";
import type { ReactNode } from "react";
import { AuthContext, type UserProfile } from "../../hooks/useAuth";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    const storedUser = localStorage.getItem("user_profile");
    return storedUser ? (JSON.parse(storedUser) as UserProfile) : null;
  });

  const login = (token: string, profile: UserProfile, refreshToken?: string) => {
    localStorage.setItem("access_token", token);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
    localStorage.setItem("user_profile", JSON.stringify(profile));
    setUser(profile);
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        await fetch("http://localhost:3000/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Failed to invalidate session on the server:", error);
    } finally {
      // Always clean up local state regardless of server response
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_profile");
      setUser(null);
    }
  };

  const kycCompleted = user
    ? user.role === "citizen"
      ? user.citizen_details?.kyc_status === "verified"
      : Boolean(
          user.identity_document_url ||
          (user.identity_type && user.identity_number)
        )
    : false;

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, kycCompleted, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
