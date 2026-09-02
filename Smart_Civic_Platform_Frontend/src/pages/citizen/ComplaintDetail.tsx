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
  Rating,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CategoryIcon from "@mui/icons-material/Category";
import BusinessIcon from "@mui/icons-material/Business";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import GavelIcon from "@mui/icons-material/Gavel";
import { format, parseISO } from "date-fns";
import Swal from "sweetalert2";

import complaintsApi from "../../api/modules/complaints.api";
import type { Complaint, ComplaintUpdate } from "../../api/types/complaints.types";

export const CitizenComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [updates, setUpdates] = useState<ComplaintUpdate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Resolution modal (Confirm / Feedback)
  const [openFeedbackModal, setOpenFeedbackModal] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  // Escalate / Dispute modal (Reopen)
  const [openReopenModal, setOpenReopenModal] = useState<boolean>(false);
  const [reopenReason, setReopenReason] = useState<string>("");
  const [submittingReopen, setSubmittingReopen] = useState<boolean>(false);

  const loadComplaintDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [compRes, updRes] = await Promise.allSettled([
        complaintsApi.getComplaintById(id),
        complaintsApi.getComplaintUpdates(id),
      ]);

      if (compRes.status === "fulfilled" && compRes.value?.success && compRes.value.data) {
        setComplaint(compRes.value.data);
      } else {
        throw new Error("Failed to load complaint details");
      }

      if (updRes.status === "fulfilled" && updRes.value?.success && Array.isArray(updRes.value.data)) {
        setUpdates(updRes.value.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load complaint data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadComplaintDetails();
  }, [loadComplaintDetails]);

  // Handle Confirm Resolution & Submit Feedback
  const handleConfirmResolution = async () => {
    if (!id) return;
    setSubmittingFeedback(true);
    try {
      const res = await complaintsApi.submitFeedback(id, rating, feedbackComment);
      if (res?.success) {
        Swal.fire({
          icon: "success",
          title: "Resolution Confirmed",
          text: "Thank you for verifying and providing feedback on this grievance.",
          timer: 2000,
          showConfirmButton: false,
        });
        setOpenFeedbackModal(false);
        loadComplaintDetails();
      } else {
        throw new Error(res?.message || "Failed to submit feedback");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.response?.data?.message || err?.message || "Failed to confirm resolution",
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Handle Dispute / Escalate to Higher Authority
  const handleEscalateToHigherAuthority = async () => {
    if (!id || !reopenReason.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Reason Required",
        text: "Please provide a reason explaining why the issue is not resolved.",
      });
      return;
    }
    setSubmittingReopen(true);
    try {
      const res = await complaintsApi.reopenComplaint(id, reopenReason);
      if (res?.success) {
        Swal.fire({
          icon: "success",
          title: "Escalated to Higher Authority",
          text: "Your grievance has been reopened and forwarded to the Department Head & Municipality Head for intervention.",
        });
        setOpenReopenModal(false);
        setReopenReason("");
        loadComplaintDetails();
      } else {
        throw new Error(res?.message || "Failed to reopen complaint");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Escalation Failed",
        text: err?.response?.data?.message || err?.message || "Could not reopen grievance",
      });
    } finally {
      setSubmittingReopen(false);
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
        return <Chip label="Pending Triage" color="warning" />;
      case "assigned":
        return <Chip label="Assigned to Field Team" color="info" />;
      case "in_progress":
        return <Chip label="Work In Progress" color="primary" />;
      case "resolved":
        return <Chip label="Resolved (Awaiting Confirmation)" color="success" />;
      case "closed":
        return <Chip label="Verified & Closed" color="default" />;
      case "reopened":
        return <Chip label="Reopened / Under Review" color="error" />;
      case "escalated":
        return <Chip label="Escalated to Municipality" color="error" sx={{ bgcolor: "error.dark", color: "white" }} />;
      case "rejected":
        return <Chip label="Rejected" color="error" />;
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
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/citizen/complaints")} sx={{ mb: 2 }}>
          Back to My Complaints
        </Button>
        <Alert severity="error">{error || "Complaint ticket not found"}</Alert>
      </Box>
    );
  }

  const isResolved = complaint.status === "resolved";

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      {/* Top Bar */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate("/citizen/complaints")} sx={{ border: "1px solid", borderColor: "divider" }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Complaint #{complaint.tracking_id || complaint.co_uid?.slice(0, 8)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Submitted on {formatDate(complaint.submitted_date)}
          </Typography>
        </Box>
        <Box sx={{ ml: "auto !important" }}>
          {getStatusChip(complaint.status)}
        </Box>
      </Stack>

      {/* Action Banner for Resolved Grievance */}
      {isResolved && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            bgcolor: "success.50",
            border: "2px solid",
            borderColor: "success.main",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleIcon color="success" />
                <Typography variant="h6" fontWeight={700} color="success.dark">
                  Resolution Work Completed by Field Staff
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {complaint.resolution_note ? `Note: "${complaint.resolution_note}"` : "Please review the completed work. You can confirm and close this ticket, or dispute and escalate to Higher Authority."}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                color="success"
                startIcon={<ThumbUpIcon />}
                onClick={() => setOpenFeedbackModal(true)}
              >
                Confirm & Close
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<GavelIcon />}
                onClick={() => setOpenReopenModal(true)}
              >
                Dispute & Escalate
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Left Column: Complaint Details */}
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
                    <Typography variant="caption" color="text.secondary">Assigned Department</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {complaint.departments?.department_name || "Triage Pending"}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <ReportProblemIcon color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Severity</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {complaint.severity_level?.toUpperCase()}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <LocationOnIcon color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Location</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {complaint.address || "Municipality Ward Area"}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Right Column: Timeline of Updates */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <AccessTimeIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Live Status Timeline
              </Typography>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {updates.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                No status updates recorded yet.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {updates.map((upd, idx) => (
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
                        {upd.new_status ? upd.new_status.replace(/_/g, " ").toUpperCase() : "STATUS UPDATE"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(upd.created_at)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 0.5, color: "text.primary" }}>
                      {upd.update_text || upd.note || "Status updated"}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Confirm Resolution & Feedback Modal */}
      <Dialog open={openFeedbackModal} onClose={() => !submittingFeedback && setOpenFeedbackModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Resolution & Provide Feedback</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Please rate the promptness and quality of work delivered by the field team:
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Rating value={rating} onChange={(_, val) => setRating(val || 5)} size="large" />
              <Typography variant="body2" fontWeight={600}>{rating} / 5 Stars</Typography>
            </Box>

            <TextField
              label="Citizen Feedback / Comment (Optional)"
              multiline
              rows={3}
              fullWidth
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Share your experience or words of appreciation for the field crew..."
              disabled={submittingFeedback}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenFeedbackModal(false)} disabled={submittingFeedback} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmResolution}
            disabled={submittingFeedback}
            startIcon={submittingFeedback ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            {submittingFeedback ? "Confirming..." : "Confirm & Finalize"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispute & Escalate Modal */}
      <Dialog open={openReopenModal} onClose={() => !submittingReopen && setOpenReopenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "error.main" }}>
          Dispute Resolution & Escalate to Higher Authority
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              If the problem has not been resolved adequately, this will reopen the grievance ticket and immediately notify the <strong>Department Head</strong> and <strong>Municipality Head</strong> for administrative review.
            </Alert>

            <TextField
              label="Reason for Dispute / Escalation *"
              multiline
              rows={4}
              fullWidth
              required
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Explain clearly why this issue is not resolved or what work remains incomplete..."
              disabled={submittingReopen}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenReopenModal(false)} disabled={submittingReopen} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEscalateToHigherAuthority}
            disabled={submittingReopen || !reopenReason.trim()}
            startIcon={submittingReopen ? <CircularProgress size={16} /> : <GavelIcon />}
          >
            {submittingReopen ? "Escalating..." : "Submit Escalation"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CitizenComplaintDetailPage;
