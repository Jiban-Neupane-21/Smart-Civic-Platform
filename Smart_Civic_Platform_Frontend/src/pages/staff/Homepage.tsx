import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import RefreshIcon from "@mui/icons-material/Refresh";
import GroupsIcon from "@mui/icons-material/Groups";
import AssignmentIcon from "@mui/icons-material/Assignment";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BusinessIcon from "@mui/icons-material/Business";
import StarIcon from "@mui/icons-material/Star";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PersonIcon from "@mui/icons-material/Person";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { format, parseISO } from "date-fns";

import staffApi from "../../api/modules/staff.api";
import type {
  StaffProfile,
  StaffDepartmentInfo,
  StaffTeamMembership,
  StaffScheduleAssignment,
} from "../../api/types";

export const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [department, setDepartment] = useState<StaffDepartmentInfo | null>(null);
  const [teams, setTeams] = useState<StaffTeamMembership[]>([]);
  const [schedules, setSchedules] = useState<StaffScheduleAssignment[]>([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profRes, deptRes, teamRes, schedRes] = await Promise.allSettled([
        staffApi.getMyProfile(),
        staffApi.getMyDepartment(),
        staffApi.getMyTeams(),
        staffApi.getMySchedule(),
      ]);

      if (profRes.status === "fulfilled" && profRes.value?.success) {
        setProfile(profRes.value.data);
      }
      if (deptRes.status === "fulfilled" && deptRes.value?.success) {
        setDepartment(deptRes.value.data);
      }
      if (teamRes.status === "fulfilled" && teamRes.value?.success) {
        setTeams(Array.isArray(teamRes.value.data) ? teamRes.value.data : []);
      }
      if (schedRes.status === "fulfilled" && schedRes.value?.success) {
        setSchedules(Array.isArray(schedRes.value.data) ? schedRes.value.data : []);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const activeTeamsCount = teams.filter((t) => t.teams?.is_active ?? true).length;
  const activeSchedules = schedules.filter((s) => !s.released_at);
  const emergencySchedulesCount = schedules.filter((s) => s.is_emergency_override && !s.released_at).length;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return format(parseISO(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
      {/* Welcome Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 4,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={3}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Chip
                label="STAFF PORTAL"
                size="small"
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  fontWeight: 700,
                  letterSpacing: 0.5,
                }}
              />
              {profile?.municipality?.official_name && (
                <Chip
                  label={profile.municipality.official_name}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.15)",
                    color: "white",
                  }}
                />
              )}
            </Stack>

            <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
              Welcome back, {profile?.profile?.full_name || "Staff Member"}!
            </Typography>

            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {department?.department_name || profile?.department?.department_name || "Civic Field Operations"}
              {profile?.employee_id ? ` • Employee ID: ${profile.employee_id}` : ""}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              onClick={() => navigate("/staff/team")}
              sx={{
                bgcolor: "white",
                color: "#1e3a8a",
                fontWeight: 700,
                "&:hover": { bgcolor: "grey.100" },
              }}
              endIcon={<ArrowForwardIcon />}
            >
              My Team
            </Button>
            <IconButton
              onClick={loadDashboardData}
              disabled={loading}
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.15)",
                color: "white",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.25)" },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={4}>
          {/* Key Metrics Cards */}
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": { boxShadow: 2, transform: "translateY(-2px)" },
                }}
                onClick={() => navigate("/staff/team")}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      ACTIVE TEAMS
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
                      {activeTeamsCount}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", width: 48, height: 48 }}>
                    <GroupsIcon />
                  </Avatar>
                </Stack>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": { boxShadow: 2, transform: "translateY(-2px)" },
                }}
                onClick={() => navigate("/staff/complaint")}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      FIELD SCHEDULES
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="info.main" sx={{ mt: 0.5 }}>
                      {activeSchedules.length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "info.light", color: "info.main", width: 48, height: 48 }}>
                    <EventNoteIcon />
                  </Avatar>
                </Stack>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  transition: "all 0.2s",
                  "&:hover": { boxShadow: 2, transform: "translateY(-2px)" },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      EMERGENCY TASKS
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="error.main" sx={{ mt: 0.5 }}>
                      {emergencySchedulesCount}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "error.light", color: "error.main", width: 48, height: 48 }}>
                    <WarningAmberIcon />
                  </Avatar>
                </Stack>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": { boxShadow: 2, transform: "translateY(-2px)" },
                }}
                onClick={() => navigate("/staff/profile")}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      ACCOUNT STATUS
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main" sx={{ mt: 0.5 }}>
                      {profile?.profile?.account_status?.toUpperCase() || "ACTIVE"}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "success.light", color: "success.main", width: 48, height: 48 }}>
                    <CheckCircleIcon />
                  </Avatar>
                </Stack>
              </Card>
            </Grid>
          </Grid>

          {/* Two Columns: Team Overview & Recent Operations */}
          <Grid container spacing={3}>
            {/* Current Team Widget */}
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  height: "100%",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <GroupsIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Current Teams
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate("/staff/team")}
                  >
                    View All
                  </Button>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {teams.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <GroupsIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No operational team assigned yet.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {teams.slice(0, 3).map((membership) => (
                      <Card
                        key={membership.id}
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: "action.hover",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {membership.teams?.team_name || "Operational Team"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Joined {formatDate(membership.joined_at)}
                            </Typography>
                          </Box>
                          {membership.is_leader ? (
                            <Chip
                              icon={<StarIcon sx={{ "&&": { color: "#ffb300" } }} />}
                              label="Leader"
                              size="small"
                              sx={{
                                bgcolor: "rgba(255, 179, 0, 0.12)",
                                color: "#b27b00",
                                fontWeight: 700,
                              }}
                            />
                          ) : (
                            <Chip label="Member" size="small" variant="outlined" />
                          )}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* Upcoming Field Schedules Widget */}
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  height: "100%",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EventNoteIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Active Field Schedules
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate("/staff/complaint")}
                  >
                    All Tasks
                  </Button>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {activeSchedules.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <EventNoteIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No active field schedule assigned.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    {activeSchedules.slice(0, 4).map((sched) => (
                      <Box
                        key={sched.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: sched.is_emergency_override ? "error.50" : "background.paper",
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {sched.team?.team_name || "Field Team Task"}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                              <AccessTimeIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(sched.start_date)} - {formatDate(sched.end_date)}
                              </Typography>
                            </Stack>
                          </Box>

                          {sched.is_emergency_override ? (
                            <Chip
                              label="Emergency"
                              size="small"
                              color="error"
                            />
                          ) : (
                            <Chip
                              label={sched.team?.team_type || "Active"}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      )}
    </Box>
  );
};

export default StaffDashboard;
