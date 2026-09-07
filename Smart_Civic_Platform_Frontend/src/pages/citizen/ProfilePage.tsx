import React, { useEffect, useState, useRef } from "react";
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
  MenuItem,
  Divider,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  LocationOn,
  Email,
  Phone,
  Cake,
  BadgeOutlined,
  Security,
  Home,
  ListAlt,
  CalendarMonth,
  NotificationsOutlined,
  Wc,
  Assignment,
  PhotoCamera,
  Verified as VerifiedIcon,
  CheckCircle,
  HourglassEmpty,
  ErrorOutlined,
  Close as CloseIcon,
  ZoomIn,
} from "@mui/icons-material";
import { fetchWithAuth, BASE_URL, citizenApi } from "../../api";
import { useAuth } from "../../hooks/useAuth";
import Swal from "sweetalert2";
import { KycUpload, type KycUploadPayload } from "../../components/kyc/KycUpload";
import { profileApi } from "../../api/modules/profile.api";
import { isAtLeast18, isValidNepalPhone } from "../../validation/kyc.validators";

interface CitizenDetails {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  current_address: string | null;
  permanent_address: string | null;
  ward_id: string | null;
  notification_pref: string | null;
  kyc_status?: string | null;
  identity_type?: string | null;
  identity_number?: string | null;
  identity_front_image_url?: string | null;
  identity_back_image_url?: string | null;
  profile_picture?: string | null;
  kyc_verified_at?: string | null;
  kyc_rejection_reason?: string | null;
}

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  municipality_id: string | null;
  department_id: string | null;
  created_at: string;
  profile_picture?: string | null;
  citizen_details: CitizenDetails | null;
}

interface RecentComplaint {
  id: string;
  co_uid: string;
  title: string;
  status: string;
  created_at: string;
}

interface DashboardData {
  summary: {
    totalComplaints: number;
    resolvedComplaints: number;
    pendingComplaints: number;
    activeIncidentsReported: number;
    unreadNotifications: number;
  };
  recentComplaints: RecentComplaint[];
}

