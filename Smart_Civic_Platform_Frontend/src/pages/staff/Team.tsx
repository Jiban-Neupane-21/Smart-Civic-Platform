import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import GroupsIcon from "@mui/icons-material/Groups";
import StarIcon from "@mui/icons-material/Star";
import BusinessIcon from "@mui/icons-material/Business";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PersonIcon from "@mui/icons-material/Person";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EmailIcon from "@mui/icons-material/Email";
import { format, parseISO } from "date-fns";

import staffApi from "../../api/modules/staff.api";
import type {
  StaffDepartmentInfo,
  StaffTeamMembership,
  StaffScheduleAssignment,
} from "../../api/types";

export const StaffTeamPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [department, setDepartment] = useState<StaffDepartmentInfo | null>(null);
  const [teams, setTeams] = useState<StaffTeamMembership[]>([]);
  const [schedules, setSchedules] = useState<StaffScheduleAssignment[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, teamsRes, schedRes] = await Promise.allSettled([
        staffApi.getMyDepartment(),
        staffApi.getMyTeams(),
        staffApi.getMySchedule(),
      ]);

      if (deptRes.status === "fulfilled" && deptRes.value?.success) {
        setDepartment(deptRes.value.data);
      }

      if (teamsRes.status === "fulfilled" && teamsRes.value?.success) {
        setTeams(Array.isArray(teamsRes.value.data) ? teamsRes.value.data : []);
      }

      if (schedRes.status === "fulfilled" && schedRes.value?.success) {
        setSchedules(Array.isArray(schedRes.value.data) ? schedRes.value.data : []);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return format(parseISO(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return format(parseISO(dateStr), "MMM dd, yyyy • hh:mm a");
    } catch {
      return dateStr;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            My Team & Operations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View your active team assignments, department info, and field schedules.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
          size="small"
        >
          Refresh
        </Button>
      </Stack>

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
        <Stack spacing={3}>
          {/* Department Info Card */}
          {department && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                background: "linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0.01) 100%)",
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: "primary.main",
                        width: 52,
                        height: 52,
                      }}
                    >
                      <BusinessIcon fontSize="medium" />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" color="primary.main" fontWeight={600}>
                        ASSIGNED DEPARTMENT
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {department.department_name}
                      </Typography>
                      <Chip
                        label={department.department_category.replace(/_/g, " ").toUpperCase()}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mt: 0.5, fontSize: "0.7rem", height: 20 }}
                      />
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 1, sm: 3 }}
                    justifyContent={{ md: "flex-end" }}
                  >
                    {department.head_name && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Department Head
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight={600}>
                            {department.head_name}
                          </Typography>
                        </Stack>
                      </Box>
                    )}

                    {department.official_email && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Official Email
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight={500}>
                            {department.official_email}
                          </Typography>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Active Teams Section */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <GroupsIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Active Team Memberships ({teams.length})
              </Typography>
            </Stack>

            {teams.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: "center",
                  borderRadius: 3,
                  border: "1px dashed",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                <GroupsIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
                  No Team Assigned Yet
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  You have not been assigned to any operational team by your Department Head.
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {teams.map((teamMembership) => {
                  const teamInfo = teamMembership.teams;
                  const isActive = teamInfo?.is_active ?? true;

                  return (
                    <Grid item xs={12} sm={6} md={4} key={teamMembership.id}>
                      <Card
                        elevation={0}
                        sx={{
                          height: "100%",
                          borderRadius: 3,
                          border: "1px solid",
                          borderColor: "divider",
                          transition: "box-shadow 0.2s, transform 0.2s",
                          "&:hover": {
                            boxShadow: 2,
                            transform: "translateY(-2px)",
                          },
                        }}
                      >
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                            <Box>
                              <Typography variant="h6" fontWeight={700}>
                                {teamInfo?.team_name || "Operational Team"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Joined {formatDate(teamMembership.joined_at)}
                              </Typography>
                            </Box>
                            <Chip
                              label={isActive ? "Active" : "Inactive"}
                              size="small"
                              color={isActive ? "success" : "default"}
                              variant="filled"
                            />
                          </Stack>

                          <Divider sx={{ my: 1.5 }} />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              Your Role
                            </Typography>
                            {teamMembership.is_leader ? (
                              <Chip
                                icon={<StarIcon sx={{ "&&": { color: "#ffb300" } }} />}
                                label="Team Leader"
                                size="small"
                                sx={{
                                  bgcolor: "rgba(255, 179, 0, 0.12)",
                                  color: "#b27b00",
                                  fontWeight: 600,
                                }}
                              />
                            ) : (
                              <Chip
                                label="Team Member"
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>

          {/* Schedule & Operational Assignments Section */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <EventNoteIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Field Assignments & Schedule ({schedules.length})
              </Typography>
            </Stack>

            {schedules.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: "center",
                  borderRadius: 3,
                  border: "1px dashed",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                <EventNoteIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
                  No Field Schedules Found
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  No upcoming or previous field schedule timeline items assigned to you.
                </Typography>
              </Paper>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                }}
              >
                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: "action.hover" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Team / Operation</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Schedule Period</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Type / Flag</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Assigned Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schedules.map((item) => {
                        const isReleased = !!item.released_at;
                        return (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {item.team?.team_name || "Assigned Team"}
                              </Typography>
                              {item.team?.description && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {item.team.description}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <AccessTimeIcon fontSize="small" color="action" />
                                <Typography variant="body2">
                                  {formatDate(item.start_date)} - {formatDate(item.end_date)}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              {item.is_emergency_override ? (
                                <Tooltip title={item.override_reason || "Emergency Override"}>
                                  <Chip
                                    icon={<WarningAmberIcon fontSize="small" />}
                                    label="Emergency"
                                    color="error"
                                    size="small"
                                  />
                                </Tooltip>
                              ) : (
                                <Chip
                                  label={item.team?.team_type?.replace(/_/g, " ") || "Standard"}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {isReleased ? (
                                <Tooltip title={`Released: ${item.release_reason || "Completed"}`}>
                                  <Chip
                                    label="Released"
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                  />
                                </Tooltip>
                              ) : (
                                <Chip
                                  icon={<CheckCircleIcon fontSize="small" />}
                                  label="Active Schedule"
                                  size="small"
                                  color="success"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(item.created_at)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default StaffTeamPage;
