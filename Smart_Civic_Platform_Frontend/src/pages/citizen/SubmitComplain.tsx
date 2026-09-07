import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Card, TextField, Button, MenuItem, Grid,
  InputLabel, FormControl, Select, CircularProgress, Alert,
  Stepper, Step, StepLabel, RadioGroup, FormControlLabel, Radio,
  Switch, Paper, Chip, IconButton, Tooltip
} from "@mui/material";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import AddPhotoAlternate from "@mui/icons-material/AddPhotoAlternate";
import Videocam from "@mui/icons-material/Videocam";
import DeleteOutline from "@mui/icons-material/DeleteOutlined";
import AttachFile from "@mui/icons-material/AttachFile";
import Swal from "sweetalert2";
import { publicApi, complaintsApi, citizenApi, apiClient } from "../../api";
import { useAuth } from "../../hooks/useAuth";
import type { Province, District, Municipality, Ward, ComplaintCategory, SubmitComplaintPayload } from "../../api/types";
import type { DuplicateMatch } from "../../api/modules/citizen.api";
import { DuplicateDetectionCard } from "../../components/complaint/DuplicateDetectionCard";
import { detectSeverity, type SeverityAnalysisResult } from "../../utils/severityDetector";

const STEPS = ["Location", "Category", "Details", "Review"];