function splitFullName(fullName: string): {
  first: string;
  middle: string;
  last: string;
} {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
    return { first: "", middle: "", last: "" };
  }
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  if (parts.length === 2) return { first: parts[0], middle: "", last: parts[1] };
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(" "),
    last: parts[parts.length - 1],
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_COLORS: Record<string, "warning" | "info" | "success" | "error" | "default"> = {
  pending: "warning",
  under_review: "info",
  in_progress: "info",
  resolved: "success",
  rejected: "error",
  closed: "default",
};

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    current_address: "",
    permanent_address: "",
    notification_pref: "",
  });
  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");
  const [showReupload, setShowReupload] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [profileRes, dashboardRes] = await Promise.all([
          fetchWithAuth(`${BASE_URL}/auth/me`),
          fetchWithAuth(`${BASE_URL}/citizen/dashboard`),
        ]);

        const profileResult = await profileRes.json();
        if (profileResult.success && profileResult.data) {
          const data = profileResult.data as ProfileData;
          setProfile(data);
          const cd = data.citizen_details;
          const { first, middle, last } = splitFullName(data.full_name);
          setForm({
            first_name: cd?.first_name || first,
            middle_name: cd?.middle_name || middle,
            last_name: cd?.last_name || last,
            phone: data.phone || "",
            gender: cd?.gender || "prefer_not_to_say",
            date_of_birth: cd?.date_of_birth || "",
            current_address: cd?.current_address || "",
            permanent_address: cd?.permanent_address || "",
            notification_pref: cd?.notification_pref || "both",
          });
        } else {
          setError("Failed to load profile.");
        }

        const dashboardResult = await dashboardRes.json();
        if (dashboardResult.success && dashboardResult.data) {
          setDashboard(dashboardResult.data as DashboardData);
        }
      } catch {
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    try {
      if (form.date_of_birth && !isAtLeast18(form.date_of_birth)) {
        Swal.fire({
          icon: "warning",
          title: "Invalid Date of Birth",
          text: "You must be at least 18 years old to update your profile.",
        });
        return;
      }

      if (form.phone && !isValidNepalPhone(form.phone)) {
        Swal.fire({
          icon: "warning",
          title: "Invalid Phone Number",
          text: "Please enter a valid 10-digit Nepal mobile number (e.g. 98XXXXXXXX or 97XXXXXXXX).",
        });
        return;
      }

      setSaving(true);
      const payload: Record<string, string> = {};
      if (form.first_name !== (profile?.citizen_details?.first_name || "")) payload.first_name = form.first_name;
      if (form.middle_name !== (profile?.citizen_details?.middle_name || "")) payload.middle_name = form.middle_name;
      if (form.last_name !== (profile?.citizen_details?.last_name || "")) payload.last_name = form.last_name;
      if (form.phone !== (profile?.phone || "")) payload.phone = form.phone;
      if (form.gender !== (profile?.citizen_details?.gender || "")) payload.gender = form.gender;
      if (form.date_of_birth !== (profile?.citizen_details?.date_of_birth || "")) payload.date_of_birth = form.date_of_birth;
      if (form.current_address !== (profile?.citizen_details?.current_address || "")) payload.current_address = form.current_address;
      if (form.permanent_address !== (profile?.citizen_details?.permanent_address || "")) payload.permanent_address = form.permanent_address;
      if (form.notification_pref !== (profile?.citizen_details?.notification_pref || "")) payload.notification_pref = form.notification_pref;

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      const res = await fetchWithAuth(`${BASE_URL}/citizen/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to update profile");

      const fullName = `${form.first_name}${form.middle_name ? " " + form.middle_name : ""} ${form.last_name}`.trim();
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName,
              phone: form.phone,
              citizen_details: {
                ...prev.citizen_details!,
                first_name: form.first_name,
                middle_name: form.middle_name,
                last_name: form.last_name,
                gender: form.gender,
                date_of_birth: form.date_of_birth,
                current_address: form.current_address,
                permanent_address: form.permanent_address,
                notification_pref: form.notification_pref,
              },
            }
          : prev,
      );
      setEditing(false);
      Swal.fire({ icon: "success", title: "Profile Updated", timer: 1500, showConfirmButton: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      Swal.fire({ icon: "error", title: "Passwords do not match" });
      return;
    }
    try {
      setChangingPassword(true);
      const res = await fetchWithAuth(`${BASE_URL}/auth/change-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to change password");
      if (result.data?.access_token) {
        localStorage.setItem("access_token", result.data.access_token);
      }
      if (result.data?.refresh_token) {
        localStorage.setItem("refresh_token", result.data.refresh_token);
      }
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      Swal.fire({ icon: "success", title: "Password Changed", timer: 1500, showConfirmButton: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "File Too Large",
        text: "Please select an image smaller than 2MB.",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "Invalid File Type",
        text: "Please select a valid image file (JPG, PNG, WebP).",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        setUploadingAvatar(true);
        const res = await profileApi.updateProfilePicture(base64Data);
        const newUrl = res.data?.profile_picture || res.profile_picture || base64Data;

        setProfile((prev) =>
          prev
            ? {
                ...prev,
                profile_picture: newUrl,
                citizen_details: prev.citizen_details
                  ? { ...prev.citizen_details, profile_picture: newUrl }
                  : prev.citizen_details,
              }
            : prev
        );

        Swal.fire({
          icon: "success",
          title: "Profile Picture Updated",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Upload Failed",
          text: err.response?.data?.message || err.message || "Failed to update profile picture.",
        });
      } finally {
        setUploadingAvatar(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box p={3} maxWidth="md" mx="auto">
        <Alert severity="error">{error || "Profile not found"}</Alert>
      </Box>
    );
  }

  const cd = profile.citizen_details;
  const displayName = cd
    ? `${cd.first_name || ""}${cd.middle_name ? " " + cd.middle_name : ""} ${cd.last_name || ""}`.trim()
    : profile.full_name;

  const currentAvatarUrl = cd?.profile_picture || profile.profile_picture || undefined;
  const isKycVerified = cd?.kyc_status === "verified";
  const isKycPending = cd?.kyc_status === "pending";

  const recentComplaints = dashboard?.recentComplaints || [];

  return (
    <Box maxWidth="lg" sx={{ margin: "0 auto", px: { xs: 1, sm: 2, md: 3 }, py: 3 }}>
      {/* ─── Cover + Avatar ─── */}
      <Card sx={{ borderRadius: 3, overflow: "hidden", mb: 2 }}>
        <Box
          sx={{
            height: { xs: 140, sm: 200 },
            background: "linear-gradient(135deg, #1976d2 0%, #9c27b0 50%, #ff6f00 100%)",
            position: "relative",
          }}
        >
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
                <Tooltip title="KYC Identity Verified" arrow>
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

        <Box
          sx={{
            pt: { xs: 6, sm: 7 },
            pb: 2,
            px: { xs: 2, sm: 3 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
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
                  {profile.email}
                </Typography>
              </Box>
              <Chip label="Citizen" size="small" color="primary" variant="outlined" />
              {isKycVerified ? (
                <Chip
                  icon={<VerifiedIcon sx={{ fontSize: "16px !important", color: "#2563EB !important" }} />}
                  label="KYC Verified"
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
          <Button
            variant={editing ? "contained" : "outlined"}
            size="small"
            startIcon={editing ? <SaveIcon /> : <EditIcon />}
            onClick={() => (editing ? handleSaveProfile() : setEditing(true))}
            disabled={saving}
            sx={{ mt: { xs: 1, sm: 0 } }}
          >
            {saving ? "Saving..." : editing ? "Save Profile" : "Edit Profile"}
          </Button>
        </Box>
      </Card>

      {/* ─── Stats Row ─── */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: "Total Complaints", value: dashboard?.summary.totalComplaints ?? 0, color: "primary" },
          { label: "Resolved", value: dashboard?.summary.resolvedComplaints ?? 0, color: "success" },
          { label: "Pending", value: dashboard?.summary.pendingComplaints ?? 0, color: "warning" },
          { label: "Member Since", value: formatDate(profile.created_at), color: "info" },
        ].map((stat) => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Card sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
              <Typography variant="h5" fontWeight="bold" color={`${stat.color}.main`}>
                {typeof stat.value === "number" ? stat.value : stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ─── Tabs ─── */}
      <Card sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(_e, v) => setTabIndex(v)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab label="About" icon={<BadgeOutlined fontSize="small" />} iconPosition="start" />
          <Tab label="Address" icon={<LocationOn fontSize="small" />} iconPosition="start" />
          <Tab label="KYC Settings" icon={<Assignment fontSize="small" />} iconPosition="start" />
          <Tab label="Activity" icon={<ListAlt fontSize="small" />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ═══ About Tab ═══ */}
          {tabIndex === 0 && (
            <Grid container spacing={3}>
              {[
                { label: "First Name", value: form.first_name, icon: <BadgeOutlined fontSize="small" /> },
                { label: "Middle Name", value: form.middle_name || "—", icon: <BadgeOutlined fontSize="small" /> },
                { label: "Last Name", value: form.last_name, icon: <BadgeOutlined fontSize="small" /> },
                { label: "Phone", value: form.phone || "—", icon: <Phone fontSize="small" /> },
                { label: "Gender", value: form.gender ? form.gender.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—", icon: <Wc fontSize="small" /> },
                { label: "Date of Birth", value: form.date_of_birth ? formatDate(form.date_of_birth) : "—", icon: <Cake fontSize="small" /> },
                { label: "Notification Preference", value: form.notification_pref === "both" ? "Email & SMS" : form.notification_pref === "email" ? "Email Only" : form.notification_pref === "sms" ? "SMS Only" : "None", icon: <NotificationsOutlined fontSize="small" /> },
              ].map((field) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={field.label}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                      {field.icon}
                      <Typography variant="caption" fontWeight="medium">
                        {field.label}
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={field.value !== "—" ? "medium" : "regular"} color={field.value !== "—" ? "text.primary" : "text.disabled"}>
                      {field.value}
                    </Typography>
                  </Card>
                </Grid>
              ))}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" flexWrap="wrap" gap={3} color="text.secondary">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Email fontSize="small" />
                    <Typography variant="body2">{profile.email}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <CalendarMonth fontSize="small" />
                    <Typography variant="body2">
                      Joined {formatDate(profile.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}

          {/* ═══ Address Tab ═══ */}
          {tabIndex === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Home color="primary" fontSize="small" />
                    <Typography fontWeight="bold">Permanent Address</Typography>
                  </Box>
                  <Typography
                    variant="body1"
                    color={form.permanent_address ? "text.primary" : "text.disabled"}
                    sx={{ whiteSpace: "pre-wrap", minHeight: 60 }}
                  >
                    {form.permanent_address || "No permanent address registered"}
                  </Typography>
                  {cd?.ward_id && (
                    <Chip
                      icon={<LocationOn />}
                      label={`Ward: ${cd.ward_id.slice(0, 8)}...`}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1.5 }}
                    />
                  )}
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <LocationOn color="secondary" fontSize="small" />
                    <Typography fontWeight="bold">Current Address</Typography>
                  </Box>
                  <Typography
                    variant="body1"
                    color={form.current_address ? "text.primary" : "text.disabled"}
                    sx={{ whiteSpace: "pre-wrap", minHeight: 60 }}
                  >
                    {form.current_address || "No current address registered"}
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* ═══ KYC Tab ═══ */}
          {tabIndex === 2 && (
            <Box>
              {isKycVerified && !showReupload ? (
                <Box>
                  <Alert
                    severity="success"
                    icon={<CheckCircle fontSize="inherit" />}
                    sx={{ mb: 3, borderRadius: 2 }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => setShowReupload(true)}
                        sx={{ fontWeight: 600, textTransform: "none" }}
                      >
                        Re-upload Documents
                      </Button>
                    }
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      Identity Verified Officially
                    </Typography>
                    Your citizen KYC verification is complete and confirmed. Your official profile picture and identity records are verified.
                  </Alert>

                  <Grid container spacing={3}>
                    {/* Left: Verified Profile Picture Card */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 3, height: "100%" }}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                          Verified Profile Picture
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Official citizen identification portrait
                        </Typography>

                        <Box position="relative" display="inline-block" my={1}>
                          <Avatar
                            src={currentAvatarUrl}
                            alt={displayName}
                            sx={{
                              width: 120,
                              height: 120,
                              mx: "auto",
                              fontSize: "3rem",
                              fontWeight: "bold",
                              bgcolor: "primary.main",
                              border: "4px solid #2563EB",
                              boxShadow: "0 4px 20px rgba(37,99,235,0.25)",
                            }}
                          >
                            {getInitials(displayName)}
                          </Avatar>
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 4,
                              right: 4,
                              bgcolor: "#2563EB",
                              borderRadius: "50%",
                              width: 32,
                              height: 32,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "2px solid white",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                            }}
                          >
                            <VerifiedIcon sx={{ fontSize: 20, color: "white" }} />
                          </Box>
                        </Box>

                        <Box mt={2}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PhotoCamera />}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            sx={{ textTransform: "none", borderRadius: 2 }}
                          >
                            {uploadingAvatar ? "Uploading..." : "Change Profile Photo"}
                          </Button>
                        </Box>
                      </Card>
                    </Grid>

                    {/* Right: Verified Credentials & Document Proofs */}
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Card variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            Identity Credentials & Documents
                          </Typography>
                          <Chip
                            icon={<VerifiedIcon sx={{ fontSize: "16px !important" }} />}
                            label="Verified"
                            color="success"
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </Box>

                        <Grid container spacing={2} mb={3}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                DOCUMENT TYPE
                              </Typography>
                              <Typography variant="body1" fontWeight={600} textTransform="capitalize">
                                {cd?.identity_type ? cd.identity_type.replace(/_/g, " ") : "Citizenship Card"}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                IDENTITY NUMBER
                              </Typography>
                              <Typography variant="body1" fontWeight={600}>
                                {cd?.identity_number || "—"}
                              </Typography>
                            </Box>
                          </Grid>
                          {cd?.kyc_verified_at && (
                            <Grid size={{ xs: 12 }}>
                              <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                  VERIFIED ON
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                  {formatDate(cd.kyc_verified_at)}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                        </Grid>

                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                          Verified Document Images
                        </Typography>
                        <Grid container spacing={2}>
                          {cd?.identity_front_image_url && (
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Card
                                variant="outlined"
                                sx={{
                                  p: 1,
                                  borderRadius: 2,
                                  textAlign: "center",
                                  cursor: "pointer",
                                  "&:hover": { borderColor: "primary.main" },
                                }}
                                onClick={() => {
                                  setPreviewDocUrl(cd.identity_front_image_url!);
                                  setPreviewDocTitle("Front Identity Document");
                                }}
                              >
                                <Box
                                  component="img"
                                  src={cd.identity_front_image_url}
                                  alt="Front Document"
                                  sx={{
                                    width: "100%",
                                    height: 120,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                  }}
                                />
                                <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mt={1}>
                                  <ZoomIn fontSize="small" color="primary" />
                                  <Typography variant="caption" fontWeight={600}>
                                    Front Document (Click to view)
                                  </Typography>
                                </Box>
                              </Card>
                            </Grid>
                          )}
                          {cd?.identity_back_image_url && (
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Card
                                variant="outlined"
                                sx={{
                                  p: 1,
                                  borderRadius: 2,
                                  textAlign: "center",
                                  cursor: "pointer",
                                  "&:hover": { borderColor: "primary.main" },
                                }}
                                onClick={() => {
                                  setPreviewDocUrl(cd.identity_back_image_url!);
                                  setPreviewDocTitle("Back Identity Document");
                                }}
                              >
                                <Box
                                  component="img"
                                  src={cd.identity_back_image_url}
                                  alt="Back Document"
                                  sx={{
                                    width: "100%",
                                    height: 120,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                  }}
                                />
                                <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mt={1}>
                                  <ZoomIn fontSize="small" color="primary" />
                                  <Typography variant="caption" fontWeight={600}>
                                    Back Document (Click to view)
                                  </Typography>
                                </Box>
                              </Card>
                            </Grid>
                          )}
                        </Grid>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box>
                  {isKycPending ? (
                    <Alert severity="warning" icon={<HourglassEmpty fontSize="inherit" />} sx={{ mb: 3, borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Verification Pending
                      </Typography>
                      Your identity documents have been submitted and are awaiting municipal approval.
                    </Alert>
                  ) : cd?.kyc_status === "rejected" ? (
                    <Alert severity="error" icon={<ErrorOutlined fontSize="inherit" />} sx={{ mb: 3, borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Identity Verification Rejected
                      </Typography>
                      {cd.kyc_rejection_reason || "Document verification was rejected. Please re-upload clear photos of your valid identity document."}
                    </Alert>
                  ) : (
                    <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                      Please submit your identity documents for citizen KYC verification.
                    </Alert>
                  )}

                  {showReupload && (
                    <Box mb={2} display="flex" justifyContent="flex-end">
                      <Button
                        size="small"
                        onClick={() => setShowReupload(false)}
                        sx={{ textTransform: "none" }}
                      >
                        Cancel & View Current Verified Credentials
                      </Button>
                    </Box>
                  )}

                  <KycUpload
                    mode="front-back"
                    initialValues={{
                      identity_type: cd?.identity_type || "",
                      identity_number: cd?.identity_number || "",
                    }}
                    onSubmit={async (payload) => {
                      try {
                        await citizenApi.uploadIdentity({
                          identity_type: payload.identity_type as any,
                          identity_number: payload.identity_number,
                          front_image: payload.front_image || payload.identity_document || "",
                          back_image: payload.back_image || "",
                        });
                        Swal.fire(
                          "Success",
                          "Your identity documents have been submitted successfully for verification.",
                          "success"
                        );
                        setProfile((prev) =>
                          prev
                            ? {
                                ...prev,
                                citizen_details: {
                                  ...prev.citizen_details!,
                                  kyc_status: "pending",
                                  identity_type: payload.identity_type,
                                  identity_number: payload.identity_number,
                                  identity_front_image_url: payload.front_image || payload.identity_document || null,
                                  identity_back_image_url: payload.back_image || null,
                                },
                              }
                            : prev
                        );
                        setShowReupload(false);
                      } catch (err: any) {
                        Swal.fire(
                          "Error",
                          err.response?.data?.message || err.message || "Failed to submit KYC",
                          "error"
                        );
                      }
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* ═══ Activity Tab ═══ */}
          {tabIndex === 3 && (
            <>
              {recentComplaints.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <ListAlt sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                  <Typography color="text.secondary" gutterBottom>
                    No complaints submitted yet.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => navigate("/citizen/complaints/new")}
                  >
                    Submit Your First Complaint
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography fontWeight="bold">Recent Complaints</Typography>
                    <Button
                      size="small"
                      onClick={() => navigate("/citizen/complaints")}
                    >
                      View All
                    </Button>
                  </Box>
                  {recentComplaints.map((complaint) => (
                    <Card
                      key={complaint.co_uid}
                      variant="outlined"
                      sx={{
                        p: 2,
                        mb: 1.5,
                        borderRadius: 2,
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                      onClick={() => navigate(`/citizen/complaints/${complaint.co_uid}`)}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Typography variant="body1" fontWeight="medium">
                            {complaint.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(complaint.created_at)}
                          </Typography>
                        </Box>
                        <Chip
                          label={formatStatusLabel(complaint.status)}
                          color={STATUS_COLORS[complaint.status] || "default"}
                          size="small"
                          sx={{ ml: 1, flexShrink: 0 }}
                        />
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </>
          )}
        </Box>
      </Card>

      {/* ─── Security / Change Password ─── */}
      <Card sx={{ borderRadius: 2, p: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Security color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Security & Password
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="password"
              label="Current Password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="password"
              label="New Password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="password"
              label="Confirm New Password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid item xs={12} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={changingPassword ? <CircularProgress size={18} color="inherit" /> : <Security />}
              onClick={handlePasswordChange}
              disabled={changingPassword}
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* ─── Document Preview Dialog ─── */}
      <Dialog
        open={Boolean(previewDocUrl)}
        onClose={() => setPreviewDocUrl(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="bold">
            {previewDocTitle || "Document Preview"}
          </Typography>
          <IconButton onClick={() => setPreviewDocUrl(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ textAlign: "center", bgcolor: "#f8fafc", p: 3 }}>
          {previewDocUrl && (
            <img
              src={previewDocUrl}
              alt={previewDocTitle}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDocUrl(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
