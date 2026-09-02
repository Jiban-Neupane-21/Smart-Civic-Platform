import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import { changePasswordSchema } from "../../validation/auth.schema";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import authApi from "../../api/modules/auth.api";

function FirstLoginPasswordChange() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const { user, login, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Guard: if not authenticated, bounce them out
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const formik = useFormik({
    initialValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
    validationSchema: changePasswordSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const response = await authApi.changePassword({
          current_password: values.current_password,
          new_password: values.new_password,
        });

        const data = response.data;
        const newAccessToken = data?.access_token || localStorage.getItem("access_token") || "";
        const newRefreshToken = data?.refresh_token;
        if (newRefreshToken) {
          localStorage.setItem("refresh_token", newRefreshToken);
        }

        if (user) {
          const updatedProfile = {
            ...user,
            ...(data?.profile || {}),
            force_password_reset: false,
          };
          login(newAccessToken, updatedProfile, newRefreshToken);

          // If KYC is not completed for municipality/dept/staff, route to /kyc
          const kycCompleted = updatedProfile.role === "citizen"
            ? updatedProfile.citizen_details?.kyc_status === "verified"
            : Boolean(
                updatedProfile.identity_document_url ||
                (updatedProfile.identity_type && updatedProfile.identity_number)
              );

          if (["municipality_head", "department_head", "staff"].includes(updatedProfile.role) && !kycCompleted) {
            navigate("/kyc", { replace: true });
            return;
          }

          let dashboardRoute = "/";
          switch (updatedProfile.role) {
            case "superadmin":
              dashboardRoute = "/superadmin/dashboard";
              break;
            case "municipality_head":
              dashboardRoute = "/municipality_head/dashboard";
              break;
            case "department_head":
              dashboardRoute = "/department_head/dashboard";
              break;
            case "staff":
              dashboardRoute = "/staff/dashboard";
              break;
            case "citizen":
              dashboardRoute = "/citizen/dashboard";
              break;
          }
          navigate(dashboardRoute, { replace: true });
        }
      } catch (err: any) {
        // Axios errors wrap the real message in err.response.data.message
        const backendMessage = err?.response?.data?.message;
        setSubmitError(backendMessage || err.message || "Failed to change password. Please verify your current password.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Render nothing while redirecting unauthenticated
  if (!user) return null;

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
        <Paper elevation={3} sx={{ padding: 4, width: "100%", borderRadius: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
            <Box
              sx={{
                m: 1,
                bgcolor: user.force_password_reset ? "warning.main" : "primary.main",
                color: "white",
                borderRadius: "50%",
                p: 1,
                display: "flex",
              }}
            >
              <VpnKeyIcon />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: "bold", textAlign: "center" }}>
              {user.force_password_reset ? "Action Required: Update Password" : "Change Password"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
              {user.force_password_reset 
                ? "For security reasons, you must change your temporary password before proceeding into the platform."
                : "Update your account password. Please choose a strong password."}
            </Typography>
          </Box>

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <form onSubmit={formik.handleSubmit}>
            <TextField
              fullWidth
              id="current_password"
              name="current_password"
              label="Current Password"
              type={showCurrentPassword ? "text" : "password"}
              margin="normal"
              value={formik.values.current_password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.current_password && Boolean(formik.errors.current_password)}
              helperText={formik.touched.current_password && formik.errors.current_password}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end">
                        {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              fullWidth
              id="new_password"
              name="new_password"
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              margin="normal"
              value={formik.values.new_password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.new_password && Boolean(formik.errors.new_password)}
              helperText={formik.touched.new_password && formik.errors.new_password}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end">
                        {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              fullWidth
              id="confirm_password"
              name="confirm_password"
              label="Confirm New Password"
              type={showConfirmPassword ? "text" : "password"}
              margin="normal"
              value={formik.values.confirm_password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.confirm_password && Boolean(formik.errors.confirm_password)}
              helperText={formik.touched.confirm_password && formik.errors.confirm_password}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={formik.isSubmitting}
              sx={{ mt: 3, mb: 2, textTransform: "none", fontWeight: "bold" }}
            >
              {formik.isSubmitting ? "Updating Password..." : "Update Password & Continue"}
            </Button>
            
            {user.force_password_reset && (
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
                disabled={formik.isSubmitting}
                sx={{ textTransform: "none", fontWeight: "bold" }}
              >
                Log Out Instead
              </Button>
            )}
          </form>
        </Paper>
      </Box>
    </Container>
  );
}

export default FirstLoginPasswordChange;
