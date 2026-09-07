import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  Grid,
  Avatar,
  TextField,
  Button,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Email,
  Phone,
  BadgeOutlined,
  Home,
  ListAlt,
  CalendarMonth,
  Assignment,
  PhotoCamera,
  Verified as VerifiedIcon,
  CheckCircle,
  HourglassEmpty,
  Close as CloseIcon,
  ZoomIn,
  Business,
  AccountBalance,
  LocationCity,
  Group,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { municipalityApi } from "../../api/modules/municipality.api";
import { profileApi } from "../../api/modules/profile.api";
import { KycUpload, type KycUploadPayload } from "../../components/kyc/KycUpload";
import { useAuth } from "../../hooks/useAuth";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function ProfilePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<any | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState<number>(0);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zoom image modal
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);
  const [showReupload, setShowReupload] = useState<boolean>(false);

  // Form states for editing
  const [form, setForm] = useState({
    head_name: "",
    head_email: "",
    head_contact_no: "",
    mayor_chairperson_name: "",
    deputy_mayor_vice_chairperson_name: "",
    official_email: "",
    official_contact_no: "",
    about_description: "",
  });

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, analyticsRes, deptRes] = await Promise.all([
        municipalityApi.getMyProfile(),
        municipalityApi.getDashboard().catch(() => ({ success: false, data: null })),
        municipalityApi.getMyDepartments().catch(() => ({ success: false, data: { departments: [] } })),
      ]);

      if (profileRes?.success && profileRes?.data) {
        const d = profileRes.data;
        setProfile(d);
        setCurrentAvatarUrl(d.official_logo || user?.identity_document_url || "");
        setForm({
          head_name: d.head_name || "",
          head_email: d.head_email || "",
          head_contact_no: d.head_contact_no || "",
          mayor_chairperson_name: d.mayor_chairperson_name || "",
          deputy_mayor_vice_chairperson_name: d.deputy_mayor_vice_chairperson_name || "",
          official_email: d.official_email || "",
          official_contact_no: d.official_contact_no || "",
          about_description: d.about_description || "",
        });
      } else {
        setError(profileRes?.message || "Failed to load municipality profile");
      }

      if (analyticsRes?.success && analyticsRes?.data) {
        setAnalytics(analyticsRes.data);
      }
      if (deptRes?.success && deptRes?.data?.departments) {
        setDepartments(deptRes.data.departments);
      }
    } catch (err: any) {
      setError(err?.message || "Error loading municipality profile details");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      Swal.fire({ icon: "error", title: "Invalid format", text: "Please select a JPG, PNG, or WebP image." });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "File too large", text: "Emblem image must be under 3MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploadingAvatar(true);
      try {
        await profileApi.updateProfilePicture(base64);
        setCurrentAvatarUrl(base64);
        Swal.fire({ icon: "success", title: "Updated", text: "Municipality emblem updated successfully.", timer: 2000, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Upload failed", text: err?.response?.data?.message || err.message || "Could not update emblem." });
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save edited profile
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await municipalityApi.updateMyProfile({
        head_name: form.head_name,
        head_email: form.head_email,
        head_contact_no: form.head_contact_no,
        mayor_chairperson_name: form.mayor_chairperson_name,
        deputy_mayor_vice_chairperson_name: form.deputy_mayor_vice_chairperson_name,
        official_email: form.official_email,
        official_contact_no: form.official_contact_no,
        about_description: form.about_description,
      });

      if (res?.success) {
        Swal.fire({
          icon: "success",
          title: "Profile Updated",
          text: "Municipality details have been saved successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
        setEditing(false);
        fetchProfileData();
      } else {
        Swal.fire({ icon: "error", title: "Update Failed", text: res?.message || "Could not save profile." });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err?.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65vh" }}>
        <CircularProgress size={48} thickness={4} />
      </Box>
    );
  }

  const muniName = profile?.official_name || "Municipality Office";
  const headName = profile?.head_name || "Municipality Head";
  const kycStatus = profile?.kyc_status || "unverified";
  const isKycVerified = kycStatus === "verified";
  const isKycPending = kycStatus === "pending";

  const totalComplaints = analytics?.total_complaints ?? 0;
  const resolvedComplaints = analytics?.resolved_count ?? 0;
  const totalDepts = departments.length || (profile?.total_departments ?? 0);
  const totalWards = profile?.total_wards ?? 0;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* ─── Hero Card ─── */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        {/* Banner with Municipality Gradient */}
        <Box
          sx={{
            height: { xs: 140, sm: 190 },
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)",
            position: "relative",
          }}
        >
          {/* Overlapping Avatar */}
          <Box
            sx={{
              position: "absolute",
              bottom: { xs: -48, sm: -56 },
              left: { xs: 16, sm: 32 },
              zIndex: 2,
            }}
          >
            <Box position="relative" display="inline-block">
              <Avatar
                src={currentAvatarUrl}
                alt={muniName}
                sx={{
                  width: { xs: 96, sm: 112 },
                  height: { xs: 96, sm: 112 },
                  bgcolor: "secondary.dark",
                  fontSize: { xs: "2.5rem", sm: "3rem" },
                  fontWeight: "bold",
                  border: "4px solid white",
                  boxShadow: isKycVerified
                    ? "0 0 0 3px #2563EB, 0 4px 16px rgba(37,99,235,0.35)"
                    : "0 2px 12px rgba(0,0,0,0.15)",
                }}
              >
                {getInitials(muniName)}
              </Avatar>

              {/* Verified Badge */}
              {isKycVerified && (
                <Tooltip title="Municipality Verified by Superadmin" arrow>
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 2,
                      right: 2,
                      bgcolor: "#2563EB",
                      borderRadius: "50%",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid white",
                      boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
                      zIndex: 3,
                    }}
                  >
                    <VerifiedIcon sx={{ fontSize: 18, color: "white" }} />
                  </Box>
                </Tooltip>
              )}

              {/* Upload photo button */}
              <Tooltip title="Upload Official Municipality Emblem" arrow>
                <IconButton
                  component="label"
                  size="small"
                  disabled={uploadingAvatar}
                  sx={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    bgcolor: "background.paper",
                    boxShadow: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    "&:hover": { bgcolor: "grey.100" },
                    zIndex: 3,
                  }}
                >
                  {uploadingAvatar ? (
                    <CircularProgress size={16} />
                  ) : (
                    <PhotoCamera sx={{ fontSize: 16 }} color="primary" />
                  )}
                  <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                  />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Header Info Row */}
        <Box
          sx={{
            pt: { xs: 6, sm: 7 },
            pb: 2.5,
            px: { xs: 2, sm: 3.5 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {muniName}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={0.5}>
                <Email fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {profile?.official_email || "municipality@civicdesk.org"}
                </Typography>
              </Box>
              <Chip label="MUNICIPALITY HEAD" size="small" color="secondary" sx={{ fontWeight: 700 }} />
              {profile?.local_level_type && (
                <Chip
                  icon={<LocationCity fontSize="small" />}
                  label={profile.local_level_type.replace(/_/g, " ").toUpperCase()}
                  size="small"
                  variant="outlined"
                />
              )}
              {isKycVerified ? (
                <Chip
                  icon={<VerifiedIcon sx={{ fontSize: "16px !important", color: "#2563EB !important" }} />}
                  label="Official Verified"
                  size="small"
                  sx={{
                    bgcolor: "rgba(37, 99, 235, 0.08)",
                    color: "#2563EB",
                    border: "1px solid #93C5FD",
                    fontWeight: 700,
                  }}
                />
              ) : isKycPending ? (
                <Chip
                  icon={<HourglassEmpty sx={{ fontSize: "14px !important" }} />}
                  label="KYC Pending"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              ) : (
                <Chip
                  label="KYC Unverified"
                  size="small"
                  color="default"
                  variant="outlined"
                  sx={{ color: "text.secondary" }}
                />
              )}
            </Box>
          </Box>

          {/* Edit / Save Action Button */}
          <Button
            variant={editing ? "contained" : "outlined"}
            size="small"
            startIcon={editing ? <SaveIcon /> : <EditIcon />}
            onClick={() => (editing ? handleSaveProfile() : setEditing(true))}
            disabled={saving}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          >
            {saving ? "Saving..." : editing ? "Save Profile" : "Edit Profile"}
          </Button>
        </Box>
      </Card>

      {/* ─── Stats Row ─── */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: "Municipal Complaints", value: totalComplaints, color: "primary" },
          { label: "Resolved", value: resolvedComplaints, color: "success" },
          { label: "Departments", value: totalDepts, color: "warning" },
          { label: "Total Wards", value: totalWards, color: "info" },
        ].map((stat) => (
          <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
            <Card
              elevation={0}
              sx={{
                p: 2,
                textAlign: "center",
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Typography variant="h5" fontWeight="bold" color={`${stat.color}.main`}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {stat.label}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ─── Tabs Architecture ─── */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          mb: 3,
          overflow: "hidden",
        }}
      >
        <Tabs
          value={tabIndex}
          onChange={(_e, v) => setTabIndex(v)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab label="About" icon={<BadgeOutlined fontSize="small" />} iconPosition="start" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="Municipality Overview" icon={<AccountBalance fontSize="small" />} iconPosition="start" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="KYC & Documents" icon={<Assignment fontSize="small" />} iconPosition="start" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="Recent Activity" icon={<ListAlt fontSize="small" />} iconPosition="start" sx={{ textTransform: "none", fontWeight: 600 }} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ═══ Tab 0: About / Leadership ═══ */}
          {tabIndex === 0 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                    <BadgeOutlined fontSize="small" />
                    <Typography variant="caption" fontWeight="medium">
                      Administrative Head Name
                    </Typography>
                  </Box>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={form.head_name}
                      onChange={(e) => setForm({ ...form, head_name: e.target.value })}
                      placeholder="Administrative Head"
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium">
                      {form.head_name || headName}
                    </Typography>
                  )}
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                    <BadgeOutlined fontSize="small" />
                    <Typography variant="caption" fontWeight="medium">
                      Mayor / Chairperson
                    </Typography>
                  </Box>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={form.mayor_chairperson_name}
                      onChange={(e) => setForm({ ...form, mayor_chairperson_name: e.target.value })}
                      placeholder="Mayor / Chairperson Name"
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium">
                      {form.mayor_chairperson_name || profile?.mayor_chairperson_name || "Not provided"}
                    </Typography>
                  )}
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                    <BadgeOutlined fontSize="small" />
                    <Typography variant="caption" fontWeight="medium">
                      Deputy Mayor / Vice Chairperson
                    </Typography>
                  </Box>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={form.deputy_mayor_vice_chairperson_name}
                      onChange={(e) => setForm({ ...form, deputy_mayor_vice_chairperson_name: e.target.value })}
                      placeholder="Deputy Mayor Name"
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium">
                      {form.deputy_mayor_vice_chairperson_name || profile?.deputy_mayor_vice_chairperson_name || "Not provided"}
                    </Typography>
                  )}
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                    <Email fontSize="small" />
                    <Typography variant="caption" fontWeight="medium">
                      Head Contact Email
                    </Typography>
                  </Box>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={form.head_email}
                      onChange={(e) => setForm({ ...form, head_email: e.target.value })}
                      placeholder="head@municipality.gov.np"
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium">
                      {form.head_email || profile?.head_email || "Not provided"}
                    </Typography>
                  )}
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                    <Phone fontSize="small" />
                    <Typography variant="caption" fontWeight="medium">
                      Head Contact Phone
                    </Typography>
                  </Box>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={form.head_contact_no}
                      onChange={(e) => setForm({ ...form, head_contact_no: e.target.value })}
                      placeholder="98XXXXXXXX"
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium">
                      {form.head_contact_no || profile?.head_contact_no || "Not provided"}
                    </Typography>
                  )}
                </Card>
              </Grid>
            </Grid>
          )}

          {/* ═══ Tab 1: Municipality Overview ═══ */}
          {tabIndex === 1 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <AccountBalance color="primary" fontSize="small" />
                    <Typography fontWeight="bold">Official Municipality Name</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    {profile?.official_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Level: {profile?.local_level_type ? profile.local_level_type.replace(/_/g, " ").toUpperCase() : "Municipality"}
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Home color="secondary" fontSize="small" />
                    <Typography fontWeight="bold">Administrative Coverage</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    {totalWards} Total Wards
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {totalDepts} Active Operational Departments
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Official Municipality Email
                  </Typography>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={form.official_email}
                      onChange={(e) => setForm({ ...form, official_email: e.target.value })}
                      placeholder="info@municipality.gov.np"
                      sx={{ mt: 0.5 }}
                    />
                  ) : (
                    <Typography variant="body1" fontWeight={600} mt={0.5}>
                      {form.official_email || profile?.official_email || "Not specified"}
                    </Typography>
                  )}
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Official Contact / Hotline
                  </Typography>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={form.official_contact_no}
                      onChange={(e) => setForm({ ...form, official_contact_no: e.target.value })}
                      placeholder="01-XXXXXXX"
                      sx={{ mt: 0.5 }}
                    />
                  ) : (
                    <Typography variant="body1" fontWeight={600} mt={0.5}>
                      {form.official_contact_no || profile?.official_contact_no || "Not provided"}
                    </Typography>
                  )}
                </Card>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    About / Description
                  </Typography>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      rows={3}
                      value={form.about_description}
                      onChange={(e) => setForm({ ...form, about_description: e.target.value })}
                      placeholder="Describe the municipality's mission and civic administration"
                      sx={{ mt: 0.5 }}
                    />
                  ) : (
                    <Typography variant="body1" mt={0.5} sx={{ whiteSpace: "pre-wrap" }}>
                      {form.about_description || profile?.about_description || "No description provided."}
                    </Typography>
                  )}
                </Card>
              </Grid>
            </Grid>
          )}

          {/* ═══ Tab 2: KYC & Official Documents ═══ */}
          {tabIndex === 2 && (
            <Box>
              {isKycVerified && !showReupload ? (
                <Box>
                  <Alert
                    severity="success"
                    icon={<CheckCircle fontSize="inherit" />}
                    sx={{ mb: 3, borderRadius: 2 }}
                    action={
                      <Button color="inherit" size="small" onClick={() => setShowReupload(true)}>
                        Update KYC
                      </Button>
                    }
                  >
                    Municipality is officially verified and accredited by the SuperAdmin.
                  </Alert>

                  {/* Document Previews */}
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Card variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: "center" }}>
                        <Typography variant="subtitle2" fontWeight={600} mb={1}>
                          Official Registration Document
                        </Typography>
                        {profile?.registration_document_url ? (
                          <Box position="relative">
                            <Box
                              component="img"
                              src={profile.registration_document_url}
                              alt="Registration Document"
                              sx={{
                                width: "100%",
                                height: 200,
                                objectFit: "cover",
                                borderRadius: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() =>
                                setZoomImage({
                                  url: profile.registration_document_url,
                                  title: "Official Registration Document",
                                })
                              }
                              sx={{ position: "absolute", bottom: 8, right: 8, bgcolor: "rgba(0,0,0,0.6)", color: "white" }}
                            >
                              <ZoomIn fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ p: 4, bgcolor: "grey.50", borderRadius: 1.5, color: "text.secondary" }}>
                            Registration document preview not available
                          </Box>
                        )}
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Card variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: "center" }}>
                        <Typography variant="subtitle2" fontWeight={600} mb={1}>
                          Head Identity Document (Front)
                        </Typography>
                        {profile?.head_identity_front_url ? (
                          <Box position="relative">
                            <Box
                              component="img"
                              src={profile.head_identity_front_url}
                              alt="Head Identity Front"
                              sx={{
                                width: "100%",
                                height: 200,
                                objectFit: "cover",
                                borderRadius: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() =>
                                setZoomImage({
                                  url: profile.head_identity_front_url,
                                  title: "Head Identity Document (Front)",
                                })
                              }
                              sx={{ position: "absolute", bottom: 8, right: 8, bgcolor: "rgba(0,0,0,0.6)", color: "white" }}
                            >
                              <ZoomIn fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ p: 4, bgcolor: "grey.50", borderRadius: 1.5, color: "text.secondary" }}>
                            Head identity document not available
                          </Box>
                        )}
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              ) : isKycPending && !showReupload ? (
                <Box>
                  <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                    Your municipality registration and verification documents are currently under review by the SuperAdmin.
                  </Alert>
                </Box>
              ) : (
                <Box>
                  {profile?.kyc_rejection_reason && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                      SuperAdmin review notice: {profile.kyc_rejection_reason}
                    </Alert>
                  )}
                  <Typography variant="h6" fontWeight={700} mb={1}>
                    Municipality Verification & Registration
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Upload official municipal registration papers and head of office identification for SuperAdmin authorization.
                  </Typography>
                  <KycUpload
                    mode="front-back"
                    initialValues={{
                      identity_type: profile?.head_identity_type || "citizenship",
                      identity_number: profile?.head_identity_number || "",
                    }}
                    onSubmit={async (payload) => {
                      await municipalityApi.updateMyProfile({
                        head_identity_type: payload.identity_type,
                        head_identity_number: payload.identity_number,
                        head_identity_front_base64: payload.front_image,
                        head_identity_back_base64: payload.back_image,
                      });
                      setShowReupload(false);
                      Swal.fire({ icon: "success", title: "Submitted", text: "Municipality verification documents updated." });
                      fetchProfileData();
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* ═══ Tab 3: Recent Activity ═══ */}
          {tabIndex === 3 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={2}>
                Municipal Operations Overview
              </Typography>
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                Comprehensive complaint details, department triage, and civic notifications can be accessed from the primary operations ledger.
              </Alert>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={() => navigate("/municipality_head/complaint-detail")}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                >
                  View Complaint Details
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/municipality_head/manage-department-staff")}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                >
                  Manage Departments
                </Button>
              </Stack>
            </Box>
          )}
        </Box>
      </Card>

      {/* ─── Zoom Image Dialog ─── */}
      <Dialog
        open={Boolean(zoomImage)}
        onClose={() => setZoomImage(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight={700}>{zoomImage?.title}</Typography>
          <IconButton onClick={() => setZoomImage(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", py: 2 }}>
          {zoomImage && (
            <Box
              component="img"
              src={zoomImage.url}
              alt={zoomImage.title}
              sx={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZoomImage(null)} sx={{ fontWeight: 600 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
