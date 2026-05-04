import { Box } from '@mui/material';
import useMenu from '../../../../hooks/useMenu';
import Logo from '../../../../components/Logo';
import { BRAND } from '../../../../themes/palette';

const DrawerHeader = () => {
  const { menu } = useMenu();
  const { drawerOpen } = menu;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: drawerOpen ? 2 : 1.5,
        py: 2,
        minHeight: 60,
        // Brand-blue gradient stripe at the top of the sidebar — anchors the
        // 80% blue brand colour right where the eye lands first.
        background: BRAND.GRADIENT_BLUE,
        borderBottom: `3px solid ${BRAND.ORANGE}`, // 20% orange accent
        boxShadow: `0 2px 8px rgba(32, 154, 205, 0.25)`,
      }}
    >
      {drawerOpen ? (
        <Logo size={32} withWordmark variant="dark" />
      ) : (
        <Logo size={32} />
      )}
    </Box>
  );
};

export default DrawerHeader;
