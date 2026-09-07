import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function GenericProfileRedirect() {
  const { user } = useAuth();
  const role = user?.role || "citizen";

  const target = `/${role.toLowerCase().replace(/_/g, "-")}/profile`;
  return <Navigate to={target} replace />;
}
