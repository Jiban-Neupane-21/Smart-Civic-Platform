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
  Category,
  Group,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import departmentApi from "../../api/modules/department.api";
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

export default function DeptProfilePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<any | null>(null);
  const [dashboard, setDashboard] = useState<any | null>(null);
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
    head_name: "",
    head_email: "",
    head_contact_no: "",
    official_email: "",
  });

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, dashRes, queueRes] = await Promise.all([
        departmentApi.getMyProfile(),
        departmentApi.getDashboard().catch(() => ({ success: false, data: null })),
        departmentApi.getQueue().catch(() => ({ success: false, data: [] })),
      ]);

      if (profileRes?.success && profileRes?.data) {
        const d = profileRes.data;
        setProfile(d);
        setCurrentAvatarUrl(d.department_logo || user?.identity_document_url || "");
        setForm({
          head_name: d.head_name || "",
          head_email: d.head_email || "",
          head_contact_no: d.head_contact_no || "",
          official_email: d.official_email || "",
        });
      } else {
        setError(profileRes?.message || "Failed to load department profile");
      }

      if (dashRes?.success && dashRes?.data) {
        setDashboard(dashRes.data);
      }
      if (queueRes?.success && Array.isArray(queueRes.data)) {
        setComplaints(queueRes.data);
      }
    } catch (err: any) {
      setError(err?.message || "Error loading department profile details");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Avatar / Logo change
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      Swal.fire({ icon: "error", title: "Invalid format", text: "Please select a JPG, PNG, or WebP image." });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "File too large", text: "Logo image must be under 3MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploadingAvatar(true);
      try {
        await profileApi.updateProfilePicture(base64);
        setCurrentAvatarUrl(base64);
        Swal.fire({ icon: "success", title: "Updated", text: "Department emblem / avatar updated successfully.", timer: 2000, showConfirmButton: false });
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
      const res = await departmentApi.updateMyProfile({
        head_name: form.head_name,
        head_email: form.head_email,
        head_contact_no: form.head_contact_no,
        official_email: form.official_email,
      });

      if (res?.success) {
        Swal.fire({
          icon: "success",
          title: "Profile Updated",
          text: "Department profile details have been saved successfully.",
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

  const deptName = profile?.department_name || "Department Office";
  const headName = profile?.head_name || "Department Head";
  const kycStatus = profile?.kyc_status || "unverified";
  const isKycVerified = kycStatus === "verified";
  const isKycPending = kycStatus === "pending";

  const totalComplaints = dashboard?.totalComplaints ?? complaints.length;
  const resolvedCount = dashboard?.resolved ?? complaints.filter((c) => ["resolved", "closed"].includes(c.status)).length;
  const activeTeams = dashboard?.activeTeams ?? 0;
  const totalStaff = dashboard?.totalStaff ?? 0;

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
        {/* Banner with Department Gradient */}
        <Box
          sx={{
            height: { xs: 140, sm: 190 },
            background: "linear-gradient(135deg, #15803d 0%, #059669 50%, #0d9488 100%)",
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
                alt={deptName}
                sx={{
                  width: { xs: 96, sm: 112 },
                  height: { xs: 96, sm: 112 },
                  bgcolor: "success.dark",
                  fontSize: { xs: "2.5rem", sm: "3rem" },
                  fontWeight: "bold",
                  border: "4px solid white",
                  boxShadow: isKycVerified
                    ? "0 0 0 3px #2563EB, 0 4px 16px rgba(37,99,235,0.35)"
                    : "0 2px 12px rgba(0,0,0,0.15)",
                }}
              >
                {getInitials(deptName)}
              </Avatar>

              {/* Verified Badge */}
              {isKycVerified && (
                <Tooltip title="Department Verified by Municipality" arrow>
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
              <Tooltip title="Upload Department Emblem / Avatar" arrow>
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
              {deptName}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={0.5}>
                <Email fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {profile?.official_email || profile?.head_email || "department@civicdesk.org"}
                </Typography>
              </Box>
              <Chip label="DEPARTMENT HEAD" size="small" color="success" sx={{ fontWeight: 700 }} />
              {profile?.department_category && (
                <Chip
                  icon={<Category fontSize="small" />}
                  label={profile.department_category}
                  size="small"
                  variant="outlined"
                />
              )}
              {isKycVerified ? (
                <Chip
                  icon={<VerifiedIcon sx={{ fontSize: "16px !important", color: "#2563EB !important" }} />}
                  label="Verified Unit"
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
          { label: "Department Complaints", value: totalComplaints, color: "primary" },
          { label: "Resolved", value: resolvedCount, color: "success" },
          { label: "Active Teams", value: activeTeams, color: "warning" },
          { label: "Staff Roster", value: totalStaff, color: "info" },
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
          <Tab label="Department Details" icon={<Business fontSize="small" />} iconPosition="start" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="KYC & Verification" icon={<Assignment fontSize="small" />} iconPosition="start" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="Recent Activity" icon={<ListAlt fontSize="small" />} iconPosition="start" sx={{ textTransform: "none", fontWeight: 600 }} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ═══ Tab 0: About / Head Details ═══ */}
          {tabIndex === 0 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                    <BadgeOutlined fontSize="small" />
                    <Typography variant="caption" fontWeight="medium">
                      Department Head Name
                    </Typography>
                  </Box>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={form.head_name}
                      onChange={(e) => setForm({ ...form, head_name: e.target.value })}
                      placeholder="Head of Department"
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
                      placeholder="head@civicdesk.org"
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium">
                      {form.head_email || profile?.head_email || "Not provided"}
                    </Typography>
                  )}
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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

              <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                    <Assignment fontSize="small" />
                    <Typography variant="caption" fontWeight="medium">
                      Identity Document Type & Number
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="medium">
                    {profile?.head_identity_type ? profile.head_identity_type.toUpperCase() : "Citizenship"}:{" "}
                    <strong>{profile?.head_identity_number || "Not provided"}</strong>
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                    <CalendarMonth fontSize="small" />
                    <Typography variant="caption" fontWeight="medium">
                      Department Registered Since
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="medium">
                    {formatDate(profile?.registered_at || profile?.created_at)}
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* ═══ Tab 1: Department Details ═══ */}
          {tabIndex === 1 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Business color="primary" fontSize="small" />
                    <Typography fontWeight="bold">Department Name</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    {profile?.department_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Category: {profile?.department_category || "General Municipal Services"}
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
                    {profile?.municipality?.official_name || "Municipality Office"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Municipality ID: {profile?.municipality_id || "—"}
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Official Department Email
                  </Typography>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={form.official_email}
                      onChange={(e) => setForm({ ...form, official_email: e.target.value })}
                      placeholder="department@civicdesk.org"
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
                    Department Hotline / Contact
                  </Typography>
                  <Typography variant="body1" fontWeight={600} mt={0.5}>
                    {profile?.official_contact_no || profile?.head_contact_no || "Not provided"}
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* ═══ Tab 2: KYC & Verification ═══ */}
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
                    Department KYC identity is officially verified on the Smart Civic Platform.
                  </Alert>

                  {/* Document Previews */}
                  <Grid container spacing={3}>
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
                            Document preview not available
                          </Box>
                        )}
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Card variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: "center" }}>
                        <Typography variant="subtitle2" fontWeight={600} mb={1}>
                          Head Identity Document (Back)
                        </Typography>
                        {profile?.head_identity_back_url ? (
                          <Box position="relative">
                            <Box
                              component="img"
                              src={profile.head_identity_back_url}
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
                                  url: profile.head_identity_back_url,
                                  title: "Head Identity Document (Back)",
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
                    Your department verification documents are currently under review by the Municipality Head. You will be notified once approved.
                  </Alert>
                </Box>
              ) : (
                <Box>
                  {profile?.kyc_rejection_reason && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                      Verification rejected: {profile.kyc_rejection_reason}
                    </Alert>
                  )}
                  <Typography variant="h6" fontWeight={700} mb={1}>
                    Department Verification
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Upload government identification and department credentials for official municipality approval.
                  </Typography>
                  <KycUpload
                    mode="front-back"
                    initialValues={{
                      identity_type: profile?.head_identity_type || "citizenship",
                      identity_number: profile?.head_identity_number || "",
                    }}
                    onSubmit={async (payload) => {
                      await departmentApi.updateMyProfile({
                        head_identity_type: payload.identity_type,
                        head_identity_number: payload.identity_number,
                        head_identity_front_base64: payload.front_image,
                        head_identity_back_base64: payload.back_image,
                      });
                      setShowReupload(false);
                      Swal.fire({ icon: "success", title: "Submitted", text: "Department verification documents updated." });
                      fetchProfileData();
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* ═══ Tab 3: Recent Department Activity ═══ */}
          {tabIndex === 3 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={2}>
                Recent Department Grievances
              </Typography>

              {complaints.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No complaints currently logged for this department.
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
                        "&:hover": { borderColor: "success.main" },
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
                        onClick={() => navigate("/department_head/complaint-queue")}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                      >
                        View Queue
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
}
