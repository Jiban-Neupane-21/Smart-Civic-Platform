import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  Grid,
  Avatar,
  TextField,
  Button,
  Divider,
} from "@mui/material";
import { Save, Shield } from "@mui/icons-material";

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState({
    fullName: "Jane Doe",
    email: "jane.doe@civicmail.com",
    phone: "+1 (555) 019-2834",
    wardNo: "Ward 3, Square District",
    nationalId: "********-4920",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  return (
    <Box p={3} maxWidth="md" sx={{ margin: "0 auto" }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Account Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Left Side Info Summary Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, textAlign: "center", height: "100%" }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                mx: "auto",
                mb: 2,
                bgcolor: "primary.main",
                fontSize: "2rem",
              }}
            >
              JD
            </Avatar>
            <Typography variant="h6" fontWeight="bold">
              {profile.fullName}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {profile.email}
            </Typography>
            <Box
              mt={2}
              px={1}
              py={0.5}
              sx={{ bgcolor: "action.hover", borderRadius: 1 }}
            >
              <Typography
                variant="caption"
                fontWeight="bold"
                color="textSecondary"
              >
                REGIONAL RESIDENT
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Right Side Editing Card */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Personal Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  disabled
                  label="Email Address (Locked)"
                  name="email"
                  value={profile.email}
                  helperText="Contact municipality registry support to switch email identities."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  disabled
                  label="Assigned Civic Ward Location"
                  value={profile.wardNo}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  disabled
                  label="National Identification Code"
                  value={profile.nationalId}
                />
              </Grid>
            </Grid>

            <Box my={4}>
              <Divider />
            </Box>

            <Typography
              variant="h6"
              fontWeight="bold"
              mb={2}
              display="flex"
              alignItems="center"
              gap={1}
            >
              <Shield fontSize="small" color="primary" /> Security & Session
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="New Password"
                  placeholder="••••••••"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="Confirm New Password"
                  placeholder="••••••••"
                />
              </Grid>
            </Grid>

            <Box mt={4} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                startIcon={<Save />}
                color="primary"
                onClick={() =>
                  console.log("Saving profile payload...", profile)
                }
              >
                Save Changes
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
