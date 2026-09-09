import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  Skeleton,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SecurityIcon from "@mui/icons-material/Security";
import LanguageIcon from "@mui/icons-material/Language";
import DevicesIcon from "@mui/icons-material/Devices";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import { superadminApi } from "../../api";
import type { AuditLogEntry } from "../../api/types";

// ─── Color & Icon helpers ──────────────────────────────────────────────────────

type ChipColor = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

const ACTION_COLOR: Record<string, ChipColor> = {
  INSERT: "success",
  UPDATE: "warning",
  DELETE: "error",
  LOGIN: "info",
  LOGOUT: "default",
  STATUS_CHANGE: "secondary",
  ROLE_CHANGE: "primary",
  ASSIGN: "primary",
  EXPORT: "info",
};

const SEVERITY_COLOR: Record<string, ChipColor> = {
  info: "info",
  warning: "warning",
  critical: "error",
};

const ACTION_LABEL: Record<string, string> = {
  INSERT: "Create / Insert",
  UPDATE: "Update",
  DELETE: "Delete",
  LOGIN: "Login Session",
  LOGOUT: "Logout Session",
  STATUS_CHANGE: "Status Change",
  ROLE_CHANGE: "Role Change",
  ASSIGN: "Assignment",
  EXPORT: "Data Export",
};

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  municipality_head: "Municipality Head",
  department_head: "Dept Head",
  staff: "Staff",
  citizen: "Citizen",
};

const ROLE_COLOR: Record<string, ChipColor> = {
  superadmin: "primary",
  municipality_head: "secondary",
  department_head: "warning",
  staff: "info",
  citizen: "default",
};

function getActionIcon(action: string) {
  switch (action) {
    case "LOGIN":
      return <LoginIcon fontSize="small" sx={{ mr: 0.5 }} />;
    case "LOGOUT":
      return <LogoutIcon fontSize="small" sx={{ mr: 0.5 }} />;
    case "ROLE_CHANGE":
      return <AdminPanelSettingsIcon fontSize="small" sx={{ mr: 0.5 }} />;
    case "STATUS_CHANGE":
      return <SecurityIcon fontSize="small" sx={{ mr: 0.5 }} />;
    default:
      return null;
  }
}

// ─── JSON Block ───────────────────────────────────────────────────────────────

