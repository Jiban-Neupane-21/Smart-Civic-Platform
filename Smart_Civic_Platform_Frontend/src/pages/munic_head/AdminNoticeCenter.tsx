import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AnnouncementIcon from "@mui/icons-material/Announcement";
import { useAuth } from "../../hooks/useAuth";
import { BASE_URL, fetchWithAuth } from "../../api";

interface Notice {
  id: string;
  title: string;
  body: string;
  category: string;
  audience?: string;
  target_department_id?: string;
  created_at: string;
  updated_at?: string;
}

interface DepartmentItem {
  id: string;
  department_name: string;
}

const CATEGORIES = ["general", "emergency", "maintenance", "event", "policy"];

const CATEGORY_COLOR: Record<string, "default" | "error" | "warning" | "info" | "success"> = {
  general: "default",
  emergency: "error",
  maintenance: "warning",
  event: "info",
  policy: "success",
};

const emptyForm = {
  title: "",
  body: "",
  category: "general",
  audience: "everyone",
  target_department_id: "",
};

export default function AdminNoticeCenter() {
  const { user } = useAuth();
  const municipalityId = (user as any)?.municipalityId || (user as any)?.municipality_id;

  const [notices, setNotices] = useState<Notice[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Notice | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const [deleting, setDeleting] = useState(false);

  // View detail
  const [viewNotice, setViewNotice] = useState<Notice | null>(null);

  const fetchNotices = async () => {
    if (!municipalityId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetchWithAuth(
        `${BASE_URL}/municipality/${municipalityId}/notices?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch notices");
      const data = await res.json();
      const arr = data?.data?.notices ?? data?.data ?? data ?? [];
      setNotices(Array.isArray(arr) ? arr : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!municipalityId) return;
    fetchWithAuth(`${BASE_URL}/municipality/${municipalityId}/departments`)
      .then((res) => res.json())
      .then((data) => {
        const list = data?.data?.departments ?? data?.data ?? [];
        if (Array.isArray(list)) {
          setDepartments(list.map((d: any) => ({ id: d.id, department_name: d.department_name })));
        }
      })
      .catch((err) => console.error("Could not fetch departments for notices", err));
  }, [municipalityId]);

  useEffect(() => {
    fetchNotices();
  }, [municipalityId, categoryFilter]);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (notice: Notice) => {
    setEditTarget(notice);
    setFormData({
      title: notice.title,
      body: notice.body,
      category: notice.category,
      audience: notice.audience || "everyone",
      target_department_id: notice.target_department_id || "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (formData.audience === "department" && !formData.target_department_id) {
        throw new Error("Please select a target department.");
      }

      const isEdit = !!editTarget;
      const url = isEdit
        ? `${BASE_URL}/municipality/${municipalityId}/notices/${editTarget!.id}`
        : `${BASE_URL}/municipality/${municipalityId}/notices`;
      
      const payload = {
        title: formData.title,
        body: formData.body,
        category: formData.category,
        audience: formData.audience,
        target_department_id: formData.audience === "department" ? formData.target_department_id : null,
      };

      const res = await fetchWithAuth(url, {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || result.error || "Operation failed");
      setModalOpen(false);
      await fetchNotices();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/municipality/${municipalityId}/notices/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Delete failed");
      }
      setNotices((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (!municipalityId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">Municipality ID not found in profile.</Alert>
      </Box>
    );
  }

  const displayed = notices.filter(
    (n) => categoryFilter === "all" || n.category === categoryFilter
  );

  const getAudienceDisplay = (notice: { audience?: string; target_department_id?: string }) => {
    if (notice.target_department_id) {
      const dept = departments.find((d) => d.id === notice.target_department_id);
      return {
        label: dept ? `Dept: ${dept.department_name}` : "Specific Dept",
        color: "secondary" as const,
      };
    }
    if (notice.audience === "all_staff") {
      return { label: "Departments & Staff", color: "info" as const };
    }
    if (notice.audience === "all_citizens") {
      return { label: "Citizens Only", color: "default" as const };
    }
    return { label: "Everyone", color: "primary" as const };
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 960, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <NotificationsIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Notices & Announcements
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Post and manage public notices for your municipality
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}
        >
          Post Notice
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Category filter tabs */}
      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}>
        {["all", ...CATEGORIES].map((cat) => (
          <Chip
            key={cat}
            label={cat === "all" ? "All" : cat}
            color={categoryFilter === cat ? "primary" : "default"}
            onClick={() => setCategoryFilter(cat)}
            sx={{ textTransform: "capitalize", cursor: "pointer" }}
          />
        ))}
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : displayed.length === 0 ? (
        <Paper elevation={1} sx={{ p: 6, borderRadius: 3, textAlign: "center" }}>
          <AnnouncementIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
          <Typography color="text.secondary">No notices posted yet.</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ mt: 2 }}>
            Post First Notice
          </Button>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
          <List disablePadding>
            {displayed.map((notice, i) => (
              <React.Fragment key={notice.id}>
                <ListItem
                  sx={{
                    px: 3,
                    py: 2,
                    "&:hover": { bgcolor: "#f5f8ff" },
                    cursor: "pointer",
                  }}
                  onClick={() => setViewNotice(notice)}
                  secondaryAction={
                    <Box sx={{ display: "flex", gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => openEdit(notice)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(notice)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <AnnouncementIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography fontWeight={700}>{notice.title}</Typography>
                        <Chip
                          label={notice.category}
                          color={CATEGORY_COLOR[notice.category] ?? "default"}
                          size="small"
                          sx={{ textTransform: "capitalize" }}
                        />
                        <Chip
                          label={getAudienceDisplay(notice).label}
                          color={getAudienceDisplay(notice).color}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notice.created_at).toLocaleString()}
                      </Typography>
                    }
                  />
                </ListItem>
                {i < displayed.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {editTarget ? "Edit Notice" : "Post New Notice"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <TextField
              label="Title"
              fullWidth
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Body / Content"
              fullWidth
              required
              multiline
              minRows={4}
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category *</InputLabel>
              <Select
                label="Category *"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c} sx={{ textTransform: "capitalize" }}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Target Audience *</InputLabel>
              <Select
                label="Target Audience *"
                required
                value={formData.audience}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
              >
                <MenuItem value="everyone">Everyone (All Citizens & Departments)</MenuItem>
                <MenuItem value="all_staff">Departments & Staff Only</MenuItem>
                <MenuItem value="all_citizens">Citizens Only</MenuItem>
                <MenuItem value="department">Specific Department</MenuItem>
              </Select>
            </FormControl>

            {formData.audience === "department" && (
              <FormControl fullWidth sx={{ mb: 1 }}>
                <InputLabel>Target Department *</InputLabel>
                <Select
                  label="Target Department *"
                  required
                  value={formData.target_department_id}
                  onChange={(e) => setFormData({ ...formData, target_department_id: e.target.value })}
                >
                  {departments.length === 0 ? (
                    <MenuItem disabled value="">
                      No departments found
                    </MenuItem>
                  ) : (
                    departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.department_name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting} sx={{ fontWeight: 600 }}>
              {submitting ? "Saving..." : editTarget ? "Update Notice" : "Post Notice"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Notice Detail */}
      <Dialog open={!!viewNotice} onClose={() => setViewNotice(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{viewNotice?.title}</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
            <Chip
              label={viewNotice?.category}
              color={CATEGORY_COLOR[viewNotice?.category ?? ""] ?? "default"}
              size="small"
              sx={{ textTransform: "capitalize" }}
            />
            {viewNotice && (
              <Chip
                label={`Audience: ${getAudienceDisplay(viewNotice).label}`}
                color={getAudienceDisplay(viewNotice).color}
                variant="outlined"
                size="small"
              />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
              Posted {viewNotice ? new Date(viewNotice.created_at).toLocaleString() : ""}
            </Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
            {viewNotice?.body}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setViewNotice(null)}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => {
              openEdit(viewNotice!);
              setViewNotice(null);
            }}
          >
            Edit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Delete Notice?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>&ldquo;{deleteTarget?.title}&rdquo;</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ fontWeight: 600 }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
