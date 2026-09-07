import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, Stack, Divider, Grid, Tabs, Tab,
  InputAdornment, Avatar, Card, CardContent
} from "@mui/material";
import { 
  Visibility, 
  HandshakeOutlined, 
  DoneAllOutlined, 
  Search, 
  Refresh, 
  Clear, 
  FilterList, 
  RestartAlt,
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
  Add as AddIcon,
  AssignmentTurnedIn,
  GroupAdd,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { departmentApi } from "../../api/modules/department.api";
import { municipalityApi } from "../../api/modules/municipality.api";
import type { DeptQueueComplaint, DeptComplaintDetail } from "../../api/types/department.types";
import { QuickAssignSquadDialog } from "../../components/QuickAssignSquadDialog";
import { QuickCreateTeamDialog } from "../../components/QuickCreateTeamDialog";
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

export type DeptTabValue = "all" | "pending" | "under_review" | "in_progress" | "resolved" | "rejected";

export default function DeptComplainDetails() {
  const { user } = useAuth();
  
  const [complaints, setComplaints] = useState<DeptQueueComplaint[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and Tab state
  const [activeTab, setActiveTab] = useState<DeptTabValue>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [squadFilter, setSquadFilter] = useState<"all" | "unassigned" | "assigned">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Quick Squad Dispatch & Team Creation states
  const [quickAssignComplaint, setQuickAssignComplaint] = useState<DeptQueueComplaint | DeptComplaintDetail | null>(null);
  const [createTeamOpen, setCreateTeamOpen] = useState<boolean>(false);

  // Dialog & Detailed complaint state
  const [selected, setSelected] = useState<DeptQueueComplaint | null>(null);
  const [detailData, setDetailData] = useState<DeptComplaintDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Actions
  const [action, setAction] = useState<string>("in_progress");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  
  // Collaboration
  const [partnerDept, setPartnerDept] = useState<string>("");
  const [collabNote, setCollabNote] = useState<string>("");

  const handleOpenDetail = async (c: DeptQueueComplaint) => {
    setSelected(c);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await departmentApi.getComplaintDetail(c.co_uid);
      if (res.success && res.data) {
        setDetailData(res.data);
      }
    } catch (err) {
      console.error("Failed to load full complaint detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    if (!saving) {
      setSelected(null);
      setDetailData(null);
    }
  };

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

  // Compute live complaint counts for each Action / Status tab
  const tabCounts = useMemo(() => {
    const counts: Record<DeptTabValue, number> = {
      all: complaints.length,
      pending: 0,
      under_review: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
    };

    complaints.forEach((c) => {
      const s = (c.status || "").toLowerCase();
      if (s === "pending" || s === "assigned") counts.pending++;
      else if (s === "under_review") counts.under_review++;
      else if (s === "in_progress" || s === "cross_dept_pending") counts.in_progress++;
      else if (s === "resolved" || s === "closed") counts.resolved++;
      else if (s === "rejected") counts.rejected++;
    });

    return counts;
  }, [complaints]);

  // Filter complaints based on active Action Tab, Priority, Squad, and Search Query
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const s = (c.status || "").toLowerCase();

      // 1. Action / Status Tab filter
      if (activeTab === "pending" && !(s === "pending" || s === "assigned")) return false;
      if (activeTab === "under_review" && s !== "under_review") return false;
      if (activeTab === "in_progress" && !(s === "in_progress" || s === "cross_dept_pending")) return false;
      if (activeTab === "resolved" && !(s === "resolved" || s === "closed")) return false;
      if (activeTab === "rejected" && s !== "rejected") return false;

      // 2. Priority / Severity filter
      if (priorityFilter !== "all") {
        const itemSev = ((c.severity_level || c.priority || "") as string).toLowerCase();
        if (itemSev !== priorityFilter.toLowerCase()) return false;
      }

      // 3. Squad deployment filter
      if (squadFilter === "unassigned") {
        const hasTeam = Boolean(c.current_team_id || c.current_team?.team_name);
        if (hasTeam) return false;
      } else if (squadFilter === "assigned") {
        const hasTeam = Boolean(c.current_team_id || c.current_team?.team_name);
        if (!hasTeam) return false;
      }

      // 4. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tracking = (c.tracking_id || "").toLowerCase();
        const title = (c.title || "").toLowerCase();
        const desc = (c.description || "").toLowerCase();
        const citizen = `${c.citizens?.first_name || ""} ${c.citizens?.last_name || ""}`.toLowerCase();
        const category = (c.complaint_categories?.category_name || "").toLowerCase();
        const matches = tracking.includes(q) || title.includes(q) || desc.includes(q) || citizen.includes(q) || category.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [complaints, activeTab, priorityFilter, squadFilter, searchQuery]);

  // Compute exact grievance civic location raised by citizen (e.g. "Kathmandu Ward 1", "Paiyun Ward 1")
  const { locationHeading, locationSubAddress, resolvedWard, resolvedMuni } = useMemo(() => {
    const c = detailData || selected;
    if (!c) return { locationHeading: "Location pending", locationSubAddress: null, resolvedWard: null, resolvedMuni: null };

    const citizen = detailData?.citizen || (detailData as any)?.citizens || (selected as any)?.citizen || (selected as any)?.citizens;
    const muniName = detailData?.municipality?.official_name || 
                     detailData?.municipality?.name || 
                     (detailData as any)?.municipalities?.official_name || 
                     (selected as any)?.municipality?.official_name || 
                     (selected as any)?.municipalities?.official_name;
    
    let wardNo = detailData?.ward_number ?? selected?.ward_number;
    const fullAddress = citizen?.current_address || citizen?.permanent_address;

    // Fallback: extract ward number if not present in column
    if (!wardNo && fullAddress) {
      const match = fullAddress.match(/ward\s*(\d+)/i);
      if (match) wardNo = parseInt(match[1], 10);
    }

    // Build actual civic location headline: e.g. "Kathmandu Ward 1" or "Paiyun Ward 1"
    let heading = "";
    if (muniName && wardNo) {
      heading = `${muniName} Ward ${wardNo}`;
    } else if (muniName) {
      heading = muniName;
    } else if (wardNo) {
      heading = `Ward ${wardNo}`;
    } else if (fullAddress) {
      heading = fullAddress;
    } else {
      heading = "Municipal Jurisdiction Area";
    }

    if (c.location_source === "gps") {
      const lat = c.latitude || detailData?.latitude;
      const lng = c.longitude || detailData?.longitude;
      if (lat && lng) {
        heading = `${heading} (GPS Pinpoint)`;
      }
    }

    return {
      locationHeading: heading,
      locationSubAddress: fullAddress && fullAddress !== heading ? fullAddress : null,
      resolvedWard: wardNo,
      resolvedMuni: muniName,
    };
  }, [detailData, selected]);

  const handleResetFilters = () => {
    setActiveTab("all");
    setPriorityFilter("all");
    setSquadFilter("all");
    setSearchQuery("");
  };

  const isFiltered = activeTab !== "all" || priorityFilter !== "all" || squadFilter !== "all" || searchQuery.trim().length > 0;

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
        setDetailData(null);
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
        setDetailData(null);
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
        setDetailData(null);
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
      <Paper sx={{ p: 3, mb: 3, bgcolor: "primary.main", color: "primary.contrastText", borderRadius: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight="bold">Department Complaint Queue</Typography>
            <Typography variant="subtitle1" sx={{ mt: 0.5, opacity: 0.9 }}>
              Manage and resolve complaints assigned to your department.
            </Typography>
          </Box>
          <Tooltip title="Refresh complaint queue">
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

      {/* Tabs & Filters Container */}
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }} elevation={0}>
        {/* Action / Status Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 1, bgcolor: "background.paper" }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            indicatorColor="primary"
            textColor="primary"
            sx={{
              minHeight: 52,
              "& .MuiTab-root": {
                minHeight: 52,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.92rem",
                px: 2,
              }
            }}
          >
            <Tab
              value="all"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>All Complaints</span>
                  <Chip label={tabCounts.all} size="small" sx={{ height: 20, fontSize: "0.75rem", fontWeight: 700 }} />
                </Stack>
              }
            />
            <Tab
              value="pending"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Pending</span>
                  <Chip
                    label={tabCounts.pending}
                    size="small"
                    color={tabCounts.pending > 0 ? "warning" : "default"}
                    sx={{ height: 20, fontSize: "0.75rem", fontWeight: 700 }}
                  />
                </Stack>
              }
            />
            <Tab
              value="under_review"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Under Review</span>
                  <Chip
                    label={tabCounts.under_review}
                    size="small"
                    color={tabCounts.under_review > 0 ? "info" : "default"}
                    sx={{ height: 20, fontSize: "0.75rem", fontWeight: 700 }}
                  />
                </Stack>
              }
            />
            <Tab
              value="in_progress"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>In Progress</span>
                  <Chip
                    label={tabCounts.in_progress}
                    size="small"
                    color={tabCounts.in_progress > 0 ? "primary" : "default"}
                    sx={{ height: 20, fontSize: "0.75rem", fontWeight: 700 }}
                  />
                </Stack>
              }
            />
            <Tab
              value="resolved"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Resolved</span>
                  <Chip
                    label={tabCounts.resolved}
                    size="small"
                    color={tabCounts.resolved > 0 ? "success" : "default"}
                    sx={{ height: 20, fontSize: "0.75rem", fontWeight: 700 }}
                  />
                </Stack>
              }
            />
            <Tab
              value="rejected"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Rejected</span>
                  <Chip
                    label={tabCounts.rejected}
                    size="small"
                    color={tabCounts.rejected > 0 ? "error" : "default"}
                    sx={{ height: 20, fontSize: "0.75rem", fontWeight: 700 }}
                  />
                </Stack>
              }
            />
          </Tabs>
        </Box>

        {/* Priority & Keyword Filter Toolbar */}
        <Box sx={{ p: 2, bgcolor: "grey.50" }}>
          <Grid container spacing={2} alignItems="center">
            {/* Search Input */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search tracking ID, title, citizen name, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery("")}>
                        <Clear fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                }}
              />
            </Grid>

            {/* Priority (Low, Medium, High, Urgent) Filter */}
            <Grid size={{ xs: 6, md: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="priority-filter-select-label">Priority</InputLabel>
                <Select
                  labelId="priority-filter-select-label"
                  label="Priority"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterList fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  <MenuItem value="urgent">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "error.dark" }} />
                      <Typography variant="body2" fontWeight={600} color="error.dark">Urgent</Typography>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="high">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "error.main" }} />
                      <Typography variant="body2" color="error.main">High</Typography>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="medium">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "warning.main" }} />
                      <Typography variant="body2" color="warning.dark">Medium</Typography>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="low">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "success.main" }} />
                      <Typography variant="body2" color="success.main">Low</Typography>
                    </Stack>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Squad Deployment Filter */}
            <Grid size={{ xs: 6, md: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="squad-filter-select-label">Squad Deployment</InputLabel>
                <Select
                  labelId="squad-filter-select-label"
                  label="Squad Deployment"
                  value={squadFilter}
                  onChange={(e) => setSquadFilter(e.target.value as any)}
                  startAdornment={
                    <InputAdornment position="start">
                      <Group fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="all">All Deployment States</MenuItem>
                  <MenuItem value="unassigned">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main" }} />
                      <Typography variant="body2" fontWeight={600} color="warning.dark">
                        Needs Squad (Unassigned)
                      </Typography>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="assigned">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />
                      <Typography variant="body2" color="success.main">
                        Squad Assigned
                      </Typography>
                    </Stack>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Status counts & Actions */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                {isFiltered && (
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    startIcon={<RestartAlt fontSize="small" />}
                    onClick={handleResetFilters}
                    sx={{ textTransform: "none", color: "text.secondary" }}
                  >
                    Reset
                  </Button>
                )}

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={() => setCreateTeamOpen(true)}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  New Squad
                </Button>

                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {filteredComplaints.length} / {complaints.length}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Table Section */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: 1, borderColor: "divider" }} elevation={0}>
        <Table>
          <TableHead sx={{ bgcolor: "background.default" }}>
            <TableRow>
              <TableCell>Tracking ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned Squad</TableCell>
              <TableCell>SLA Due</TableCell>
              <TableCell>Collab</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredComplaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} color="text.secondary" gutterBottom>
                    No complaints found
                  </Typography>
                  <Typography variant="body2" color="text.disabled" sx={{ mb: isFiltered ? 2 : 0 }}>
                    {complaints.length === 0
                      ? "No complaints are currently assigned to this department."
                      : "No complaints match your current action status and priority filters."}
                  </Typography>
                  {isFiltered && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RestartAlt />}
                      onClick={handleResetFilters}
                      sx={{ textTransform: "none" }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : filteredComplaints.map((c) => (
              <TableRow key={c.co_uid} hover onClick={() => handleOpenDetail(c)} sx={{ cursor: "pointer" }}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", color: "primary.main", fontWeight: 600 }}>
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
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {c.current_team?.team_name ? (
                    <Tooltip title="Click to reassign squad">
                      <Chip
                        icon={<Group fontSize="small" />}
                        label={c.current_team.team_name}
                        size="small"
                        color="primary"
                        variant="outlined"
                        onClick={() => setQuickAssignComplaint(c)}
                        sx={{ fontWeight: 600, cursor: "pointer", "&:hover": { bgcolor: "primary.50" } }}
                      />
                    </Tooltip>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={<GroupAdd fontSize="small" />}
                      onClick={() => setQuickAssignComplaint(c)}
                      sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.25, px: 1, borderRadius: 1.5, fontWeight: 600 }}
                    >
                      Deploy Squad
                    </Button>
                  )}
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
                  <Tooltip title="View full grievance details, media & team">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(c);
                      }}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Comprehensive Grievance Detail & Action Dialog */}
      {selected && (
        <Dialog 
          open={Boolean(selected)} 
          onClose={handleCloseDetail} 
          maxWidth="md" 
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, maxHeight: "90vh" } }}
        >
          <DialogTitle sx={{ pb: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.8 }}>
                  Department Grievance Dossier
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "monospace", color: "primary.main" }}>
                  {selected.tracking_id}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                <Chip
                  label={selected.status.replace(/_/g, " ").toUpperCase()}
                  color={STATUS_COLOR[selected.status] || "default"}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  label={selected.severity_level.toUpperCase()}
                  size="small"
                  {...(SEVERITY_PROPS[selected.severity_level] || { color: "default" })}
                  sx={{ fontWeight: 600 }}
                />
                {selected.sla_due_at && (
                  <Chip
                    label={`SLA: ${formatDistanceToNow(new Date(selected.sla_due_at), { addSuffix: true })}`}
                    color={selected.sla_breached || isPast(new Date(selected.sla_due_at)) ? "error" : "default"}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Stack>
            </Stack>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            {detailLoading && (
              <Box display="flex" alignItems="center" justifyContent="center" py={2} mb={2} gap={1.5} sx={{ bgcolor: "primary.50", borderRadius: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="primary.main" fontWeight={600}>
                  Fetching complete grievance evidence, location & team roster...
                </Typography>
              </Box>
            )}

            <Stack spacing={3}>
              {/* Section 1: Grievance Overview & Description */}
              <Box>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {selected.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
                  {selected.description || "No description provided."}
                </Typography>

                <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
                  {(selected.complaint_categories?.category_name || (detailData as any)?.category?.category_name) && (
                    <Chip 
                      label={`Category: ${selected.complaint_categories?.category_name || (detailData as any)?.category?.category_name}`} 
                      size="small" 
                      variant="outlined" 
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                  {selected.submitted_date && (
                    <Chip 
                      label={`Submitted: ${new Date(selected.submitted_date).toLocaleDateString()} at ${new Date(selected.submitted_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                  {selected.cross_dept_status !== "none" && (
                    <Chip 
                      icon={selected.cross_dept_status === "joint_signoff" ? <DoneAllOutlined /> : <HandshakeOutlined />}
                      label={`Collaboration: ${selected.cross_dept_status.replace(/_/g, " ").toUpperCase()}`}
                      size="small" 
                      color="secondary" 
                    />
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Section 2: Citizen Complaint Raised Location */}
              <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "grey.50" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <LocationOn color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Grievance Incident Location
                    </Typography>
                  </Stack>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 7 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Grievance Incident Location Address
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mt: 0.5, fontSize: "1.15rem", color: "primary.dark" }}>
                        {locationHeading}
                      </Typography>

                      {locationSubAddress && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500 }}>
                          <LocationOn color="primary" sx={{ fontSize: "1rem" }} />
                          {locationSubAddress}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1} alignItems="center" mt={1.5} flexWrap="wrap">
                        {resolvedWard ? (
                          <Chip
                            label={`Ward ${resolvedWard}`}
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : null}
                        {resolvedMuni ? (
                          <Chip
                            label={resolvedMuni}
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : null}
                        <Chip
                          label={
                            selected.location_source === "gps"
                              ? "📍 Source: GPS Coordinates"
                              : selected.location_source === "registered_address"
                              ? "🏠 Source: Citizen Registered Address"
                              : "🗺️ Source: Manual Ward Selection"
                          }
                          size="small"
                          color="default"
                          variant="outlined"
                          sx={{ fontWeight: 500, fontSize: "0.75rem" }}
                        />
                      </Stack>

                      {((selected.latitude || detailData?.latitude) && (selected.longitude || detailData?.longitude)) ? (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                            GPS Coordinates
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", mt: 0.5, fontWeight: 600 }}>
                            {Number(selected.latitude || detailData?.latitude).toFixed(6)}, {Number(selected.longitude || detailData?.longitude).toFixed(6)}
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<OpenInNew />}
                            href={`https://www.google.com/maps?q=${selected.latitude || detailData?.latitude},${selected.longitude || detailData?.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mt: 1, textTransform: "none", fontSize: "0.78rem", borderRadius: 1.5 }}
                          >
                            Open in Google Maps
                          </Button>
                        </Box>
                      ) : null}
                    </Grid>

                    <Grid size={{ xs: 12, sm: 5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Complainant Citizen
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        <Person fontSize="small" sx={{ color: "text.secondary" }} />
                        <Typography variant="body2" fontWeight={700}>
                          {selected.citizens?.first_name} {selected.citizens?.last_name}
                        </Typography>
                      </Stack>
                      {selected.citizens?.contact_number && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Phone fontSize="small" sx={{ color: "text.secondary" }} />
                          <Typography 
                            variant="body2" 
                            component="a" 
                            href={`tel:${selected.citizens.contact_number}`} 
                            sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600 }}
                          >
                            {selected.citizens.contact_number}
                          </Typography>
                        </Stack>
                      )}

                      {(() => {
                        const cit = detailData?.citizen || (detailData as any)?.citizens || (selected as any)?.citizen || (selected as any)?.citizens;
                        return (
                          <>
                            {cit?.current_address && (
                              <Box sx={{ mt: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                  Citizen Current Address
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {cit.current_address}
                                </Typography>
                              </Box>
                            )}

                            {cit?.permanent_address && cit.permanent_address !== cit?.current_address && (
                              <Box sx={{ mt: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                  Citizen Permanent Address
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {cit.permanent_address}
                                </Typography>
                              </Box>
                            )}
                          </>
                        );
                      })()}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Section 3: Attached Evidence & Media Proof Gallery */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <PhotoCamera color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Attached Evidence & Proof Gallery ({detailData?.media?.length || 0})
                    </Typography>
                  </Stack>

                  {detailData?.media && detailData.media.length > 0 ? (
                    <Grid container spacing={2}>
                      {detailData.media.map((item) => {
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
                                gap: 1
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
                                    "&:hover .zoom-overlay": { opacity: 1 }
                                  }}
                                >
                                  <img
                                    src={item.file_url}
                                    alt={item.file_name || "Complaint evidence"}
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
                                      transition: "opacity 0.2s"
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

              {/* Section 4: Assigned Operational Team & Field Staff Roster */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Group color="primary" />
                      <Typography variant="subtitle1" fontWeight={700}>
                        Assigned Field Team & Staff Roster
                      </Typography>
                    </Stack>

                    {detailData?.current_team ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AssignmentTurnedIn fontSize="small" />}
                        onClick={() => setQuickAssignComplaint(detailData || selected)}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        Reassign Squad
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<GroupAdd fontSize="small" />}
                        onClick={() => setQuickAssignComplaint(detailData || selected)}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        Deploy Squad Now
                      </Button>
                    )}
                  </Stack>

                  {detailData?.current_team ? (
                    <Box>
                      <Stack direction="row" spacing={1.5} alignItems="center" mb={2} flexWrap="wrap">
                        <Typography variant="body1" fontWeight={700}>
                          {detailData.current_team.team_name}
                        </Typography>
                        <Chip
                          label={detailData.current_team.team_type ? detailData.current_team.team_type.replace(/_/g, " ").toUpperCase() : "SQUAD"}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                        {detailData.current_team.is_active && (
                          <Chip label="Active" size="small" color="success" sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }} />
                        )}
                      </Stack>
                      {detailData.current_team.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {detailData.current_team.description}
                        </Typography>
                      )}

                      {/* Team Members List */}
                      {detailData.team_members && detailData.team_members.length > 0 ? (
                        <Grid container spacing={2}>
                          {detailData.team_members.map((member) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={member.id}>
                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  bgcolor: member.is_leader ? "warning.50" : "grey.50",
                                  borderColor: member.is_leader ? "warning.main" : "divider"
                                }}
                              >
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Avatar sx={{ bgcolor: member.is_leader ? "warning.main" : "primary.main", width: 44, height: 44, fontWeight: 700 }}>
                                    {(member.full_name || "S").charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Typography variant="body2" fontWeight={700} noWrap>
                                        {member.full_name || "Field Officer"}
                                      </Typography>
                                      {member.is_leader && (
                                        <Chip label="⭐ Leader" size="small" color="warning" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />
                                      )}
                                    </Stack>

                                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                      {member.designation || member.expertise || "Field Operations"} {member.employee_id ? `• ID: ${member.employee_id}` : ""}
                                    </Typography>

                                    <Stack direction="row" spacing={1.5} mt={0.5}>
                                      {member.contact_number && (
                                        <Typography variant="caption" component="a" href={`tel:${member.contact_number}`} sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600 }}>
                                          📞 {member.contact_number}
                                        </Typography>
                                      )}
                                      {member.email && (
                                        <Typography variant="caption" component="a" href={`mailto:${member.email}`} sx={{ color: "text.secondary", textDecoration: "none" }}>
                                          ✉️ Email
                                        </Typography>
                                      )}
                                    </Stack>
                                  </Box>
                                </Stack>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No personnel enrolled in this squad currently.
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        textAlign: "center",
                        bgcolor: "grey.50",
                        borderStyle: "dashed",
                      }}
                    >
                      <Group sx={{ fontSize: 44, color: "warning.main", mb: 1 }} />
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        No Squad Currently Assigned
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: "auto", mb: 2 }}>
                        This grievance is waiting for an operational team dispatch. Assign an existing active team or spin up a new specialized squad in one click.
                      </Typography>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<AssignmentTurnedIn />}
                          onClick={() => setQuickAssignComplaint(detailData || selected)}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          Select Existing Squad
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => setCreateTeamOpen(true)}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          + Create New Squad
                        </Button>
                      </Stack>
                    </Paper>
                  )}
                </CardContent>
              </Card>

              {/* Section 5: State Transition & Multi-Department Actions */}
              <Box sx={{ pt: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                  Actions & Triage Controls
                </Typography>

                {selected.cross_dept_status === "none" && (
                  <Grid container spacing={3}>
                    {/* Update State */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Update Complaint State</Typography>
                        <Stack spacing={2}>
                          <FormControl fullWidth size="small">
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
                            size="small"
                            label="Resolution / Rejection Note (Optional)" 
                            value={note} 
                            onChange={(e) => setNote(e.target.value)} 
                            disabled={saving}
                          />
                          <Button variant="contained" onClick={handleUpdateState} disabled={saving} fullWidth>
                            {saving ? "Updating..." : "Update State"}
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>

                    {/* Request Collaboration */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Request Cross-Dept Collaboration</Typography>
                        <Stack spacing={2}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Supporting Department</InputLabel>
                            <Select value={partnerDept} onChange={(e) => setPartnerDept(e.target.value)} label="Supporting Department">
                              {departments.map((d) => (
                                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField 
                            fullWidth 
                            size="small"
                            label="Inspection Note" 
                            value={collabNote} 
                            onChange={(e) => setCollabNote(e.target.value)} 
                            disabled={saving}
                          />
                          <Button variant="outlined" color="secondary" onClick={handleRequestCollaboration} disabled={saving || !partnerDept} fullWidth>
                            {saving ? "Requesting..." : "Request Collaboration"}
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>
                )}

                {selected.cross_dept_status === "joint_signoff" && (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: "secondary.50" }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Joint Sign-Off Required</Typography>
                    <Stack spacing={2}>
                      <TextField 
                        fullWidth 
                        size="small"
                        label="Sign-Off Note" 
                        value={collabNote} 
                        onChange={(e) => setCollabNote(e.target.value)} 
                        disabled={saving}
                      />
                      <Stack direction="row" spacing={2}>
                        <Button variant="contained" color="success" onClick={() => handleSignOff("approved")} disabled={saving} fullWidth>
                          Approve Sign-Off
                        </Button>
                        <Button variant="outlined" color="error" onClick={() => handleSignOff("rejected")} disabled={saving} fullWidth>
                          Reject Sign-Off
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                )}
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
            <Button onClick={handleCloseDetail} disabled={saving} variant="outlined">Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Image Lightbox Modal */}
      {previewImage && (
        <Dialog open={Boolean(previewImage)} onClose={() => setPreviewImage(null)} maxWidth="lg">
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>Evidence Preview</Typography>
            <IconButton onClick={() => setPreviewImage(null)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 1, bgcolor: "#000", textAlign: "center" }}>
            <img src={previewImage} alt="Evidence Full Preview" style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} />
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Squad Dispatch Modal */}
      {quickAssignComplaint && (
        <QuickAssignSquadDialog
          open={Boolean(quickAssignComplaint)}
          onClose={() => setQuickAssignComplaint(null)}
          complaint={quickAssignComplaint}
          onAssigned={(assignedTeamName) => {
            setComplaints((prev) =>
              prev.map((item) =>
                item.co_uid === quickAssignComplaint.co_uid
                  ? {
                      ...item,
                      status: "assigned",
                      current_team: { id: "", team_name: assignedTeamName },
                    }
                  : item
              )
            );
            if (selected && selected.co_uid === quickAssignComplaint.co_uid) {
              handleOpenDetail(selected);
            }
          }}
          onCreateSquadClick={() => {
            setCreateTeamOpen(true);
          }}
        />
      )}

      {/* Quick Create Squad Modal */}
      <QuickCreateTeamDialog
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        onCreated={() => {
          fetchData();
        }}
      />
    </Box>
  );
}
