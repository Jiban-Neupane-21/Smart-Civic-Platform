import React, { useState } from "react";
import { useFormik } from "formik";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Grid,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Alert,
  Link,
} from "@mui/material";
import { registerSchema } from "../../validation/auth.schema";

export const Register: React.FC = () => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const formik = useFormik({
    initialValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      gender: "",
      wardNumber: "",
      homeAddress: "",
      registrationCode: "",
      acceptTerms: false,
    },
    validationSchema: registerSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitError(null);

        const response = await fetch(
          "http://localhost:3000/api/auth/register",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              first_name: values.firstName,
              last_name: values.lastName,
              email: values.email,
              password: values.password,
              phone: values.phone || undefined,
              full_address: values.homeAddress || undefined,
            }),
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Registration failed.");
        }

        setIsSuccess(true);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Registration failed. Verification rules broken.";
        setSubmitError(errorMessage);
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (isSuccess) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper
          elevation={3}
          sx={{ p: 4, textAlign: "center", borderRadius: 2 }}
        >
          <Typography
            variant="h4"
            gutterBottom
            sx={{ fontWeight: "bold" }}
            color="success.main"
          >
            Registration Successful!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Please check your inbox at <strong>{formik.values.email}</strong> to
            verify your account and activate your civic profile.
          </Typography>
          <Button href="/login" variant="contained">
            Go to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm" sx={{ mb: 4 }}>
      <Box
        sx={{
          marginTop: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{ padding: 4, width: "100%", borderRadius: 2 }}
        >
          <Box sx={{ mb: 3, textAlign: "center" }}>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              Create Citizen Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Join the platform to log complaints, view updates, and connect
              with local governance
            </Typography>
          </Box>

          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {submitError}
            </Alert>
          )}

          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={2}>
              {/* --- Core Identity --- */}
              <Grid size={{ xs: 12 }}>
                <Typography
                  variant="subtitle2"
                  color="primary"
                  sx={{ fontWeight: "bold" }}
                >
                  Account Credentials
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  id="fullName"
                  name="fullName"
                  label="Display Full Name"
                  value={formik.values.fullName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.fullName && Boolean(formik.errors.fullName)
                  }
                  helperText={formik.touched.fullName && formik.errors.fullName}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  label="Email Address"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id="phone"
                  name="phone"
                  label="Phone Number (Optional)"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.phone && Boolean(formik.errors.phone)}
                  helperText={formik.touched.phone && formik.errors.phone}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id="password"
                  name="password"
                  label="Password"
                  type="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.password && Boolean(formik.errors.password)
                  }
                  helperText={formik.touched.password && formik.errors.password}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.confirmPassword &&
                    Boolean(formik.errors.confirmPassword)
                  }
                  helperText={
                    formik.touched.confirmPassword &&
                    formik.errors.confirmPassword
                  }
                />
              </Grid>

              {/* --- Structural Citizen Details --- */}
              <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                {" "}
                <Typography
                  variant="subtitle2"
                  color="primary"
                  sx={{ fontWeight: "bold" }}
                >
                  Demographic & Ward Information
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id="firstName"
                  name="firstName"
                  label="First Name"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.firstName && Boolean(formik.errors.firstName)
                  }
                  helperText={
                    formik.touched.firstName && formik.errors.firstName
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id="lastName"
                  name="lastName"
                  label="Last Name"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.lastName && Boolean(formik.errors.lastName)
                  }
                  helperText={formik.touched.lastName && formik.errors.lastName}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  id="gender"
                  name="gender"
                  label="Gender"
                  value={formik.values.gender}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.gender && Boolean(formik.errors.gender)}
                  helperText={formik.touched.gender && formik.errors.gender}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                  <MenuItem value="prefer_not_to_say">
                    Prefer Not To Say
                  </MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id="wardNumber"
                  name="wardNumber"
                  label="Ward Number"
                  value={formik.values.wardNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.wardNumber &&
                    Boolean(formik.errors.wardNumber)
                  }
                  helperText={
                    formik.touched.wardNumber && formik.errors.wardNumber
                  }
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  id="homeAddress"
                  name="homeAddress"
                  label="Home Address Street Details"
                  value={formik.values.homeAddress}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.homeAddress &&
                    Boolean(formik.errors.homeAddress)
                  }
                  helperText={
                    formik.touched.homeAddress && formik.errors.homeAddress
                  }
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  id="registrationCode"
                  name="registrationCode"
                  label="Municipality Verification Code (If applicable)"
                  value={formik.values.registrationCode}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.registrationCode &&
                    Boolean(formik.errors.registrationCode)
                  }
                  helperText={
                    formik.touched.registrationCode &&
                    formik.errors.registrationCode
                  }
                />
              </Grid>

              {/* --- Legal Agreement --- */}
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      id="acceptTerms"
                      name="acceptTerms"
                      color="primary"
                      checked={formik.values.acceptTerms}
                      onChange={formik.handleChange}
                    />
                  }
                  label="I verify that all municipal declaration data provided above is legally sound."
                />
                {formik.touched.acceptTerms && formik.errors.acceptTerms && (
                  <FormHelperText error>
                    {formik.errors.acceptTerms}
                  </FormHelperText>
                )}
              </Grid>
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={formik.isSubmitting}
              sx={{ mt: 3, mb: 2, textTransform: "none", fontWeight: "bold" }}
            >
              {formik.isSubmitting
                ? "Registering Structural Profile..."
                : "Complete Profile Setup"}
            </Button>

            <Box sx={{ textAlign: "center", mt: 1 }}>
              <Link href="/login" variant="body2" underline="hover">
                Already registered? Sign In instead
              </Link>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};
