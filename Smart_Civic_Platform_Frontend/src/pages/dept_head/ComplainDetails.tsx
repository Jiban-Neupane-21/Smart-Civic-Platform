import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, Stack, Divider, Grid
} from "@mui/material";
import { Visibility, HandshakeOutlined, DoneAllOutlined } from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { departmentApi } from "../../api/modules/department.api";
import { municipalityApi } from "../../api/modules/municipality.api";
import type { DeptQueueComplaint } from "../../api/types/department.types";
import { formatDistanceToNow, isPast } from "date-fns";

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

export default function DeptComplainDetails() {
  const { user } = useAuth();
  
  const [complaints, setComplaints] = useState<DeptQueueComplaint[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [selected, setSelected] = useState<DeptQueueComplaint | null>(null);
  
  // Actions
  const [action, setAction] = useState<string>("in_progress");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  
  // Collaboration
  const [partnerDept, setPartnerDept] = useState<string>("");
  const [collabNote, setCollabNote] = useState<string>("");

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, deptRes] = await Promise.all([
        departmentApi.getQueue(),
        user?.municipalityId ? municipalityApi.getDepartments(user.municipalityId) : Promise.resolve({ success: true, data: { departments: [] } })
      ]);
      if (compRes.success) setComplaints(compRes.data || []);
      if (deptRes.success) setDepartments(deptRes.data?.departments || []);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateState = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await departmentApi.updateComplaintState(selected.co_uid, {
        action: action as any,
        resolution_note: note,
        rejection_reason: action === "rejected" ? note : undefined
      });
      if (res.success) {
        setSelected(null);
        fetchData();
      }
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleRequestCollaboration = async () => {
    if (!selected || !partnerDept) return;
    setSaving(true);
    try {
      const res = await departmentApi.requestCollaboration(selected.co_uid, {
        supporting_department_id: partnerDept,
        inspection_note: collabNote
      });
      if (res.success) {
        setSelected(null);
        fetchData();
      }
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOff = async (decision: "approved" | "rejected") => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await departmentApi.submitSignOff(selected.co_uid, {
        decision,
        note: collabNote
      });
      if (res.success) {
        setSelected(null);
        fetchData();
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
      <Paper sx={{ p: 3, mb: 4, bgcolor: "primary.main", color: "primary.contrastText" }}>
        <Typography variant="h5" fontWeight="bold">Department Complaint Queue</Typography>
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          Manage complaints assigned to your department.
        </Typography>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: "background.default" }}>
            <TableRow>
              <TableCell>Tracking ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>SLA Due</TableCell>
              <TableCell>Collab</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {complaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">No complaints assigned to this department yet.</Typography>
                </TableCell>
              </TableRow>
            ) : complaints.map((c) => (
              <TableRow key={c.co_uid} hover onClick={() => setSelected(c)} sx={{ cursor: "pointer" }}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", color: "primary.main" }}>
                    {c.tracking_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">{c.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.citizens?.first_name} {c.citizens?.last_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {c.complaint_categories?.category_name && (
                    <Chip label={c.complaint_categories.category_name} size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={c.severity_level.toUpperCase()}
                    size="small"
                    {...(SEVERITY_PROPS[c.severity_level] || { color: "default" })}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={c.status.replace(/_/g, " ").toUpperCase()}
                    size="small"
                    color={STATUS_COLOR[c.status] || "default"}
                  />
                </TableCell>
                <TableCell>
                  {c.sla_due_at ? (
                    <Typography variant="body2" color={c.sla_breached || isPast(new Date(c.sla_due_at)) ? "error.main" : "text.secondary"}>
                      {formatDistanceToNow(new Date(c.sla_due_at), { addSuffix: true })}
                    </Typography>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  {c.cross_dept_status !== "none" && (
                    <Tooltip title="Cross-Department Collaboration">
                      <Chip 
                        icon={c.cross_dept_status === "joint_signoff" ? <DoneAllOutlined /> : <HandshakeOutlined />} 
                        label={c.cross_dept_status === "joint_signoff" ? "Joint Sign-off" : "Multi-Dept"} 
                        size="small" 
                        color="secondary" 
                        variant="outlined" 
                      />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" color="primary">
                    <Visibility />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detail & Action Dialog */}
      {selected && (
        <Dialog open={Boolean(selected)} onClose={() => !saving && setSelected(null)} maxWidth="md" fullWidth>
          <DialogTitle>Complaint: {selected.tracking_id}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Title</Typography>
                <Typography variant="body1" mb={2}>{selected.title}</Typography>
                
                <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                <Typography variant="body2" mb={2}>{selected.description || "N/A"}</Typography>
                
                <Typography variant="subtitle2" color="text.secondary">Citizen</Typography>
                <Typography variant="body2" mb={2}>{selected.citizens?.first_name} {selected.citizens?.last_name} ({selected.citizens?.contact_number})</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip label={selected.status.replace(/_/g, " ").toUpperCase()} color={STATUS_COLOR[selected.status] || "default"} size="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
                    <Chip label={selected.severity_level.toUpperCase()} {...(SEVERITY_PROPS[selected.severity_level] || {})} size="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Collaboration Status</Typography>
                    <Typography variant="body2">{selected.cross_dept_status.replace(/_/g, " ").toUpperCase()}</Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Actions Section */}
            {selected.cross_dept_status === "none" && (
              <Box>
                <Typography variant="h6" mb={2}>Update State</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
                  <FormControl fullWidth>
                    <InputLabel>New Action</InputLabel>
                    <Select value={action} onChange={(e) => setAction(e.target.value)} label="New Action">
                      <MenuItem value="under_review">Under Review</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="resolved">Resolved</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField 
                    fullWidth 
                    label="Note (Optional)" 
                    value={note} 
                    onChange={(e) => setNote(e.target.value)} 
                    disabled={saving}
                  />
                  <Button variant="contained" onClick={handleUpdateState} disabled={saving}>
                    Update
                  </Button>
                </Stack>

                <Typography variant="h6" mb={2}>Request Collaboration</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Supporting Department</InputLabel>
                    <Select value={partnerDept} onChange={(e) => setPartnerDept(e.target.value)} label="Supporting Department">
                      {departments.map((d) => (
                        <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField 
                    fullWidth 
                    label="Inspection Note" 
                    value={collabNote} 
                    onChange={(e) => setCollabNote(e.target.value)} 
                    disabled={saving}
                  />
                  <Button variant="outlined" color="secondary" onClick={handleRequestCollaboration} disabled={saving || !partnerDept}>
                    Request
                  </Button>
                </Stack>
              </Box>
            )}

            {selected.cross_dept_status === "joint_signoff" && (
              <Box>
                <Typography variant="h6" mb={2}>Joint Sign-Off Required</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                   <TextField 
                    fullWidth 
                    label="Sign-Off Note" 
                    value={collabNote} 
                    onChange={(e) => setCollabNote(e.target.value)} 
                    disabled={saving}
                  />
                  <Button variant="contained" color="success" onClick={() => handleSignOff("approved")} disabled={saving}>
                    Approve
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => handleSignOff("rejected")} disabled={saving}>
                    Reject
                  </Button>
                </Stack>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelected(null)} disabled={saving}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
