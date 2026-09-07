import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stack,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  InputAdornment,
} from "@mui/material";
import {
  Star,
  StarBorder,
  Delete,
  Search,
  Close as CloseIcon,
  Groups,
  FlashOn,
  CleaningServices,
  Build,
  ElectricBolt,
  Plumbing,
} from "@mui/icons-material";
import { format, addDays } from "date-fns";
import { departmentApi } from "../api/modules/department.api";
import { BASE_URL, fetchWithAuth } from "../api";
import type { Team, CreateTeamDto } from "../api/types";

interface QuickCreateTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newTeam: Team) => void;
  initialPreset?: string;
}

interface StaffItem {
  s_uid: string;
  employee_id: string | null;
  expertise: string | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

const PRESETS = [
  {
    name: "Rapid Response Squad",
    icon: <FlashOn fontSize="small" />,
    desc: "Immediate on-field emergency triage and quick resolution squad.",
    durationDays: 14,
  },
  {
    name: "Roads & Civil Works Crew",
    icon: <Build fontSize="small" />,
    desc: "Pothole repair, drainage clearing, and civil infrastructure squad.",
    durationDays: 30,
  },
  {
    name: "Sanitation & Waste Team",
    icon: <CleaningServices fontSize="small" />,
    desc: "Solid waste management, garbage clearance, and hygiene operations.",
    durationDays: 30,
  },
  {
    name: "Electrical Maintenance Unit",
    icon: <ElectricBolt fontSize="small" />,
    desc: "Streetlight repairs, wire hazard fixes, and power supply maintenance.",
    durationDays: 30,
  },
  {
    name: "Water & Pipeline Squad",
    icon: <Plumbing fontSize="small" />,
    desc: "Pipeline leakage, water supply inspection, and drainage fixes.",
    durationDays: 30,
  },
];

export const QuickCreateTeamDialog: React.FC<QuickCreateTeamDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 14), "yyyy-MM-dd'T'HH:mm"));
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [leaderStaffId, setLeaderStaffId] = useState<string>("");
  
  const [staffRoster, setStaffRoster] = useState<StaffItem[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTeamName("");
      setDescription("");
      setStartDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setEndDate(format(addDays(new Date(), 14), "yyyy-MM-dd'T'HH:mm"));
      setSelectedStaffIds([]);
      setLeaderStaffId("");
      setError(null);
      fetchStaff();
    }
  }, [open]);

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/department/staff-roster`);
      if (res.ok) {
        const data = await res.json();
        const rawList = ((data as Record<string, unknown>).data as any[]) ?? [];
        setStaffRoster(rawList.map((item) => ({ ...item, s_uid: item.id || item.s_uid })));
      }
    } catch {
      // Ignore
    } finally {
      setLoadingStaff(false);
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    const randomSuffix = Math.floor(10 + Math.random() * 90);
    setTeamName(`${preset.name} ${randomSuffix}`);
    setDescription(preset.desc);
    setStartDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setEndDate(format(addDays(new Date(), preset.durationDays), "yyyy-MM-dd'T'HH:mm"));
  };

  const applyDuration = (days: number | null) => {
    const start = new Date();
    setStartDate(format(start, "yyyy-MM-dd'T'HH:mm"));
    if (days === null) {
      setEndDate("");
    } else {
      setEndDate(format(addDays(start, days), "yyyy-MM-dd'T'HH:mm"));
    }
  };

  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((sId) => sId !== id);
        if (leaderStaffId === id) {
          setLeaderStaffId(next.length > 0 ? next[0] : "");
        }
        return next;
      } else {
        const next = [...prev, id];
        if (prev.length === 0) {
          setLeaderStaffId(id);
        }
        return next;
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError("Please provide a team name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateTeamDto = {
        team_name: teamName.trim(),
        description: description.trim() || undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        member_staff_ids: selectedStaffIds,
        leader_staff_id: leaderStaffId || undefined,
      };
      const res = await departmentApi.createTeam(payload);
      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        throw new Error(res.error?.message || "Failed to create team");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create team. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaff = staffRoster.filter((s) => {
    const name = s.profiles?.full_name?.toLowerCase() || "";
    const email = s.profiles?.email?.toLowerCase() || "";
    const exp = s.expertise?.toLowerCase() || "";
    const q = staffSearch.toLowerCase().trim();
    return !q || name.includes(q) || email.includes(q) || exp.includes(q);
  });

  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar sx={{ bgcolor: "primary.main" }}>
            <Groups />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Create Operational Squad
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configure a dedicated team to deploy for grievance resolution
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={submitting}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ maxHeight: "75vh", overflowY: "auto" }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Quick Presets */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
              ⚡ QUICK SQUAD PRESETS (1-CLICK TEMPLATES)
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {PRESETS.map((preset) => (
                <Chip
                  key={preset.name}
                  icon={preset.icon}
                  label={preset.name}
                  onClick={() => applyPreset(preset)}
                  variant="outlined"
                  color="primary"
                  sx={{
                    fontWeight: 600,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "primary.50" },
                  }}
                />
              ))}
            </Box>
          </Box>

          <Stack spacing={2.5}>
            {/* Team Name */}
            <TextField
              required
              fullWidth
              label="Squad / Team Name"
              placeholder="e.g. Ward 4 Rapid Sanitation Unit"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              size="small"
            />

            {/* Description */}
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Operational Purpose & Scope (Optional)"
              placeholder="Describe primary responsibilities or specific target zone..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="small"
            />

            {/* Duration Shortcut Buttons */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
                DEPLOYMENT TIMEFRAME
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mb={1.5}>
                <Chip label="1 Week" size="small" onClick={() => applyDuration(7)} sx={{ cursor: "pointer" }} />
                <Chip label="2 Weeks" size="small" onClick={() => applyDuration(14)} sx={{ cursor: "pointer" }} />
                <Chip label="1 Month" size="small" onClick={() => applyDuration(30)} sx={{ cursor: "pointer" }} />
                <Chip label="Ongoing (No Expiry)" size="small" onClick={() => applyDuration(null)} sx={{ cursor: "pointer" }} />
              </Box>
              <Box display="flex" gap={2}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Start Date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="End Date (Leave blank if ongoing)"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Box>
            </Box>

            {/* Staff Member Selection */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  ASSIGN STAFF PERSONNEL ({selectedStaffIds.length} SELECTED)
                </Typography>
                {selectedStaffIds.length > 0 && (
                  <Button size="small" color="inherit" onClick={() => setSelectedStaffIds([])}>
                    Clear All
                  </Button>
                )}
              </Stack>

              {/* Search staff */}
              <TextField
                fullWidth
                size="small"
                placeholder="Search staff by name, email, or expertise..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1.5 }}
              />

              {loadingStaff ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress size={24} />
                </Box>
              ) : staffRoster.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" py={2}>
                  No department staff found in roster.
                </Typography>
              ) : (
                <Box
                  sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 2,
                    maxHeight: 220,
                    overflowY: "auto",
                    bgcolor: "grey.50",
                  }}
                >
                  <List dense disablePadding>
                    {filteredStaff.map((s) => {
                      const isSelected = selectedStaffIds.includes(s.s_uid);
                      const isLeader = leaderStaffId === s.s_uid;

                      return (
                        <ListItem
                          key={s.s_uid}
                          sx={{
                            bgcolor: isSelected ? "primary.50" : "transparent",
                            borderBottom: "1px solid #f0f0f0",
                            "&:hover": { bgcolor: isSelected ? "primary.100" : "grey.100" },
                            cursor: "pointer",
                          }}
                          onClick={() => toggleStaffSelection(s.s_uid)}
                        >
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" fontWeight={isSelected ? 700 : 500}>
                                  {s.profiles?.full_name || "Staff Member"}
                                </Typography>
                                {s.expertise && (
                                  <Chip
                                    label={s.expertise}
                                    size="small"
                                    sx={{ height: 18, fontSize: "0.68rem" }}
                                  />
                                )}
                                {isLeader && (
                                  <Chip
                                    icon={<Star sx={{ fontSize: "14px !important" }} />}
                                    label="Leader"
                                    size="small"
                                    color="warning"
                                    sx={{ height: 18, fontSize: "0.68rem", fontWeight: 700 }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={s.profiles?.email}
                          />
                          {isSelected && (
                            <ListItemSecondaryAction>
                              <Tooltip title={isLeader ? "Current Squad Leader" : "Make Squad Leader"}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLeaderStaffId(s.s_uid);
                                  }}
                                  sx={{ color: isLeader ? "warning.main" : "action.disabled" }}
                                >
                                  {isLeader ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove Member">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStaffSelection(s.s_uid);
                                  }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
          <Button onClick={onClose} disabled={submitting} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting || !teamName.trim()}>
            {submitting ? "Creating Squad..." : "Create Squad"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
