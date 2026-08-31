import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  Card,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { municipalityApi } from "../../api/modules/municipality.api";
import Swal from "sweetalert2";

const steps = ["Municipality Details", "Leadership Info", "Verification Documents", "Review & Submit"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Nepal mobile (10 digits starting with 98 or 97, optional +977) or general phone
const NEPAL_PHONE_REGEX = /^(?:\+977[- ]?)?(?:9[78]\d{8}|0[1-9]\d{6,7}|[1-9]\d{6,7})$/;

const ImageUploadBox = ({
  label,
  value,
  setter,
  error,
  helperText,
  accept = "image/*"
}: {
  label: string;
  value: string | null;
  setter: React.Dispatch<React.SetStateAction<string | null>>;
  error?: boolean;
  helperText?: string;
  accept?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isPdf = value?.startsWith("data:application/pdf") || value?.endsWith(".pdf");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      Swal.fire("File Too Large", "Max file size is 10MB", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Box>
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          border: "2px dashed",
          borderColor: error ? "error.main" : value ? "primary.main" : "divider",
          borderRadius: 2,
          p: 2,
          textAlign: "center",
          cursor: "pointer",
          bgcolor: error ? "rgba(239,68,68,0.04)" : value ? "rgba(99,102,241,0.04)" : "background.default",
          "&:hover": { borderColor: error ? "error.main" : "primary.main" },
          transition: "border-color 0.2s ease",
        }}
      >
        <input ref={inputRef} type="file" hidden accept={accept} onChange={handleFileUpload} />
        {value ? (
          isPdf ? (
            <Box><FileText size={32} color="#6366F1" /><Typography variant="caption" display="block" color="primary">Document Attached</Typography></Box>
          ) : (
            <img src={value} alt="upload" style={{ maxHeight: 100, maxWidth: "100%", borderRadius: 8, objectFit: "contain" }} />
          )
        ) : (
          <Box><Upload size={28} color={error ? "#EF4444" : "#9CA3AF"} /><Typography variant="subtitle2" mt={1} color={error ? "error" : "text.secondary"}>{label}</Typography></Box>
        )}
      </Box>
      {helperText && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export const MunicipalityKycOnboarding: React.FC = () => {
  const { user, login } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Step 1: Municipality Details
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [officialName, setOfficialName] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [officialContact, setOfficialContact] = useState("");
  const [localLevelType, setLocalLevelType] = useState("municipality");
  const [totalWards, setTotalWards] = useState("1");
  const [aboutDescription, setAboutDescription] = useState("");

  // Step 2: Leadership
  const [mayorName, setMayorName] = useState("");
  const [deputyMayorName, setDeputyMayorName] = useState("");
  const [headName, setHeadName] = useState(user?.full_name || "");
  const [headEmail, setHeadEmail] = useState(user?.email || "");
  const [headContact, setHeadContact] = useState(user?.phone || "");

  // Step 3: Documents
  const [headIdentityType, setHeadIdentityType] = useState("citizenship");
  const [headIdentityNumber, setHeadIdentityNumber] = useState("");
  const [headIdentityFront, setHeadIdentityFront] = useState<string | null>(null);
  const [headIdentityBack, setHeadIdentityBack] = useState<string | null>(null);
  const [registrationDoc, setRegistrationDoc] = useState<string | null>(null);

  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        const res = await municipalityApi.getMyProfile();
        if (res.success && res.data) {
          const p = res.data;
          if (p.official_logo) setLogoBase64(p.official_logo);
          if (p.official_name) setOfficialName(p.official_name);
          if (p.official_email) setOfficialEmail(p.official_email);
          if (p.official_contact_no) setOfficialContact(p.official_contact_no);
          if (p.local_level_type) setLocalLevelType(p.local_level_type);
          if (p.total_wards) setTotalWards(p.total_wards.toString());
          if (p.about_description) setAboutDescription(p.about_description);
          
          if (p.mayor_chairperson_name) setMayorName(p.mayor_chairperson_name);
          if (p.deputy_mayor_vice_chairperson_name) setDeputyMayorName(p.deputy_mayor_vice_chairperson_name);
          if (p.head_name) setHeadName(p.head_name);
          if (p.head_email) setHeadEmail(p.head_email);
          if (p.head_contact_no) setHeadContact(p.head_contact_no);
          
          if (p.head_identity_type) setHeadIdentityType(p.head_identity_type);
          if (p.head_identity_number) setHeadIdentityNumber(p.head_identity_number);
          if (p.head_identity_front_url) setHeadIdentityFront(p.head_identity_front_url);
          if (p.head_identity_back_url) setHeadIdentityBack(p.head_identity_back_url);
          if (p.registration_document_url) setRegistrationDoc(p.registration_document_url);
        }
      } catch (err: any) {
        console.warn("Could not pre-fetch profile from backend, using context defaults:", err?.message);
      }
    };
    fetchExistingData();
  }, []);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 0) {
      if (!officialName.trim()) {
        errors.officialName = "Municipality name is required.";
      }
      if (!officialEmail.trim()) {
        errors.officialEmail = "Official email is required.";
      } else if (!EMAIL_REGEX.test(officialEmail.trim())) {
        errors.officialEmail = "Please enter a valid email address.";
      }
      if (!officialContact.trim()) {
        errors.officialContact = "Official contact number is required.";
      } else if (!NEPAL_PHONE_REGEX.test(officialContact.trim())) {
        errors.officialContact = "Enter a valid Nepal phone/mobile number (e.g., 98XXXXXXXX or 01XXXXXXX).";
      }
      if (!localLevelType) {
        errors.localLevelType = "Please select local level type.";
      }
      if (!totalWards || parseInt(totalWards, 10) < 1) {
        errors.totalWards = "Total wards must be at least 1.";
      }
    } else if (step === 1) {
      if (!mayorName.trim()) {
        errors.mayorName = "Mayor / Chairperson name is required.";
      }
      if (!headName.trim()) {
        errors.headName = "Administrative head name is required.";
      }
      if (!headEmail.trim()) {
        errors.headEmail = "Head email is required.";
      } else if (!EMAIL_REGEX.test(headEmail.trim())) {
        errors.headEmail = "Please enter a valid email address.";
      }
      if (!headContact.trim()) {
        errors.headContact = "Head mobile number is required.";
      } else if (!NEPAL_PHONE_REGEX.test(headContact.trim())) {
        errors.headContact = "Enter a valid Nepal mobile number (e.g., 98XXXXXXXX or 97XXXXXXXX).";
      }
    } else if (step === 2) {
      if (!headIdentityType) {
        errors.headIdentityType = "Please select identity document type.";
      }
      if (!headIdentityNumber.trim()) {
        errors.headIdentityNumber = "Identity document number is required.";
      }
      if (!headIdentityFront) {
        errors.headIdentityFront = "Identity document front photo is required.";
      }
      if (!registrationDoc) {
        errors.registrationDoc = "Municipality official registration document is required.";
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please correct the errors in the required fields before proceeding.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setFieldErrors({});
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      setError("Please ensure all mandatory fields and documents are completed.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        official_name: officialName.trim(),
        official_email: officialEmail.trim(),
        official_contact_no: officialContact.trim(),
        about_description: aboutDescription.trim(),
        local_level_type: localLevelType,
        total_wards: totalWards ? parseInt(totalWards, 10) : undefined,
        mayor_chairperson_name: mayorName.trim(),
        deputy_mayor_vice_chairperson_name: deputyMayorName.trim(),
        head_name: headName.trim(),
        head_email: headEmail.trim(),
        head_contact_no: headContact.trim(),
        head_identity_type: headIdentityType,
        head_identity_number: headIdentityNumber.trim(),
      };

      if (logoBase64 && logoBase64.startsWith("data:")) payload.official_logo_base64 = logoBase64;
      if (headIdentityFront && headIdentityFront.startsWith("data:")) payload.head_identity_front_base64 = headIdentityFront;
      if (headIdentityBack && headIdentityBack.startsWith("data:")) payload.head_identity_back_base64 = headIdentityBack;
      if (registrationDoc && registrationDoc.startsWith("data:")) payload.registration_document_base64 = registrationDoc;

      const res = await municipalityApi.updateMyProfile(payload);
      
      if (res.success) {
        const token = localStorage.getItem("access_token");
        if (token && user) {
          login(token, {
            ...user,
            identity_type: payload.head_identity_type,
            identity_number: payload.head_identity_number,
            identity_document_url: res.data?.head_identity_front_url || user.identity_document_url,
          });
        }
        
        Swal.fire({
          icon: "success",
          title: "KYC Submitted!",
          text: "Your municipality profile and verification documents have been submitted for superadmin approval.",
          confirmButtonColor: "#4F46E5",
        }).then(() => {
          window.location.href = "/municipality_head/dashboard";
        });
      } else {
        throw new Error(res.error || "Failed to submit KYC");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || "Failed to submit KYC.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: { xs: 3, md: 5 }, maxWidth: 800, margin: "0 auto", borderRadius: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
      <Typography variant="h4" fontWeight={800} align="center" gutterBottom>
        Municipality KYC Setup
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" mb={4}>
        Complete these steps to verify and activate your municipality account.
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 5 }}>
        {steps.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box sx={{ minHeight: 350 }}>
        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} display="flex" flexDirection="column" alignItems="center">
              <Typography variant="subtitle2" gutterBottom>Municipality Logo (Optional)</Typography>
              <label htmlFor="logo-upload">
                <input id="logo-upload" type="file" hidden accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    Swal.fire("File Too Large", "Max file size is 5MB", "warning");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onloadend = () => setLogoBase64(reader.result as string);
                  reader.readAsDataURL(file);
                }} />
                <Avatar src={logoBase64 || ""} sx={{ width: 100, height: 100, cursor: "pointer", border: "2px dashed #9CA3AF" }}>
                  {!logoBase64 && <Upload size={30} />}
                </Avatar>
              </label>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Official Municipality Name *"
                value={officialName}
                onChange={(e) => { setOfficialName(e.target.value); clearFieldError("officialName"); }}
                error={Boolean(fieldErrors.officialName)}
                helperText={fieldErrors.officialName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Official Email *"
                type="email"
                value={officialEmail}
                onChange={(e) => { setOfficialEmail(e.target.value); clearFieldError("officialEmail"); }}
                error={Boolean(fieldErrors.officialEmail)}
                helperText={fieldErrors.officialEmail}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Official Contact No. *"
                value={officialContact}
                placeholder="e.g. 9841000000 or 014000000"
                onChange={(e) => { setOfficialContact(e.target.value); clearFieldError("officialContact"); }}
                error={Boolean(fieldErrors.officialContact)}
                helperText={fieldErrors.officialContact}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={Boolean(fieldErrors.localLevelType)}>
                <InputLabel>Local Level Type *</InputLabel>
                <Select
                  value={localLevelType}
                  label="Local Level Type *"
                  onChange={(e) => { setLocalLevelType(e.target.value); clearFieldError("localLevelType"); }}
                >
                  <MenuItem value="metropolitan_city">Metropolitan City</MenuItem>
                  <MenuItem value="sub_metropolitan_city">Sub-Metropolitan City</MenuItem>
                  <MenuItem value="municipality">Municipality</MenuItem>
                  <MenuItem value="rural_municipality">Rural Municipality</MenuItem>
                </Select>
                {fieldErrors.localLevelType && <FormHelperText>{fieldErrors.localLevelType}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total Wards *"
                value={totalWards}
                onChange={(e) => { setTotalWards(e.target.value); clearFieldError("totalWards"); }}
                type="number"
                inputProps={{ min: 1 }}
                error={Boolean(fieldErrors.totalWards)}
                helperText={fieldErrors.totalWards}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="About / Description (Optional)"
                value={aboutDescription}
                onChange={(e) => setAboutDescription(e.target.value)}
              />
            </Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mayor / Chairperson Name *"
                value={mayorName}
                onChange={(e) => { setMayorName(e.target.value); clearFieldError("mayorName"); }}
                error={Boolean(fieldErrors.mayorName)}
                helperText={fieldErrors.mayorName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Deputy Mayor / Vice Chairperson (Optional)"
                value={deputyMayorName}
                onChange={(e) => setDeputyMayorName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}><Divider>Administrative Head Details</Divider></Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Head Name *"
                value={headName}
                onChange={(e) => { setHeadName(e.target.value); clearFieldError("headName"); }}
                error={Boolean(fieldErrors.headName)}
                helperText={fieldErrors.headName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Head Email *"
                type="email"
                value={headEmail}
                onChange={(e) => { setHeadEmail(e.target.value); clearFieldError("headEmail"); }}
                error={Boolean(fieldErrors.headEmail)}
                helperText={fieldErrors.headEmail}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Head Contact / Mobile No. *"
                placeholder="e.g. 98XXXXXXXX"
                value={headContact}
                onChange={(e) => { setHeadContact(e.target.value); clearFieldError("headContact"); }}
                error={Boolean(fieldErrors.headContact)}
                helperText={fieldErrors.headContact}
              />
            </Grid>
          </Grid>
        )}

        {activeStep === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={Boolean(fieldErrors.headIdentityType)}>
                <InputLabel>Identity Type *</InputLabel>
                <Select
                  value={headIdentityType}
                  label="Identity Type *"
                  onChange={(e) => { setHeadIdentityType(e.target.value); clearFieldError("headIdentityType"); }}
                >
                  <MenuItem value="citizenship">Citizenship</MenuItem>
                  <MenuItem value="national_id">National ID</MenuItem>
                  <MenuItem value="passport">Passport</MenuItem>
                </Select>
                {fieldErrors.headIdentityType && <FormHelperText>{fieldErrors.headIdentityType}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Identity Number *"
                value={headIdentityNumber}
                onChange={(e) => { setHeadIdentityNumber(e.target.value); clearFieldError("headIdentityNumber"); }}
                error={Boolean(fieldErrors.headIdentityNumber)}
                helperText={fieldErrors.headIdentityNumber}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <ImageUploadBox
                label="Front Identity Photo *"
                value={headIdentityFront}
                setter={(val) => { setHeadIdentityFront(val); clearFieldError("headIdentityFront"); }}
                error={Boolean(fieldErrors.headIdentityFront)}
                helperText={fieldErrors.headIdentityFront}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <ImageUploadBox
                label="Back Identity Photo (Optional)"
                value={headIdentityBack}
                setter={setHeadIdentityBack}
              />
            </Grid>
            <Grid item xs={12}>
              <ImageUploadBox
                label="Municipality Registration / Delegation Document (PDF/Img) *"
                value={registrationDoc}
                setter={(val) => { setRegistrationDoc(val); clearFieldError("registrationDoc"); }}
                accept="image/*,application/pdf"
                error={Boolean(fieldErrors.registrationDoc)}
                helperText={fieldErrors.registrationDoc}
              />
            </Grid>
          </Grid>
        )}

        {activeStep === 3 && (
          <Box>
            <Alert icon={<CheckCircle size={24} />} severity="info" sx={{ mb: 3 }}>
              Please review all municipality details before submitting for KYC verification.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Municipality Name</Typography><Typography fontWeight={600}>{officialName || "-"}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Official Email</Typography><Typography fontWeight={600}>{officialEmail || "-"}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Official Contact</Typography><Typography fontWeight={600}>{officialContact || "-"}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Total Wards</Typography><Typography fontWeight={600}>{totalWards || "1"}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Mayor / Chairperson</Typography><Typography fontWeight={600}>{mayorName || "-"}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Administrative Head</Typography><Typography fontWeight={600}>{headName || "-"}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Head Contact</Typography><Typography fontWeight={600}>{headContact || "-"}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Identity Document</Typography><Typography fontWeight={600}>{headIdentityType} ({headIdentityNumber || "-"})</Typography></Grid>
              <Grid item xs={12} mt={2}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Uploaded Documents</Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  {logoBase64 && <Typography variant="body2" color="primary">✓ Logo Attached</Typography>}
                  {headIdentityFront && <Typography variant="body2" color="primary">✓ Identity Front Attached</Typography>}
                  {headIdentityBack && <Typography variant="body2" color="primary">✓ Identity Back Attached</Typography>}
                  {registrationDoc && <Typography variant="body2" color="primary">✓ Registration Document Attached</Typography>}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>

      <Box display="flex" justifyContent="space-between" mt={4}>
        <Button disabled={activeStep === 0 || loading} onClick={handleBack} variant="outlined">
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading} sx={{ minWidth: 140 }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : "Submit for KYC"}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        )}
      </Box>
    </Card>
  );
};
