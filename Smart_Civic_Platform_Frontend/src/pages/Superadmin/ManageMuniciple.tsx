import { useState, useEffect } from "react";
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
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Snackbar,
  Divider,
  Grid,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VerifiedIcon from "@mui/icons-material/Verified";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import { superadminApi } from "../../api";
import type { MunicipalityJoined, ProvinceRow, DistrictRow, MunicipalityReference } from "../../api/types";

const MUNICIPALITY_TYPE_LABELS: Record<string, string> = {
  metropolitan_city: "Metropolitan City",
  sub_metropolitan_city: "Sub-Metropolitan City",
  municipality: "Municipality",
  rural_municipality: "Rural Municipality",
};

interface FormData {
  province_id: string;
  district_id: string;
  municipality_id: string;
  municipality_type: string;
  official_name: string;
  official_email: string;
  official_contact_no: string;
  head_name: string;
  head_email: string;
  total_wards: number;
  mayor_chairperson_name: string;
  deputy_mayor_vice_chairperson_name: string;
  about_description: string;
}

interface SuccessInfo {
  password?: string;
  email?: string;
  name?: string;
}

export default function ManageMuniciple() {
  const [municipalities, setMunicipalities] = useState<MunicipalityJoined[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);

  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [referenceMunis, setReferenceMunis] = useState<MunicipalityReference[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterProvince, setFilterProvince] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterKycStatus, setFilterKycStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    province_id: "", district_id: "", municipality_id: "", municipality_type: "",
    official_name: "", official_email: "", official_contact_no: "",
    head_name: "", head_email: "", total_wards: 1,
    mayor_chairperson_name: "", deputy_mayor_vice_chairperson_name: "", about_description: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewMunicipality, setViewMunicipality] = useState<MunicipalityJoined | null>(null);
  const [kycRejectionReason, setKycRejectionReason] = useState("");
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);

  const availableMunicipalityTypes = Array.from(
    new Set(referenceMunis.map((m) => m.local_level_type).filter(Boolean))
  );

  const typeFilteredMunis = formData.municipality_type
    ? referenceMunis.filter((m) => m.local_level_type?.toLowerCase() === formData.municipality_type.toLowerCase())
    : referenceMunis;

  const filteredTableData = municipalities.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || m.official_name?.toLowerCase().includes(q) || (m.head_name || "").toLowerCase().includes(q);
    const matchesProvince = !filterProvince || m.province_name === filterProvince;
    const matchesDistrict = !filterDistrict || m.district_name === filterDistrict;
    const matchesKyc = filterKycStatus === "all" || (m.kyc_status || "unverified") === filterKycStatus;
    return matchesSearch && matchesProvince && matchesDistrict && matchesKyc;
  });

  const paginatedData = filteredTableData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const fetchMunicipalities = async () => {
    try {
      setIsLoading(true);
      const res = await superadminApi.getMunicipalities();
      if (res.success) {
        setMunicipalities(Array.isArray(res.data) ? res.data : []);
      } else {
        setError("Failed to fetch municipalities");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProvinces = async () => {
    try {
      const res = await superadminApi.getProvinces();
      if (res.success) setProvinces(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchMunicipalities();
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (formData.province_id) {
      superadminApi.getDistricts(formData.province_id).then((res) => {
        if (res.success) setDistricts(Array.isArray(res.data) ? res.data : []);
      });
    } else {
      setDistricts([]);
    }
  }, [formData.province_id]);

  useEffect(() => {
    if (formData.district_id) {
      superadminApi.getReferenceMunicipalities(formData.district_id, false).then((res) => {
        if (res.success) setReferenceMunis(Array.isArray(res.data) ? res.data : []);
      });
    } else {
      setReferenceMunis([]);
    }
  }, [formData.district_id]);

  const handleDelete = async (id: string) => {
    try {
      const res = await superadminApi.deleteMunicipality(id);
      if (res.success) {
        setMunicipalities((prev) => prev.filter((m) => m.id !== id));
        setSnackbar({ message: "Municipality deleted successfully", severity: "success" });
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err: unknown) {
      setSnackbar({ message: err instanceof Error ? err.message : "Delete failed", severity: "error" });
    }
    setDeleteConfirm(null);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      province_id: "", district_id: "", municipality_id: "", municipality_type: "",
      official_name: "", official_email: "", official_contact_no: "",
      head_name: "", head_email: "", total_wards: 1,
      mayor_chairperson_name: "", deputy_mayor_vice_chairperson_name: "", about_description: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (m: MunicipalityJoined) => {
    setEditingId(m.id);
    setFormData({
      province_id: "", district_id: "", municipality_id: m.id,
      municipality_type: m.local_level_type || "",
      official_name: m.official_name,
      official_email: m.official_email || "",
      official_contact_no: "",
      head_name: m.head_name || "",
      head_email: m.head_email || "",
      total_wards: m.total_wards || 1,
      mayor_chairperson_name: "", deputy_mayor_vice_chairperson_name: "", about_description: "",
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!editingId) {
      if (!formData.province_id) errors.province_id = "Required";
      if (!formData.district_id) errors.district_id = "Required";
      if (!formData.municipality_type) errors.municipality_type = "Required";
      if (!formData.municipality_id) errors.municipality_id = "Required";
    }
    if (!formData.official_email) errors.official_email = "Required";
    else if (!/\S+@\S+\.\S+/.test(formData.official_email)) errors.official_email = "Invalid email";
    if (!editingId) {
      if (!formData.head_name) errors.head_name = "Required";
      if (!formData.head_email) errors.head_email = "Required";
      else if (!/\S+@\S+\.\S+/.test(formData.head_email)) errors.head_email = "Invalid email";
      if (!formData.total_wards || formData.total_wards < 1) errors.total_wards = "At least 1";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingId) {
        const res = await superadminApi.updateMunicipality(editingId, {
          official_name: formData.official_name,
          official_email: formData.official_email,
          head_name: formData.head_name,
          head_email: formData.head_email,
        });
        if (res.success) {
          await fetchMunicipalities();
          setSnackbar({ message: "Municipality updated successfully", severity: "success" });
          handleCloseModal();
        } else {
          throw new Error("Update failed");
        }
      } else {
        const res = await superadminApi.provisionMunicipality({
          municipality_id: formData.municipality_id,
          head_name: formData.head_name,
          head_email: formData.head_email,
        });
        if (res.success) {
          setSuccessInfo({
            password: res.data.head_password,
            email: res.data.head_email,
            name: res.data.official_name,
          });
          await fetchMunicipalities();
          handleCloseModal();
        } else {
          throw new Error("Provision failed");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKycSubmit = async (status: 'verified' | 'rejected') => {
    if (!viewMunicipality) return;
    if (status === 'rejected' && !kycRejectionReason.trim()) {
      setSnackbar({ message: "Rejection reason is required.", severity: "error" });
      return;
    }

    setIsSubmittingKyc(true);
    try {
      const res = await superadminApi.reviewMunicipalityKyc(viewMunicipality.id, {
        status,
        rejection_reason: status === 'rejected' ? kycRejectionReason : undefined
      });
      if (res.success) {
        setSnackbar({ message: `KYC successfully ${status}`, severity: "success" });
        setViewMunicipality(null);
        setKycRejectionReason("");
        await fetchMunicipalities();
      }
    } catch (err: any) {
      setSnackbar({ message: err.response?.data?.error || err.message || "Failed to update KYC", severity: "error" });
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
          Manage Municipalities
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAddModal}>
          Add Municipality
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small" placeholder="Search municipalities..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
          sx={{ minWidth: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Province</InputLabel>
          <Select value={filterProvince} label="Province"
            onChange={(e) => { setFilterProvince(e.target.value); setFilterDistrict(""); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {provinces.map((p) => (<MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }} disabled={!filterProvince}>
          <InputLabel>District</InputLabel>
          <Select value={filterDistrict} label="District"
            onChange={(e) => { setFilterDistrict(e.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {districts.filter((d) => d.province_id === provinces.find((p) => p.name === filterProvince)?.id).map((d) => (
              <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>KYC Status</InputLabel>
          <Select value={filterKycStatus} label="KYC Status"
            onChange={(e) => { setFilterKycStatus(e.target.value); setPage(0); }}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="unverified">Unverified</MenuItem>
            <MenuItem value="pending">Pending Review</MenuItem>
            <MenuItem value="verified">Verified</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {filteredTableData.length} municipality{filteredTableData.length !== 1 ? "ies" : "y"}
          {municipalities.length !== filteredTableData.length ? ` (of ${municipalities.length})` : ""}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><strong>Municipality</strong></TableCell>
                <TableCell><strong>Head Name</strong></TableCell>
                <TableCell><strong>Head Email</strong></TableCell>
                <TableCell><strong>Created At</strong></TableCell>
                <TableCell align="center"><strong>KYC Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">
                  {municipalities.length === 0 ? "No municipalities found." : "No results match your filters."}
                </TableCell></TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow key={row.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{row.official_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {MUNICIPALITY_TYPE_LABELS[row.local_level_type] || row.local_level_type}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.head_name || "—"}</TableCell>
                    <TableCell>{row.head_email || "—"}</TableCell>
                    <TableCell>{row.registered_at ? new Date(row.registered_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={(row.kyc_status || 'unverified').toUpperCase()}
                        color={
                          row.kyc_status === 'verified' ? 'success' :
                          row.kyc_status === 'pending' ? 'warning' :
                          row.kyc_status === 'rejected' ? 'error' : 'default'
                        }
                        icon={row.kyc_status === 'verified' ? <VerifiedIcon /> : row.kyc_status === 'pending' ? <PendingActionsIcon /> : undefined}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      {row.kyc_status === 'pending' && (
                        <Button size="small" variant="outlined" color="warning" onClick={() => setViewMunicipality(row)} startIcon={<PendingActionsIcon />}>
                          Review KYC
                        </Button>
                      )}
                      <IconButton size="small" title="View Details" onClick={() => setViewMunicipality(row)} sx={{ color: "info.main" }}><VisibilityIcon fontSize="small" /></IconButton>
                      <IconButton size="small" title="Edit" color="primary" onClick={() => openEditModal(row)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" title="Delete" color="error" onClick={() => setDeleteConfirm(row.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div" count={filteredTableData.length} page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TableContainer>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <Typography variant="h6" sx={{ px: 3, pt: 2, pb: 1, fontWeight: "bold" }}>Municipality Details</Typography>
        <DialogTitle>{editingId ? "Edit Municipality" : "Add New Municipality"}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {!editingId && (
              <>
                <FormControl fullWidth margin="dense" required sx={{ mb: 2 }}>
                  <InputLabel>Province</InputLabel>
                  <Select value={formData.province_id} label="Province"
                    onChange={(e) => setFormData({ ...formData, province_id: e.target.value as string, district_id: "", municipality_type: "", municipality_id: "", official_name: "" })}>
                    {provinces.map((p) => (<MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense" required sx={{ mb: 2 }} disabled={!formData.province_id}>
                  <InputLabel>District</InputLabel>
                  <Select value={formData.district_id} label="District"
                    onChange={(e) => setFormData({ ...formData, district_id: e.target.value as string, municipality_type: "", municipality_id: "", official_name: "" })}>
                    {districts.map((d) => (<MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense" sx={{ mb: 2 }} disabled={!formData.district_id}>
                  <InputLabel>Municipality Type (Filter)</InputLabel>
                  <Select value={formData.municipality_type} label="Municipality Type (Filter)"
                    onChange={(e) => setFormData({ ...formData, municipality_type: e.target.value as string, municipality_id: "", official_name: "" })}>
                    <MenuItem value="">All Types</MenuItem>
                    {availableMunicipalityTypes.map((t) => (
                      <MenuItem key={t} value={t}>{MUNICIPALITY_TYPE_LABELS[t] ?? t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense" required sx={{ mb: 2 }} disabled={!formData.district_id}>
                  <InputLabel>Municipality</InputLabel>
                  <Select value={formData.municipality_id} label="Municipality"
                    onChange={(e) => {
                      const selectedId = e.target.value as string;
                      const selected = referenceMunis.find((m) => m.id === selectedId);
                      setFormData({
                        ...formData,
                        municipality_id: selectedId,
                        official_name: selected?.official_name || "",
                        official_email: selected?.official_email || formData.official_email,
                        official_contact_no: selected?.official_contact_no || formData.official_contact_no,
                        mayor_chairperson_name: selected?.mayor_chairperson_name || formData.mayor_chairperson_name,
                        deputy_mayor_vice_chairperson_name: selected?.deputy_mayor_vice_chairperson_name || formData.deputy_mayor_vice_chairperson_name,
                        about_description: selected?.about_description || formData.about_description,
                        municipality_type: selected?.local_level_type || formData.municipality_type,
                        total_wards: selected?.total_wards || 1,
                      });
                    }}>
                    {typeFilteredMunis.length === 0
                      ? <MenuItem disabled>No municipalities available</MenuItem>
                      : typeFilteredMunis.map((m) => (<MenuItem key={m.id} value={m.id}>{m.official_name}</MenuItem>))}
                  </Select>
                </FormControl>
              </>
            )}

            <TextField margin="dense" label="Official Contact Email" type="email" fullWidth required
              value={formData.official_email}
              onChange={(e) => setFormData({ ...formData, official_email: e.target.value })}
              error={!!formErrors.official_email} helperText={formErrors.official_email} sx={{ mb: 2 }} />

            {!editingId && (
              <TextField margin="dense" label="Total Wards" type="number" fullWidth required
                value={formData.total_wards}
                onChange={(e) => setFormData({ ...formData, total_wards: parseInt(e.target.value) || 1 })}
                error={!!formErrors.total_wards} helperText={formErrors.total_wards} sx={{ mb: 2 }} />
            )}

            <TextField margin="dense" label="Official Contact Number" type="tel" fullWidth
              value={formData.official_contact_no}
              onChange={(e) => setFormData({ ...formData, official_contact_no: e.target.value })} sx={{ mb: 2 }} />
            <TextField margin="dense" label="Mayor / Chairperson Name" fullWidth
              value={formData.mayor_chairperson_name}
              onChange={(e) => setFormData({ ...formData, mayor_chairperson_name: e.target.value })} sx={{ mb: 2 }} />
            <TextField margin="dense" label="Deputy Mayor / Vice Chairperson Name" fullWidth
              value={formData.deputy_mayor_vice_chairperson_name}
              onChange={(e) => setFormData({ ...formData, deputy_mayor_vice_chairperson_name: e.target.value })} sx={{ mb: 2 }} />
            <TextField margin="dense" label="About Description" fullWidth multiline rows={3}
              value={formData.about_description}
              onChange={(e) => setFormData({ ...formData, about_description: e.target.value })} sx={{ mb: 2 }} />

            {!editingId && (
              <>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>Municipality Head Details</Typography>
                <TextField margin="dense" label="Head Full Name" fullWidth required
                  value={formData.head_name}
                  onChange={(e) => setFormData({ ...formData, head_name: e.target.value })}
                  error={!!formErrors.head_name} helperText={formErrors.head_name} sx={{ mb: 2 }} />
                <TextField margin="dense" label="Head Login Email" type="email" fullWidth required
                  value={formData.head_email}
                  onChange={(e) => setFormData({ ...formData, head_email: e.target.value })}
                  error={!!formErrors.head_email} helperText={formErrors.head_email} sx={{ mb: 2 }} />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseModal} color="inherit" disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingId ? "Update Municipality" : "Save Municipality"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!successInfo} onClose={() => setSuccessInfo(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'success.main' }}>Municipality Provisioned Successfully</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 3 }}>
            The municipality <strong>{successInfo?.name}</strong> has been successfully provisioned.
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            A head user account has been automatically created. Please securely share the following temporary credentials with the municipality head:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" sx={{ mb: 1 }}><strong>Login Email:</strong> {successInfo?.email}</Typography>
            <Typography variant="body2"><strong>Temporary Password:</strong> {successInfo?.password}</Typography>
          </Paper>
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 2, fontWeight: 'bold' }}>
            Warning: Make sure to copy this password now. It will not be shown again.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSuccessInfo(null)} variant="contained" color="primary">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this municipality? This will also delete the linked user account. This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteConfirm(null)} color="inherit">Cancel</Button>
          <Button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewMunicipality} onClose={() => setViewMunicipality(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
          {viewMunicipality?.official_name}
          <Chip
            label={MUNICIPALITY_TYPE_LABELS[viewMunicipality?.local_level_type || ""] || viewMunicipality?.local_level_type || ""}
            size="small"
            variant="outlined"
            sx={{ ml: 1 }}
          />
          <Chip
            label={viewMunicipality?.is_active ? "Active" : "Inactive"}
            color={viewMunicipality?.is_active ? "success" : "default"}
            size="small"
            sx={{ ml: 0.5 }}
          />
        </DialogTitle>
        <DialogContent dividers>
          {viewMunicipality && (
            <Box>
              {/* Location */}
              <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                Location
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Province</Typography>
                  <Typography variant="body2">{viewMunicipality.province_name || "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">District</Typography>
                  <Typography variant="body2">{viewMunicipality.district_name || "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Total Wards</Typography>
                  <Typography variant="body2">{viewMunicipality.total_wards ?? "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Registered At</Typography>
                  <Typography variant="body2">
                    {viewMunicipality.registered_at ? new Date(viewMunicipality.registered_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />

              {/* Contact */}
              <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                Official Contact
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Official Email</Typography>
                  <Typography variant="body2">{viewMunicipality.official_email || "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Official Contact No.</Typography>
                  <Typography variant="body2">{viewMunicipality.official_contact_no || "—"}</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />

              {/* Leadership */}
              <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                Leadership
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Mayor / Chairperson</Typography>
                  <Typography variant="body2">{viewMunicipality.mayor_chairperson_name || "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Deputy Mayor / Vice Chairperson</Typography>
                  <Typography variant="body2">{viewMunicipality.deputy_mayor_vice_chairperson_name || "—"}</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />

              {/* Municipality Head */}
              <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                Municipality Head
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">Head Name</Typography>
                  <Typography variant="body2">{viewMunicipality.head_name || "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">Head Email</Typography>
                  <Typography variant="body2">{viewMunicipality.head_email || "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">Head Contact No.</Typography>
                  <Typography variant="body2">{viewMunicipality.head_contact_no || "—"}</Typography>
                </Grid>
              </Grid>

              {/* About */}
              {viewMunicipality.about_description && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                    About
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {viewMunicipality.about_description}
                  </Typography>
                </>
              )}

              {/* KYC Documents */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" color="primary" fontWeight={700} sx={{ mb: 2 }}>
                KYC Verification Documents
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                    Head Identity Document
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Type:</strong> {viewMunicipality.head_identity_type?.replace(/_/g, " ").toUpperCase() || "N/A"}</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}><strong>Number:</strong> {viewMunicipality.head_identity_number || "N/A"}</Typography>
                  
                  {viewMunicipality.head_identity_front_url && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block">Front Side</Typography>
                      <img src={viewMunicipality.head_identity_front_url} alt="Identity Front" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid #e0e0e0' }} />
                    </Box>
                  )}
                  {viewMunicipality.head_identity_back_url && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block">Back Side</Typography>
                      <img src={viewMunicipality.head_identity_back_url} alt="Identity Back" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid #e0e0e0' }} />
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                    Registration Document
                  </Typography>
                  {viewMunicipality.registration_document_url ? (
                    viewMunicipality.registration_document_url.endsWith(".pdf") ? (
                      <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, textAlign: 'center' }}>
                         <Typography variant="body2" sx={{ mb: 1 }}>PDF Document Submitted</Typography>
                         <Button variant="outlined" href={viewMunicipality.registration_document_url} target="_blank">View PDF</Button>
                      </Box>
                    ) : (
                      <img src={viewMunicipality.registration_document_url} alt="Registration" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #e0e0e0' }} />
                    )
                  ) : (
                    <Typography variant="body2" color="text.secondary">No registration document provided.</Typography>
                  )}
                </Grid>
              </Grid>

              {/* KYC Rejection Reason (only shown if needed) */}
              <Divider sx={{ my: 3 }} />
              <TextField
                label="Rejection Reason (required if rejecting)"
                fullWidth
                multiline
                rows={2}
                value={kycRejectionReason}
                onChange={(e) => setKycRejectionReason(e.target.value)}
                placeholder="Explain why the KYC is being rejected..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Box display="flex" gap={2}>
            <Button onClick={() => { setViewMunicipality(null); openEditModal(viewMunicipality!); }} variant="outlined" startIcon={<EditIcon />}>Edit Profile</Button>
            <Button onClick={() => setViewMunicipality(null)} color="inherit" disabled={isSubmittingKyc}>Close</Button>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              onClick={() => handleKycSubmit('rejected')}
              variant="outlined"
              color="error"
              disabled={isSubmittingKyc || !kycRejectionReason.trim()}
            >
              {isSubmittingKyc ? "Processing..." : "Reject KYC"}
            </Button>
            <Button
              onClick={() => handleKycSubmit('verified')}
              variant="contained"
              color="success"
              disabled={isSubmittingKyc}
              startIcon={<VerifiedIcon />}
            >
              {isSubmittingKyc ? "Processing..." : "Verify & Approve"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {snackbar ? <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
