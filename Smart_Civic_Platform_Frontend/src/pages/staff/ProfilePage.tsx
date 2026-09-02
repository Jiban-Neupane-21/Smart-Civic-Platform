import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  Grid,
  Avatar,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import EditIcon from "@mui/icons-material/Edit";
import BadgeIcon from "@mui/icons-material/Badge";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import HomeIcon from "@mui/icons-material/Home";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { format, parseISO } from "date-fns";
import Swal from "sweetalert2";

import staffApi from "../../api/modules/staff.api";
import type { StaffProfile } from "../../api/types";

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <Box mb={2}>
    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
      {label}
    </Typography>
    <Typography variant="body1" fontWeight={500} mt={0.5}>
      {value || <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>Not provided</span>}
    </Typography>
  </Box>
);

export const StaffProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [openEdit, setOpenEdit] = useState<boolean>(false);
  const [contactNumber, setContactNumber] = useState<string>("");
  const [personalAddress, setPersonalAddress] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await staffApi.getMyProfile();
      if (res?.success && res?.data) {
        setProfile(res.data);
        setContactNumber(res.data.contact_number || res.data.profile?.phone || "");
        setPersonalAddress(res.data.personal_address || "");
      } else {
        setError(res?.message || "Failed to load staff profile");
      }
    } catch (err: any) {
      setError(err?.message || "Error fetching profile details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const res = await staffApi.updateMyProfile({
        phone: contactNumber,
        contact_number: contactNumber,
        personal_address: personalAddress,
      });

      if (res?.success) {
        Swal.fire({
          icon: "success",
          title: "Profile Updated",
          text: "Your contact details have been successfully updated.",
          timer: 2000,
          showConfirmButton: false,
        });
        setOpenEdit(false);
        fetchProfile();
      } else {
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: res?.message || "Failed to update profile",
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "An error occurred while saving profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return format(parseISO(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Staff Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your personal contact details and review your department assignment.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => setOpenEdit(true)}
          sx={{ borderRadius: 2 }}
        >
          Edit Contact Info
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {profile && (
        <Grid container spacing={3}>
          {/* Main Profile Card */}
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                p: 3,
                textAlign: "center",
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Avatar
                sx={{
                  width: 84,
                  height: 84,
                  bgcolor: "primary.main",
                  fontSize: 32,
                  mx: "auto",
                  mb: 2,
                }}
              >
                {profile.profile?.full_name?.charAt(0) || "S"}
              </Avatar>

              <Typography variant="h6" fontWeight={700}>
                {profile.profile?.full_name || "Staff Member"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {profile.profile?.email}
              </Typography>

              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                <Chip
                  label={profile.profile?.role?.toUpperCase() || "STAFF"}
                  size="small"
                  color="primary"
                />
                <Chip
                  label={profile.profile?.account_status || "Active"}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ textAlign: "left" }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <BadgeIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Employee ID
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {profile.employee_id || "Not assigned"}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <CalendarTodayIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Onboarded Date
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatDate(profile.onboarded_at || profile.profile?.created_at)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Card>
          </Grid>

          {/* Details Column */}
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              {/* Department & Municipality Card */}
              <Card
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <BusinessIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Department & Municipality
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoRow
                      label="Assigned Department"
                      value={profile.department?.department_name}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow
                      label="Category"
                      value={profile.department?.department_category?.replace(/_/g, " ").toUpperCase()}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow
                      label="Municipality"
                      value={profile.municipality?.official_name}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow
                      label="Expertise / Specialization"
                      value={profile.expertise || "General Field Work"}
                    />
                  </Grid>
                </Grid>
              </Card>

              {/* Personal & Contact Information */}
              <Card
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <ContactPhoneIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Contact & Address
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoRow
                      label="Contact Number"
                      value={profile.contact_number || profile.profile?.phone}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoRow
                      label="Gender"
                      value={profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <InfoRow
                      label="Personal Address"
                      value={profile.personal_address}
                    />
                  </Grid>
                </Grid>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* Edit Contact Modal */}
      <Dialog open={openEdit} onClose={() => !saving && setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Contact Information</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Contact Phone Number"
              fullWidth
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+977-98XXXXXXXX"
              disabled={saving}
            />
            <TextField
              label="Personal Address"
              fullWidth
              multiline
              rows={3}
              value={personalAddress}
              onChange={(e) => setPersonalAddress(e.target.value)}
              placeholder="Enter your current residential address"
              disabled={saving}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEdit(false)} disabled={saving} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateProfile}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaffProfilePage;
