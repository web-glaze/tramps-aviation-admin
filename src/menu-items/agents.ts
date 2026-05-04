import {
  TeamOutlined, UserOutlined, SafetyCertificateOutlined, FileSearchOutlined,
} from '@ant-design/icons';
import { PERMISSIONS } from '../constants/permissions';

const AgentPages = {
  id: 'agents-group',
  title: 'Agents & Customers',
  type: 'group',
  children: [
    {
      id: 'agents',
      title: 'Agents (B2B)',
      type: 'item',
      url: '/agents',
      icon: TeamOutlined,
      permission: PERMISSIONS.AGENTS_VIEW,
    },
    {
      id: 'customers',
      title: 'Customers (B2C)',
      type: 'item',
      url: '/customers',
      icon: UserOutlined,
      permission: PERMISSIONS.CUSTOMERS_VIEW,
    },
    {
      id: 'kyc',
      title: 'KYC Verification',
      type: 'item',
      url: '/kyc',
      icon: SafetyCertificateOutlined,
      permission: PERMISSIONS.KYC_VIEW,
    },
    {
      id: 'subagents',
      title: 'Sub-Agents',
      type: 'item',
      url: '/subagents',
      icon: FileSearchOutlined,
      permission: PERMISSIONS.AGENTS_VIEW,
    },
  ],
};

export default AgentPages;
