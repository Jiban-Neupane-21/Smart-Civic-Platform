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
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { BASE_URL, fetchWithAuth } from "../../api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMemberProfile {
  full_name: string;
  email: string;
  phone?: string;
}

interface TeamMemberStaff {
  s_uid: string;
  employee_id: string | null;
  expertise: string | null;
  profiles: TeamMemberProfile | null;
}

interface TeamMember {
  staff_id: string;
  is_leader: boolean;
  joined_at: string;
  staff: TeamMemberStaff | null;
}

interface Team {
  team_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  team_members: TeamMember[];
}

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
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function normalizeTeams(data: unknown): Team[] {
  if (!Array.isArray(data)) return [];
  return data.map((t: any) => ({
    ...t,
    team_members: Array.isArray(t.team_members) ? t.team_members : [],
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManageTeam() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filtered, setFiltered] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Staff roster for adding members
  const [staffRoster, setStaffRoster] = useState<StaffRosterItem[]>([]);

  // Create / Edit team dialog
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState<{
    team_name: string;
    description: string;
    selectedStaffIds: string[];
    leaderStaffId: string;
  }>({
    team_name: "",
    description: "",
    selectedStaffIds: [],
    leaderStaffId: "",
  });
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [teamFormError, setTeamFormError] = useState<string | null>(null);

  // Members dialog
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [addMemberStaffId, setAddMemberStaffId] = useState("");
  const [memberActionLoading, setMemberActionLoading] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/department/teams`);
      if (res.ok) {
        const data = await res.json();
        setTeams(normalizeTeams((data as Record<string, unknown>).data));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as Record<string, unknown>)?.error as string ||
          "Failed to load teams"
        );
      }
    } catch {
      setError("Network error while loading teams.");
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
        setStaffRoster(
          rawList.map((item) => ({
            ...item,
            s_uid: item.id || item.s_uid,
          }))
        );
      }
    } catch {
      // Silently fail — member add dropdown will be empty
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchStaffRoster();
  }, [fetchTeams, fetchStaffRoster]);

  // ─── Client-side filtering ──────────────────────────────────────────────────

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      teams.filter((t) => {
        const name = t.team_name.toLowerCase();
        const desc = (t.description ?? "").toLowerCase();
        const leader = t.team_members
          .find((m) => m.is_leader)
          ?.staff?.profiles?.full_name?.toLowerCase() ?? "";
        return name.includes(q) || desc.includes(q) || leader.includes(q);
      })
    );
  }, [search, teams]);

  // ─── Create / Edit team ────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTeam(null);
    setTeamForm({
      team_name: "",
      description: "",
      selectedStaffIds: [],
      leaderStaffId: "",
    });
    setTeamFormError(null);
    setTeamModalOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditTeam(team);
    setTeamForm({
      team_name: team.team_name,
      description: team.description ?? "",
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
      const isEdit = !!editTeam;

      if (isEdit) {
        const body: Record<string, unknown> = {};
        if (teamForm.team_name) body.team_name = teamForm.team_name;
        if (teamForm.description !== undefined)
          body.description = teamForm.description;

        const res = await fetchWithAuth(
          `${BASE_URL}/department/teams/${encodeURIComponent(editTeam!.team_name)}`,
          { method: "PATCH", body: JSON.stringify(body) }
        );
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (result as Record<string, unknown>)?.error as string ||
            "Update failed"
          );
        }
      } else {
        if (!teamForm.team_name.trim()) {
          throw new Error("Team name is required.");
        }

        const res = await fetchWithAuth(`${BASE_URL}/department/teams/create`, {
          method: "POST",
          body: JSON.stringify({
            team_name: teamForm.team_name.trim(),
            description: teamForm.description.trim() || undefined,
            member_staff_ids: teamForm.selectedStaffIds,
            leader_staff_id: teamForm.leaderStaffId || undefined,
          }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (result as Record<string, unknown>)?.error as string ||
            "Create failed"
          );
        }
      }

      setTeamModalOpen(false);
      await fetchTeams();
    } catch (err) {
      setTeamFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setTeamSubmitting(false);
    }
  };

  // ─── Members dialog ─────────────────────────────────────────────────────────

  const openMembers = (team: Team) => {
    setSelectedTeam(team);
    setAddMemberStaffId("");
    setMembersDialogOpen(true);
  };

  // Staff not already in this team
  const availableStaff = staffRoster.filter(
    (s) => !selectedTeam?.team_members.some((m) => m.staff_id === s.s_uid)
  );

  const handleAddMember = async () => {
    if (!selectedTeam || !addMemberStaffId) return;
    setMemberActionLoading(true);
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/department/teams/assign-member`,
        {
          method: "POST",
          body: JSON.stringify({
            team_id: selectedTeam.team_name,
            staff_id: addMemberStaffId,
            is_leader: false,
          }),
        }
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (result as Record<string, unknown>)?.error as string ||
          "Failed to add member"
        );
      }
      // Refresh teams and re-open members dialog with updated data
      await fetchTeams();
      // Find updated team
      const updatedRes = await fetchWithAuth(
        `${BASE_URL}/department/teams/${encodeURIComponent(selectedTeam.team_name)}`
      );
      if (updatedRes.ok) {
        const updatedData = await updatedRes.json();
        setSelectedTeam(
          (updatedData as Record<string, unknown>).data as Team
        );
      }
      setAddMemberStaffId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleToggleLeader = async (teamName: string, staffId: string, currentIsLeader: boolean) => {
    setMemberActionLoading(true);
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/department/teams/${encodeURIComponent(teamName)}/members/${staffId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_leader: !currentIsLeader }),
        }
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (result as Record<string, unknown>)?.error as string ||
          "Failed to update leader"
        );
      }
      await fetchTeams();
      const updatedRes = await fetchWithAuth(
        `${BASE_URL}/department/teams/${encodeURIComponent(teamName)}`
      );
      if (updatedRes.ok) {
        const updatedData = await updatedRes.json();
        setSelectedTeam(
          (updatedData as Record<string, unknown>).data as Team
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update leader");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleRemoveMember = async (teamName: string, staffId: string) => {
    setMemberActionLoading(true);
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/department/teams/${encodeURIComponent(teamName)}/members/${staffId}`,
        { method: "DELETE" }
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (result as Record<string, unknown>)?.error as string ||
          "Failed to remove member"
        );
      }
      await fetchTeams();
      const updatedRes = await fetchWithAuth(
        `${BASE_URL}/department/teams/${encodeURIComponent(teamName)}`
      );
      if (updatedRes.ok) {
        const updatedData = await updatedRes.json();
        setSelectedTeam(
          (updatedData as Record<string, unknown>).data as Team
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setMemberActionLoading(false);
    }
  };

  // ─── Deactivate team ───────────────────────────────────────────────────────

  const handleDeactivate = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/department/teams/${encodeURIComponent(deleteTarget.team_name)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: false }),
        }
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (result as Record<string, unknown>)?.error as string ||
          "Deactivate failed"
        );
      }
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
      await fetchTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivate failed");
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
          <GroupsIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Team Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create, manage, and monitor your department teams
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}
        >
          Add Team
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
          placeholder="Search by team name, description, or leader..."
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
                {["Team Name", "Leader", "Members", "Status", "Actions"].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 700 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No teams found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((team) => {
                  const leader = team.team_members.find((m) => m.is_leader);
                  const leaderName = leader?.staff?.profiles?.full_name ?? "—";
                  const memberCount = team.team_members.length;

                  return (
                    <TableRow
                      key={team.team_name}
                      sx={{
                        "&:hover": { bgcolor: "#f5f8ff" },
                        "&:last-child td": { border: 0 },
                      }}
                    >
                      {/* Team Name */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar
                            sx={{
                              bgcolor: team.is_active ? "primary.light" : "grey.300",
                              width: 36,
                              height: 36,
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            {getInitials(team.team_name)}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600}>
                              {team.team_name}
                            </Typography>
                            {team.description && (
                              <Typography variant="caption" color="text.secondary">
                                {team.description.length > 40
                                  ? team.description.slice(0, 40) + "..."
                                  : team.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Leader */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {leader && (
                            <StarIcon sx={{ fontSize: 16, color: "gold" }} />
                          )}
                          <Typography variant="body2">{leaderName}</Typography>
                        </Box>
                      </TableCell>

                      {/* Members */}
                      <TableCell>
                        <Chip
                          label={`${memberCount} member${memberCount !== 1 ? "s" : ""}`}
                          size="small"
                          variant="outlined"
                          color={memberCount > 0 ? "primary" : "default"}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Chip
                          label={team.is_active ? "Active" : "Inactive"}
                          color={team.is_active ? "success" : "default"}
                          size="small"
                          sx={{ textTransform: "capitalize" }}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton color="primary" size="small" onClick={() => openEdit(team)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Manage Members">
                          <IconButton
                            color="secondary"
                            size="small"
                            onClick={() => openMembers(team)}
                          >
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {team.is_active && (
                          <Tooltip title="Deactivate">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => {
                                setDeleteTarget(team);
                                setDeleteDialogOpen(true);
                              }}
                            >
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

      {/* ─── Create / Edit Team Dialog ─────────────────────────────────────── */}
      <Dialog
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTeam ? "Edit Team" : "Create New Team"}
        </DialogTitle>
        <form onSubmit={handleTeamSubmit}>
          <DialogContent dividers>
            {teamFormError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {teamFormError}
              </Alert>
            )}
            <Stack spacing={2}>
              <TextField
                label="Team Name"
                value={teamForm.team_name}
                onChange={(e) =>
                  setTeamForm((p) => ({ ...p, team_name: e.target.value }))
                }
                required
                fullWidth
                autoFocus
              />
              <TextField
                label="Description"
                value={teamForm.description}
                onChange={(e) =>
                  setTeamForm((p) => ({ ...p, description: e.target.value }))
                }
                fullWidth
                multiline
                rows={3}
                placeholder="Optional description for this team"
              />

              {!editTeam && (
                <>
                  <FormControl fullWidth>
                    <InputLabel id="add-staff-members-label">Assign Staff Members</InputLabel>
                    <Select
                      labelId="add-staff-members-label"
                      multiple
                      value={teamForm.selectedStaffIds}
                      onChange={(e) => {
                        const val =
                          typeof e.target.value === "string"
                            ? e.target.value.split(",")
                            : (e.target.value as string[]);
                        setTeamForm((p) => ({
                          ...p,
                          selectedStaffIds: val,
                          leaderStaffId: val.includes(p.leaderStaffId)
                            ? p.leaderStaffId
                            : "",
                        }));
                      }}
                      input={<OutlinedInput label="Assign Staff Members" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {selected.map((staffId) => {
                            const staff = staffRoster.find((s) => s.s_uid === staffId);
                            return (
                              <Chip
                                key={staffId}
                                label={staff?.profiles?.full_name ?? staffId}
                                size="small"
                              />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {staffRoster.length === 0 ? (
                        <MenuItem value="" disabled>
                          No staff available in department
                        </MenuItem>
                      ) : (
                        staffRoster.map((s) => (
                          <MenuItem key={s.s_uid} value={s.s_uid}>
                            {s.profiles?.full_name ?? "Unknown"}{" "}
                            {s.expertise ? `(${s.expertise})` : ""}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>

                  {teamForm.selectedStaffIds.length > 0 && (
                    <FormControl fullWidth>
                      <InputLabel id="select-team-leader-label">
                        Team Leader (Optional)
                      </InputLabel>
                      <Select
                        labelId="select-team-leader-label"
                        value={teamForm.leaderStaffId}
                        label="Team Leader (Optional)"
                        onChange={(e) =>
                          setTeamForm((p) => ({
                            ...p,
                            leaderStaffId: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {teamForm.selectedStaffIds.map((staffId) => {
                          const staff = staffRoster.find(
                            (s) => s.s_uid === staffId
                          );
                          return (
                            <MenuItem key={staffId} value={staffId}>
                              {staff?.profiles?.full_name ?? "Unknown"}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  )}
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setTeamModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={teamSubmitting}
            >
              {teamSubmitting
                ? "Saving..."
                : editTeam
                  ? "Save Changes"
                  : "Create Team"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ─── Members Dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
          <GroupsIcon />
          {selectedTeam?.team_name ?? "Team"} — Members
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={() => setMembersDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {memberActionLoading && (
            <CircularProgress size={20} sx={{ mr: 1 }} />
          )}

          {/* Add member section */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Add Member
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                select
                size="small"
                value={addMemberStaffId}
                onChange={(e) => setAddMemberStaffId(e.target.value)}
                sx={{ minWidth: 250 }}
                label="Select staff member"
              >
                {availableStaff.length === 0 && (
                  <MenuItem value="" disabled>
                    No available staff
                  </MenuItem>
                )}
                {availableStaff.map((s) => (
                  <MenuItem key={s.s_uid} value={s.s_uid}>
                    {s.profiles?.full_name ?? "Unknown"}{" "}
                    {s.expertise ? `(${s.expertise})` : ""}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                disabled={!addMemberStaffId || memberActionLoading}
                onClick={handleAddMember}
                sx={{ borderRadius: 2 }}
              >
                Add
              </Button>
            </Stack>
          </Paper>

          {/* Current members list */}
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Current Members ({selectedTeam?.team_members.length ?? 0})
          </Typography>
          {selectedTeam && selectedTeam.team_members.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No members in this team yet.
            </Typography>
          )}
          <List disablePadding>
            {selectedTeam?.team_members.map((member) => (
              <ListItem
                key={member.staff_id}
                divider
                sx={{ px: 0 }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: member.is_leader ? "gold" : "primary.light", width: 40, height: 40, fontSize: 14 }}>
                    {getInitials(member.staff?.profiles?.full_name)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography fontWeight={600}>
                        {member.staff?.profiles?.full_name ?? "Unknown"}
                      </Typography>
                      {member.is_leader && (
                        <Chip
                          label="Leader"
                          size="small"
                          color="warning"
                          icon={<StarIcon />}
                          sx={{ height: 22 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      {member.staff?.profiles?.email ?? ""}
                      {member.staff?.expertise ? ` • ${member.staff.expertise}` : ""}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title={member.is_leader ? "Remove leader" : "Make leader"}>
                    <IconButton
                      size="small"
                      color={member.is_leader ? "warning" : "default"}
                      disabled={memberActionLoading}
                      onClick={() =>
                        handleToggleLeader(
                          selectedTeam!.team_name,
                          member.staff_id,
                          member.is_leader
                        )
                      }
                    >
                      {member.is_leader ? (
                        <StarIcon fontSize="small" />
                      ) : (
                        <StarBorderIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove from team">
                    <IconButton
                      size="small"
                      color="error"
                      disabled={memberActionLoading}
                      onClick={() =>
                        handleRemoveMember(selectedTeam!.team_name, member.staff_id)
                      }
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setMembersDialogOpen(false)} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Deactivate Confirmation Dialog ─────────────────────────────────── */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Deactivate Team</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate the team{" "}
            <strong>{deleteTarget?.team_name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            The team will be marked as inactive. Members will not be removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleting}
            onClick={handleDeactivate}
          >
            {deleting ? "Deactivating..." : "Deactivate"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
