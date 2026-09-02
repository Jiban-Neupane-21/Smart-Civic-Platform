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
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
  Chip,
  Box,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { departmentApi } from "../api/modules/department.api";
import type { DeptQueueComplaint } from "../api/types";

interface ComplaintSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (complaint: DeptQueueComplaint) => void;
}

const SeverityColors: Record<string, "success" | "info" | "warning" | "error"> = {
  low: "info",
  medium: "success",
  high: "warning",
  urgent: "error",
};

export const ComplaintSelector: React.FC<ComplaintSelectorProps> = ({ open, onClose, onSelect }) => {
  const [complaints, setComplaints] = useState<DeptQueueComplaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchComplaints();
    }
  }, [open]);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentApi.getQueue();
      if (res.success && res.data) {
        setComplaints(res.data.filter(c => ["pending", "under_review", "in_progress", "assigned"].includes(c.status)));
      } else {
        setError("Failed to load complaints");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filtered = complaints.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.tracking_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Complaint to Team</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by tracking ID or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : filtered.length === 0 ? (
          <Typography color="text.secondary" align="center" py={3}>
            No available complaints found.
          </Typography>
        ) : (
          <List sx={{ width: "100%", bgcolor: "background.paper" }}>
            {filtered.map((c: any) => {
              const assignedTeamName = c.current_team?.team_name;
              const isAssigned = c.status === "assigned" || c.current_team_id;

              return (
                <ListItem
                  key={c.co_uid}
                  alignItems="flex-start"
                  sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                    mb: 1,
                    "&:hover": { bgcolor: "action.hover", cursor: "pointer" },
                  }}
                  onClick={() => onSelect(c)}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          #{c.tracking_id} - {c.title}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {isAssigned && (
                            <Chip
                              size="small"
                              label={assignedTeamName ? `Team: ${assignedTeamName}` : "Assigned"}
                              color="info"
                              variant="outlined"
                              sx={{ fontSize: "0.75rem" }}
                            />
                          )}
                          <Chip
                            label={c.severity_level?.toUpperCase() || "MEDIUM"}
                            size="small"
                            color={SeverityColors[c.severity_level] || "default"}
                          />
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography component="span" variant="body2" color="text.primary">
                          Status: {c.status}
                        </Typography>
                        {" — "}{c.complaint_categories?.category_name || "General"}
                        {isAssigned && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Click to reassign to selected squad
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
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
