import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Avatar,
  Divider,
} from "@mui/material";
import {
  Search,
  Refresh,
  CheckCircle,
  Cancel,
  PendingActions,
  FactCheck,
  OpenInNew,
  Phone,
  Email,
  LocationOn,
  BadgeOutlined,
  Person,
  FilterList,
  ZoomIn,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { municipalityApi } from "../../api";
import type { CitizenKycItem } from "../../api/types/municipality.types";

type KycTabValue = "all" | "pending" | "verified" | "rejected";

export default function MunicCitizenKycVerification() {
  const [citizens, setCitizens] = useState<CitizenKycItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<KycTabValue>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [idTypeFilter, setIdTypeFilter] = useState<string>("all");

  // Inspection modal
  const [selectedCitizen, setSelectedCitizen] = useState<CitizenKycItem | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Zoom preview modal for document images
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await municipalityApi.getCitizenKycList("all");
      if (res.success && res.data) {
        setCitizens(res.data);
      } else {
        setCitizens([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load citizen KYC verification list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute live tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<KycTabValue, number> = {
      all: citizens.length,
      pending: 0,
      verified: 0,
      rejected: 0,
    };
    citizens.forEach((c) => {
      if (c.kyc_status === "pending") counts.pending++;
      else if (c.kyc_status === "verified") counts.verified++;
      else if (c.kyc_status === "rejected") counts.rejected++;
    });
    return counts;
  }, [citizens]);

  // Filter citizens list
  const filteredCitizens = useMemo(() => {
    return citizens.filter((c) => {
      // 1. Tab filter
      if (activeTab !== "all" && c.kyc_status !== activeTab) {
        return false;
      }

      // 2. ID Type filter
      if (idTypeFilter !== "all" && c.identity_type?.toLowerCase() !== idTypeFilter.toLowerCase()) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${c.first_name || ""} ${c.middle_name || ""} ${c.last_name || ""}`.toLowerCase();
        const idNum = (c.identity_number || "").toLowerCase();
        const phone = (c.contact_number || c.profile?.phone || "").toLowerCase();
        const email = (c.profile?.email || "").toLowerCase();
        const address = (c.current_address || c.permanent_address || "").toLowerCase();

        return (
          fullName.includes(q) ||
          idNum.includes(q) ||
          phone.includes(q) ||
          email.includes(q) ||
          address.includes(q)
        );
      }

      return true;
    });
  }, [citizens, activeTab, idTypeFilter, searchQuery]);

  // Open inspection modal
  const handleOpenInspect = (c: CitizenKycItem) => {
    setSelectedCitizen(c);
    setInspectOpen(true);
  };

  const handleCloseInspect = () => {
    if (!submittingReview) {
      setInspectOpen(false);
      setSelectedCitizen(null);
    }
  };

  // Approve Citizen KYC
  const handleApprove = async () => {
    if (!selectedCitizen) return;

    const result = await Swal.fire({
      title: "Approve Identity Verification?",
      html: `You are about to verify <b>${selectedCitizen.first_name} ${selectedCitizen.last_name}</b> (ID: <code>${selectedCitizen.identity_number}</code>).<br/><br/>This citizen will receive immediate civic platform privileges.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, Approve & Verify",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setSubmittingReview(true);
    try {
      const res = await municipalityApi.reviewCitizenKyc(selectedCitizen.id, {
        status: "verified",
      });

      if (res.success) {
        Swal.fire({
          icon: "success",
          title: "Citizen Verified!",
          text: `${selectedCitizen.first_name} ${selectedCitizen.last_name}'s KYC has been successfully verified.`,
          timer: 2000,
          showConfirmButton: false,
        });
        setInspectOpen(false);
        setSelectedCitizen(null);
        await fetchData();
        setActiveTab("verified");
      } else {
        Swal.fire("Error", (res as any).error || "Failed to approve verification.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.error || err.message, "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Reject Citizen KYC
  const handleOpenRejectDialog = () => {
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedCitizen) return;

    if (!rejectionReason.trim()) {
      Swal.fire("Reason Required", "Please state why the verification is being rejected so the citizen can re-upload.", "warning");
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await municipalityApi.reviewCitizenKyc(selectedCitizen.id, {
        status: "rejected",
        rejection_reason: rejectionReason.trim(),
      });

      if (res.success) {
        Swal.fire({
          icon: "info",
          title: "Verification Rejected",
          text: "The citizen has been notified with your reason to re-upload clear documents.",
          timer: 2500,
          showConfirmButton: false,
        });
        setRejectDialogOpen(false);
        setInspectOpen(false);
        setSelectedCitizen(null);
        await fetchData();
        setActiveTab("rejected");
      } else {
        Swal.fire("Error", (res as any).error || "Failed to reject verification.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.error || err.message, "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "verified":
        return <Chip icon={<CheckCircle sx={{ fontSize: "16px !important" }} />} label="VERIFIED" color="success" size="small" sx={{ fontWeight: 700 }} />;
      case "rejected":
        return <Chip icon={<Cancel sx={{ fontSize: "16px !important" }} />} label="REJECTED" color="error" size="small" sx={{ fontWeight: 700 }} />;
      case "pending":
      default:
        return <Chip icon={<PendingActions sx={{ fontSize: "16px !important" }} />} label="PENDING REVIEW" color="warning" size="small" sx={{ fontWeight: 700 }} />;
    }
  };

  return (
    <Box>
      {/* Header Banner */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: "primary.main", color: "primary.contrastText", borderRadius: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight="bold">Citizen Identity Verification (KYC)</Typography>
            <Typography variant="subtitle1" sx={{ mt: 0.5, opacity: 0.9 }}>
              Review, inspect identity documents, and approve citizenship verification for your municipality.
            </Typography>
          </Box>
          <Tooltip title="Refresh citizen verification queue">
            <Button
              variant="contained"
              color="inherit"
              size="small"
              startIcon={<Refresh />}
              onClick={fetchData}
              sx={{ color: "primary.main", bgcolor: "common.white", "&:hover": { bgcolor: "grey.100" } }}
            >
              Refresh
            </Button>
          </Tooltip>
        </Stack>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: 4, borderColor: "warning.main" }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>PENDING VERIFICATION</Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main" sx={{ mt: 0.5 }}>
                    {tabCounts.pending}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "warning.50", color: "warning.main", width: 44, height: 44 }}>
                  <PendingActions />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: 4, borderColor: "success.main" }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>VERIFIED CITIZENS</Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main" sx={{ mt: 0.5 }}>
                    {tabCounts.verified}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "success.50", color: "success.main", width: 44, height: 44 }}>
                  <CheckCircle />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: 4, borderColor: "error.main" }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>REJECTED REQUESTS</Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main" sx={{ mt: 0.5 }}>
                    {tabCounts.rejected}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "error.50", color: "error.main", width: 44, height: 44 }}>
                  <Cancel />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: 4, borderColor: "primary.main" }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>TOTAL CITIZENS</Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary.main" sx={{ mt: 0.5 }}>
                    {tabCounts.all}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "primary.50", color: "primary.main", width: 44, height: 44 }}>
                  <Person />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs & Search Container */}
      <Paper sx={{ mb: 3, borderRadius: 2, border: 1, borderColor: "divider" }} elevation={0}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, bgcolor: "background.paper" }}>
          <Tabs
            value={activeTab}
            onChange={(_, val: KycTabValue) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              value="pending"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Pending Review</span>
                  {tabCounts.pending > 0 && (
                    <Badge badgeContent={tabCounts.pending} color="warning" sx={{ "& .MuiBadge-badge": { fontSize: 10, height: 18, minWidth: 18 } }} />
                  )}
                </Stack>
              }
              sx={{ textTransform: "none", fontWeight: 600 }}
            />
            <Tab
              value="verified"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Verified Citizens</span>
                  {tabCounts.verified > 0 && (
                    <Badge badgeContent={tabCounts.verified} color="success" sx={{ "& .MuiBadge-badge": { fontSize: 10, height: 18, minWidth: 18 } }} />
                  )}
                </Stack>
              }
              sx={{ textTransform: "none", fontWeight: 600 }}
            />
            <Tab
              value="rejected"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Rejected</span>
                  {tabCounts.rejected > 0 && (
                    <Badge badgeContent={tabCounts.rejected} color="error" sx={{ "& .MuiBadge-badge": { fontSize: 10, height: 18, minWidth: 18 } }} />
                  )}
                </Stack>
              }
              sx={{ textTransform: "none", fontWeight: 600 }}
            />
            <Tab
              value="all"
              label={`All (${tabCounts.all})`}
              sx={{ textTransform: "none", fontWeight: 600 }}
            />
          </Tabs>
        </Box>

        {/* Search & ID Filter Bar */}
        <Box sx={{ p: 2, bgcolor: "grey.50" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search by Citizen Name, ID Number, Phone, or Address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ bgcolor: "background.paper", borderRadius: 1 }}
            />

            <Stack direction="row" spacing={1} alignItems="center">
              <FilterList fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" fontWeight={500} whiteSpace="nowrap">
                ID Type:
              </Typography>
              <TextField
                select
                size="small"
                value={idTypeFilter}
                onChange={(e) => setIdTypeFilter(e.target.value)}
                sx={{ minWidth: 150, bgcolor: "background.paper", borderRadius: 1 }}
                SelectProps={{ native: true }}
              >
                <option value="all">All Documents</option>
                <option value="citizenship">Citizenship</option>
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="voter_id">Voter ID</option>
                <option value="driving_license">Driving License</option>
              </TextField>

              {(searchQuery || idTypeFilter !== "all") && (
                <Button
                  size="small"
                  onClick={() => {
                    setSearchQuery("");
                    setIdTypeFilter("all");
                  }}
                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                >
                  Clear Filters
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* Main Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Citizen</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact & Address</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Document Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Document Number</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Submitted Date</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCitizens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" color="text.secondary" fontWeight={500} gutterBottom>
                      {activeTab === "pending"
                        ? "No pending citizen KYC verification requests at this time."
                        : activeTab === "verified"
                        ? "No verified citizens found."
                        : activeTab === "rejected"
                        ? "No rejected citizen applications found."
                        : "No citizen verification records match the selected criteria."}
                    </Typography>
                    {activeTab === "pending" && tabCounts.verified > 0 && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="success"
                        sx={{ mt: 1.5, textTransform: "none", fontWeight: 600 }}
                        onClick={() => setActiveTab("verified")}
                      >
                        View {tabCounts.verified} Verified Citizen{tabCounts.verified > 1 ? "s" : ""}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCitizens.map((c) => (
                  <TableRow key={c.id} hover sx={{ cursor: "pointer" }} onClick={() => handleOpenInspect(c)}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: "primary.main", color: "white", fontWeight: 700, width: 38, height: 38 }}>
                          {c.first_name?.[0]?.toUpperCase() || "C"}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {c.first_name} {c.middle_name ? `${c.middle_name} ` : ""}{c.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.profile?.email || "No email"}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {c.contact_number || c.profile?.phone || "No phone"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {c.current_address || c.permanent_address || "Address pending"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={(c.identity_type || "citizenship").toUpperCase()}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "primary.main" }}>
                        {c.identity_number || "-"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {getStatusChip(c.kyc_status)}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {c.registered_at || c.updated_at
                          ? new Date(c.registered_at || c.updated_at || "").toLocaleDateString()
                          : "-"}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title="Review citizen documents & verify">
                        <Button
                          size="small"
                          variant="contained"
                          color={c.kyc_status === "pending" ? "primary" : "inherit"}
                          startIcon={<FactCheck />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInspect(c);
                          }}
                          sx={{ textTransform: "none", borderRadius: 1.5, fontWeight: 600 }}
                        >
                          {c.kyc_status === "pending" ? "Review KYC" : "Inspect"}
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Comprehensive Inspection & Verification Dialog */}
      {selectedCitizen && (
        <Dialog
          open={inspectOpen}
          onClose={handleCloseInspect}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, maxHeight: "90vh" } }}
        >
          <DialogTitle sx={{ pb: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  MUNICIPAL CITIZEN VERIFICATION DOSSIER
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {selectedCitizen.first_name} {selectedCitizen.middle_name ? `${selectedCitizen.middle_name} ` : ""}{selectedCitizen.last_name}
                </Typography>
              </Box>
              {getStatusChip(selectedCitizen.kyc_status)}
            </Stack>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={3}>
              {/* Profile & Identity Details */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <BadgeOutlined color="primary" /> Official Citizen Identity Profile
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>FULL NAME</Typography>
                      <Typography variant="body1" fontWeight={700}>
                        {selectedCitizen.first_name} {selectedCitizen.middle_name || ""} {selectedCitizen.last_name}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>GENDER & DOB</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedCitizen.gender ? selectedCitizen.gender.toUpperCase() : "N/A"} • {selectedCitizen.date_of_birth || "N/A"}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>DOCUMENT TYPE & NUMBER</Typography>
                      <Typography variant="body1" fontWeight={700} color="primary.main" sx={{ fontFamily: "monospace" }}>
                        {(selectedCitizen.identity_type || "Citizenship").toUpperCase()} • {selectedCitizen.identity_number}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <LocationOn fontSize="small" sx={{ fontSize: 14 }} /> CURRENT CIVIC ADDRESS
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                        {selectedCitizen.current_address || "Not specified"}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <LocationOn fontSize="small" sx={{ fontSize: 14 }} /> PERMANENT REGISTERED ADDRESS
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                        {selectedCitizen.permanent_address || "Not specified"}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Phone fontSize="small" sx={{ fontSize: 14 }} /> CONTACT NUMBER
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                        {selectedCitizen.contact_number || selectedCitizen.profile?.phone || "No phone"}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Email fontSize="small" sx={{ fontSize: 14 }} /> ACCOUNT EMAIL
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                        {selectedCitizen.profile?.email || "No email"}
                      </Typography>
                    </Grid>
                  </Grid>

                  {selectedCitizen.kyc_rejection_reason && (
                    <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>
                      <strong>Rejection Reason:</strong> {selectedCitizen.kyc_rejection_reason}
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Document Images Side-by-Side */}
              <Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FactCheck color="primary" /> Uploaded Document Photos (Click to Zoom)
                </Typography>

                <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                  {/* Front Document */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "grey.50" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          1. Front Side Document Photo
                        </Typography>
                        {selectedCitizen.identity_front_image_url && (
                          <IconButton
                            size="small"
                            color="primary"
                            href={selectedCitizen.identity_front_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>

                      {selectedCitizen.identity_front_image_url ? (
                        <Box
                          onClick={() => setPreviewImageUrl(selectedCitizen.identity_front_image_url)}
                          sx={{
                            height: 220,
                            borderRadius: 1.5,
                            overflow: "hidden",
                            bgcolor: "grey.200",
                            cursor: "pointer",
                            position: "relative",
                            border: 1,
                            borderColor: "divider",
                            "&:hover .zoom-overlay": { opacity: 1 },
                          }}
                        >
                          <img
                            src={selectedCitizen.identity_front_image_url}
                            alt="Front Document"
                            style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000" }}
                          />
                          <Box
                            className="zoom-overlay"
                            sx={{
                              position: "absolute",
                              inset: 0,
                              bgcolor: "rgba(0,0,0,0.5)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              opacity: 0,
                              transition: "opacity 0.2s",
                              gap: 0.5,
                            }}
                          >
                            <ZoomIn />
                            <Typography variant="caption" fontWeight={700}>Click to Zoom</Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Box height={220} display="flex" alignItems="center" justifyContent="center" bgcolor="grey.100" borderRadius={1.5}>
                          <Typography variant="caption" color="text.secondary">No front image uploaded.</Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>

                  {/* Back Document */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "grey.50" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          2. Back Side Document Photo
                        </Typography>
                        {selectedCitizen.identity_back_image_url && (
                          <IconButton
                            size="small"
                            color="primary"
                            href={selectedCitizen.identity_back_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>

                      {selectedCitizen.identity_back_image_url ? (
                        <Box
                          onClick={() => setPreviewImageUrl(selectedCitizen.identity_back_image_url)}
                          sx={{
                            height: 220,
                            borderRadius: 1.5,
                            overflow: "hidden",
                            bgcolor: "grey.200",
                            cursor: "pointer",
                            position: "relative",
                            border: 1,
                            borderColor: "divider",
                            "&:hover .zoom-overlay": { opacity: 1 },
                          }}
                        >
                          <img
                            src={selectedCitizen.identity_back_image_url}
                            alt="Back Document"
                            style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000" }}
                          />
                          <Box
                            className="zoom-overlay"
                            sx={{
                              position: "absolute",
                              inset: 0,
                              bgcolor: "rgba(0,0,0,0.5)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              opacity: 0,
                              transition: "opacity 0.2s",
                              gap: 0.5,
                            }}
                          >
                            <ZoomIn />
                            <Typography variant="caption" fontWeight={700}>Click to Zoom</Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Box height={220} display="flex" alignItems="center" justifyContent="center" bgcolor="grey.100" borderRadius={1.5}>
                          <Typography variant="caption" color="text.secondary">No back image uploaded.</Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, bgcolor: "grey.50", borderTop: 1, borderColor: "divider" }}>
            <Button onClick={handleCloseInspect} disabled={submittingReview} sx={{ textTransform: "none" }}>
              Close
            </Button>

            {selectedCitizen.kyc_status !== "rejected" && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Cancel />}
                onClick={handleOpenRejectDialog}
                disabled={submittingReview}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Reject Verification
              </Button>
            )}

            {selectedCitizen.kyc_status !== "verified" && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={handleApprove}
                disabled={submittingReview}
                sx={{ textTransform: "none", fontWeight: 700, px: 3 }}
              >
                {submittingReview ? "Verifying..." : "Approve & Verify KYC"}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}

      {/* Rejection Reason Prompt Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "error.main" }}>
          Reject Citizen KYC Verification
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please state a specific reason for rejection. This message will be sent to the citizen so they can re-upload compliant identity documents.
          </Typography>

          {/* Quick preset templates */}
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
            {[
              "Blurry or unreadable document photo",
              "Document number does not match image",
              "Name mismatch between profile and ID",
              "Document expired or damaged",
              "Missing back side of identity card",
            ].map((preset) => (
              <Chip
                key={preset}
                label={preset}
                size="small"
                onClick={() => setRejectionReason(preset)}
                sx={{ mb: 1, cursor: "pointer" }}
              />
            ))}
          </Stack>

          <TextField
            multiline
            rows={3}
            fullWidth
            placeholder="e.g. The photo of your citizenship card is blurry. Please upload a clear, legible photo."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectDialogOpen(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmReject}
            disabled={submittingReview || !rejectionReason.trim()}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Zoom Modal */}
      <Dialog
        open={Boolean(previewImageUrl)}
        onClose={() => setPreviewImageUrl(null)}
        maxWidth="lg"
        PaperProps={{ sx: { bgcolor: "black", borderRadius: 2, overflow: "hidden" } }}
      >
        <Box sx={{ position: "relative", p: 1 }}>
          <img
            src={previewImageUrl || ""}
            alt="Enlarged preview"
            style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", display: "block", margin: "auto" }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={() => setPreviewImageUrl(null)}
            sx={{ position: "absolute", top: 12, right: 12, bgcolor: "rgba(0,0,0,0.6)", color: "white" }}
          >
            Close
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}
