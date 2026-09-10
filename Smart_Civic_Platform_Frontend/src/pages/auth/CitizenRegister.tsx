import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { withRoleRedirect } from "./withRoleRedirect";
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
  Chip,
  type SelectChangeEvent,
} from "@mui/material";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { registerSchema } from "../../validation/auth.schema";
import { getMaxDobFor18 } from "../../validation/kyc.validators";
import { KycFilePreviewCard } from "../../components/kyc/KycFilePreviewCard";
import apiClient, { API_BASE_URL } from "../../api/client";
import { citizenApi, publicApi } from "../../api";
import { useAuth } from "../../hooks/useAuth";
import type {
  Province,
  District,
  Municipality,
  Ward,
  ActiveMunicipality,
} from "../../api/types";

const STEPS = ["Personal Info", "Address", "Credentials", "Complete"];

const RegisterBase: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regToken, setRegToken] = useState<string | null>(null);
  const [regRefreshToken, setRegRefreshToken] = useState<string | null>(null);
  const [regProfile, setRegProfile] = useState<any>(null);

  // Active municipalities fetched from platform
  const [activeMunicipalities, setActiveMunicipalities] = useState<ActiveMunicipality[]>([]);
  const [loadingActiveMunicipalities, setLoadingActiveMunicipalities] = useState(true);
  const [activeMunicipalitiesError, setActiveMunicipalitiesError] = useState<string | null>(null);

  // Permanent address states
  const [permProvinceId, setPermProvinceId] = useState("");
  const [permDistrictId, setPermDistrictId] = useState("");
  const [permMunicipalityId, setPermMunicipalityId] = useState("");
  const [permWardId, setPermWardId] = useState("");
  const [permWardNo, setPermWardNo] = useState("");
  const [permTole, setPermTole] = useState("");
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  // Current address states
  const [sameAsPermanent, setSameAsPermanent] = useState(true);
  const [currProvinceId, setCurrProvinceId] = useState("");
  const [currDistrictId, setCurrDistrictId] = useState("");
  const [currMunicipalityId, setCurrMunicipalityId] = useState("");
  const [currWardId, setCurrWardId] = useState("");
  const [currWardNo, setCurrWardNo] = useState("");
  const [currTole, setCurrTole] = useState("");
  const [currWards, setCurrWards] = useState<Ward[]>([]);
  const [loadingCurrWards, setLoadingCurrWards] = useState(false);

  const [identityType, setIdentityType] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycUploading, setKycUploading] = useState(false);

  // Fetch only active registered municipalities
  useEffect(() => {
    let cancelled = false;
    setLoadingActiveMunicipalities(true);
    setActiveMunicipalitiesError(null);
    publicApi.getActiveMunicipalities()
      .then((res) => {
        if (!cancelled) {
          if (res.success && res.data) {
            setActiveMunicipalities(res.data);
          } else {
            setActiveMunicipalitiesError(res.message || "Failed to load active municipalities");
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Network error loading active municipalities";
          setActiveMunicipalitiesError(msg);
          console.error("Active municipalities fetch error:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingActiveMunicipalities(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Sync ward IDs when ward list loads or ward number changes
  useEffect(() => {
    if (permWardNo && wards.length > 0) {
      const match = wards.find((w) => String(w.ward_no) === String(permWardNo));
      if (match) setPermWardId(match.id);
    }
  }, [wards, permWardNo]);

  useEffect(() => {
    if (currWardNo && currWards.length > 0) {
      const match = currWards.find((w) => String(w.ward_no) === String(currWardNo));
      if (match) setCurrWardId(match.id);
    }
  }, [currWards, currWardNo]);


  // Filtered Province list: only provinces that have at least one active municipality
  const activeProvinces: Province[] = useMemo(() => {
    const map = new Map<string, Province>();
    for (const m of activeMunicipalities) {
      if (m.province_id && !map.has(m.province_id)) {
        map.set(m.province_id, {
          id: m.province_id,
          name: m.province_name || `Province ${m.province_id}`,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeMunicipalities]);

  // Filtered Districts for Permanent Address
  const permDistricts: District[] = useMemo(() => {
    if (!permProvinceId) return [];
    const map = new Map<string, District>();
    for (const m of activeMunicipalities) {
      if (m.province_id === permProvinceId && m.district_id && !map.has(m.district_id)) {
        map.set(m.district_id, {
          id: m.district_id,
          name: m.district_name || `District ${m.district_id}`,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeMunicipalities, permProvinceId]);

  // Filtered Municipalities for Permanent Address
  const permMunicipalitiesList: Municipality[] = useMemo(() => {
    if (!permDistrictId) return [];
    return activeMunicipalities
      .filter((m) => m.district_id === permDistrictId)
      .map((m) => ({
        id: m.id,
        official_name: m.official_name,
        local_level_type: m.local_level_type || "",
      }))
      .sort((a, b) => a.official_name.localeCompare(b.official_name));
  }, [activeMunicipalities, permDistrictId]);

  // Filtered Districts for Current Address
  const currDistrictsList: District[] = useMemo(() => {
    if (!currProvinceId) return [];
    const map = new Map<string, District>();
    for (const m of activeMunicipalities) {
      if (m.province_id === currProvinceId && m.district_id && !map.has(m.district_id)) {
        map.set(m.district_id, {
          id: m.district_id,
          name: m.district_name || `District ${m.district_id}`,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeMunicipalities, currProvinceId]);

  // Filtered Municipalities for Current Address
  const currMunicipalitiesList: Municipality[] = useMemo(() => {
    if (!currDistrictId) return [];
    return activeMunicipalities
      .filter((m) => m.district_id === currDistrictId)
      .map((m) => ({
        id: m.id,
        official_name: m.official_name,
        local_level_type: m.local_level_type || "",
      }))
      .sort((a, b) => a.official_name.localeCompare(b.official_name));
  }, [activeMunicipalities, currDistrictId]);

  const handleProvinceChange = useCallback((value: string) => {
    setPermProvinceId(value);
    setPermDistrictId("");
    setPermMunicipalityId("");
    setPermWardId("");
    setPermWardNo("");
    setWards([]);
  }, []);

  const handleDistrictChange = useCallback((value: string) => {
    setPermDistrictId(value);
    setPermMunicipalityId("");
    setPermWardId("");
    setPermWardNo("");
    setWards([]);
  }, []);

  const handleMunicipalityChange = useCallback(async (value: string) => {
    setPermMunicipalityId(value);
    setPermWardId("");
    setPermWardNo("");
    setWards([]);
    if (!value) return;
    setLoadingWards(true);
    try {
      const res = await publicApi.getWards(value);
      if (res.success && res.data) setWards(res.data);
    } catch (err) {
      console.error("Failed to load wards:", err);
    } finally {
      setLoadingWards(false);
    }
  }, []);

  const handleCurrProvinceChange = useCallback((value: string) => {
    setCurrProvinceId(value);
    setCurrDistrictId("");
    setCurrMunicipalityId("");
    setCurrWardId("");
    setCurrWardNo("");
    setCurrWards([]);
  }, []);

  const handleCurrDistrictChange = useCallback((value: string) => {
    setCurrDistrictId(value);
    setCurrMunicipalityId("");
    setCurrWardId("");
    setCurrWardNo("");
    setCurrWards([]);
  }, []);

  const handleCurrMunicipalityChange = useCallback(async (value: string) => {
    setCurrMunicipalityId(value);
    setCurrWardId("");
    setCurrWardNo("");
    setCurrWards([]);
    if (!value) return;
    setLoadingCurrWards(true);
    try {
      const res = await publicApi.getWards(value);
      if (res.success && res.data) setCurrWards(res.data);
    } catch (err) {
      console.error("Failed to load current wards:", err);
    } finally {
      setLoadingCurrWards(false);
    }
  }, []);

  const handlePermWardNoChange = useCallback((val: string) => {
    const clean = val.replace(/\D/g, "");
    setPermWardNo(clean);
    if (!clean) {
      setPermWardId("");
      return;
    }
    const match = wards.find((w) => String(w.ward_no) === clean);
    if (match) setPermWardId(match.id);
  }, [wards]);

  const handleCurrWardNoChange = useCallback((val: string) => {
    const clean = val.replace(/\D/g, "");
    setCurrWardNo(clean);
    if (!clean) {
      setCurrWardId("");
      return;
    }
    const match = currWards.find((w) => String(w.ward_no) === clean);
    if (match) setCurrWardId(match.id);
  }, [currWards]);

  // Quick 1-click select active municipality
  const handleQuickSelectMunicipality = useCallback(async (muni: ActiveMunicipality, target: "perm" | "curr" = "perm") => {
    if (target === "perm") {
      setPermProvinceId(muni.province_id);
      setPermDistrictId(muni.district_id);
      setPermMunicipalityId(muni.id);
      setPermWardId("");
      setPermWardNo("");
      setWards([]);
      setLoadingWards(true);
      try {
        const res = await publicApi.getWards(muni.id);
        if (res.success && res.data) setWards(res.data);
      } catch (err) {
        console.error("Failed to load wards:", err);
      } finally {
        setLoadingWards(false);
      }
    } else {
      setCurrProvinceId(muni.province_id);
      setCurrDistrictId(muni.district_id);
      setCurrMunicipalityId(muni.id);
      setCurrWardId("");
      setCurrWardNo("");
      setCurrWards([]);
      setLoadingCurrWards(true);
      try {
        const res = await publicApi.getWards(muni.id);
        if (res.success && res.data) setCurrWards(res.data);
      } catch (err) {
        console.error("Failed to load current wards:", err);
      } finally {
        setLoadingCurrWards(false);
      }
    }
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
    onSubmit: async () => { },
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
      if (!permProvinceId || !permDistrictId || !permMunicipalityId || !permWardNo) return false;
      if (!sameAsPermanent) {
        if (!currProvinceId || !currDistrictId || !currMunicipalityId || !currWardNo) return false;
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
  }, [activeStep, formik.values, formik.errors, permProvinceId, permDistrictId, permMunicipalityId, permWardNo, sameAsPermanent, currProvinceId, currDistrictId, currMunicipalityId, currWardNo]);

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
      const isValidUuid = (val?: string | null): boolean =>
        Boolean(val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val));

      const buildAddressString = (
        provId: string,
        distId: string,
        muniId: string,
        wardNo: string,
        tole: string
      ) => {
        const muni = activeMunicipalities.find((m) => m.id === muniId);
        const prov = muni?.province_name || activeProvinces.find((p) => p.id === provId)?.name || "";
        const dist = muni?.district_name || "";
        const muniName = muni?.official_name || "";

        const parts = [];
        if (tole) parts.push(tole);
        if (wardNo) parts.push(`Ward ${wardNo}`);
        if (muniName) parts.push(muniName);
        if (dist) parts.push(dist);
        if (prov) parts.push(prov);
        return parts.join(", ");
      };

      // Resolve permanent ward UUID
      let permWardObj = wards.find((w) => String(w.ward_no) === String(permWardNo));
      if (!permWardObj && permMunicipalityId && permWardNo) {
        try {
          const res = await publicApi.getWards(permMunicipalityId);
          if (res.success && res.data) {
            setWards(res.data);
            permWardObj = res.data.find((w) => String(w.ward_no) === String(permWardNo));
          }
        } catch {
          // fallback to available
        }
      }
      const resolvedPermWardId = permWardObj?.id || (isValidUuid(permWardId) ? permWardId : undefined);

      // Resolve current ward UUID
      let currWardObj = currWards.find((w) => String(w.ward_no) === String(currWardNo));
      if (!sameAsPermanent && !currWardObj && currMunicipalityId && currWardNo) {
        try {
          const res = await publicApi.getWards(currMunicipalityId);
          if (res.success && res.data) {
            setCurrWards(res.data);
            currWardObj = res.data.find((w) => String(w.ward_no) === String(currWardNo));
          }
        } catch {
          // fallback to available
        }
      }
      const resolvedCurrWardId = sameAsPermanent
        ? resolvedPermWardId
        : (currWardObj?.id || (isValidUuid(currWardId) ? currWardId : undefined));

      const permAddress = {
        province_id: isValidUuid(permProvinceId) ? permProvinceId : undefined,
        district_id: isValidUuid(permDistrictId) ? permDistrictId : undefined,
        municipality_id: isValidUuid(permMunicipalityId) ? permMunicipalityId : undefined,
        ward_id: resolvedPermWardId,
        tole: permTole?.trim() || undefined,
        full_address: buildAddressString(permProvinceId, permDistrictId, permMunicipalityId, permWardNo, permTole) || undefined,
      };

      let currAddress = permAddress;
      if (!sameAsPermanent) {
        currAddress = {
          province_id: isValidUuid(currProvinceId) ? currProvinceId : undefined,
          district_id: isValidUuid(currDistrictId) ? currDistrictId : undefined,
          municipality_id: isValidUuid(currMunicipalityId) ? currMunicipalityId : undefined,
          ward_id: resolvedCurrWardId,
          tole: currTole?.trim() || undefined,
          full_address: buildAddressString(currProvinceId, currDistrictId, currMunicipalityId, currWardNo, currTole) || undefined,
        };
      }

      // Single atomic registration API call (includes credentials, profile, and structured addresses)
      const registerRes = await apiClient.post('/auth/register', {
        email: formik.values.email?.trim(),
        password: formik.values.password,
        full_name: formik.values.fullName?.trim(),
        phone: formik.values.phone?.trim() || undefined,
        date_of_birth: formik.values.dateOfBirth || undefined,
        gender: formik.values.gender || undefined,
        municipality_id: permAddress.municipality_id || currAddress.municipality_id || undefined,
        full_address: permAddress.full_address || undefined,
        current_address: currAddress.full_address || undefined,
        permanent: permAddress,
        current: currAddress,
      });

      const registerData = registerRes.data;
      if (!registerData.success) {
        throw new Error(registerData.message || "Registration failed");
      }

      const token = registerData.data?.access_token || registerData.data?.tokens?.accessToken;
      const refreshToken = registerData.data?.refresh_token || registerData.data?.tokens?.refreshToken;
      const profile = registerData.data?.profile || registerData.data?.user;

      if (!token || !profile) {
        throw new Error("Invalid registration response");
      }

      setRegToken(token);
      if (refreshToken) {
        setRegRefreshToken(refreshToken);
      }
      setRegProfile(profile);

      // Save token to localStorage for authenticated KYC upload
      localStorage.setItem("access_token", token);
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }
      localStorage.setItem("user_profile", JSON.stringify(profile));

      // Advance to step 3 (success & optional KYC upload)
      setActiveStep(3);
    } catch (err: any) {
      // If registration failed, clean up so the user is not in a broken state
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_profile");
      let backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : "Registration failed");

      const lowerMsg = backendMessage.toLowerCase();
      if (lowerMsg.includes("idx_profiles_phone") || lowerMsg.includes("phone")) {
        backendMessage = "This phone number is already registered to another account. Please use a different phone number or sign in.";
        formik.setFieldError("phone", backendMessage);
        formik.setFieldTouched("phone", true, false);
        setActiveStep(0);
      } else if (lowerMsg.includes("email")) {
        formik.setFieldError("email", backendMessage);
        formik.setFieldTouched("email", true, false);
        setActiveStep(0);
      }

      console.error("[Registration Error]", err?.response?.data || err);
      setSubmitError(backendMessage);
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
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 1,
            borderRadius: 2,
            backgroundColor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(25, 118, 210, 0.08)"
                : "rgba(25, 118, 210, 0.04)",
            borderColor: "primary.light",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
            <LocationCityIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main" }}>
              Currently Active Municipalities
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Citizen registration is currently open for residents of active partner municipalities:
          </Typography>
          {loadingActiveMunicipalities ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
              <CircularProgress size={18} />
              <Typography variant="caption" color="text.secondary">
                Checking active municipalities...
              </Typography>
            </Box>
          ) : activeMunicipalities.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {activeMunicipalities.map((m) => (
                <Chip
                  key={m.id}
                  label={`${m.official_name} (${m.district_name || m.province_name})`}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 600, fontSize: "0.78rem" }}
                />
              ))}
            </Box>
          ) : (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              No municipalities are currently active. Please contact platform administrators.
            </Alert>
          )}
        </Paper>
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
          label="Date of Birth (18+ only)"
          type="date"
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { max: getMaxDobFor18() },
          }}
          value={formik.values.dateOfBirth}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.dateOfBirth && Boolean(formik.errors.dateOfBirth)}
          helperText={(formik.touched.dateOfBirth && formik.errors.dateOfBirth) || "You must be at least 18 years of age."}
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
    distId: string,
    muniId: string,
    wardNo: string,
    onWardNoChange: (v: string) => void,
    tole: string,
    setTole: (v: string) => void,
    provList: Province[],
    distList: District[],
    muniList: Municipality[],
    wardList: Ward[],
    loadWard: boolean,
    onProvChange: (v: string) => void,
    onDistChange: (v: string) => void,
    onMuniChange: (v: string) => void,
  ) => {
    const selectedMuni = activeMunicipalities.find((m) => m.id === muniId);
    const totalWards = selectedMuni?.total_wards || (wardList.length > 0 ? Math.max(...wardList.map(w => w.ward_no)) : undefined);

    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: "bold" }}>
            {label}
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 3 }}>
          <FormControl fullWidth error={!!activeMunicipalitiesError}>
            <InputLabel id={`${label}-province-label`}>Province</InputLabel>
            <Select
              labelId={`${label}-province-label`}
              value={provId}
              label="Province"
              onChange={(e: SelectChangeEvent) => onProvChange(e.target.value)}
              disabled={loadingActiveMunicipalities || !!activeMunicipalitiesError}
              endAdornment={loadingActiveMunicipalities ? <CircularProgress size={20} sx={{ mr: 2 }} /> : undefined}
            >
              <MenuItem value="">-- Select Province --</MenuItem>
              {provList.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
            {activeMunicipalitiesError && (
              <FormHelperText>{activeMunicipalitiesError}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, sm: 3 }}>
          <FormControl fullWidth disabled={!provId || distList.length === 0}>
            <InputLabel id={`${label}-district-label`}>District</InputLabel>
            <Select
              labelId={`${label}-district-label`}
              value={distId}
              label="District"
              onChange={(e: SelectChangeEvent) => onDistChange(e.target.value)}
            >
              <MenuItem value="">-- Select District --</MenuItem>
              {distList.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, sm: 3 }}>
          <FormControl fullWidth disabled={!distId || muniList.length === 0}>
            <InputLabel id={`${label}-municipality-label`}>Municipality</InputLabel>
            <Select
              labelId={`${label}-municipality-label`}
              value={muniId}
              label="Municipality"
              onChange={(e: SelectChangeEvent) => onMuniChange(e.target.value)}
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
          <TextField
            fullWidth
            label="Ward Number"
            placeholder="e.g. 4"
            type="number"
            disabled={!muniId}
            value={wardNo}
            onChange={(e) => onWardNoChange(e.target.value)}
            slotProps={{
              htmlInput: {
                min: 1,
                max: totalWards || 99,
                inputMode: "numeric",
                pattern: "[0-9]*",
              },
            }}
            helperText={
              totalWards
                ? `Ward 1 to ${totalWards}`
                : loadWard
                ? "Checking wards..."
                : undefined
            }
          />
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
  };

  const renderAddress = () => (
    <Grid container spacing={2}>
      {/* Quick-Pick Section for Active Municipalities */}
      <Grid size={{ xs: 12 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            mb: 1.5,
            borderRadius: 2,
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(135deg, rgba(25,118,210,0.12) 0%, rgba(13,71,161,0.06) 100%)"
                : "linear-gradient(135deg, #f0f7ff 0%, #e3f2fd 100%)",
            borderColor: "primary.main",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LocationCityIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "primary.dark" }}>
                Active Municipalities
              </Typography>
            </Box>
            {activeMunicipalities.length > 0 && (
              <Chip
                label={`${activeMunicipalities.length} Active Local Government${activeMunicipalities.length === 1 ? "" : "s"}`}
                size="small"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Click an active municipality below to automatically set your Province and District, or select from the filtered dropdowns:
          </Typography>

          {loadingActiveMunicipalities ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Loading active municipalities...
              </Typography>
            </Box>
          ) : activeMunicipalities.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              {activeMunicipalities.map((m) => {
                const isSelected = permMunicipalityId === m.id;
                return (
                  <Chip
                    key={m.id}
                    label={`${m.official_name} • ${m.district_name || m.province_name}`}
                    onClick={() => handleQuickSelectMunicipality(m, "perm")}
                    color={isSelected ? "primary" : "default"}
                    variant={isSelected ? "filled" : "outlined"}
                    icon={isSelected ? <CheckCircleIcon fontSize="small" /> : <LocationCityIcon fontSize="small" />}
                    sx={{
                      cursor: "pointer",
                      py: 2.2,
                      px: 1,
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: "0.85rem",
                      boxShadow: isSelected ? "0 2px 8px rgba(25,118,210,0.3)" : "none",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        transform: "translateY(-1px)",
                      },
                    }}
                  />
                );
              })}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>
              No active municipalities found. Registration is limited to participating councils.
            </Alert>
          )}
        </Paper>
      </Grid>

      {renderAddressCascade(
        "Permanent Address",
        permProvinceId,
        permDistrictId,
        permMunicipalityId,
        permWardNo,
        handlePermWardNoChange,
        permTole,
        setPermTole,
        activeProvinces,
        permDistricts,
        permMunicipalitiesList,
        wards,
        loadingWards,
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

      {!sameAsPermanent &&
        renderAddressCascade(
          "Current Address",
          currProvinceId,
          currDistrictId,
          currMunicipalityId,
          currWardNo,
          handleCurrWardNoChange,
          currTole,
          setCurrTole,
          activeProvinces,
          currDistrictsList,
          currMunicipalitiesList,
          currWards,
          loadingCurrWards,
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

  const handleCompleteAndNavigate = () => {
    if (regToken && regProfile) {
      login(regToken, regProfile, regRefreshToken || undefined);
    }
    navigate("/citizen/dashboard");
  };

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
              <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5, mb: 1 }}>
                {frontImage ? "Change Front Image" : "Upload Front Image"}
                <input type="file" hidden accept="image/*,.pdf" onChange={handleFileChange("front")} />
              </Button>
              {frontImage && (
                <KycFilePreviewCard
                  label="Document (Front)"
                  fileData={frontImage}
                  height={140}
                  onRemove={() => setFrontImage(null)}
                />
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5, mb: 1 }}>
                {backImage ? "Change Back Image" : "Upload Back Image"}
                <input type="file" hidden accept="image/*,.pdf" onChange={handleFileChange("back")} />
              </Button>
              {backImage && (
                <KycFilePreviewCard
                  label="Document (Back)"
                  fileData={backImage}
                  height={140}
                  onRemove={() => setBackImage(null)}
                />
              )}
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
                onClick={handleCompleteAndNavigate}
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
        onClick={handleCompleteAndNavigate}
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

export const Register = withRoleRedirect(RegisterBase);
export default Register;
