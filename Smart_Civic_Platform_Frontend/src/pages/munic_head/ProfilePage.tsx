import React from "react";
import {
  Box,
  Typography,
  Card,
  Grid,
  Avatar,
  TextField,
  Button,
  Divider,
  Paper,
  Chip,
} from "@mui/material";
import { Save, Shield, Mail, User, Briefcase } from "lucide-react";
import { useAuth } from "../../hooks/useAuth"

export default function ProfilePage() {
  const { user } = useAuth();

  // If user is not yet loaded, we could return a loader. Assuming user is always present in protected routes.
  if (!user) return null;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, margin: "0 auto" }}>
      <Typography variant="h4" fontWeight="800" mb={1} color="text.primary">
        Account Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Manage your administrative profile and view your credentials.
      </Typography>

      <Grid container spacing={4}>
        {/* Left Side Info Summary Card */}
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              p: 4, 
              textAlign: "center", 
              height: "100%",
              borderRadius: 4,
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <Avatar
              sx={{
                width: 100,
                height: 100,
                mb: 2,
                bgcolor: "primary.main",
                fontSize: "2.5rem",
                boxShadow: "0 4px 10px rgba(99, 102, 241, 0.3)",
              }}
            >
              {user.full_name?.charAt(0)?.toUpperCase() || "M"}
            </Avatar>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {user.full_name}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {user.email}
            </Typography>
            <Box
              mt={2}
              px={2}
              py={0.75}
              sx={{ 
                bgcolor: "primary.50", 
                color: "primary.main",
                borderRadius: 2,
                display: "inline-flex",
                alignItems: "center",
                gap: 1
              }}
            >
              <Shield size={16} />
              <Typography variant="body2" fontWeight="600" sx={{ textTransform: "capitalize" }}>
                {user.role.replace("_", " ")}
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Right Side Settings Form */}
        <Grid item xs={12} md={8}>
          <Card 
            sx={{ 
              borderRadius: 4,
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              overflow: "hidden"
            }}
          >
            <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
              <Typography variant="h6" fontWeight="700">
                Personal Information
              </Typography>
            </Box>
            
            <Box sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    label="Full Name"
                    variant="outlined"
                    fullWidth
                    defaultValue={user.full_name}
                    InputProps={{
                      readOnly: true,
                    }}
                    helperText="Name changes require Superadmin approval."
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Email Address"
                    variant="outlined"
                    fullWidth
                    defaultValue={user.email}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Role"
                    variant="outlined"
                    fullWidth
                    defaultValue="Municipality Head"
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Grid>
              </Grid>

              <Box mt={4} pt={3} borderTop={1} borderColor="divider" display="flex" justifyContent="flex-end" gap={2}>
                <Button variant="outlined" color="primary" disabled>
                  Change Password
                </Button>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<Save size={18} />}
                  disabled
                >
                  Save Changes
                </Button>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
