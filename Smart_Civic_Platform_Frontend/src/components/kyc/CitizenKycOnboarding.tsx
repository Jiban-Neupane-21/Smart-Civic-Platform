import React, { useState, useRef } from "react";
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
  CircularProgress,
  Alert,
  Divider,
  Checkbox,
  FormControlLabel,
  Paper,
  FormHelperText,
} from "@mui/material";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Camera,
  RotateCcw,
} from "lucide-react";
import { KycFilePreviewCard } from "./KycFilePreviewCard";
import { isValidIdentityNumber } from "../../validation/kyc.validators";
import { citizenApi } from "../../api/modules/citizen.api";
import { profileApi } from "../../api/modules/profile.api";
import Swal from "sweetalert2";

const STEPS = [
  "Identity Details",
  "Document Proofs",
  "Verification Portrait",
  "Review & Submit",
];

const NEPAL_DISTRICTS = [
  "Achham", "Arghakhanchi", "Baglung", "Baitadi", "Bajhang", "Bajura", "Banke", "Bara", "Bardiya", "Bhaktapur",
  "Bhojpur", "Chitwan", "Dadeldhura", "Dailekh", "Dang", "Darchula", "Dhading", "Dhankuta", "Dhanusha", "Dolakha",
  "Dolpa", "Doti", "Gorkha", "Gulmi", "Humla", "Ilam", "Jajarkot", "Jhapa", "Jumla", "Kailali",
  "Kalikot", "Kanchanpur", "Kapilvastu", "Kaski", "Kavrepalanchok", "Khotang", "Lalitpur", "Lamjung", "Mahottari", "Makwanpur",
  "Manang", "Morang", "Mugu", "Mustang", "Myagdi", "Nawalpur (Nawalparasi East)", "Parasi (Nawalparasi West)", "Nuwakot", "Okhaldhunga", "Palpa",
  "Panchthar", "Parbat", "Parsa", "Pyuthan", "Ramechhap", "Rasuwa", "Rautahat", "Rolpa", "Rukum East", "Rukum West",
  "Rupandehi", "Salyan", "Sankhuwasabha", "Saptari", "Sarlahi", "Sindhuli", "Sindhupalchok", "Siraha", "Solukhumbu", "Sunsari",
  "Surkhet", "Syangja", "Tanahun", "Taplejung", "Terhathum", "Udayapur"
];

