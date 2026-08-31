import React, { useState } from "react";
import { useFormik } from "formik";
import axios from "axios";
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
  Link,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { loginSchema } from "../../validation/auth.schema";
import { useAuth } from "../../hooks/useAuth";
import { withRoleRedirect } from "./withRoleRedirect";
import { authApi } from "../../api/modules/auth.api";

function LoginBase() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { login } = useAuth();

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitError(null);

        const result = await authApi.login(values);

        console.log("Login successful. Server response:", result);

        const responseData = result.data as any;
        const profile = responseData?.profile || responseData?.user || (result as any).profile;
        const accessToken = responseData?.access_token || responseData?.tokens?.accessToken || (result as any).access_token;
        const refreshToken = responseData?.refresh_token || responseData?.tokens?.refreshToken || (result as any).refresh_token;

        if (!profile || !accessToken) {
          throw new Error("User profile not found. Please contact administrator.");
        }

        console.log(`Login Email: ${profile?.email} | Role: ${profile?.role}`);
        login(accessToken, profile, refreshToken);
      } catch (err: unknown) {
        let errorMessage = "Authentication failed. Please try again.";

        if (axios.isAxiosError(err)) {
          if (err.response?.status === 429) {
            errorMessage =
              (typeof err.response.data === "object" && err.response.data?.message) ||
              "Too many requests. Please wait a few moments and try again.";
          } else if (err.response?.data && typeof err.response.data === "object" && "message" in err.response.data) {
            errorMessage = String(err.response.data.message);
          } else if (err.response?.status === 401) {
            errorMessage = "Invalid email or password. Please try again.";
          } else if (!err.response) {
            errorMessage = "Cannot connect to server. Please ensure the backend is running.";
          } else if (err.message) {
            errorMessage = err.message;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        setSubmitError(errorMessage);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{ padding: 4, width: "100%", borderRadius: 2 }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Box
              sx={{
                m: 1,
                bgcolor: "primary.main",
                color: "white",
                borderRadius: "50%",
                p: 1,
                display: "flex",
              }}
            >
              <LockOutlinedIcon />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              Smart Civic Platform
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Sign in to manage municipal services
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
              id="email"
              name="email"
              label="Email Address"
              margin="normal"
              autoComplete="email"
              autoFocus
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />

            <TextField
              fullWidth
              id="password"
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              margin="normal"
              autoComplete="current-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
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
              {formik.isSubmitting ? "Signing in..." : "Sign In"}
            </Button>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}
            >
              <Link href="#" variant="body2" underline="hover">
                Forgot password?
              </Link>
              <Link href="/register" variant="body2" underline="hover">
                {"Don't have an account? Sign Up"}
              </Link>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}

export default withRoleRedirect(LoginBase);
