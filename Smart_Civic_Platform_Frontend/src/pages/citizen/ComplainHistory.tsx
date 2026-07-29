import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import { Search, Refresh } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { complaintsApi } from "../../api/modules/complaints.api";
import type { ComplaintHistoryResponse } from "../../api/types/complaints.types";

const ALL_STATUSES = "All";

const STATUS_OPTIONS = [
  { value: "pending", label: "⏳ Pending" },
  { value: "assigned", label: "👤 Assigned" },
  { value: "under_review", label: "🔍 Under Review" },
  { value: "in_progress", label: "🛠 In Progress" },
  { value: "resolved", label: "✅ Resolved" },
  { value: "rejected", label: "❌ Rejected" },
  { value: "closed", label: "🔒 Closed" },
  { value: "escalated", label: "🚨 Escalated" },
  { value: "reopened", label: "🔄 Reopened" },
  { value: "cross_dept_pending", label: "🤝 Multi-Department" },
];

export const ComplaintReport: React.FC = () => {
  const navigate = useNavigate();
  
  const [complaints, setComplaints] = useState<ComplaintHistoryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      // If "All" is selected, pass undefined to API
      const statusParam = statusFilter === ALL_STATUSES ? undefined : statusFilter;
      const res = await complaintsApi.getMyComplaints(statusParam);
      if (res.success && res.data) {
        setComplaints(res.data);
      } else {
        throw new Error((res as any).message || "Failed to fetch complaints");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const getStatusChipProps = (status: string): { color: any; label: string; sx?: any } => {
    switch (status) {
      case "pending": return { color: "warning", label: "Pending" };
      case "assigned": return { color: "info", label: "Assigned" };
      case "under_review": return { color: "info", label: "Under Review", sx: { bgcolor: "info.light" } };
      case "in_progress": return { color: "primary", label: "In Progress" };
      case "resolved": return { color: "success", label: "Resolved" };
      case "rejected": return { color: "error", label: "Rejected" };
      case "closed": return { color: "default", label: "Closed" };
      case "escalated": return { color: "error", label: "Escalated", sx: { bgcolor: "error.dark", color: "white" } };
      case "reopened": return { color: "warning", label: "Reopened" };
      case "cross_dept_pending": return { color: "secondary", label: "Multi-Dept", sx: { bgcolor: "secondary.main", color: "white" } };
      default: return { color: "default", label: status };
    }
  };

  const getSeverityChipProps = (severity: string): { color: any; variant?: any; sx?: any } => {
    switch (severity) {
      case "low": return { color: "success", variant: "outlined" };
      case "medium": return { color: "warning" };
      case "high": return { color: "error" };
      case "urgent": return { color: "error", sx: { bgcolor: "error.dark", color: "white" } };
      default: return { color: "default" };
    }
  };

  const isOverdue = (dateString: string, status: string) => {
    if (["resolved", "closed", "rejected"].includes(status)) return false;
    const submittedDate = new Date(dateString);
    const now = new Date();
    const diffDays = (now.getTime() - submittedDate.getTime()) / (1000 * 3600 * 24);
    return diffDays > 5;
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(term) ||
        item.tracking_id.toLowerCase().includes(term)
      );
    });
  }, [complaints, searchTerm]);

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Your Complaint History
      </Typography>

      {/* Filter Toolbar */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap" justifyContent="space-between">
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search Tracking ID or Title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value={ALL_STATUSES}>All Statuses</MenuItem>
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<Refresh />} 
          onClick={fetchComplaints}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={fetchComplaints}>Retry</Button>
        }>
          {error}
        </Alert>
      )}

      {/* Complaints Table */}
      <TableContainer
        component={Paper}
        sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      >
        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Tracking ID</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Issue Title</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Category / Dept</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Submitted Date</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredComplaints.length > 0 ? (
              filteredComplaints.map((row) => (
                <TableRow 
                  key={row.co_uid} 
                  hover 
                  onClick={() => navigate(`/citizen/complaints/${row.co_uid}`)}
                  sx={{ cursor: "pointer", "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell sx={{ fontWeight: "medium", color: "primary.main", fontFamily: "monospace" }}>
                    {row.tracking_id}
                  </TableCell>
                  <TableCell>
                    {row.title.length > 60 ? row.title.substring(0, 60) + '...' : row.title}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.complaint_categories?.category_name || "Unknown"}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {row.departments?.department_name || "Unassigned"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.severity_level.toUpperCase()}
                      size="small"
                      {...getSeverityChipProps(row.severity_level)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(row.submitted_date).toLocaleDateString()}
                    </Typography>
                    {isOverdue(row.submitted_date, row.status) && (
                      <Chip label="⏰ Overdue" color="error" size="small" sx={{ mt: 0.5, height: 20, fontSize: "0.65rem" }} />
                    )}
                    {["resolved", "closed"].includes(row.status) && row.resolution_date && (
                      <Typography variant="caption" display="block" color="success.main">
                        Resolved: {new Date(row.resolution_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      {...getStatusChipProps(row.status)}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography color="textSecondary" mb={2}>
                    No complaints found matching your criteria.
                  </Typography>
                  <Button variant="contained" onClick={() => navigate("/citizen/submit-complaint")}>
                    Submit a Complaint
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
