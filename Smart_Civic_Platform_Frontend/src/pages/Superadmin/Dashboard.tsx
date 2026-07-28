import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Skeleton,
} from "@mui/material";
import { FiBriefcase, FiGrid, FiUsers, FiUser, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { MdOutlinePeople } from "react-icons/md";
import { superadminApi } from "../../api";
import type { SuperadminStats } from "../../api/types";

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 3, display: "flex", alignItems: "center", gap: 2 }}>
      <Box sx={{ width: 52, height: 52, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: `${color}15`, color }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
      </Box>
    </Paper>
  );
}

export default function SuperadminDashboard() {
  const [data, setData] = useState<SuperadminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await superadminApi.getAnalytics();
      if (res.success) {
        setData(res.data);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        setError("Failed to load analytics data");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={280} height={48} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[...Array(8)].map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button variant="outlined" onClick={fetchData}>Retry</Button>
      </Box>
    );
  }

  const allZero = data && Object.values(data).every(v => v === 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
          Superadmin Dashboard
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">Last updated: {lastUpdated}</Typography>
          )}
          <Button variant="outlined" size="small" onClick={fetchData} disabled={loading}>
            {loading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
            Refresh
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

      {allZero ? (
        <Paper sx={{ p: 6, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No data available yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start by provisioning a municipality to see analytics.
          </Typography>
          <Button variant="contained" href="/superadmin/manage-municipality">
            Go to Manage Municipalities
          </Button>
        </Paper>
      ) : (
        <>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "text.secondary" }}>System Overview</Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Municipalities" value={data?.total_municipalities ?? 0} icon={<FiBriefcase size={24} />} color="#1976d2" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Departments" value={data?.total_departments ?? 0} icon={<FiGrid size={24} />} color="#7b1fa2" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Staff" value={data?.total_staff ?? 0} icon={<FiUsers size={24} />} color="#2e7d32" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Citizens" value={data?.total_citizens ?? 0} icon={<MdOutlinePeople size={24} />} color="#ed6c02" />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "text.secondary" }}>User Status</Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Active Users" value={data?.total_active_users ?? 0} icon={<FiUser size={24} />} color="#2e7d32" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Suspended Users" value={data?.total_suspended_users ?? 0} icon={<FiAlertTriangle size={24} />} color="#d32f2f" />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "text.secondary" }}>Complaints</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Pending" value={data?.total_pending_complaints ?? 0} icon={<FiAlertTriangle size={24} />} color="#ed6c02" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Resolved" value={data?.total_resolved_complaints ?? 0} icon={<FiCheckCircle size={24} />} color="#2e7d32" />
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
