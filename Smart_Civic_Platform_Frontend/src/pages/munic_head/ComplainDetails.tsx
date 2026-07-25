import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AssignmentIcon from "@mui/icons-material/Assignment";
import FilterListIcon from "@mui/icons-material/FilterList";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useAuth } from "../../hooks/useAuth";
import { BASE_URL, fetchWithAuth } from "../../api";

interface Complaint {
  co_uid: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority?: string;
  citizen_id?: string;
  department_id?: string;
  department?: { id: string; name: string };
  created_at: string;
  updated_at: string;
}

interface Department {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ["pending", "in_progress", "resolved", "closed"];
const STATUS_COLOR: Record<string, "default" | "warning" | "info" | "success" | "error"> = {
  pending: "warning",
  in_progress: "info",
  resolved: "success",
  closed: "default",
};

export default function ComplainDetails() {
  const { user } = useAuth();
  const municipalityId = (user as any)?.municipalityId || (user as any)?.municipality_id;

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filtered, setFiltered] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View/Update Dialog
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [updatedStatus, setUpdatedStatus] = useState("");
  const [updatedDept, setUpdatedDept] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!municipalityId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (deptFilter !== "all") params.set("departmentId", deptFilter);

      const [complaintsRes, deptRes] = await Promise.all([
        fetchWithAuth(
          `${BASE_URL}/municipality/${municipalityId}/complaints?${params.toString()}`
        ),
        fetchWithAuth(`${BASE_URL}/municipality/${municipalityId}/departments`),
      ]);

      if (complaintsRes.ok) {
        const d = await complaintsRes.json();
        const arr = d?.data?.complaints ?? d?.data ?? d ?? [];
        setComplaints(Array.isArray(arr) ? arr : []);
      } else {
        const d = await complaintsRes.json();
        throw new Error(d.message || "Failed to fetch complaints");
      }
      if (deptRes.ok) {
        const d = await deptRes.json();
        const arr = d?.data?.departments ?? d?.data ?? d ?? [];
        setDepartments(Array.isArray(arr) ? arr : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [municipalityId, statusFilter, deptFilter]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      complaints.filter(
        (c) =>
          (c.title ?? "").toLowerCase().includes(q) ||
          (c.category ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, complaints]);

  const openDetail = (c: Complaint) => {
    setSelected(c);
    setUpdatedStatus(c.status);
    setUpdatedDept(c.department?.id ?? c.department_id ?? "");
    setSaveError(null);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      const body: Record<string, string> = { status: updatedStatus };
      if (updatedDept) body.departmentId = updatedDept;

      const res = await fetchWithAuth(
        `${BASE_URL}/municipality/${municipalityId}/complaints/${selected.co_uid}`,
        { method: "PATCH", body: JSON.stringify(body) }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Update failed");

      setComplaints((prev) =>
        prev.map((c) =>
          c.co_uid === selected.co_uid
            ? { ...c, status: updatedStatus, department_id: updatedDept }
            : c
        )
      );
      setSelected(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!municipalityId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">Municipality ID not found in profile.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <AssignmentIcon sx={{ color: "primary.main", fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Complaint Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review, assign, and update status of all complaints
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Search complaints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: { xs: "100%", sm: 280 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            startAdornment={<FilterListIcon fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} />}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                {s.replace("_", " ")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Department</InputLabel>
          <Select
            label="Department"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <MenuItem value="all">All Departments</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: "primary.main" }}>
              <TableRow>
                {["Title", "Category", "Department", "Status", "Submitted", "Actions"].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 700 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>
                    No complaints found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.co_uid} sx={{ "&:hover": { bgcolor: "#f5f8ff" }, "&:last-child td": { border: 0 } }}>
                    <TableCell>
                      <Typography fontWeight={600} noWrap sx={{ maxWidth: 220 }}>
                        {c.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={c.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{c.department?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Chip
                        label={c.status.replace("_", " ")}
                        color={STATUS_COLOR[c.status] ?? "default"}
                        size="small"
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View & Update">
                        <IconButton color="primary" size="small" onClick={() => openDetail(c)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Detail/Update Dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Complaint Details</DialogTitle>
        <DialogContent>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
          {selected && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                TITLE
              </Typography>
              <Typography variant="body1" fontWeight={600} gutterBottom>
                {selected.title}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                DESCRIPTION
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
                {selected.description}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {selected.category}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Submitted
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(selected.created_at).toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Update Status</InputLabel>
                <Select
                  label="Update Status"
                  value={updatedStatus}
                  onChange={(e) => setUpdatedStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                      {s.replace("_", " ")}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Assign to Department</InputLabel>
                <Select
                  label="Assign to Department"
                  value={updatedDept}
                  onChange={(e) => setUpdatedDept(e.target.value)}
                >
                  <MenuItem value="">— Not Assigned —</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSelected(null)} disabled={saving}>
            Close
          </Button>
          <Button variant="contained" onClick={handleUpdate} disabled={saving} sx={{ fontWeight: 600 }}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
