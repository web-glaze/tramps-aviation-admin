import axios from 'axios';
import { API_BASE_URL } from '../constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/admin/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
  changePassword: (data: any) => apiClient.post('/auth/change-password', data),
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => apiClient.get('/admin/dashboard'),
};

// ─── AGENTS ──────────────────────────────────────────────────────────────────
export const agentsApi = {
  getAll: (params?: any) => apiClient.get('/admin/agents', { params }),
  getById: (id: string) => apiClient.get(`/admin/agents/${id}`),
  approve: (id: string) => apiClient.patch(`/admin/agents/${id}/approve`),
  suspend: (id: string) => apiClient.patch(`/admin/agents/${id}/suspend`),
  delete: (id: string) => apiClient.delete(`/admin/agents/${id}`),
  updateCommission: (id: string, data: any) => apiClient.patch(`/admin/agents/${id}/commission`, data),
  walletCredit: (agentId: string, amount: number, note: string) =>
    apiClient.post('/admin/wallet/adjust', { agentId, amount, type: 'credit', note }),
  walletDebit: (agentId: string, amount: number, note: string) =>
    apiClient.post('/admin/wallet/adjust', { agentId, amount, type: 'debit', note }),
  // Alias: credit by agentCode (TAHP00001) — more reliable than MongoDB id
  walletCreditByCode: (agentCode: string, amount: number, note: string) =>
    apiClient.post('/admin/wallet/adjust', { agentId: agentCode, amount, type: 'credit', note }),
};

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────
export const customersApi = {
  getAll: (params?: any) => apiClient.get('/admin/customers', { params }),
  getById: (id: string) => apiClient.get(`/admin/customers/${id}`),
  suspend: (id: string) => apiClient.patch(`/admin/customers/${id}/suspend`),
};

// ─── BOOKINGS ────────────────────────────────────────────────────────────────
export const bookingsApi = {
  getAll: (params?: any) => apiClient.get('/admin/bookings', { params }),
  getById: (id: string) => apiClient.get(`/admin/bookings/${id}`),
  cancel: (id: string, reason: string) => apiClient.patch(`/admin/bookings/${id}/cancel`, { reason }),
  refund: (id: string, data: any) => apiClient.post(`/admin/bookings/${id}/refund`, data),
};

// ─── KYC ─────────────────────────────────────────────────────────────────────
export const kycApi = {
  getAll: (params?: any) => apiClient.get('/admin/kyc', { params }),
  approve: (id: string) => apiClient.patch(`/admin/kyc/${id}/approve`),
  reject: (id: string, reason: string) => apiClient.patch(`/admin/kyc/${id}/reject`, { reason }),
};

// ─── WALLET ───────────────────────────────────────────────────────────────────
export const walletApi = {
  getAll: (params?: any) => apiClient.get('/admin/wallets', { params }),
  credit: (id: string, data: any) => apiClient.post(`/admin/wallets/${id}/credit`, data),
  debit: (id: string, data: any) => apiClient.post(`/admin/wallets/${id}/debit`, data),
  getTransactions: (id: string) => apiClient.get(`/admin/wallets/${id}/transactions`),
};

// ─── COMMISSION ───────────────────────────────────────────────────────────────
export const commissionApi = {
  getRules: (params?: any) => apiClient.get('/admin/commission/rules', { params }),
  getRule: (id: string) => apiClient.get(`/admin/commission/rules/${id}`),
  createRule: (data: any) => apiClient.post('/admin/commission/rules', data),
  updateRule: (id: string, data: any) => apiClient.put(`/admin/commission/rules/${id}`, data),
  deleteRule: (id: string) => apiClient.delete(`/admin/commission/rules/${id}`),
  toggleRule: (id: string) => apiClient.patch(`/admin/commission/rules/${id}/toggle`),
  duplicateRule: (id: string) => apiClient.post(`/admin/commission/rules/${id}/duplicate`),
  getStats: () => apiClient.get('/admin/commission/stats'),
  preview: (data: any) => apiClient.post('/admin/commission/preview', data),
  bulkCreate: (rules: any[]) => apiClient.post('/admin/commission/rules/bulk', { rules }),
};

