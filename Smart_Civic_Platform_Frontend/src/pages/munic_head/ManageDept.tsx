import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";
import { useAuth } from "../../hooks/useAuth";
import { BASE_URL, fetchWithAuth } from "../../api";

interface Department {
  id: string;
  name: string;
  code: string;
  status?: string;
  staff_count?: number;
  complaint_count?: number;
  created_at: string;
}

const emptyForm = { name: "", code: "", description: "" };

export default function ManageDept() {
  const { user } = useAuth();
  const municipalityId = (user as any)?.municipalityId || (user as any)?.municipality_id;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [filtered, setFiltered] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDepartments = async () => {
    if (!municipalityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/municipality/${municipalityId}/departments`
      );
      if (!res.ok) throw new Error("Failed to fetch departments");
      const data = await res.json();
      const arr = data?.data?.departments ?? data?.data ?? data ?? [];
      setDepartments(Array.isArray(arr) ? arr : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [municipalityId]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      departments.filter(
        (d) =>
          (d.name ?? "").toLowerCase().includes(q) || (d.code ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, departments]);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    setFormData({ name: dept.name, code: dept.code, description: "" });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const isEdit = !!editTarget;
      const url = isEdit
        ? `${BASE_URL}/municipality/${municipalityId}/departments/${editTarget!.id}`
        : `${BASE_URL}/municipality/${municipalityId}/departments`;
      const res = await fetchWithAuth(url, {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Operation failed");
      setModalOpen(false);
      await fetchDepartments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/municipality/${municipalityId}/departments/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to delete department");
      }
      setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <BusinessIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Manage Departments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create and manage departments in your municipality
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}
        >
          Add Department
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <TextField
        placeholder="Search by name or code..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 3, width: { xs: "100%", sm: 320 } }}
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

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ bgcolor: "primary.main" }}>
              <TableRow>
                {["Department Name", "Code", "Staff Count", "Status", "Created", "Actions"].map(
                  (h) => (
                    <TableCell key={h} sx={{ color: "#fff", fontWeight: 700 }}>
                      {h}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>
                    No departments found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((dept) => (
                  <TableRow
                    key={dept.id}
                    sx={{ "&:hover": { bgcolor: "#f5f8ff" }, "&:last-child td": { border: 0 } }}
                  >
                    <TableCell>
                      <Typography fontWeight={600}>{dept.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={dept.code} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{dept.staff_count ?? "—"}</TableCell>
                    <TableCell>
                      <Chip
                        label={dept.status ?? "Active"}
                        color={dept.status === "inactive" ? "default" : "success"}
                        size="small"
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(dept.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton color="primary" size="small" onClick={() => openEdit(dept)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" size="small" onClick={() => setDeleteTarget(dept)}>
                          <DeleteIcon fontSize="small" />
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

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? "Edit Department" : "Add New Department"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <TextField
              label="Department Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Department Code"
              fullWidth
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              helperText="Short identifier, e.g. WATER, ROAD, HEALTH"
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting} sx={{ fontWeight: 600 }}>
              {submitting ? "Saving..." : editTarget ? "Update" : "Create Department"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Delete Department?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ fontWeight: 600 }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
