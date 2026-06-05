import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { API_ENDPOINTS, fetchWithAuth } from "../../api";

interface Municipality {
  id: string;
  name: string;
  region: string;
  official_email: string;
  head_name: string;
  head_email: string;
  status: string;
  created_at: string;
}

export default function ManageMuniciple() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    region: "",
    email: "",
    head_name: "",
    head_email: "",
    head_password: "",
  });

  const fetchMunicipalities = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(
        API_ENDPOINTS.SUPERADMIN.GET_MUNICIPALITIES,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch municipalities");
      }

      const data = await response.json();

      // Safely extract the array from the response
      let fetchedArray = data?.data || data;
      if (fetchedArray && !Array.isArray(fetchedArray)) {
        fetchedArray = fetchedArray.municipalities || fetchedArray.data || [];
      }

      setMunicipalities(Array.isArray(fetchedArray) ? fetchedArray : []);
      if (!Array.isArray(fetchedArray))
        console.error("API did not return an array:", data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMunicipalities();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this municipality?"))
      return;

    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.SUPERADMIN.DELETE_MUNICIPALITY(id),
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to delete municipality");
      setMunicipalities((prev) =>
        Array.isArray(prev) ? prev.filter((m) => m.id !== id) : [],
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.SUPERADMIN.CREATE_MUNICIPALITY,
        {
          method: "POST",
          body: JSON.stringify(formData),
        },
      );

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Failed to create municipality");

      // Add the newly created municipality to the current state to update UI immediately
      const newMunicipality = result?.data || result;
      setMunicipalities((prev) =>
        Array.isArray(prev) ? [newMunicipality, ...prev] : [newMunicipality],
      );
      setIsModalOpen(false);
      setFormData({
        name: "",
        region: "",
        email: "",
        head_name: "",
        head_email: "",
        head_password: "",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
          Manage Municipalities
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Municipality
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table sx={{ minWidth: 950 }} aria-label="municipality table">
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>
                  <strong>Municipality Name</strong>
                </TableCell>
                <TableCell>
                  <strong>Head Name</strong>
                </TableCell>
                <TableCell>
                  <strong>Official Email</strong>
                </TableCell>
                <TableCell>
                  <strong>Head Email</strong>
                </TableCell>
                <TableCell>
                  <strong>Created Date</strong>
                </TableCell>
                <TableCell>
                  <strong>Status</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {municipalities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No municipalities found.
                  </TableCell>
                </TableRow>
              ) : (
                municipalities.map((row) => (
                  <TableRow
                    key={row.id}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {row.name}
                      </Typography>
                      {row.region && row.region !== "N/A" && (
                        <Typography variant="caption" color="text.secondary">
                          {row.region}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{row.head_name}</TableCell>
                    <TableCell>{row.official_email}</TableCell>
                    <TableCell>{row.head_email}</TableCell>
                    <TableCell>{formatDate(row.created_at)}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        color={row.status === "Active" ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton color="primary" aria-label="edit">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        aria-label="delete"
                        onClick={() => handleDelete(row.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Municipality Modal */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Typography
          variant="h6"
          sx={{ px: 3, pt: 2, pb: 1, fontWeight: "bold" }}
        >
          Municipality Details
        </Typography>
        <DialogTitle>Add New Municipality</DialogTitle>
        <form onSubmit={handleAddSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Municipality Name"
              type="text"
              fullWidth
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Region / State"
              type="text"
              fullWidth
              value={formData.region}
              onChange={(e) =>
                setFormData({ ...formData, region: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Official Contact Email"
              type="email"
              fullWidth
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              sx={{ mb: 3 }}
            />

            <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
              Municipality Head Details
            </Typography>
            <TextField
              margin="dense"
              label="Head Full Name"
              type="text"
              fullWidth
              required
              value={formData.head_name}
              onChange={(e) =>
                setFormData({ ...formData, head_name: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Head Login Email"
              type="email"
              fullWidth
              required
              value={formData.head_email}
              onChange={(e) =>
                setFormData({ ...formData, head_email: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Head Temporary Password"
              type="password"
              fullWidth
              required
              value={formData.head_password}
              onChange={(e) =>
                setFormData({ ...formData, head_password: e.target.value })
              }
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setIsModalOpen(false)}
              color="inherit"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Municipality"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
