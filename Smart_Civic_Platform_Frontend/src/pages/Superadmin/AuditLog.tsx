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
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { superadminApi } from "../../api";
import type { AuditLogEntry } from "../../api/types";

// ─── Color helpers ────────────────────────────────────────────────────────────

type ChipColor = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

const ACTION_COLOR: Record<string, ChipColor> = {
  INSERT: "success",
  UPDATE: "warning",
  DELETE: "error",
  LOGIN: "info",
  LOGOUT: "default",
  STATUS_CHANGE: "secondary",
  ROLE_CHANGE: "secondary",
  ASSIGN: "primary",
  EXPORT: "info",
};

const SEVERITY_COLOR: Record<string, ChipColor> = {
  info: "info",
  warning: "warning",
  critical: "error",
};

const ACTION_LABEL: Record<string, string> = {
  INSERT: "Insert",
  UPDATE: "Update",
  DELETE: "Delete",
  LOGIN: "Login",
  LOGOUT: "Logout",
  STATUS_CHANGE: "Status Change",
  ROLE_CHANGE: "Role Change",
  ASSIGN: "Assign",
  EXPORT: "Export",
};

// ─── JSON Diff view ───────────────────────────────────────────────────────────

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
          fontSize: "0.72rem",
          bgcolor: "grey.100",
          border: "1px solid",
          borderColor: "grey.300",
          borderRadius: 1,
          p: 1.5,
          overflow: "auto",
          maxHeight: 200,
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

  const hasChanges = log.old_value || log.new_value;

  return (
    <Dialog open={!!log} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        Audit Log Detail
        <Chip
          label={ACTION_LABEL[log.action] ?? log.action}
          color={ACTION_COLOR[log.action] ?? "default"}
          size="small"
        />
        <Chip
          label={log.severity?.toUpperCase() ?? "INFO"}
          color={SEVERITY_COLOR[log.severity] ?? "info"}
          size="small"
          variant="outlined"
        />
      </DialogTitle>

      <DialogContent dividers>
        {/* ── Action Summary ── */}
        <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
          Action Summary
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Action</Typography>
            <Typography variant="body2" fontWeight={600}>{ACTION_LABEL[log.action] ?? log.action}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Severity</Typography>
            <Box>
              <Chip
                label={log.severity?.toUpperCase() ?? "INFO"}
                color={SEVERITY_COLOR[log.severity] ?? "info"}
                size="small"
                variant="outlined"
              />
            </Box>
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
                sx={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}
              >
                {log.record_id || "—"}
              </Typography>
            </Tooltip>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Timestamp</Typography>
            <Typography variant="body2">
              {new Date(log.created_at).toLocaleString("en-US", {
                year: "numeric", month: "long", day: "numeric",
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Log ID</Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>
              {log.id}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* ── Actor ── */}
        <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
          Actor (Performed By)
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">Name</Typography>
            <Typography variant="body2">{log.action_by_name || "—"}</Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">Email</Typography>
            <Typography variant="body2">{log.action_by_email || "—"}</Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">Role</Typography>
            <Box>
              <Chip label={log.action_by_role} size="small" variant="outlined" />
            </Box>
          </Grid>
          {!log.action_by_name && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Actor UUID</Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{log.action_by || "—"}</Typography>
            </Grid>
          )}
        </Grid>

        {/* ── Municipality ── */}
        {(log.municipality_id || log.municipality_name) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
              Municipality
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Name</Typography>
                <Typography variant="body2">{log.municipality_name || "—"}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>
                  {log.municipality_id || "—"}
                </Typography>
              </Grid>
            </Grid>
          </>
        )}

        {/* ── Target User ── */}
        {(log.target_user_id || log.target_user_name) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
              Target User
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">Name</Typography>
                <Typography variant="body2">{log.target_user_name || "—"}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">Email</Typography>
                <Typography variant="body2">{log.target_user_email || "—"}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">User ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>
                  {log.target_user_id}
                </Typography>
              </Grid>
            </Grid>
          </>
        )}

        {/* ── Changes Diff ── */}
        {hasChanges && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1.5 }}>
              Changes (Old → New)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <JsonBlock label="Old Value (Before)" value={log.old_value} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <JsonBlock label="New Value (After)" value={log.new_value} />
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ACTION_OPTIONS = ["INSERT", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "STATUS_CHANGE", "ROLE_CHANGE", "ASSIGN", "EXPORT"];
const SEVERITY_OPTIONS = ["info", "warning", "critical"];

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await superadminApi.getAuditLogs({ page: page + 1, limit: rowsPerPage });
      if (res.success) {
        setLogs(Array.isArray(res.data) ? res.data : []);
      } else {
        setError("Failed to load audit logs");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Client-side filtering on top of paginated results
  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (log.action_by_name ?? "").toLowerCase().includes(q) ||
      (log.action_by_email ?? "").toLowerCase().includes(q) ||
      (log.municipality_name ?? "").toLowerCase().includes(q) ||
      (log.table_name ?? "").toLowerCase().includes(q);
    const matchesAction = !filterAction || log.action === filterAction;
    const matchesSeverity = !filterSeverity || log.severity === filterSeverity;
    return matchesSearch && matchesAction && matchesSeverity;
  });

  const exportCsv = () => {
    const headers = ["Action", "Severity", "Actor Name", "Actor Email", "Actor Role", "Municipality", "Table", "Record ID", "Target User", "Timestamp"];
    const rows = logs.map((log) => [
      log.action,
      log.severity,
      log.action_by_name ?? "",
      log.action_by_email ?? "",
      log.action_by_role,
      log.municipality_name ?? "",
      log.table_name,
      log.record_id,
      log.target_user_name ?? "",
      new Date(log.created_at).toISOString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ── Header ── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
          Audit Log
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchLogs} disabled={loading}>
            {loading ? <CircularProgress size={14} sx={{ mr: 0.5 }} /> : null}
            Refresh
          </Button>
          {logs.length > 0 && (
            <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} onClick={exportCsv}>
              Export CSV
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Filters ── */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Search actor, municipality, table…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 260 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Action</InputLabel>
          <Select value={filterAction} label="Action" onChange={(e) => setFilterAction(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {ACTION_OPTIONS.map((a) => <MenuItem key={a} value={a}>{ACTION_LABEL[a] ?? a}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Severity</InputLabel>
          <Select value={filterSeverity} label="Severity" onChange={(e) => setFilterSeverity(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {SEVERITY_OPTIONS.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {filteredLogs.length} result{filteredLogs.length !== 1 ? "s" : ""}
          {logs.length !== filteredLogs.length ? ` (of ${logs.length})` : ""}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* ── Table ── */}
      {loading && logs.length === 0 ? (
        <Box sx={{ p: 3 }}>
          {[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" height={52} sx={{ mb: 1 }} />)}
        </Box>
      ) : logs.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">No audit log entries found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Audit entries will appear here as actions are performed across the system.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><strong>Action</strong></TableCell>
                <TableCell><strong>Severity</strong></TableCell>
                <TableCell><strong>Actor</strong></TableCell>
                <TableCell><strong>Municipality</strong></TableCell>
                <TableCell><strong>Table</strong></TableCell>
                <TableCell><strong>Timestamp</strong></TableCell>
                <TableCell align="center"><strong>Detail</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Chip
                      label={ACTION_LABEL[log.action] ?? log.action}
                      color={ACTION_COLOR[log.action] ?? "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={(log.severity ?? "info").toUpperCase()}
                      color={SEVERITY_COLOR[log.severity] ?? "info"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{log.action_by_name || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">{log.action_by_role}</Typography>
                  </TableCell>
                  <TableCell>{log.municipality_name || "—"}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{log.table_name}</TableCell>
                  <TableCell>
                    {new Date(log.created_at).toLocaleString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => setSelectedLog(log)} sx={{ color: "info.main" }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={-1}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </TableContainer>
      )}

      {/* ── Detail Dialog ── */}
      <AuditDetailDialog log={selectedLog} onClose={() => setSelectedLog(null)} />
    </Box>
  );
}
