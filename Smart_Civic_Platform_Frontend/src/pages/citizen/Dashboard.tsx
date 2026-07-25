import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Container,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
} from "@mui/material";
import {
  Article, // Replaces FileText
  ReportProblem, // Replaces AlertTriangle
  Notifications, // Replaces Bell
  AccessTime, // Replaces Clock
  ChevronRight,
} from "@mui/icons-material";
import type { CitizenDashboardData } from "../../types/dashboard.type";
import { Bold } from "lucide-react";

export const CitizenDashboard: React.FC = () => {
  const [data, setData] = useState<CitizenDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Replace with your actual API integration setup
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:3000/api/citizen/dashboard", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || "Failed to fetch dashboard data.");
        }
      } catch (err) {
        setError("A network error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusChipColor = (
    status?: string,
  ): "success" | "info" | "warning" | "default" => {
    switch (status) {
      case "resolved":
        return "success";
      case "in_progress":
        return "info";
      case "pending":
      case "open":
        return "warning";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "80vh",
          }}
        >
          <CircularProgress />
        </Box>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="lg" sx={{ mt: 5 }}>
        <Alert severity="error" variant="outlined">
          <Typography sx={{ fontWeight: "bold" }}>
            Error Loading Dashboard
          </Typography>
          {error || "Something went wrong."}
        </Alert>
      </Container>
    );
  }

  const { summary, recentComplaints, recentIncidents, recentNotifications } =
    data;

  return (
    <Box sx={{ bgcolor: "grey.50", p: { xs: 2, md: 4 }, minHeight: "100vh" }}>
      <Container
        maxWidth="xl"
        sx={{ display: "flex", flexDirection: "column", gap: 4 }}
      >
        {/* Header Section */}
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Citizen Dashboard
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Track your submitted complaints, community incidents, and local
            notices.
          </Typography>
        </Box>

        {/* KPI Metrics Summary Grid */}
        <Grid container spacing={3}>
          {/* Total Complaints */}
          <Grid item xs={12} sm={6} lg={3}>
            <Card
              variant="outlined"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase" }}
                >
                  Total Complaints
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {summary.totalComplaints}
                </Typography>
                <Typography
                  variant="caption"
                  color="success.main"
                  fontWeight="medium"
                >
                  {summary.resolvedComplaints} Resolved
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                <Article />
              </Avatar>
            </Card>
          </Grid>
          {/* Pending Action */}
          <Grid item xs={12} sm={6} lg={3}>
            <Card
              variant="outlined"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase" }}
                >
                  Pending Action
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {summary.pendingComplaints}
                </Typography>
                <Typography
                  variant="caption"
                  color="warning.main"
                  fontWeight="medium"
                >
                  Awaiting review
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: "warning.light", color: "warning.main" }}>
                <AccessTime />
              </Avatar>
            </Card>
          </Grid>
          {/* Active Incidents */}
          <Grid item xs={12} sm={6} lg={3}>
            <Card
              variant="outlined"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase" }}
                >
                  Active Incidents
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {summary.activeIncidentsReported}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Public updates
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: "error.light", color: "error.main" }}>
                <ReportProblem />
              </Avatar>
            </Card>
          </Grid>
          {/* Notifications */}
          <Grid item xs={12} sm={6} lg={3}>
            <Card
              variant="outlined"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase" }}
                >
                  Notifications
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {summary.unreadNotifications}
                </Typography>
                <Typography
                  variant="caption"
                  color="info.main"
                  fontWeight="medium"
                >
                  Unread updates
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: "info.light", color: "info.main" }}>
                <Notifications />
              </Avatar>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Layout Split */}
        <Grid container spacing={4}>
          {/* Column 1 & 2: Complaints & Incidents */}
          <Grid
            item
            xs={12}
            lg={8}
            sx={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            {/* Recent Complaints */}
            <Card variant="outlined">
              <CardContent
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="h6"
                  component="h2"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Article color="primary" /> Recent Complaints
                </Typography>
                <Button size="small" endIcon={<ChevronRight />}>
                  View All
                </Button>
              </CardContent>
              <Divider />
              <List disablePadding>
                {recentComplaints.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No complaints filed yet."
                      sx={{ textAlign: "center", color: "text.secondary" }}
                    />
                  </ListItem>
                ) : (
                  recentComplaints.map((complaint) => (
                    <ListItem key={complaint.co_uid} divider>
                      <ListItemText
                        primary={complaint.title}
                        secondary={new Date(
                          complaint.created_at,
                        ).toLocaleDateString()}
                      />
                      <Chip
                        label={complaint.status?.replace("_", " ")}
                        color={getStatusChipColor(complaint.status)}
                        size="small"
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Card>

            {/* Recent Incidents */}
            <Card variant="outlined">
              <CardContent
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="h6"
                  component="h2"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ReportProblem color="warning" /> Hazard & Incident Reports
                </Typography>
                <Button size="small" endIcon={<ChevronRight />}>
                  View All
                </Button>
              </CardContent>
              <Divider />
              <List disablePadding>
                {recentIncidents.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No community incidents reported."
                      sx={{ textAlign: "center", color: "text.secondary" }}
                    />
                  </ListItem>
                ) : (
                  recentIncidents.map((incident) => (
                    <ListItem key={incident.id} divider>
                      <ListItemText
                        primary={incident.title}
                        secondary={new Date(
                          incident.created_at,
                        ).toLocaleDateString()}
                      />
                      <Chip
                        label={incident.status || "Active"}
                        color={getStatusChipColor(incident.status)}
                        size="small"
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Card>
          </Grid>

          {/* Column 3: Notifications Feed */}
          <Grid item xs={12} lg={4}>
            <Card variant="outlined">
              <CardContent
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="h6"
                  component="h2"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Notifications color="info" /> Notifications
                </Typography>
                {summary.unreadNotifications > 0 && (
                  <Chip
                    label={`${summary.unreadNotifications} New`}
                    color="info"
                    size="small"
                  />
                )}
              </CardContent>
              <Divider />
              <List disablePadding>
                {recentNotifications.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No new notifications."
                      sx={{ textAlign: "center", color: "text.secondary" }}
                    />
                  </ListItem>
                ) : (
                  recentNotifications.map((notif) => (
                    <ListItem
                      key={notif.id}
                      divider
                      sx={{
                        borderLeft: 4,
                        borderColor: notif.is_read
                          ? "transparent"
                          : "info.main",
                        bgcolor: notif.is_read ? "transparent" : "info.light",
                        alignItems: "flex-start",
                      }}
                    >
                      <ListItemText
                        primary={notif.title}
                        primaryTypographyProps={{
                          fontWeight: notif.is_read ? "normal" : "bold",
                        }}
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                              sx={{ display: "block", whiteSpace: "pre-wrap" }}
                            >
                              {notif.message}
                            </Typography>
                            {new Date(notif.created_at).toLocaleString()}
                          </>
                        }
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
