import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  TextField,
  Button,
  MenuItem,
  Grid,
  InputLabel,
  FormControl,
  Select,
  Chip,
  FormHelperText,
  CircularProgress,
  Alert,
  type SelectChangeEvent,
} from "@mui/material";
import { CloudUpload, Send, HomeWork } from "@mui/icons-material";
import Swal from "sweetalert2";
import { fetchWithAuth, BASE_URL } from "../../api";
import { LocationPickerMap } from "../../components/LocationPickerMap";
import { useAuth } from "../../hooks/useAuth";

interface MunicipalityItem {
  id: string;
  official_name: string;
  local_level_type?: string;
}

interface ComplaintForm {
  municipality_id: string;
  category: string;
  category_id?: string;
  title: string;
  description: string;
  location: string;
  attachment: File | null;
}

const formatCategoryLabel = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const SubmitComplaint: React.FC = () => {
  const navigate = useNavigate();

  const { user } = useAuth();
  const userMunicipalityId = (user as any)?.municipality_id || (user as any)?.municipalityId;


  const [form, setForm] = useState<ComplaintForm>({
    municipality_id: "",
    category: "",
    category_id: "",
    title: "",
    description: "",
    location: "",
    attachment: null,
  });

  const [municipalities, setMunicipalities] = useState<MunicipalityItem[]>([]);
  const [municipalitiesLoading, setMunicipalitiesLoading] = useState(true);

  const [categories, setCategories] = useState<{ id?: string; name: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 1. Fetch Municipalities
  const fetchMunicipalities = async () => {
    try {
      setMunicipalitiesLoading(true);
      const res = await fetch(`${BASE_URL}/citizen/municipalities`);
      if (res.ok) {
        const result = await res.json();
        const list: MunicipalityItem[] = result.data || [];
        setMunicipalities(list);
        if (list.length > 0) {
          // Pre-select user's registered home municipality if available
          const registeredMatch = userMunicipalityId && list.find((m) => m.id === userMunicipalityId);
          setForm((prev) => ({
            ...prev,
            municipality_id: registeredMatch ? registeredMatch.id : list[0].id,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch municipalities:", err);
    } finally {
      setMunicipalitiesLoading(false);
    }
  };

  // 2. Fetch Department/Complaint Categories
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const res = await fetchWithAuth(
        `${BASE_URL}/municipality/departments/categories`
      );
      if (res.ok) {
        const result = await res.json();
        const rawData = result.data || [];
        // Support both string array and object array schemas
        const parsed = rawData.map((item: any) => {
          if (typeof item === "string") {
            return { name: item };
          }
          return {
            id: item.id,
            name: item.category_name || item.department_category || item.name || "General",
          };
        });
        setCategories(parsed);
        if (parsed.length > 0) {
          setForm((prev) => ({
            ...prev,
            category: parsed[0].name,
            category_id: parsed[0].id || "",
          }));
        }
      } else {
        setCategoriesError("Failed to load complaint categories.");
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setCategoriesError("Failed to load complaint categories.");
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchMunicipalities();
    fetchCategories();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    if (name === "category") {
      const selectedObj = categories.find((c) => c.name === value);
      setForm((prev) => ({
        ...prev,
        category: value,
        category_id: selectedObj?.id || "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForm((prev) => ({ ...prev, attachment: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!form.municipality_id) {
      setSubmitError("Please select a target municipality.");
      return;
    }
    if (!form.title.trim()) {
      setSubmitError("Please enter a complaint title.");
      return;
    }
    if (!form.description.trim()) {
      setSubmitError("Please enter a detailed description.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build full description incorporating location details
      const fullDescription = form.location
        ? `📍 Location: ${form.location}\n\n${form.description}`
        : form.description;

      const payload: Record<string, any> = {
        municipality_id: form.municipality_id,
        title: form.title,
        description: fullDescription,
      };

      if (form.category_id) {
        payload.category_id = form.category_id;
      }

      const res = await fetchWithAuth(`${BASE_URL}/citizen/complaints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(
          responseData.error || responseData.message || "Failed to submit complaint"
        );
      }

      Swal.fire({
        icon: "success",
        title: "Complaint Submitted!",
        text: "Your ticket has been logged successfully and forwarded to municipal authorities.",
        confirmButtonColor: "#1976d2",
      }).then(() => {
        navigate("/citizen/complaints");
      });
    } catch (err: any) {
      console.error("Submission Error:", err);
      setSubmitError(err.message || "An error occurred while submitting your ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box p={3} maxWidth="md" sx={{ margin: "0 auto" }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Submit a New Complaint
      </Typography>

      <Card sx={{ p: 4 }}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Municipality Selector */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="municipality-label">Target Municipality</InputLabel>
                <Select
                  labelId="municipality-label"
                  name="municipality_id"
                  value={form.municipality_id}
                  label="Target Municipality"
                  onChange={handleSelectChange}
                  disabled={municipalitiesLoading || isSubmitting}
                  endAdornment={
                    municipalitiesLoading ? (
                      <CircularProgress size={20} sx={{ mr: 2 }} />
                    ) : null
                  }
                >
                  {municipalities.map((muni) => (
                    <MenuItem key={muni.id} value={muni.id}>
                      {muni.official_name}
                    </MenuItem>
                  ))}
                </Select>
                {form.municipality_id && form.municipality_id === userMunicipalityId && (
                  <FormHelperText sx={{ color: "success.main", display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                    <HomeWork fontSize="inherit" /> Auto-selected: Registered Home Municipality
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>

            {/* Department / Category Selector */}
            <Grid item xs={12} sm={6}>
              {categoriesError && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {categoriesError}
                </Alert>
              )}
              <FormControl fullWidth required>
                <InputLabel id="category-label">Department / Category</InputLabel>
                <Select
                  labelId="category-label"
                  name="category"
                  value={form.category}
                  label="Department / Category"
                  onChange={handleSelectChange}
                  disabled={categoriesLoading || isSubmitting}
                  endAdornment={
                    categoriesLoading ? (
                      <CircularProgress size={20} sx={{ mr: 2 }} />
                    ) : null
                  }
                >
                  {categories.map((cat, idx) => (
                    <MenuItem key={cat.id || idx} value={cat.name}>
                      {formatCategoryLabel(cat.name)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Complaint Title */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Complaint Title"
                name="title"
                value={form.title}
                onChange={handleInputChange}
                disabled={isSubmitting}
                placeholder="Brief summary of the issue (e.g., Broken street light near Ward 3 office)"
              />
            </Grid>

            {/* Location & Interactive Map */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Location / Address"
                name="location"
                value={form.location}
                onChange={handleInputChange}
                disabled={isSubmitting}
                placeholder="E.g., 42 Civic Way, Ward 3"
              />
              <LocationPickerMap
                onLocationSelect={(address) => {
                  setForm((prev) => ({ ...prev, location: address }));
                }}
              />
            </Grid>

            {/* Detailed Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={4}
                label="Detailed Description"
                name="description"
                value={form.description}
                onChange={handleInputChange}
                disabled={isSubmitting}
                placeholder="Provide details that can help municipal staff track down or resolve the issue..."
              />
            </Grid>

            {/* Upload Attachment */}
            <Grid item xs={12}>
              <Box
                sx={{
                  border: "2px dashed #ccc",
                  p: 3,
                  textAlign: "center",
                  borderRadius: 2,
                  bgcolor: "#fafafa",
                }}
              >
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  disabled={isSubmitting}
                  sx={{ mb: 1 }}
                >
                  Upload Image / Proof
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </Button>
                <Typography variant="body2" color="textSecondary">
                  {form.attachment
                    ? `Selected: ${form.attachment.name}`
                    : "PNG, JPG, or PDF up to 5MB"}
                </Typography>
              </Box>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12} display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => navigate("/dashboard")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={
                  isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />
                }
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Card>
    </Box>
  );
};
