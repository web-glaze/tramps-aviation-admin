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
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
      }}
    >
      <Toolbar sx={{ pr: { xs: 1, sm: 2 }, minHeight: '60px !important' }}>
        {/* Sidebar toggle */}
        <IconButton
          aria-label="open drawer"
          onClick={handleDrawerToggle}
          edge="start"
          color="secondary"
          sx={{ color: 'text.primary', bgcolor: 'transparent', ml: { xs: 0, lg: -2 } }}
        >
          {open ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
        </IconButton>

        {/* Page title area */}
        <Box sx={{ flexGrow: 1, px: 2 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 400, fontSize: '0.8rem' }}>
            Tramps Aviation Admin
          </Typography>
        </Box>

        {/* Right actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton size="medium" sx={{ color: 'text.secondary' }}>
              <Badge badgeContent={3} color="error">
                <BellOutlined style={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', ml: 1 }}>
            <Avatar
              sx={{
                width: 34, height: 34,
                bgcolor: 'primary.main',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {user?.name || 'Admin'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Administrator
              </Typography>
            </Box>
          </Box>

          {/* Logout */}
          <Tooltip title="Logout">
            <IconButton onClick={handleLogout} sx={{ color: 'error.main', ml: 0.5 }} size="small">
              <LogoutOutlined />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
