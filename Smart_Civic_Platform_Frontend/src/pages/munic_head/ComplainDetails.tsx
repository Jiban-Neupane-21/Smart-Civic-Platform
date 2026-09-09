import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, Stack, Divider, Grid, Tabs, Tab,
  InputAdornment, Avatar, Card, CardContent
} from "@mui/material";
import {
  Visibility,
  ErrorOutlined,
  LocationOn,
  OpenInNew,
  PhotoCamera,
  Videocam,
  Group,
  Star,
  Phone,
  Email,
  Person,
  Close as CloseIcon,
  Refresh,
  Search,
  Clear,
  Timeline as TimelineIcon,
  Business,
  CheckCircle,
  WarningAmber,
  AssignmentTurnedIn,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { municipalityApi } from "../../api/modules/municipality.api";
import { publicApi } from "../../api/modules/public.api";
import type { MunicipComplaint } from "../../api/types/municipality.types";
import { IncidentLocationMap } from "../../components/IncidentLocationMap";
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

export type MunicTabValue = "all" | "pending" | "in_progress" | "resolved" | "rejected";

export default function ComplainDetails() {
  const { user } = useAuth();
  const { id: routeComplaintId } = useParams<{ id?: string }>();
  const municipalityId = user?.municipalityId || user?.municipality_id;

  const [complaints, setComplaints] = useState<MunicipComplaint[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scope Info
  const [municipalityName, setMunicipalityName] = useState("Loading scope...");

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<MunicTabValue>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Detailed Modal state
  const [selected, setSelected] = useState<MunicipComplaint | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Intervention Actions state
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

  useEffect(() => {
    if (routeComplaintId) {
      handleOpen({ co_uid: routeComplaintId } as MunicipComplaint);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeComplaintId]);

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
        municipalityId ? municipalityApi.getDepartments(municipalityId) : municipalityApi.getMyDepartments(),
      ]);
      if (compRes.success) setComplaints(compRes.data || []);
      if (deptRes.success) {
        const rawDept = deptRes.data as any;
        const list = Array.isArray(rawDept)
          ? rawDept
          : Array.isArray(rawDept?.departments)
          ? rawDept.departments
          : [];
        setDepartments(list);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const isScopeMismatch = (comp: MunicipComplaint) => {
    if (!comp.citizen) return false;
    return (
      comp.citizen.current_municipality_id !== municipalityId &&
      comp.citizen.permanent_municipality_id !== municipalityId
    );
  };

  const handleOpen = async (c: MunicipComplaint) => {
    setSelected(c);
    setNewStatus(c.status || "in_progress");
    setNewDept(c.assigned_department_id || "");
    setAction("update_status");
    setNote("");
    setDetailData(null);
    setDetailLoading(true);

    try {
      const res = await municipalityApi.getComplaintDetail(c.co_uid);
      if (res.success && res.data) {
        setDetailData(res.data);
        if (!c.title) {
          setSelected(res.data as any);
        }
      }
    } catch (err) {
      console.error("Failed to load full complaint detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setSelected(null);
      setDetailData(null);
    }
  };

  const handleUpdate = async () => {
    if (!selected || !municipalityId) return;
    setSaving(true);
    try {
      const res = await municipalityApi.interveneOnComplaint(municipalityId, selected.co_uid, {
        action: action as any,
        note,
        new_status: newStatus,
        new_department_id: newDept || undefined,
      });
      if (res.success) {
        handleClose();
        fetchData();
      }
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const s = (c.status || "").toLowerCase();

      // Tab filter
      if (activeTab === "pending" && !(s === "pending" || s === "assigned")) return false;
      if (activeTab === "in_progress" && !(s === "in_progress" || s === "under_review" || s === "cross_dept_pending")) return false;
      if (activeTab === "resolved" && !(s === "resolved" || s === "closed")) return false;
      if (activeTab === "rejected" && s !== "rejected") return false;

      // Department filter
      if (deptFilter !== "all" && c.assigned_department_id !== deptFilter) return false;

      // Severity filter
      if (severityFilter !== "all") {
        const itemSev = ((c.severity_level || "") as string).toLowerCase();
        if (itemSev !== severityFilter.toLowerCase()) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tracking = (c.tracking_id || "").toLowerCase();
        const title = (c.title || "").toLowerCase();
        const desc = (c.description || "").toLowerCase();
        const citizen = `${(c.citizen as any)?.first_name || ""} ${(c.citizen as any)?.last_name || ""}`.toLowerCase();
        const category = (c.category?.category_name || "").toLowerCase();
        const matches = tracking.includes(q) || title.includes(q) || desc.includes(q) || citizen.includes(q) || category.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [complaints, activeTab, deptFilter, severityFilter, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<MunicTabValue, number> = {
      all: complaints.length,
      pending: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
    };
    complaints.forEach((c) => {
      const s = (c.status || "").toLowerCase();
      if (s === "pending" || s === "assigned") counts.pending++;
      else if (s === "in_progress" || s === "under_review" || s === "cross_dept_pending") counts.in_progress++;
      else if (s === "resolved" || s === "closed") counts.resolved++;
      else if (s === "rejected") counts.rejected++;
    });
    return counts;
  }, [complaints]);

  // Active complaint reference
  const currentItem = detailData || selected;
  const citizen = detailData?.citizen || (detailData as any)?.citizens || (selected as any)?.citizen || (selected as any)?.citizens;
  const currentMuniName = detailData?.municipality?.official_name || municipalityName;
  const resolvedWard = detailData?.ward_number ?? selected?.ward_number;

  let locationHeading = currentMuniName;
  if (resolvedWard) {
    locationHeading = `${currentMuniName} Ward ${resolvedWard}`;
  }
  const fullCitizenAddress = citizen?.current_address || citizen?.permanent_address;

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box p={4}><Alert severity="error">{error}</Alert></Box>;

  return (
    <Box>
      {/* Header Banner */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: "primary.main", color: "primary.contrastText", borderRadius: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight="bold">🏛 Municipal Grievance & Complaint Oversight</Typography>
            <Typography variant="subtitle1" sx={{ mt: 0.5, opacity: 0.9 }}>
              Jurisdiction Scope: <strong>{municipalityName}</strong>
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Oversee department queues, audit field squads, inspect citizen evidence, and intervene where required.
            </Typography>
          </Box>
          <Tooltip title="Refresh complaint list">
            <Button
              variant="contained"
              color="inherit"
              size="small"
              startIcon={<Refresh />}
              onClick={fetchData}
              sx={{ color: "primary.main", bgcolor: "common.white", "&:hover": { bgcolor: "grey.100" } }}
            >
              Refresh
            </Button>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Tabs & Filters */}
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }} elevation={0}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 1, bgcolor: "background.paper" }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label={`All (${tabCounts.all})`} value="all" sx={{ textTransform: "none", fontWeight: 600 }} />
            <Tab label={`Pending (${tabCounts.pending})`} value="pending" sx={{ textTransform: "none", fontWeight: 600 }} />
            <Tab label={`In Progress (${tabCounts.in_progress})`} value="in_progress" sx={{ textTransform: "none", fontWeight: 600 }} />
            <Tab label={`Resolved (${tabCounts.resolved})`} value="resolved" sx={{ textTransform: "none", fontWeight: 600 }} />
            <Tab label={`Rejected (${tabCounts.rejected})`} value="rejected" sx={{ textTransform: "none", fontWeight: 600 }} />
          </Tabs>
        </Box>

        <Box sx={{ p: 2, bgcolor: "grey.50" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by Tracking ID, Title, Citizen, or Category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery("")}>
                        <Clear fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  label="Department"
                >
                  <MenuItem value="all">All Departments</MenuItem>
                  {(Array.isArray(departments) ? departments : []).map((d) => (
                    <MenuItem key={d.id} value={d.id}>{d.department_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Severity</InputLabel>
                <Select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  label="Severity"
                >
                  <MenuItem value="all">All Severities</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Complaints Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: 1, borderColor: "divider" }}>
        <Table>
          <TableHead sx={{ bgcolor: "background.default" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Tracking ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Title & Ward</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Assigned Dept</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredComplaints.map((c) => (
              <TableRow key={c.co_uid} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", color: "primary.main", fontWeight: "bold" }}>
                    {c.tracking_id}
                  </Typography>
                  {isScopeMismatch(c) && (
                    <Chip size="small" icon={<ErrorOutlined fontSize="small" />} label="Out of Scope" color="error" variant="outlined" sx={{ mt: 0.5, height: 20, fontSize: "0.65rem" }} />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} sx={{ maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.ward_number ? `Ward ${c.ward_number}` : "Ward Unspecified"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={c.category?.category_name || "General"} variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={(c.severity_level || "low").toUpperCase()} {...(SEVERITY_PROPS[c.severity_level || "low"] || {})} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={c.status} color={STATUS_COLOR[c.status] || "default"} sx={{ textTransform: "capitalize" }} />
                </TableCell>
                <TableCell>
                  {c.department?.department_name || (c as any).assigned_department?.department_name || "—"}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDistanceToNow(new Date(c.submitted_date), { addSuffix: true })}
                  </Typography>
                  {c.sla_breached && <Typography variant="caption" color="error" fontWeight={600}>SLA Breached</Typography>}
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<Visibility />}
                    onClick={() => handleOpen(c)}
                    sx={{ textTransform: "none", borderRadius: 1.5, fontWeight: 600 }}
                  >
                    Inspect
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredComplaints.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    No grievances match your current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Comprehensive In-Depth Complaint Inspection Modal */}
      {selected && (
        <Dialog open={Boolean(selected)} onClose={handleClose} maxWidth="md" fullWidth scroll="paper">
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", pb: 1, borderBottom: 1, borderColor: "divider" }}>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="h6" fontWeight={700}>
                  Complaint Dossier: {currentItem?.tracking_id}
                </Typography>
                <Chip
                  size="small"
                  label={(currentItem?.status || "pending").replace(/_/g, " ").toUpperCase()}
                  color={STATUS_COLOR[currentItem?.status] || "default"}
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  size="small"
                  label={(currentItem?.severity_level || "low").toUpperCase()}
                  {...(SEVERITY_PROPS[currentItem?.severity_level || "low"] || {})}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Civic Jurisdiction: {municipalityName}
                {currentItem?.submitted_date ? ` • Submitted ${new Date(currentItem.submitted_date).toLocaleString()}` : ""}
              </Typography>
            </Box>
            <IconButton onClick={handleClose} disabled={saving} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            {detailLoading && (
              <Box display="flex" justifyContent="center" alignItems="center" py={3}>
                <CircularProgress size={28} sx={{ mr: 1.5 }} />
                <Typography variant="body2" color="text.secondary">Fetching in-depth records, media, and timeline...</Typography>
              </Box>
            )}

            <Stack spacing={3}>
              {/* Section 1: Grievance Incident & Description Overview */}
              <Box>
                <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
                  {currentItem?.title || "Civic Grievance"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
                  {currentItem?.description || "No description provided."}
                </Typography>

                <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
                  {(currentItem?.category?.category_name || currentItem?.complaint_categories?.category_name) && (
                    <Chip
                      label={`Category: ${currentItem?.category?.category_name || currentItem?.complaint_categories?.category_name}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                  {currentItem?.ticket_type && (
                    <Chip
                      label={`Ticket Type: ${currentItem.ticket_type}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {currentItem?.sla_breached && (
                    <Chip
                      label="⚠️ SLA Breached"
                      size="small"
                      color="error"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Stack>

                {/* Resolution Note if resolved */}
                {currentItem?.status === "resolved" && currentItem?.resolution_note && (
                  <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700}>Resolution Note</Typography>
                    <Typography variant="body2">{currentItem.resolution_note}</Typography>
                    {currentItem.resolution_date && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        Resolved on: {new Date(currentItem.resolution_date).toLocaleString()}
                      </Typography>
                    )}
                  </Alert>
                )}

                {/* Rejection reason if rejected */}
                {currentItem?.status === "rejected" && currentItem?.rejection_reason && (
                  <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700}>Rejection Reason</Typography>
                    <Typography variant="body2">{currentItem.rejection_reason}</Typography>
                  </Alert>
                )}
              </Box>

              <Divider />

              {/* Section 2: Grievance Incident Location & Interactive Map */}
              <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "grey.50" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <LocationOn color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Grievance Incident Location
                    </Typography>
                  </Stack>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Location Jurisdiction
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="primary.dark" sx={{ mt: 0.5 }}>
                        {locationHeading}
                      </Typography>

                      {fullCitizenAddress && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                          <LocationOn color="action" sx={{ fontSize: "1rem" }} />
                          {fullCitizenAddress}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1} alignItems="center" mt={1.5} flexWrap="wrap">
                        {resolvedWard ? (
                          <Chip label={`Ward ${resolvedWard}`} size="small" color="primary" sx={{ fontWeight: 600 }} />
                        ) : null}
                        <Chip
                          label={
                            currentItem?.location_source === "gps"
                              ? "📍 Source: GPS Coordinates"
                              : currentItem?.location_source === "registered_address"
                              ? "🏠 Source: Citizen Registered Address"
                              : "🗺️ Source: Ward Selection"
                          }
                          size="small"
                          variant="outlined"
                        />
                      </Stack>

                      {((currentItem?.latitude) && (currentItem?.longitude)) ? (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                            GPS Coordinates
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", mt: 0.5, fontWeight: 600 }}>
                            {Number(currentItem.latitude).toFixed(6)}, {Number(currentItem.longitude).toFixed(6)}
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<OpenInNew />}
                            href={`https://www.google.com/maps?q=${currentItem.latitude},${currentItem.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mt: 1, textTransform: "none", fontSize: "0.78rem", borderRadius: 1.5 }}
                          >
                            Open in Google Maps
                          </Button>
                        </Box>
                      ) : null}

                      {/* Visual Leaflet Pinpoint Map */}
                      <Box sx={{ mt: 2, borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }}>
                        <IncidentLocationMap
                          latitude={Number(currentItem?.latitude || 0) || null}
                          longitude={Number(currentItem?.longitude || 0) || null}
                          displayAddress={fullCitizenAddress || locationHeading}
                          wardNumber={resolvedWard}
                          municipalityName={municipalityName}
                          height={220}
                        />
                      </Box>
                    </Grid>

                    {/* Section 3: Complainant Citizen Profile */}
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper" }}>
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.primary">
                          Complainant Citizen Profile
                        </Typography>

                        <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                          <Avatar sx={{ bgcolor: "primary.light", color: "primary.contrastText" }}>
                            <Person />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={700}>
                              {citizen?.first_name || (selected as any)?.citizens?.first_name || "Anonymous"}{" "}
                              {citizen?.last_name || (selected as any)?.citizens?.last_name || ""}
                            </Typography>
                            <Chip
                              size="small"
                              label={citizen?.kyc_status ? `KYC: ${citizen.kyc_status.toUpperCase()}` : "KYC Pending"}
                              color={citizen?.kyc_status === "verified" ? "success" : "default"}
                              sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                            />
                          </Box>
                        </Stack>

                        {(citizen?.contact_number || (selected as any)?.citizens?.contact_number) && (
                          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                            <Phone fontSize="small" color="action" />
                            <Typography
                              variant="body2"
                              component="a"
                              href={`tel:${citizen?.contact_number || (selected as any)?.citizens?.contact_number}`}
                              sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600 }}
                            >
                              {citizen?.contact_number || (selected as any)?.citizens?.contact_number}
                            </Typography>
                          </Stack>
                        )}

                        {(citizen?.profile?.email || (selected as any)?.profile?.email) && (
                          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                            <Email fontSize="small" color="action" />
                            <Typography
                              variant="body2"
                              component="a"
                              href={`mailto:${citizen?.profile?.email || (selected as any)?.profile?.email}`}
                              sx={{ color: "primary.main", textDecoration: "none" }}
                            >
                              {citizen?.profile?.email || (selected as any)?.profile?.email}
                            </Typography>
                          </Stack>
                        )}

                        {citizen?.current_address && (
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                              Current Registered Address
                            </Typography>
                            <Typography variant="body2">{citizen.current_address}</Typography>
                          </Box>
                        )}

                        {citizen?.permanent_address && citizen.permanent_address !== citizen.current_address && (
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                              Permanent Registered Address
                            </Typography>
                            <Typography variant="body2">{citizen.permanent_address}</Typography>
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Section 4: Attached Evidence & Media Proof Gallery */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <PhotoCamera color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Attached Evidence & Media Proof ({detailData?.media?.length || 0})
                    </Typography>
                  </Stack>

                  {detailData?.media && detailData.media.length > 0 ? (
                    <Grid container spacing={2}>
                      {detailData.media.map((item: any) => {
                        const isVideo = item.media_type === "video" || /\.(mp4|webm|mov|3gp|mkv)$/i.test(item.file_url);
                        return (
                          <Grid size={{ xs: 12, sm: isVideo ? 12 : 6, md: isVideo ? 12 : 4 }} key={item.id}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: "grey.50",
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                              }}
                            >
                              {isVideo ? (
                                <Box sx={{ borderRadius: 1.5, overflow: "hidden", bgcolor: "#000" }}>
                                  <video
                                    src={item.file_url}
                                    controls
                                    preload="metadata"
                                    style={{ width: "100%", maxHeight: 260, display: "block" }}
                                  />
                                </Box>
                              ) : (
                                <Box
                                  onClick={() => setPreviewImage(item.file_url)}
                                  sx={{
                                    height: 160,
                                    borderRadius: 1.5,
                                    overflow: "hidden",
                                    bgcolor: "grey.200",
                                    cursor: "pointer",
                                    position: "relative",
                                    "&:hover .zoom-overlay": { opacity: 1 },
                                  }}
                                >
                                  <img
                                    src={item.file_url}
                                    alt={item.file_name || "Grievance evidence"}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                  <Box
                                    className="zoom-overlay"
                                    sx={{
                                      position: "absolute",
                                      inset: 0,
                                      bgcolor: "rgba(0,0,0,0.45)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "white",
                                      opacity: 0,
                                      transition: "opacity 0.2s",
                                    }}
                                  >
                                    <Typography variant="caption" fontWeight={700}>🔍 Click to Preview</Typography>
                                  </Box>
                                </Box>
                              )}
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" fontWeight={600} noWrap title={item.file_name} sx={{ maxWidth: 170 }}>
                                  {item.file_name || (isVideo ? "Video Clip" : "Photo Proof")}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={isVideo ? "🎬 Video" : "📷 Photo"}
                                  color={isVideo ? "secondary" : "default"}
                                  variant="outlined"
                                  sx={{ fontSize: "0.7rem", height: 20, fontWeight: 600 }}
                                />
                              </Stack>
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {detailLoading ? "Checking for attached evidence..." : "No photos or video files were uploaded with this grievance."}
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Section 5: Responsible Department & Field Staff Roster */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <Group color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Responsible Department & Field Staff Roster
                    </Typography>
                  </Stack>

                  <Grid container spacing={2} mb={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "grey.50" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                          Assigned Department
                        </Typography>
                        <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                          <Business color="action" fontSize="small" />
                          {currentItem?.department?.department_name || currentItem?.assigned_department?.department_name || "Unassigned"}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "grey.50" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                          Operational Squad / Team
                        </Typography>
                        <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                          <Group color="action" fontSize="small" />
                          {currentItem?.current_team?.team_name || "No Squad Dispatched"}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Team Members Roster */}
                  {detailData?.team_members && detailData.team_members.length > 0 ? (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 1 }}>
                        Active Squad Members ({detailData.team_members.length})
                      </Typography>
                      <Grid container spacing={1.5}>
                        {detailData.team_members.map((m: any) => (
                          <Grid size={{ xs: 12, sm: 6 }} key={m.id}>
                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Avatar sx={{ width: 36, height: 36, bgcolor: m.is_leader ? "warning.main" : "primary.main" }}>
                                {m.full_name?.charAt(0) || "S"}
                              </Avatar>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" fontWeight={700} noWrap>
                                    {m.full_name || "Staff Member"}
                                  </Typography>
                                  {m.is_leader && (
                                    <Chip size="small" icon={<Star fontSize="small" />} label="Lead" color="warning" sx={{ height: 18, fontSize: "0.62rem" }} />
                                  )}
                                </Stack>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {m.designation || m.expertise || "Field Officer"} {m.employee_id ? `• ${m.employee_id}` : ""}
                                </Typography>
                                {m.contact_number && (
                                  <Typography variant="caption" component="a" href={`tel:${m.contact_number}`} sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600 }}>
                                    {m.contact_number}
                                  </Typography>
                                )}
                              </Box>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No individual field staff are currently rostered to this grievance.
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Section 6: Activity & Status Timeline */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <TimelineIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Activity & Progress Timeline ({detailData?.timeline?.length || 0})
                    </Typography>
                  </Stack>

                  {detailData?.timeline && detailData.timeline.length > 0 ? (
                    <Stack spacing={1.5}>
                      {detailData.timeline.map((item: any, idx: number) => (
                        <Paper
                          key={item.id || idx}
                          variant="outlined"
                          sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "grey.50" }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem", bgcolor: "primary.main" }}>
                                {item.updated_by_name?.charAt(0) || "U"}
                              </Avatar>
                              <Typography variant="body2" fontWeight={600}>
                                {item.updated_by_name}
                              </Typography>
                              <Chip
                                size="small"
                                label={item.updated_by_role || "staff"}
                                sx={{ height: 20, fontSize: "0.68rem", textTransform: "capitalize" }}
                              />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ""}
                            </Typography>
                          </Stack>
                          {item.note && (
                            <Typography variant="body2" color="text.primary" sx={{ mt: 1, pl: 4, whiteSpace: "pre-wrap" }}>
                              {item.note}
                            </Typography>
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {detailLoading ? "Loading timeline updates..." : "No progress notes recorded on this grievance yet."}
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Section 7: Municipality Intervention / Governance Controls */}
              <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "grey.50", border: 1, borderColor: "primary.light" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                    🏛 Municipality Head Intervention & Governance
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Execute executive overrides, reassign departments, or record binding resolution decisions.
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Administrative Action</InputLabel>
                        <Select value={action} onChange={(e) => setAction(e.target.value)} label="Administrative Action">
                          <MenuItem value="update_status">Update Status</MenuItem>
                          <MenuItem value="reassign">Reassign Department</MenuItem>
                          <MenuItem value="force_resolve">Force Resolve</MenuItem>
                          <MenuItem value="force_reject">Force Reject</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {action === "update_status" && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Target Status</InputLabel>
                          <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} label="Target Status">
                            {Object.keys(STATUS_COLOR).map((s) => (
                              <MenuItem key={s} value={s}>{s.replace(/_/g, " ").toUpperCase()}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}

                    {action === "reassign" && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>New Department</InputLabel>
                          <Select value={newDept} onChange={(e) => setNewDept(e.target.value)} label="New Department">
                            {(Array.isArray(departments) ? departments : []).map((d) => (
                              <MenuItem key={d.id} value={d.id}>{d.department_name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}

                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        label="Intervention Reason / Resolution Note (Required for force actions & reassign)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={saving}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUpdate}
                        disabled={
                          saving ||
                          (["force_resolve", "force_reject", "reassign"].includes(action) && !note.trim()) ||
                          (action === "reassign" && !newDept)
                        }
                        sx={{ textTransform: "none", fontWeight: 700 }}
                      >
                        {saving ? "Executing Intervention..." : "Apply Administrative Intervention"}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
            <Button onClick={handleClose} disabled={saving} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Full-Size Image Preview Lightbox */}
      {previewImage && (
        <Dialog open={Boolean(previewImage)} onClose={() => setPreviewImage(null)} maxWidth="lg">
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>Evidence Full Preview</Typography>
            <IconButton onClick={() => setPreviewImage(null)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 1, bgcolor: "#000", textAlign: "center" }}>
            <img src={previewImage} alt="Evidence Full Preview" style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}
