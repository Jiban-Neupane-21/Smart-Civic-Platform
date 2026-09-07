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
  Cake,
  BadgeOutlined,
  Home,
  ListAlt,
  CalendarMonth,
  Wc,
  Assignment,
  PhotoCamera,
  Verified as VerifiedIcon,
  CheckCircle,
  HourglassEmpty,
  Close as CloseIcon,
  ZoomIn,
  Business,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import staffApi from "../../api/modules/staff.api";
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

export const StaffProfilePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<any | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
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
    contact_number: "",
    personal_address: "",
  });

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, complaintsRes] = await Promise.all([
        staffApi.getMyProfile(),
        staffApi.getMyComplaints().catch(() => ({ success: false, data: [] })),
      ]);

      if (profileRes?.success && profileRes?.data) {
        const d = profileRes.data;
        setProfile(d);
        setCurrentAvatarUrl(d.profile?.profile_picture || user?.identity_document_url || "");
        setForm({
          contact_number: d.contact_number || d.profile?.phone || "",
          personal_address: d.personal_address || "",
        });
      } else {
        setError(profileRes?.message || "Failed to load staff profile");
      }

      if (complaintsRes?.success && Array.isArray(complaintsRes.data)) {
        setComplaints(complaintsRes.data);
      }
    } catch (err: any) {
      setError(err?.message || "Error fetching staff profile details");
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
      Swal.fire({ icon: "error", title: "File too large", text: "Profile image must be under 3MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploadingAvatar(true);
      try {
        await profileApi.updateProfilePicture(base64);
        setCurrentAvatarUrl(base64);
        Swal.fire({ icon: "success", title: "Updated", text: "Profile picture updated successfully.", timer: 2000, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Upload failed", text: err?.response?.data?.message || err.message || "Could not update picture." });
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle save edited profile
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await staffApi.updateMyProfile({
        phone: form.contact_number,
        contact_number: form.contact_number,
        personal_address: form.personal_address,
      });

      if (res?.success) {
        Swal.fire({
          icon: "success",
          title: "Profile Updated",
          text: "Your contact details have been successfully saved.",
          timer: 2000,
          showConfirmButton: false,
        });
        setEditing(false);
        fetchProfileData();
      } else {
        Swal.fire({ icon: "error", title: "Update Failed", text: res?.message || "Could not save changes." });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err?.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  // Handle KYC re-upload
  const handleKycSubmit = async (payload: KycUploadPayload) => {
    try {
      await staffApi.submitKyc(payload);
      setShowReupload(false);
      Swal.fire({
        icon: "success",
        title: "KYC Submitted",
        text: "Your identity details have been submitted for department verification.",
      });
      fetchProfileData();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Submission Failed", text: err?.response?.data?.message || err.message || "Failed to submit KYC." });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65vh" }}>
        <CircularProgress size={48} thickness={4} />
      </Box>
    );
  }

  const p = profile?.profile;
  const displayName = p?.full_name || "Staff Member";
  const kycStatus = profile?.kyc_status || p?.account_status || "unverified";
  const isKycVerified = kycStatus === "verified" || p?.account_status === "active";
  const isKycPending = kycStatus === "pending";

  const totalTasks = complaints.length;
  const resolvedTasks = complaints.filter((c) => ["resolved", "closed"].includes(c.status)).length;
  const inProgressTasks = complaints.filter((c) => ["in_progress", "assigned"].includes(c.status)).length;

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
        {/* Banner with Staff Gradient */}
        <Box
          sx={{
            height: { xs: 140, sm: 190 },
            background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #06b6d4 100%)",
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
                alt={displayName}
                sx={{
                  width: { xs: 96, sm: 112 },
                  height: { xs: 96, sm: 112 },
                  bgcolor: "primary.dark",
                  fontSize: { xs: "2.5rem", sm: "3rem" },
                  fontWeight: "bold",
                  border: "4px solid white",
                  boxShadow: isKycVerified
                    ? "0 0 0 3px #2563EB, 0 4px 16px rgba(37,99,235,0.35)"
                    : "0 2px 12px rgba(0,0,0,0.15)",
                }}
              >
                {getInitials(displayName)}
              </Avatar>

              {/* Verified Badge */}
              {isKycVerified && (
                <Tooltip title="Staff Account Verified" arrow>
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
              <Tooltip title="Upload Profile Picture" arrow>
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
              {displayName}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={0.5}>
                <Email fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {p?.email || "staff@civicdesk.org"}
                </Typography>
              </Box>
              <Chip label="STAFF" size="small" color="primary" sx={{ fontWeight: 700 }} />
              {profile?.department?.department_name && (
                <Chip
                  icon={<Business fontSize="small" />}
                  label={profile.department.department_name}
                  size="small"
                  variant="outlined"
                />
              )}
              {isKycVerified ? (
                <Chip
                  icon={<VerifiedIcon sx={{ fontSize: "16px !important", color: "#2563EB !important" }} />}
                  label="Verified Staff"
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
          { label: "Assigned Tasks", value: totalTasks, color: "primary" },
          { label: "Resolved", value: resolvedTasks, color: "success" },
          { label: "In Progress", value: inProgressTasks, color: "warning" },
          { label: "Member Since", value: formatDate(p?.created_at), color: "info" },
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
          <Tab label="Department" icon={<Business fontSize="small" />} iconPosition="start" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="KYC & Identity" icon={<Assignment fontSize="small" />} iconPosition="start" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="Assigned Tasks" icon={<ListAlt fontSize="small" />} iconPosition="start" sx={{ textTransform: "none", fontWeight: 600 }} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ═══ Tab 0: About ═══ */}
          {tabIndex === 0 && (
            <Grid container spacing={3}>
              {[
                { label: "Full Name", value: displayName, icon: <BadgeOutlined fontSize="small" /> },
                { label: "Employee ID", value: profile?.employee_id || "EMP-" + (profile?.id?.slice(0, 6) || "N/A"), icon: <BadgeOutlined fontSize="small" /> },
                { label: "Designation", value: profile?.designation || "Operational Staff", icon: <BadgeOutlined fontSize="small" /> },
                { label: "Gender", value: profile?.gender ? profile.gender.replace(/_/g, " ").toUpperCase() : "Not specified", icon: <Wc fontSize="small" /> },
                { label: "Date of Birth", value: profile?.date_of_birth ? formatDate(profile.date_of_birth) : "Not specified", icon: <Cake fontSize="small" /> },
              ].map((field) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={field.label}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                      {field.icon}
                      <Typography variant="caption" fontWeight="medium">
                        {field.label}
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="medium" color="text.primary">
                      {field.value}
                    </Typography>
                  </Card>
                </Grid>
              ))}

              {/* Editable Fields */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                    <Phone fontSize="small" />
                    <Typography variant="caption" fontWeight="medium">
                      Contact Phone
                    </Typography>
                  </Box>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={form.contact_number}
                      onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                      placeholder="e.g. 98XXXXXXXX"
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium" color={form.contact_number ? "text.primary" : "text.disabled"}>
                      {form.contact_number || "Not provided"}
                    </Typography>
                  )}
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 8 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                    <Home fontSize="small" />
                    <Typography variant="caption" fontWeight="medium">
                      Personal Address
                    </Typography>
                  </Box>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={form.personal_address}
                      onChange={(e) => setForm({ ...form, personal_address: e.target.value })}
                      placeholder="Enter personal address"
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium" color={form.personal_address ? "text.primary" : "text.disabled"}>
                      {form.personal_address || "Not provided"}
                    </Typography>
                  )}
                </Card>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" flexWrap="wrap" gap={3} color="text.secondary">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Email fontSize="small" />
                    <Typography variant="body2">{p?.email}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <CalendarMonth fontSize="small" />
                    <Typography variant="body2">
                      Joined {formatDate(p?.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}

          {/* ═══ Tab 1: Department & Official ═══ */}
          {tabIndex === 1 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Business color="primary" fontSize="small" />
                    <Typography fontWeight="bold">Primary Department</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    {profile?.department?.department_name || "Assigned Department"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Department ID: {profile?.department?.id || profile?.primary_department_id || "—"}
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Home color="secondary" fontSize="small" />
                    <Typography fontWeight="bold">Governing Municipality</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    {profile?.municipality?.official_name || "Municipality Head Office"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Municipality ID: {profile?.municipality_id || "—"}
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Areas of Expertise
                  </Typography>
                  <Typography variant="body1" fontWeight={600} mt={0.5}>
                    {profile?.expertise || "General Field Operations"}
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Employment Status
                  </Typography>
                  <Box mt={0.5}>
                    <Chip
                      size="small"
                      label={profile?.employee_status || "Active Employee"}
                      color={profile?.employee_status === "inactive" ? "error" : "success"}
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* ═══ Tab 2: KYC & Identity ═══ */}
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
                    Staff KYC identity is officially verified on the Smart Civic Platform.
                  </Alert>

                  {/* Document Previews */}
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Card variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: "center" }}>
                        <Typography variant="subtitle2" fontWeight={600} mb={1}>
                          Identity Card / Citizenship (Front)
                        </Typography>
                        {profile?.identity_front_url || p?.identity_document_url ? (
                          <Box position="relative">
                            <Box
                              component="img"
                              src={profile?.identity_front_url || p?.identity_document_url}
                              alt="Identity Front"
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
                                  url: profile?.identity_front_url || p?.identity_document_url,
                                  title: "Identity Document (Front)",
                                })
                              }
                              sx={{ position: "absolute", bottom: 8, right: 8, bgcolor: "rgba(0,0,0,0.6)", color: "white" }}
                            >
                              <ZoomIn fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ p: 4, bgcolor: "grey.50", borderRadius: 1.5, color: "text.secondary" }}>
                            Document preview not available
                          </Box>
                        )}
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Card variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: "center" }}>
                        <Typography variant="subtitle2" fontWeight={600} mb={1}>
                          Identity Card / Citizenship (Back)
                        </Typography>
                        {profile?.identity_back_url ? (
                          <Box position="relative">
                            <Box
                              component="img"
                              src={profile?.identity_back_url}
                              alt="Identity Back"
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
                                  url: profile?.identity_back_url,
                                  title: "Identity Document (Back)",
                                })
                              }
                              sx={{ position: "absolute", bottom: 8, right: 8, bgcolor: "rgba(0,0,0,0.6)", color: "white" }}
                            >
                              <ZoomIn fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ p: 4, bgcolor: "grey.50", borderRadius: 1.5, color: "text.secondary" }}>
                            Single-side document or back preview not uploaded
                          </Box>
                        )}
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              ) : isKycPending && !showReupload ? (
                <Box>
                  <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                    Your KYC documents are currently under review by the Department Head. You will be notified once verified.
                  </Alert>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h6" fontWeight={700} mb={1}>
                    Staff Identity Verification
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Upload government-issued identification (National ID or Citizenship) to complete verified staff status.
                  </Typography>
                  <KycUpload
                    mode="front-back"
                    initialValues={{
                      identity_type: profile?.identity_type || "citizenship",
                      identity_number: profile?.identity_number || "",
                    }}
                    onSubmit={handleKycSubmit}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* ═══ Tab 3: Assigned Tasks Activity ═══ */}
          {tabIndex === 3 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={2}>
                Recent Assigned Tasks & Complaints
              </Typography>

              {complaints.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No complaints currently assigned to you. When complaints are dispatched to your team, they will appear here.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {complaints.slice(0, 10).map((c) => (
                    <Card
                      key={c.co_uid || c.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1.5,
                        "&:hover": { borderColor: "primary.main" },
                      }}
                    >
                      <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            #{c.tracking_id || (c.co_uid || c.id).slice(0, 8)}
                          </Typography>
                          <Chip
                            size="small"
                            label={c.priority || "Medium"}
                            color={c.priority === "emergency" ? "error" : c.priority === "high" ? "warning" : "default"}
                            sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                          />
                          <Chip
                            size="small"
                            label={(c.status || "pending").replace(/_/g, " ")}
                            color={["resolved", "closed"].includes(c.status) ? "success" : c.status === "in_progress" ? "info" : "warning"}
                            sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700, textTransform: "capitalize" }}
                          />
                        </Box>
                        <Typography variant="body2" fontWeight={600}>
                          {c.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Submitted {formatDate(c.submitted_date || c.created_at)}
                        </Typography>
                      </Box>

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/staff/complaint/${c.co_uid || c.id}`)}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                      >
                        View Ticket
                      </Button>
                    </Card>
                  ))}
                </Stack>
              )}
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
};

export default StaffProfilePage;
