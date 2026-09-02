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
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import UndoIcon from "@mui/icons-material/Undo";
import StarIcon from "@mui/icons-material/Star";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CategoryIcon from "@mui/icons-material/Category";
import BusinessIcon from "@mui/icons-material/Business";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import { format, parseISO } from "date-fns";
import Swal from "sweetalert2";

import staffApi from "../../api/modules/staff.api";
import type { Complaint, ComplaintUpdate } from "../../api/types/complaints.types";
import type { StaffTeamMembership } from "../../api/types";

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
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to load grievance data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine if staff is team leader
  const isLeader = myTeams.some((t) => t.is_leader);

  // Target assignment identifier for state transitions
  const targetAssignmentId = complaint?.assignment_id || id;

  // Action: Accept Assignment
  const handleAcceptAssignment = async () => {
    if (!targetAssignmentId) return;
    setActionLoading(true);
    try {
      const res = await staffApi.acceptAssignment(targetAssignmentId);
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
    if (!targetAssignmentId) return;
    setActionLoading(true);
    try {
      const res = await staffApi.startAssignment(targetAssignmentId);
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
    if (!targetAssignmentId) return;
    setActionLoading(true);
    try {
      const res = await staffApi.completeAssignment(targetAssignmentId);
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
    if (!targetAssignmentId || !returnReason.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Reason Required",
        text: "Please provide a reason for returning this ticket to the Department Head.",
      });
      return;
    }
    setActionLoading(true);
    try {
      const res = await staffApi.returnAssignmentToDeptHead(targetAssignmentId, {
        reason: returnReason,
        note: returnNote,
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
        return <Chip label="Pending Acceptance" color="warning" />;
      case "assigned":
        return <Chip label="Assigned (Ready to Start)" color="info" />;
      case "in_progress":
        return <Chip label="In Progress" color="primary" />;
      case "resolved":
        return <Chip label="Resolved" color="success" />;
      case "closed":
        return <Chip label="Closed" color="default" />;
      case "reopened":
        return <Chip label="Reopened by Citizen" color="error" />;
      default:
        return <Chip label={status} />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !complaint) {
    return (
      <Box sx={{ p: 4, maxWidth: 900, mx: "auto" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/staff/complaint")} sx={{ mb: 2 }}>
          Back to Complaints
        </Button>
        <Alert severity="error">{error || "Grievance record not found"}</Alert>
      </Box>
    );
  }

  const currentStatus = complaint.status;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1300, mx: "auto" }}>
      {/* Top Navigation */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate("/staff/complaint")} sx={{ border: "1px solid", borderColor: "divider" }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Field Operation #{complaint.tracking_id || complaint.co_uid?.slice(0, 8)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Submitted on {formatDate(complaint.submitted_date)}
          </Typography>
        </Box>
        <Box sx={{ ml: "auto !important" }}>
          {getStatusChip(currentStatus)}
        </Box>
      </Stack>

      {/* Team Leader Action Panel */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          bgcolor: "linear-gradient(135deg, rgba(25, 118, 210, 0.08) 0%, rgba(25, 118, 210, 0.02) 100%)",
          border: "1px solid",
          borderColor: "primary.light",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {isLeader && (
                <Chip
                  icon={<StarIcon sx={{ "&&": { color: "#ffb300" } }} />}
                  label="Team Leader"
                  size="small"
                  sx={{ bgcolor: "rgba(255, 179, 0, 0.15)", color: "#b27b00", fontWeight: 700 }}
                />
              )}
              <Typography variant="h6" fontWeight={700}>
                Field Crew Action Controls
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Progress this grievance through the lifecycle. Status transitions notify the Department Head & Citizen automatically.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            {/* Accept Button (if assigned but not accepted yet) */}
            {currentStatus === "assigned" && (
              <Button
                variant="contained"
                color="info"
                startIcon={<CheckCircleIcon />}
                onClick={handleAcceptAssignment}
                disabled={actionLoading}
              >
                Accept Task
              </Button>
            )}

            {/* Start Button */}
            {(currentStatus === "assigned" || currentStatus === "reopened") && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handleStartWork}
                disabled={actionLoading}
              >
                Start Field Work
              </Button>
            )}

            {/* Complete Button */}
            {currentStatus === "in_progress" && (
              <Button
                variant="contained"
                color="success"
                startIcon={<DoneAllIcon />}
                onClick={() => setOpenCompleteModal(true)}
                disabled={actionLoading}
              >
                Complete & Resolve
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
              >
                Return to Dept
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column: Complaint Information */}
        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", mb: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              {complaint.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, whiteSpace: "pre-line" }}>
              {complaint.description}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CategoryIcon color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Category</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {complaint.complaint_categories?.category_name || "General"}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <BusinessIcon color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Department</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {complaint.departments?.department_name || "Assigned Department"}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <LocationOnIcon color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Location / Address</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {complaint.address || "Field Location"}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <AccessTimeIcon color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Severity Level</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {complaint.severity_level?.toUpperCase()}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              {complaint.citizen && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <PersonIcon color="action" fontSize="small" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Citizen Name</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {complaint.citizen.full_name || "Citizen"}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <PhoneIcon color="action" fontSize="small" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Citizen Phone</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {complaint.citizen.phone || "—"}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                </>
              )}
            </Grid>
          </Card>
        </Grid>

        {/* Right Column: Timeline */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <AccessTimeIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
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
                      bgcolor: "action.hover",
                      borderLeft: "4px solid",
                      borderColor: "primary.main",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" fontWeight={700}>
                        {upd.to_status ? upd.to_status.replace(/_/g, " ").toUpperCase() : (upd.new_status ? upd.new_status.replace(/_/g, " ").toUpperCase() : "UPDATE")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(upd.timestamp || upd.created_at)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 0.5, color: "text.primary" }}>
                      {upd.message || upd.update_text || upd.note || "Status updated"}
                    </Typography>
                    {upd.updated_by_name && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        By: {upd.updated_by_name} ({upd.updated_by_role})
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Complete & Resolve Modal */}
      <Dialog open={openCompleteModal} onClose={() => !actionLoading && setOpenCompleteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Complete & Resolve Field Work</DialogTitle>
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
              placeholder="E.g., Repaired damaged water pipeline on Ward 4 main road. Water flow restored and tested successfully."
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
          >
            {actionLoading ? "Submitting..." : "Complete & Mark Resolved"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return to Department Head Modal */}
      <Dialog open={openReturnModal} onClose={() => !actionLoading && setOpenReturnModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "warning.dark" }}>
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
              placeholder="E.g., Requires heavy equipment / Outside team jurisdiction"
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
          >
            {actionLoading ? "Returning..." : "Return to Department Head"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaffComplaintDetailPage;
