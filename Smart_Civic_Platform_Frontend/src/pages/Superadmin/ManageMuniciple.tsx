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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { API_ENDPOINTS, fetchWithAuth } from "../../api";

interface Municipality {
  m_uid: string;
  official_name: string;
  district: string;
  province: string;
  official_email: string;
  head_name: string;
  head_email: string;
  is_active: boolean;
  registered_at: string;
}

const PROVINCES = [
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim"
];

const DISTRICTS_BY_PROVINCE: Record<string, string[]> = {
  "Koshi": ["Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga", "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur"],
  "Madhesh": ["Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi", "Siraha"],
  "Bagmati": ["Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok", "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok"],
  "Gandaki": ["Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi", "Nawalpur", "Parbat", "Syangja", "Tanahun"],
  "Lumbini": ["Arghakhanchi", "Banke", "Bardiya", "Dang", "Eastern Rukum", "Gulmi", "Kapilvastu", "Parasi", "Palpa", "Pyuthan", "Rolpa", "Rupandehi"],
  "Karnali": ["Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu", "Salyan", "Surkhet", "Western Rukum"],
  "Sudurpashchim": ["Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula", "Doti", "Kailali", "Kanchanpur"]
};

const MUNICIPALITY_TYPES = [
  { value: "metropolitan_city", label: "Metropolitan City" },
  { value: "sub_metropolitan_city", label: "Sub-Metropolitan City" },
  { value: "municipality", label: "Municipality" },
  { value: "rural_municipality", label: "Rural Municipality" }
];

export default function ManageMuniciple() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    password?: string;
    email?: string;
    name?: string;
  } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    official_name: "",
    district: "",
    province: "",
    official_email: "",
    head_name: "",
    head_email: "",
    total_wards: 1,
    municipality_type: "municipality",
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
        Array.isArray(prev) ? prev.filter((m) => m.m_uid !== id) : [],
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
        throw new Error(result.error || result.message || "Failed to create municipality");

      // Add the newly created municipality to the current state to update UI immediately
      const newMunicipality = result?.data || result;
      setMunicipalities((prev) =>
        Array.isArray(prev) ? [newMunicipality, ...prev] : [newMunicipality],
      );
      
      // Display the auto-generated password
      setSuccessData({
        password: newMunicipality.head_password,
        email: newMunicipality.head_email,
        name: newMunicipality.official_name,
      });

      setIsModalOpen(false);
      setFormData({
        official_name: "",
        district: "",
        province: "",
        official_email: "",
        head_name: "",
        head_email: "",
        total_wards: 1,
        municipality_type: "municipality",
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
                    key={row.m_uid}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {row.official_name || (row as any).name}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.head_name}</TableCell>
                    <TableCell>{row.official_email || (row as any).email}</TableCell>
                    <TableCell>{row.head_email}</TableCell>
                    <TableCell>{formatDate(row.registered_at)}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.is_active ? "Active" : "Inactive"}
                        color={row.is_active ? "success" : "default"}
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
                        onClick={() => handleDelete(row.m_uid || (row as any).id)}
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
              label="Municipality Official Name"
              type="text"
              fullWidth
              required
              value={formData.official_name}
              onChange={(e) =>
                setFormData({ ...formData, official_name: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth margin="dense" required sx={{ mb: 2 }}>
              <InputLabel>Province</InputLabel>
              <Select
                value={formData.province}
                label="Province"
                onChange={(e) =>
                  setFormData({ ...formData, province: e.target.value as string, district: "" })
                }
              >
                {PROVINCES.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense" required sx={{ mb: 2 }} disabled={!formData.province}>
              <InputLabel>District</InputLabel>
              <Select
                value={formData.district}
                label="District"
                onChange={(e) =>
                  setFormData({ ...formData, district: e.target.value as string })
                }
              >
                {formData.province && DISTRICTS_BY_PROVINCE[formData.province] ? (
                  DISTRICTS_BY_PROVINCE[formData.province].map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>Select a province first</MenuItem>
                )}
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Official Contact Email"
              type="email"
              fullWidth
              required
              value={formData.official_email}
              onChange={(e) =>
                setFormData({ ...formData, official_email: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Total Wards"
              type="number"
              fullWidth
              required
              value={formData.total_wards}
              onChange={(e) =>
                setFormData({ ...formData, total_wards: parseInt(e.target.value) || 1 })
              }
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth margin="dense" required sx={{ mb: 3 }}>
              <InputLabel>Municipality Type</InputLabel>
              <Select
                value={formData.municipality_type}
                label="Municipality Type"
                onChange={(e) =>
                  setFormData({ ...formData, municipality_type: e.target.value as string })
                }
              >
                {MUNICIPALITY_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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

      {/* Success Dialog showing auto-generated password */}
      <Dialog open={!!successData} onClose={() => setSuccessData(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'success.main' }}>
          Municipality Provisioned Successfully
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 3 }}>
            The municipality <strong>{successData?.name}</strong> has been successfully provisioned.
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            A head user account has been automatically created. Please securely share the following temporary credentials with the municipality head:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Login Email:</strong> {successData?.email}
            </Typography>
            <Typography variant="body2">
              <strong>Temporary Password:</strong> {successData?.password}
            </Typography>
          </Paper>
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 2, fontWeight: 'bold' }}>
            Warning: Make sure to copy this password now. It will not be shown again.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSuccessData(null)} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
