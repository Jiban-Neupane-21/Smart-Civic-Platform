import { useState, useEffect, useCallback } from "react";
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
  TablePagination,
  TableRow,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { superadminApi } from "../../api";
import type { SuperadminUser } from "../../api/types";

const ROLE_OPTIONS = [
  { value: "citizen", label: "Citizen" },
  { value: "staff", label: "Staff" },
  { value: "department_head", label: "Department Head" },
  { value: "municipality_head", label: "Municipality Head" },
  { value: "superadmin", label: "Superadmin" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "success" as const },
  { value: "suspended", label: "Suspended", color: "error" as const },
  { value: "invited", label: "Invited", color: "warning" as const },
  { value: "pending_onboarding", label: "Pending Onboarding", color: "info" as const },
  { value: "expired", label: "Expired", color: "default" as const },
];

export default function UserManagement() {
  const [users, setUsers] = useState<SuperadminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", full_name: "", role: "municipality_head", municipality_id: "", phone: "" });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ user: SuperadminUser; type: "role" | "status"; value: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setUsers([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesStatus = !statusFilter || u.account_status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const validateCreate = () => {
    const errors: Record<string, string> = {};
    if (!createForm.email) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(createForm.email)) errors.email = "Invalid email";
    if (!createForm.password) errors.password = "Password is required";
    else if (createForm.password.length < 6) errors.password = "At least 6 characters";
    if (!createForm.full_name) errors.full_name = "Full name is required";
    if (!createForm.municipality_id) errors.municipality_id = "Municipality is required";
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreate()) return;
    setIsSubmitting(true);
    try {
      const res = await superadminApi.createUser(createForm);
      if (res.success) {
        setUsers((prev) => [res.data, ...prev]);
        setCreateOpen(false);
        setCreateForm({ email: "", password: "", full_name: "", role: "municipality_head", municipality_id: "", phone: "" });
      } else {
        setError(res.message || "Failed to create user");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (user: SuperadminUser, newRole: string) => {
    try {
      const res = await superadminApi.assignUserRole({ targetUserId: user.id, newRole });
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change role");
    }
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleStatusChange = async (user: SuperadminUser, newStatus: string) => {
    try {
      const res = await superadminApi.manageUserStatus({ targetUserId: user.id, status: newStatus });
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, account_status: newStatus } : u)));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  const getStatusChip = (status: string) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    return <Chip label={opt?.label ?? status} color={opt?.color ?? "default"} size="small" />;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>User Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Create User
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small" placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Role</InputLabel>
          <Select value={roleFilter} label="Role" onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {ROLE_OPTIONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {STATUS_OPTIONS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ p: 3 }}>{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" height={48} sx={{ mb: 1 }} />)}</Box>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">No users found</TableCell></TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                    <TableCell><Typography variant="body2" fontWeight={600}>{user.full_name}</Typography></TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 130 }}>
                        <Select
                          value={user.role}
                          onChange={(e) => { setConfirmAction({ user, type: "role", value: e.target.value }); setConfirmOpen(true); }}
                          sx={{ fontSize: "0.85rem" }}
                        >
                          {ROLE_OPTIONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>{getStatusChip(user.account_status)}</TableCell>
                    <TableCell>
                      {user.account_status === "suspended" ? (
                        <IconButton color="success" onClick={() => { setConfirmAction({ user, type: "status", value: "active" }); setConfirmOpen(true); }}>
                          <CheckCircleIcon />
                        </IconButton>
                      ) : (
                        <IconButton color="error" onClick={() => { setConfirmAction({ user, type: "status", value: "suspended" }); setConfirmOpen(true); }}>
                          <BlockIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filteredUsers.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </TableContainer>
      )}

      {/* Create User Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>Create New User</DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent>
            <TextField margin="dense" label="Full Name" fullWidth required value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              error={!!createErrors.full_name} helperText={createErrors.full_name} sx={{ mb: 2 }} />
            <TextField margin="dense" label="Email" type="email" fullWidth required value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              error={!!createErrors.email} helperText={createErrors.email} sx={{ mb: 2 }} />
            <TextField margin="dense" label="Password" type="password" fullWidth required value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              error={!!createErrors.password} helperText={createErrors.password} sx={{ mb: 2 }} />
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select value={createForm.role} label="Role" onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                {ROLE_OPTIONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField margin="dense" label="Municipality ID" fullWidth required value={createForm.municipality_id}
              onChange={(e) => setCreateForm({ ...createForm, municipality_id: e.target.value })}
              error={!!createErrors.municipality_id} helperText={createErrors.municipality_id} sx={{ mb: 2 }} />
            <TextField margin="dense" label="Phone" fullWidth value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setCreateOpen(false)} color="inherit" disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>Confirm Action</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmAction?.type === "role"
              ? `Change role of ${confirmAction.user.full_name} to ${confirmAction.value}?`
              : confirmAction?.value === "suspended"
                ? `Suspend ${confirmAction?.user.full_name}? They will lose access to the platform.`
                : `Activate ${confirmAction?.user.full_name}? They will regain access.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            color={confirmAction?.value === "suspended" ? "error" : "primary"}
            onClick={() => {
              if (!confirmAction) return;
              if (confirmAction.type === "role") handleRoleChange(confirmAction.user, confirmAction.value);
              else handleStatusChange(confirmAction.user, confirmAction.value);
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
