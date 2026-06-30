import React, { useState } from "react";
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
  SelectChangeEvent,
} from "@mui/material";
import { CloudUpload } from "@mui/icons-material";

interface ComplaintForm {
  category: string;
  title: string;
  description: string;
  location: string;
  attachment: File | null;
}

export const SubmitComplaint: React.FC = () => {
  const [form, setForm] = useState<ComplaintForm>({
    category: "",
    title: "",
    description: "",
    location: "",
    attachment: null,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    setForm((prev) => ({ ...prev, category: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForm((prev) => ({ ...prev, attachment: e.target.files![0] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting Complaint Data:", form);
    // Integrate Supabase/Backend action here
  };

  return (
    <Box p={3} maxWidth="md" sx={{ margin: "0 auto" }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Submit a New Complaint
      </Typography>
      <Card sx={{ p: 4 }}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="category-label">
                  Department / Category
                </InputLabel>
                <Select
                  labelId="category-label"
                  name="category"
                  value={form.category}
                  label="Department / Category"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="garbage">Garbage & Waste Routing</MenuItem>
                  <MenuItem value="infrastructure">
                    Roads & Infrastructure
                  </MenuItem>
                  <MenuItem value="utilities">
                    Water & Public Utilities
                  </MenuItem>
                  <MenuItem value="safety">Public Safety</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Complaint Title"
                name="title"
                value={form.title}
                onChange={handleInputChange}
                placeholder="Brief summary of the issue"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Location / Address"
                name="location"
                value={form.location}
                onChange={handleInputChange}
                placeholder="E.g., 42 Civic Way, Ward 3"
              />
            </Grid>

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
                placeholder="Provide details that can help utility staff track down or resolve the issue..."
              />
            </Grid>

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

            <Grid item xs={12} display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="outlined" color="secondary" href="/dashboard">
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary">
                Submit Ticket
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Card>
    </Box>
  );
};
