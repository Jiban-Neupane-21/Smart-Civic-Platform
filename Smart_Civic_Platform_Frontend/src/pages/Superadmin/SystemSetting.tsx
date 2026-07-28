import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Skeleton,
} from "@mui/material";
import { superadminApi } from "../../api";
import type { FeatureFlag } from "../../api/types";

export default function SystemSetting() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        setLoading(true);
        const res = await superadminApi.getFeatureFlags();
        if (res.success) {
          setFlags(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load feature flags");
      } finally {
        setLoading(false);
      }
    };
    fetchFlags();
  }, []);

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      setToggling(flag.id);
      const res = await superadminApi.toggleFeatureFlag(flag.id, !flag.is_enabled);
      if (res.success) {
        setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f)));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle feature flag");
    } finally {
      setToggling(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: "bold", mb: 3 }}>
        System Settings
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Feature Flags</Typography>
        {loading ? (
          <Box>{[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1 }} />)}</Box>
        ) : flags.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No feature flags available.</Typography>
        ) : (
          <List>
            {flags.map((flag, idx) => (
              <Box key={flag.id}>
                {idx > 0 && <Divider component="li" />}
                <ListItem>
                  <ListItemText
                    primary={flag.key}
                    secondary={flag.description || "No description"}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={flag.is_enabled}
                      onChange={() => handleToggle(flag)}
                      disabled={toggling === flag.id}
                    />
                    {toggling === flag.id && <CircularProgress size={20} sx={{ ml: 1 }} />}
                  </ListItemSecondaryAction>
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>System Information</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}><strong>Version:</strong> 1.0.0</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}><strong>Environment:</strong> {import.meta.env.MODE || "development"}</Typography>
        <Typography variant="body2"><strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"}</Typography>
      </Paper>
    </Box>
  );
}