export const SubmitComplaint: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const userMunicipalityId = (user as any)?.municipalityId || (user as any)?.municipality_id;
  
  const [profile, setProfile] = useState<any>(null);
  
  useEffect(() => {
    apiClient.get('/auth/me')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setProfile(res.data.data);
        } else if (res.data) {
          setProfile(res.data);
        }
      })
      .catch(console.error);
  }, []);

  const registeredWardId = profile?.citizen_details?.current_ward_id || profile?.citizen_details?.permanent_ward_id;
  const registeredMunicipalityId = profile?.citizen_details?.current_municipality_id || profile?.citizen_details?.permanent_municipality_id || profile?.municipality_id || userMunicipalityId;
  const registeredAddressStr = profile?.citizen_details?.current_address || profile?.citizen_details?.permanent_address;

  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- Location State ---
  const [locationSource, setLocationSource] = useState<'registered_address' | 'manual' | 'gps'>('manual');
  
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [provId, setProvId] = useState("");
  const [distId, setDistId] = useState("");
  const [muniId, setMuniId] = useState("");
  const [wardId, setWardId] = useState("");

  const [gpsLocation, setGpsLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // --- Category State ---
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId] = useState("");
  const [hasSecondary, setHasSecondary] = useState(false);
  const [secondaryCategoryId, setSecondaryCategoryId] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);

  // --- Details State ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SeverityAnalysisResult | null>(null);

  // --- Duplicate Detection State (Algorithm 1) ---
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [hasDismissedDuplicates, setHasDismissedDuplicates] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);

  // --- Evidence / Proof Media State ---
  interface MediaItem {
    id: string;
    name: string;
    size: number;
    type: 'image' | 'video';
    base64: string;
    previewUrl: string;
  }
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isReadingMedia, setIsReadingMedia] = useState(false);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setMediaError(null);
    const currentImages = mediaFiles.filter(m => m.type === 'image');
    if (currentImages.length + files.length > 5) {
      setMediaError("You can upload a maximum of 5 photos.");
      return;
    }

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(f.type)) {
        setMediaError(`"${f.name}" is not a supported image format (JPEG, PNG, WebP).`);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setMediaError(`"${f.name}" exceeds the 10 MB per-photo limit.`);
        return;
      }
      validFiles.push(f);
    }

    setIsReadingMedia(true);
    let loadedCount = 0;
    const newItems: MediaItem[] = [];

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const previewUrl = URL.createObjectURL(file);
        newItems.push({
          id: `${Date.now()}_${Math.random()}`,
          name: file.name,
          size: file.size,
          type: 'image',
          base64,
          previewUrl,
        });
        loadedCount++;
        if (loadedCount === validFiles.length) {
          setMediaFiles(prev => [...prev, ...newItems]);
          setIsReadingMedia(false);
        }
      };
      reader.onerror = () => {
        setMediaError("Failed to read image file.");
        setIsReadingMedia(false);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaError(null);
    const existingVideo = mediaFiles.find(m => m.type === 'video');
    if (existingVideo) {
      setMediaError("Only 1 short video clip is permitted per grievance. Please delete the current video first.");
      return;
    }

    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp'];
    if (!validVideoTypes.includes(file.type) && !/\.(mp4|webm|mov|3gp)$/i.test(file.name)) {
      setMediaError(`"${file.name}" is not a supported video format (MP4, WebM, MOV).`);
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setMediaError(`"${file.name}" exceeds the 30 MB video size limit. Please choose a shorter clip.`);
      return;
    }

    setIsReadingMedia(true);
    const previewUrl = URL.createObjectURL(file);

    const videoElem = document.createElement('video');
    videoElem.preload = 'metadata';
    videoElem.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElem.src);
      if (videoElem.duration > 120) {
        setMediaError("Video duration exceeds 2 minutes. Please select a short clip under 60-120 seconds.");
        setIsReadingMedia(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setMediaFiles(prev => [
          ...prev,
          {
            id: `${Date.now()}_${Math.random()}`,
            name: file.name,
            size: file.size,
            type: 'video',
            base64,
            previewUrl,
          }
        ]);
        setIsReadingMedia(false);
      };
      reader.onerror = () => {
        setMediaError("Failed to read video file.");
        setIsReadingMedia(false);
      };
      reader.readAsDataURL(file);
    };
    videoElem.onerror = () => {
      // Fallback if metadata read is unassisted
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setMediaFiles(prev => [
          ...prev,
          {
            id: `${Date.now()}_${Math.random()}`,
            name: file.name,
            size: file.size,
            type: 'video',
            base64,
            previewUrl,
          }
        ]);
        setIsReadingMedia(false);
      };
      reader.readAsDataURL(file);
    };
    videoElem.src = previewUrl;

    e.target.value = '';
  };

  const handleRemoveMedia = (id: string) => {
    setMediaFiles(prev => {
      const item = prev.find(m => m.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter(m => m.id !== id);
    });
  };

  useEffect(() => {
    const result = detectSeverity(title, description);
    setAnalysisResult(result);
    if (!isManualOverride) {
      setSeverity(result.severity);
    }
  }, [title, description, isManualOverride]);

  // Real-time Spatiotemporal Duplicate Detector
  useEffect(() => {
    if (!title || title.trim().length < 5 || hasDismissedDuplicates) {
      setDuplicates([]);
      return;
    }

    const timer = setTimeout(async () => {
      const targetMuniId = locationSource === 'manual' ? muniId : registeredMunicipalityId;
      if (!targetMuniId) return;

      try {
        setIsCheckingDuplicates(true);
        const res = await citizenApi.checkDuplicates({
          title,
          description,
          category_id: primaryCategoryId || undefined,
          municipality_id: targetMuniId,
          ward_number: locationSource === 'manual' ? (wardId ? Number(wardId) : null) : null,
          latitude: locationSource === 'gps' ? gpsLocation?.lat : null,
          longitude: locationSource === 'gps' ? gpsLocation?.lng : null,
        });

        if (res.success && res.data?.duplicates) {
          setDuplicates(res.data.duplicates);
        }
      } catch (err) {
        console.warn("Duplicate check error:", err);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [title, description, primaryCategoryId, locationSource, muniId, registeredMunicipalityId, wardId, gpsLocation, hasDismissedDuplicates]);

  const handleUpvote = async (complaintId: string, trackingId: string) => {
    try {
      setIsUpvoting(true);
      setUpvotingId(complaintId);
      const res = await citizenApi.upvoteComplaint(complaintId);
      if (res.success) {
        Swal.fire({
          icon: "success",
          title: "Endorsement Recorded!",
          html: `You have successfully endorsed complaint <b>#${trackingId}</b>.<br/><br/>You are now following this grievance and will receive real-time notifications when municipal teams work on and resolve it.`,
          confirmButtonColor: "#059669",
          confirmButtonText: "Go to Complaint History",
        }).then(() => {
          navigate("/citizen/complaint-history");
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "info",
        title: "Already Endorsed",
        text: err.response?.data?.message || err.message || "You have already upvoted this complaint.",
        confirmButtonColor: "#059669",
      });
    } finally {
      setIsUpvoting(false);
      setUpvotingId(null);
    }
  };

  useEffect(() => {
    fetchProvinces();
    fetchCategories("default"); // Backend returns all categories regardless of ID
    if (registeredMunicipalityId) {
      setLocationSource('registered_address');
    }
  }, [registeredMunicipalityId]);

  useEffect(() => {
    if (provId) {
      publicApi.getDistricts(provId).then(res => setDistricts(res.data)).catch(console.error);
    } else {
      setDistricts([]);
    }
    setDistId("");
  }, [provId]);

  useEffect(() => {
    if (distId) {
      publicApi.getMunicipalities(distId).then(res => setMunicipalities(res.data)).catch(console.error);
    } else {
      setMunicipalities([]);
    }
    setMuniId("");
  }, [distId]);

  useEffect(() => {
    if (muniId) {
      publicApi.getWards(muniId).then(res => setWards(res.data)).catch(console.error);
    } else {
      setWards([]);
    }
    setWardId("");
  }, [muniId]);



  const fetchProvinces = async () => {
    try {
      const res = await publicApi.getProvinces();
      setProvinces(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async (mId: string) => {
    try {
      setLoadingCategories(true);
      const res = await complaintsApi.getCategories(mId);
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsGettingGps(false);
      },
      (error) => {
        alert("Unable to retrieve your location");
        setIsGettingGps(false);
      }
    );
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      if (locationSource === 'manual' && (!wardId || !muniId)) {
        alert("Please select at least a municipality and ward.");
        return;
      }
      if (locationSource === 'gps' && !gpsLocation) {
        alert("Please get your GPS location.");
        return;
      }
    }
    if (activeStep === 1) {
      if (!primaryCategoryId) {
        alert("Please select a primary category.");
        return;
      }
    }
    if (activeStep === 2) {
      if (!title || title.length < 5) {
        alert("Please provide a title of at least 5 characters.");
        return;
      }
      if (!description || description.length < 20) {
        alert("Please provide a description of at least 20 characters.");
        return;
      }

      // Check if duplicate prompt is active
      if (duplicates.length > 0 && !hasDismissedDuplicates) {
        const result = await Swal.fire({
          title: "Similar Complaints Found Nearby!",
          text: `We found ${duplicates.length} existing grievance(s) nearby matching your report. Endorsing an existing report increases its priority and gets it resolved faster without creating duplicate tickets!`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#ed6c02",
          cancelButtonColor: "#64748b",
          confirmButtonText: "Review Similar Complaints",
          cancelButtonText: "Submit Mine Anyway",
        });

        if (result.isConfirmed) {
          return;
        } else {
          setHasDismissedDuplicates(true);
        }
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const payload: SubmitComplaintPayload = {
      location: {
        source: locationSource,
        ...(locationSource === 'manual' ? { municipality_id: muniId, ward_id: wardId } : {}),
        ...(locationSource === 'gps' ? { latitude: gpsLocation?.lat, longitude: gpsLocation?.lng } : {}),
        ...(locationSource === 'registered_address' ? { municipality_id: registeredMunicipalityId, ward_id: registeredWardId } : {})
      },
      category: {
        primary_category_id: primaryCategoryId,
        ...(hasSecondary && secondaryCategoryId ? { secondary_category_id: secondaryCategoryId } : {})
      },
      details: {
        title,
        description,
        severity_level: severity
      },
      ...(mediaFiles.length > 0 ? {
        media: mediaFiles.map(m => ({
          media_base64: m.base64,
          file_name: m.name,
          media_type: m.type,
          file_size: m.size,
        }))
      } : {}),
      step_completed: 4
    };

    try {
      const res = await complaintsApi.createComplaint(payload);
      if (res.success || (res as any).status === "success") {
        Swal.fire({
          icon: "success",
          title: "Complaint Submitted!",
          text: `Tracking ID: ${res.data?.tracking_id || (res.data as any)?.ticketNumber || 'N/A'}`,
          confirmButtonColor: "#059669",
        }).then(() => {
          navigate("/citizen/complaint-history");
        });
      } else {
        setSubmitError((res as any).message || "Failed to submit complaint.");
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 2 }}>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Submit a Complaint
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card sx={{ p: 4, borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        {submitError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {submitError}
          </Alert>
        )}

        {/* STEP 1: LOCATION */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Where is the issue located?</Typography>
            <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
              <RadioGroup
                value={locationSource}
                onChange={(e) => setLocationSource(e.target.value as any)}
              >
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                  <FormControlLabel
                    value="registered_address"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>Use Registered Address</Typography>
                        {registeredMunicipalityId ? (
                          <Typography variant="body2" color="text.secondary">
                            {registeredAddressStr ? registeredAddressStr : "Your profile address"} {registeredWardId ? `(Ward ID: ${registeredWardId.slice(0, 4)}...)` : ""}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="error">
                            No registered address found in your profile.
                          </Typography>
                        )}
                      </Box>
                    }
                    disabled={!registeredMunicipalityId}
                  />
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                  <FormControlLabel
                    value="manual"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>Select Manually</Typography>
                        <Typography variant="body2" color="text.secondary">Choose Province, District, Municipality, and Ward</Typography>
                      </Box>
                    }
                  />
                  {locationSource === 'manual' && (
                    <Grid container spacing={2} sx={{ mt: 1, ml: 2, width: 'calc(100% - 16px)' }}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Province</InputLabel>
                          <Select value={provId} label="Province" onChange={(e) => setProvId(e.target.value)}>
                            {provinces.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small" disabled={!provId}>
                          <InputLabel>District</InputLabel>
                          <Select value={distId} label="District" onChange={(e) => setDistId(e.target.value)}>
                            {districts.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small" disabled={!distId}>
                          <InputLabel>Municipality</InputLabel>
                          <Select value={muniId} label="Municipality" onChange={(e) => setMuniId(e.target.value)}>
                            {municipalities.map(m => <MenuItem key={m.id} value={m.id}>{m.official_name || (m as any).name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small" disabled={!muniId}>
                          <InputLabel>Ward</InputLabel>
                          <Select value={wardId} label="Ward" onChange={(e) => setWardId(e.target.value)}>
                            {wards.map(w => <MenuItem key={w.id} value={w.id}>Ward {w.ward_no}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  )}
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <FormControlLabel
                    value="gps"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>Use Current Location</Typography>
                        <Typography variant="body2" color="text.secondary">Use your device's GPS to pinpoint the issue</Typography>
                      </Box>
                    }
                  />
                  {locationSource === 'gps' && (
                    <Box sx={{ mt: 2, ml: 4 }}>
                      <Button variant="outlined" onClick={handleGetGps} disabled={isGettingGps}>
                        {isGettingGps ? <CircularProgress size={24} /> : "Get Coordinates"}
                      </Button>
                      {gpsLocation && (
                        <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
                          Location acquired: {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Paper>
              </RadioGroup>
            </FormControl>
          </Box>
        )}

        {/* STEP 2: CATEGORY */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>What type of issue is this?</Typography>
            
            {loadingCategories ? (
              <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
            ) : (
              <>
                <FormControl fullWidth sx={{ mb: 4 }}>
                  <InputLabel>Primary Category *</InputLabel>
                  <Select
                    value={primaryCategoryId}
                    label="Primary Category *"
                    onChange={(e) => setPrimaryCategoryId(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.category_name} {cat.department_name ? `(${cat.department_name})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: hasSecondary ? 'action.hover' : 'background.paper' }}>
                  <FormControlLabel
                    control={<Switch checked={hasSecondary} onChange={(e) => setHasSecondary(e.target.checked)} />}
                    label="This issue involves another department (Optional)"
                  />
                  {hasSecondary && (
                    <FormControl fullWidth sx={{ mt: 2 }}>
                      <InputLabel>Secondary Category</InputLabel>
                      <Select
                        value={secondaryCategoryId}
                        label="Secondary Category"
                        onChange={(e) => setSecondaryCategoryId(e.target.value)}
                      >
                        {categories.filter(c => c.id !== primaryCategoryId).map((cat) => (
                          <MenuItem key={cat.id} value={cat.id}>
                            {cat.category_name} {cat.department_name ? `(${cat.department_name})` : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Paper>
              </>
            )}
          </Box>
        )}

        {/* STEP 3: DETAILS */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Provide details</Typography>
            
            <TextField
              fullWidth
              label="Title *"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasDismissedDuplicates(false);
              }}
              margin="normal"
              placeholder="E.g. Broken street light near Ward 3 office"
              helperText="Minimum 5 characters"
            />
            
            <TextField
              fullWidth
              label="Description *"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setHasDismissedDuplicates(false);
              }}
              margin="normal"
              multiline
              rows={4}
              placeholder="Describe the issue in detail..."
              helperText="Minimum 20 characters"
            />

            {/* ─── Real-Time Duplicate Complaint Detector (Algorithm 1) ─── */}
            {isCheckingDuplicates && (
              <Box display="flex" alignItems="center" gap={1} mt={1.5} mb={1}>
                <CircularProgress size={14} color="warning" />
                <Typography variant="caption" color="text.secondary">
                  Scanning for similar nearby complaints...
                </Typography>
              </Box>
            )}

            <DuplicateDetectionCard
              duplicates={duplicates}
              isUpvoting={isUpvoting}
              upvotingId={upvotingId}
              onUpvote={handleUpvote}
              onDismiss={() => setHasDismissedDuplicates(true)}
            />

            {/* ─── Automated Smart Severity Assessment ─── */}
            <Paper
              variant="outlined"
              sx={{
                mt: 3,
                p: 2.5,
                borderRadius: 3,
                bgcolor:
                  severity === 'high'
                    ? 'rgba(239, 68, 68, 0.04)'
                    : severity === 'medium'
                    ? 'rgba(245, 158, 11, 0.04)'
                    : 'rgba(16, 185, 129, 0.04)',
                borderColor:
                  severity === 'high'
                    ? 'error.light'
                    : severity === 'medium'
                    ? 'warning.light'
                    : 'success.light',
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <AutoAwesome
                    sx={{
                      color:
                        severity === 'high'
                          ? 'error.main'
                          : severity === 'medium'
                          ? 'warning.main'
                          : 'success.main',
                      fontSize: 22,
                    }}
                  />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Automated Severity Assessment
                  </Typography>
                  <Chip
                    size="small"
                    label={isManualOverride ? "Manual Selection" : "⚡ Auto-Detected"}
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      bgcolor: isManualOverride ? "grey.200" : "primary.main",
                      color: isManualOverride ? "text.primary" : "white",
                    }}
                  />
                </Box>

                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    if (isManualOverride && analysisResult) {
                      setSeverity(analysisResult.severity);
                    }
                    setIsManualOverride((prev) => !prev);
                  }}
                  sx={{ textTransform: "none", fontSize: "0.8rem", fontWeight: 600 }}
                >
                  {isManualOverride ? "Reset to Auto-Detection" : "Change Manually"}
                </Button>
              </Box>

              {/* Detected Level Badge */}
              <Box display="flex" alignItems="center" gap={1.5} mt={2}>
                <Chip
                  label={
                    severity === 'high'
                      ? '🔴 HIGH (24h SLA Target)'
                      : severity === 'medium'
                      ? '🟡 MEDIUM (72h SLA Target)'
                      : '🟢 LOW (120h SLA Target)'
                  }
                  color={severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'success'}
                  variant="filled"
                  sx={{ fontWeight: 800, fontSize: '0.85rem', px: 1, py: 1.5 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {severity === 'high'
                    ? 'Urgent response required due to safety hazard or severe disruption.'
                    : severity === 'medium'
                    ? 'Standard municipal priority for public service disruptions.'
                    : 'Routine maintenance and minor non-hazardous inquiries.'}
                </Typography>
              </Box>

              {/* Reasoning & Keywords */}
              {analysisResult && (
                <Box mt={1.5} pt={1.5} borderTop={1} borderColor="divider">
                  <Typography variant="caption" color="text.secondary" display="block">
                    {analysisResult.reasoning}
                  </Typography>
                  {analysisResult.matchedKeywords.length > 0 && (
                    <Box display="flex" alignItems="center" gap={0.75} mt={0.75} flexWrap="wrap">
                      <Typography variant="caption" fontWeight={600} color="text.secondary">
                        Trigger keywords:
                      </Typography>
                      {analysisResult.matchedKeywords.map((kw) => (
                        <Chip
                          key={kw}
                          label={kw}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* Optional Manual Override Buttons */}
              {isManualOverride && (
                <Box mt={2} pt={2} borderTop={1} borderColor="divider">
                  <Typography variant="caption" fontWeight={600} color="text.secondary" gutterBottom display="block">
                    Select custom severity level:
                  </Typography>
                  <Grid container spacing={1.5}>
                    {(['low', 'medium', 'high'] as const).map((lvl) => (
                      <Grid size={{ xs: 4 }} key={lvl}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            borderRadius: 2,
                            borderColor: severity === lvl ? `${lvl === 'high' ? 'error' : lvl === 'medium' ? 'warning' : 'success'}.main` : 'divider',
                            bgcolor: severity === lvl ? `${lvl === 'high' ? 'error' : lvl === 'medium' ? 'warning' : 'success'}.light` : 'background.paper',
                          }}
                          onClick={() => {
                            setSeverity(lvl);
                            setIsManualOverride(true);
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            fontWeight={700}
                            color={`${lvl === 'high' ? 'error' : lvl === 'medium' ? 'warning' : 'success'}.main`}
                          >
                            {lvl === 'low' ? '🟢 Low' : lvl === 'medium' ? '🟡 Medium' : '🔴 High'}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Paper>

            {/* ─── Evidence / Proof Upload (Optional) ─── */}
            <Paper
              variant="outlined"
              sx={{
                mt: 3,
                p: 2.5,
                borderRadius: 3,
                bgcolor: 'background.paper',
                borderColor: 'divider',
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <AttachFile color="primary" sx={{ fontSize: 22 }} />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Proof of Grievance (Optional)
                  </Typography>
                  <Chip
                    size="small"
                    label="Faster Resolution"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: "0.72rem", fontWeight: 600 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Photos: up to 5 (max 10MB) • Video: 1 clip (max 30MB)
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" mb={2}>
                Attach photos or a short video clip showing the incident or damaged infrastructure. Field crews prioritize grievances backed by authentic visual verification.
              </Typography>

              {/* Hidden file inputs */}
              <input
                type="file"
                ref={imageInputRef}
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
              <input
                type="file"
                ref={videoInputRef}
                accept="video/mp4,video/webm,video/quicktime,video/3gpp"
                style={{ display: 'none' }}
                onChange={handleVideoSelect}
              />

              {/* Action Buttons */}
              <Box display="flex" flexWrap="wrap" gap={1.5} mb={2}>
                <Button
                  variant="outlined"
                  startIcon={<AddPhotoAlternate />}
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isReadingMedia || mediaFiles.filter(m => m.type === 'image').length >= 5}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Add Photos ({mediaFiles.filter(m => m.type === 'image').length}/5)
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<Videocam />}
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isReadingMedia || mediaFiles.some(m => m.type === 'video')}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  {mediaFiles.some(m => m.type === 'video') ? "Video Attached (1/1)" : "Add Short Video Clip"}
                </Button>

                {isReadingMedia && (
                  <Box display="flex" alignItems="center" gap={1} ml={1}>
                    <CircularProgress size={18} />
                    <Typography variant="caption" color="text.secondary">
                      Processing media file...
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Error Message */}
              {mediaError && (
                <Alert severity="warning" onClose={() => setMediaError(null)} sx={{ mb: 2, borderRadius: 2 }}>
                  {mediaError}
                </Alert>
              )}

              {/* Uploaded Items Gallery */}
              {mediaFiles.length > 0 && (
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  {mediaFiles.map((item) => (
                    <Grid size={{ xs: 12, sm: item.type === 'video' ? 12 : 6, md: item.type === 'video' ? 12 : 4 }} key={item.id}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: 'grey.50',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {item.type === 'image' ? (
                          <Box sx={{ position: 'relative', width: '100%', height: 140, borderRadius: 1.5, overflow: 'hidden', bgcolor: 'grey.200' }}>
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <Chip
                              size="small"
                              label="Photo"
                              sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                bgcolor: 'rgba(0,0,0,0.65)',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.7rem'
                              }}
                            />
                          </Box>
                        ) : (
                          <Box sx={{ width: '100%', borderRadius: 1.5, overflow: 'hidden', bgcolor: '#000' }}>
                            <video
                              src={item.previewUrl}
                              controls
                              preload="metadata"
                              style={{ width: '100%', maxHeight: 220, display: 'block' }}
                            />
                          </Box>
                        )}

                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                          <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                            <Typography variant="body2" fontWeight={600} noWrap title={item.name}>
                              {item.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.type === 'video' ? '🎬 Video' : '📷 Image'} • {formatFileSize(item.size)}
                            </Typography>
                          </Box>
                          <Tooltip title="Remove file">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveMedia(item.id)}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Box>
        )}

        {/* STEP 4: REVIEW */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>Review & Submit</Typography>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Location</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {locationSource === 'registered_address' && `Registered Address (${registeredAddressStr || 'Unknown'})`}
                    {locationSource === 'gps' && `GPS Coordinates: ${gpsLocation?.lat}, ${gpsLocation?.lng}`}
                    {locationSource === 'manual' && `Selected Manually`}
                  </Typography>
                </Grid>
                
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Category</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    Primary: {categories.find(c => c.id === primaryCategoryId)?.category_name}
                  </Typography>
                  {hasSecondary && secondaryCategoryId && (
                    <Typography variant="body1" color="text.secondary">
                      + Secondary: {categories.find(c => c.id === secondaryCategoryId)?.category_name}
                    </Typography>
                  )}
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Issue Details</Typography>
                  <Typography variant="h6">{title}</Typography>
                  <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{description}</Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Severity Level</Typography>
                  <Box mt={0.5} display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={severity.toUpperCase()} 
                      color={severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'success'} 
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Chip
                      size="small"
                      label={isManualOverride ? "Manual Selection" : "⚡ Auto-Assessed"}
                      variant="outlined"
                      sx={{ fontSize: "0.72rem" }}
                    />
                  </Box>
                  {analysisResult?.reasoning && !isManualOverride && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {analysisResult.reasoning}
                    </Typography>
                  )}
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Proof of Grievance (Optional)</Typography>
                  {mediaFiles.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic" mt={0.5}>
                      No photo or video evidence attached
                    </Typography>
                  ) : (
                    <Box mt={1}>
                      <Typography variant="body2" fontWeight={600} mb={1}>
                        {mediaFiles.filter(m => m.type === 'image').length} photo(s), {mediaFiles.filter(m => m.type === 'video').length} video clip attached:
                      </Typography>
                      <Grid container spacing={1.5}>
                        {mediaFiles.map((m) => (
                          <Grid size={{ xs: 6, sm: m.type === 'video' ? 12 : 4 }} key={m.id}>
                            <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, bgcolor: 'grey.50' }}>
                              {m.type === 'image' ? (
                                <img
                                  src={m.previewUrl}
                                  alt={m.name}
                                  style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6 }}
                                />
                              ) : (
                                <video
                                  src={m.previewUrl}
                                  controls
                                  preload="metadata"
                                  style={{ width: '100%', maxHeight: 140, borderRadius: 6, backgroundColor: '#000' }}
                                />
                              )}
                              <Typography variant="caption" noWrap display="block" fontWeight={500} mt={0.5}>
                                {m.name} ({formatFileSize(m.size)})
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Paper>
          </Box>
        )}

        {/* Form Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={activeStep === 0 || isSubmitting}
          >
            Back
          </Button>
          <Box>
            {activeStep === STEPS.length - 1 ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                startIcon={isSubmitting && <CircularProgress size={20} />}
              >
                {isSubmitting ? "Submitting..." : "Submit Complaint"}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default SubmitComplaint;
