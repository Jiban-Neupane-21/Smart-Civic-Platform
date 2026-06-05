import React, { useState } from "react";
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
  Link,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { loginSchema } from "../../validation/auth.schema";
import { useAuth } from "../../hooks/useAuth";
import { withRoleRedirect } from "./withRoleRedirect";

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

        const response = await fetch("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Login failed");
        }

        // Global state updates here. HOC catches it and redirects securely!
        if (result.data) {
          login(result.data.access_token, result.data.profile);
        } else {
          login(result.access_token, result.profile); // Fallback mapping
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Authentication failed. Please try again.";
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
