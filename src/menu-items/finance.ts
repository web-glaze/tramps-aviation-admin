import {
  WalletOutlined, PercentageOutlined, BarChartOutlined,
  GiftOutlined, RollbackOutlined, BellOutlined, SettingOutlined,
  FileTextOutlined, MailOutlined, SafetyOutlined,
} from '@ant-design/icons';
import { PERMISSIONS } from '../constants/permissions';

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
      permission: PERMISSIONS.WALLETS_VIEW,
    },
    {
      id: 'commission',
      title: 'Commission Rules',
      type: 'item',
      url: '/commission',
      icon: PercentageOutlined,
      permission: PERMISSIONS.COMMISSION_VIEW,
    },
    {
      id: 'refunds',
      title: 'Refunds',
      type: 'item',
      url: '/refunds',
      icon: RollbackOutlined,
      permission: PERMISSIONS.BOOKINGS_VIEW,
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      type: 'item',
      url: '/reports',
      icon: BarChartOutlined,
      permission: PERMISSIONS.REPORTS_VIEW,
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
      permission: PERMISSIONS.PROMOS_VIEW,
    },
    {
      id: 'notifications',
      title: 'Send Notifications',
      type: 'item',
      url: '/notifications',
      icon: BellOutlined,
      permission: PERMISSIONS.NOTIFICATIONS_VIEW,
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
      permission: PERMISSIONS.CONTENT_REVIEWS_VIEW,
    },
    {
      id: 'popular-content',
      title: '🌟 Popular Content',
      type: 'item',
      url: '/popular-content',
      icon: GiftOutlined,
      permission: PERMISSIONS.CONTENT_POPULAR_VIEW,
    },
    {
      id: 'tramps-fares',
      title: 'Series Fares',
      type: 'item',
      url: '/tramps-fares',
      icon: PercentageOutlined,
      permission: PERMISSIONS.CONTENT_FARES_VIEW,
    },
    {
      id: 'pages',
      title: '📋 Pages & Policies',
      type: 'item',
      url: '/pages',
      icon: FileTextOutlined,
      permission: PERMISSIONS.CONTENT_PAGES_VIEW,
    },
    {
      id: 'enquiries',
      title: '📩 Enquiries & Contact',
      type: 'item',
      url: '/enquiries',
      icon: MailOutlined,
      permission: PERMISSIONS.CONTENT_ENQUIRIES_VIEW,
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
      permission: PERMISSIONS.SETTINGS_VIEW,
    },
    {
      id: 'admin-users',
      title: 'Admin Access Control',
      type: 'item',
      url: '/admin-users',
      icon: SafetyOutlined,
      permission: PERMISSIONS.ADMIN_USERS_VIEW,
    },
  ],
};

export { FinancePages, MarketingPages, ContentPages, SettingPages };
