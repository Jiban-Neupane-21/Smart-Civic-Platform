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
  OutlinedInput,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { format, differenceInDays, parseISO } from "date-fns";

import { departmentApi } from "../../api/modules/department.api";
import { BASE_URL, fetchWithAuth } from "../../api";
import type { Team, CreateTeamDto, TeamComplaintAssignment, DeptQueueComplaint } from "../../api/types";
import { ComplaintSelector } from "../../components/ComplaintSelector";

interface StaffRosterItem {
  s_uid: string;
  employee_id: string | null;
  expertise: string | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function normalizeTeams(data: unknown): Team[] {
  if (!Array.isArray(data)) return [];
  return data.map((t: any) => ({
    ...t,
    team_members: Array.isArray(t.team_members) ? t.team_members : [],
  }));
}

const calculateDuration = (start: string | null | undefined, end: string | null | undefined) => {
  if (!start || !end) return "N/A";
  try {
    const diff = differenceInDays(parseISO(end), parseISO(start));
    return `${diff} days`;
  } catch {
    return "N/A";
  }
};

const getStatusDetails = (isActive: boolean, endDate: string | null | undefined) => {
  if (!isActive) return { label: "Inactive", color: "error" as const };
  if (!endDate) return { label: "Active", color: "success" as const };
  try {
    const diff = differenceInDays(parseISO(endDate), new Date());
    if (diff < 0) return { label: "Expired", color: "error" as const };
    if (diff <= 3) return { label: "Expiring Soon", color: "warning" as const };
    return { label: "Active", color: "success" as const };
  } catch {
    return { label: "Active", color: "success" as const };
  }
};

export default function ManageTeam() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filtered, setFiltered] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "history">("active");

  // Staff roster
  const [staffRoster, setStaffRoster] = useState<StaffRosterItem[]>([]);

  // Create / Edit team dialog
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState<{
    team_name: string;
    description: string;
    start_date: string;
    end_date: string;
    selectedStaffIds: string[];
    leaderStaffId: string;
  }>({
    team_name: "",
    description: "",
    start_date: "",
    end_date: "",
    selectedStaffIds: [],
    leaderStaffId: "",
  });
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [teamFormError, setTeamFormError] = useState<string | null>(null);

  // Detail View Dialog
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Tab: Members
  const [addMemberStaffId, setAddMemberStaffId] = useState("");
  const [memberActionLoading, setMemberActionLoading] = useState(false);

  // Tab: Complaints
  const [teamComplaints, setTeamComplaints] = useState<TeamComplaintAssignment[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintSelectorOpen, setComplaintSelectorOpen] = useState(false);

  // Delete/Deactivate Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentApi.getTeams();
      if (res.success) {
        setTeams(normalizeTeams(res.data));
      } else {
        setError(res.error?.message || "Failed to load teams");
      }
    } catch (err: any) {
      setError(err.message || "Network error while loading teams.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStaffRoster = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/department/staff-roster`);
      if (res.ok) {
        const data = await res.json();
        const rawList = ((data as Record<string, unknown>).data as any[]) ?? [];
        setStaffRoster(rawList.map((item) => ({ ...item, s_uid: item.id || item.s_uid })));
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchStaffRoster();
  }, [fetchTeams, fetchStaffRoster]);

  useEffect(() => {
    const q = search.toLowerCase();
    const now = new Date();
    
    setFiltered(
      teams.filter((t) => {
        let isActive = t.is_active;
        if (isActive && t.end_date) {
          if (new Date(t.end_date) < now) isActive = false;
        }

        if (viewMode === "active" && !isActive) return false;
        if (viewMode === "history" && isActive) return false;

        const name = t.team_name.toLowerCase();
        const desc = (t.description ?? "").toLowerCase();
        const leader = t.team_members.find((m) => m.is_leader)?.staff?.profiles?.full_name?.toLowerCase() ?? "";
        return name.includes(q) || desc.includes(q) || leader.includes(q);
      })
    );
  }, [search, teams, viewMode]);

  // ─── Team Dialog Actions ────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTeam(null);
    setTeamForm({ team_name: "", description: "", start_date: "", end_date: "", selectedStaffIds: [], leaderStaffId: "" });
    setTeamFormError(null);
    setTeamModalOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditTeam(team);
    setTeamForm({
      team_name: team.team_name,
      description: team.description ?? "",
      start_date: team.start_date ? new Date(team.start_date).toISOString().slice(0, 16) : "",
      end_date: team.end_date ? new Date(team.end_date).toISOString().slice(0, 16) : "",
      selectedStaffIds: [],
      leaderStaffId: "",
    });
    setTeamFormError(null);
    setTeamModalOpen(true);
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamSubmitting(true);
    setTeamFormError(null);

    try {
      if (editTeam) {
        const payload: Partial<CreateTeamDto> = {
          team_name: teamForm.team_name,
          description: teamForm.description,
          start_date: teamForm.start_date ? new Date(teamForm.start_date).toISOString() : undefined,
          end_date: teamForm.end_date ? new Date(teamForm.end_date).toISOString() : undefined,
        };
        const res = await departmentApi.updateTeam(editTeam.team_name, payload);
        if (!res.success) throw new Error(res.error?.message || "Update failed");
      } else {
        if (!teamForm.team_name.trim()) throw new Error("Team name is required.");
        const payload: CreateTeamDto = {
          team_name: teamForm.team_name.trim(),
          description: teamForm.description.trim() || undefined,
          start_date: teamForm.start_date ? new Date(teamForm.start_date).toISOString() : undefined,
          end_date: teamForm.end_date ? new Date(teamForm.end_date).toISOString() : undefined,
          member_staff_ids: teamForm.selectedStaffIds,
          leader_staff_id: teamForm.leaderStaffId || undefined,
        };
        const res = await departmentApi.createTeam(payload);
        if (!res.success) throw new Error(res.error?.message || "Create failed");
      }
      setTeamModalOpen(false);
      await fetchTeams();
    } catch (err: any) {
      setTeamFormError(err.message || "An error occurred");
    } finally {
      setTeamSubmitting(false);
    }
  };

  // ─── Detail View Actions ────────────────────────────────────────────────────

  const openDetail = (team: Team) => {
    setSelectedTeam(team);
    setActiveTab(0);
    setDetailModalOpen(true);
  };

  const fetchTeamComplaints = async (teamName: string) => {
    setComplaintsLoading(true);
    try {
      const res = await departmentApi.getTeamComplaints(teamName);
      if (res.success && res.data) {
        setTeamComplaints(res.data);
      }
    } catch (err) {
      console.error("Failed to load team complaints", err);
    } finally {
      setComplaintsLoading(false);
    }
  };

  useEffect(() => {
    if (detailModalOpen && selectedTeam && activeTab === 2) {
      fetchTeamComplaints(selectedTeam.team_name);
    }
  }, [detailModalOpen, selectedTeam, activeTab]);

  // ─── Members Actions ────────────────────────────────────────────────────────

  const availableStaff = staffRoster.filter((s) => {
    if (selectedTeam?.team_members.some((m) => m.staff_id === s.s_uid)) return false;
    
    if (!selectedTeam || !selectedTeam.start_date || !selectedTeam.end_date) return true;
    const startMs = new Date(selectedTeam.start_date).getTime();
    const endMs = new Date(selectedTeam.end_date).getTime();
    if (startMs >= endMs) return true;

    const isUnavailable = teams.some(t => {
      if (!t.is_active || !t.start_date || !t.end_date) return false;
      if (t.team_name === selectedTeam.team_name) return false;
      const tStart = new Date(t.start_date).getTime();
      const tEnd = new Date(t.end_date).getTime();
      const hasOverlap = startMs < tEnd && endMs > tStart;
      return hasOverlap && t.team_members.some(m => m.staff_id === s.s_uid);
    });

    return !isUnavailable;
  });

  const refreshSelectedTeam = async (teamName: string) => {
    await fetchTeams();
    const res = await departmentApi.getTeamDetail(teamName);
    if (res.success && res.data) {
      setSelectedTeam(res.data);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !addMemberStaffId) return;
    setMemberActionLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/department/teams/assign-member`, {
        method: "POST",
        body: JSON.stringify({ team_id: selectedTeam.team_name, staff_id: addMemberStaffId, is_leader: false }),
      });
      if (!res.ok) throw new Error("Failed to add member");
      await refreshSelectedTeam(selectedTeam.team_name);
      setAddMemberStaffId("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleToggleLeader = async (teamName: string, staffId: string, currentIsLeader: boolean) => {
    setMemberActionLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/department/teams/${encodeURIComponent(teamName)}/members/${staffId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_leader: !currentIsLeader }),
      });
      if (!res.ok) throw new Error("Failed to update leader");
      await refreshSelectedTeam(teamName);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleRemoveMember = async (teamName: string, staffId: string) => {
    setMemberActionLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/department/teams/${encodeURIComponent(teamName)}/members/${staffId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove member");
      await refreshSelectedTeam(teamName);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMemberActionLoading(false);
    }
  };

  // ─── Complaints Actions ─────────────────────────────────────────────────────

  const handleAssignComplaint = async (complaint: DeptQueueComplaint) => {
    if (!selectedTeam) return;
    try {
      const res = await departmentApi.assignComplaintToTeam(selectedTeam.team_name, complaint.co_uid);
      if (res.success) {
        setComplaintSelectorOpen(false);
        fetchTeamComplaints(selectedTeam.team_name);
      } else {
        alert(res.error?.message || "Failed to assign complaint");
      }
    } catch (err: any) {
      alert(err.message || "Error assigning complaint");
    }
  };

  // ─── Deactivate Actions ─────────────────────────────────────────────────────

  const handleDeactivate = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await departmentApi.updateTeam(deleteTarget.team_name, { is_active: false } as any);
      if (!res.success) throw new Error(res.error?.message || "Deactivate failed");
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
      await fetchTeams();
    } catch (err: any) {
      setError(err.message || "Deactivate failed");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <GroupsIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={800}>Team Management</Typography>
            <Typography variant="body2" color="text.secondary">Create, manage, and monitor your department teams</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}>
          Add Team
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Search and Filters */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: { xs: "100%", sm: "auto" } }}>
          <TextField
            placeholder="Search by team name, description, or leader..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ width: { xs: "100%", sm: 360 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
          />
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, val) => val && setViewMode(val)}
            size="small"
            color="primary"
          >
            <ToggleButton value="active" sx={{ px: 3, fontWeight: 600 }}>Active Teams</ToggleButton>
            <ToggleButton value="history" sx={{ px: 3, fontWeight: 600 }}>Team History</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          {filtered.length} team{filtered.length !== 1 ? "s" : ""} found
        </Typography>
      </Stack>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: "primary.main" }}>
              <TableRow>
                {["Team Name", "Leader", "Members", "Duration", "Status", "Actions"].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    {viewMode === "active" ? "No active teams found." : "No historical teams found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((team) => {
                  const leader = team.team_members.find((m) => m.is_leader);
                  const leaderName = leader?.staff?.profiles?.full_name ?? "—";
                  const memberCount = team.team_members.length;
                  const statusDetails = getStatusDetails(team.is_active, team.end_date);

                  return (
                    <TableRow key={team.team_name} sx={{ "&:hover": { bgcolor: "#f5f8ff" } }}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: team.is_active ? "primary.light" : "grey.300", width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
                            {getInitials(team.team_name)}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600} sx={{ cursor: "pointer", "&:hover": { color: "primary.main" } }} onClick={() => openDetail(team)}>
                              {team.team_name}
                            </Typography>
                            {team.description && (
                              <Typography variant="caption" color="text.secondary">
                                {team.description.length > 40 ? team.description.slice(0, 40) + "..." : team.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {leader && <StarIcon sx={{ fontSize: 16, color: "gold" }} />}
                          <Typography variant="body2">{leaderName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={`${memberCount} member${memberCount !== 1 ? "s" : ""}`} size="small" variant="outlined" color={memberCount > 0 ? "primary" : "default"} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{calculateDuration(team.start_date, team.end_date)}</Typography>
                        {team.end_date && <Typography variant="caption" color="text.secondary">Ends: {format(parseISO(team.end_date), "MMM dd, yyyy")}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Chip label={statusDetails.label} size="small" color={statusDetails.color} sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton size="small" color="info" onClick={() => openDetail(team)}><VisibilityIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Team">
                          <IconButton size="small" color="primary" onClick={() => openEdit(team)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        {team.is_active && (
                          <Tooltip title="Deactivate Team">
                            <IconButton size="small" color="error" onClick={() => { setDeleteTarget(team); setDeleteDialogOpen(true); }}><DeleteIcon fontSize="small" /></IconButton>
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

      {/* ─── Detail Modal with Tabs ────────────────────────────────────────── */}
      <Dialog open={detailModalOpen} onClose={() => setDetailModalOpen(false)} maxWidth="md" fullWidth>
        {selectedTeam && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Avatar sx={{ bgcolor: selectedTeam.is_active ? "primary.main" : "grey.400" }}>{getInitials(selectedTeam.team_name)}</Avatar>
                  <Typography variant="h6">{selectedTeam.team_name}</Typography>
                </Box>
                <IconButton onClick={() => setDetailModalOpen(false)} size="small"><CloseIcon /></IconButton>
              </Box>
            </DialogTitle>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                <Tab label="Overview" />
                <Tab label="Members" />
                <Tab label="Assigned Complaints" />
              </Tabs>
            </Box>
            <DialogContent dividers sx={{ minHeight: 400 }}>
              {activeTab === 0 && (
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                    <Typography variant="body1">{selectedTeam.description || "No description provided."}</Typography>
                  </Box>
                  <Box display="flex" gap={4}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Start Date</Typography>
                      <Typography variant="body1">{selectedTeam.start_date ? format(parseISO(selectedTeam.start_date), "MMM dd, yyyy HH:mm") : "N/A"}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">End Date</Typography>
                      <Typography variant="body1">{selectedTeam.end_date ? format(parseISO(selectedTeam.end_date), "MMM dd, yyyy HH:mm") : "N/A"}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip label={getStatusDetails(selectedTeam.is_active, selectedTeam.end_date).label} color={getStatusDetails(selectedTeam.is_active, selectedTeam.end_date).color} size="small" sx={{ mt: 0.5 }} />
                  </Box>
                </Stack>
              )}

              {activeTab === 1 && (
                <Box>
                  {/* Add Member */}
                  <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                    <FormControl size="small" sx={{ flexGrow: 1 }}>
                      <InputLabel>Select Staff to Add</InputLabel>
                      <Select value={addMemberStaffId} label="Select Staff to Add" onChange={(e) => setAddMemberStaffId(e.target.value)}>
                        {availableStaff.map((s) => (
                          <MenuItem key={s.s_uid} value={s.s_uid}>
                            {s.profiles?.full_name} ({s.profiles?.email}) {s.expertise ? `- ${s.expertise}` : ""}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button variant="contained" startIcon={<PersonAddIcon />} disabled={!addMemberStaffId || memberActionLoading} onClick={handleAddMember}>Add</Button>
                  </Box>

                  {/* Members List */}
                  {selectedTeam.team_members.length === 0 ? (
                    <Typography color="text.secondary" align="center" py={4}>No members in this team.</Typography>
                  ) : (
                    <List sx={{ bgcolor: "background.paper", borderRadius: 2, border: "1px solid #eee" }}>
                      {selectedTeam.team_members.map((member) => (
                        <React.Fragment key={member.staff_id}>
                          <ListItem>
                            <ListItemAvatar>
                              <Avatar>{getInitials(member.staff?.profiles?.full_name)}</Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Typography fontWeight={600}>{member.staff?.profiles?.full_name || "Unknown Staff"}</Typography>
                                  {member.is_leader && <Chip label="Leader" size="small" color="primary" icon={<StarIcon fontSize="small" />} />}
                                </Box>
                              }
                              secondary={`${member.staff?.profiles?.email || ""} • ${member.staff?.expertise || "No expertise specified"}`}
                            />
                            <ListItemSecondaryAction>
                              <Tooltip title={member.is_leader ? "Remove Leader Role" : "Make Leader"}>
                                <IconButton edge="end" onClick={() => handleToggleLeader(selectedTeam.team_name, member.staff_id, member.is_leader)} disabled={memberActionLoading} sx={{ mr: 1, color: member.is_leader ? "gold" : "action.disabled" }}>
                                  {member.is_leader ? <StarIcon /> : <StarBorderIcon />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove Member">
                                <IconButton edge="end" color="error" onClick={() => handleRemoveMember(selectedTeam.team_name, member.staff_id)} disabled={memberActionLoading}>
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          </ListItem>
                          <Divider variant="inset" component="li" />
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {activeTab === 2 && (
                <Box>
                  <Box display="flex" justifyContent="flex-end" mb={2}>
                    <Button variant="outlined" startIcon={<AssignmentIcon />} onClick={() => setComplaintSelectorOpen(true)}>Assign Complaint</Button>
                  </Box>
                  {complaintsLoading ? (
                    <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                  ) : teamComplaints.length === 0 ? (
                    <Typography color="text.secondary" align="center" py={4}>No complaints assigned to this team.</Typography>
                  ) : (
                    <List>
                      {teamComplaints.map(assignment => (
                        <ListItem key={assignment.id} sx={{ border: "1px solid #eee", borderRadius: 1, mb: 1 }}>
                          <ListItemText
                            primary={`Tracking ID: ${assignment.complaint?.tracking_id} - ${assignment.complaint?.title}`}
                            secondary={`Status: ${assignment.status} • Assigned At: ${format(parseISO(assignment.assigned_at), "MMM dd, yyyy")}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* ─── Create / Edit Team Modal ──────────────────────────────────────── */}
      <Dialog open={teamModalOpen} onClose={() => setTeamModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTeam ? "Edit Team" : "Create New Team"}</DialogTitle>
        <form onSubmit={handleTeamSubmit}>
          <DialogContent dividers>
            {teamFormError && <Alert severity="error" sx={{ mb: 2 }}>{teamFormError}</Alert>}
            <Stack spacing={3}>
              <TextField label="Team Name" required fullWidth value={teamForm.team_name} onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })} disabled={!!editTeam} />
              <TextField label="Description" multiline rows={3} fullWidth value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} />
              
              <Box display="flex" gap={2}>
                <TextField label="Start Date" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={teamForm.start_date} onChange={(e) => setTeamForm({ ...teamForm, start_date: e.target.value })} />
                <TextField label="End Date" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={teamForm.end_date} onChange={(e) => setTeamForm({ ...teamForm, end_date: e.target.value })} />
              </Box>

              {!editTeam && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Team Members</Typography>
                  <Box display="flex" gap={1} mb={2}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Add Staff</InputLabel>
                      <Select
                        label="Add Staff"
                        value=""
                        onChange={(e) => {
                          const id = e.target.value as string;
                          if (id && !teamForm.selectedStaffIds.includes(id)) {
                            setTeamForm(prev => ({
                              ...prev,
                              selectedStaffIds: [...prev.selectedStaffIds, id],
                              leaderStaffId: prev.selectedStaffIds.length === 0 ? id : prev.leaderStaffId,
                            }));
                          }
                        }}
                      >
                        {staffRoster
                          .filter(s => {
                            if (teamForm.selectedStaffIds.includes(s.s_uid)) return false;
                            
                            // Check availability locally
                            if (!teamForm.start_date || !teamForm.end_date) return true;
                            const startMs = new Date(teamForm.start_date).getTime();
                            const endMs = new Date(teamForm.end_date).getTime();
                            if (startMs >= endMs) return true;

                            const isUnavailable = teams.some(t => {
                              if (!t.is_active || !t.start_date || !t.end_date) return false;
                              if (t.team_name === teamForm.team_name) return false; // Ignore current team if editing (though this is !editTeam block)
                              const tStart = new Date(t.start_date).getTime();
                              const tEnd = new Date(t.end_date).getTime();
                              const hasOverlap = startMs < tEnd && endMs > tStart;
                              return hasOverlap && t.team_members.some(m => m.staff_id === s.s_uid);
                            });
                            
                            return !isUnavailable;
                          })
                          .map((s) => (
                            <MenuItem key={s.s_uid} value={s.s_uid}>{s.profiles?.full_name} ({s.profiles?.email})</MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {teamForm.selectedStaffIds.length > 0 && (
                    <List sx={{ border: "1px solid #eee", borderRadius: 1 }}>
                      {teamForm.selectedStaffIds.map(staffId => {
                        const staff = staffRoster.find(s => s.s_uid === staffId);
                        const isLeader = teamForm.leaderStaffId === staffId;
                        return (
                          <ListItem key={staffId} sx={{ py: 0.5 }}>
                            <ListItemText 
                              primary={
                                <Box display="flex" alignItems="center" gap={1}>
                                  {staff?.profiles?.full_name || staffId}
                                  {isLeader && <Chip size="small" label="Leader" color="primary" icon={<StarIcon fontSize="small"/>} />}
                                </Box>
                              }
                              secondary={staff?.expertise || "No expertise"} 
                            />
                            <ListItemSecondaryAction>
                              <Tooltip title={isLeader ? "Leader" : "Make Leader"}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => setTeamForm(prev => ({ ...prev, leaderStaffId: staffId }))}
                                  sx={{ color: isLeader ? "gold" : "action.disabled" }}
                                >
                                  {isLeader ? <StarIcon /> : <StarBorderIcon />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => setTeamForm(prev => {
                                    const newSelected = prev.selectedStaffIds.filter(id => id !== staffId);
                                    let newLeader = prev.leaderStaffId;
                                    if (isLeader) {
                                      newLeader = newSelected.length > 0 ? newSelected[0] : "";
                                    }
                                    return { ...prev, selectedStaffIds: newSelected, leaderStaffId: newLeader };
                                  })}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTeamModalOpen(false)} color="inherit" disabled={teamSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={teamSubmitting}>{teamSubmitting ? "Saving..." : "Save Team"}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ─── Deactivate Confirmation ───────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Deactivate Team?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to deactivate <b>{deleteTarget?.team_name}</b>? This will hide the team from active assignment lists.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit" disabled={deleting}>Cancel</Button>
          <Button onClick={handleDeactivate} color="error" variant="contained" disabled={deleting}>{deleting ? "Deactivating..." : "Deactivate"}</Button>
        </DialogActions>
      </Dialog>

      <ComplaintSelector open={complaintSelectorOpen} onClose={() => setComplaintSelectorOpen(false)} onSelect={handleAssignComplaint} />
    </Box>
  );
}
