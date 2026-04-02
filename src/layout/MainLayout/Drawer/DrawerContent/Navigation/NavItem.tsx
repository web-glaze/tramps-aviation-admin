import { FC, forwardRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Avatar, ListItemButton, ListItemIcon, ListItemText, Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMenu, { ActionType } from '../../../../../hooks/useMenu';

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
  const theme = useTheme();
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

  const textColor = 'text.primary';
  const iconSelectedColor = 'primary.main';

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
        ...(drawerOpen && {
          '&:hover': { bgcolor: 'primary.lighter' },
          '&.Mui-selected': {
            bgcolor: 'primary.lighter',
            borderRight: `2px solid`,
            borderColor: 'primary.main',
            color: iconSelectedColor,
            '&:hover': { color: iconSelectedColor, bgcolor: 'primary.lighter' },
          },
        }),
        ...(!drawerOpen && {
          '&:hover': { bgcolor: 'transparent' },
          '&.Mui-selected': {
            '&:hover': { bgcolor: 'transparent' },
            bgcolor: 'transparent',
          },
        }),
      }}
    >
      {itemIcon && (
        <ListItemIcon
          sx={{
            minWidth: 28,
            color: isSelected ? iconSelectedColor : textColor,
            ...(!drawerOpen && {
              borderRadius: 1.5,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': { bgcolor: 'secondary.lighter' },
            }),
            ...(!drawerOpen && isSelected && {
              bgcolor: 'primary.lighter',
              '&:hover': { bgcolor: 'primary.lighter' },
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
              sx={{ color: isSelected ? iconSelectedColor : textColor, fontWeight: isSelected ? 600 : 400 }}
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
