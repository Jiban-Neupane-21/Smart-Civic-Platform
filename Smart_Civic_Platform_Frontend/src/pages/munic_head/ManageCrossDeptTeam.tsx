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
  Tooltip,
  InputAdornment,
  Avatar,
  Stack,
  Divider,
  Step,
  StepLabel,
  Stepper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  FormControlLabel,
  Checkbox,
  OutlinedInput,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import GroupsIcon from "@mui/icons-material/Groups";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AssignmentAddIcon from "@mui/icons-material/AssignmentAdd";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { municipalityApi } from "../../api";
import { useAuth } from "../../hooks/useAuth";

interface TeamMemberProfile {
  full_name: string;
  email: string;
  phone?: string;
}

interface TeamMemberStaff {
  id: string;
  employee_id: string | null;
  expertise: string | null;
  profiles: TeamMemberProfile | null;
}

interface TeamMember {
  id: string;
  staff_id: string;
  is_leader: boolean;
  joined_at: string;
  staff: TeamMemberStaff | null;
}

interface Team {
  id: string;
  team_name: string;
  description: string | null;
  team_type: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_expired?: boolean;
  days_remaining?: number | null;
  member_count?: number;
  created_at: string;
  updated_at: string;
  team_members: TeamMember[];
}

interface StaffRosterItem {
  id: string;
  employee_id: string | null;
  expertise: string | null;
  department_id?: string;
  department_name?: string;
  profile: { full_name: string; email: string; phone?: string } | null;
}

interface DepartmentGroup {
  id: string;
  name: string;
  staff: StaffRosterItem[];
}

interface AvailabilityMap {
  [staffId: string]: {
    is_available: boolean;
    conflicting_team_name?: string;
    conflict_start?: string;
    conflict_end?: string;
  };
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
}

function getStatusInfo(team: Team): { label: string; color: "success" | "warning" | "error" | "default" } {
  if (!team.is_active) return { label: "Inactive", color: "default" };
  if (team.is_expired) return { label: "Expired", color: "error" };
  if (new Date(team.start_date) > new Date()) return { label: "Upcoming", color: "warning" };
  return { label: "Active", color: "success" };
}

const CREATE_STEPS = ["Team Info", "Select Staff", "Review & Confirm"];

