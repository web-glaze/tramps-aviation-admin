import { DashboardOutlined } from '@ant-design/icons';
import { PERMISSIONS } from '../constants/permissions';

const dashboard = {
  id: 'group-dashboard',
  title: 'Navigation',
  type: 'group',
  children: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      type: 'item',
      url: '/dashboard',
      icon: DashboardOutlined,
      permission: PERMISSIONS.DASHBOARD_VIEW,
      breadcrumbs: false,
    },
  ],
};

export default dashboard;
