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
} from "@mui/material";
import {
  FiAlertCircle,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiBarChart2,
  FiActivity,
} from "react-icons/fi";
import { municipalityApi } from "../../../api/municipality";

interface DashboardData {
  municipality_id?: string;
  official_name?: string;
  pending_count: number;
  ongoing_count: number;
  resolved_count: number;
  rejected_count: number;
  total_complaints: number;
  dynamic_resolution_rate: number;
}

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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500, mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ p: 1.5, background: "rgba(255,255,255,0.2)", borderRadius: 3 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function Homepage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // The endpoint returns { success: boolean, data: DashboardData }
        const response = await municipalityApi.getDashboard();
        if (response.success && response.data) {
          setData(response.data);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err: any) {
        console.error("Dashboard error:", err);
        setError(err.response?.data?.error || err.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header Section */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", mb: 1 }}>
          Welcome back to {data.official_name || "your Dashboard"}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's an overview of the civic operations and grievance resolutions for your municipality.
        </Typography>
      </Box>

      {/* Main Metrics */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Complaints"
            value={data.total_complaints}
            icon={<FiActivity size={32} />}
            gradient="linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Resolution Rate"
            value={`${data.dynamic_resolution_rate}%`}
            icon={<FiBarChart2 size={32} />}
            gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Pending Actions"
            value={data.pending_count}
            icon={<FiAlertCircle size={32} />}
            gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
          />
        </Grid>
      </Grid>

      {/* Secondary Metrics */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: "text.primary" }}>
        Detailed Status Breakdown
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
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
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: "info.light", color: "info.main", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiClock size={28} />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Ongoing
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {data.ongoing_count}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
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
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: "success.light", color: "success.main", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiCheckCircle size={28} />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Resolved
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {data.resolved_count}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
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
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: "error.light", color: "error.main", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiXCircle size={28} />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Rejected
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {data.rejected_count}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
