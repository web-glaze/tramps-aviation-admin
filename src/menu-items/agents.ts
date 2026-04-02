import {
  TeamOutlined, UserOutlined, SafetyCertificateOutlined, FileSearchOutlined,
} from '@ant-design/icons';

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
    },
    {
      id: 'customers',
      title: 'Customers (B2C)',
      type: 'item',
      url: '/customers',
      icon: UserOutlined,
    },
    {
      id: 'kyc',
      title: 'KYC Verification',
      type: 'item',
      url: '/kyc',
      icon: SafetyCertificateOutlined,
    },
    {
      id: 'subagents',
      title: 'Sub-Agents',
      type: 'item',
      url: '/subagents',
      icon: FileSearchOutlined,
    },
  ],
};

export default AgentPages;
