import React, { useEffect, useState, useCallback } from "react";
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
import { BASE_URL, fetchWithAuth } from "../../api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
  s_uid: string;
  employee_id: string | null;
  expertise: string | null;
  contact_number: string | null;
  gender: string | null;
  employee_status: string;
  profiles: {
    full_name: string;
    email: string;
    phone?: string;
  } | null;
}

interface StaffFormData {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  expertise: string;
  contact_number: string;
  employee_status: string;
  gender: string;
  date_of_birth: string;
  personal_address: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const emptyForm: StaffFormData = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  expertise: "",
  contact_number: "",
  employee_status: "active",
  gender: "",
  date_of_birth: "",
  personal_address: "",
};

const STATUS_COLOR: Record<string, "success" | "error" | "warning" | "default"> = {
  active: "success",
  inactive: "default",
  suspended: "error",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function normalizeStaffList(data: unknown): StaffMember[] {
  if (!data) return [];
  const d = data as Record<string, unknown>;
  const inner = (d?.data as Record<string, unknown>)?.roster
    ?? d?.data
    ?? data;
  return Array.isArray(inner) ? inner : [];
}

function generatePassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + digits + symbols;

  // Ensure at least one of each category
  let pw = "";
  pw += upper[Math.floor(Math.random() * upper.length)];
  pw += lower[Math.floor(Math.random() * lower.length)];
  pw += digits[Math.floor(Math.random() * digits.length)];
  pw += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = pw.length; i < 12; i++) {
    pw += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return pw
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManageStaff() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [filtered, setFiltered] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Department name for auto-expertise
  const [departmentName, setDepartmentName] = useState("");

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Success dialog after create
  const [successData, setSuccessData] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/department/staff-roster`);
      if (res.ok) {
        const data = await res.json();
        setStaffList(normalizeStaffList(data));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as Record<string, unknown>)?.error as string ||
            "Failed to load staff roster"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartmentName = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/department/dashboard`);
      if (res.ok) {
        const data = await res.json();
        const name = (data as Record<string, unknown>)?.data
          ? ((data as Record<string, unknown>).data as Record<string, unknown>)?.department_name as string
          : undefined;
        if (name) setDepartmentName(name);
      }
    } catch {
      // Silently fail — expertise just won't be auto-filled
    }
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchDepartmentName();
  }, [fetchStaff, fetchDepartmentName]);

  // ─── Client-side filtering ──────────────────────────────────────────────────

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      staffList.filter((s) => {
        const name = s.profiles?.full_name?.toLowerCase() ?? "";
        const email = s.profiles?.email?.toLowerCase() ?? "";
        const expertise = s.expertise?.toLowerCase() ?? "";
        return name.includes(q) || email.includes(q) || expertise.includes(q);
      })
    );
  }, [search, staffList]);

  // ─── Modal helpers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    setFormData({
      ...emptyForm,
      expertise: departmentName, // Auto-fill expertise with department name
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (staff: StaffMember) => {
    setEditTarget(staff);
    setFormData({
      full_name: staff.profiles?.full_name ?? "",
      email: staff.profiles?.email ?? "",
      password: "",
      phone: staff.profiles?.phone ?? "",
      expertise: staff.expertise ?? "",
      contact_number: staff.contact_number ?? "",
      employee_status: staff.employee_status ?? "active",
      gender: staff.gender ?? "",
      date_of_birth: "",
      personal_address: "",
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
        const body: Record<string, string> = {};
        if (formData.full_name) body.full_name = formData.full_name;
        if (formData.email) body.email = formData.email;
        if (formData.phone) body.phone = formData.phone;
        if (formData.expertise) body.expertise = formData.expertise;
        if (formData.contact_number) body.contact_number = formData.contact_number;
        if (formData.employee_status) body.employee_status = formData.employee_status;
        if (formData.gender) body.gender = formData.gender;
        if (formData.date_of_birth) body.date_of_birth = formData.date_of_birth;
        if (formData.personal_address) body.personal_address = formData.personal_address;

        const res = await fetchWithAuth(
          `${BASE_URL}/department/staff/${editTarget.s_uid}`,
          { method: "PATCH", body: JSON.stringify(body) }
        );
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (result as Record<string, unknown>)?.error as string || "Update failed"
          );
        }
      } else {
        if (!formData.full_name || !formData.email) {
          throw new Error("Name and email are required.");
        }

        // Generate a random password
        const generatedPassword = generatePassword();

        const body = {
          full_name: formData.full_name,
          email: formData.email,
          password: generatedPassword,
          expertise: departmentName,
        };

        const res = await fetchWithAuth(
          `${BASE_URL}/department/staff/create`,
          { method: "POST", body: JSON.stringify(body) }
        );
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (result as Record<string, unknown>)?.error as string || "Create failed"
          );
        }

        // Show success dialog with credentials
        setSuccessData({
          email: formData.email,
          password: generatedPassword,
        });
      }

      setModalOpen(false);
      await fetchStaff();
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
      const res = await fetchWithAuth(
        `${BASE_URL}/department/staff/${deleteTarget.s_uid}`,
        { method: "DELETE" }
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (result as Record<string, unknown>)?.error as string || "Delete failed"
        );
      }
      setStaffList((prev) => prev.filter((s) => s.s_uid !== deleteTarget.s_uid));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

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
              Add, edit, and manage your department's staff members
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

      {/* Search */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Search by name, email, or expertise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: { xs: "100%", sm: 360 } }}
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
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          {filtered.length} staff member{filtered.length !== 1 ? "s" : ""} found
        </Typography>
      </Stack>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: "primary.main" }}>
              <TableRow>
                {["Staff", "Email", "Employee ID", "Expertise", "Status", "Actions"].map((h) => (
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
                    key={s.s_uid}
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
                          {getInitials(s.profiles?.full_name)}
                        </Avatar>
                        <Typography fontWeight={600}>
                          {s.profiles?.full_name ?? "—"}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Email */}
                    <TableCell>{s.profiles?.email ?? "—"}</TableCell>

                    {/* Employee ID */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {s.employee_id ?? "—"}
                      </Typography>
                    </TableCell>

                    {/* Expertise */}
                    <TableCell>
                      {s.expertise ? (
                        <Chip label={s.expertise} size="small" variant="outlined" />
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Chip
                        label={s.employee_status ?? "—"}
                        color={STATUS_COLOR[s.employee_status ?? ""] ?? "default"}
                        size="small"
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton color="primary" size="small" onClick={() => openEdit(s)}>
                          <EditIcon fontSize="small" />
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
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />

            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            {/* ── Create mode: only expertise ── */}
            {!editTarget && (
              <TextField
                label="Expertise"
                fullWidth
                value={formData.expertise}
                InputProps={{ readOnly: true }}
                helperText={`Auto-filled from your department: ${departmentName || "N/A"}`}
              />
            )}

            {/* ── Edit mode: all fields ── */}
            {editTarget && (
              <>
                <TextField
                  label="Phone"
                  fullWidth
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />

                <TextField
                  label="Expertise"
                  fullWidth
                  value={formData.expertise}
                  onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                  helperText="Area of specialization"
                />

                <TextField
                  label="Contact Number"
                  fullWidth
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                />

                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={formData.employee_status}
                    onChange={(e) => setFormData({ ...formData, employee_status: e.target.value })}
                  >
                    {["active", "inactive", "suspended"].map((s) => (
                      <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    label="Gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Date of Birth"
                  type="date"
                  fullWidth
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <TextField
                  label="Personal Address"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.personal_address}
                  onChange={(e) => setFormData({ ...formData, personal_address: e.target.value })}
                />
              </>
            )}
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
            Are you sure you want to remove{" "}
            <strong>{deleteTarget?.profiles?.full_name ?? "this staff member"}</strong>?
            They will no longer be able to log in. This action cannot be undone.
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
            {deleting ? "Removing..." : "Remove Staff"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Success Dialog: credentials after creation ── */}
      <Dialog
        open={!!successData}
        onClose={() => setSuccessData(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "success.main" }}>
          Staff Account Created Successfully
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 3 }}>
            A new staff account has been created. Please securely share the following
            temporary credentials with the staff member:
          </Alert>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Login Email:</strong> {successData?.email}
            </Typography>
            <Typography variant="body2">
              <strong>Temporary Password:</strong> {successData?.password}
            </Typography>
          </Paper>
          <Typography variant="caption" color="error" sx={{ display: "block", mt: 2, fontWeight: "bold" }}>
            Warning: Make sure to copy this password now. It will not be shown again.
            The staff member will be required to change this password on first login.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSuccessData(null)} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