function JsonBlock({ label, value }: { label: string; value?: Record<string, unknown> | null }) {
  if (!value) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: "block" }}>
        {label}
      </Typography>
      <Box
        component="pre"
        sx={{
          fontSize: "0.75rem",
          bgcolor: "#f8fafc",
          border: "1px solid",
          borderColor: "grey.300",
          borderRadius: 1.5,
          p: 1.5,
          overflow: "auto",
          maxHeight: 220,
          m: 0,
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {JSON.stringify(value, null, 2)}
      </Box>
    </Box>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

function AuditDetailDialog({
  log,
  onClose,
}: {
  log: AuditLogEntry | null;
  onClose: () => void;
}) {
  if (!log) return null;

  const isAuthEvent = log.action === "LOGIN" || log.action === "LOGOUT";
  const isTransition = log.action === "ROLE_CHANGE" || log.action === "STATUS_CHANGE";
  const hasChanges = !!(log.old_value || log.new_value);
  const metadata = (log.new_value as any) || {};

  return (
    <Dialog open={!!log} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", pb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {getActionIcon(log.action)}
          <span>Audit Log Detail</span>
        </Box>
        <Chip
          label={ACTION_LABEL[log.action] ?? log.action}
          color={ACTION_COLOR[log.action] ?? "default"}
          size="small"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          label={(log.severity ?? "INFO").toUpperCase()}
          color={SEVERITY_COLOR[log.severity] ?? "info"}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* ── Specialized: Login / Session Details ── */}
        {isAuthEvent && (
          <Card variant="outlined" sx={{ mb: 3, bgcolor: "rgba(99, 102, 241, 0.03)", borderColor: "primary.light" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" color="primary.main" fontWeight={700} sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <SecurityIcon fontSize="small" /> Authentication & Session Data
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <AccessTimeIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.2 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Timestamp</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {new Date(metadata.login_at || metadata.logout_at || log.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <LanguageIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.2 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">IP Address</Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {metadata.ip || "127.0.0.1 (Local / Proxied)"}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <PersonIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.2 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Auth Method</Typography>
                      <Typography variant="body2" sx={{ textTransform: "capitalize", fontWeight: 600 }}>
                        {metadata.method ? metadata.method.replace("_", " ") : "Email / Password"}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <AdminPanelSettingsIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.2 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Authenticated Role</Typography>
                      <Box sx={{ mt: 0.2 }}>
                        <Chip
                          label={ROLE_LABEL[log.action_by_role] || log.action_by_role}
                          color={ROLE_COLOR[log.action_by_role] || "default"}
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <DevicesIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.2 }} />
                    <Box sx={{ width: "100%" }}>
                      <Typography variant="caption" color="text.secondary">Client Device / User-Agent</Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem", bgcolor: "#f1f5f9", p: 1, borderRadius: 1, wordBreak: "break-all" }}>
                        {metadata.user_agent || "Browser / Web Client"}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* ── Specialized: Role / Status Transition ── */}
        {isTransition && (
          <Card variant="outlined" sx={{ mb: 3, bgcolor: "#fbfcfe", borderColor: "secondary.light" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" color="secondary.main" fontWeight={700} sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <AdminPanelSettingsIcon fontSize="small" /> Authorization & Lifecycle Transition
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Target User</Typography>
                  <Typography variant="body1" fontWeight={700}>{log.target_user_name || "—"}</Typography>
                  <Typography variant="caption" color="text.secondary">{log.target_user_email || "—"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Transition Summary</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <Chip
                      label={String(log.old_value?.role || log.old_value?.account_status || "Previous")}
                      size="small"
                      variant="outlined"
                    />
                    <Typography variant="body2" fontWeight={700} color="text.secondary">→</Typography>
                    <Chip
                      label={String(log.new_value?.role || log.new_value?.account_status || "Updated")}
                      color="primary"
                      size="small"
                    />
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* ── General Action Summary ── */}
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
          Action Summary
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Action Type</Typography>
            <Typography variant="body2" fontWeight={600}>{ACTION_LABEL[log.action] ?? log.action}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Table Affected</Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{log.table_name || "—"}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Record ID</Typography>
            <Tooltip title={log.record_id}>
              <Typography
                variant="body2"
                sx={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {log.record_id || "—"}
              </Typography>
            </Tooltip>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Timestamp</Typography>
            <Typography variant="body2">{new Date(log.created_at).toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Audit Log UUID</Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>
              {log.id}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* ── Actor ── */}
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
          Actor (Performed By)
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">Full Name</Typography>
            <Typography variant="body2" fontWeight={600}>{log.action_by_name || "—"}</Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">Email Address</Typography>
            <Typography variant="body2">{log.action_by_email || "—"}</Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">System Role</Typography>
            <Box sx={{ mt: 0.3 }}>
              <Chip
                label={ROLE_LABEL[log.action_by_role] || log.action_by_role}
                color={ROLE_COLOR[log.action_by_role] || "default"}
                size="small"
              />
            </Box>
          </Grid>
        </Grid>

        {/* ── Municipality ── */}
        {(log.municipality_id || log.municipality_name) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
              Municipality Scope
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Name</Typography>
                <Typography variant="body2" fontWeight={600}>{log.municipality_name || "—"}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Municipality ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>
                  {log.municipality_id || "—"}
                </Typography>
              </Grid>
            </Grid>
          </>
        )}

        {/* ── Raw Payload Changes Diff ── */}
        {hasChanges && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1.5 }}>
              Payload Data & State
            </Typography>
            <Grid container spacing={2}>
              {log.old_value && (
                <Grid item xs={12} sm={6}>
                  <JsonBlock label="Previous State (Before)" value={log.old_value} />
                </Grid>
              )}
              {log.new_value && (
                <Grid item xs={12} sm={log.old_value ? 6 : 12}>
                  <JsonBlock label="Recorded State / Payload (After)" value={log.new_value} />
                </Grid>
              )}
            </Grid>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="contained" sx={{ px: 3, fontWeight: 600 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  "LOGIN",
  "LOGOUT",
  "ROLE_CHANGE",
  "STATUS_CHANGE",
  "INSERT",
  "UPDATE",
  "DELETE",
  "ASSIGN",
  "EXPORT",
];

const ROLE_OPTIONS = [
  "superadmin",
  "municipality_head",
  "department_head",
  "staff",
  "citizen",
];

const SEVERITY_OPTIONS = ["info", "warning", "critical"];

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Filters
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Resolve tab preset filters
      let effectiveAction = filterAction;
      let effectiveRole = filterRole;

      if (activeTab === 1) {
        // Superadmin activity
        effectiveRole = "superadmin";
      } else if (activeTab === 2) {
        // Login & Logout sessions
        effectiveAction = "LOGIN,LOGOUT";
      } else if (activeTab === 3) {
        // Security & Permissions
        effectiveAction = "ROLE_CHANGE,STATUS_CHANGE";
      } else if (activeTab === 4) {
        // Data updates
        effectiveAction = "INSERT,UPDATE,DELETE";
      }

      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (effectiveAction) params.action = effectiveAction;
      if (effectiveRole) params.role = effectiveRole;
      if (filterSeverity) params.severity = filterSeverity;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await superadminApi.getAuditLogs(params);
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.logs || [];
        setLogs(list);

        const count =
          typeof res.total === "number"
            ? res.total
            : typeof (res.data as any)?.total === "number"
            ? (res.data as any).total
            : list.length;
        setTotalCount(count);
      } else {
        setError("Failed to load audit logs");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, activeTab, filterAction, filterRole, filterSeverity, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleTabChange = (_: React.SyntheticEvent, newTab: number) => {
    setActiveTab(newTab);
    setPage(0);
    setFilterAction("");
    setFilterRole("");
  };

  const clearFilters = () => {
    setActiveTab(0);
    setSearchQuery("");
    setFilterAction("");
    setFilterRole("");
    setFilterSeverity("");
    setPage(0);
  };

  const exportCsv = () => {
    const headers = [
      "Action",
      "Severity",
      "Actor Name",
      "Actor Email",
      "Actor Role",
      "Municipality",
      "Table",
      "Record ID",
      "Target User",
      "IP Address",
      "Timestamp",
    ];
    const rows = logs.map((log) => {
      const meta = (log.new_value as any) || {};
      return [
        log.action,
        log.severity,
        log.action_by_name ?? "",
        log.action_by_email ?? "",
        log.action_by_role,
        log.municipality_name ?? "",
        log.table_name,
        log.record_id,
        log.target_user_name ?? "",
        meta.ip ?? "",
        new Date(log.created_at).toISOString(),
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
      {/* ── Header ── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={800} color="text.primary">
            System Audit Log
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Immutable security trail capturing authentication sessions, Superadmin actions, and systemic operations
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchLogs}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
            Refresh
          </Button>
          {logs.length > 0 && (
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={exportCsv}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
            >
              Export CSV
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Quick Preset Tabs ── */}
      <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: "divider", bgcolor: "transparent" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: "0.95rem" },
          }}
        >
          <Tab label="All Activity" />
          <Tab
            icon={<AdminPanelSettingsIcon fontSize="small" />}
            iconPosition="start"
            label="Superadmin Activity"
          />
          <Tab
            icon={<LoginIcon fontSize="small" />}
            iconPosition="start"
            label="Login & Session Data"
          />
          <Tab
            icon={<SecurityIcon fontSize="small" />}
            iconPosition="start"
            label="Roles & Permissions"
          />
          <Tab label="Entity & System Changes" />
        </Tabs>
      </Paper>

      {/* ── Filter Bar ── */}
      <Paper elevation={1} sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3.5}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search table, record ID, keyword…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={2.5}>
            <FormControl size="small" fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={filterAction}
                label="Action"
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Actions</MenuItem>
                {ACTION_OPTIONS.map((a) => (
                  <MenuItem key={a} value={a}>
                    {ACTION_LABEL[a] ?? a}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Actor Role</InputLabel>
              <Select
                value={filterRole}
                label="Actor Role"
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Roles</MenuItem>
                {ROLE_OPTIONS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {ROLE_LABEL[r] ?? r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={filterSeverity}
                label="Severity"
                onChange={(e) => {
                  setFilterSeverity(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Severities</MenuItem>
                {SEVERITY_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <Button
              variant="text"
              color="inherit"
              onClick={clearFilters}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Table ── */}
      {loading && logs.length === 0 ? (
        <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1.5, borderRadius: 2 }} />
          ))}
        </Paper>
      ) : logs.length === 0 ? (
        <Paper elevation={1} sx={{ p: 8, textAlign: "center", borderRadius: 3 }}>
          <SecurityIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" fontWeight={700} color="text.secondary">
            No audit log entries found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 500, mx: "auto" }}>
            Audit entries will be recorded in real-time as users log in, manage roles, or perform administrative operations.
          </Typography>
          {(filterAction || filterRole || filterSeverity || searchQuery || activeTab !== 0) && (
            <Button variant="outlined" onClick={clearFilters} sx={{ mt: 3, textTransform: "none" }}>
              Clear Active Filters
            </Button>
          )}
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Table sx={{ minWidth: 850 }}>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actor</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Target / Scope</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => {
                const isSuperadmin = log.action_by_role === "superadmin";
                const isLogin = log.action === "LOGIN";

                return (
                  <TableRow
                    key={log.id}
                    hover
                    sx={{
                      cursor: "pointer",
                      bgcolor: isSuperadmin ? "rgba(99, 102, 241, 0.02)" : "inherit",
                    }}
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                        {getActionIcon(log.action)}
                        <Chip
                          label={ACTION_LABEL[log.action] ?? log.action}
                          color={ACTION_COLOR[log.action] ?? "default"}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={(log.severity ?? "info").toUpperCase()}
                        color={SEVERITY_COLOR[log.severity] ?? "info"}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: "0.72rem" }}
                      />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {log.action_by_name || log.action_by_email || "System"}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                          <Chip
                            label={ROLE_LABEL[log.action_by_role] || log.action_by_role}
                            color={ROLE_COLOR[log.action_by_role] || "default"}
                            size="small"
                            sx={{ height: 20, fontSize: "0.68rem" }}
                          />
                          {log.action_by_email && log.action_by_name && (
                            <Typography variant="caption" color="text.secondary">
                              {log.action_by_email}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      {log.target_user_name ? (
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{log.target_user_name}</Typography>
                          <Typography variant="caption" color="text.secondary">User: {log.target_user_email || log.target_user_id}</Typography>
                        </Box>
                      ) : log.municipality_name ? (
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{log.municipality_name}</Typography>
                          <Typography variant="caption" color="text.secondary">Municipality</Typography>
                        </Box>
                      ) : isLogin ? (
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                          {(log.new_value as any)?.ip ? `IP: ${(log.new_value as any).ip}` : "Platform Login"}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
                        {log.table_name}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace" }}>
                        {log.record_id ? log.record_id.slice(0, 8) + "…" : ""}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {new Date(log.created_at).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Typography>
                    </TableCell>

                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="View Complete Detail">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setSelectedLog(log)}
                          sx={{ bgcolor: "rgba(99, 102, 241, 0.08)" }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 15, 25, 50]}
          />
        </TableContainer>
      )}

      {/* ── Detail Dialog ── */}
      <AuditDetailDialog log={selectedLog} onClose={() => setSelectedLog(null)} />
    </Box>
  );
}
