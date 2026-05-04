import { FC } from 'react';
import { Box, List, Typography } from '@mui/material';
import NavItem from './NavItem';
import useMenu from '../../../../../hooks/useMenu';
import useUserContext from '../../../../../hooks/useUser';
import { BRAND } from '../../../../../themes/palette';

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
  const { can } = useUserContext();
  const { drawerOpen } = menu;

  const visibleChildren = item.children?.filter(
    (menuItem) => !menuItem.permission || can(menuItem.permission),
  );

  const navCollapse = visibleChildren?.map((menuItem) => {
    switch (menuItem.type) {
      case 'item':
        return <NavItem key={menuItem.id} item={menuItem} level={1} />;
      default:
        return null;
    }
  });

  return (
    !visibleChildren?.length ? null :
    <List
      subheader={
        item.title &&
        drawerOpen && (
          <Box sx={{ pl: 3, mb: 1, mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Tiny orange dot — brand accent on every section header */}
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: BRAND.ORANGE, flexShrink: 0 }} />
            <Typography
              variant="subtitle2"
              sx={{
                color: BRAND.BLUE_DARK,
                textTransform: 'uppercase',
                fontSize: '0.66rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
              }}
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
