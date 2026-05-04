import { FC } from 'react';
import { Box, Drawer as MuiDrawer, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DrawerHeader from './DrawerHeader';
import DrawerContent from './DrawerContent';
import { BRAND } from '../../../themes/palette';

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
            // Brand-blue right border so the drawer reads as part of the brand
            borderRight: `2px solid ${BRAND.BLUE_LIGHT}`,
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            // Soft brand-tinted background instead of plain white
            background: `linear-gradient(180deg, #ffffff 0%, ${BRAND.BLUE_TINT}60 100%)`,
            boxShadow: `4px 0 16px rgba(32, 154, 205, 0.06)`,
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
