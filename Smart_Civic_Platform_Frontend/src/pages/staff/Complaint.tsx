import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  MenuItem,
  Card,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { format, parseISO } from "date-fns";

import staffApi from "../../api/modules/staff.api";
import type { StaffAssignedComplaint } from "../../api/types";

export const StaffComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<StaffAssignedComplaint[]>([]);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await staffApi.getMyComplaints();
      if (res?.success && Array.isArray(res.data)) {
        setComplaints(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load assigned complaints & field work");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

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
        return <Chip label="Pending Acceptance" color="warning" size="small" />;
      case "assigned":
        return <Chip label="Assigned" color="info" size="small" />;
      case "in_progress":
        return <Chip label="In Progress" color="primary" size="small" />;
      case "resolved":
        return <Chip label="Resolved" color="success" size="small" />;
      case "closed":
        return <Chip label="Closed" color="default" size="small" />;
      case "reopened":
        return <Chip label="Reopened" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const filteredComplaints = complaints.filter((item) => {
    const matchesSearch =
      (item.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.tracking_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.team_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.category_name || "").toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "pending") return item.status === "assigned" || item.status === "pending";
    if (statusFilter === "in_progress") return item.status === "in_progress";
    if (statusFilter === "resolved") return item.status === "resolved" || item.status === "closed";
    return true;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
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
            Assigned Field Grievances & Squad Tasks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Grievances assigned by Department Head to your active squads. Click any row to view full details and transition lifecycle.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadComplaints}
          disabled={loading}
          size="small"
        >
          Refresh
        </Button>
      </Stack>

      {/* Filter Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search by tracking ID, title, team, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300, flex: 1 }}
          />

          <TextField
            select
            size="small"
            label="Filter Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All Grievances</MenuItem>
            <MenuItem value="pending">Pending / Assigned</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="resolved">Resolved / Closed</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {filteredComplaints.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: 3,
                border: "1px dashed",
                borderColor: "divider",
              }}
            >
              <ReportProblemIcon sx={{ fontSize: 54, color: "text.disabled", mb: 1.5 }} />
              <Typography variant="h6" fontWeight={600} color="text.secondary">
                No Assigned Grievances Found
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 450, mx: "auto", mt: 0.5 }}>
                When your Department Head assigns grievances to your squad, they will appear here ready for field action.
              </Typography>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Tracking ID / Title</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Assigned Squad</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Your Role</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Category / Severity</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Assigned Date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredComplaints.map((item) => (
                      <TableRow
                        key={item.assignment_id || item.complaint_id}
                        hover
                        onClick={() => navigate(`/staff/complaint/${item.complaint_id || item.assignment_id}`)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                            #{item.tracking_id}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {item.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {item.team_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.department_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {item.is_leader ? (
                            <Chip
                              icon={<StarIcon sx={{ "&&": { color: "#ffb300" } }} />}
                              label="Team Leader"
                              size="small"
                              sx={{ bgcolor: "rgba(255, 179, 0, 0.12)", color: "#b27b00", fontWeight: 700 }}
                            />
                          ) : (
                            <Chip label="Member" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.category_name}</Typography>
                          <Chip
                            label={item.severity_level?.toUpperCase()}
                            size="small"
                            color={item.severity_level === "urgent" ? "error" : "default"}
                            sx={{ height: 20, fontSize: "0.7rem", mt: 0.5 }}
                          />
                        </TableCell>
                        <TableCell>
                          {getStatusChip(item.status)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(item.assigned_at || item.submitted_date)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" endIcon={<ArrowForwardIcon />}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default StaffComplaintPage;
