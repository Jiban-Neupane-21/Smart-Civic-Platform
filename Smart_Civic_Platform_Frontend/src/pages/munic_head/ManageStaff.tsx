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
  Divider,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
import LockResetIcon from "@mui/icons-material/LockReset";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import { useAuth } from "../../hooks/useAuth";
import { BASE_URL, fetchWithAuth, municipalityApi } from "../../api";
import type { UpdateStaffDto, CreateStaffUserDto } from "../../api/types/municipality.types";
import Swal from "sweetalert2";

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
  phone?: string;
  role?: string;
  status?: string;
  department_id?: string;
  department?: { id: string; name: string };
  created_at?: string;
  employee_id?: string | null;
  expertise?: string | null;
  designation?: string | null;
  contact_number?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  personal_address?: string | null;
  kyc_status?: string | null;
  kyc_submitted_at?: string | null;
  kyc_verified_at?: string | null;
  kyc_rejection_reason?: string | null;
  identity_type?: string | null;
  identity_number?: string | null;
  identity_front_url?: string | null;
  identity_back_url?: string | null;
  appointment_letter_url?: string | null;
  photo_url?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

interface RawStaffItem {
  id: string;
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  contact_number?: string;
  role?: string;
  status?: string;
  account_status?: string;
  employee_status?: string;
  department_id?: string;
  primary_department_id?: string;
  department?: { id?: string; name?: string; department_name?: string };
  profile?: { full_name?: string; email?: string; phone?: string; role?: string; account_status?: string };
  created_at?: string;
  onboarded_at?: string;
  employee_id?: string;
  expertise?: string;
  designation?: string;
  gender?: string;
  date_of_birth?: string;
  personal_address?: string;
  kyc_status?: string;
  kyc_submitted_at?: string;
  kyc_verified_at?: string;
  kyc_rejection_reason?: string;
  identity_type?: string;
  identity_number?: string;
  identity_front_url?: string;
  identity_back_url?: string;
  appointment_letter_url?: string;
  photo_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

interface RawDeptItem {
  id: string;
  name?: string;
  department_name?: string;
  code?: string;
  department_category?: string;
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
  phone: "",
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
  const d = data as Record<string, unknown>;
  const inner = (d?.data as Record<string, unknown>)?.staff
    ?? d?.data
    ?? data;
  if (!Array.isArray(inner)) return [];
  return inner.map((item: RawStaffItem) => ({
    id: item.id,
    name: item.name ?? item.full_name ?? item.profile?.full_name ?? "—",
    email: item.email ?? item.profile?.email ?? "—",
    phone: item.phone ?? item.phoneNumber ?? item.contact_number ?? item.profile?.phone ?? "",
    role: item.role ?? item.profile?.role ?? "staff",
    status: item.status ?? item.account_status ?? item.employee_status ?? item.profile?.account_status ?? "active",
    department_id: item.department_id ?? item.primary_department_id ?? item.department?.id,
    department: item.department ? {
      id: item.department.id ?? item.primary_department_id ?? "",
      name: item.department.name ?? item.department.department_name ?? "—"
    } : undefined,
    created_at: item.created_at ?? item.onboarded_at,
    employee_id: item.employee_id,
    expertise: item.expertise,
    designation: item.designation,
    contact_number: item.contact_number,
    gender: item.gender,
    date_of_birth: item.date_of_birth,
    personal_address: item.personal_address,
    kyc_status: item.kyc_status,
    kyc_submitted_at: item.kyc_submitted_at,
    kyc_verified_at: item.kyc_verified_at,
    kyc_rejection_reason: item.kyc_rejection_reason,
    identity_type: item.identity_type,
    identity_number: item.identity_number,
    identity_front_url: item.identity_front_url,
    identity_back_url: item.identity_back_url,
    appointment_letter_url: item.appointment_letter_url,
    photo_url: item.photo_url,
    emergency_contact_name: item.emergency_contact_name,
    emergency_contact_phone: item.emergency_contact_phone,
  }));
}

function normalizeDeptList(data: unknown): Department[] {
  if (!data) return [];
  const d = data as Record<string, unknown>;
  const inner = (d?.data as Record<string, unknown>)?.departments
    ?? d?.data
    ?? data;
  if (!Array.isArray(inner)) return [];
  return inner.map((item: RawDeptItem) => ({
    id: item.id,
    name: item.name ?? item.department_name ?? "—",
    code: item.code ?? item.department_category ?? "",
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManageStaff() {
  const { user } = useAuth();
  const userObj = user as {
    municipalityId?: string;
    municipality_id?: string;
    user_metadata?: { municipality_id?: string };
    profile?: { municipality_id?: string };
  } | null;
  const municipalityId =
    userObj?.municipalityId ||
    userObj?.municipality_id ||
    userObj?.user_metadata?.municipality_id ||
    userObj?.profile?.municipality_id ||
    "";

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filtered, setFiltered] = useState<Staff[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [newCredentials, setNewCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
    departmentName?: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status update dialog
  const [statusTarget, setStatusTarget] = useState<Staff | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // KYC Review Modal State
  const [reviewTarget, setReviewTarget] = useState<Staff | null>(null);
  const [kycRejectionReason, setKycRejectionReason] = useState("");
  const [isReviewingKyc, setIsReviewingKyc] = useState(false);

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
        setError("Failed to load staff list");
      }

      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(normalizeDeptList(data));
      }
    } catch (err: any) {
      setError(err.message || "Network error");
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
      phone: staff.phone ?? "",
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
        const payload: UpdateStaffDto = {
          full_name: formData.name,
          email: formData.email,
          primary_department_id: formData.departmentId,
          phone: formData.phone || undefined,
        };

        await municipalityApi.updateStaff(
          municipalityId,
          editTarget!.id,
          payload
        );
      } else {
        const payload: CreateStaffUserDto = {
          full_name: formData.name,
          email: formData.email,
          role: formData.role as 'staff' | 'department_head',
          department_id: formData.departmentId,
          phone: formData.phone || undefined,
        };

        const res = await municipalityApi.createStaffUser(payload);
        setModalOpen(false);
        await fetchAll();

        if (res.data?.password) {
          const deptObj = departments.find((d) => d.id === formData.departmentId);
          setNewCredentials({
            name: formData.name,
            email: formData.email,
            password: res.data.password as string,
            role: formData.role,
            departmentName: deptObj?.name || formData.departmentId,
          });
        }
        return;
      }

      setModalOpen(false);
      await fetchAll();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        errorObj?.response?.data?.message ||
        errorObj?.response?.data?.error ||
        (err instanceof Error ? err.message : "An error occurred");
      setFormError(msg);
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

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>KYC Status</InputLabel>
          <Select
            label="KYC Status"
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
          >
            <MenuItem value="all">All KYC Statuses</MenuItem>
            <MenuItem value="verified">Verified (Approved)</MenuItem>
            <MenuItem value="pending">Pending Review</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="unverified">Unverified</MenuItem>
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
                {["Staff", "Email", "Role", "Department", "Account Status", "KYC Status", "Actions"].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 700 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No staff members found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => {
                  const kyc = s.kyc_status || "unverified";
                  return (
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
                            src={s.photo_url || ""}
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
                          <Box>
                            <Typography fontWeight={600}>{s.name ?? "—"}</Typography>
                            {s.designation && (
                              <Typography variant="caption" color="text.secondary">
                                {s.designation} {s.employee_id ? `(${s.employee_id})` : ""}
                              </Typography>
                            )}
                          </Box>
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

                      {/* KYC Status */}
                      <TableCell>
                        {s.role === "staff" ? (
                          <>
                            {kyc === "verified" && (
                              <Chip
                                icon={<VerifiedUserIcon fontSize="small" />}
                                label="Verified"
                                color="success"
                                size="small"
                                onClick={() => setReviewTarget(s)}
                                sx={{ cursor: "pointer", fontWeight: 600 }}
                              />
                            )}
                            {kyc === "pending" && (
                              <Chip
                                icon={<FactCheckIcon fontSize="small" />}
                                label="Review KYC"
                                color="warning"
                                size="small"
                                onClick={() => setReviewTarget(s)}
                                sx={{ cursor: "pointer", fontWeight: 600 }}
                              />
                            )}
                            {kyc === "rejected" && (
                              <Chip
                                label="Rejected"
                                color="error"
                                size="small"
                                onClick={() => setReviewTarget(s)}
                                sx={{ cursor: "pointer" }}
                              />
                            )}
                            {kyc === "unverified" && (
                              <Chip
                                label="Unverified"
                                size="small"
                                variant="outlined"
                                onClick={() => setReviewTarget(s)}
                                sx={{ cursor: "pointer" }}
                              />
                            )}
                          </>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        {s.role === "staff" && (
                          <Tooltip title="Review KYC Documents">
                            <IconButton
                              color={kyc === "pending" ? "warning" : "default"}
                              size="small"
                              onClick={() => setReviewTarget(s)}
                            >
                              <FactCheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
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
                  );
                })
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

            <TextField
              label="Phone Number (Optional)"
              fullWidth
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. +977-9841234567"
            />

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

      {/* ── New Credentials Dialog ── */}
      <Dialog open={!!newCredentials} onClose={() => setNewCredentials(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "success.main" }}>
          Staff Member Provisioned Successfully!
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            A new staff account has been provisioned. Please copy the credentials below and securely share them with the staff member. They will be prompted to change their password upon first login.
          </Alert>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "#f9f9f9", borderRadius: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Staff Name</Typography>
              <Typography variant="body1" fontWeight={600}>{newCredentials?.name}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Role & Department</Typography>
              <Typography variant="body1" fontWeight={600} sx={{ textTransform: "capitalize" }}>
                {newCredentials?.role ? newCredentials.role.replace(/_/g, " ") : ""} {newCredentials?.departmentName ? `• ${newCredentials.departmentName}` : ""}
              </Typography>
            </Box>
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

      {/* ── KYC Review Modal ── */}
      <Dialog
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Staff KYC Verification Review</span>
          {reviewTarget?.kyc_status && (
            <Chip
              label={reviewTarget.kyc_status.toUpperCase()}
              color={
                reviewTarget.kyc_status === "verified"
                  ? "success"
                  : reviewTarget.kyc_status === "pending"
                  ? "warning"
                  : reviewTarget.kyc_status === "rejected"
                  ? "error"
                  : "default"
              }
              size="small"
              sx={{ fontWeight: "bold" }}
            />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {reviewTarget && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Header Card */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: "grey.50" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    src={reviewTarget.photo_url || ""}
                    sx={{ width: 64, height: 64, bgcolor: "primary.main", fontSize: 22, fontWeight: "bold" }}
                  >
                    {getInitials(reviewTarget.name)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {reviewTarget.name ?? "—"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {reviewTarget.designation || "Staff Member"} • {reviewTarget.department?.name ? `Dept: ${reviewTarget.department.name}` : ""} {reviewTarget.employee_id ? `• ID: ${reviewTarget.employee_id}` : ""}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Email: {reviewTarget.email} • Phone: {reviewTarget.contact_number || reviewTarget.phone || "—"}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Personal & Demographic Details */}
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom>
                  Personal & Demographic Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
                    <Typography variant="body2" fontWeight={600}>{reviewTarget.date_of_birth ? reviewTarget.date_of_birth.split("T")[0] : "—"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Gender</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ textTransform: "capitalize" }}>{reviewTarget.gender || "—"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Specialization</Typography>
                    <Typography variant="body2" fontWeight={600}>{reviewTarget.expertise || "—"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Residential Address</Typography>
                    <Typography variant="body2" fontWeight={600}>{reviewTarget.personal_address || "—"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Emergency Contact</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {reviewTarget.emergency_contact_name || "—"} {reviewTarget.emergency_contact_phone ? `(${reviewTarget.emergency_contact_phone})` : ""}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Identity & Legal Information */}
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom>
                  Identity & Verification Documents
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Identity Document Type</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ textTransform: "capitalize" }}>
                      {reviewTarget.identity_type ? reviewTarget.identity_type.replace(/_/g, " ") : "Not Specified"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Identity Document Number</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {reviewTarget.identity_number || "Not Provided"}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Document Previews */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                      Document Front
                    </Typography>
                    {reviewTarget.identity_front_url ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1,
                          textAlign: "center",
                          cursor: "pointer",
                          borderRadius: 2,
                          "&:hover": { borderColor: "primary.main" },
                        }}
                        onClick={() => window.open(reviewTarget.identity_front_url || "", "_blank")}
                      >
                        <img
                          src={reviewTarget.identity_front_url}
                          alt="Front ID"
                          style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 6, objectFit: "contain" }}
                        />
                        <Typography variant="caption" color="primary" display="block" mt={0.5}>
                          Click to open full view
                        </Typography>
                      </Paper>
                    ) : (
                      <Alert severity="warning" sx={{ py: 0.5 }}>Not Uploaded</Alert>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                      Document Back
                    </Typography>
                    {reviewTarget.identity_back_url ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1,
                          textAlign: "center",
                          cursor: "pointer",
                          borderRadius: 2,
                          "&:hover": { borderColor: "primary.main" },
                        }}
                        onClick={() => window.open(reviewTarget.identity_back_url || "", "_blank")}
                      >
                        <img
                          src={reviewTarget.identity_back_url}
                          alt="Back ID"
                          style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 6, objectFit: "contain" }}
                        />
                        <Typography variant="caption" color="primary" display="block" mt={0.5}>
                          Click to open full view
                        </Typography>
                      </Paper>
                    ) : (
                      <Alert severity="info" sx={{ py: 0.5 }}>Not Provided</Alert>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                      Appointment / ID Badge
                    </Typography>
                    {reviewTarget.appointment_letter_url ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1,
                          textAlign: "center",
                          cursor: "pointer",
                          borderRadius: 2,
                          "&:hover": { borderColor: "primary.main" },
                        }}
                        onClick={() => window.open(reviewTarget.appointment_letter_url || "", "_blank")}
                      >
                        <img
                          src={reviewTarget.appointment_letter_url}
                          alt="Appointment Letter"
                          style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 6, objectFit: "contain" }}
                        />
                        <Typography variant="caption" color="primary" display="block" mt={0.5}>
                          Click to open full view
                        </Typography>
                      </Paper>
                    ) : (
                      <Alert severity="info" sx={{ py: 0.5 }}>Not Provided</Alert>
                    )}
                  </Grid>
                </Grid>
              </Box>

              {reviewTarget.kyc_rejection_reason && (
                <Alert severity="error">
                  <strong>Previous Rejection Reason:</strong> {reviewTarget.kyc_rejection_reason}
                </Alert>
              )}

              {/* Rejection Note Input */}
              <Box>
                <TextField
                  label="Rejection Reason (Required only if rejecting KYC)"
                  fullWidth
                  placeholder="e.g. Document image is blurry or expired. Please upload a clear scan."
                  value={kycRejectionReason}
                  onChange={(e) => setKycRejectionReason(e.target.value)}
                  multiline
                  rows={2}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={() => setReviewTarget(null)} disabled={isReviewingKyc}>
            Cancel
          </Button>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleKycReview("rejected")}
              disabled={isReviewingKyc}
            >
              Reject KYC
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleKycReview("verified")}
              disabled={isReviewingKyc}
              sx={{ fontWeight: "bold", px: 3 }}
            >
              {isReviewingKyc ? <CircularProgress size={20} color="inherit" /> : "Approve & Verify KYC"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