export default function ManageCrossDeptTeam() {
  const { user } = useAuth();
  const municipalityId = (user as any)?.municipality_id || (user as any)?.municipalityId || "";

  const [teams, setTeams] = useState<Team[]>([]);
  const [filtered, setFiltered] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [staffRoster, setStaffRoster] = useState<StaffRosterItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentGroup[]>([]);
  const [deptTabs, setDeptTabs] = useState<{ id: string; name: string; count: number }[]>([]);
  const [activeDeptTab, setActiveDeptTab] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [createForm, setCreateForm] = useState({
    team_name: "",
    description: "",
    start_date: "",
    end_date: "",
    selectedStaffIds: [] as string[],
    leaderStaffId: "",
    is_emergency_override: false,
    override_reason: "",
  });
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [detailTab, setDetailTab] = useState(0);
  const [teamComplaints, setTeamComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [availableComplaints, setAvailableComplaints] = useState<any[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState("");
  const [assigningComplaint, setAssigningComplaint] = useState(false);

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Team | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await municipalityApi.getCrossDeptTeams();
      const list = (res as any).data ?? (res as any) ?? [];
      setTeams(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load cross-department teams");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStaffAndDepts = useCallback(async () => {
    try {
      const [staffRes, deptRes] = await Promise.all([
        municipalityApi.getMyStaff(),
        municipalityApi.getMyDepartments(),
      ]);
      const rawStaff = ((staffRes as any).data ?? []) as any[];
      const staffList: StaffRosterItem[] = rawStaff.map((s: any) => ({
        id: s.id,
        employee_id: s.employee_id ?? null,
        expertise: s.expertise ?? null,
        department_id: s.department?.id ?? s.primary_department_id ?? undefined,
        department_name: s.department?.department_name ?? undefined,
        profile: s.profile ?? null,
      }));
      setStaffRoster(staffList);

      const deptData = (deptRes as any).data?.departments ?? [];
      const deptGroups: DepartmentGroup[] = deptData.map((d: any) => ({
        id: d.id,
        name: d.department_name,
        staff: staffList.filter((s) => s.department_id === d.id),
      }));
      setDepartments(deptGroups);
      setDeptTabs(
        deptGroups.map((d) => ({ id: d.id, name: d.name, count: d.staff.length }))
      );
    } catch (err: any) {
      setError(err?.message || "Failed to load staff and departments");
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchStaffAndDepts();
  }, [fetchTeams, fetchStaffAndDepts]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      teams.filter((t) => {
        const name = t.team_name.toLowerCase();
        const desc = (t.description ?? "").toLowerCase();
        return name.includes(q) || desc.includes(q);
      })
    );
  }, [search, teams]);

  const duration = (() => {
    if (!createForm.start_date || !createForm.end_date) return 0;
    return daysBetween(createForm.start_date, createForm.end_date);
  })();

  const updateForm = (patch: Partial<typeof createForm>) =>
    setCreateForm((p) => ({ ...p, ...patch }));

  const openCreate = () => {
    setCreateForm({
      team_name: "",
      description: "",
      start_date: "",
      end_date: "",
      selectedStaffIds: [],
      leaderStaffId: "",
      is_emergency_override: false,
      override_reason: "",
    });
    setAvailability({});
    setActiveStep(0);
    setCreateError(null);
    setCreateOpen(true);
  };

  const checkAvailability = async () => {
    if (!createForm.start_date || !createForm.end_date || createForm.selectedStaffIds.length === 0) return;
    setCheckingAvailability(true);
    try {
      const res = await municipalityApi.checkStaffAvailability(
        createForm.selectedStaffIds,
        createForm.start_date,
        createForm.end_date
      );
      const results = ((res as any).data ?? []) as any[];
      const map: AvailabilityMap = {};
      for (const r of results) {
        map[r.staff_id] = {
          is_available: r.is_available,
          conflicting_team_name: r.conflicting_team_name,
          conflict_start: r.conflict_start,
          conflict_end: r.conflict_end,
        };
      }
      setAvailability(map);
    } catch {
      // Availability check failed silently
    } finally {
      setCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (createForm.start_date && createForm.end_date && createForm.selectedStaffIds.length > 0) {
      const timer = setTimeout(checkAvailability, 500);
      return () => clearTimeout(timer);
    }
    setAvailability({});
  }, [createForm.start_date, createForm.end_date, createForm.selectedStaffIds]);

  const handleCreate = async () => {
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const payload: any = {
        team_name: createForm.team_name.trim(),
        description: createForm.description.trim() || undefined,
        start_date: new Date(createForm.start_date).toISOString(),
        end_date: new Date(createForm.end_date).toISOString(),
        member_staff_ids: createForm.selectedStaffIds,
        leader_staff_id: createForm.leaderStaffId || undefined,
      };
      if (createForm.is_emergency_override) {
        payload.is_emergency_override = true;
        payload.override_reason = createForm.override_reason;
      }
      await municipalityApi.createCrossDeptTeam(payload);
      setCreateOpen(false);
      await fetchTeams();
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create team");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openDetail = async (team: Team) => {
    setSelectedTeam(team);
    setDetailTab(0);
    setDetailOpen(true);
    setLoadingComplaints(true);
    try {
      const res = await municipalityApi.getTeamComplaints(team.id);
      const list = (res as any).data ?? [];
      setTeamComplaints(Array.isArray(list) ? list : []);
    } catch {
      setTeamComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const openAssign = async () => {
    setSelectedComplaintId("");
    setAssignOpen(true);
    try {
      const res = await municipalityApi.getComplaints();
      const allComplaints = ((res as any).data ?? []) as any[];
      const assignedIds = new Set(teamComplaints.map((a: any) => a.complaint_id));
      setAvailableComplaints(allComplaints.filter((c: any) => !assignedIds.has(c.co_uid)));
    } catch {
      setAvailableComplaints([]);
    }
  };

  const handleAssignComplaint = async () => {
    if (!selectedTeam || !selectedComplaintId) return;
    setAssigningComplaint(true);
    try {
      await municipalityApi.assignComplaintToTeam(selectedTeam.id, selectedComplaintId);
      setAssignOpen(false);
      const res = await municipalityApi.getTeamComplaints(selectedTeam.id);
      const list = (res as any).data ?? [];
      setTeamComplaints(Array.isArray(list) ? list : []);
    } catch {
      setError("Failed to assign complaint");
    } finally {
      setAssigningComplaint(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await municipalityApi.deactivateCrossDeptTeam(deactivateTarget.id);
      setDeactivateOpen(false);
      setDeactivateTarget(null);
      await fetchTeams();
    } catch (err: any) {
      setError(err?.message || "Failed to deactivate team");
    } finally {
      setDeactivating(false);
    }
  };

  const selectedStaffNames = createForm.selectedStaffIds.map((id) => {
    const s = staffRoster.find((r) => r.id === id);
    return s?.profile?.full_name ?? id;
  });

  const conflictsExist = Object.values(availability).some((a) => !a.is_available);

  const selectedStaffByDept = departments
    .map((d) => ({
      ...d,
      selected: d.staff.filter((s) => createForm.selectedStaffIds.includes(s.id)),
    }))
    .filter((d) => d.selected.length > 0);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <GroupsIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Cross-Department Teams
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create emergency task forces spanning multiple departments
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}>
          Create Cross-Dept Team
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Search teams by name or description..."
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
          {filtered.length} team{filtered.length !== 1 ? "s" : ""} found
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: "primary.main" }}>
              <TableRow>
                {["Team Name", "Departments", "Members", "Duration", "Status", "Actions"].map((h) => (
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
                    No cross-department teams found. Create one to handle multi-department complaints.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((team) => {
                  const status = getStatusInfo(team);
                  const memberCount = team.member_count ?? team.team_members.length;
                  const deptNames = ["Cross-Dept"];

                  return (
                    <TableRow
                      key={team.id || team.team_name}
                      sx={{ "&:hover": { bgcolor: "#f5f8ff" }, "&:last-child td": { border: 0 }, cursor: "pointer" }}
                      onClick={() => openDetail(team)}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: team.is_active ? "secondary.main" : "grey.300", width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
                            {getInitials(team.team_name)}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600}>{team.team_name}</Typography>
                            {team.description && (
                              <Typography variant="caption" color="text.secondary">
                                {team.description.length > 50 ? team.description.slice(0, 50) + "..." : team.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label="Cross-Department" size="small" color="secondary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${memberCount} member${memberCount !== 1 ? "s" : ""}`}
                          size="small"
                          variant="outlined"
                          color={memberCount > 0 ? "secondary" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(team.start_date)} → {formatDate(team.end_date)}
                          </Typography>
                          {team.days_remaining !== undefined && team.days_remaining !== null && team.is_active && !team.is_expired && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                              <CalendarTodayIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                              <Typography variant="caption" color={team.days_remaining <= 3 ? "error" : "text.secondary"}>
                                {team.days_remaining}d remaining
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={status.label} color={status.color} size="small" />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton color="secondary" size="small" onClick={(e) => { e.stopPropagation(); openDetail(team); }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {team.is_active && !team.is_expired && (
                          <Tooltip title="Deactivate">
                            <IconButton color="error" size="small" onClick={(e) => { e.stopPropagation(); setDeactivateTarget(team); setDeactivateOpen(true); }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ─── Create Team Dialog ───────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <GroupsIcon /> Create Cross-Department Team
        </DialogTitle>
        <Stepper activeStep={activeStep} sx={{ px: 3, pt: 1 }}>
          {CREATE_STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <DialogContent dividers sx={{ minHeight: 350 }}>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}

          {/* Step 0: Team Info */}
          {activeStep === 0 && (
            <Stack spacing={2.5}>
              <TextField
                label="Team Name"
                value={createForm.team_name}
                onChange={(e) => updateForm({ team_name: e.target.value })}
                required
                fullWidth
                autoFocus
                placeholder="e.g., Flood Emergency Response"
              />
              <TextField
                label="Description"
                value={createForm.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                fullWidth
                multiline
                rows={2}
                placeholder="Purpose of this cross-department team"
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={createForm.start_date}
                  onChange={(e) => updateForm({ start_date: e.target.value })}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: new Date().toISOString().split("T")[0] }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={createForm.end_date}
                  onChange={(e) => updateForm({ end_date: e.target.value })}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: createForm.start_date || new Date().toISOString().split("T")[0] }}
                />
              </Stack>
              {createForm.start_date && createForm.end_date && (
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "grey.50" }}>
                  <Typography variant="body2" color="text.secondary">
                    Duration: <strong>{duration} day{duration !== 1 ? "s" : ""}</strong>
                    {new Date(createForm.start_date) > new Date() && (
                      <> — starts in {daysBetween(new Date().toISOString(), createForm.start_date)} days</>
                    )}
                  </Typography>
                </Paper>
              )}
            </Stack>
          )}

          {/* Step 1: Select Staff by Department */}
          {activeStep === 1 && (
            <Stack spacing={2}>
              {deptTabs.length > 0 && (
                <Tabs
                  value={Math.min(activeDeptTab, deptTabs.length - 1)}
                  onChange={(_, v) => setActiveDeptTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {deptTabs.map((d) => (
                    <Tab
                      key={d.id}
                      label={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <span>{d.name}</span>
                          <Chip label={d.count} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                        </Box>
                      }
                    />
                  ))}
                </Tabs>
              )}

              {departments.length > 0 && departments[activeDeptTab] ? (
                <List disablePadding>
                  {departments[activeDeptTab].staff.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                      No staff in this department
                    </Typography>
                  ) : (
                    departments[activeDeptTab].staff.map((staff) => {
                      const selected = createForm.selectedStaffIds.includes(staff.id);
                      const avail = availability[staff.id];
                      const busy = avail && !avail.is_available;
                      return (
                        <ListItem
                          key={staff.id}
                          divider
                          sx={{ px: 1, opacity: busy ? 0.6 : 1 }}
                        >
                          <Checkbox
                            checked={selected}
                            onChange={() => {
                              let updated: string[];
                              if (selected) {
                                updated = createForm.selectedStaffIds.filter((id) => id !== staff.id);
                              } else {
                                updated = [...createForm.selectedStaffIds, staff.id];
                              }
                              updateForm({
                                selectedStaffIds: updated,
                                leaderStaffId: updated.includes(createForm.leaderStaffId)
                                  ? createForm.leaderStaffId
                                  : "",
                              });
                            }}
                            disabled={busy && !createForm.is_emergency_override}
                          />
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: selected ? "secondary.main" : "grey.300", width: 36, height: 36, fontSize: 14 }}>
                              {getInitials(staff.profile?.full_name)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography fontWeight={selected ? 600 : 400}>
                                {staff.profile?.full_name ?? "Unknown"}
                              </Typography>
                            }
                            secondary={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                {staff.expertise && <span>{staff.expertise}</span>}
                                {busy && (
                                  <Chip
                                    icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
                                    label={`Busy: ${avail.conflicting_team_name || "Other team"}`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    sx={{ height: 22, fontSize: 11 }}
                                  />
                                )}
                                {avail?.is_available && (
                                  <Chip label="Available" size="small" color="success" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })
                  )}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  Loading departments and staff...
                </Typography>
              )}

              <Divider />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Selected: {createForm.selectedStaffIds.length} staff from {selectedStaffByDept.length} departments
                </Typography>
                {checkingAvailability && <CircularProgress size={16} />}
              </Box>

              {createForm.selectedStaffIds.length > 0 && (
                <FormControl fullWidth size="small">
                  <InputLabel>Team Leader (Optional)</InputLabel>
                  <Select
                    value={createForm.leaderStaffId}
                    label="Team Leader (Optional)"
                    onChange={(e) => updateForm({ leaderStaffId: e.target.value })}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {createForm.selectedStaffIds.map((sid) => {
                      const s = staffRoster.find((r) => r.id === sid);
                      return (
                        <MenuItem key={sid} value={sid}>
                          {s?.profile?.full_name ?? sid}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}

              {conflictsExist && (
                <Paper variant="outlined" sx={{ p: 2, borderColor: "error.main", bgcolor: "error.50" }}>
                  <Typography variant="subtitle2" color="error" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <WarningAmberIcon fontSize="small" /> Schedule Conflicts Detected
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Some staff are already assigned to other teams during this period.
                    As Municipality Head, you can enable emergency override to proceed.
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={createForm.is_emergency_override}
                        onChange={(e) => updateForm({ is_emergency_override: e.target.checked })}
                      />
                    }
                    label="Enable Emergency Override (auto-releases staff from conflicting teams)"
                  />
                  {createForm.is_emergency_override && (
                    <TextField
                      label="Override Reason (required)"
                      value={createForm.override_reason}
                      onChange={(e) => updateForm({ override_reason: e.target.value })}
                      fullWidth
                      size="small"
                      required
                      sx={{ mt: 1 }}
                    />
                  )}
                </Paper>
              )}
            </Stack>
          )}

          {/* Step 2: Review */}
          {activeStep === 2 && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Team Information</Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>Name:</Typography>
                    <Typography variant="body2" fontWeight={600}>{createForm.team_name}</Typography>
                  </Box>
                  {createForm.description && (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>Description:</Typography>
                      <Typography variant="body2">{createForm.description}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>Duration:</Typography>
                    <Typography variant="body2">{formatDate(createForm.start_date)} → {formatDate(createForm.end_date)} ({duration} days)</Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>Type:</Typography>
                    <Chip label="Cross-Department" size="small" color="secondary" />
                  </Box>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Staff Members ({createForm.selectedStaffIds.length})
                </Typography>
                {selectedStaffByDept.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No staff selected.</Typography>
                ) : (
                  selectedStaffByDept.map((dept) => (
                    <Box key={dept.id} sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="secondary" fontWeight={600}>
                        {dept.name} ({dept.selected.length})
                      </Typography>
                      {dept.selected.map((s) => (
                        <Box key={s.id} sx={{ display: "flex", alignItems: "center", gap: 1, pl: 2, py: 0.5 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 11 }}>
                            {getInitials(s.profile?.full_name)}
                          </Avatar>
                          <Typography variant="body2">
                            {s.profile?.full_name}
                            {createForm.leaderStaffId === s.id && (
                              <Chip label="Leader" size="small" color="warning" icon={<StarIcon />} sx={{ ml: 1, height: 20, fontSize: 11 }} />
                            )}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ))
                )}
              </Paper>

              {createForm.is_emergency_override && (
                <Alert severity="warning" icon={<WarningAmberIcon />}>
                  Emergency override enabled. Reason: {createForm.override_reason || "Not specified"}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Box>
            {activeStep > 0 && (
              <Button onClick={() => setActiveStep((p) => p - 1)} color="inherit">
                Back
              </Button>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={() => setCreateOpen(false)} color="inherit">
              Cancel
            </Button>
            {activeStep < CREATE_STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => {
                  if (activeStep === 0 && (!createForm.team_name || !createForm.start_date || !createForm.end_date)) return;
                  if (activeStep === 1 && createForm.selectedStaffIds.length === 0) return;
                  setActiveStep((p) => p + 1);
                }}
                disabled={
                  (activeStep === 0 && (!createForm.team_name || !createForm.start_date || !createForm.end_date || createForm.end_date <= createForm.start_date)) ||
                  (activeStep === 1 && createForm.selectedStaffIds.length === 0)
                }
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                color="secondary"
                onClick={handleCreate}
                disabled={createSubmitting || (conflictsExist && !createForm.is_emergency_override)}
              >
                {createSubmitting ? "Creating..." : "Create Team"}
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* ─── Team Detail Dialog ──────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
          <GroupsIcon />
          {selectedTeam?.team_name ?? "Team Details"}
          <Box sx={{ flexGrow: 1 }} />
          {selectedTeam && (
            <Chip
              label={getStatusInfo(selectedTeam).label}
              color={getStatusInfo(selectedTeam).color}
              size="small"
            />
          )}
          <IconButton onClick={() => setDetailOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ px: 2 }}>
          <Tab label="Overview" />
          <Tab label={`Members (${selectedTeam?.team_members.length ?? 0})`} />
          <Tab label={`Complaints (${teamComplaints.length})`} />
        </Tabs>
        <DialogContent dividers sx={{ minHeight: 300 }}>
          {/* Tab 0: Overview */}
          {detailTab === 0 && selectedTeam && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Team Info</Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>Name:</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedTeam.team_name}</Typography>
                  </Box>
                  {selectedTeam.description && (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>Description:</Typography>
                      <Typography variant="body2">{selectedTeam.description}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>Duration:</Typography>
                    <Typography variant="body2">{formatDate(selectedTeam.start_date)} → {formatDate(selectedTeam.end_date)}</Typography>
                  </Box>
                  {selectedTeam.days_remaining !== undefined && selectedTeam.days_remaining !== null && (
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>Progress:</Typography>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.max(0, Math.min(100, 100 - (selectedTeam.days_remaining / Math.max(1, daysBetween(selectedTeam.start_date, selectedTeam.end_date))) * 100))}
                          color={selectedTeam.days_remaining <= 3 ? "error" : "secondary"}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      <Typography variant="caption" color={selectedTeam.days_remaining <= 3 ? "error" : "text.secondary"}>
                        {selectedTeam.days_remaining}d left
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>Type:</Typography>
                    <Chip label="Cross-Department" size="small" color="secondary" />
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>Members:</Typography>
                    <Typography variant="body2">{selectedTeam.team_members.length}</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          )}

          {/* Tab 1: Members */}
          {detailTab === 1 && selectedTeam && (
            <List disablePadding>
              {selectedTeam.team_members.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                  No members in this team.
                </Typography>
              ) : (
                selectedTeam.team_members.map((member) => (
                  <ListItem key={member.id || member.staff_id} divider sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: member.is_leader ? "gold" : "secondary.light", width: 40, height: 40, fontSize: 14 }}>
                        {getInitials(member.staff?.profiles?.full_name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography fontWeight={600}>{member.staff?.profiles?.full_name ?? "Unknown"}</Typography>
                          {member.is_leader && (
                            <Chip label="Leader" size="small" color="warning" icon={<StarIcon />} sx={{ height: 22 }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          {member.staff?.profiles?.email}
                          {member.staff?.expertise ? ` • ${member.staff.expertise}` : ""}
                        </>
                      }
                    />
                  </ListItem>
                ))
              )}
            </List>
          )}

          {/* Tab 2: Assigned Complaints */}
          {detailTab === 2 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Assigned Complaints
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AssignmentAddIcon />}
                  onClick={openAssign}
                  disabled={!selectedTeam?.is_active || selectedTeam?.is_expired}
                >
                  Assign Complaint
                </Button>
              </Box>
              {loadingComplaints ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : teamComplaints.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  No complaints assigned to this team yet.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Tracking ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Severity</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Assignment</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teamComplaints.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell sx={{ fontFamily: "monospace", color: "primary.main", fontSize: 13 }}>
                            {a.complaint?.tracking_id ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Typography noWrap sx={{ maxWidth: 200 }}>{a.complaint?.title ?? "—"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={a.complaint?.status?.replace("_", " ") ?? "—"} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={a.complaint?.severity_level ?? "—"}
                              size="small"
                              color={a.complaint?.severity_level === "high" || a.complaint?.severity_level === "urgent" ? "error" : "default"}
                              variant={a.complaint?.severity_level === "urgent" ? "filled" : "outlined"}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={a.status?.replace("_", " ")}
                              size="small"
                              color={a.status === "completed" ? "success" : a.status === "in_progress" ? "info" : "default"}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailOpen(false)} color="inherit">Close</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Assign Complaint Dialog ────────────────────────── */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <AssignmentAddIcon /> Assign Complaint to {selectedTeam?.team_name}
        </DialogTitle>
        <DialogContent dividers>
          {availableComplaints.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              No unassigned complaints available.
            </Typography>
          ) : (
            <FormControl fullWidth>
              <InputLabel>Select Complaint</InputLabel>
              <Select
                value={selectedComplaintId}
                label="Select Complaint"
                onChange={(e) => setSelectedComplaintId(e.target.value)}
              >
                {availableComplaints.map((c: any) => {
                  const isAssigned = c.status === "assigned" || c.current_team_id;
                  return (
                    <MenuItem key={c.co_uid} value={c.co_uid} disabled={!!isAssigned}>
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body2" fontWeight={600}>
                          {c.tracking_id} — {c.title}
                          {isAssigned && (
                            <Typography component="span" color="error" variant="caption" sx={{ ml: 1, fontWeight: 'bold' }}>
                              (Already Assigned)
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.status?.replace("_", " ")} • {c.severity_level}
                          {c.department?.department_name ? ` • ${c.department.department_name}` : ""}
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAssignOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssignComplaint}
            disabled={!selectedComplaintId || assigningComplaint}
            startIcon={<AssignmentIcon />}
          >
            {assigningComplaint ? "Assigning..." : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Deactivate Dialog ──────────────────────────────── */}
      <Dialog open={deactivateOpen} onClose={() => setDeactivateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Deactivate Team</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate <strong>{deactivateTarget?.team_name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            All staff assignments will be released. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeactivateOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="error" disabled={deactivating} onClick={handleDeactivate}>
            {deactivating ? "Deactivating..." : "Deactivate"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
