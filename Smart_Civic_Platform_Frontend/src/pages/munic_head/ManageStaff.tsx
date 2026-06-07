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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  InputAdornment,
  Avatar,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
import LockResetIcon from "@mui/icons-material/LockReset";
import { useAuth } from "../../hooks/useAuth";
import { BASE_URL, fetchWithAuth } from "../../api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Department {
  id: string;
  name: string;
  code?: string;
}

interface Staff {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  department_id?: string;
  department?: { id: string; name: string };
  created_at?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ["staff", "department_head"];

const STATUS_COLOR: Record<string, "success" | "error" | "warning" | "default"> = {
  active: "success",
  inactive: "default",
  suspended: "error",
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "staff",
  departmentId: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function normalizeStaffList(data: unknown): Staff[] {
  if (!data) return [];
  // Handle: { data: { staff: [...] } } | { data: [...] } | [...]
  const d = data as Record<string, unknown>;
  const inner = (d?.data as Record<string, unknown>)?.staff
    ?? d?.data
    ?? data;
  return Array.isArray(inner) ? inner : [];
}

function normalizeDeptList(data: unknown): Department[] {
  if (!data) return [];
  const d = data as Record<string, unknown>;
  const inner = (d?.data as Record<string, unknown>)?.departments
    ?? d?.data
    ?? data;
  return Array.isArray(inner) ? inner : [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManageStaff() {
  const { user } = useAuth();
  const municipalityId =
    (user as Record<string, unknown>)?.municipalityId as string ||
    (user as Record<string, unknown>)?.municipality_id as string;

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [filtered, setFiltered] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status update dialog
  const [statusTarget, setStatusTarget] = useState<Staff | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchAll = async () => {
    if (!municipalityId) return;
    setLoading(true);
    setError(null);
    try {
      const [staffRes, deptRes] = await Promise.all([
        // GET /api/municipality/:municipalityId/staff
        fetchWithAuth(`${BASE_URL}/municipality/${municipalityId}/staff`),
        // GET /api/municipality/:municipalityId/departments
        fetchWithAuth(`${BASE_URL}/municipality/${municipalityId}/departments`),
      ]);

      if (staffRes.ok) {
        const data = await staffRes.json();
        setStaffList(normalizeStaffList(data));
      } else {
        const data = await staffRes.json().catch(() => ({}));
        setError((data as Record<string, unknown>)?.message as string || "Failed to load staff");
      }

      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(normalizeDeptList(data));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId]);

  // ─── Client-side filtering ──────────────────────────────────────────────────

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      staffList.filter(
        (s) =>
          ((s.name ?? "").toLowerCase().includes(q) ||
            (s.email ?? "").toLowerCase().includes(q)) &&
          (roleFilter === "all" || s.role === roleFilter)
      )
    );
  }, [search, roleFilter, staffList]);

  // ─── Modal helpers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (staff: Staff) => {
    setEditTarget(staff);
    setFormData({
      name: staff.name ?? "",
      email: staff.email ?? "",
      password: "",
      role: staff.role ?? "staff",
      departmentId: staff.department?.id ?? staff.department_id ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  // ─── Create / Edit submit ───────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const isEdit = !!editTarget;

      if (isEdit) {
        // PATCH /api/municipality/:municipalityId/staff/:staffId
        // via the municipality-scoped route in staff.routes.ts
        const body: Record<string, string> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          departmentId: formData.departmentId,
        };

        const res = await fetchWithAuth(
          `${BASE_URL}/municipality/${municipalityId}/staff/${editTarget!.id}`,
          { method: "PATCH", body: JSON.stringify(body) }
        );
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (result as Record<string, unknown>)?.message as string || "Update failed"
          );
        }
      } else {
        // POST /api/municipality/:municipalityId/staff
        // Required: name, email, password, role, departmentId
        const body = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          departmentId: formData.departmentId,
        };