const compressImageFile = (file: File, maxDim = 1600, quality = 0.82): Promise<string> => {
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
        const mime = file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp" ? "image/jpeg" : file.type;
        resolve(canvas.toDataURL(mime, quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

interface CitizenKycOnboardingProps {
  initialData?: {
    identity_type?: string;
    identity_number?: string;
    identity_front_image_url?: string | null;
    identity_back_image_url?: string | null;
    profile_picture?: string | null;
  };
  profileDetails: {
    full_name: string;
    email: string;
    phone?: string;
    gender?: string;
    date_of_birth?: string;
    permanent_address?: string;
    current_address?: string;
  };
  onSuccess: (updated: {
    identity_type: string;
    identity_number: string;
    front_image?: string;
    back_image?: string;
    profile_picture?: string;
  }) => void;
  onCancel?: () => void;
}

export const CitizenKycOnboarding: React.FC<CitizenKycOnboardingProps> = ({
  initialData,
  profileDetails,
  onSuccess,
  onCancel,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Document Details
  const [identityType, setIdentityType] = useState(initialData?.identity_type || "citizenship");
  const [identityNumber, setIdentityNumber] = useState(initialData?.identity_number || "");
  const [issuedDistrict, setIssuedDistrict] = useState("");
  const [issueDate, setIssueDate] = useState("");

  // Step 2: Document Proofs
  const [frontImage, setFrontImage] = useState<string | null>(initialData?.identity_front_image_url || null);
  const [backImage, setBackImage] = useState<string | null>(initialData?.identity_back_image_url || null);

  // Step 3: Verification Portrait
  const [portraitImage, setPortraitImage] = useState<string | null>(initialData?.profile_picture || null);

  // Step 4: Declaration
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // File input refs
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);

  const requiresBack = ["citizenship", "national_id", "driving_license"].includes(identityType);

  const getIdentityHint = (type: string): string => {
    switch (type) {
      case "citizenship":
        return "Standard format: XX-XX-XX-XXXXX or XXXXX/XXXXX";
      case "national_id":
        return "10 to 16 digit National Identity Card Number";
      case "passport":
        return "Standard 7 to 9 alphanumeric passport number (e.g. PA1234567)";
      case "driving_license":
        return "Official vehicle driving license number (e.g. 01-06-00123456)";
      case "voter_id":
        return "Voter identification number registered with Election Commission";
      default:
        return "Enter official government identity document number";
    }
  };

  const isStep1Valid = (): boolean => {
    if (!identityType || !identityNumber.trim()) return false;
    return isValidIdentityNumber(identityType, identityNumber.trim());
  };

  const isStep2Valid = (): boolean => {
    if (!frontImage) return false;
    if (requiresBack && !backImage) return false;
    return true;
  };

  const isStep3Valid = (): boolean => {
    return !!portraitImage;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      Swal.fire("File Too Large", "Maximum file size is 10MB.", "warning");
      return;
    }

    try {
      const compressed = await compressImageFile(file);
      if (compressed) {
        setter(compressed);
      }
    } catch {
      Swal.fire("Upload Failed", "Could not process image. Please try another file.", "error");
    } finally {
      e.target.value = "";
    }
  };

  const handleNext = () => {
    setError(null);
    if (activeStep === 0 && !isStep1Valid()) {
      setError(`Please provide a valid document number for ${identityType.replace(/_/g, " ")}.`);
      return;
    }
    if (activeStep === 1 && !isStep2Valid()) {
      if (!frontImage) {
        setError("Please upload the front image/PDF of your document.");
        return;
      }
      if (requiresBack && !backImage) {
        setError(`Please upload the back image of your ${identityType.replace(/_/g, " ")}.`);
        return;
      }
    }
    if (activeStep === 2 && !isStep3Valid()) {
      setError("Please provide a verification portrait photo.");
      return;
    }

    setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!declarationAccepted) {
      setError("You must agree to the declaration statement before submitting.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Submit identity credentials
      await citizenApi.uploadIdentity({
        identity_type: identityType as any,
        identity_number: identityNumber.trim(),
        front_image: frontImage || undefined,
        back_image: backImage || undefined,
      });

      // 2. If portrait was updated, sync profile picture
      if (portraitImage && portraitImage !== initialData?.profile_picture) {
        try {
          await profileApi.updateProfilePicture(portraitImage);
        } catch (avatarErr) {
          console.warn("Avatar sync note:", avatarErr);
        }
      }

      await Swal.fire({
        icon: "success",
        title: "KYC Application Submitted",
        text: "Your identity details and verification documents have been securely submitted to your municipality office for verification.",
        confirmButtonColor: "#2563EB",
      });

      onSuccess({
        identity_type: identityType,
        identity_number: identityNumber.trim(),
        front_image: frontImage || undefined,
        back_image: backImage || undefined,
        profile_picture: portraitImage || undefined,
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to submit KYC application";
      setError(msg);
      Swal.fire({
        icon: "error",
        title: "Submission Error",
        text: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)",
          color: "white",
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
          <ShieldCheck size={28} />
          <Typography variant="h6" fontWeight={700}>
            Citizen Identity Verification (KYC)
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.9, maxWidth: 650 }}>
          Verify your official citizenship credentials to unlock verified civic status, participate in ward level initiatives, and expedite municipal service processing.
        </Typography>
      </Paper>

      {/* Stepper Header */}
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, p: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label, index) => (
            <Step key={label} completed={index < activeStep}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" icon={<AlertCircle size={20} />} sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* ═══ STEP 1: IDENTITY DETAILS ═══ */}
      {activeStep === 0 && (
        <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Box mb={3}>
            <Typography variant="subtitle1" fontWeight={700}>
              Step 1: Document Selection & Credentials
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select your primary government-issued identity document and enter the exact credential details.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Identity Document Type</InputLabel>
                <Select
                  value={identityType}
                  label="Identity Document Type"
                  onChange={(e) => setIdentityType(e.target.value)}
                >
                  <MenuItem value="citizenship">Nepali Citizenship Card (नागरिकता)</MenuItem>
                  <MenuItem value="national_id">National Identity Card (राष्ट्रिय परिचयपत्र - NID)</MenuItem>
                  <MenuItem value="passport">Nepalese Passport (राहदानी)</MenuItem>
                  <MenuItem value="driving_license">Driving License (सवारी चालक अनुमतिपत्र)</MenuItem>
                  <MenuItem value="voter_id">Voter ID Card (मतदाता परिचयपत्र)</MenuItem>
                </Select>
                <FormHelperText>
                  {requiresBack ? "Requires both front and back document uploads" : "Requires front photo or bio-data page upload"}
                </FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Identity Document Number"
                value={identityNumber}
                onChange={(e) => setIdentityNumber(e.target.value)}
                error={!!identityNumber && !isValidIdentityNumber(identityType, identityNumber)}
                helperText={
                  identityNumber && !isValidIdentityNumber(identityType, identityNumber)
                    ? `Invalid format. ${getIdentityHint(identityType)}`
                    : getIdentityHint(identityType)
                }
                placeholder="e.g. 27-01-78-12345"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Issued District</InputLabel>
                <Select
                  value={issuedDistrict}
                  label="Issued District"
                  onChange={(e) => setIssuedDistrict(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select District (Optional)</em>
                  </MenuItem>
                  {NEPAL_DISTRICTS.map((district) => (
                    <MenuItem key={district} value={district}>
                      {district}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>District where your document was issued / authenticated</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Document Issue Date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: new Date().toISOString().split("T")[0] }}
                helperText="Official date of document issuance (BS or AD)"
              />
            </Grid>
          </Grid>
        </Card>
      )}

      {/* ═══ STEP 2: DOCUMENT PROOFS ═══ */}
      {activeStep === 1 && (
        <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Box mb={2.5}>
            <Typography variant="subtitle1" fontWeight={700}>
              Step 2: Upload Identity Document Proofs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload clear photographs or PDF scans of your {identityType.replace(/_/g, " ")}.
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="caption" fontWeight={600} display="block">
              PHOTO GUIDELINES FOR FAST VERIFICATION:
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ensure all four corners are visible, text and portrait are sharp without glare or shadow, and file size is under 10MB (JPEG, PNG, WebP, or PDF).
            </Typography>
          </Alert>

          <Grid container spacing={3}>
            {/* Front Document */}
            <Grid item xs={12} md={requiresBack ? 6 : 12}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Document Front Page <span style={{ color: "#EF4444" }}>*</span>
              </Typography>
              {frontImage ? (
                <Box>
                  <KycFilePreviewCard
                    label="Front Document"
                    fileData={frontImage}
                    height={180}
                    onRemove={() => setFrontImage(null)}
                  />
                  <Box display="flex" justifyContent="center" mt={1}>
                    <Button
                      size="small"
                      startIcon={<RotateCcw size={14} />}
                      onClick={() => frontInputRef.current?.click()}
                      sx={{ textTransform: "none" }}
                    >
                      Replace Front Document
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  onClick={() => frontInputRef.current?.click()}
                  sx={{
                    border: "2px dashed",
                    borderColor: "primary.light",
                    borderRadius: 2.5,
                    p: 4,
                    textAlign: "center",
                    cursor: "pointer",
                    bgcolor: "rgba(37,99,235,0.02)",
                    "&:hover": { borderColor: "primary.main", bgcolor: "rgba(37,99,235,0.05)" },
                    transition: "all 0.2s ease",
                  }}
                >
                  <Upload size={36} color="#2563EB" />
                  <Typography variant="subtitle2" fontWeight={600} mt={1.5}>
                    Upload Document (Front)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    Supports JPG, PNG, WebP or PDF (Max 10MB)
                  </Typography>
                  <Button variant="outlined" size="small" sx={{ mt: 2, textTransform: "none", borderRadius: 2 }}>
                    Browse Files
                  </Button>
                </Box>
              )}
              <input
                ref={frontInputRef}
                type="file"
                hidden
                accept="image/*,application/pdf"
                onChange={(e) => handleFileUpload(e, setFrontImage)}
              />
            </Grid>

            {/* Back Document (if applicable) */}
            {requiresBack && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Document Back Page <span style={{ color: "#EF4444" }}>*</span>
                </Typography>
                {backImage ? (
                  <Box>
                    <KycFilePreviewCard
                      label="Back Document"
                      fileData={backImage}
                      height={180}
                      onRemove={() => setBackImage(null)}
                    />
                    <Box display="flex" justifyContent="center" mt={1}>
                      <Button
                        size="small"
                        startIcon={<RotateCcw size={14} />}
                        onClick={() => backInputRef.current?.click()}
                        sx={{ textTransform: "none" }}
                      >
                        Replace Back Document
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    onClick={() => backInputRef.current?.click()}
                    sx={{
                      border: "2px dashed",
                      borderColor: "secondary.light",
                      borderRadius: 2.5,
                      p: 4,
                      textAlign: "center",
                      cursor: "pointer",
                      bgcolor: "rgba(99,102,241,0.02)",
                      "&:hover": { borderColor: "secondary.main", bgcolor: "rgba(99,102,241,0.05)" },
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Upload size={36} color="#6366F1" />
                    <Typography variant="subtitle2" fontWeight={600} mt={1.5}>
                      Upload Document (Back)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      Supports JPG, PNG, WebP or PDF (Max 10MB)
                    </Typography>
                    <Button variant="outlined" size="small" sx={{ mt: 2, textTransform: "none", borderRadius: 2 }}>
                      Browse Files
                    </Button>
                  </Box>
                )}
                <input
                  ref={backInputRef}
                  type="file"
                  hidden
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, setBackImage)}
                />
              </Grid>
            )}
          </Grid>
        </Card>
      )}

      {/* ═══ STEP 3: VERIFICATION PORTRAIT ═══ */}
      {activeStep === 2 && (
        <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Box mb={2.5}>
            <Typography variant="subtitle1" fontWeight={700}>
              Step 3: Verification Portrait / Face Photo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Provide a clear, front-facing portrait photograph to confirm your identity against the submitted government document.
            </Typography>
          </Box>

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={5} textAlign="center">
              {portraitImage ? (
                <Box>
                  <KycFilePreviewCard
                    label="Official Portrait"
                    fileData={portraitImage}
                    height={200}
                    onRemove={() => setPortraitImage(null)}
                  />
                  <Box display="flex" justifyContent="center" mt={1}>
                    <Button
                      size="small"
                      startIcon={<RotateCcw size={14} />}
                      onClick={() => portraitInputRef.current?.click()}
                      sx={{ textTransform: "none" }}
                    >
                      Change Portrait Photo
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  onClick={() => portraitInputRef.current?.click()}
                  sx={{
                    border: "2px dashed",
                    borderColor: "primary.light",
                    borderRadius: 3,
                    p: 4,
                    textAlign: "center",
                    cursor: "pointer",
                    bgcolor: "rgba(37,99,235,0.02)",
                    "&:hover": { borderColor: "primary.main", bgcolor: "rgba(37,99,235,0.05)" },
                    transition: "all 0.2s ease",
                  }}
                >
                  <Camera size={42} color="#2563EB" />
                  <Typography variant="subtitle2" fontWeight={600} mt={1.5}>
                    Upload Live Portrait
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    JPG, PNG, or WebP photo
                  </Typography>
                  <Button variant="contained" size="small" sx={{ mt: 2, textTransform: "none", borderRadius: 2 }}>
                    Upload Photo
                  </Button>
                </Box>
              )}
              <input
                ref={portraitInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => handleFileUpload(e, setPortraitImage)}
              />
            </Grid>

            <Grid item xs={12} md={7}>
              <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: "grey.50" }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Portrait Quality Checklist:
                </Typography>
                <Box component="ul" sx={{ pl: 2.5, m: 0, typography: "body2", color: "text.secondary" }}>
                  <li style={{ marginBottom: 8 }}>
                    <strong>Direct Face View:</strong> Look straight at the camera with a neutral expression.
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    <strong>No Accessories:</strong> Remove dark sunglasses, caps, or items covering your face outline.
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    <strong>Good Lighting:</strong> Ensure even lighting with no heavy shadows across your face.
                  </li>
                  <li>
                    <strong>Official Use:</strong> This photo will serve as your verified citizen profile badge portrait upon approval.
                  </li>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* ═══ STEP 4: REVIEW & DECLARATION ═══ */}
      {activeStep === 3 && (
        <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Box mb={2.5}>
            <Typography variant="subtitle1" fontWeight={700}>
              Step 4: Comprehensive Review & Legal Declaration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review all details carefully before submitting your application for municipal authentication.
            </Typography>
          </Box>

          <Grid container spacing={2.5} mb={3}>
            {/* Personal Details */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom>
                  Personal Information
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">Full Name:</Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2" fontWeight={600}>{profileDetails.full_name}</Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">Email:</Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">{profileDetails.email}</Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">Phone:</Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">{profileDetails.phone || "—"}</Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">Date of Birth:</Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">{profileDetails.date_of_birth || "—"}</Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">Permanent Address:</Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">{profileDetails.permanent_address || "—"}</Typography>
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            {/* Document Details */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom>
                  Document Credentials
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">Document Type:</Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2" fontWeight={600} textTransform="capitalize">
                      {identityType.replace(/_/g, " ")}
                    </Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">Document Number:</Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {identityNumber}
                    </Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">Issued District:</Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">{issuedDistrict || "—"}</Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">Issue Date:</Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">{issueDate || "—"}</Typography>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          </Grid>

          {/* Document Previews */}
          <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
            Attached Verification Proofs:
          </Typography>
          <Grid container spacing={2} mb={3}>
            {frontImage && (
              <Grid item xs={12} sm={requiresBack ? 4 : 6}>
                <KycFilePreviewCard
                  label="Document Front"
                  fileData={frontImage}
                  height={130}
                />
              </Grid>
            )}
            {backImage && (
              <Grid item xs={12} sm={4}>
                <KycFilePreviewCard
                  label="Document Back"
                  fileData={backImage}
                  height={130}
                />
              </Grid>
            )}
            {portraitImage && (
              <Grid item xs={12} sm={requiresBack ? 4 : 6}>
                <KycFilePreviewCard
                  label="Verification Portrait"
                  fileData={portraitImage}
                  height={130}
                />
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Legal Declaration */}
          <Card variant="outlined" sx={{ p: 2, bgcolor: "rgba(37,99,235,0.02)", borderColor: "primary.light" }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" fontWeight={500}>
                  I solemnly declare that all personal information and identity documents submitted in this application are genuine, valid, and legally belong to me. I acknowledge that furnishing false or misleading credentials constitutes a punishable violation under federal and municipal civic regulations.
                </Typography>
              }
            />
          </Card>
        </Card>
      )}

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
        <Box>
          {onCancel && (
            <Button
              variant="text"
              color="inherit"
              onClick={onCancel}
              sx={{ textTransform: "none", mr: 1 }}
            >
              Cancel
            </Button>
          )}
          {activeStep > 0 && (
            <Button
              variant="outlined"
              startIcon={<ArrowLeft size={16} />}
              onClick={handleBack}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Back
            </Button>
          )}
        </Box>

        <Box>
          {activeStep < STEPS.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<ArrowRight size={16} />}
              onClick={handleNext}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                bgcolor: "#2563EB",
                "&:hover": { bgcolor: "#1d4ed8" },
              }}
            >
              Continue to Step {activeStep + 2}
            </Button>
          ) : (
            <Button
              variant="contained"
              disabled={loading || !declarationAccepted}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckCircle size={18} />}
              onClick={handleSubmit}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                px: 3.5,
                py: 1,
                bgcolor: "#16A34A",
                "&:hover": { bgcolor: "#15803D" },
              }}
            >
              {loading ? "Submitting Application..." : "Submit Official KYC Application"}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};
