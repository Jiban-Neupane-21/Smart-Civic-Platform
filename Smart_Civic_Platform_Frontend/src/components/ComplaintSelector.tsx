import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
  Chip,
  Box,
  Checkbox,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Close as CloseIcon,
  FilterList,
  LocationOn,
  DoneAll,
} from "@mui/icons-material";
import { departmentApi } from "../api/modules/department.api";
import type { DeptQueueComplaint } from "../api/types";

interface ComplaintSelectorProps {
  open: boolean;
  teamName?: string;
  onClose: () => void;
  onSelect: (complaint: DeptQueueComplaint) => void;
  onSelectMultiple?: (complaints: DeptQueueComplaint[]) => Promise<void> | void;
}

const SeverityColors: Record<string, "success" | "info" | "warning" | "error"> = {
  low: "info",
  medium: "success",
  high: "warning",
  urgent: "error",
};

export const ComplaintSelector: React.FC<ComplaintSelectorProps> = ({
  open,
  teamName,
  onClose,
  onSelect,
  onSelectMultiple,
}) => {
  const [complaints, setComplaints] = useState<DeptQueueComplaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<"unassigned" | "all">("unassigned");

  useEffect(() => {
    if (open) {
      setSelectedIds([]);
      setSearch("");
      fetchComplaints();
    }
  }, [open]);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentApi.getQueue();
      if (res.success && res.data) {
        setComplaints(
          res.data.filter((c) =>
            ["pending", "under_review", "in_progress", "assigned"].includes(c.status)
          )
        );
      } else {
        setError("Failed to load complaints");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filtered = complaints.filter((c) => {
    const isAssigned = Boolean(c.current_team_id || (c as any).current_team?.team_name);
    if (filterMode === "unassigned" && isAssigned) return false;

    const q = search.toLowerCase().trim();
    if (!q) return true;

    const title = c.title.toLowerCase();
    const tracking = c.tracking_id.toLowerCase();
    const cat = (c.complaint_categories?.category_name || "").toLowerCase();
    const ward = c.ward_number ? `ward ${c.ward_number}` : "";

    return title.includes(q) || tracking.includes(q) || cat.includes(q) || ward.includes(q);
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((c) => c.co_uid));
    }
  };

  const handleBatchAssign = async () => {
    const selectedComplaints = complaints.filter((c) => selectedIds.includes(c.co_uid));
    if (selectedComplaints.length === 0) return;

    setSubmitting(true);
    try {
      if (onSelectMultiple) {
        await onSelectMultiple(selectedComplaints);
      } else {
        for (const comp of selectedComplaints) {
          await onSelect(comp);
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Batch assignment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {teamName ? `Assign Complaints to Squad: ${teamName}` : "Assign Complaints to Operational Squad"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Select one or multiple grievances for field dispatch
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={submitting}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ maxHeight: "70vh", overflowY: "auto" }}>
        {/* Search & Filter Toolbar */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" mb={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by tracking ID, title, category, or ward..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Chip
              label="Needs Squad Only"
              size="small"
              onClick={() => setFilterMode("unassigned")}
              color={filterMode === "unassigned" ? "primary" : "default"}
              variant={filterMode === "unassigned" ? "filled" : "outlined"}
              sx={{ fontWeight: 600, cursor: "pointer" }}
            />
            <Chip
              label="All Complaints"
              size="small"
              onClick={() => setFilterMode("all")}
              color={filterMode === "all" ? "primary" : "default"}
              variant={filterMode === "all" ? "filled" : "outlined"}
              sx={{ fontWeight: 600, cursor: "pointer" }}
            />
          </Stack>
        </Stack>

        {/* Selection summary & Select All */}
        {filtered.length > 0 && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} px={0.5}>
            <Button
              size="small"
              startIcon={<DoneAll fontSize="small" />}
              onClick={handleSelectAll}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {selectedIds.length === filtered.length ? "Deselect All" : "Select All Available"}
            </Button>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {selectedIds.length} of {filtered.length} selected
            </Typography>
          </Box>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Typography color="error" py={2}>
            {error}
          </Typography>
        ) : filtered.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary" fontWeight={600}>
              No matching complaints found.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {filterMode === "unassigned"
                ? "All active complaints currently have a squad assigned. Click 'All Complaints' to reassign."
                : "No complaints found with current search query."}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ width: "100%" }}>
            {filtered.map((c: any) => {
              const assignedTeamName = c.current_team?.team_name;
              const isAssigned = Boolean(c.status === "assigned" || c.current_team_id || assignedTeamName);
              const isSelected = selectedIds.includes(c.co_uid);

              return (
                <ListItem
                  key={c.co_uid}
                  sx={{
                    border: "1px solid",
                    borderColor: isSelected ? "primary.main" : "#e0e0e0",
                    bgcolor: isSelected ? "primary.50" : "background.paper",
                    borderRadius: 2,
                    mb: 1,
                    p: 1.5,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    "&:hover": { borderColor: "primary.light", bgcolor: isSelected ? "primary.50" : "grey.50" },
                  }}
                  onClick={() => toggleSelect(c.co_uid)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge="start"
                      checked={isSelected}
                      tabIndex={-1}
                      disableRipple
                      size="small"
                      onChange={() => toggleSelect(c.co_uid)}
                    />
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          #{c.tracking_id} - {c.title}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          {c.ward_number && (
                            <Chip
                              icon={<LocationOn sx={{ fontSize: "12px !important" }} />}
                              label={`Ward ${c.ward_number}`}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                            />
                          )}
                          <Chip
                            label={c.severity_level?.toUpperCase() || "MEDIUM"}
                            size="small"
                            color={SeverityColors[c.severity_level] || "default"}
                            sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                          />
                          {isAssigned && (
                            <Chip
                              size="small"
                              label={assignedTeamName ? `Squad: ${assignedTeamName}` : "Assigned"}
                              color="info"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                            />
                          )}
                        </Stack>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography component="span" variant="caption" color="text.secondary">
                          {c.complaint_categories?.category_name || "General Service"} • Status: <b>{c.status}</b>
                        </Typography>
                        {c.description && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                            {c.description.length > 90 ? `${c.description.slice(0, 90)}...` : c.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider", justifyContent: "space-between" }}>
        <Button onClick={onClose} color="inherit" disabled={submitting}>
          Cancel
        </Button>

        <Stack direction="row" spacing={1.5}>
          {selectedIds.length === 1 && !onSelectMultiple && (
            <Button
              variant="contained"
              disabled={submitting}
              onClick={() => {
                const item = complaints.find((c) => c.co_uid === selectedIds[0]);
                if (item) onSelect(item);
              }}
              sx={{ fontWeight: 700 }}
            >
              Assign Selected
            </Button>
          )}

          <Button
            variant="contained"
            disabled={submitting || selectedIds.length === 0}
            onClick={handleBatchAssign}
            sx={{ fontWeight: 700, px: 3 }}
          >
            {submitting
              ? "Assigning..."
              : `Assign ${selectedIds.length > 0 ? `(${selectedIds.length}) ` : ""}to Squad`}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};
