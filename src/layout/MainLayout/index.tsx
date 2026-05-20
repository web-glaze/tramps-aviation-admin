import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Box, Toolbar, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Header from './Header';
import Drawer from './Drawer';
import { ActionType } from '../../hooks/useMenu';
import useMenu from '../../hooks/useMenu';
import useUserContext from '../../hooks/useUser';
import NotificationPermissionPrompt from '../../components/NotificationPermissionPrompt';
import {
  initFCM,
  isFCMSupported,
  getFCMPermissionState,
} from '../../lib/fcm/web-messaging';

const DRAWER_WIDTH = 260;
const MINI_DRAWER_WIDTH = 70;

const MainLayout = () => {
  const theme = useTheme();
  const { isAuthenticated } = useUserContext();
  const matchDownLG = useMediaQuery(theme.breakpoints.down('lg'));

  const { menu, setMenu: dispatch } = useMenu();
  const { drawerOpen } = menu;

  const [open, setOpen] = useState(drawerOpen);

  const handleDrawerToggle = () => {
    setOpen(!open);
    dispatch({ type: ActionType.OPEN_DRAWER, payload: !open });
  };

  useEffect(() => {
    setOpen(!matchDownLG);
    dispatch({ type: ActionType.OPEN_DRAWER, payload: !matchDownLG });
    // eslint-disable-next-line
  }, [matchDownLG]);

  useEffect(() => {
    if (open !== drawerOpen) setOpen(drawerOpen);
    // eslint-disable-next-line
  }, [drawerOpen]);

  // ── FCM auto-init for returning admins ────────────────────────────────────
  // If permission was granted in a previous session, silently re-register
  // the SW + refresh the device token so the backend always has a current
  // entry. New admins see the NotificationPermissionPrompt instead.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isFCMSupported()) return;
    if (getFCMPermissionState() === 'granted') {
      initFCM();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Header open={open} handleDrawerToggle={handleDrawerToggle} />
      <Drawer open={open} handleDrawerToggle={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          overflow: 'hidden',
          width: { xs: '100%', lg: `calc(100% - ${open ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px)` },
          ml: { xs: 0, lg: `${open ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px` },
          transition: theme.transitions.create(['width', 'margin-left'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important' }} />
        <Outlet />
      </Box>
      <NotificationPermissionPrompt />
    </Box>
  );
};

export default MainLayout;
