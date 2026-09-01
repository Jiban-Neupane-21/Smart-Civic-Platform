import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
  allowedRoles?: string[]; // E.g., ["superadmin", "municipality_head"]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, kycCompleted } = useAuth();

  // 1. If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. If the user must reset their password, redirect to change-password
  if (user.force_password_reset && !["superadmin", "citizen"].includes(user.role)) {
    return <Navigate to="/change-password" replace />;
  }

  // Check mandatory KYC for admins
  if (["municipality_head", "department_head", "staff"].includes(user.role) && !kycCompleted) {
    return <Navigate to="/kyc" replace />;
  }

  // 3. If the route is restricted by roles and the user doesn't have permission
  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role as string)
  ) {
    // Redirect them to their own respective dashboard securely
    switch (user.role as string) {
      case "superadmin":
        return <Navigate to="/superadmin/dashboard" replace />;
      case "municipality_head":
        return <Navigate to="/municipality_head/dashboard" replace />;
      case "department_head":
        return <Navigate to="/department_head/dashboard" replace />;
      case "staff":
        return <Navigate to="/staff/dashboard" replace />;
      case "citizen":
      default:
        return <Navigate to="/citizen/dashboard" replace />;
    }
  }

  // 3. Authenticated and Authorized: render the child routes inside <Outlet />
  return <Outlet />;
};

export default ProtectedRoute;
