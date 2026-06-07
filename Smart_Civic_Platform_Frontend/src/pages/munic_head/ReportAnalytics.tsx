import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import BusinessIcon from "@mui/icons-material/Business";
import { useAuth } from "../../hooks/useAuth";
import { BASE_URL, fetchWithAuth } from "../../api";

interface MunicipalityStats {
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  inProgressComplaints?: number;
  totalStaff: number;
  totalDepartments: number;
}

interface DeptStats {
  id: string;
  name: string;
  code: string;
  complaint_count?: number;
  staff_count?: number;
  resolved_count?: number;
  pending_count?: number;
}

const StatItem: React.FC<{
  icon: React.ReactElement;
  label: string;
  value: number | string;
  color: string;
  bg: string;
}> = ({ icon, label, value, color, bg }) => (
  <Paper
    elevation={1}
    sx={{
      p: 3,
      borderRadius: 3,
      display: "flex",
      alignItems: "center",
      gap: 2,
      border: "1px solid",
      borderColor: "divider",
      "&:hover": { boxShadow: 4 },
      transition: "box-shadow 0.2s",
    }}
  >
    <Box
      sx={{
        p: 1.5,
        bgcolor: bg,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
      }}
    >
      {React.cloneElement(icon, { sx: { color, fontSize: 28 } })}
    </Box>
    <Box>
      <Typography variant="h4" fontWeight={800}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        {label}
      </Typography>
    </Box>
  </Paper>
);

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box
        sx={{
          flex: 1,
          height: 8,
          bgcolor: "#f0f0f0",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: "100%",
            bgcolor: color,
            borderRadius: 4,
            transition: "width 0.4s",
          }}
        />
      </Box>
      <Typography variant="caption" fontWeight={600} sx={{ minWidth: 36 }}>
        {pct}%
      </Typography>
    </Box>
  );
}

export default function ReportAnalytics() {
  const { user } = useAuth();
  const municipalityId = (user as any)?.municipalityId || (user as any)?.municipality_id;

  const [stats, setStats] = useState<MunicipalityStats | null>(null);
  const [departments, setDepartments] = useState<DeptStats[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [deptStats, setDeptStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deptLoading, setDeptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!municipalityId) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, deptsRes] = await Promise.all([
          fetchWithAuth(`${BASE_URL}/municipality/${municipalityId}/stats`),
          fetchWithAuth(`${BASE_URL}/municipality/${municipalityId}/departments`),
        ]);
        if (statsRes.ok) {
          const d = await statsRes.json();
          setStats(d?.data ?? d);
        }
        if (deptsRes.ok) {
          const d = await deptsRes.json();
          const arr = d?.data?.departments ?? d?.data ?? d ?? [];
          setDepartments(Array.isArray(arr) ? arr : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [municipalityId]);

  useEffect(() => {
    if (!selectedDept) {
      setDeptStats(null);
      return;
    }
    const fetchDeptStats = async () => {
      setDeptLoading(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/municipality/${municipalityId}/departments/${selectedDept}`
        );
        if (res.ok) {
          const d = await res.json();
          setDeptStats(d?.data ?? d);
        }
      } catch {
        // silently ignore
      } finally {
        setDeptLoading(false);
      }
    };
    fetchDeptStats();
  }, [selectedDept, municipalityId]);

  if (!municipalityId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">Municipality ID not found in profile.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress size={56} />
      </Box>
    );
  }

  const totalComplaints = stats?.totalComplaints ?? 0;
  const resolved = stats?.resolvedComplaints ?? 0;
  const pending = stats?.pendingComplaints ?? 0;
  const inProgress = stats?.inProgressComplaints ?? (totalComplaints - resolved - pending);
  const resolutionRate = totalComplaints > 0 ? Math.round((resolved / totalComplaints) * 100) : 0;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 4 }}>
        <BarChartIcon sx={{ color: "primary.main", fontSize: 34 }} />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Reports & Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Municipality performance overview and department-level insights
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* KPI Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatItem
            icon={<AssignmentIcon />}
            label="Total Complaints"
            value={totalComplaints}
            color="#1565c0"
            bg="#e3f2fd"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatItem
            icon={<CheckCircleIcon />}
            label="Resolved"
            value={resolved}
            color="#2e7d32"
            bg="#e8f5e9"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatItem
            icon={<HourglassEmptyIcon />}
            label="Pending"
            value={pending}
            color="#e65100"
            bg="#fff3e0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatItem
            icon={<BusinessIcon />}
            label="Departments"
            value={stats?.totalDepartments ?? "—"}
            color="#6a1b9a"
            bg="#f3e5f5"
          />
        </Grid>
      </Grid>

      {/* Resolution Rate */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 4 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Overall Complaint Resolution Rate
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <Typography variant="h3" fontWeight={800} color="success.main">
            {resolutionRate}%
          </Typography>
          <Chip
            label={resolutionRate >= 70 ? "Good" : resolutionRate >= 40 ? "Moderate" : "Needs Attention"}
            color={resolutionRate >= 70 ? "success" : resolutionRate >= 40 ? "warning" : "error"}
          />
        </Box>
        <ProgressBar value={resolved} max={totalComplaints} color="#2e7d32" />
        <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
          {[
            { label: "Resolved", value: resolved, color: "success.main" },
            { label: "In Progress", value: inProgress, color: "info.main" },
            { label: "Pending", value: pending, color: "warning.main" },
          ].map((item) => (
            <Box key={item.label}>
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
              <Typography fontWeight={700} color={item.color}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Department Breakdown */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 4 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Department Overview
        </Typography>
        {departments.length === 0 ? (
          <Typography color="text.secondary">No departments found.</Typography>
        ) : (
          <>
            {departments.map((dept, i) => (
              <React.Fragment key={dept.id}>
                <Box sx={{ py: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Box>
                      <Typography fontWeight={700}>{dept.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Code: {dept.code}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {dept.staff_count !== undefined && (
                        <Chip label={`${dept.staff_count} staff`} size="small" variant="outlined" />
                      )}
                      {dept.complaint_count !== undefined && (
                        <Chip label={`${dept.complaint_count} complaints`} size="small" color="primary" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                  {dept.complaint_count !== undefined && dept.resolved_count !== undefined && (
                    <ProgressBar
                      value={dept.resolved_count}
                      max={dept.complaint_count}
                      color="#1976d2"
                    />
                  )}
                </Box>
                {i < departments.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </>
        )}
      </Paper>

      {/* Department Detail Lookup */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Department Detail Lookup
        </Typography>
        <FormControl size="small" sx={{ minWidth: 260, mb: 3 }}>
          <InputLabel>Select Department</InputLabel>
          <Select
            label="Select Department"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <MenuItem value="">— Choose a department —</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {deptLoading && <CircularProgress size={28} />}

        {deptStats && !deptLoading && (
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              {Object.entries(deptStats)
                .filter(([k]) => !["id", "municipality_id", "created_at", "updated_at"].includes(k))
                .map(([key, val]) => (
                  <Grid size={{ xs: 6, sm: 4, md: 3 }} key={key}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
                        {key.replace(/_/g, " ")}
                      </Typography>
                      <Typography fontWeight={700} variant="h6">
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
            </Grid>
          </Box>
        )}

        {!selectedDept && (
          <Typography color="text.secondary" variant="body2">
            Select a department to see detailed statistics.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
