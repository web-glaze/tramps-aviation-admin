import { FC, useEffect, useRef, useState } from 'react';
import {
  AppBar, Box, IconButton, Toolbar, Typography, Avatar, Badge, Tooltip,
  Popover, List, ListItem, ListItemText, Divider, Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useUserContext from '../../../hooks/useUser';
import { BRAND } from '../../../themes/palette';

interface AdminNotification {
  id: string;
  title: string;
  body?: string;
  type?: string;
  createdAt: string;
}

const DRAWER_WIDTH = 260;
const MINI_DRAWER_WIDTH = 70;

interface HeaderProps {
  open: boolean;
  handleDrawerToggle: () => void;
}

const Header: FC<HeaderProps> = ({ open, handleDrawerToggle }) => {
  const theme = useTheme();
  const { user, logout } = useUserContext();
  const navigate = useNavigate();

  // Notification bell — populated in real-time off the /admin socket
  // namespace. We cap the in-memory list at 50 items so the popover
  // doesn't grow unbounded over a long session; older items can be
  // viewed in the dedicated notifications page if/when we wire one up.
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const notifIdRef = useRef(0);

  useEffect(() => {
    const onNotification = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const next: AdminNotification = {
        id: detail.id || `local-${++notifIdRef.current}`,
        title: detail.title || 'New notification',
        body: detail.body,
        type: detail.type,
        createdAt: detail.createdAt || new Date().toISOString(),
      };
      setNotifications((prev) => [next, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);
    };

    // Surface booking / topup / withdraw / kyc / agent events in the bell
    // too — these are the user-actionable items an admin cares about.
    const onTopup = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      const amt = Number(d.amount || 0).toLocaleString('en-IN');
      onNotification(new CustomEvent('admin:notification', {
        detail: { title: `Top-up request: ₹${amt}`, body: d.agentName || d.agentCode, type: 'topup' },
      }));
    };
    const onWithdraw = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      const amt = Number(d.amount || 0).toLocaleString('en-IN');
      onNotification(new CustomEvent('admin:notification', {
        detail: { title: `Withdraw request: ₹${amt}`, body: d.agentName || d.agentCode, type: 'withdraw' },
      }));
    };
    const onKyc = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      onNotification(new CustomEvent('admin:notification', {
        detail: { title: 'New KYC submission', body: d.agentName || d.agentCode, type: 'kyc' },
      }));
    };
    const onAgent = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      onNotification(new CustomEvent('admin:notification', {
        detail: { title: 'New agent registered', body: d.agentName || d.email, type: 'agent' },
      }));
    };

    window.addEventListener('admin:notification', onNotification);
    window.addEventListener('admin:topup:submitted', onTopup);
    window.addEventListener('admin:withdraw:submitted', onWithdraw);
    window.addEventListener('admin:kyc:submitted', onKyc);
    window.addEventListener('admin:agent:registered', onAgent);
    return () => {
      window.removeEventListener('admin:notification', onNotification);
      window.removeEventListener('admin:topup:submitted', onTopup);
      window.removeEventListener('admin:withdraw:submitted', onWithdraw);
      window.removeEventListener('admin:kyc:submitted', onKyc);
      window.removeEventListener('admin:agent:registered', onAgent);
    };
  }, []);

  const handleBellClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    // Opening the popover marks all current notifications as read.
    setUnreadCount(0);
  };

  const handleBellClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        width: { lg: `calc(100% - ${open ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px)` },
        ml: { lg: `${open ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px` },
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        backgroundColor: theme.palette.background.paper,
        // Brand-blue bottom border so the header reads as part of the brand
        borderBottom: `2px solid ${BRAND.BLUE_LIGHT}`,
        color: theme.palette.text.primary,
      }}
    >
      <Toolbar sx={{ pr: { xs: 1, sm: 2 }, minHeight: '60px !important' }}>
        {/* Sidebar toggle — brand blue on hover */}
        <IconButton
          aria-label="open drawer"
          onClick={handleDrawerToggle}
          edge="start"
          sx={{
            color: BRAND.BLUE,
            ml: { xs: 0, lg: -2 },
            '&:hover': { background: BRAND.BLUE_TINT },
          }}
        >
          {open ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
        </IconButton>

        {/* Page title area */}
        <Box sx={{ flexGrow: 1, px: 2 }}>
          <Typography variant="h6" sx={{ color: BRAND.BLUE, fontWeight: 700, fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
            Tramps Aviation
            <Typography component="span" sx={{ color: BRAND.ORANGE, fontWeight: 700, fontSize: '0.7rem', ml: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Admin
            </Typography>
          </Typography>
        </Box>

        {/* Right actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications — orange accent badge, real-time via /admin socket */}
          <Tooltip title="Notifications">
            <IconButton
              size="medium"
              onClick={handleBellClick}
              sx={{
                color: BRAND.BLUE,
                '&:hover': { background: BRAND.BLUE_TINT },
              }}
            >
              <Badge
                badgeContent={unreadCount}
                invisible={unreadCount === 0}
                sx={{
                  '& .MuiBadge-badge': {
                    background: BRAND.ORANGE,
                    color: '#fff',
                    fontWeight: 700,
                  },
                }}
              >
                <BellOutlined style={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Popover
            open={!!anchorEl}
            anchorEl={anchorEl}
            onClose={handleBellClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { width: 360, maxHeight: 480, borderRadius: 2 } }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${BRAND.BLUE_LIGHT}` }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: BRAND.BLUE_DARK }}>
                Notifications
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {notifications.length === 0 ? 'No notifications yet' : `${notifications.length} recent`}
              </Typography>
            </Box>
            {notifications.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">You're all caught up</Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {notifications.map((n, i) => (
                  <Box key={n.id}>
                    <ListItem alignItems="flex-start" sx={{ py: 1.2 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={600} sx={{ color: BRAND.BLUE_DARK }}>
                            {n.title}
                          </Typography>
                        }
                        secondary={
                          <>
                            {n.body && (
                              <Typography component="span" variant="caption" display="block" color="text.secondary">
                                {n.body}
                              </Typography>
                            )}
                            <Typography component="span" variant="caption" color="text.disabled">
                              {new Date(n.createdAt).toLocaleString('en-IN')}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    {i < notifications.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
            {notifications.length > 0 && (
              <Box sx={{ p: 1, borderTop: `1px solid ${BRAND.BLUE_LIGHT}`, textAlign: 'center' }}>
                <Button size="small" onClick={() => { setNotifications([]); handleBellClose(); }}>
                  Clear all
                </Button>
              </Box>
            )}
          </Popover>

          {/* Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', ml: 1 }}>
            <Avatar
              sx={{
                width: 36, height: 36,
                background: BRAND.GRADIENT_BLUE,
                fontSize: '0.85rem',
                fontWeight: 700,
                border: `2px solid ${BRAND.ORANGE_LIGHT}`,
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, color: BRAND.BLUE_DARK }}>
                {user?.name || 'Admin'}
              </Typography>
              <Typography variant="caption" sx={{ color: BRAND.ORANGE, fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user?.designation || (user?.role === 'admin' ? 'Primary Admin' : 'Sub Admin')}
              </Typography>
            </Box>
          </Box>

          {/* Logout */}
          <Tooltip title="Logout">
            <IconButton onClick={handleLogout} sx={{ color: BRAND.ORANGE, ml: 0.5, '&:hover': { background: BRAND.ORANGE_TINT } }} size="small">
              <LogoutOutlined />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
