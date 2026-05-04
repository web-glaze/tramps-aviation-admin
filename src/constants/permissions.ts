export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Agents
  AGENTS_VIEW: 'agents.view',
  AGENTS_CREATE: 'agents.create',
  AGENTS_EDIT: 'agents.edit',
  AGENTS_DELETE: 'agents.delete',
  AGENTS_APPROVE: 'agents.approve',
  AGENTS_SUSPEND: 'agents.suspend',
  AGENTS_WALLET_ADJUST: 'agents.wallet.adjust',

  // Customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_SUSPEND: 'customers.suspend',

  // KYC
  KYC_VIEW: 'kyc.view',
  KYC_APPROVE: 'kyc.approve',
  KYC_REJECT: 'kyc.reject',

  // Bookings
  BOOKINGS_VIEW: 'bookings.view',
  BOOKINGS_EDIT: 'bookings.edit',
  BOOKINGS_CANCEL: 'bookings.cancel',
  BOOKINGS_REFUND: 'bookings.refund',

  // Wallets
  WALLETS_VIEW: 'wallets.view',
  WALLETS_CREDIT: 'wallets.credit',
  WALLETS_DEBIT: 'wallets.debit',
  WALLETS_FREEZE: 'wallets.freeze',

  // Commission
  COMMISSION_VIEW: 'commission.view',
  COMMISSION_CREATE: 'commission.create',
  COMMISSION_EDIT: 'commission.edit',
  COMMISSION_DELETE: 'commission.delete',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // Promos
  PROMOS_VIEW: 'promos.view',
  PROMOS_CREATE: 'promos.create',
  PROMOS_EDIT: 'promos.edit',
  PROMOS_DELETE: 'promos.delete',

  // Notifications
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_SEND: 'notifications.send',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',

  // Content
  CONTENT_PAGES_VIEW: 'content.pages.view',
  CONTENT_PAGES_EDIT: 'content.pages.edit',
  CONTENT_REVIEWS_VIEW: 'content.reviews.view',
  CONTENT_REVIEWS_EDIT: 'content.reviews.edit',
  CONTENT_POPULAR_VIEW: 'content.popular.view',
  CONTENT_POPULAR_EDIT: 'content.popular.edit',
  CONTENT_FARES_VIEW: 'content.fares.view',
  CONTENT_FARES_EDIT: 'content.fares.edit',
  CONTENT_ENQUIRIES_VIEW: 'content.enquiries.view',
  CONTENT_ENQUIRIES_EDIT: 'content.enquiries.edit',

  // Admin Users
  ADMIN_USERS_VIEW: 'admin-users.view',
  ADMIN_USERS_CREATE: 'admin-users.create',
  ADMIN_USERS_EDIT: 'admin-users.edit',
  ADMIN_USERS_DELETE: 'admin-users.delete',
  ADMIN_USERS_PASSWORD: 'admin-users.password',
} as const;

export type AdminPermission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
