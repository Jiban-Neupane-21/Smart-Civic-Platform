import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  Stack,
  alpha,
  useTheme,
} from "@mui/material";
import {
  FiBarChart2,
  FiDownload,
  FiPrinter,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiLayers,
  FiFilter,
  FiSearch,
  FiTrendingUp,
  FiMapPin,
  FiActivity,
  FiShield,
  FiExternalLink,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import departmentApi from "../../api/modules/department.api";

// ── Types ────────────────────────────────────────────────────────────
interface DepartmentAnalyticsData {
  department: {
    id: string;
    name: string;
    category?: string | null;
  };
  summary: {
    totalComplaints: number;
    pending: number;
    under_review: number;
    in_progress: number;
    resolved: number;
    rejected: number;
    closed: number;
    activeWorkload: number;
    resolvedTotal: number;
    resolutionRate: number;
    totalStaff: number;
    activeTeams: number;
    totalCollaborations: number;
  };
  sla: {
    breachedCount: number;
    onTimeCount: number;
    slaComplianceRate: number;
    avgResolutionHours: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
    emergency: number;
  };
  severityCounts: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  wardBreakdown: Array<{
    ward_number: number;
    total: number;
    resolved: number;
    pending: number;
    in_progress: number;
  }>;
  categoryBreakdown: Array<{
    category_name: string;
    total: number;
    resolved: number;
  }>;
  teamWorkload: Array<{
    id: string;
    team_name: string;
    is_active: boolean;
    team_type: string;
    total_assigned: number;
    resolved: number;
    pending: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    submitted: number;
    resolved: number;
  }>;
}

// ── Stat Card Component ──────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  badgeText?: string;
  badgeColor?: "success" | "error" | "warning" | "info" | "default";
}

function StatItem({
  title,
  value,
  subtitle,
  icon,
  color,
  badgeText,
  badgeColor = "default",
}: StatCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3.5,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 4,
          height: "100%",
          bgcolor: color,
        }}
      />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
        <Box
          sx={{
            p: 1.2,
            borderRadius: 2.5,
            bgcolor: alpha(color, 0.12),
            color: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.3rem",
          }}
        >
          {icon}
        </Box>
        {badgeText && (
          <Chip
            size="small"
            label={badgeText}
            color={badgeColor}
            sx={{ fontWeight: 600, fontSize: "0.72rem", height: 22 }}
          />
        )}
      </Box>

      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
          {subtitle}
        </Typography>
      )}
    </Card>
  );
}

// ── Horizontal Progress Bar ──────────────────────────────────────────
function MetricBar({
  label,
  value,
  total,
  color,
  caption,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  caption?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.6 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: color }}>
          {value} <span style={{ color: "gray", fontWeight: 400 }}>({pct}%)</span>
        </Typography>
      </Box>
      <Box
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(color, 0.12),
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 4,
            bgcolor: color,
            transition: "width 0.4s ease-in-out",
          }}
        />
      </Box>
      {caption && (
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.3 }}>
          {caption}
        </Typography>
      )}
    </Box>
  );
}

