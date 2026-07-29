import React, { useState, useEffect, useCallback } from "react";
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
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  InputLabel,
  FormControl,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import { registerSchema } from "../../validation/auth.schema";
import apiClient, { API_BASE_URL } from "../../api/client";
import { citizenApi, publicApi } from "../../api";
import { useAuth } from "../../hooks/useAuth";
import type {
  Province,
  District,
  Municipality,
  Ward,
} from "../../api/types";

const STEPS = ["Personal Info", "Address", "Credentials", "Complete"];

export const Register: React.FC = () => {
  const { login } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regToken, setRegToken] = useState<string | null>(null);
  const [regProfile, setRegProfile] = useState<any>(null);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [provincesError, setProvincesError] = useState<string | null>(null);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const [permProvinceId, setPermProvinceId] = useState("");
  const [permDistrictId, setPermDistrictId] = useState("");
  const [permMunicipalityId, setPermMunicipalityId] = useState("");
  const [permWardId, setPermWardId] = useState("");
  const [permTole, setPermTole] = useState("");

  const [sameAsPermanent, setSameAsPermanent] = useState(true);
  const [currProvinceId, setCurrProvinceId] = useState("");
  const [currDistrictId, setCurrDistrictId] = useState("");
  const [currMunicipalityId, setCurrMunicipalityId] = useState("");
  const [currWardId, setCurrWardId] = useState("");
  const [currTole, setCurrTole] = useState("");

  const [currDistricts, setCurrDistricts] = useState<District[]>([]);
  const [currMunicipalities, setCurrMunicipalities] = useState<Municipality[]>([]);
  const [currWards, setCurrWards] = useState<Ward[]>([]);
  const [loadingCurrDistricts, setLoadingCurrDistricts] = useState(false);
  const [loadingCurrMunicipalities, setLoadingCurrMunicipalities] = useState(false);
  const [loadingCurrWards, setLoadingCurrWards] = useState(false);

  const [identityType, setIdentityType] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycUploading, setKycUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingProvinces(true);
    setProvincesError(null);
    publicApi.getProvinces()
      .then((res) => {
        if (!cancelled) {
          if (res.success) {
            setProvinces(res.data);
          } else {
            setProvincesError(res.message || "Failed to load provinces");
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Network error loading provinces";
          setProvincesError(msg);
          console.error("Provinces fetch error:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleProvinceChange = useCallback(async (value: string) => {
    setPermProvinceId(value);
    setPermDistrictId("");
    setPermMunicipalityId("");
    setPermWardId("");
    setDistricts([]);
    setMunicipalities([]);
    setWards([]);
    if (!value) return;
    setLoadingDistricts(true);
    const res = await publicApi.getDistricts(value);
    if (res.success) setDistricts(res.data);
    setLoadingDistricts(false);
  }, []);

  const handleDistrictChange = useCallback(async (value: string) => {
    setPermDistrictId(value);
    setPermMunicipalityId("");
    setPermWardId("");
    setMunicipalities([]);
    setWards([]);
    if (!value) return;
    setLoadingMunicipalities(true);
    const res = await publicApi.getMunicipalities(value);
    if (res.success) setMunicipalities(res.data);
    setLoadingMunicipalities(false);
  }, []);

  const handleMunicipalityChange = useCallback(async (value: string) => {
    setPermMunicipalityId(value);
    setPermWardId("");
    setWards([]);
    if (!value) return;
    setLoadingWards(true);
    const res = await publicApi.getWards(value);
    if (res.success) setWards(res.data);
    setLoadingWards(false);
  }, []);

  const handleCurrProvinceChange = useCallback(async (value: string) => {
    setCurrProvinceId(value);
    setCurrDistrictId("");
    setCurrMunicipalityId("");
    setCurrWardId("");
    setCurrDistricts([]);
    setCurrMunicipalities([]);
    setCurrWards([]);
    if (!value) return;
    setLoadingCurrDistricts(true);
    const res = await publicApi.getDistricts(value);
    if (res.success) setCurrDistricts(res.data);
    setLoadingCurrDistricts(false);
  }, []);

  const handleCurrDistrictChange = useCallback(async (value: string) => {
    setCurrDistrictId(value);
    setCurrMunicipalityId("");
    setCurrWardId("");
    setCurrMunicipalities([]);
    setCurrWards([]);
    if (!value) return;
    setLoadingCurrMunicipalities(true);
    const res = await publicApi.getMunicipalities(value);
    if (res.success) setCurrMunicipalities(res.data);
    setLoadingCurrMunicipalities(false);
  }, []);

  const handleCurrMunicipalityChange = useCallback(async (value: string) => {
    setCurrMunicipalityId(value);
    setCurrWardId("");
    setCurrWards([]);
    if (!value) return;
    setLoadingCurrWards(true);
    const res = await publicApi.getWards(value);
    if (res.success) setCurrWards(res.data);
    setLoadingCurrWards(false);
  }, []);

  const formik = useFormik({
    initialValues: {
      fullName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      password: "",
      registrationCode: "",
      acceptTerms: false,
    },
    validationSchema: registerSchema,
    onSubmit: async () => {},
  });

  const canGoNext = useCallback(() => {
    if (activeStep === 0) {
      return !!(
        formik.values.fullName &&
        formik.values.email &&
        formik.values.dateOfBirth &&
        formik.values.gender &&
        !formik.errors.fullName &&
        !formik.errors.email &&
        !formik.errors.phone &&
        !formik.errors.dateOfBirth &&
        !formik.errors.gender
      );
    }
    if (activeStep === 1) {
      if (!permProvinceId || !permDistrictId || !permMunicipalityId || !permWardId) return false;
      if (!sameAsPermanent) {
        if (!currProvinceId || !currDistrictId || !currMunicipalityId || !currWardId) return false;
      }
      return true;
    }
    if (activeStep === 2) {
      return !!(
        formik.values.password &&
        formik.values.acceptTerms &&
        !formik.errors.password
      );
    }
    return false;
  }, [activeStep, formik.values, formik.errors, permProvinceId, permDistrictId, permMunicipalityId, permWardId, sameAsPermanent, currProvinceId, currDistrictId, currMunicipalityId, currWardId]);

  const handleNext = async () => {
    setSubmitError(null);

    if (activeStep === 2) {
      await handleRegister();
      return;
    }

    if (activeStep < 3) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleRegister = async () => {
    setIsSubmitting(true);
    try {
      const registerRes = await apiClient.post(`${API_BASE_URL}/auth/register`, {
        email: formik.values.email,
        password: formik.values.password,
        full_name: formik.values.fullName,
        phone: formik.values.phone || undefined,
        date_of_birth: formik.values.dateOfBirth,
        gender: formik.values.gender,
      });

      const registerData = registerRes.data;
      if (!registerData.success) {
        throw new Error(registerData.message || "Registration failed");
      }

      const token = registerData.data?.access_token || registerData.data?.tokens?.accessToken;
      const profile = registerData.data?.profile || registerData.data?.user;

      if (!token || !profile) {
        throw new Error("Invalid registration response");
      }

      setRegToken(token);
      setRegProfile(profile);

      const buildAddressString = (provId: string, distId: string, muniId: string, wardId: string, tole: string, dList: typeof districts, mList: typeof municipalities, wList: typeof wards) => {
        const prov = provinces.find(p => p.id === provId)?.name || "";
        const dist = dList.find(d => d.id === distId)?.name || "";
        const muni = mList.find(m => m.id === muniId)?.official_name || "";
        const ward = wList.find(w => w.id === wardId)?.ward_no || "";
        
        const parts = [];
        if (tole) parts.push(tole);
        if (ward) parts.push(`Ward ${ward}`);
        if (muni) parts.push(muni);
        if (dist) parts.push(dist);
        if (prov) parts.push(prov);
        return parts.join(", ");
      };

      const permAddress = {
        province_id: permProvinceId,
        district_id: permDistrictId,
        municipality_id: permMunicipalityId,
        ward_id: permWardId,
        tole: permTole || undefined,
        full_address: buildAddressString(permProvinceId, permDistrictId, permMunicipalityId, permWardId, permTole, districts, municipalities, wards),
      };

      let currAddress = permAddress;
      if (!sameAsPermanent) {
        currAddress = {
          province_id: currProvinceId,
          district_id: currDistrictId,
          municipality_id: currMunicipalityId,
          ward_id: currWardId,
          tole: currTole || undefined,
          full_address: buildAddressString(currProvinceId, currDistrictId, currMunicipalityId, currWardId, currTole, currDistricts, currMunicipalities, currWards),
        };
      }

      login(token, profile);

      await citizenApi.updateAddress({
        permanent: permAddress,
        current: currAddress,
      });

      setActiveStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (side: "front" | "back") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setKycError("File size must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (side === "front") setFrontImage(base64);
      else setBackImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleKycSubmit = async () => {
    setKycError(null);
    if (!identityType || !identityNumber || !frontImage || !backImage) {
      setKycError("All fields are required");
      return;
    }
    setKycUploading(true);
    try {
      await citizenApi.uploadIdentity({
        identity_type: identityType as any,
        identity_number: identityNumber,
        front_image: frontImage,
        back_image: backImage,
      });
      setKycSubmitted(true);
    } catch (err: unknown) {
      setKycError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setKycUploading(false);
    }
  };

  const isStepValid = (step: number) => {
    if (step === activeStep) return true;
    if (step === 0) return !!formik.values.fullName;
    if (step === 1) return !!permProvinceId;
    if (step === 2) return !!formik.values.password;
    return true;
  };

  const renderPersonalInfo = () => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          id="fullName"
          name="fullName"
          label="Full Name"
          placeholder="e.g. Ram Prasad Sharma"
          value={formik.values.fullName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.fullName && Boolean(formik.errors.fullName)}
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
          label="Phone Number"
          placeholder="+977-98XXXXXXXX"
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
          id="dateOfBirth"
          name="dateOfBirth"
          label="Date of Birth"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={formik.values.dateOfBirth}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.dateOfBirth && Boolean(formik.errors.dateOfBirth)}
          helperText={formik.touched.dateOfBirth && formik.errors.dateOfBirth}
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
          error={formik.touched.gender && Boolean(formik.errors.gender)}
          helperText={formik.touched.gender && formik.errors.gender}
        >
          <MenuItem value="">-- Select Gender --</MenuItem>
          <MenuItem value="male">Male</MenuItem>
          <MenuItem value="female">Female</MenuItem>
          <MenuItem value="other">Other</MenuItem>
          <MenuItem value="prefer_not_to_say">Prefer Not To Say</MenuItem>
        </TextField>
      </Grid>
    </Grid>
  );

  const renderAddressCascade = (
    label: string,
    provId: string,
    setProvId: (v: string) => void,
    distId: string,
    setDistId: (v: string) => void,
    muniId: string,
    setMuniId: (v: string) => void,
    wardId: string,
    setWardId: (v: string) => void,
    tole: string,
    setTole: (v: string) => void,
    distList: District[],
    setDistList: (v: District[]) => void,
    muniList: Municipality[],
    setMuniList: (v: Municipality[]) => void,
    wardList: Ward[],
    setWardList: (v: Ward[]) => void,
    loadDist: boolean,
    loadMuni: boolean,
    loadWard: boolean,
    onProvChange: (v: string) => void,
    onDistChange: (v: string) => void,
    onMuniChange: (v: string) => void,
  ) => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: "bold" }}>
          {label}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 3 }}>
        <FormControl fullWidth error={!!provincesError}>
          <InputLabel id={`${label}-province-label`}>Province</InputLabel>
          <Select
            labelId={`${label}-province-label`}
            value={provId}
            label="Province"
            onChange={(e: SelectChangeEvent) => onProvChange(e.target.value)}
            disabled={loadingProvinces || !!provincesError}
            endAdornment={loadingProvinces ? <CircularProgress size={20} sx={{ mr: 2 }} /> : undefined}
          >
            <MenuItem value="">-- Select Province --</MenuItem>
            {provinces.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
          {provincesError && (
            <FormHelperText>{provincesError}</FormHelperText>
          )}
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, sm: 3 }}>
        <FormControl fullWidth disabled={!provId}>
          <InputLabel id={`${label}-district-label`}>District</InputLabel>
          <Select
            labelId={`${label}-district-label`}
            value={distId}
            label="District"
            onChange={(e: SelectChangeEvent) => onDistChange(e.target.value)}
            endAdornment={loadDist ? <CircularProgress size={20} sx={{ mr: 2 }} /> : undefined}
          >
            <MenuItem value="">-- Select District --</MenuItem>
            {distList.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, sm: 3 }}>
        <FormControl fullWidth disabled={!distId}>
          <InputLabel id={`${label}-municipality-label`}>Municipality</InputLabel>
          <Select
            labelId={`${label}-municipality-label`}
            value={muniId}
            label="Municipality"
            onChange={(e: SelectChangeEvent) => onMuniChange(e.target.value)}
            endAdornment={loadMuni ? <CircularProgress size={20} sx={{ mr: 2 }} /> : undefined}
          >
            <MenuItem value="">-- Select Municipality --</MenuItem>
            {muniList.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.official_name} {m.local_level_type ? `(${m.local_level_type.replace(/_/g, " ")})` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, sm: 3 }}>
        <FormControl fullWidth disabled={!muniId}>
          <InputLabel id={`${label}-ward-label`}>Ward</InputLabel>
          <Select
            labelId={`${label}-ward-label`}
            value={wardId}
            label="Ward"
            onChange={(e: SelectChangeEvent) => setWardId(e.target.value)}
            endAdornment={loadWard ? <CircularProgress size={20} sx={{ mr: 2 }} /> : undefined}
          >
            <MenuItem value="">-- Select Ward --</MenuItem>
            {wardList.map((w) => (
              <MenuItem key={w.id} value={w.id}>Ward {w.ward_no}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label="Tole (Optional)"
          placeholder="e.g. Chabahil"
          value={tole}
          onChange={(e) => setTole(e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderAddress = () => (
    <Grid container spacing={2}>
      {renderAddressCascade(
        "Permanent Address",
        permProvinceId, setPermProvinceId,
        permDistrictId, setPermDistrictId,
        permMunicipalityId, setPermMunicipalityId,
        permWardId, setPermWardId,
        permTole, setPermTole,
        districts, setDistricts,
        municipalities, setMunicipalities,
        wards, setWards,
        loadingDistricts, loadingMunicipalities, loadingWards,
        handleProvinceChange,
        handleDistrictChange,
        handleMunicipalityChange,
      )}

      <Grid size={{ xs: 12 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={sameAsPermanent}
              onChange={(e) => setSameAsPermanent(e.target.checked)}
              color="primary"
            />
          }
          label="Same as permanent address"
        />
      </Grid>

      {!sameAsPermanent && renderAddressCascade(
        "Current Address",
        currProvinceId, setCurrProvinceId,
        currDistrictId, setCurrDistrictId,
        currMunicipalityId, setCurrMunicipalityId,
        currWardId, setCurrWardId,
        currTole, setCurrTole,
        currDistricts, setCurrDistricts,
        currMunicipalities, setCurrMunicipalities,
        currWards, setCurrWards,
        loadingCurrDistricts, loadingCurrMunicipalities, loadingCurrWards,
        handleCurrProvinceChange,
        handleCurrDistrictChange,
        handleCurrMunicipalityChange,
      )}
    </Grid>
  );

  const renderCredentials = () => (
    <Grid container spacing={2}>
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
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          id="registrationCode"
          name="registrationCode"
          label="Municipality Verification Code (If applicable)"
          value={formik.values.registrationCode}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
      </Grid>

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
          <FormHelperText error>{formik.errors.acceptTerms}</FormHelperText>
        )}
      </Grid>
    </Grid>
  );

  const renderSuccess = () => (
    <Box sx={{ textAlign: "center", py: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }} color="success.main">
        Registration Successful!
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Your account has been created. Welcome to the Smart Civic Platform!
      </Typography>

      {!kycSubmitted && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3, textAlign: "left" }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
            Verify Your Identity (Optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Submit your identity documents to get verified and unlock full platform features.
          </Typography>

          {kycError && <Alert severity="error" sx={{ mb: 2 }}>{kycError}</Alert>}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Identity Type"
                value={identityType}
                onChange={(e) => setIdentityType(e.target.value)}
              >
                <MenuItem value="">-- Select --</MenuItem>
                <MenuItem value="citizenship">Citizenship</MenuItem>
                <MenuItem value="national_id">National ID</MenuItem>
                <MenuItem value="passport">Passport</MenuItem>
                <MenuItem value="driving_license">Driving License</MenuItem>
                <MenuItem value="voter_id">Voter ID</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Identity Number"
                value={identityNumber}
                onChange={(e) => setIdentityNumber(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button variant="outlined" component="label" fullWidth sx={{ py: 3 }}>
                {frontImage ? "Front Image Selected" : "Upload Front Image"}
                <input type="file" hidden accept="image/*,.pdf" onChange={handleFileChange("front")} />
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button variant="outlined" component="label" fullWidth sx={{ py: 3 }}>
                {backImage ? "Back Image Selected" : "Upload Back Image"}
                <input type="file" hidden accept="image/*,.pdf" onChange={handleFileChange("back")} />
              </Button>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                onClick={handleKycSubmit}
                disabled={kycUploading}
                sx={{ mr: 1 }}
              >
                {kycUploading ? "Uploading..." : "Submit Documents"}
              </Button>
              <Button
                variant="text"
                onClick={() => window.location.href = "/citizen/dashboard"}
              >
                Skip for now
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {kycSubmitted && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Your documents have been submitted for review. You will be notified once verified.
        </Alert>
      )}

      <Button
        variant="contained"
        size="large"
        href="/citizen/dashboard"
        sx={{ textTransform: "none", fontWeight: "bold" }}
      >
        Go to Dashboard
      </Button>
    </Box>
  );

  return (
    <Container component="main" maxWidth="md" sx={{ mb: 4 }}>
      <Box
        sx={{
          marginTop: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: "100%", borderRadius: 2 }}>
          <Box sx={{ mb: 3, textAlign: "center" }}>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              Create Citizen Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Join the platform to log complaints, view updates, and connect with local governance
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label, idx) => (
              <Step key={label} completed={isStepValid(idx) && idx < activeStep}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {submitError}
            </Alert>
          )}

          {activeStep === 0 && renderPersonalInfo()}
          {activeStep === 1 && renderAddress()}
          {activeStep === 2 && renderCredentials()}
          {activeStep === 3 && renderSuccess()}

          {activeStep < 3 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
              <Button
                onClick={() => setActiveStep((prev) => prev - 1)}
                disabled={activeStep === 0}
                variant="outlined"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                variant="contained"
                disabled={!canGoNext() || isSubmitting}
                size="large"
                sx={{ textTransform: "none", fontWeight: "bold" }}
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    Registering...
                  </>
                ) : activeStep === 2 ? (
                  "Complete Registration"
                ) : (
                  "Next"
                )}
              </Button>
            </Box>
          )}

          {activeStep < 3 && (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Link href="/login" variant="body2" underline="hover">
                Already registered? Sign In instead
              </Link>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};
