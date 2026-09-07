import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Chip,
  Avatar,
  IconButton,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  Divider,
} from "@mui/material";
import {
  Groups,
  Star,
  Add as AddIcon,
  Close as CloseIcon,
  CheckCircle,
  AssignmentTurnedIn,
} from "@mui/icons-material";
import { departmentApi } from "../api/modules/department.api";
import type { Team, DeptQueueComplaint, DeptComplaintDetail } from "../api/types";
import { QuickCreateTeamDialog } from "./QuickCreateTeamDialog";

interface QuickAssignSquadDialogProps {
  open: boolean;
  complaint: DeptQueueComplaint | DeptComplaintDetail | null;
  onClose: () => void;
  onAssigned: (assignedTeamName: string) => void;
}

export const QuickAssignSquadDialog: React.FC<QuickAssignSquadDialogProps> = ({
  open,
  complaint,
  onClose,
  onAssigned,
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quick create team modal trigger
  const [createTeamOpen, setCreateTeamOpen] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setSelectedTeamName("");
      setNotes("");
      setError(null);
      fetchTeams();
    }
  }, [open]);

  const fetchTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentApi.getTeams();
      if (res.success && res.data) {
        const rawTeams = Array.isArray(res.data) ? res.data : [];
        const activeTeams = rawTeams.filter((t: Team) => {
          if (!t.is_active) return false;
          if (t.end_date && new Date(t.end_date) < new Date()) return false;
          return true;
        });
        setTeams(activeTeams);
        // Pre-select first team if only 1 exists
        if (activeTeams.length === 1) {
          setSelectedTeamName(activeTeams[0].team_name);
        }
      } else {
        setError("Failed to load department squads.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load squads.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!complaint || !selectedTeamName) {
      setError("Please select a squad to deploy.");
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      const res = await departmentApi.assignComplaintToTeam(selectedTeamName, complaint.co_uid);
      if (res.success) {
        onAssigned(selectedTeamName);
        onClose();
      } else {
        throw new Error(res.error?.message || "Failed to assign squad.");
      }
    } catch (err: any) {
      setError(err.message || "Assignment failed. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const handleTeamCreated = (newTeam: Team) => {
    setTeams((prev) => [newTeam, ...prev]);
    setSelectedTeamName(newTeam.team_name);
  };

  if (!complaint) return null;

  return (
    <>
      <Dialog open={open} onClose={() => !assigning && onClose()} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: "primary.main" }}>
              <AssignmentTurnedIn />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Deploy Squad to Grievance
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Assign an operational team for on-site inspection and resolution
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" disabled={assigning}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Grievance Summary Card */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: "grey.50", borderRadius: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
              <Chip
                label={complaint.tracking_id}
                size="small"
                color="primary"
                sx={{ fontWeight: 700, height: 22, fontSize: "0.72rem" }}
              />
              {complaint.severity_level && (
                <Chip
                  label={complaint.severity_level.toUpperCase()}
                  size="small"
                  color={
                    complaint.severity_level === "urgent" || complaint.severity_level === "high"
                      ? "error"
                      : complaint.severity_level === "medium"
                      ? "warning"
                      : "default"
                  }
                  sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700 }}
                />
              )}
            </Stack>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>
              {complaint.title}
            </Typography>
            {complaint.description && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {complaint.description.length > 120
                  ? `${complaint.description.slice(0, 120)}...`
                  : complaint.description}
              </Typography>
            )}
          </Paper>

          {/* Squad Selection Header with "+ Create New Squad" */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              SELECT ACTIVE FIELD SQUAD ({teams.length} AVAILABLE)
            </Typography>
            <Button
              size="small"
              variant="text"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setCreateTeamOpen(true)}
              sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.78rem" }}
            >
              New Squad
            </Button>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={28} />
            </Box>
          ) : teams.length === 0 ? (
            <Box textAlign="center" py={3}>
              <Groups sx={{ fontSize: 44, color: "text.secondary", mb: 1 }} />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                No active operational squads found.
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Create a quick squad with staff personnel to handle this grievance.
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreateTeamOpen(true)}
              >
                Create Squad Now
              </Button>
            </Box>
          ) : (
            <Stack spacing={1.5} sx={{ mb: 2.5 }}>
              {teams.map((t) => {
                const isSelected = selectedTeamName === t.team_name;
                const leader = t.team_members?.find((m) => m.is_leader);
                const leaderName =
                  leader?.staff?.profiles?.full_name ||
                  (leader as any)?.staff?.full_name ||
                  (leader as any)?.profiles?.full_name ||
                  "No leader";
                const memberCount = t.team_members?.length || 0;

                return (
                  <Paper
                    key={t.team_name}
                    variant="outlined"
                    onClick={() => setSelectedTeamName(t.team_name)}
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      cursor: "pointer",
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? "primary.main" : "divider",
                      bgcolor: isSelected ? "primary.50" : "background.paper",
                      transition: "all 0.15s ease-in-out",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: isSelected ? "primary.50" : "grey.50",
                      },
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar
                          sx={{
                            bgcolor: isSelected ? "primary.main" : "grey.200",
                            color: isSelected ? "white" : "text.primary",
                            width: 36,
                            height: 36,
                            fontWeight: 700,
                            fontSize: "0.85rem",
                          }}
                        >
                          {t.team_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {t.team_name}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.25}>
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                              <Star sx={{ fontSize: 13, color: "warning.main" }} /> Leader: <b>{leaderName}</b>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {memberCount} staff
                            </Typography>
                          </Stack>
                        </Box>
                      </Box>

                      {isSelected ? (
                        <CheckCircle color="primary" />
                      ) : (
                        <Chip
                          label="Select"
                          size="small"
                          variant="outlined"
                          sx={{ cursor: "pointer", fontSize: "0.72rem", height: 24 }}
                        />
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}

          {/* Deployment / Field Instructions */}
          <Divider sx={{ my: 2 }} />
          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            label="Field Dispatch Note (Optional)"
            placeholder="e.g. Inspect drainage block near main intersection, take before/after photos..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
          <Button onClick={onClose} disabled={assigning} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={assigning || !selectedTeamName}
            onClick={handleAssign}
            sx={{ px: 3, fontWeight: 700 }}
          >
            {assigning ? "Deploying Squad..." : "Deploy Squad"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Embedded Quick Create Squad Modal */}
      <QuickCreateTeamDialog
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        onSuccess={handleTeamCreated}
      />
    </>
  );
};
