import React, { useState, useMemo, useCallback } from "react";
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
  Divider,
} from "@mui/material";
import { registerSchema } from "../../validation/auth.schema";
import { PROVINCES } from "@data/lists/provinces";
import { MUNICIPALITIES_BY_DISTRICT } from "@data/lists/municipalities";

function splitFullName(fullName: string): {
  firstName: string;
  middleName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
    return { firstName: "", middleName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: "", lastName: parts[0] };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: "", lastName: parts[1] };
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

const PROVINCE_OPTIONS = PROVINCES.map((p) => ({ id: p.id, name: p.name }));

function getDistrictsForProvince(provinceId: string): string[] {
  const province = PROVINCES.find((p) => p.id === provinceId);
  return province ? province.districts : [];
}

function getMunicipalitiesForDistrict(district: string) {
  return MUNICIPALITIES_BY_DISTRICT[district] || [];
}

function composeAddress(
  provinceName: string,
  districtName: string,
  municipalityName: string,
  ward: string,
): string {
  let addr = `${municipalityName}, ${districtName}, ${provinceName}`;
  if (ward.trim()) {
    addr += ` - ${ward.trim()}`;
  }
  return addr;
}

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
      middleName: "",
      lastName: "",
      gender: "",
      permanentProvince: "",
      permanentDistrict: "",
      permanentMunicipality: "",
      permanentWard: "",
      tempSameAsPermanent: true,
      tempProvince: "",
      tempDistrict: "",
      tempMunicipality: "",
      tempWard: "",
      registrationCode: "",
      acceptTerms: false,
    },
    validationSchema: registerSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitError(null);

        if (!values.lastName) {
          const { firstName, middleName, lastName } = splitFullName(values.fullName);
          values.firstName = firstName;
          values.middleName = middleName;
          values.lastName = lastName;
        }

        const permProvince = PROVINCES.find(
          (p) => p.id === values.permanentProvince,
        );
        const permDistrict = values.permanentDistrict;
        const permMunicipality = values.permanentMunicipality;
        const fullAddress = composeAddress(
          permProvince?.name || "",
          permDistrict,
          permMunicipality,
          values.permanentWard,
        );

        let currentAddress = fullAddress;
        if (!values.tempSameAsPermanent) {
          const tempProvince = PROVINCES.find(
            (p) => p.id === values.tempProvince,
          );
          currentAddress = composeAddress(
            tempProvince?.name || "",
            values.tempDistrict,
            values.tempMunicipality,
            values.tempWard,
          );
        }

        const payload: Record<string, unknown> = {
          first_name: values.firstName,
          middle_name: values.middleName || undefined,
          last_name: values.lastName,
          email: values.email,
          password: values.password,
          phone: values.phone || undefined,
          gender: values.gender || undefined,
          full_address: fullAddress,
          current_address: currentAddress,
        };

        const response = await fetch(
          "http://localhost:3000/api/auth/register",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
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

  const handleFullNameBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      formik.handleBlur(e);
      const { firstName, middleName, lastName } = splitFullName(
        formik.values.fullName,
      );
      formik.setFieldValue("firstName", firstName);
      formik.setFieldValue("middleName", middleName);
      formik.setFieldValue("lastName", lastName);
    },
    [formik.values.fullName, formik.setFieldValue, formik.handleBlur],
  );

  const permDistrictOptions = useMemo(
    () => getDistrictsForProvince(formik.values.permanentProvince),
    [formik.values.permanentProvince],
  );

  const permMunicipalityOptions = useMemo(
    () => getMunicipalitiesForDistrict(formik.values.permanentDistrict),
    [formik.values.permanentDistrict],
  );

  const tempDistrictOptions = useMemo(
    () => getDistrictsForProvince(formik.values.tempProvince),
    [formik.values.tempProvince],
  );

  const tempMunicipalityOptions = useMemo(
    () => getMunicipalitiesForDistrict(formik.values.tempDistrict),
    [formik.values.tempDistrict],
  );

  const handlePermProvinceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      formik.handleChange(e);
      formik.setFieldValue("permanentDistrict", "");
      formik.setFieldValue("permanentMunicipality", "");
    },
    [formik.handleChange, formik.setFieldValue],
  );

  const handlePermDistrictChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      formik.handleChange(e);
      formik.setFieldValue("permanentMunicipality", "");
    },
    [formik.handleChange, formik.setFieldValue],
  );

  const handleTempProvinceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      formik.handleChange(e);
      formik.setFieldValue("tempDistrict", "");
      formik.setFieldValue("tempMunicipality", "");
    },
    [formik.handleChange, formik.setFieldValue],
  );

  const handleTempDistrictChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      formik.handleChange(e);
      formik.setFieldValue("tempMunicipality", "");
    },
    [formik.handleChange, formik.setFieldValue],
  );

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
              {/* --- Personal Information --- */}
              <Grid size={{ xs: 12 }}>
                <Typography
                  variant="subtitle2"
                  color="primary"
                  sx={{ fontWeight: "bold" }}
                >
                  Personal Information
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  id="fullName"
                  name="fullName"
                  label="Full Name"
                  placeholder="e.g. Ram Prasad Sharma"
                  value={formik.values.fullName}
                  onChange={formik.handleChange}
                  onBlur={handleFullNameBlur}
                  error={
                    formik.touched.fullName && Boolean(formik.errors.fullName)
                  }
                  helperText={formik.touched.fullName && formik.errors.fullName}
                />
              </Grid>

              {formik.values.firstName && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="text.secondary">
                    Detected:{" "}
                    <strong>
                      {formik.values.firstName}
                      {formik.values.middleName && ` ${formik.values.middleName}`}
                      {formik.values.lastName && ` ${formik.values.lastName}`}
                    </strong>
                    {formik.values.middleName
                      ? " (First · Middle · Last)"
                      : " (First · Last)"}
                  </Typography>
                </Grid>
              )}

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
                  error={
                    formik.touched.email && Boolean(formik.errors.email)
                  }
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
                  error={
                    formik.touched.phone && Boolean(formik.errors.phone)
                  }
                  helperText={formik.touched.phone && formik.errors.phone}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  id="gender"
                  name="gender"
                  label="Gender"
                  value={formik.values.gender}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.gender && Boolean(formik.errors.gender)
                  }
                  helperText={formik.touched.gender && formik.errors.gender}
                >
                  <MenuItem value="">-- Select Gender --</MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                  <MenuItem value="prefer_not_to_say">
                    Prefer Not To Say
                  </MenuItem>
                </TextField>
              </Grid>

              {/* --- Account Credentials --- */}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant="subtitle2"
                  color="primary"
                  sx={{ fontWeight: "bold" }}
                >
                  Account Credentials
                </Typography>
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
                    formik.touched.password &&
                    Boolean(formik.errors.password)
                  }
                  helperText={
                    formik.touched.password && formik.errors.password
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  autoComplete="new-password"
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

              {/* --- Permanent Address --- */}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant="subtitle2"
                  color="primary"
                  sx={{ fontWeight: "bold" }}
                >
                  Permanent Address
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  fullWidth
                  id="permanentProvince"
                  name="permanentProvince"
                  label="Province"
                  value={formik.values.permanentProvince}
                  onChange={handlePermProvinceChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.permanentProvince &&
                    Boolean(formik.errors.permanentProvince)
                  }
                  helperText={
                    formik.touched.permanentProvince &&
                    formik.errors.permanentProvince
                  }
                >
                  <MenuItem value="">-- Select Province --</MenuItem>
                  {PROVINCE_OPTIONS.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  fullWidth
                  id="permanentDistrict"
                  name="permanentDistrict"
                  label="District"
                  value={formik.values.permanentDistrict}
                  onChange={handlePermDistrictChange}
                  onBlur={formik.handleBlur}
                  disabled={!formik.values.permanentProvince}
                  error={
                    formik.touched.permanentDistrict &&
                    Boolean(formik.errors.permanentDistrict)
                  }
                  helperText={
                    formik.touched.permanentDistrict &&
                    formik.errors.permanentDistrict
                  }
                >
                  <MenuItem value="">-- Select District --</MenuItem>
                  {permDistrictOptions.map((d) => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  fullWidth
                  id="permanentMunicipality"
                  name="permanentMunicipality"
                  label="Municipality"
                  value={formik.values.permanentMunicipality}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={!formik.values.permanentDistrict}
                  error={
                    formik.touched.permanentMunicipality &&
                    Boolean(formik.errors.permanentMunicipality)
                  }
                  helperText={
                    formik.touched.permanentMunicipality &&
                    formik.errors.permanentMunicipality
                  }
                >
                  <MenuItem value="">-- Select Municipality --</MenuItem>
                  {permMunicipalityOptions.map((m) => (
                    <MenuItem key={m.name} value={m.name}>
                      {m.name} ({m.type.replace(/_/g, " ")})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id="permanentWard"
                  name="permanentWard"
                  label="Ward / Tole (Optional)"
                  placeholder="e.g. Ward 5"
                  value={formik.values.permanentWard}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Grid>

              {/* --- Temporary Address --- */}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant="subtitle2"
                  color="primary"
                  sx={{ fontWeight: "bold" }}
                >
                  Temporary Address
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      id="tempSameAsPermanent"
                      name="tempSameAsPermanent"
                      color="primary"
                      checked={formik.values.tempSameAsPermanent}
                      onChange={formik.handleChange}
                    />
                  }
                  label="Same as permanent address"
                />
              </Grid>

              {!formik.values.tempSameAsPermanent && (
                <>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      select
                      fullWidth
                      id="tempProvince"
                      name="tempProvince"
                      label="Province"
                      value={formik.values.tempProvince}
                      onChange={handleTempProvinceChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.tempProvince &&
                        Boolean(formik.errors.tempProvince)
                      }
                      helperText={
                        formik.touched.tempProvince &&
                        formik.errors.tempProvince
                      }
                    >
                      <MenuItem value="">-- Select Province --</MenuItem>
                      {PROVINCE_OPTIONS.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      select
                      fullWidth
                      id="tempDistrict"
                      name="tempDistrict"
                      label="District"
                      value={formik.values.tempDistrict}
                      onChange={handleTempDistrictChange}
                      onBlur={formik.handleBlur}
                      disabled={!formik.values.tempProvince}
                      error={
                        formik.touched.tempDistrict &&
                        Boolean(formik.errors.tempDistrict)
                      }
                      helperText={
                        formik.touched.tempDistrict &&
                        formik.errors.tempDistrict
                      }
                    >
                      <MenuItem value="">-- Select District --</MenuItem>
                      {tempDistrictOptions.map((d) => (
                        <MenuItem key={d} value={d}>
                          {d}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      select
                      fullWidth
                      id="tempMunicipality"
                      name="tempMunicipality"
                      label="Municipality"
                      value={formik.values.tempMunicipality}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled={!formik.values.tempDistrict}
                      error={
                        formik.touched.tempMunicipality &&
                        Boolean(formik.errors.tempMunicipality)
                      }
                      helperText={
                        formik.touched.tempMunicipality &&
                        formik.errors.tempMunicipality
                      }
                    >
                      <MenuItem value="">-- Select Municipality --</MenuItem>
                      {tempMunicipalityOptions.map((m) => (
                        <MenuItem key={m.name} value={m.name}>
                          {m.name} ({m.type.replace(/_/g, " ")})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              id="password"
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
            />
                  </Grid>
                </>
              )}

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
                <Divider sx={{ my: 1 }} />
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
                ? "Registering..."
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
