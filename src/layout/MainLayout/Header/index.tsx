import { FC } from 'react';
import {
  AppBar, Box, IconButton, Toolbar, Typography, Avatar, Badge, Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useUserContext from '../../../hooks/useUser';
import { BRAND } from '../../../themes/palette';

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
          {/* Notifications — orange accent badge */}
          <Tooltip title="Notifications">
            <IconButton
              size="medium"
              sx={{
                color: BRAND.BLUE,
                '&:hover': { background: BRAND.BLUE_TINT },
              }}
            >
              <Badge
                badgeContent={3}
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
