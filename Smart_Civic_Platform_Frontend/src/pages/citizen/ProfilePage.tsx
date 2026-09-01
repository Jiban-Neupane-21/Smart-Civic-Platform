import React, { useEffect, useState } from "react";
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
} from "@mui/icons-material";
import { fetchWithAuth, BASE_URL } from "../../api";
import { useAuth } from "../../hooks/useAuth";
import Swal from "sweetalert2";
import { KycUpload, type KycUploadPayload } from "../../components/kyc/KycUpload";
import { profileApi } from "../../api/modules/profile.api";

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
            <Avatar
              sx={{
                width: { xs: 96, sm: 112 },
                height: { xs: 96, sm: 112 },
                bgcolor: "primary.dark",
                fontSize: { xs: "2.5rem", sm: "3rem" },
                fontWeight: "bold",
                border: "4px solid white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              }}
            >
              {getInitials(displayName)}
            </Avatar>
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
              {profile.citizen_details?.kyc_status === "verified" ? (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Your identity has been successfully verified.
                </Alert>
              ) : profile.citizen_details?.kyc_status === "pending" ? (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  Your identity verification is currently pending review.
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Please submit your identity documents for KYC verification.
                </Alert>
              )}

              <KycUpload
                mode="front-back"
                initialValues={{
                  identity_type: profile.citizen_details?.identity_type || "",
                  identity_number: profile.citizen_details?.identity_number || "",
                }}
                onSubmit={async (payload) => {
                  try {
                    await profileApi.updateIdentity(payload);
                    Swal.fire(
                      "Success",
                      "Your identity documents have been submitted successfully.",
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
                            },
                          }
                        : prev
                    );
                  } catch (err: any) {
                    Swal.fire("Error", err.message || "Failed to submit KYC", "error");
                  }
                }}
              />
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
    </Box>
  );
};
