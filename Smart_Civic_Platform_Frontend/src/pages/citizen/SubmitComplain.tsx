import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Card, TextField, Button, MenuItem, Grid,
  InputLabel, FormControl, Select, CircularProgress, Alert,
  Stepper, Step, StepLabel, RadioGroup, FormControlLabel, Radio,
  Switch, Paper, Chip
} from "@mui/material";
import Swal from "sweetalert2";
import { publicApi, complaintsApi, apiClient } from "../../api";
import { useAuth } from "../../hooks/useAuth";
import type { Province, District, Municipality, Ward, ComplaintCategory, SubmitComplaintPayload } from "../../api/types";

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

  const handleNext = () => {
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
              onChange={(e) => setTitle(e.target.value)}
              margin="normal"
              placeholder="E.g. Broken street light near Ward 3 office"
              helperText="Minimum 5 characters"
            />
            
            <TextField
              fullWidth
              label="Description *"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
              multiline
              rows={4}
              placeholder="Describe the issue in detail..."
              helperText="Minimum 20 characters"
            />

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>Severity Level *</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{ 
                    p: 2, textAlign: 'center', cursor: 'pointer', borderRadius: 2,
                    borderColor: severity === 'low' ? 'success.main' : 'divider',
                    bgcolor: severity === 'low' ? 'success.light' : 'background.paper'
                  }}
                  onClick={() => setSeverity('low')}
                >
                  <Typography variant="h6" color="success.main">🟢 Low</Typography>
                  <Typography variant="caption">Minor issue</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{ 
                    p: 2, textAlign: 'center', cursor: 'pointer', borderRadius: 2,
                    borderColor: severity === 'medium' ? 'warning.main' : 'divider',
                    bgcolor: severity === 'medium' ? 'warning.light' : 'background.paper'
                  }}
                  onClick={() => setSeverity('medium')}
                >
                  <Typography variant="h6" color="warning.main">🟡 Medium</Typography>
                  <Typography variant="caption">Requires attention</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{ 
                    p: 2, textAlign: 'center', cursor: 'pointer', borderRadius: 2,
                    borderColor: severity === 'high' ? 'error.main' : 'divider',
                    bgcolor: severity === 'high' ? 'error.light' : 'background.paper'
                  }}
                  onClick={() => setSeverity('high')}
                >
                  <Typography variant="h6" color="error.main">🔴 High</Typography>
                  <Typography variant="caption">Urgent</Typography>
                </Paper>
              </Grid>
            </Grid>
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
                  <Typography variant="caption" color="text.secondary">Severity</Typography>
                  <Box mt={0.5}>
                    <Chip 
                      label={severity.toUpperCase()} 
                      color={severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'success'} 
                      size="small"
                    />
                  </Box>
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
