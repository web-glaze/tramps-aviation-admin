import { Box } from '@mui/material';
import Navigation from './Navigation';
import navigation from '../../../../menu-items';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import NavGroup from './Navigation';

const DrawerContent = () => (
  <SimpleBar style={{ '& .simplebar-content': { display: 'flex', flexDirection: 'column' } } as any}>
    <Box sx={{ pt: 1 }}>
      {navigation.items.map((item: any) => (
        <NavGroup key={item.id} item={item} />
      ))}
    </Box>
  </SimpleBar>
);

export default DrawerContent;