// ─── REPORTS ─────────────────────────────────────────────────────────────────
export const reportsApi = {
  getRevenue: (params?: any) => apiClient.get('/admin/reports/revenue', { params }),
  getBookings: (params?: any) => apiClient.get('/admin/reports/bookings', { params }),
  exportCsv: (type: string, params?: any) => apiClient.get(`/admin/reports/export/${type}`, { params, responseType: 'blob' }),
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const notificationsApi = {
  send: (data: any) => apiClient.post('/admin/notifications/send', data),
  getAll: (params?: any) => apiClient.get('/admin/notifications', { params }),
};

// ─── PROMO ───────────────────────────────────────────────────────────────────
export const promoApi = {
  getAll: (params?: any) => apiClient.get('/admin/promos', { params }),
  create: (data: any) => apiClient.post('/admin/promos', data),
  update: (id: string, data: any) => apiClient.put(`/admin/promos/${id}`, data),
  delete: (id: string) => apiClient.delete(`/admin/promos/${id}`),
};

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => apiClient.get('/admin/settings'),
  update: (data: any) => apiClient.put('/admin/settings', data),
  getPricingRules: () => apiClient.get('/admin/pricing'),
  updatePricingRules: (data: any) => apiClient.put('/admin/pricing', data),
};

// ─── CUSTOM FARES ─────────────────────────────────────────────────────────────
export const trampsAviationFaresApi = {
  getAll: (params?: any) => apiClient.get('/admin/tramps-fares', { params }),
  getStats: () => apiClient.get('/admin/tramps-fares/stats'),
  getSectors: () => apiClient.get('/admin/tramps-fares/sectors'),
  create: (data: any) => apiClient.post('/admin/tramps-fares', data),
  bulkCreate: (fares: any[]) => apiClient.post('/admin/tramps-fares/bulk', { fares }),
  update: (id: string, data: any) => apiClient.put(`/admin/tramps-fares/${id}`, data),
  toggle: (id: string) => apiClient.patch(`/admin/tramps-fares/${id}/toggle`),
  delete: (id: string) => apiClient.delete(`/admin/tramps-fares/${id}`),
  // PNR Pool management
  addPnrs: (id: string, pnrs: string[]) => apiClient.post(`/admin/tramps-fares/${id}/pnr-pool`, { pnrs }),
  removePnr: (id: string, pnr: string) => apiClient.delete(`/admin/tramps-fares/${id}/pnr-pool/${pnr}`),
  clearPnrPool: (id: string) => apiClient.delete(`/admin/tramps-fares/${id}/pnr-pool`),
};


// ─── CMS ──────────────────────────────────────────────────────────────────────
export const cmsApi = {
  getAll:   ()                        => apiClient.get('/pages/admin'),
  getPage:  (slug: string)            => apiClient.get(`/pages/admin/${slug}`),
  upsert:   (slug: string, data: any) => apiClient.put(`/pages/admin/${slug}`, data),
  delete:   (slug: string)            => apiClient.delete(`/pages/admin/${slug}`),
  seed:     ()                        => apiClient.post('/pages/admin/seed'),
};

export default apiClient;

export const mockDataApi = {
  getAll:  (type?: string) => apiClient.get('/admin/mock-data', { params: type ? { type } : {} }),
  create:  (data: any)     => apiClient.post('/admin/mock-data', data),
  update:  (id: string, data: any) => apiClient.put(`/admin/mock-data/${id}`, data),
  toggle:  (id: string)    => apiClient.put(`/admin/mock-data/${id}/toggle`),
  delete:  (id: string)    => apiClient.delete(`/admin/mock-data/${id}`),
};

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
export const reviewsApi = {
  getPending:  (params?: any) => apiClient.get('/reviews/admin/pending', { params }),
  getAll:      (params?: any) => apiClient.get('/reviews/admin/all', { params }),
  approve:     (id: string)  => apiClient.post(`/reviews/admin/${id}/approve`),
  hide:        (id: string)  => apiClient.post(`/reviews/admin/${id}/hide`),
  delete:      (id: string)  => apiClient.delete(`/reviews/admin/${id}`),
  respond:     (id: string, response: string) => apiClient.post(`/reviews/admin/${id}/respond`, { response }),
};