import React, { useEffect, useState } from 'react';
import { Box, Typography, IconButton, alpha, useTheme, Slide } from '@mui/material';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import { useNotificationPolling } from '../../hooks/useNotificationPolling';

export function UrgentBanner() {
  const theme = useTheme();
  const { notifications, markAsRead } = useNotificationPolling();
  const [activeBanner, setActiveBanner] = useState<any>(null);

  useEffect(() => {
    // Find first unread urgent notification
    const urgent = notifications.find(n => n.is_urgent && !n.read_at);
    setActiveBanner(urgent || null);
  }, [notifications]);

  const handleDismiss = async () => {
    if (activeBanner) {
      await markAsRead(activeBanner.id);
      setActiveBanner(null);
    }
  };

  if (!activeBanner) return null;

  return (
    <Slide direction="down" in={!!activeBanner} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.appBar + 10,
          bgcolor: 'error.main',
          color: 'error.contrastText',
          px: 3,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: `0 4px 20px ${alpha(theme.palette.error.main, 0.4)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FiAlertTriangle size={24} />
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {activeBanner.title}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {activeBanner.body}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={handleDismiss} sx={{ color: 'inherit', ml: 2 }}>
          <FiX />
        </IconButton>
      </Box>
    </Slide>
  );
}
