import { FC } from 'react';
import { Box, Drawer as MuiDrawer, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DrawerHeader from './DrawerHeader';
import DrawerContent from './DrawerContent';

const DRAWER_WIDTH = 260;
const MINI_DRAWER_WIDTH = 70;

interface DrawerProps {
  open: boolean;
  handleDrawerToggle: () => void;
}

const Drawer: FC<DrawerProps> = ({ open, handleDrawerToggle }) => {
  const theme = useTheme();
  const matchDownMD = useMediaQuery(theme.breakpoints.down('lg'));

  return (
    <Box component="nav" sx={{ flexShrink: { md: 0 }, zIndex: 1300 }}>
      <MuiDrawer
        variant={matchDownMD ? 'temporary' : 'permanent'}
        open={open}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: open ? DRAWER_WIDTH : MINI_DRAWER_WIDTH,
            borderRight: `1px solid ${theme.palette.divider}`,
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            background: theme.palette.background.paper,
            boxShadow: 'none',
          },
        }}
      >
        <DrawerHeader />
        <DrawerContent />
      </MuiDrawer>
    </Box>
  );
};

export default Drawer;
