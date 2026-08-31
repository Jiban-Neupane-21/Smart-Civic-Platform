import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import { useNotificationPolling } from '../../hooks/useNotificationPolling';

type SlideProps = React.ComponentProps<typeof Slide>;

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export function NotificationToast() {
  const { notifications } = useNotificationPolling();
  const [open, setOpen] = useState(false);
  const [toastNotif, setToastNotif] = useState<any>(null);
  const [prevNotifIds, setPrevNotifIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Basic toast logic for new unread notifications that are not urgent
    const newUnread = notifications.filter(n => !n.read_at && !n.is_urgent);
    if (newUnread.length > 0) {
      const latest = newUnread[0];
      if (!prevNotifIds.has(latest.id)) {
        setToastNotif(latest);
        setOpen(true);
        setPrevNotifIds(prev => {
          const next = new Set(prev);
          next.add(latest.id);
          return next;
        });
      }
    }
  }, [notifications, prevNotifIds]);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  if (!toastNotif) return null;

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      TransitionComponent={SlideTransition}
    >
      <Alert onClose={handleClose} severity="info" variant="filled" sx={{ width: '100%', boxShadow: 3 }}>
        <strong>{toastNotif.title}</strong>
        <br />
        {toastNotif.body}
      </Alert>
    </Snackbar>
  );
}
