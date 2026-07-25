import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  FiGrid,
  FiCheckCircle,
  FiClock,
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiUsers,
  FiGitBranch,
  FiEye,
  FiArchive,
  FiXCircle,
  FiList,
} from "react-icons/fi";
import { departmentApi } from "../../api/department";
import type {
  DepartmentDashboardData,
  DepartmentComplaintStatus,
} from "../../types/dashboard.type";

const StatCard = ({
  title,
  value,
  icon,
  gradient,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
}) => (
  <Card
    sx={{
      background: gradient,
      color: "white",
      borderRadius: 4,
      boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
      transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
      "&:hover": {
        transform: "translateY(-5px)",
        boxShadow: "0 15px 30px rgba(0,0,0,0.15)",
      },
    }}
  >
    <CardContent sx={{ p: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{ opacity: 0.9, fontWeight: 500, mb: 1 }}
          >
            {title}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 1.5,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 3,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const getStatusChipColor = (
  status: DepartmentComplaintStatus,
): "default" | "warning" | "info" | "success" | "error" => {
  switch (status) {
    case "resolved":
    case "closed":
      return "success";
    case "in_progress":
      return "info";
    case "under_review":
      return "warning";
    case "rejected":
      return "error";
    default:
      return "default";
  }
};

export const DeptDashboard: React.FC = () => {
  const [data, setData] = useState<DepartmentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const dashboardData = await departmentApi.getDashboard();
        setData(dashboardData);
      } catch (err: unknown) {
        console.error("Department dashboard error:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load department dashboard data";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!data) return null;

  const {
    department_name,
    totalComplaints,
    resolutionRate,
    pending,
    under_review,
    in_progress,
    resolved,
    rejected,
    closed,
    totalStaff,
    activeTeams,
    recentComplaints,
  } = data;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header Section */}
      <Box sx={{ mb: 5 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, color: "text.primary", mb: 1 }}
        >
          Welcome to {department_name} Department 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's a comprehensive overview of your department's grievance
          operations, personnel, and active response teams.
        </Typography>
      </Box>

      {/* Primary Metrics */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Complaints"
            value={totalComplaints}
            icon={<FiGrid size={32} />}
            gradient="linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Resolution Rate"
            value={`${resolutionRate}%`}
            icon={<FiBarChart2 size={32} />}
            gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Pending"
            value={pending}
            icon={<FiAlertCircle size={32} />}
            gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
          />
        </Grid>
      </Grid>

      {/* Secondary Status Breakdown */}
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, mb: 3, color: "text.primary" }}
      >
        Complaint Status Breakdown
      </Typography>
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "warning.light",
                color: "warning.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiEye size={28} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                Under Review
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {under_review}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "info.light",
                color: "info.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiClock size={28} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                In Progress
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {in_progress}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "success.light",
                color: "success.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiCheckCircle size={28} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                Resolved
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {resolved}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "success.light",
                color: "success.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiArchive size={28} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                Closed
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {closed}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "error.light",
                color: "error.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiXCircle size={28} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                Rejected
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {rejected}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "primary.light",
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiActivity size={28} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                Total Staff
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {totalStaff}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Personnel & Teams */}
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, mb: 3, color: "text.primary" }}
      >
        Personnel &amp; Teams
      </Typography>
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "secondary.light",
                color: "secondary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiUsers size={28} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                Active Staff
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {totalStaff}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "info.light",
                color: "info.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiGitBranch size={28} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                Active Teams
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {activeTeams}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

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
            <FiList color="#6366F1" /> Recent Complaints
          </Typography>
        </CardContent>
        <Divider />
        <List disablePadding>
          {recentComplaints.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No complaints assigned to this department yet."
                sx={{ textAlign: "center", color: "text.secondary" }}
              />
            </ListItem>
          ) : (
            recentComplaints.map((complaint) => (
              <ListItem key={complaint.co_uid} divider>
                <ListItemText
                  primary={complaint.title}
                  secondary={new Date(
                    complaint.submitted_date,
                  ).toLocaleDateString()}
                />
                <Chip
                  label={complaint.status.replace("_", " ")}
                  color={getStatusChipColor(complaint.status)}
                  size="small"
                />
              </ListItem>
            ))
          )}
        </List>
      </Card>
    </Box>
  );
};
