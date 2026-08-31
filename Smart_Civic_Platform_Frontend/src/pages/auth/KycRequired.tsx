import React from "react";
import { Container, Box, Typography, Paper } from "@mui/material";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { KycUpload } from "../../components/kyc/KycUpload";
import type{ KycUploadPayload } from "../../components/kyc/KycUpload";

import { profileApi } from "../../api/modules/profile.api";
import { MunicipalityKycOnboarding } from "../../components/kyc/MunicipalityKycOnboarding";
import { DepartmentKycOnboarding } from "../../components/kyc/DepartmentKycOnboarding";
import { StaffKycOnboarding } from "../../components/kyc/StaffKycOnboarding";

const roleDashboard = (role: string): string => {
  switch (role) {
    case "superadmin":
      return "/superadmin/dashboard";
    case "municipality_head":
      return "/municipality_head/dashboard";
    case "department_head":
      return "/department_head/dashboard";
    case "staff":
      return "/staff/dashboard";
    case "citizen":
    default:
      return "/citizen/dashboard";
  }
};

const KycRequired: React.FC = () => {
  const { user, kycCompleted, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  // Guard: if not authenticated, bounce them to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Guard: if citizen or superadmin, skip to dashboard
  if (user.role === "citizen" || user.role === "superadmin") {
    return <Navigate to={roleDashboard(user.role)} replace />;
  }

  // Guard: if KYC already completed, skip to dashboard
  if (kycCompleted) {
    return <Navigate to={roleDashboard(user.role)} replace />;
  }

  // The backend might force password reset before KYC
  if (user.force_password_reset) {
    return <Navigate to="/change-password" replace />;
  }

  // Municipality heads need to fill out the full municipality profile wizard
  if (user.role === "municipality_head") {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#F9FAFB', py: 4 }}>
        <MunicipalityKycOnboarding />
      </Box>
    );
  }

  // Department heads need to fill out the department profile wizard
  if (user.role === "department_head") {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#F9FAFB', py: 4 }}>
        <DepartmentKycOnboarding />
      </Box>
    );
  }

  // Staff members complete the structured staff KYC onboarding wizard
  if (user.role === "staff") {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#F9FAFB', py: 4 }}>
        <StaffKycOnboarding />
      </Box>
    );
  }

  const handleKycSubmit = async (payload: KycUploadPayload) => {
    const data = await profileApi.updateIdentity(payload);

    // Update context user with the new identity fields from the backend
    const updatedProfile = {
      ...user,
      ...data.data, // profileService returns the updated row fields in data.data
    };

    const token = localStorage.getItem("access_token");
    if (token) {
      login(token, updatedProfile);
    }

    // Navigate to role dashboard
    navigate(roleDashboard(user.role), { replace: true });
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: "100%", borderRadius: 2 }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom fontWeight="bold">
            Action Required: Identity Verification
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Before accessing your administration dashboard, you must provide your verified identity document. This is a mandatory compliance step.
          </Typography>

          <KycUpload
            mode="single"
            mandatory={true}
            onSubmit={handleKycSubmit}
          />
        </Paper>
      </Box>
    </Container>
  );
};

export default KycRequired;
