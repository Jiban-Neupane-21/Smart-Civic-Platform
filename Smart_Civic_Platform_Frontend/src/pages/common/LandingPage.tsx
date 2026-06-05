import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  CardActions,
  Collapse,
  IconButton,
  Divider,
  Stack,
  Chip,
} from "@mui/material";
import {
  Search as SearchIcon,
  ReportProblem as ReportIcon,
  AccountBalanceWallet as WalletIcon,
  Description as PermitIcon,
  Business as DeptIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  LocalShipping as ShippingIcon,
  CheckCircleOutlined as CheckIcon,
  AccessTime as TimeIcon,
  Phone as PhoneIcon,
  ArrowForward as ArrowIcon,
} from "@mui/icons-material";

// --- Mock Data ---
const TOP_SERVICES = [
  {
    title: "Report an Issue",
    desc: "File complaints for potholes, broken streetlights, or missed trash.",
    icon: <ReportIcon fontSize="large" color="primary" />,
  },
  {
    title: "Pay Utilities & Taxes",
    desc: "Securely view and pay your water bills, property taxes, and fines.",
    icon: <WalletIcon fontSize="large" color="primary" />,
  },
  {
    title: "Permits & Licensing",
    desc: "Apply for residential parking, building permits, or business licenses.",
    icon: <PermitIcon fontSize="large" color="primary" />,
  },
  {
    title: "City Departments",
    desc: "Contact or find information regarding specific municipal offices.",
    icon: <DeptIcon fontSize="large" color="primary" />,
  },
];

const METRICS = [
  {
    label: "Active Service Vehicles",
    value: "142",
    icon: <ShippingIcon color="action" />,
  },
  {
    label: "Issues Resolved Today",
    value: "1,849",
    icon: <CheckIcon color="success" />,
  },
  {
    label: "Avg. Response Time",
    value: "2.4 Hrs",
    icon: <TimeIcon color="action" />,
  },
];

const NEWS = [
  {
    date: "June 1, 2026",
    tag: "Infrastructure",
    title: "Downtown Water Main Upgrades Slated for July",
    desc: "City Council approves modern infrastructure overhaul to improve water pressure for over 10,000 residents.",
  },
  {
    date: "May 28, 2026",
    tag: "Community",
    title: "Annual Town Hall Meeting Scheduled",
    desc: "Join Mayor and city officials on June 15th to discuss the upcoming fiscal year budget allocation.",
  },
];

