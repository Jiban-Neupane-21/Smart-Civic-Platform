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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";
import { useAuth } from "../../hooks/useAuth";
import { BASE_URL, fetchWithAuth } from "../../api";

interface Department {
  id?: string;
  d_uid?: string;
  department_name: string;
  official_email?: string;
  head_name?: string;
  head_email?: string;
  is_active?: boolean;
  staff_count?: number;
  complaint_count?: number;
  created_at: string;
  department_category?: string;
}

const emptyForm = { 
  department_name: "", 
  official_email: "", 
  head_name: "", 
  head_email: "", 
  head_contact_no: "",
  department_category: "other",
};

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);

  // Credentials dialog for newly created department head
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/municipality/departments/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch department categories:", err);
    }
  };

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
    fetchCategories();
  }, [municipalityId]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      departments.filter(
        (d) =>
          (d.department_name ?? "").toLowerCase().includes(q) || 
          (d.official_email ?? "").toLowerCase().includes(q) ||
          (d.head_name ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, departments]);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    setFormData({ 
      department_name: dept.department_name || "", 
      official_email: dept.official_email || "", 
      head_name: dept.head_name || "",
      head_email: dept.head_email || "",
      head_contact_no: "",
      department_category: dept.department_category || "other",
    });
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.department_name) errors.department_name = "Department name is required";
    if (!formData.official_email) errors.official_email = "Official email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.official_email)) errors.official_email = "Invalid email format";
    if (!formData.head_name) errors.head_name = "Head name is required";
    if (!formData.head_email) errors.head_email = "Head email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.head_email)) errors.head_email = "Invalid email format";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const isEdit = !!editTarget;
      const targetId = editTarget ? (editTarget.d_uid || editTarget.id) : null;
      const url = isEdit
        ? `${BASE_URL}/municipality/${municipalityId}/departments/${targetId}`
        : `${BASE_URL}/municipality/${municipalityId}/departments`;
      const res = await fetchWithAuth(url, {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      console.log("ManageDept handleSubmit raw result:", result);
      if (!res.ok) throw new Error(result.error || result.message || "Operation failed");
      setModalOpen(false);
      await fetchDepartments();

      // If a new department head was created, show their credentials
      if (!isEdit && result.data && result.data.head_password) {
        setNewCredentials({
          email: formData.head_email,
          password: result.data.head_password
        });
      }
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
      const targetId = deleteTarget.d_uid || deleteTarget.id;
      const res = await fetchWithAuth(
        `${BASE_URL}/municipality/${municipalityId}/departments/${targetId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to delete department");
      }
      setDepartments((prev) => prev.filter((d) => (d.d_uid || d.id) !== targetId));
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
        placeholder="Search by name, email, or head name..."
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
                {["Department Name", "Official Email", "Head Name", "Staff Count", "Status", "Created", "Actions"].map(
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
                    key={dept.d_uid || dept.id}
                    sx={{ "&:hover": { bgcolor: "#f5f8ff" }, "&:last-child td": { border: 0 } }}
                  >
                    <TableCell>
                      <Typography fontWeight={600}>{dept.department_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{dept.official_email ?? "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{dept.head_name ?? "—"}</Typography>
                    </TableCell>
                    <TableCell>{dept.staff_count ?? "—"}</TableCell>
                    <TableCell>
                      <Chip
                        label={dept.is_active !== false ? "Active" : "Inactive"}
                        color={dept.is_active !== false ? "success" : "default"}
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
              value={formData.department_name}
              onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
              error={!!fieldErrors.department_name}
              helperText={fieldErrors.department_name}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }} required>
              <InputLabel id="department-category-label">Department Category</InputLabel>
              <Select
                labelId="department-category-label"
                label="Department Category"
                value={formData.department_category}
                onChange={(e) => setFormData({ ...formData, department_category: e.target.value })}
              >
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat
                        .split("_")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ")}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="other">Other</MenuItem>
                )}
              </Select>
            </FormControl>
            <TextField
              label="Official Email"
              type="email"
              fullWidth
              required
              value={formData.official_email}
              onChange={(e) => setFormData({ ...formData, official_email: e.target.value })}
              error={!!fieldErrors.official_email}
              helperText={fieldErrors.official_email}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Department Head Name"
              fullWidth
              required
              value={formData.head_name}
              onChange={(e) => setFormData({ ...formData, head_name: e.target.value })}
              error={!!fieldErrors.head_name}
              helperText={fieldErrors.head_name}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Department Head Email"
              type="email"
              fullWidth
              required
              value={formData.head_email}
              onChange={(e) => setFormData({ ...formData, head_email: e.target.value })}
              error={!!fieldErrors.head_email}
              helperText={fieldErrors.head_email}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Department Head Contact No."
              fullWidth
              value={formData.head_contact_no}
              onChange={(e) => setFormData({ ...formData, head_contact_no: e.target.value })}
              sx={{ mb: 2 }}
              helperText="Optional"
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
            <strong>{deleteTarget?.department_name}</strong>? This action cannot be undone.
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
      {/* New Credentials Dialog */}
      <Dialog open={!!newCredentials} onClose={() => setNewCredentials(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "success.main" }}>
          Department Created Successfully!
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            A new department head account has been provisioned. Please copy the credentials below and securely share them with the department head. They will be prompted to change their password upon first login.
          </Alert>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "#f9f9f9", borderRadius: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Login Email</Typography>
              <Typography variant="body1" fontWeight={600}>{newCredentials?.email}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Temporary Password</Typography>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
                <Typography variant="body1" fontWeight={600} sx={{ fontFamily: "monospace", letterSpacing: 1 }}>
                  {newCredentials?.password}
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => {
                    if (newCredentials?.password) {
                      navigator.clipboard.writeText(newCredentials.password);
                    }
                  }}
                >
                  Copy
                </Button>
              </Box>
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="contained" onClick={() => setNewCredentials(null)} sx={{ fontWeight: 600 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
