import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton
} from "@mui/material";
import { Visibility, ErrorOutlined } from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { municipalityApi } from "../../api/modules/municipality.api";
import { publicApi } from "../../api/modules/public.api";
import type { MunicipComplaint } from "../../api/types/municipality.types";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLOR: Record<string, "default" | "primary" | "warning" | "info" | "success" | "error" | "secondary"> = {
  pending: "warning",
  assigned: "info",
  under_review: "info",
  in_progress: "primary",
  resolved: "success",
  rejected: "error",
  closed: "default",
  escalated: "error",
  reopened: "warning",
  cross_dept_pending: "secondary",
};

const SEVERITY_PROPS: Record<string, { color: any; variant?: any; sx?: any }> = {
  low: { color: "success", variant: "outlined" },
  medium: { color: "warning" },
  high: { color: "error" },
  urgent: { color: "error", sx: { bgcolor: "error.dark", color: "white", fontWeight: "bold" } },
};

export default function ComplainDetails() {
  const { user } = useAuth();
  const municipalityId = user?.municipalityId || user?.municipality_id;

  const [complaints, setComplaints] = useState<MunicipComplaint[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scope Info
  const [municipalityName, setMunicipalityName] = useState("Loading scope...");

  // Dialog state
  const [selected, setSelected] = useState<MunicipComplaint | null>(null);
  const [action, setAction] = useState<string>("update_status");
  const [newStatus, setNewStatus] = useState<string>("");
  const [newDept, setNewDept] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (municipalityId) {
      fetchData();
      fetchScope();
    } else if (user) {
      setLoading(false);
      setError("No municipality assigned to your account.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId, user]);

  const fetchScope = async () => {
    try {
      if (!municipalityId) return;
      const res = await publicApi.getMunicipalities();
      if (res.success) {
        const m = res.data?.find((x: any) => x.id === municipalityId);
        if (m) setMunicipalityName(m.official_name || m.name);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, deptRes] = await Promise.all([
        municipalityApi.getComplaints(),
        municipalityApi.getDepartments()
      ]);
      if (compRes.success) setComplaints(compRes.data || []);
      if (deptRes.success) setDepartments(deptRes.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const isScopeMismatch = (comp: MunicipComplaint) => {
    if (!comp.citizen) return true; // Missing citizen info
    return (
      comp.citizen.current_municipality_id !== municipalityId &&
      comp.citizen.permanent_municipality_id !== municipalityId
    );
  };

  const handleOpen = (c: MunicipComplaint) => {
    setSelected(c);
    setNewStatus(c.status);
    setNewDept(c.assigned_department_id || "");
    setAction("update_status");
    setNote("");
  };

  const handleUpdate = async () => {
    if (!selected || !municipalityId) return;
    setSaving(true);
    try {
      const res = await municipalityApi.interveneOnComplaint(municipalityId, selected.co_uid, {
        action: action as any,
        note,
        new_status: newStatus,
        new_department_id: newDept || undefined
      });
      if (res.success) {
        setSelected(null);
        fetchData(); // Refresh list
      }
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box p={4}><Alert severity="error">{error}</Alert></Box>;

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 4, bgcolor: "primary.light", color: "primary.contrastText" }}>
        <Typography variant="h5" fontWeight="bold">🏛 Complaint Management</Typography>
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          Scope: {municipalityName}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          Showing complaints submitted to this municipality. A warning icon indicates the citizen is not registered in this municipality.
        </Typography>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: "background.default" }}>
            <TableRow>
              <TableCell>Tracking ID</TableCell>
              <TableCell>Title & Ward</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {complaints.map((c) => (
              <TableRow key={c.co_uid} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", color: "primary.main", fontWeight: "bold" }}>
                    {c.tracking_id}
                  </Typography>
                  {isScopeMismatch(c) && (
                    <Chip size="small" icon={<ErrorOutline fontSize="small" />} label="Out of Scope" color="error" variant="outlined" sx={{ mt: 0.5, height: 20, fontSize: "0.65rem" }} />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.title}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {c.ward_number ? `Ward ${c.ward_number}` : "No Ward"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={c.category?.category_name || "Unknown"} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={(c.severity_level || "low").toUpperCase()} {...(SEVERITY_PROPS[c.severity_level || "low"] || {})} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={c.status} color={STATUS_COLOR[c.status] || "default"} />
                </TableCell>
                <TableCell>
                  {c.department?.department_name || "—"}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDistanceToNow(new Date(c.submitted_date), { addSuffix: true })}
                  </Typography>
                  {c.sla_breached && <Typography variant="caption" color="error">SLA Breached</Typography>}
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" color="primary" onClick={() => handleOpen(c)}>
                    <Visibility />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {complaints.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  No complaints found in your municipality.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Intervention Dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Complaint Intervention</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box display="flex" flexDirection="column" gap={3}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Tracking ID</Typography>
                <Typography variant="body1" sx={{ fontFamily: "monospace" }}>{selected.tracking_id}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                  {selected.description || selected.title}
                </Typography>
              </Box>

              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select value={action} onChange={(e) => setAction(e.target.value)} label="Action">
                  <MenuItem value="update_status">Update Status</MenuItem>
                  <MenuItem value="reassign">Reassign Department</MenuItem>
                  <MenuItem value="force_resolve">Force Resolve</MenuItem>
                  <MenuItem value="force_reject">Force Reject</MenuItem>
                </Select>
              </FormControl>

              {action === "update_status" && (
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} label="Status">
                    {Object.keys(STATUS_COLOR).map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {action === "reassign" && (
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select value={newDept} onChange={(e) => setNewDept(e.target.value)} label="Department">
                    {departments.map(d => (
                      <MenuItem key={d.id} value={d.id}>{d.department_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {["force_resolve", "force_reject", "reassign"].includes(action) && (
                <TextField
                  fullWidth
                  size="small"
                  label="Intervention Note (Required)"
                  multiline
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelected(null)} disabled={saving}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleUpdate} 
            disabled={saving || (["force_resolve", "force_reject", "reassign"].includes(action) && !note.trim())}
          >
            {saving ? "Processing..." : "Apply Intervention"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
