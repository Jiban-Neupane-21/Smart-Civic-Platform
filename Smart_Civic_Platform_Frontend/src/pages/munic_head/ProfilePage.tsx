import React, { useEffect, useState } from "react";
import {
  Box, Typography, Card, Grid, Avatar, Divider,
  Chip, CircularProgress, Alert, Tooltip, Paper, Button
} from "@mui/material";
import {
  Shield, BadgeCheck, AlertTriangle, Clock, XCircle, Building2, User, FileText, ArrowRight
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { municipalityApi } from "../../api/modules/municipality.api";
import { useNavigate } from "react-router-dom";

// ─── KYC Status Config ────────────────────────────────────────────────────────
const KYC_STATUS_CONFIG = {
  unverified: {
    label: "Not Verified",
    color: "#6B7280",
    bg: "rgba(107, 114, 128, 0.08)",
    border: "#D1D5DB",
    icon: <AlertTriangle size={15} />,
    message: "You have not completed your municipality verification.",
  },
  pending: {
    label: "Under Review",
    color: "#D97706",
    bg: "rgba(217, 119, 6, 0.08)",
    border: "#FCD34D",
    icon: <Clock size={15} />,
    message: "Your KYC documents are under review by the SuperAdmin. You will be notified once verified.",
  },
  verified: {
    label: "Verified",
    color: "#2563EB",
    bg: "rgba(37, 99, 235, 0.08)",
    border: "#93C5FD",
    icon: <BadgeCheck size={15} />,
    message: "Your municipality is officially verified on the Smart Civic Platform.",
  },
  rejected: {
    label: "Rejected",
    color: "#DC2626",
    bg: "rgba(220, 38, 38, 0.08)",
    border: "#FCA5A5",
    icon: <XCircle size={15} />,
    message: "Your KYC was rejected. Please review the reason below and update your KYC.",
  },
};

const SectionHeader = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
  <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider", bgcolor: "grey.50", display: "flex", alignItems: "center", gap: 2 }}>
    <Box sx={{ p: 1, bgcolor: "primary.main", borderRadius: 2, color: "white", display: "flex" }}>{icon}</Box>
    <Box>
      <Typography variant="h6" fontWeight={700}>{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
    </Box>
  </Box>
);

const VerifiedBadge = () => (
  <Tooltip title="Verified Municipality" arrow>
    <Box sx={{
      position: "absolute", bottom: 4, right: 4,
      bgcolor: "#2563EB", borderRadius: "50%", width: 28, height: 28,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "2px solid white", boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
    }}>
      <BadgeCheck size={16} color="white" />
    </Box>
  </Tooltip>
);

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

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await municipalityApi.getMyProfile();
        if (res.success && res.data) {
          setProfile(res.data);
        }
      } catch (err: any) {
        setPageError(err?.response?.data?.message || err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (!user) return null;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", flexDirection: "column", gap: 2 }}>
        <CircularProgress size={56} thickness={4} />
        <Typography color="text.secondary">Loading profile...</Typography>
      </Box>
    );
  }

  const kycStatus: keyof typeof KYC_STATUS_CONFIG = (profile?.kyc_status as keyof typeof KYC_STATUS_CONFIG) ?? "unverified";
  const kycConfig = KYC_STATUS_CONFIG[kycStatus] ?? KYC_STATUS_CONFIG.unverified;
  
  // We can let them update if it's not verified, or even if pending (as per user choice/default)
  const canUpdateKyc = kycStatus !== "verified";

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, margin: "0 auto" }}>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">Municipality Profile</Typography>
          <Typography variant="body1" color="text.secondary" mt={0.5}>
            View your municipality's official verified records.
          </Typography>
        </Box>
        {canUpdateKyc && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/municipality_head/update-kyc")}
            endIcon={<ArrowRight size={18} />}
            sx={{ borderRadius: 3, fontWeight: 600, px: 3, py: 1 }}
          >
            Update your KYC
          </Button>
        )}
      </Box>

      {pageError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setPageError(null)}>{pageError}</Alert>
      )}

      <Grid container spacing={3}>
        {/* LEFT PROFILE CARD */}
        <Grid item xs={12} md={4}>
          <Box display="flex" flexDirection="column" gap={3}>
            <Card sx={{ p: 4, textAlign: "center", borderRadius: 4, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
              <Box position="relative" display="inline-block" mb={2}>
                <Avatar
                  src={profile?.official_logo || undefined}
                  sx={{
                    width: 96, height: 96, bgcolor: "primary.main", fontSize: "2.2rem", fontWeight: 700,
                    boxShadow: kycStatus === "verified"
                      ? "0 0 0 3px #2563EB, 0 4px 16px rgba(37,99,235,0.3)"
                      : "0 4px 12px rgba(99,102,241,0.25)",
                  }}
                >
                  {(profile?.official_name || user.full_name || "M").charAt(0).toUpperCase()}
                </Avatar>
                {kycStatus === "verified" && <VerifiedBadge />}
              </Box>
              <Typography variant="h6" fontWeight={800} gutterBottom>{profile?.official_name || user.full_name}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>{profile?.official_email || user.email}</Typography>
              <Box mt={1.5} mb={2}>
                <Chip
                  icon={kycConfig.icon as any}
                  label={kycConfig.label}
                  size="small"
                  sx={{ bgcolor: kycConfig.bg, color: kycConfig.color, border: `1px solid ${kycConfig.border}`, fontWeight: 700, "& .MuiChip-icon": { color: kycConfig.color } }}
                />
              </Box>
              <Box sx={{ bgcolor: "primary.50", color: "primary.main", px: 2, py: 0.75, borderRadius: 2, display: "inline-flex", alignItems: "center", gap: 1 }}>
                <Shield size={16} />
                <Typography variant="body2" fontWeight={600} sx={{ textTransform: "capitalize" }}>
                  {user.role.replace(/_/g, " ")}
                </Typography>
              </Box>
            </Card>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid", borderColor: kycConfig.border, bgcolor: kycConfig.bg }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Box color={kycConfig.color}>{kycConfig.icon}</Box>
                <Typography variant="subtitle2" fontWeight={700} color={kycConfig.color}>KYC: {kycConfig.label}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">{kycConfig.message}</Typography>
              {kycStatus === "rejected" && profile?.kyc_rejection_reason && (
                <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2, fontSize: "0.8rem" }}>
                  <strong>Reason:</strong> {profile.kyc_rejection_reason}
                </Alert>
              )}
            </Paper>
          </Box>
        </Grid>

        {/* RIGHT DATA READ-ONLY */}
        <Grid item xs={12} md={8}>
          <Box display="flex" flexDirection="column" gap={3}>
            
            <Card sx={{ borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              <SectionHeader icon={<Building2 size={18} />} title="Municipality Information" />
              <Box sx={{ p: 4 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}><InfoRow label="Official Name" value={profile?.official_name} /></Grid>
                  <Grid item xs={12} sm={6}><InfoRow label="Local Level Type" value={profile?.local_level_type?.replace(/_/g, " ")} /></Grid>
                  <Grid item xs={12} sm={6}><InfoRow label="Official Email" value={profile?.official_email} /></Grid>
                  <Grid item xs={12} sm={6}><InfoRow label="Contact Number" value={profile?.official_contact_no} /></Grid>
                  <Grid item xs={12} sm={6}><InfoRow label="Total Wards" value={profile?.total_wards} /></Grid>
                  <Grid item xs={12}><InfoRow label="About / Description" value={profile?.about_description} /></Grid>
                </Grid>
              </Box>
            </Card>

            <Card sx={{ borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              <SectionHeader icon={<User size={18} />} title="Leadership Details" />
              <Box sx={{ p: 4 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}><InfoRow label="Mayor / Chairperson" value={profile?.mayor_chairperson_name} /></Grid>
                  <Grid item xs={12} sm={6}><InfoRow label="Deputy Mayor / Vice Chairperson" value={profile?.deputy_mayor_vice_chairperson_name} /></Grid>
                  <Grid item xs={12}><Divider sx={{ mb: 2 }} /></Grid>
                  <Grid item xs={12} sm={6}><InfoRow label="Administrative Head Name" value={profile?.head_name} /></Grid>
                  <Grid item xs={12} sm={6}><InfoRow label="Head Contact Number" value={profile?.head_contact_no} /></Grid>
                  <Grid item xs={12} sm={6}><InfoRow label="Head Email" value={profile?.head_email} /></Grid>
                </Grid>
              </Box>
            </Card>

            <Card sx={{ borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              <SectionHeader icon={<FileText size={18} />} title="Verification Documents" />
              <Box sx={{ p: 4 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}><InfoRow label="Identity Type" value={profile?.head_identity_type?.replace(/_/g, " ")} /></Grid>
                  <Grid item xs={12} sm={6}><InfoRow label="Identity Number" value={profile?.head_identity_number} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} display="block" mb={1}>
                      Uploaded Files
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={2}>
                      {profile?.head_identity_front_url && (
                        <Button variant="outlined" size="small" href={profile.head_identity_front_url} target="_blank">View ID Front</Button>
                      )}
                      {profile?.head_identity_back_url && (
                        <Button variant="outlined" size="small" href={profile.head_identity_back_url} target="_blank">View ID Back</Button>
                      )}
                      {profile?.registration_document_url && (
                        <Button variant="outlined" size="small" href={profile.registration_document_url} target="_blank">View Registration Doc</Button>
                      )}
                      {!profile?.head_identity_front_url && !profile?.registration_document_url && (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">No documents uploaded.</Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Card>

          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
