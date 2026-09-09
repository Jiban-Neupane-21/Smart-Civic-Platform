import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { Upload, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { KycFilePreviewCard } from "./KycFilePreviewCard";
import { useAuth } from "../../hooks/useAuth";
import { staffApi } from "../../api/modules/staff.api";
import Swal from "sweetalert2";
import {
  isAtLeast18,
  getMaxDobFor18,
  getMinDob,
  isValidNepalPhone,
  isValidName,
  isValidIdentityNumber,
} from "../../validation/kyc.validators";

const steps = [
  "Personal Info",
  "Employment & Role",
  "Identity Documents",
  "Review & Submit",
];

const compressImageFile = (file: File, maxDim = 1600, quality = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === "image/png" || file.type === "image/jpeg" ? "image/jpeg" : file.type;
        resolve(canvas.toDataURL(mime, quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

const DocumentUploadBox = ({
  label,
  value,
  setter,
  accept = "image/*,application/pdf",
}: {
  label: string;
  value: string | null;
  setter: React.Dispatch<React.SetStateAction<string | null>>;
  accept?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isPdf = value?.startsWith("data:application/pdf");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      Swal.fire("File Too Large", "Max file size is 10MB", "warning");
      return;
    }
    const compressed = await compressImageFile(file);
    if (compressed) setter(compressed);
  };

  return (
    <Box
      onClick={() => inputRef.current?.click()}
      sx={{
        border: "2px dashed",
        borderColor: value ? "primary.main" : "divider",
        borderRadius: 2,
        p: 2.5,
        textAlign: "center",
        cursor: "pointer",
        bgcolor: value ? "rgba(99,102,241,0.04)" : "background.default",
        transition: "all 0.2s ease-in-out",
        "&:hover": { borderColor: "primary.main", bgcolor: "rgba(99,102,241,0.02)" },
      }}
    >
      <input ref={inputRef} type="file" hidden accept={accept} onChange={handleFileUpload} />
      {value ? (
        isPdf ? (
          <Box sx={{ py: 1 }}>
            <FileText size={36} color="#6366F1" />
            <Typography variant="body2" fontWeight={600} color="primary" mt={1}>
              PDF Document Attached
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Click to replace
            </Typography>
          </Box>
        ) : (
          <Box>
            <img
              src={value}
              alt="upload"
              style={{ maxHeight: 110, maxWidth: "100%", borderRadius: 8, objectFit: "contain" }}
            />
            <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
              Click to change document
            </Typography>
          </Box>
        )
      ) : (
        <Box sx={{ py: 1.5 }}>
          <Upload size={32} color="#9CA3AF" />
          <Typography variant="subtitle2" mt={1} fontWeight={600}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            JPG, PNG or PDF (Max 5MB)
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export const StaffKycOnboarding: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<string>("unverified");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Step 1: Personal & Demographic Details
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [contactNumber, setContactNumber] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [personalAddress, setPersonalAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Step 2: Employment & Designation Details
  const [municipalityName, setMunicipalityName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [expertise, setExpertise] = useState("");

  // Step 3: Identity & Verification Documents
  const [identityType, setIdentityType] = useState("citizenship");
  const [identityNumber, setIdentityNumber] = useState("");
  const [identityFront, setIdentityFront] = useState<string | null>(null);
  const [identityBack, setIdentityBack] = useState<string | null>(null);
  const [appointmentLetter, setAppointmentLetter] = useState<string | null>(null);

  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchExistingKyc = async () => {
      try {
        setInitialLoading(true);
        const res = await staffApi.getKyc();
        const data = res.data;

        if (data) {
          setKycStatus(data.kyc_status || "unverified");
          setRejectionReason(data.kyc_rejection_reason || null);

          // Prefill existing data
          setFullName(data.profile?.full_name || user?.full_name || "");
          setEmail(data.profile?.email || user?.email || "");
          setContactNumber(data.contact_number || data.profile?.phone || "");
          setGender(data.gender || "");
          setDateOfBirth(data.date_of_birth ? data.date_of_birth.split("T")[0] : "");
          setPersonalAddress(data.personal_address || "");
          setEmergencyContactName(data.emergency_contact_name || "");
          setEmergencyContactPhone(data.emergency_contact_phone || "");

          setMunicipalityName(data.municipality?.official_name || "Assigned Municipality");
          setDepartmentName(data.department?.department_name || "Assigned Department");
          setEmployeeId(data.employee_id || "");
          setDesignation(data.designation || "");
          setExpertise(data.expertise || "");

          setIdentityType(data.identity_type || "citizenship");
          setIdentityNumber(data.identity_number || "");
          setIdentityFront(data.identity_front_url || null);
          setIdentityBack(data.identity_back_url || null);
          setAppointmentLetter(data.appointment_letter_url || null);
          setPhotoBase64(data.photo_url || null);
        }
      } catch (err: any) {
        console.error("Failed to load staff KYC details:", err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchExistingKyc();
  }, [user]);

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 0) {
      if (!fullName.trim()) {
        errors.fullName = "Full legal name is required";
      } else if (!isValidName(fullName)) {
        errors.fullName = "Please enter a valid legal name (at least 3 characters, letters only)";
      }

      if (!contactNumber.trim()) {
        errors.contactNumber = "Primary contact phone is required";
      } else if (!isValidNepalPhone(contactNumber)) {
        errors.contactNumber = "Must be a valid 10-digit Nepal mobile number (e.g. 98XXXXXXXX)";
      }

      if (!dateOfBirth) {
        errors.dateOfBirth = "Date of birth is required for verification";
      } else if (!isAtLeast18(dateOfBirth)) {
        errors.dateOfBirth = "You must be at least 18 years old to complete verification";
      }

      if (emergencyContactPhone.trim()) {
        if (!isValidNepalPhone(emergencyContactPhone)) {
          errors.emergencyContactPhone = "Must be a valid 10-digit Nepal phone number";
        } else if (emergencyContactPhone.trim() === contactNumber.trim()) {
          errors.emergencyContactPhone = "Emergency contact must be different from primary contact";
        }
        if (!emergencyContactName.trim()) {
          errors.emergencyContactName = "Contact person name is required when emergency phone is provided";
        }
      }
    } else if (step === 1) {
      if (!designation.trim() && !employeeId.trim()) {
        errors.designation = "Please provide your official job designation or employee badge ID";
      }
    } else if (step === 2) {
      if (!identityNumber.trim()) {
        errors.identityNumber = "Document identification number is required";
      } else if (!isValidIdentityNumber(identityType, identityNumber)) {
        errors.identityNumber = `Invalid ${identityType.replace("_", " ")} format`;
      }

      if (!identityFront) {
        errors.identityFront = "Front photo/scan of identity document is required";
      }

      const requiresBack = ["citizenship", "national_id", "driving_license"].includes(identityType);
      if (requiresBack && !identityBack) {
        errors.identityBack = `Back photo/scan is required for ${identityType.replace("_", " ")}`;
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0]);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (!validateStep(activeStep)) {
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      return;
    }
    if (!declarationAccepted) {
      setError("Please confirm the verification declaration to submit your KYC.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        full_name: fullName.trim(),
        contact_number: contactNumber.trim(),
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        personal_address: personalAddress.trim() || null,
        emergency_contact_name: emergencyContactName.trim() || null,
        emergency_contact_phone: emergencyContactPhone.trim() || null,
        employee_id: employeeId.trim() || null,
        designation: designation.trim() || null,
        expertise: expertise.trim() || null,
        identity_type: identityType,
        identity_number: identityNumber.trim(),
        identity_front_url: identityFront,
        identity_back_url: identityBack,
        appointment_letter_url: appointmentLetter,
        photo_url: photoBase64,
      };

      const res = await staffApi.submitKyc(payload);

      // Update user context with new document and identity fields so kycCompleted becomes true immediately
      if (user) {
        const updated = {
          ...user,
          full_name: payload.full_name,
          phone: payload.contact_number,
          identity_type: payload.identity_type,
          identity_number: payload.identity_number,
          identity_document_url: payload.identity_front_url || user.identity_document_url,
        };
        const token = localStorage.getItem("access_token");
        if (token) {
          login(token, updated);
        }
      }

      setKycStatus("pending");

      Swal.fire({
        icon: "success",
        title: "KYC Submitted for Review",
        text: "Your staff identity onboarding details have been submitted. Your Department Head will review and verify your account.",
        confirmButtonColor: "#4F46E5",
        confirmButtonText: "Go to Staff Dashboard",
      }).then(() => {
        navigate("/staff/dashboard", { replace: true });
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to submit staff KYC onboarding.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // If KYC is already pending review, show a modern status banner
  if (kycStatus === "pending") {
    return (
      <Card sx={{ maxWidth: 700, width: "100%", p: 4, borderRadius: 3, boxShadow: "0 8px 30px rgba(0,0,0,0.08)", textAlign: "center" }}>
        <Box sx={{ display: "inline-flex", p: 2, bgcolor: "rgba(245, 158, 11, 0.1)", borderRadius: "50%", color: "#D97706", mb: 2 }}>
          <Clock size={48} />
        </Box>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          KYC Verification Under Review
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: "auto", mb: 3 }}>
          Your Staff KYC details have been submitted successfully and are currently pending review by your <strong>Department Head</strong>.
        </Typography>
        <Alert severity="info" sx={{ textAlign: "left", mb: 3 }}>
          Once approved, you will gain full access to your assigned department queues, field work assignments, and operational rosters.
        </Alert>
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/staff/dashboard", { replace: true })}
            sx={{ fontWeight: "bold" }}
          >
            Go to Staff Dashboard
          </Button>
          <Button variant="outlined" onClick={() => setKycStatus("editing")}>
            Edit Submitted Information
          </Button>
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 750, width: "100%", p: { xs: 2.5, sm: 4 }, borderRadius: 3, boxShadow: "0 10px 40px rgba(0,0,0,0.08)" }}>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Staff KYC & Profile Onboarding
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Complete your official employee verification to access departmental operations
        </Typography>
      </Box>

      {rejectionReason && (
        <Alert icon={<XCircle size={22} />} severity="error" sx={{ mb: 3 }}>
          <strong>Previous Submission Rejected:</strong> {rejectionReason}. Please correct the required details and resubmit.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ minHeight: 320 }}>
        {/* Step 1: Personal Information */}
        {activeStep === 0 && (
          <Grid container spacing={2.5}>
            <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
              <label htmlFor="photo-upload">
                <input
                  id="photo-upload"
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      Swal.fire("File Too Large", "Max file size is 10MB", "warning");
                      return;
                    }
                    const compressed = await compressImageFile(file, 800, 0.85);
                    if (compressed) setPhotoBase64(compressed);
                  }}
                />
                <Avatar
                  src={photoBase64 || ""}
                  sx={{
                    width: 90,
                    height: 90,
                    cursor: "pointer",
                    border: "2px dashed #9CA3AF",
                    bgcolor: "rgba(99,102,241,0.05)",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                >
                  {!photoBase64 && <Upload size={28} color="#6366F1" />}
                </Avatar>
              </label>
            </Grid>
            <Grid item xs={12} sx={{ textAlign: "center", mt: -1, mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Click to upload profile photo (Optional)
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Legal Name *"
                value={fullName}
                error={!!fieldErrors.fullName}
                helperText={fieldErrors.fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: "" }));
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Personal Email Address"
                value={email}
                disabled
                helperText="Linked to your user login"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Primary Contact Number *"
                value={contactNumber}
                error={!!fieldErrors.contactNumber}
                helperText={fieldErrors.contactNumber || "10-digit mobile (98XXXXXXXX or 97XXXXXXXX)"}
                onChange={(e) => {
                  setContactNumber(e.target.value);
                  if (fieldErrors.contactNumber) setFieldErrors((prev) => ({ ...prev, contactNumber: "" }));
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select value={gender} label="Gender" onChange={(e) => setGender(e.target.value)}>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                  <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date of Birth *"
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: getMaxDobFor18(), min: getMinDob() }}
                value={dateOfBirth}
                error={!!fieldErrors.dateOfBirth}
                helperText={fieldErrors.dateOfBirth || "Must be 18 years or older"}
                onChange={(e) => {
                  setDateOfBirth(e.target.value);
                  if (fieldErrors.dateOfBirth) setFieldErrors((prev) => ({ ...prev, dateOfBirth: "" }));
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Residential / Current Address"
                value={personalAddress}
                onChange={(e) => setPersonalAddress(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Person"
                value={emergencyContactName}
                error={!!fieldErrors.emergencyContactName}
                helperText={fieldErrors.emergencyContactName}
                onChange={(e) => {
                  setEmergencyContactName(e.target.value);
                  if (fieldErrors.emergencyContactName) setFieldErrors((prev) => ({ ...prev, emergencyContactName: "" }));
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={emergencyContactPhone}
                error={!!fieldErrors.emergencyContactPhone}
                helperText={fieldErrors.emergencyContactPhone || "Must be different from primary contact"}
                onChange={(e) => {
                  setEmergencyContactPhone(e.target.value);
                  if (fieldErrors.emergencyContactPhone) setFieldErrors((prev) => ({ ...prev, emergencyContactPhone: "" }));
                }}
              />
            </Grid>
          </Grid>
        )}

        {/* Step 2: Employment & Designation Details */}
        {activeStep === 1 && (
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Assigned Municipality" disabled value={municipalityName} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Assigned Department" disabled value={departmentName} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Employee / Badge ID"
                placeholder="e.g. EMP-2026-440"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Official Job Designation *"
                placeholder="e.g. Field Inspector, Sanitation Lead"
                value={designation}
                error={!!fieldErrors.designation}
                helperText={fieldErrors.designation}
                onChange={(e) => {
                  setDesignation(e.target.value);
                  if (fieldErrors.designation) setFieldErrors((prev) => ({ ...prev, designation: "" }));
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Specialization / Area of Expertise"
                placeholder="e.g. Road Maintenance, Waste Management, Electrical Diagnostics"
                multiline
                rows={2}
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
              />
            </Grid>
          </Grid>
        )}

        {/* Step 3: Identity & Verification Documents */}
        {activeStep === 2 && (
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Identity Document Type *</InputLabel>
                <Select
                  value={identityType}
                  label="Identity Document Type *"
                  onChange={(e) => {
                    setIdentityType(e.target.value);
                    if (fieldErrors.identityNumber) setFieldErrors((prev) => ({ ...prev, identityNumber: "" }));
                  }}
                >
                  <MenuItem value="citizenship">Citizenship Card (नागरिकता)</MenuItem>
                  <MenuItem value="national_id">National Identity Card (राष्ट्रिय परिचयपत्र)</MenuItem>
                  <MenuItem value="passport">Passport</MenuItem>
                  <MenuItem value="driving_license">Driving License</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Document Identification Number *"
                value={identityNumber}
                error={!!fieldErrors.identityNumber}
                helperText={fieldErrors.identityNumber || "Must match official Nepali document format"}
                onChange={(e) => {
                  setIdentityNumber(e.target.value);
                  if (fieldErrors.identityNumber) setFieldErrors((prev) => ({ ...prev, identityNumber: "" }));
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DocumentUploadBox
                label="Document Front Photo / Scan *"
                value={identityFront}
                setter={(val) => {
                  setIdentityFront(val);
                  if (fieldErrors.identityFront) setFieldErrors((prev) => ({ ...prev, identityFront: "" }));
                }}
              />
              {fieldErrors.identityFront && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                  {fieldErrors.identityFront}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <DocumentUploadBox
                label={
                  ["citizenship", "national_id", "driving_license"].includes(identityType)
                    ? "Document Back Photo / Scan *"
                    : "Document Back Photo / Scan (Optional for Passport)"
                }
                value={identityBack}
                setter={(val) => {
                  setIdentityBack(val);
                  if (fieldErrors.identityBack) setFieldErrors((prev) => ({ ...prev, identityBack: "" }));
                }}
              />
              {fieldErrors.identityBack && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                  {fieldErrors.identityBack}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <DocumentUploadBox
                label="Official Staff ID Badge or Appointment Letter (Optional)"
                value={appointmentLetter}
                setter={setAppointmentLetter}
              />
            </Grid>
          </Grid>
        )}

        {/* Step 4: Review & Final Submission */}
        {activeStep === 3 && (
          <Box>
            <Alert icon={<CheckCircle size={24} />} severity="info" sx={{ mb: 3 }}>
              Please review all submitted information before finalizing your staff verification.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Full Name</Typography>
                <Typography variant="body1" fontWeight={600}>{fullName || "—"}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Contact Phone</Typography>
                <Typography variant="body1" fontWeight={600}>{contactNumber || "—"}</Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Department</Typography>
                <Typography variant="body1" fontWeight={600}>{departmentName || "—"}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Designation & ID</Typography>
                <Typography variant="body1" fontWeight={600}>{designation || "Staff"} {employeeId ? `(${employeeId})` : ""}</Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Identity Document</Typography>
                <Typography variant="body1" fontWeight={600}>{identityType.toUpperCase()}: {identityNumber || "—"}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Residential Address</Typography>
                <Typography variant="body1" fontWeight={600}>{personalAddress || "—"}</Typography>
              </Grid>

              <Grid item xs={12} mt={1}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Attached Verification Documents
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Click any document card below to inspect full-size image or PDF before final submission.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <KycFilePreviewCard
                      label="Profile Photo (Passport size)"
                      fileData={photoBase64}
                      height={150}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <KycFilePreviewCard
                      label="Identity Document (Front)"
                      fileData={identityFront}
                      height={150}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <KycFilePreviewCard
                      label="Identity Document (Back)"
                      fileData={identityBack}
                      height={150}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <KycFilePreviewCard
                      label="Appointment / Staff ID Badge"
                      fileData={appointmentLetter}
                      height={150}
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12} mt={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={declarationAccepted}
                      onChange={(e) => setDeclarationAccepted(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I solemnly certify that all submitted information and verification documents are genuine, authentic, and accurately represent my identity and employment.
                    </Typography>
                  }
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Button disabled={activeStep === 0 || loading} onClick={handleBack} variant="outlined">
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={loading || !declarationAccepted}
            sx={{ minWidth: 140, fontWeight: "bold" }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Submit KYC"}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext} sx={{ minWidth: 100 }}>
            Next
          </Button>
        )}
      </Box>
    </Card>
  );
};

export default StaffKycOnboarding;
