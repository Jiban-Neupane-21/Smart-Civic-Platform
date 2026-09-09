import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Avatar,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import UndoIcon from "@mui/icons-material/Undo";
import StarIcon from "@mui/icons-material/Star";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import NavigationIcon from "@mui/icons-material/Navigation";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CategoryIcon from "@mui/icons-material/Category";
import BusinessIcon from "@mui/icons-material/Business";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import HomeIcon from "@mui/icons-material/Home";
import GroupIcon from "@mui/icons-material/Group";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { format, parseISO } from "date-fns";
import Swal from "sweetalert2";

import staffApi from "../../api/modules/staff.api";
import type { StaffTeamMembership } from "../../api/types";
import { IncidentLocationMap } from "../../components/IncidentLocationMap";

export const StaffComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<any | null>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<StaffTeamMembership[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Complete modal state
  const [openCompleteModal, setOpenCompleteModal] = useState<boolean>(false);
  const [resolutionNote, setResolutionNote] = useState<string>("");

  // Return to Dept modal state
  const [openReturnModal, setOpenReturnModal] = useState<boolean>(false);
  const [returnReason, setReturnReason] = useState<string>("");
  const [returnNote, setReturnNote] = useState<string>("");

  // Media preview lightbox state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [copiedTracking, setCopiedTracking] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [compRes, updRes, teamsRes] = await Promise.allSettled([
        staffApi.getComplaintDetail(id),
        staffApi.getComplaintUpdates(id),
        staffApi.getMyTeams(),
      ]);

      if (compRes.status === "fulfilled" && compRes.value?.success && compRes.value.data) {
        setComplaint(compRes.value.data);
      } else {
        throw new Error("Could not load grievance details");
      }

      if (updRes.status === "fulfilled" && updRes.value?.success && Array.isArray(updRes.value.data)) {
        setUpdates(updRes.value.data);
      }

      if (teamsRes.status === "fulfilled" && teamsRes.value?.success && Array.isArray(teamsRes.value.data)) {
        setMyTeams(teamsRes.value.data);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load grievance data"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine if current staff is leader in assigned team
  const isLeader =
    myTeams.some(
      (t) =>
        t.is_leader &&
        (t.team_id === complaint?.team_id || t.team_id === complaint?.current_team_id)
    ) ||
    myTeams.some((t) => t.is_leader);

  // Target identifier for lifecycle state transitions (complaint co_uid guarantees foreign key validity)
  const targetIdentifier = complaint?.co_uid || complaint?.assignment_id || id;

  // Copy helpers
  const handleCopyCoords = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleCopyTracking = (tid: string) => {
    navigator.clipboard.writeText(tid);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  // Action: Accept Assignment
  const handleAcceptAssignment = async () => {
    if (!targetIdentifier) return;
    setActionLoading(true);
    try {
      const res = await staffApi.acceptAssignment(targetIdentifier);
      if (res?.success) {
        Swal.fire({
          icon: "success",
          title: "Assignment Accepted",
          text: "You have accepted this field assignment.",
          timer: 1800,
          showConfirmButton: false,
        });
        loadData();
      } else {
        throw new Error(res?.message || "Failed to accept assignment");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Action Failed",
        text: err?.response?.data?.error || err?.message || "Could not accept ticket",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Start Field Work
  const handleStartWork = async () => {
    if (!targetIdentifier) return;
    setActionLoading(true);
    try {
      const res = await staffApi.startAssignment(targetIdentifier);
      if (res?.success) {
        Swal.fire({
          icon: "success",
          title: "Work Started",
          text: "Status updated to In Progress. Notifications sent to Department & Citizen.",
          timer: 2000,
          showConfirmButton: false,
        });
        loadData();
      } else {
        throw new Error(res?.message || "Failed to start field work");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Action Failed",
        text: err?.response?.data?.error || err?.message || "Could not start field work",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Complete & Resolve
  const handleCompleteWork = async () => {
    if (!targetIdentifier || !resolutionNote.trim()) return;
    setActionLoading(true);
    try {
      const res = await staffApi.completeAssignment(targetIdentifier, {
        note: resolutionNote.trim(),
        resolution_note: resolutionNote.trim(),
      });
      if (res?.success) {
        Swal.fire({
          icon: "success",
          title: "Work Completed & Resolved",
          text: "Resolution recorded. Citizen and Department Head have been notified to confirm.",
        });
        setOpenCompleteModal(false);
        setResolutionNote("");
        loadData();
      } else {
        throw new Error(res?.message || "Failed to complete assignment");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Resolution Failed",
        text: err?.response?.data?.error || err?.message || "Could not complete assignment",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Return to Department Head
  const handleReturnToDept = async () => {
    if (!targetIdentifier || !returnReason.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Reason Required",
        text: "Please provide a reason for returning this ticket to the Department Head.",
      });
      return;
    }
    setActionLoading(true);
    try {
      const res = await staffApi.returnAssignmentToDeptHead(targetIdentifier, {
        reason: returnReason.trim(),
        note: returnNote.trim() || undefined,
      });
      if (res?.success) {
        Swal.fire({
          icon: "success",
          title: "Returned to Department Head",
          text: "Ticket has been returned to the Department Head for reassignment.",
        });
        setOpenReturnModal(false);
        navigate("/staff/complaint");
      } else {
        throw new Error(res?.message || "Failed to return ticket");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Return Failed",
        text: err?.response?.data?.error || err?.message || "Could not return ticket",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return format(parseISO(dateStr), "MMM dd, yyyy • hh:mm a");
    } catch {
      return dateStr;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "pending":
        return <Chip label="Pending Acceptance" color="warning" sx={{ fontWeight: 700 }} />;
      case "assigned":
        return <Chip label="Assigned (Ready to Start)" color="info" sx={{ fontWeight: 700 }} />;
      case "in_progress":
        return <Chip label="In Progress" color="primary" sx={{ fontWeight: 700 }} />;
      case "resolved":
        return <Chip label="Resolved" color="success" sx={{ fontWeight: 700 }} />;
      case "closed":
        return <Chip label="Closed" color="default" sx={{ fontWeight: 700 }} />;
      case "reopened":
        return <Chip label="Reopened by Citizen" color="error" sx={{ fontWeight: 700 }} />;
      default:
        return <Chip label={status} sx={{ fontWeight: 700 }} />;
    }
  };

  const getSeverityChip = (severity?: string) => {
    switch (severity) {
      case "urgent":
        return <Chip label="URGENT SEVERITY" color="error" size="small" sx={{ fontWeight: 700 }} />;
      case "high":
        return <Chip label="HIGH SEVERITY" color="warning" size="small" sx={{ fontWeight: 700 }} />;
      case "medium":
        return <Chip label="MEDIUM SEVERITY" color="info" size="small" sx={{ fontWeight: 700 }} />;
      case "low":
        return <Chip label="LOW SEVERITY" color="default" size="small" sx={{ fontWeight: 700 }} />;
      default:
        return <Chip label={(severity || "MEDIUM").toUpperCase()} size="small" sx={{ fontWeight: 700 }} />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error || !complaint) {
    return (
      <Box sx={{ p: 4, maxWidth: 900, mx: "auto" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/staff/complaint")} sx={{ mb: 2 }}>
          Back to Assigned Complaints
        </Button>
        <Alert severity="error">{error || "Grievance record not found"}</Alert>
      </Box>
    );
  }

  const currentStatus = complaint.status;
  const incidentLoc = complaint.incident_location || {};
  const complainant = complaint.complainant || {};
  const teamMembers = complaint.team_members || [];
  const mediaList = complaint.media || [];

  const latitude = incidentLoc.latitude != null ? Number(incidentLoc.latitude) : (complaint.latitude != null ? Number(complaint.latitude) : null);
  const longitude = incidentLoc.longitude != null ? Number(incidentLoc.longitude) : (complaint.longitude != null ? Number(complaint.longitude) : null);
  const hasCoords = latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude);

  const wardNumber = incidentLoc.ward_number || complaint.ward_number;
  const municipalityName = incidentLoc.municipality_name || complaint.municipality?.official_name || "Municipality";
  const landmark = incidentLoc.landmark || null;
  const displayAddress = incidentLoc.display_address || complaint.address || "Field Location";

  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}`;

  // SLA calculation
  const isSlaBreached = complaint.sla_breached || (complaint.sla_due_at && new Date(complaint.sla_due_at) < new Date() && currentStatus !== "resolved" && currentStatus !== "closed");

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1360, mx: "auto" }}>
      {/* Top Header Navigation */}
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton
            onClick={() => navigate("/staff/complaint")}
            sx={{ border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h5" fontWeight={800}>
                Field Ticket #{complaint.tracking_id || complaint.co_uid?.slice(0, 8)}
              </Typography>
              {complaint.tracking_id && (
                <Tooltip title={copiedTracking ? "Copied!" : "Copy Tracking ID"}>
                  <IconButton size="small" onClick={() => handleCopyTracking(complaint.tracking_id)}>
                    <ContentCopyIcon fontSize="small" sx={{ color: copiedTracking ? "success.main" : "action.active" }} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Submitted on {formatDate(complaint.submitted_date)} • Category:{" "}
              <b>{complaint.category?.category_name || complaint.complaint_categories?.category_name || "General"}</b>
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {getSeverityChip(complaint.severity_level)}
          {getStatusChip(currentStatus)}
        </Stack>
      </Stack>

      {/* Field Crew Action Controls */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 4,
          borderRadius: 3,
          bgcolor: "primary.50",
          border: "1px solid",
          borderColor: "primary.light",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {isLeader && (
                <Chip
                  icon={<StarIcon sx={{ "&&": { color: "#b45309" } }} />}
                  label="Team Leader"
                  size="small"
                  sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700 }}
                />
              )}
              <Typography variant="subtitle1" fontWeight={800} color="primary.dark">
                Field Operations Action Bar
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Progress the grievance through resolution. Citizen and Department Head receive instant live tracking alerts.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            {/* Direct Google Maps Navigation Button right on top bar */}
            <Button
              variant="outlined"
              color="primary"
              startIcon={<NavigationIcon />}
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ fontWeight: 700 }}
            >
              Navigate to Site
            </Button>

            {/* Accept Button (if assigned but not accepted) */}
            {currentStatus === "assigned" && (
              <Button
                variant="contained"
                color="info"
                startIcon={<CheckCircleIcon />}
                onClick={handleAcceptAssignment}
                disabled={actionLoading}
                sx={{ fontWeight: 700 }}
              >
                Accept Task
              </Button>
            )}

            {/* Start Work Button */}
            {(currentStatus === "assigned" || currentStatus === "reopened") && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handleStartWork}
                disabled={actionLoading}
                sx={{ fontWeight: 700 }}
              >
                Start Field Work
              </Button>
            )}

            {/* Complete & Resolve Button */}
            {currentStatus === "in_progress" && (
              <Button
                variant="contained"
                color="success"
                startIcon={<DoneAllIcon />}
                onClick={() => setOpenCompleteModal(true)}
                disabled={actionLoading}
                sx={{ fontWeight: 700 }}
              >
                Complete & Mark Resolved
              </Button>
            )}

            {/* Return to Dept Head */}
            {currentStatus !== "resolved" && currentStatus !== "closed" && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<UndoIcon />}
                onClick={() => setOpenReturnModal(true)}
                disabled={actionLoading}
                sx={{ fontWeight: 700 }}
              >
                Return to Dept Head
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column (8 cols): Incident Location, Complaint Details, Media Gallery, Squad Roster */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            {/* 1. EXACT INCIDENT SITE / FIELD LOCATION CARD */}
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "2px solid",
                borderColor: hasCoords ? "error.main" : "primary.main",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  p: 2.5,
                  bgcolor: hasCoords ? "error.50" : "primary.50",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: "error.main", width: 40, height: 40 }}>
                      <LocationOnIcon sx={{ color: "white" }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={800} color="text.primary">
                        Exact Grievance Incident Site
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Field crew physical destination for on-site inspection and repair
                      </Typography>
                    </Box>
                  </Stack>

                  <Chip
                    label={
                      incidentLoc.source === "gps"
                        ? "📍 High-Precision GPS Pinned"
                        : incidentLoc.source === "registered_address"
                        ? "🏠 Reported at Citizen Address"
                        : "🗺️ Map / Ward Location"
                    }
                    color={incidentLoc.source === "gps" ? "error" : "primary"}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
              </Box>

              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                      FIELD INCIDENT DESTINATION
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.dark" sx={{ mt: 0.5 }}>
                      {displayAddress}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
                      {wardNumber && (
                        <Chip
                          label={`Ward No. ${wardNumber}`}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                      <Chip
                        label={municipalityName}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      {landmark && (
                        <Chip
                          label={`Landmark: ${landmark}`}
                          size="small"
                          variant="outlined"
                          color="info"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                    </Stack>

                    {hasCoords && (
                      <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: "grey.100", border: "1px dashed", borderColor: "grey.300" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                          GPS COORDINATES (LATITUDE, LONGITUDE)
                        </Typography>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                            {latitude.toFixed(6)}, {longitude.toFixed(6)}
                          </Typography>
                          <Button
                            size="small"
                            startIcon={<ContentCopyIcon fontSize="small" />}
                            onClick={() => handleCopyCoords(latitude, longitude)}
                            sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.2 }}
                          >
                            {copiedCoords ? "Copied!" : "Copy Coords"}
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Grid>

                  <Grid size={{ xs: 12, md: 5 }}>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: "grey.50", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        One-Click Navigation
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        Opens live Google Maps navigation with turn-by-turn driving directions to this exact site.
                      </Typography>
                      <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        size="large"
                        startIcon={<NavigationIcon />}
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ fontWeight: 800, textTransform: "none", py: 1.2, boxShadow: 3 }}
                      >
                        Navigate in Google Maps
                      </Button>
                    </Box>
                  </Grid>
                </Grid>

                {/* Interactive Leaflet Mini-Map Component */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: "block" }}>
                    INTERACTIVE INCIDENT SITE MAP PREVIEW
                  </Typography>
                  <IncidentLocationMap
                    latitude={latitude}
                    longitude={longitude}
                    displayAddress={displayAddress}
                    landmark={landmark}
                    wardNumber={wardNumber}
                    municipalityName={municipalityName}
                    height={320}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* 2. COMPLAINT OVERVIEW & DETAILS CARD */}
            <Card elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
                {complaint.title}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3, whiteSpace: "pre-line", lineHeight: 1.7 }}
              >
                {complaint.description}
              </Typography>

              {complaint.resolution_note && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Resolution Note Recorded:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {complaint.resolution_note}
                  </Typography>
                </Alert>
              )}

              {complaint.rejection_reason && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Return / Rejection Reason:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {complaint.rejection_reason}
                  </Typography>
                </Alert>
              )}

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <CategoryIcon color="action" fontSize="small" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Category
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {complaint.category?.category_name || complaint.complaint_categories?.category_name || "General"}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <BusinessIcon color="action" fontSize="small" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Department
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {complaint.department?.department_name || complaint.departments?.department_name || "Department"}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <AccessTimeIcon color="action" fontSize="small" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        SLA Due Deadline
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={isSlaBreached ? "error.main" : "text.primary"}
                      >
                        {formatDate(complaint.sla_due_at)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <WarningAmberIcon
                      color={isSlaBreached ? "error" : "action"}
                      fontSize="small"
                    />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        SLA Status
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={isSlaBreached ? "error.main" : "success.main"}
                      >
                        {isSlaBreached ? "⚠️ SLA BREACHED" : "✓ Within Target SLA"}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Card>

            {/* 3. ATTACHED EVIDENCE & MEDIA GALLERY CARD */}
            <Card elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                <PhotoCameraIcon color="primary" />
                <Typography variant="h6" fontWeight={800}>
                  Attached Evidence & Media Clips ({mediaList.length})
                </Typography>
              </Stack>

              {mediaList.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 4,
                    textAlign: "center",
                    bgcolor: "grey.50",
                    borderRadius: 2,
                  }}
                >
                  <PhotoCameraIcon sx={{ fontSize: 40, color: "text.secondary", opacity: 0.5, mb: 1 }} />
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                    No Media Clips or Photos Attached
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Complainant submitted this grievance without photo or video proof files.
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={2.5}>
                  {mediaList.map((media: any) => {
                    const isVideo =
                      media.media_type === "video" ||
                      media.media_type?.startsWith("video/") ||
                      /\.(mp4|webm|mov|3gp|mkv)$/i.test(media.file_url || "");

                    return (
                      <Grid size={{ xs: 12, sm: isVideo ? 12 : 6, md: isVideo ? 12 : 6 }} key={media.id || media.file_url}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 2.5,
                            bgcolor: "grey.50",
                            transition: "transform 0.2s",
                            "&:hover": { boxShadow: 2 },
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {isVideo ? <VideocamIcon color="primary" fontSize="small" /> : <PhotoCameraIcon color="primary" fontSize="small" />}
                              <Typography variant="caption" fontWeight={700} noWrap sx={{ maxWidth: 220 }}>
                                {media.file_name || (isVideo ? "Video Clip Proof" : "Photo Evidence")}
                              </Typography>
                            </Stack>
                            <Chip
                              label={isVideo ? "VIDEO CLIP" : "IMAGE"}
                              size="small"
                              color={isVideo ? "secondary" : "default"}
                              sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                            />
                          </Stack>

                          {isVideo ? (
                            <Box sx={{ borderRadius: 2, overflow: "hidden", bgcolor: "#000", mt: 1 }}>
                              <video
                                src={media.file_url}
                                controls
                                preload="metadata"
                                style={{ width: "100%", maxHeight: 320, display: "block" }}
                              >
                                Your browser does not support the video tag.
                              </video>
                            </Box>
                          ) : (
                            <Box
                              onClick={() => setPreviewImage(media.file_url)}
                              sx={{
                                height: 200,
                                borderRadius: 2,
                                overflow: "hidden",
                                bgcolor: "grey.200",
                                cursor: "pointer",
                                position: "relative",
                                "&:hover .zoom-overlay": { opacity: 1 },
                              }}
                            >
                              <img
                                src={media.file_url}
                                alt={media.file_name || "Complaint evidence"}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
                                }}
                              >
                                <Typography variant="button" fontWeight={700}>
                                  🔍 Click to Enlarge
                                </Typography>
                              </Box>
                            </Box>
                          )}

                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Uploaded: {formatDate(media.created_at)}
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<OpenInNewIcon fontSize="small" />}
                              href={media.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.2 }}
                            >
                              Open Full
                            </Button>
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Card>

            {/* 4. ASSIGNED SQUAD & TEAM MEMBERS CARD */}
            <Card elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <GroupIcon color="primary" />
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      Assigned Squad & Team Members ({teamMembers.length})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {complaint.current_team?.team_name || "Operational Field Squad"} •{" "}
                      {complaint.department?.department_name || "Municipal Department"}
                    </Typography>
                  </Box>
                </Stack>

                {complaint.current_team?.team_name && (
                  <Chip
                    label={complaint.current_team.team_name}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Stack>

              {teamMembers.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No individual squad members have been enumerated for this team assignment yet.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {teamMembers.map((member: any) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={member.id || member.staff_id}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2.5,
                          bgcolor: member.is_leader ? "warning.50" : "grey.50",
                          borderColor: member.is_leader ? "warning.main" : "divider",
                          borderWidth: member.is_leader ? 2 : 1,
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: member.is_leader ? "warning.main" : "primary.main",
                              width: 46,
                              height: 46,
                              fontWeight: 800,
                            }}
                          >
                            {(member.full_name || "S").charAt(0).toUpperCase()}
                          </Avatar>

                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body1" fontWeight={700} noWrap>
                                {member.full_name || "Field Officer"}
                              </Typography>
                              {member.is_leader && (
                                <Chip
                                  label="⭐ Team Leader"
                                  size="small"
                                  color="warning"
                                  sx={{ height: 20, fontSize: "0.68rem", fontWeight: 800 }}
                                />
                              )}
                            </Stack>

                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                              {member.designation || member.expertise || "Field Operations"}
                              {member.employee_id ? ` • ID: ${member.employee_id}` : ""}
                            </Typography>

                            <Stack direction="row" spacing={1.5} sx={{ mt: 0.8 }}>
                              {member.contact_number && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<PhoneIcon fontSize="small" />}
                                  href={`tel:${member.contact_number}`}
                                  sx={{
                                    textTransform: "none",
                                    fontSize: "0.72rem",
                                    py: 0.2,
                                    px: 1,
                                    borderRadius: 1.5,
                                    fontWeight: 700,
                                  }}
                                >
                                  {member.contact_number}
                                </Button>
                              )}
                              {member.email && (
                                <Button
                                  size="small"
                                  variant="text"
                                  color="inherit"
                                  startIcon={<EmailIcon fontSize="small" />}
                                  href={`mailto:${member.email}`}
                                  sx={{
                                    textTransform: "none",
                                    fontSize: "0.72rem",
                                    py: 0.2,
                                    px: 1,
                                  }}
                                >
                                  Email
                                </Button>
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Card>
          </Stack>
        </Grid>

        {/* Right Column (4 cols): Complainant Citizen Details, Operational Timeline */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            {/* COMPLAINANT CITIZEN PROFILE CARD */}
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <Box sx={{ p: 2.5, bgcolor: "grey.100", borderBottom: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                    <PersonIcon fontSize="small" sx={{ color: "white" }} />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>
                      Complainant Citizen
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Reporting citizen contact info & registered residence
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                  {complainant.name || complaint.citizen_name || "Citizen"}
                </Typography>

                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {complainant.phone || complaint.citizen_phone ? (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <PhoneIcon color="primary" fontSize="small" />
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Contact Phone
                        </Typography>
                        <Typography
                          variant="body2"
                          component="a"
                          href={`tel:${complainant.phone || complaint.citizen_phone}`}
                          sx={{ color: "primary.main", fontWeight: 700, textDecoration: "none", display: "block" }}
                        >
                          📞 {complainant.phone || complaint.citizen_phone}
                        </Typography>
                      </Box>
                    </Stack>
                  ) : null}

                  {complainant.email ? (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <EmailIcon color="primary" fontSize="small" />
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Email Address
                        </Typography>
                        <Typography
                          variant="body2"
                          component="a"
                          href={`mailto:${complainant.email}`}
                          sx={{ color: "text.primary", fontWeight: 600, textDecoration: "none", display: "block" }}
                        >
                          ✉️ {complainant.email}
                        </Typography>
                      </Box>
                    </Stack>
                  ) : null}
                </Stack>

                <Divider sx={{ my: 2.5 }} />

                {/* CITIZEN REGISTERED RESIDENTIAL ADDRESS (CLEARY LABELED SEPARATELY) */}
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: "amber.50", border: "1px solid", borderColor: "#fde68a" }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <HomeIcon sx={{ color: "#d97706" }} fontSize="small" />
                    <Typography variant="caption" fontWeight={800} color="#b45309">
                      CITIZEN REGISTERED HOME RESIDENCE
                    </Typography>
                  </Stack>

                  <Typography variant="body2" fontWeight={700} color="#92400e">
                    {complainant.registered_home_address ||
                      complaint.citizen?.current_address ||
                      complaint.citizen?.permanent_address ||
                      "Registered Residence on Record"}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="#b45309"
                    display="block"
                    sx={{ mt: 1, fontStyle: "italic", lineHeight: 1.4 }}
                  >
                    ⚠️ <b>Important Note for Field Staff:</b> This is the citizen's personal residential address. To reach the actual complaint incident, please navigate to the <b>Exact Grievance Incident Site</b> shown on the map!
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* OPERATIONAL TIMELINE CARD */}
            <Card elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <AccessTimeIcon color="primary" />
                <Typography variant="h6" fontWeight={800}>
                  Operational Timeline
                </Typography>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {updates.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                  No status transitions recorded yet.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {updates.map((upd: any, idx: number) => (
                    <Box
                      key={upd.id || idx}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: "grey.50",
                        borderLeft: "4px solid",
                        borderColor: "primary.main",
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                          {upd.to_status
                            ? upd.to_status.replace(/_/g, " ").toUpperCase()
                            : upd.new_status
                            ? upd.new_status.replace(/_/g, " ").toUpperCase()
                            : "UPDATE"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(upd.timestamp || upd.created_at)}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ mt: 0.5, color: "text.primary", fontWeight: 500 }}>
                        {upd.message || upd.update_text || upd.note || "Status updated"}
                      </Typography>
                      {upd.updated_by_name && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          By: {upd.updated_by_name} ({upd.updated_by_role || "Staff"})
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Complete & Resolve Modal */}
      <Dialog
        open={openCompleteModal}
        onClose={() => !actionLoading && setOpenCompleteModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Complete & Resolve Field Work</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Provide a clear summary note of the work done to resolve this grievance. This note will be visible to the Citizen and Department Head:
            </Typography>
            <TextField
              label="Resolution Note *"
              multiline
              rows={4}
              fullWidth
              required
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="E.g., Successfully repaired damaged water pipeline on Ward 4 main road. Water flow restored and tested."
              disabled={actionLoading}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCompleteModal(false)} disabled={actionLoading} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleCompleteWork}
            disabled={actionLoading || !resolutionNote.trim()}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <DoneAllIcon />}
            sx={{ fontWeight: 700 }}
          >
            {actionLoading ? "Submitting..." : "Complete & Mark Resolved"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return to Department Head Modal */}
      <Dialog
        open={openReturnModal}
        onClose={() => !actionLoading && setOpenReturnModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: "warning.dark" }}>
          Return Ticket to Department Head
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              This will unassign the ticket from your squad and return it to the Department Head queue with your stated reason.
            </Alert>
            <TextField
              label="Reason for Return *"
              fullWidth
              required
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="E.g., Requires heavy equipment / Outside squad jurisdiction"
              disabled={actionLoading}
            />
            <TextField
              label="Additional Notes"
              multiline
              rows={3}
              fullWidth
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="Provide any additional technical context..."
              disabled={actionLoading}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenReturnModal(false)} disabled={actionLoading} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleReturnToDept}
            disabled={actionLoading || !returnReason.trim()}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <UndoIcon />}
            sx={{ fontWeight: 700 }}
          >
            {actionLoading ? "Returning..." : "Return to Department Head"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Full Photo Lightbox Preview Modal */}
      <Dialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ p: 1, bgcolor: "#111", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 700 }}>
            Evidence Photo Preview
          </Typography>
          <IconButton onClick={() => setPreviewImage(null)} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 0, bgcolor: "#000", display: "flex", justifyContent: "center", alignItems: "center" }}>
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview full evidence"
              style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", display: "block" }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#111", p: 1.5, justifyContent: "space-between" }}>
          <Button
            size="small"
            startIcon={<OpenInNewIcon />}
            href={previewImage || "#"}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "grey.300", textTransform: "none" }}
          >
            Open in New Window
          </Button>
          <Button onClick={() => setPreviewImage(null)} sx={{ color: "white" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaffComplaintDetailPage;
