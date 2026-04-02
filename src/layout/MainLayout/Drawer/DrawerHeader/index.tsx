import { Box, Typography } from '@mui/material';
import useMenu from '../../../../hooks/useMenu';

const DrawerHeader = () => {
  const { menu } = useMenu();
  const { drawerOpen } = menu;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: drawerOpen ? 3 : 1.5,
        py: 2,
        minHeight: 60,
        borderBottom: '1px solid',
        borderColor: 'divider',
        gap: 1.5,
      }}
    >
      {/* Logo Icon */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 18,
        }}
      >
        ✈️
      </Box>

      {drawerOpen && (
        <Box>
          <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 700, lineHeight: 1 }}>
            Tramps Aviation
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Platform Control Panel
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DrawerHeader;
