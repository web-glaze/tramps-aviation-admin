import {
  WalletOutlined, PercentageOutlined, BarChartOutlined,
  GiftOutlined, RollbackOutlined, BellOutlined, SettingOutlined,
  FileTextOutlined, MailOutlined,
} from '@ant-design/icons';

const FinancePages = {
  id: 'finance-group',
  title: 'Finance',
  type: 'group',
  children: [
    {
      id: 'wallet',
      title: 'Wallet Management',
      type: 'item',
      url: '/wallet',
      icon: WalletOutlined,
    },
    {
      id: 'commission',
      title: 'Commission Rules',
      type: 'item',
      url: '/commission',
      icon: PercentageOutlined,
    },
    {
      id: 'refunds',
      title: 'Refunds',
      type: 'item',
      url: '/refunds',
      icon: RollbackOutlined,
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      type: 'item',
      url: '/reports',
      icon: BarChartOutlined,
    },
  ],
};

const MarketingPages = {
  id: 'marketing-group',
  title: 'Marketing',
  type: 'group',
  children: [
    {
      id: 'promo',
      title: 'Promo Codes',
      type: 'item',
      url: '/promo',
      icon: GiftOutlined,
    },
    {
      id: 'notifications',
      title: 'Send Notifications',
      type: 'item',
      url: '/notifications',
      icon: BellOutlined,
    },
  ],
};

const ContentPages = {
  id: 'content-group',
  title: 'Homepage Content',
  type: 'group',
  children: [
    {
      id: 'reviews',
      title: '⭐ Reviews',
      type: 'item',
      url: '/reviews',
      icon: GiftOutlined,
    },
    {
      id: 'popular-content',
      title: '🌟 Popular Content',
      type: 'item',
      url: '/popular-content',
      icon: GiftOutlined,
    },
    {
      id: 'tramps-fares',
      title: 'Series Fares',
      type: 'item',
      url: '/tramps-fares',
      icon: PercentageOutlined,
    },
    {
      id: 'pages',
      title: '📋 Pages & Policies',
      type: 'item',
      url: '/pages',
      icon: FileTextOutlined,
    },
    {
      id: 'enquiries',
      title: '📩 Enquiries & Contact',
      type: 'item',
      url: '/enquiries',
      icon: MailOutlined,
    },
  ],
};

const SettingPages = {
  id: 'setting-group',
  title: 'Settings',
  type: 'group',
  children: [
    {
      id: 'settings',
      title: 'Platform Settings',
      type: 'item',
      url: '/settings',
      icon: SettingOutlined,
    },
  ],
};

export { FinancePages, MarketingPages, ContentPages, SettingPages };