export default function SmartCitizenLanding() {
  const navigate = useNavigate();
  const [alertOpen, setAlertOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Searching for: ${searchQuery}`);
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: "#FAFAFA", minHeight: "100vh" }}>
      {/* 1. Header / Navigation */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: alpha("#ffffff", 0.85),
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            disableGutters
            sx={{ justifyContent: "space-between", minHeight: 72 }}
          >
            {/* Logo Brand Section */}
            <Stack
              direction="row"
              spacing={1.5}
              onClick={() => navigate("/")}
              sx={{
                cursor: "pointer",
                userSelect: "none",
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  background:
                    "linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)",
                  boxShadow: (theme) =>
                    `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              />
              <Typography
                variant="h6"
                component="h1"
                sx={{
                  fontWeight: 800,
                  tracking: "-0.02em",
                  color: "text.primary",
                }}
              >
                Smart
                <Box component="span" sx={{ color: "primary.main", ml: 0.5 }}>
                  Citizen
                </Box>
              </Typography>
            </Stack>

            {/* Action Authentication Buttons */}
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Button
                variant="text"
                color="primary"
                onClick={() => navigate("/login")}
                sx={{
                  fontWeight: 600,
                  textTransform: "none",
                  px: 2,
                  py: 1.2,
                  borderRadius: 50,
                  color: "text.secondary",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    backgroundColor: (theme) =>
                      alpha(theme.palette.primary.main, 0.08),
                    color: "primary.main",
                  },
                }}
              >
                Log In
              </Button>

              <Divider
                orientation="vertical"
                flexItem
                sx={{ height: 20, my: "auto" }}
              />

              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate("/register")}
                disableElevation
                sx={{
                  fontWeight: 600,
                  textTransform: "none",
                  px: 4,
                  py: 1.2,
                  borderRadius: 50,
                  background:
                    "linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)",
                  boxShadow: (theme) =>
                    `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #0a3981 0%, #0d47a1 100%)",
                    boxShadow: (theme) =>
                      `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                }}
              >
                Register
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* 2. Emergency Alert Banner */}
      <Collapse in={alertOpen}>
        <Box
          sx={{ bgcolor: "error.main", color: "error.contrastText", py: 1.5 }}
        >
          <Container maxWidth="lg">
            <Stack
              sx={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Stack
                spacing={1.5}
                sx={{ flexDirection: "row", alignItems: "center" }}
              >
                <WarningIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  <strong>Notice:</strong> Scheduled water maintenance in Zone 4
                  this Thursday from 08:00 to 14:00. Plan accordingly.
                </Typography>
              </Stack>
              <IconButton
                size="small"
                onClick={() => setAlertOpen(false)}
                sx={{
                  color: "inherit",
                  opacity: 0.8,
                  "&:hover": { opacity: 1 },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Container>
        </Box>
      </Collapse>

      {/* 3. Hero Section */}
      <Box
        sx={{
          position: "relative",
          bgcolor: "#0B1120",
          color: "white",
          pt: { xs: 12, md: 18 },
          pb: { xs: 12, md: 20 },
          overflow: "hidden",
        }}
      >
        {/* Ambient Background Glows */}
        <Box
          sx={{
            position: "absolute",
            top: -150,
            left: -150,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(25,118,210,0.25) 0%, rgba(0,0,0,0) 70%)",
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -150,
            right: -150,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(156,39,176,0.15) 0%, rgba(0,0,0,0) 70%)",
            zIndex: 0,
          }}
        />

        <Container
          maxWidth="md"
          sx={{ position: "relative", zIndex: 1, textAlign: "center" }}
        >
          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontWeight: 800,
              mb: 3,
              fontSize: { xs: "2.5rem", md: "4rem" },
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Your Direct Connection <br />
            <Box component="span" sx={{ color: "#60A5FA" }}>
              To City Hall
            </Box>
          </Typography>
          <Typography
            variant="h6"
            sx={{
              mb: 6,
              opacity: 0.8,
              fontWeight: 400,
              maxWidth: 600,
              mx: "auto",
            }}
          >
            Access municipal services, submit requests, and track utility data
            online, anytime, from anywhere.
          </Typography>

          {/* Omni-Search Bar */}
          <Box
            component="form"
            onSubmit={handleSearchSubmit}
            sx={{
              maxWidth: 650,
              mx: "auto",
              display: "flex",
              background: "#ffffff",
              borderRadius: "50px",
              p: 1,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="What are you looking for today? (e.g., pay property tax)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { border: "none" },
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start" sx={{ pl: 1 }}>
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disableElevation
              sx={{
                borderRadius: "40px",
                px: 4,
                py: 1.5,
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              Search
            </Button>
          </Box>
        </Container>
      </Box>

      {/* 4. Top Services Grid */}
      <Container
        maxWidth="lg"
        sx={{ mt: -8, mb: 10, position: "relative", zIndex: 2 }}
      >
        <Grid container spacing={4}>
          {TOP_SERVICES.map((service, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 4,
                  bgcolor: "#ffffff",
                  border: "1px solid",
                  borderColor: "grey.200",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
                    borderColor: "primary.light",
                    "& .service-btn": {
                      gap: 1.5,
                      color: "primary.main",
                    },
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, pt: 4, px: 3 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 3,
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.08),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 3,
                    }}
                  >
                    {service.icon}
                  </Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ fontWeight: 700, mb: 1.5, fontSize: "1.1rem" }}
                  >
                    {service.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6 }}
                  >
                    {service.desc}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 3, pb: 4, pt: 0 }}>
                  <Button
                    className="service-btn"
                    size="small"
                    variant="text"
                    color="inherit"
                    endIcon={<ArrowIcon fontSize="small" />}
                    sx={{
                      fontWeight: 600,
                      p: 0,
                      color: "text.secondary",
                      transition: "all 0.2s",
                      "&:hover": {
                        background: "transparent",
                        color: "primary.main",
                      },
                    }}
                onClick={() => navigate("/login")}
                  >
                    Get Started
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* 5. Metrics & Dashboard Component */}
      <Box sx={{ bgcolor: "#F1F5F9", py: 10, mb: 10 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
              Live City Metrics
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: "auto" }}
            >
              Real-time transparency into municipal operations. See how we're
              maintaining and improving our city today.
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {METRICS.map((metric, idx) => (
              <Grid size={{ xs: 12, md: 4 }} key={idx}>
                <Card
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                  }}
                >
                  <Box
                    sx={{
                      p: 2.5,
                      bgcolor: "#ffffff",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    {metric.icon}
                  </Box>
                  <Box>
                    <Typography
                      variant="h3"
                      sx={{ fontWeight: 800, mb: 0.5, color: "text.primary" }}
                    >
                      {metric.value}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {metric.label}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 6. News & Events */}
      <Container maxWidth="lg" sx={{ mb: 12 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            mb: 5,
            alignItems: { xs: "flex-start", sm: "flex-end" },
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              Latest Updates
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Stay informed with news directly from the City Council.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            endIcon={<ArrowIcon />}
            sx={{ borderRadius: "50px", px: 3 }}
          >
            View All News
          </Button>
        </Stack>
        <Grid container spacing={4}>
          {NEWS.map((item, idx) => (
            <Grid size={{ xs: 12, md: 6 }} key={idx}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: "grey.200",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "translateY(-4px)" },
                }}
              >
                <Box
                  sx={{
                    px: 3,
                    py: 2,
                    borderBottom: "1px solid",
                    borderColor: "grey.100",
                    bgcolor: "grey.50",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Chip
                    label={item.tag}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 600, borderRadius: "8px" }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: "text.secondary" }}
                  >
                    {item.date}
                  </Typography>
                </Box>
                <CardContent sx={{ p: 4 }}>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, mb: 2, lineHeight: 1.3 }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6, mb: 3 }}
                  >
                    {item.desc}
                  </Typography>
                  <Button size="small" sx={{ fontWeight: 600, p: 0 }}>
                    Read Article &rarr;
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* 7. Footer */}
      <Box sx={{ bgcolor: "#020617", color: "#F8FAFC", pt: 8, pb: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ mb: 6 }}>
            <Grid size={{ xs: 6, md: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                SmartCitizen Portal
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.7, lineHeight: 1.6, mb: 2 }}
              >
                Providing accessible, transparent, and swift digital municipal
                services to enhance community life.
              </Typography>
              <Stack
                spacing={1.5}
                sx={{
                  flexDirection: "row",
                  alignItems: "center",
                  color: "#60A5FA",
                }}
              >
                <PhoneIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Emergency Helpline: 311 or 911
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 2, textTransform: "uppercase" }}
              >
                Quick Links
              </Typography>
              <Stack spacing={1}>
                {[
                  "About City Hall",
                  "Privacy Policy",
                  "Terms of Service",
                  "Accessibility Statement",
                  "Submit Feedback",
                ].map((link, i) => (
                  <Typography
                    key={i}
                    variant="body2"
                    component="a"
                    href="#"
                    sx={{
                      color: "inherit",
                      opacity: 0.6,
                      textDecoration: "none",
                      "&:hover": { opacity: 1, color: "#60A5FA" },
                    }}
                  >
                    {link}
                  </Typography>
                ))}
              </Stack>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 2, textTransform: "uppercase" }}
              >
                Contact Info
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.6, mb: 2, lineHeight: 1.8 }}
              >
                City Hall Administrative Building
                <br />
                101 Civic Square, Suite A
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.6, lineHeight: 1.8 }}
              >
                Mon - Fri: 8:00 AM - 5:00 PM
                <br />
                Sat - Sun: Closed
              </Typography>
            </Grid>
          </Grid>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 4 }} />
          <Typography
            variant="caption"
            sx={{ display: "block", textAlign: "center", opacity: 0.4 }}
          >
            &copy; {new Date().getFullYear()} Municipal Government Ecosystem.
            All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