// ── Main Page Component ──────────────────────────────────────────────
export default function ReportAnalytics() {
  const theme = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<DepartmentAnalyticsData | null>(null);
  const [queueComplaints, setQueueComplaints] = useState<any[]>([]);

  // Filter & Pagination states
  const [activeTab, setActiveTab] = useState<number>(0);
  const [dateRange, setDateRange] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Load analytics data from backend
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // 1. Fetch complaints queue
      let queueData: any[] = [];
      try {
        const queueRes = await departmentApi.getQueue();
        if (queueRes?.success && Array.isArray(queueRes.data)) {
          queueData = queueRes.data;
          setQueueComplaints(queueData);
        }
      } catch (qErr: any) {
        console.warn("Queue fetch warning:", qErr);
      }

      // 2. Fetch pre-aggregated backend analytics
      try {
        const analyticsRes = await departmentApi.getAnalytics();
        if (analyticsRes?.success && analyticsRes.data) {
          setAnalyticsData(analyticsRes.data);
        }
      } catch (aErr: any) {
        console.warn("Backend analytics endpoint fallback:", aErr);
      }
    } catch (err: any) {
      console.error("Error loading department report analytics:", err);
      setError(err.message || "Failed to load department analytics data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Export CSV handler
  const handleExportCsv = async () => {
    try {
      const blob = await departmentApi.exportComplaintsCsv();
      const url = window.URL.createObjectURL(new Blob([blob], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `department_complaints_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error("Export CSV error:", err);
      // Client-side fallback if blob export endpoint has issues
      if (queueComplaints.length > 0) {
        const headers = ["Tracking ID", "Title", "Status", "Priority", "Ward", "Submitted Date", "SLA Due"];
        const rows = queueComplaints.map((c) => [
          c.tracking_id || c.co_uid,
          `"${(c.title || "").replace(/"/g, '""')}"`,
          c.status,
          c.priority || "Medium",
          c.ward_number || "N/A",
          c.submitted_date || "",
          c.sla_due_at || "",
        ]);
        const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `department_complaints_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    }
  };

  // Filtered Complaints for Table
  const filteredComplaints = useMemo(() => {
    return queueComplaints.filter((item) => {
      // Date filter
      if (dateRange !== "all" && item.submitted_date) {
        const itemDate = new Date(item.submitted_date);
        const now = new Date();
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        if (dateRange === "7" && diffDays > 7) return false;
        if (dateRange === "30" && diffDays > 30) return false;
        if (dateRange === "90" && diffDays > 90) return false;
      }

      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "all") {
        const itemPrio = (item.priority || "medium").toLowerCase();
        if (itemPrio !== priorityFilter.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (item.title || "").toLowerCase().includes(q);
        const trackMatch = (item.tracking_id || item.co_uid || "").toLowerCase().includes(q);
        const citizenMatch = (item.citizen?.first_name || item.citizens?.first_name || "")
          .toLowerCase()
          .includes(q);
        if (!titleMatch && !trackMatch && !citizenMatch) return false;
      }

      return true;
    });
  }, [queueComplaints, dateRange, statusFilter, priorityFilter, searchQuery]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "65vh",
          gap: 2,
        }}
      >
        <CircularProgress size={48} thickness={4} />
        <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 500 }}>
          Generating department operational reports & analytics...
        </Typography>
      </Box>
    );
  }

  const summary = analyticsData?.summary || {
    totalComplaints: queueComplaints.length,
    pending: queueComplaints.filter((c) => c.status === "pending").length,
    under_review: queueComplaints.filter((c) => c.status === "under_review").length,
    in_progress: queueComplaints.filter((c) => c.status === "in_progress").length,
    resolved: queueComplaints.filter((c) => c.status === "resolved").length,
    rejected: queueComplaints.filter((c) => c.status === "rejected").length,
    closed: queueComplaints.filter((c) => c.status === "closed").length,
    activeWorkload: queueComplaints.filter((c) => ["pending", "under_review", "in_progress"].includes(c.status)).length,
    resolvedTotal: queueComplaints.filter((c) => ["resolved", "closed"].includes(c.status)).length,
    resolutionRate: queueComplaints.length > 0
      ? Math.round((queueComplaints.filter((c) => ["resolved", "closed"].includes(c.status)).length / queueComplaints.length) * 100)
      : 0,
    totalStaff: 0,
    activeTeams: 0,
    totalCollaborations: 0,
  };

  const sla = analyticsData?.sla || {
    breachedCount: queueComplaints.filter((c) => c.sla_breached).length,
    onTimeCount: queueComplaints.length - queueComplaints.filter((c) => c.sla_breached).length,
    slaComplianceRate: queueComplaints.length > 0
      ? Math.round(((queueComplaints.length - queueComplaints.filter((c) => c.sla_breached).length) / queueComplaints.length) * 100)
      : 100,
    avgResolutionHours: 0,
  };

  const priorityCounts = analyticsData?.priorityCounts || {
    low: queueComplaints.filter((c) => (c.priority || "").toLowerCase() === "low").length,
    medium: queueComplaints.filter((c) => (c.priority || "medium").toLowerCase() === "medium").length,
    high: queueComplaints.filter((c) => (c.priority || "").toLowerCase() === "high").length,
    emergency: queueComplaints.filter((c) => (c.priority || "").toLowerCase() === "emergency").length,
  };

  const wardBreakdown = analyticsData?.wardBreakdown || [];
  const teamWorkload = analyticsData?.teamWorkload || [];
  const categoryBreakdown = analyticsData?.categoryBreakdown || [];
  const deptInfo = analyticsData?.department || { name: "Department", category: "Public Works" };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1440, mx: "auto" }}>
      {/* ── Page Header ────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 3.5,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.35rem",
              }}
            >
              <FiBarChart2 />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.3px" }}>
              Department Reports & Analytics
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Operational metrics, grievance resolution velocity, and team capacity for <strong>{deptInfo.name}</strong>
          </Typography>
        </Box>

        {/* Action Controls */}
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          {/* Time range selector */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              sx={{ borderRadius: 2.5, bgcolor: "background.paper", fontSize: "0.85rem" }}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="7">Last 7 Days</MenuItem>
              <MenuItem value="30">Last 30 Days</MenuItem>
              <MenuItem value="90">Last 90 Days</MenuItem>
            </Select>
          </FormControl>

          {/* Refresh button */}
          <Tooltip title="Refresh Analytics Data">
            <Button
              variant="outlined"
              size="small"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              startIcon={<FiRefreshCw className={refreshing ? "spin" : ""} />}
              sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 600 }}
            >
              Refresh
            </Button>
          </Tooltip>

          {/* Export CSV button */}
          <Button
            variant="contained"
            size="small"
            onClick={handleExportCsv}
            startIcon={<FiDownload />}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "none",
              "&:hover": { boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}` },
            }}
          >
            Export CSV
          </Button>

          {/* Print button */}
          <Tooltip title="Print Report">
            <Button
              variant="outlined"
              size="small"
              onClick={() => window.print()}
              startIcon={<FiPrinter />}
              sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 600 }}
            >
              Print
            </Button>
          </Tooltip>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Executive KPI Summary Cards ────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatItem
            title="Total Complaints"
            value={summary.totalComplaints}
            subtitle={`${summary.resolvedTotal} resolved overall`}
            icon={<FiLayers />}
            color="#2563eb"
            badgeText="Assigned"
            badgeColor="info"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatItem
            title="Resolution Rate"
            value={`${summary.resolutionRate}%`}
            subtitle={`${summary.resolvedTotal} of ${summary.totalComplaints} tickets`}
            icon={<FiCheckCircle />}
            color="#10b981"
            badgeText={summary.resolutionRate >= 70 ? "High" : summary.resolutionRate >= 40 ? "Moderate" : "Needs Attention"}
            badgeColor={summary.resolutionRate >= 70 ? "success" : summary.resolutionRate >= 40 ? "warning" : "error"}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatItem
            title="Active Workload"
            value={summary.activeWorkload}
            subtitle={`${summary.in_progress} in progress`}
            icon={<FiActivity />}
            color="#f59e0b"
            badgeText={`${summary.pending} pending`}
            badgeColor="warning"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatItem
            title="SLA Compliance"
            value={`${sla.slaComplianceRate}%`}
            subtitle={sla.avgResolutionHours > 0 ? `Avg ${sla.avgResolutionHours}h resolution` : "On-time delivery"}
            icon={<FiClock />}
            color={sla.slaComplianceRate >= 80 ? "#059669" : "#dc2626"}
            badgeText={sla.breachedCount > 0 ? `${sla.breachedCount} Breached` : "Optimal"}
            badgeColor={sla.breachedCount > 0 ? "error" : "success"}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatItem
            title="Deployment Capacity"
            value={`${summary.activeTeams} Teams`}
            subtitle={`${summary.totalStaff} staff in roster`}
            icon={<FiUsers />}
            color="#8b5cf6"
            badgeText={`${summary.totalCollaborations} Cross-Dept`}
            badgeColor="default"
          />
        </Grid>
      </Grid>

      {/* ── Tabbed Deep-Dive Analytics ─────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          mb: 4,
          overflow: "hidden",
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, pt: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.92rem",
                minHeight: 48,
              },
            }}
          >
            <Tab icon={<FiActivity style={{ marginRight: 6 }} />} iconPosition="start" label="Overview & Health" />
            <Tab icon={<FiMapPin style={{ marginRight: 6 }} />} iconPosition="start" label="Ward Geographic Hotspots" />
            <Tab icon={<FiUsers style={{ marginRight: 6 }} />} iconPosition="start" label="Team Workload & Capacity" />
            <Tab icon={<FiLayers style={{ marginRight: 6 }} />} iconPosition="start" label="Detailed Complaints Ledger" />
          </Tabs>
        </Box>

        {/* Tab 0: Overview & Health */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Status Breakdown Panel */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.action.hover, 0.03),
                    border: "1px solid",
                    borderColor: "divider",
                    height: "100%",
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Grievance Status Breakdown
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
                    Distribution of department tickets across the operational lifecycle
                  </Typography>

                  <MetricBar label="Resolved" value={summary.resolved} total={summary.totalComplaints} color="#10b981" />
                  <MetricBar label="In Progress" value={summary.in_progress} total={summary.totalComplaints} color="#3b82f6" />
                  <MetricBar label="Under Review" value={summary.under_review} total={summary.totalComplaints} color="#8b5cf6" />
                  <MetricBar label="Pending Triage" value={summary.pending} total={summary.totalComplaints} color="#f59e0b" />
                  <MetricBar label="Closed" value={summary.closed} total={summary.totalComplaints} color="#64748b" />
                  <MetricBar label="Rejected / Void" value={summary.rejected} total={summary.totalComplaints} color="#ef4444" />
                </Paper>
              </Grid>

              {/* Priority & Severity Panel */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.action.hover, 0.03),
                    border: "1px solid",
                    borderColor: "divider",
                    height: "100%",
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Priority & Severity Breakdown
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
                    Urgency distribution required for operational triage
                  </Typography>

                  <MetricBar
                    label="Emergency"
                    value={priorityCounts.emergency}
                    total={summary.totalComplaints}
                    color="#dc2626"
                    caption="Requires immediate dispatch & supervisor sign-off"
                  />
                  <MetricBar
                    label="High Priority"
                    value={priorityCounts.high}
                    total={summary.totalComplaints}
                    color="#ea580c"
                    caption="SLA deadline under 24-48 hours"
                  />
                  <MetricBar
                    label="Medium Priority"
                    value={priorityCounts.medium}
                    total={summary.totalComplaints}
                    color="#2563eb"
                  />
                  <MetricBar
                    label="Low Priority"
                    value={priorityCounts.low}
                    total={summary.totalComplaints}
                    color="#64748b"
                  />

                  {/* SLA Quick Health Alert */}
                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: sla.breachedCount > 0 ? alpha("#dc2626", 0.08) : alpha("#10b981", 0.08),
                      border: "1px solid",
                      borderColor: sla.breachedCount > 0 ? alpha("#dc2626", 0.25) : alpha("#10b981", 0.25),
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    {sla.breachedCount > 0 ? (
                      <FiAlertTriangle color="#dc2626" size={24} />
                    ) : (
                      <FiCheckCircle color="#10b981" size={24} />
                    )}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: sla.breachedCount > 0 ? "#dc2626" : "#10b981" }}>
                        {sla.breachedCount > 0
                          ? `${sla.breachedCount} Complaints Exceeded SLA Deadline`
                          : "100% of Active Tickets Operating Within SLA"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {sla.breachedCount > 0
                          ? "Immediate escalation recommended to prevent citizen dissatisfaction."
                          : "Department turnaround velocity meets municipality standards."}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 1: Ward Geographic Hotspots */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Ward-Wise Grievance Distribution
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Identifies municipal wards generating the highest demand for {deptInfo.name} services
              </Typography>
            </Box>

            {wardBreakdown.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                No ward location data currently mapped for department complaints.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {wardBreakdown.map((ward) => {
                  const wardPct = summary.totalComplaints > 0 ? Math.round((ward.total / summary.totalComplaints) * 100) : 0;
                  const wardResRate = ward.total > 0 ? Math.round((ward.resolved / ward.total) * 100) : 0;

                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={ward.ward_number}>
                      <Card
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: alpha(theme.palette.action.hover, 0.02),
                          "&:hover": { borderColor: "primary.main" },
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: "8px",
                                bgcolor: "primary.main",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                              }}
                            >
                              W{ward.ward_number}
                            </Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              Ward {ward.ward_number}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={`${ward.total} tickets`}
                            color={ward.total >= 5 ? "warning" : "default"}
                            sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                          />
                        </Box>

                        <Box sx={{ mb: 1.5 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              Resolution Rate
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "success.main" }}>
                              {wardResRate}%
                            </Typography>
                          </Box>
                          <Box sx={{ height: 6, borderRadius: 3, bgcolor: "#e2e8f0", overflow: "hidden" }}>
                            <Box
                              sx={{
                                width: `${wardResRate}%`,
                                height: "100%",
                                bgcolor: "#10b981",
                                borderRadius: 3,
                              }}
                            />
                          </Box>
                        </Box>

                        <Stack direction="row" spacing={1} justifyContent="space-between">
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Pending: <strong>{ward.pending}</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            In Progress: <strong>{ward.in_progress}</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Resolved: <strong>{ward.resolved}</strong>
                          </Typography>
                        </Stack>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}

        {/* Tab 2: Team Workload & Capacity */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Operational Team Workload & Performance
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Monitor task distribution across internal teams and resolution efficiency
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate("/department_head/team")}
                endIcon={<FiExternalLink />}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                Manage Teams
              </Button>
            </Box>

            {teamWorkload.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                No active operational teams provisioned yet. Head to "Manage Teams" to set up response units.
              </Alert>
            ) : (
              <Grid container spacing={2.5}>
                {teamWorkload.map((t) => {
                  const compRate = t.total_assigned > 0 ? Math.round((t.resolved / t.total_assigned) * 100) : 0;

                  return (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={t.id}>
                      <Card
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: alpha(theme.palette.action.hover, 0.02),
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                            {t.team_name}
                          </Typography>
                          <Chip
                            size="small"
                            label={t.is_active ? "Active Unit" : "Inactive"}
                            color={t.is_active ? "success" : "default"}
                            sx={{ fontWeight: 600, fontSize: "0.72rem" }}
                          />
                        </Box>

                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                          Type: <strong>{t.team_type}</strong>
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              Team Completion Efficiency
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                              {compRate}%
                            </Typography>
                          </Box>
                          <Box sx={{ height: 8, borderRadius: 4, bgcolor: "#e2e8f0", overflow: "hidden" }}>
                            <Box
                              sx={{
                                width: `${compRate}%`,
                                height: "100%",
                                bgcolor: theme.palette.primary.main,
                                borderRadius: 4,
                              }}
                            />
                          </Box>
                        </Box>

                        <Stack direction="row" spacing={2} justifyContent="space-around" sx={{ pt: 1, borderTop: "1px dashed", borderColor: "divider" }}>
                          <Box sx={{ textAlign: "center" }}>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>Assigned</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t.total_assigned}</Typography>
                          </Box>
                          <Box sx={{ textAlign: "center" }}>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>Pending</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "warning.main" }}>{t.pending}</Typography>
                          </Box>
                          <Box sx={{ textAlign: "center" }}>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>Resolved</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "success.main" }}>{t.resolved}</Typography>
                          </Box>
                        </Stack>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}

        {/* Tab 3: Detailed Complaints Ledger */}
        {activeTab === 3 && (
          <Box sx={{ p: 3 }}>
            {/* Filter Bar */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 2,
                justifyContent: "space-between",
                alignItems: { xs: "stretch", md: "center" },
                mb: 3,
              }}
            >
              <TextField
                size="small"
                placeholder="Search by Tracking ID, Title, or Citizen..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <FiSearch size={16} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ minWidth: 280 }}
              />

              <Stack direction="row" spacing={1.5} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(0);
                    }}
                    displayEmpty
                    sx={{ borderRadius: 2, fontSize: "0.85rem" }}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="under_review">Under Review</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={priorityFilter}
                    onChange={(e) => {
                      setPriorityFilter(e.target.value);
                      setPage(0);
                    }}
                    displayEmpty
                    sx={{ borderRadius: 2, fontSize: "0.85rem" }}
                  >
                    <MenuItem value="all">All Priorities</MenuItem>
                    <MenuItem value="emergency">Emergency</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            {/* Complaints Table */}
            <TableContainer sx={{ borderRadius: 2.5, border: "1px solid", borderColor: "divider" }}>
              <Table size="medium">
                <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Tracking ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Title & Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ward</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Assigned Team</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredComplaints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          No complaints match the selected filter criteria.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredComplaints
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((row) => {
                        const prio = (row.priority || "medium").toLowerCase();
                        const isBreached = row.sla_breached;

                        return (
                          <TableRow key={row.co_uid} hover>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                #{row.tracking_id || row.co_uid.substring(0, 8)}
                              </Typography>
                              {isBreached && (
                                <Chip
                                  size="small"
                                  label="SLA Breached"
                                  color="error"
                                  sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, mt: 0.3 }}
                                />
                              )}
                            </TableCell>

                            <TableCell sx={{ maxWidth: 240 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                {row.title}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
                                {row.complaint_categories?.category_name || row.category?.category_name || "Civic Grievance"}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={row.ward_number ? `Ward ${row.ward_number}` : "Unassigned"}
                                variant="outlined"
                                sx={{ height: 22, fontSize: "0.75rem" }}
                              />
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={row.priority || "Medium"}
                                color={
                                  prio === "emergency"
                                    ? "error"
                                    : prio === "high"
                                    ? "warning"
                                    : prio === "low"
                                    ? "default"
                                    : "info"
                                }
                                sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600, textTransform: "capitalize" }}
                              />
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={(row.status || "").replace(/_/g, " ")}
                                color={
                                  row.status === "resolved" || row.status === "closed"
                                    ? "success"
                                    : row.status === "in_progress"
                                    ? "info"
                                    : row.status === "rejected"
                                    ? "error"
                                    : "warning"
                                }
                                sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600, textTransform: "capitalize" }}
                              />
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                                {row.current_team?.team_name || "Unassigned"}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                {row.submitted_date ? new Date(row.submitted_date).toLocaleDateString() : "—"}
                              </Typography>
                            </TableCell>

                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => navigate("/department_head/complaint-queue")}
                                sx={{ textTransform: "none", fontWeight: 600 }}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredComplaints.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
