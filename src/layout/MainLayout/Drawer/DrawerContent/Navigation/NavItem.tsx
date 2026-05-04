import { FC, forwardRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ListItemButton, ListItemIcon, ListItemText, Typography,
} from '@mui/material';
import useMenu, { ActionType } from '../../../../../hooks/useMenu';
import { BRAND } from '../../../../../themes/palette';

interface NavItemProps {
  level: number;
  item: {
    id: string;
    title: string;
    icon?: any;
    url: string;
    target?: string;
    disabled?: boolean;
    external?: string;
    chip?: any;
    breadcrumbs?: boolean;
  };
}

const NavItem: FC<NavItemProps> = ({ item, level }) => {
  const { pathname } = useLocation();
  const { menu, setMenu: dispatch } = useMenu();
  const { drawerOpen, openItem } = menu;

  let itemTarget = '_self';
  if (item.target) itemTarget = '_blank';

  let listItemProps: any = {
    component: forwardRef((props: any, ref: any) => (
      <Link ref={ref} {...props} to={item.url} target={itemTarget} />
    )),
  };
  if (item?.external) {
    listItemProps = { component: 'a', href: item.url, target: itemTarget };
  }

  const itemHandler = (id: string) => {
    dispatch({ type: ActionType.ACTIVE_ITEM, payload: [id] });
  };

  const Icon = item.icon;
  const itemIcon = item.icon ? (
    <Icon style={{ fontSize: drawerOpen ? '1rem' : '1.25rem' }} />
  ) : false;

  const isSelected = openItem.findIndex((id: string) => id === item.id) > -1;

  useEffect(() => {
    if (pathname.includes(item.url)) {
      dispatch({ type: ActionType.ACTIVE_ITEM, payload: [item.id] });
    }
    // eslint-disable-next-line
  }, [pathname]);

  return (
    <ListItemButton
      {...listItemProps}
      disabled={item.disabled}
      onClick={() => itemHandler(item.id)}
      selected={isSelected}
      sx={{
        zIndex: 1201,
        pl: drawerOpen ? `${level * 28}px` : 1.5,
        py: !drawerOpen && level === 1 ? 1.25 : 1,
        mx: drawerOpen ? 1 : 0.5,
        my: 0.25,
        borderRadius: 1.5,
        transition: 'all 0.18s ease',
        ...(drawerOpen && {
          // Hover: subtle blue tint
          '&:hover': {
            bgcolor: BRAND.BLUE_TINT,
            transform: 'translateX(2px)',
          },
          // Selected: bold brand-blue background + orange left rail (20% accent)
          '&.Mui-selected': {
            bgcolor: BRAND.BLUE,
            color: '#fff',
            boxShadow: `0 4px 12px rgba(32, 154, 205, 0.35)`,
            borderLeft: `4px solid ${BRAND.ORANGE}`,
            '& .MuiListItemIcon-root': { color: '#fff' },
            '& .MuiTypography-root': { color: '#fff', fontWeight: 700 },
            '&:hover': {
              bgcolor: BRAND.BLUE_DARK,
              transform: 'translateX(2px)',
            },
          },
        }),
        ...(!drawerOpen && {
          '&:hover': { bgcolor: BRAND.BLUE_TINT },
          '&.Mui-selected': {
            bgcolor: BRAND.BLUE,
            '& .MuiListItemIcon-root': { color: '#fff' },
            '&:hover': { bgcolor: BRAND.BLUE_DARK },
          },
        }),
      }}
    >
      {itemIcon && (
        <ListItemIcon
          sx={{
            minWidth: 28,
            color: isSelected ? '#fff' : BRAND.BLUE_DARK,
            transition: 'color 0.18s ease',
            ...(!drawerOpen && {
              borderRadius: 1.5,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }),
          }}
        >
          {itemIcon}
        </ListItemIcon>
      )}

      {(drawerOpen || (!drawerOpen && level !== 1)) && (
        <ListItemText
          primary={
            <Typography
              variant="h6"
              sx={{
                color: isSelected ? '#fff' : 'text.primary',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.875rem',
              }}
            >
              {item.title}
            </Typography>
          }
        />
      )}
    </ListItemButton>
  );
};

export default NavItem;
