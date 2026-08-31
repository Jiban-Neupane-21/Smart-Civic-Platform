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
  Grid,
  Card,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { departmentApi } from "../../api/modules/department.api";
import Swal from "sweetalert2";

const steps = ["Department Details", "Leadership Info", "Verification Documents", "Review & Submit"];

const ImageUploadBox = ({
  label,
  value,
  setter,
  accept = "image/*"
}: {
  label: string;
  value: string | null;
  setter: React.Dispatch<React.SetStateAction<string | null>>;
  accept?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isPdf = value?.startsWith("data:application/pdf");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire("File Too Large", "Max file size is 5MB", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Box
      onClick={() => inputRef.current?.click()}
      sx={{
        border: "2px dashed", borderColor: value ? "primary.main" : "divider",
        borderRadius: 2, p: 2, textAlign: "center", cursor: "pointer",
        bgcolor: value ? "rgba(99,102,241,0.04)" : "background.default",
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      <input ref={inputRef} type="file" hidden accept={accept} onChange={handleFileUpload} />
      {value ? (
        isPdf ? (
          <Box><FileText size={32} color="#6366F1" /><Typography variant="caption" display="block">PDF Uploaded</Typography></Box>
        ) : (
          <img src={value} alt="upload" style={{ maxHeight: 100, maxWidth: "100%", borderRadius: 8 }} />
        )
      ) : (
        <Box><Upload size={28} color="#9CA3AF" /><Typography variant="subtitle2" mt={1}>{label}</Typography></Box>
      )}
    </Box>
  );
};

export const DepartmentKycOnboarding: React.FC = () => {
  const { user, login } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Department Details
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCategory, setDepartmentCategory] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");

  // Step 2: Leadership
  const [headName, setHeadName] = useState(user?.full_name || "");
  const [headEmail, setHeadEmail] = useState(user?.email || "");
  const [headContact, setHeadContact] = useState("");

  // Step 3: Documents
  const [headIdentityType, setHeadIdentityType] = useState("");
  const [headIdentityNumber, setHeadIdentityNumber] = useState("");
  const [headIdentityFront, setHeadIdentityFront] = useState<string | null>(null);
  const [headIdentityBack, setHeadIdentityBack] = useState<string | null>(null);

  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        const res = await departmentApi.getMyProfile();
        if (res.success && res.data) {
          const p = res.data;
          if (p.department_logo) setLogoBase64(p.department_logo);
          if (p.department_name) setDepartmentName(p.department_name);
          if (p.department_category) setDepartmentCategory(p.department_category);
          if (p.official_email) setOfficialEmail(p.official_email);
          
          if (p.head_name) setHeadName(p.head_name);
          if (p.head_email) setHeadEmail(p.head_email);
          if (p.head_contact_no) setHeadContact(p.head_contact_no);
          
          if (p.head_identity_type) setHeadIdentityType(p.head_identity_type);
          if (p.head_identity_number) setHeadIdentityNumber(p.head_identity_number);
          if (p.head_identity_front_url) setHeadIdentityFront(p.head_identity_front_url);
        }
      } catch (err) {
        // Ignored, they just start with empty form
      }
    };
    fetchExistingData();
  }, []);

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    if (!headName || !headContact || !headIdentityType || !headIdentityNumber || !headIdentityFront) {
      setError("Please ensure all mandatory fields and documents are provided.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        official_email: officialEmail,
        head_name: headName,
        head_email: headEmail,
        head_contact_no: headContact,
        head_identity_type: headIdentityType,
        head_identity_number: headIdentityNumber,
      };

      if (logoBase64 && !logoBase64.startsWith("http")) payload.department_logo_base64 = logoBase64;
      if (headIdentityFront && !headIdentityFront.startsWith("http")) payload.head_identity_front_base64 = headIdentityFront;
      if (headIdentityBack && !headIdentityBack.startsWith("http")) payload.head_identity_back_base64 = headIdentityBack;

      const res = await departmentApi.updateMyProfile(payload);
      
      if (res.success) {
        // Sync context
        const token = localStorage.getItem("access_token");
        if (token && user) {
          login(token, {
            ...user,
            identity_type: payload.head_identity_type,
            identity_number: payload.head_identity_number,
            identity_document_url: res.data?.head_identity_front_url || user.identity_document_url,
          });
        }
        
        Swal.fire("Verified!", "Your Department KYC has been submitted.", "success").then(() => {
          window.location.href = "/department_head/dashboard";
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to submit KYC.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: { xs: 3, md: 5 }, maxWidth: 800, margin: "0 auto", borderRadius: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
      <Typography variant="h4" fontWeight={800} align="center" gutterBottom>
        Department Setup
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" mb={4}>
        Complete these steps to verify and activate your department operations.
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
              <Typography variant="subtitle2" gutterBottom>Department Logo</Typography>
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
            <Grid item xs={12}><TextField fullWidth label="Department Name" disabled value={departmentName} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Department Category" disabled value={departmentCategory} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Official Email" value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} /></Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}><Divider>Department Head Details</Divider></Grid>
            <Grid item xs={12}><TextField fullWidth label="Head Name *" value={headName} onChange={(e) => setHeadName(e.target.value)} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Head Email" value={headEmail} onChange={(e) => setHeadEmail(e.target.value)} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Head Contact No. *" value={headContact} onChange={(e) => setHeadContact(e.target.value)} /></Grid>
          </Grid>
        )}

        {activeStep === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Identity Type *</InputLabel>
                <Select value={headIdentityType} label="Identity Type *" onChange={(e) => setHeadIdentityType(e.target.value)}>
                  <MenuItem value="citizenship">Citizenship</MenuItem>
                  <MenuItem value="national_id">National ID</MenuItem>
                  <MenuItem value="passport">Passport</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Identity Number *" value={headIdentityNumber} onChange={(e) => setHeadIdentityNumber(e.target.value)} /></Grid>
            <Grid item xs={12} sm={6}><ImageUploadBox label="Front Identity Photo *" value={headIdentityFront} setter={setHeadIdentityFront} /></Grid>
            <Grid item xs={12} sm={6}><ImageUploadBox label="Back Identity Photo" value={headIdentityBack} setter={setHeadIdentityBack} /></Grid>
          </Grid>
        )}

        {activeStep === 3 && (
          <Box>
            <Alert icon={<CheckCircle size={24} />} severity="info" sx={{ mb: 3 }}>
              Please review your details before submitting for verification.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={6}><Typography variant="subtitle2" color="text.secondary">Department</Typography><Typography fontWeight={600}>{departmentName || "-"}</Typography></Grid>
              <Grid item xs={6}><Typography variant="subtitle2" color="text.secondary">Email</Typography><Typography fontWeight={600}>{officialEmail || "-"}</Typography></Grid>
              <Grid item xs={6}><Typography variant="subtitle2" color="text.secondary">Category</Typography><Typography fontWeight={600}>{departmentCategory || "-"}</Typography></Grid>
              <Grid item xs={6}><Typography variant="subtitle2" color="text.secondary">Head Name</Typography><Typography fontWeight={600}>{headName || "-"}</Typography></Grid>
              <Grid item xs={12} mt={2}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Uploaded Documents</Typography>
                <Box display="flex" gap={2}>
                  {logoBase64 && <Typography variant="body2" color="primary">✓ Logo</Typography>}
                  {headIdentityFront && <Typography variant="body2" color="primary">✓ Identity Document</Typography>}
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
          <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading} sx={{ minWidth: 120 }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : "Submit"}
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