        const res = await fetchWithAuth(
          `${BASE_URL}/municipality/${municipalityId}/staff`,
          { method: "POST", body: JSON.stringify(body) }
        );
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (result as Record<string, unknown>)?.message as string || "Create failed"
          );
        }
      }

      setModalOpen(false);
      await fetchAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // DELETE /api/municipality/:municipalityId/staff/:staffId
      const res = await fetchWithAuth(
        `${BASE_URL}/municipality/${municipalityId}/staff/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          (d as Record<string, unknown>)?.message as string || "Delete failed"
        );
      }
      setStaffList((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Status update ──────────────────────────────────────────────────────────

  const handleStatusUpdate = async () => {
    if (!statusTarget || !newStatus) return;
    setUpdatingStatus(true);
    try {
      // PATCH /api/municipality/:municipalityId/staff/:staffId/status
      // Body: { status }
      const res = await fetchWithAuth(
        `${BASE_URL}/municipality/${municipalityId}/staff/${statusTarget.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status: newStatus }) }
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (result as Record<string, unknown>)?.message as string || "Status update failed"
        );
      }
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === statusTarget.id ? { ...s, status: newStatus } : s
        )
      );
      setStatusTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ─── Reset password ─────────────────────────────────────────────────────────

  const handleResetPassword = async (staffId: string) => {
    try {
      // POST /api/municipality/:municipalityId/staff/:staffId/reset-password
      const res = await fetchWithAuth(
        `${BASE_URL}/municipality/${municipalityId}/staff/${staffId}/reset-password`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as Record<string, unknown>)?.message as string || "Reset failed"
        );
      }
      alert("Password reset successfully.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reset failed");
    }
  };

  // ─── Guard: no municipalityId ───────────────────────────────────────────────

  if (!municipalityId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">
          Municipality ID not found in your profile. Please contact your administrator.
        </Alert>
      </Box>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <PeopleIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Manage Staff
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add, update, and manage your municipality's staff
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}
        >
          Add Staff
        </Button>
      </Box>

      {/* Error banner */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: { xs: "100%", sm: 300 } }}
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
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Role</InputLabel>
          <Select
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <MenuItem value="all">All Roles</MenuItem>
            {ROLES.map((r) => (
              <MenuItem key={r} value={r} sx={{ textTransform: "capitalize" }}>
                {r.replace(/_/g, " ")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: "primary.main" }}>
              <TableRow>
                {["Staff", "Email", "Role", "Department", "Status", "Actions"].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 700 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No staff members found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow
                    key={s.id}
                    sx={{
                      "&:hover": { bgcolor: "#f5f8ff" },
                      "&:last-child td": { border: 0 },
                    }}
                  >
                    {/* Name + Avatar */}
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: "primary.light",
                            width: 36,
                            height: 36,
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {getInitials(s.name)}
                        </Avatar>
                        <Typography fontWeight={600}>{s.name ?? "—"}</Typography>
                      </Box>
                    </TableCell>

                    {/* Email */}
                    <TableCell>{s.email ?? "—"}</TableCell>

                    {/* Role */}
                    <TableCell>
                      <Chip
                        label={(s.role ?? "").replace(/_/g, " ") || "—"}
                        size="small"
                        color={s.role === "department_head" ? "primary" : "default"}
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>

                    {/* Department */}
                    <TableCell>{s.department?.name ?? "—"}</TableCell>

                    {/* Status — click to change */}
                    <TableCell>
                      <Chip
                        label={s.status ?? "—"}
                        color={STATUS_COLOR[s.status ?? ""] ?? "default"}
                        size="small"
                        onClick={() => {
                          setStatusTarget(s);
                          setNewStatus(s.status ?? "active");
                        }}
                        sx={{ textTransform: "capitalize", cursor: "pointer" }}
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton color="primary" size="small" onClick={() => openEdit(s)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <IconButton
                          color="warning"
                          size="small"
                          onClick={() => handleResetPassword(s.id)}
                        >
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => setDeleteTarget(s)}
                        >
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

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {editTarget ? "Edit Staff Member" : "Add New Staff Member"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {formError && (
              <Alert severity="error" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <TextField
              label="Full Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            {/* Password only on create */}
            {!editTarget && (
              <TextField
                label="Temporary Password"
                type="password"
                fullWidth
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                helperText="Staff must change this on first login"
              />
            )}

            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r} sx={{ textTransform: "capitalize" }}>
                    {r.replace(/_/g, " ")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Department</InputLabel>
              <Select
                label="Department"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              >
                {departments.length === 0 ? (
                  <MenuItem disabled value="">
                    No departments available
                  </MenuItem>
                ) : (
                  departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ fontWeight: 600 }}
            >
              {submitting ? "Saving..." : editTarget ? "Update Staff" : "Add Staff"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Delete Staff Member?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{deleteTarget?.name ?? "this staff member"}</strong>? This action cannot be
            undone.
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

      {/* ── Status Update Dialog ── */}
      <Dialog
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Update Staff Status</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Change status for <strong>{statusTarget?.name ?? "this staff member"}</strong>:
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {["active", "inactive", "suspended"].map((s) => (
                <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setStatusTarget(null)} disabled={updatingStatus}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleStatusUpdate}
            disabled={updatingStatus}
            sx={{ fontWeight: 600 }}
          >
            {updatingStatus ? "Updating..." : "Update Status"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
