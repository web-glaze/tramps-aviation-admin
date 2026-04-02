import { FC } from 'react';
import { Box, List, Typography } from '@mui/material';
import NavItem from './NavItem';
import useMenu from '../../../../../hooks/useMenu';

interface NavGroupProps {
  item: {
    id: string;
    title: string;
    type: string;
    children?: any[];
  };
}

const NavGroup: FC<NavGroupProps> = ({ item }) => {
  const { menu } = useMenu();
  const { drawerOpen } = menu;

  const navCollapse = item.children?.map((menuItem) => {
    switch (menuItem.type) {
      case 'item':
        return <NavItem key={menuItem.id} item={menuItem} level={1} />;
      default:
        return null;
    }
  });

  return (
    <List
      subheader={
        item.title &&
        drawerOpen && (
          <Box sx={{ pl: 3, mb: 1.5 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em' }}
            >
              {item.title}
            </Typography>
          </Box>
        )
      }
      sx={{ mb: 0.5, py: 0, zIndex: 0 }}
    >
      {navCollapse}
    </List>
  );
};

export default NavGroup;
