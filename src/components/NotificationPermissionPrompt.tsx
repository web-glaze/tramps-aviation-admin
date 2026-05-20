import { FC, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Stack,
} from '@mui/material';
import { BellOutlined, CloseOutlined } from '@ant-design/icons';
import {
  initFCM,
  isFCMSupported,
  getFCMPermissionState,
} from '../lib/fcm/web-messaging';

const STORAGE_KEY = 'fcm-prompt-dismissed-at';
const PROMPT_COOLDOWN_DAYS = 7;

/**
 * NotificationPermissionPrompt — bottom-right card that asks admins to enable
 * browser push notifications. Mirrors the B2B portal prompt but rendered with
 * MUI so it fits the admin theme.
 *
 * Behaviour:
 *  • Hidden when FCM isn't supported or env vars aren't configured
 *  • Hidden if permission is already granted/denied
 *  • Hidden for 7 days after a Not-Now dismissal (stored in localStorage)
 *  • Surfaces 5s after mount so it never blocks the initial paint
 */
const NotificationPermissionPrompt: FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isFCMSupported()) return;

    const state = getFCMPermissionState();
    if (state !== 'default') return;

    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < PROMPT_COOLDOWN_DAYS) return;
    }

    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setShow(false);
    await initFCM();
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  if (!show) return null;

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1500,
        maxWidth: 360,
        p: 2,
        borderRadius: 2,
      }}
    >
      <IconButton
        size="small"
        onClick={handleDismiss}
        sx={{ position: 'absolute', top: 4, right: 4 }}
        aria-label="Dismiss"
      >
        <CloseOutlined style={{ fontSize: 14 }} />
      </IconButton>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'primary.lighter',
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <BellOutlined style={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ pr: 3 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Stay updated in real time
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Enable browser notifications to get instant alerts on new top-up
            requests, withdraw approvals, bookings, and KYC submissions — even
            with the admin panel closed.
          </Typography>
          <Stack direction="row" spacing={1} mt={1.5}>
            <Button size="small" variant="contained" onClick={handleEnable}>
              Enable
            </Button>
            <Button size="small" variant="text" color="inherit" onClick={handleDismiss}>
              Not now
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default NotificationPermissionPrompt;
