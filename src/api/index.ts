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

export const rbacApi = {
  getPermissions: () => apiClient.get('/admin/rbac/permissions'),
};

export const adminUsersApi = {
  getAll: (params?: any) => apiClient.get('/admin/admin-users', { params }),
  create: (data: any) => apiClient.post('/admin/admin-users', data),
  update: (id: string, data: any) => apiClient.patch(`/admin/admin-users/${id}`, data),
  updatePassword: (id: string, data: any) => apiClient.patch(`/admin/admin-users/${id}/password`, data),
  remove: (id: string) => apiClient.delete(`/admin/admin-users/${id}`),
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

// ─── SUB-AGENTS ──────────────────────────────────────────────────────────────
// the AdminSubAgentController under /admin/subagents/*.
export const subAgentsApi = {
  list:        (params?: any) => apiClient.get('/admin/subagents', { params }),
  getOne:      (id: string)   => apiClient.get(`/admin/subagents/${id}`),
  suspend:     (id: string, reason?: string) =>
    apiClient.post(`/admin/subagents/${id}/suspend`, { reason }),
  unsuspend:   (id: string)   => apiClient.post(`/admin/subagents/${id}/unsuspend`),
  getBookings: (id: string, params?: any) =>
    apiClient.get(`/admin/subagents/${id}/bookings`, { params }),
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
  getTransactions: (id: string, params?: any) => apiClient.get(`/admin/wallets/${id}/transactions`, { params }),
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
  // Dev helper — seed a sensible set of default commission rules. Backend
  // route is /admin/commission-rules/seed-defaults. UI button is gated by
  // NODE_ENV !== 'production'.
  seedDefaults: () => apiClient.post('/admin/commission-rules/seed-defaults', {}),
};

// ─── TOPUP REQUESTS ──────────────────────────────────────────────────────────
// Agent-submitted wallet top-up requests awaiting admin approval. The
// backend persists these as Transactions with `status: pending_review` —
// the dedicated controller (POST /admin/topup-requests/...) exposes the
// approve/reject workflow with audit fields (approverNote, rejectionReason).
export const topupRequestsApi = {
  list: (params?: any) => apiClient.get('/admin/topup-requests', { params }),
  approve: (txnId: string, note?: string) =>
    apiClient.post(`/admin/topup-requests/${txnId}/approve`, { note }),
  reject: (txnId: string, reason: string) =>
    apiClient.post(`/admin/topup-requests/${txnId}/reject`, { reason }),
  getStats: () => apiClient.get('/admin/topup-requests/stats'),
};

// ─── WITHDRAW APPROVALS ──────────────────────────────────────────────────────
// Agent-submitted cash-out requests awaiting admin processing. The amount
// is HELD on the agent wallet at submission time (balance reduced,
// holdAmount increased); approve flips the hold into a permanent DEBIT
// with the recorded UTR, reject releases the hold back to balance.
export const withdrawApprovalsApi = {
  list: (params?: any) => apiClient.get('/admin/withdraw-requests', { params }),
  getStats: () => apiClient.get('/admin/withdraw-requests/stats'),
  approve: (id: string, data: { utrNumber: string; note?: string }) =>
    apiClient.post(`/admin/withdraw-requests/${id}/approve`, data),
  reject: (id: string, data: { reason: string }) =>
    apiClient.post(`/admin/withdraw-requests/${id}/reject`, data),
};

// ─── TBO SETTLEMENTS ─────────────────────────────────────────────────────────
// Weekly TBO invoice reconciliation. Admin enters/uploads what TBO billed,
// the backend cross-checks against our internal bookings collection and
// flags discrepancies before we push the NEFT to TBO.
export const tboSettlementsApi = {
  list:    (params?: any) => apiClient.get('/admin/tbo-settlements', { params }),
  getStats: () => apiClient.get('/admin/tbo-settlements/stats'),
  getOne:  (id: string) => apiClient.get(`/admin/tbo-settlements/${id}`),
  create:  (data: any) => apiClient.post('/admin/tbo-settlements', data),
  reconcile: (id: string) =>
    apiClient.post(`/admin/tbo-settlements/${id}/reconcile`, {}),
  markPaid: (id: string, data: { transactionRef: string; note?: string }) =>
    apiClient.post(`/admin/tbo-settlements/${id}/mark-paid`, data),
  getDiscrepancies: (id: string) =>
    apiClient.get(`/admin/tbo-settlements/${id}/discrepancies`),
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
  // Renders a sample branded e-ticket PDF from the saved ticketBranding —
  // used by the "Preview" button on the E-Ticket Branding card. Returns a Blob.
  previewTicket: () =>
    apiClient.get('/admin/ticket-preview', { responseType: 'blob' }),
  // Upload an image (e.g. the ticket logo) → returns { data: { url, ... } }.
  uploadImage: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post('/upload/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── POPULAR ROUTES (dedicated, sub-admin friendly) ──────────────────────────
// These hit /admin/popular-routes which checks `content.popular.view` /
// `content.popular.edit` instead of the heavyweight `settings.*` permissions.
// Sub-admins with the popular content permissions can use these without being
// granted full settings access.
export const popularRoutesApi = {
  get:    () => apiClient.get('/admin/popular-routes'),
  update: (popularRoutes: any[]) => apiClient.put('/admin/popular-routes', { popularRoutes }),
};

// ─── CUSTOM FARES ─────────────────────────────────────────────────────────────
export const trampsAviationFaresApi = {
  getAll: (params?: any) => apiClient.get('/admin/tramps-fares', { params }),
  getStats: () => apiClient.get('/admin/tramps-fares/stats'),
  getSectors: () => apiClient.get('/admin/tramps-fares/sectors'),
  create: (data: any) => apiClient.post('/admin/tramps-fares', data),
  bulkCreate: (fares: any[]) => apiClient.post('/admin/tramps-fares/bulk', { fares }),
  // ── Server-side template download ───────────────────────────────────────
  // Returns a CSV/Excel file stream — we ask axios for an `arraybuffer`
  // response so the caller can wrap it in a Blob and trigger a browser
  // download via an object URL. The bulk-import full-page UI uses this
  // when the admin clicks "Download CSV / Excel template".
  getTemplate: (type: string = 'flight') =>
    apiClient.get('/admin/tramps-fares/template', { params: { type }, responseType: 'arraybuffer' }),
  update: (id: string, data: any) => apiClient.put(`/admin/tramps-fares/${id}`, data),
  toggle: (id: string) => apiClient.patch(`/admin/tramps-fares/${id}/toggle`),
  delete: (id: string) => apiClient.delete(`/admin/tramps-fares/${id}`),
  // PNR Pool management
  addPnrs: (id: string, pnrs: string[]) => apiClient.post(`/admin/tramps-fares/${id}/pnr-pool`, { pnrs }),
  removePnr: (id: string, pnr: string) => apiClient.delete(`/admin/tramps-fares/${id}/pnr-pool/${pnr}`),
  clearPnrPool: (id: string) => apiClient.delete(`/admin/tramps-fares/${id}/pnr-pool`),
  // One-click demo seed — useful for fresh installs and demo accounts.
  seedDemo: () => apiClient.post('/admin/tramps-fares/seed-demo', {}),
  // ─── SERIES FARE (TBO-style) ─────────────────────────────────────────────
  // Creates a "series" of day-tickets: the backend expands the
  // travelFrom→travelTo date range into one fare document per day. Returns
  // { seriesGroupId, created, travelFrom, travelTo, fares: [...] }.
  createSeries: (data: any) => apiClient.post('/admin/tramps-fares/series', data),
  // Fetch every per-day fare doc belonging to a series group — returns
  // { seriesGroupId, count, fares: [...] }. Drives the Edit Series Fare
  // page's initial prefill.
  getSeries:    (groupId: string) => apiClient.get(`/admin/tramps-fares/series/${groupId}`),
  // Replace the whole series spec — same body shape as createSeries plus
  // the per-day maps (pnrsByDate, farePerDay, ticketsPerDayByDate,
  // disabledDates, disableBeforeHrs). The backend updates each per-day
  // fare doc in the group accordingly.
  updateSeries: (groupId: string, data: any) => apiClient.put(`/admin/tramps-fares/series/${groupId}`, data),
};


// ─── REFUNDS ──────────────────────────────────────────────────────────────────
// The backend RefundController is mounted at the ROOT `/refunds` path (not
// under `/admin`). The admin list/process/reject routes are guarded by
// RolesGuard + @Permissions('bookings.refund'), so both `admin` and
// `sub_admin` roles with that permission can use them.
//   GET    /refunds                 → paginated { data, pagination }
//   PATCH  /refunds/:refundId/process → approve & credit (wallet for B2B)
//   PATCH  /refunds/:refundId/reject  → reject with a reason
// NOTE: process/reject are keyed by the human-readable `refundId`
// (e.g. "REF1234..."), NOT the MongoDB `_id`.
export const refundsApi = {
  getAll: (params?: any) => apiClient.get('/refunds', { params }),
  process: (refundId: string, note?: string) =>
    apiClient.patch(`/refunds/${refundId}/process`, { note }),
  reject: (refundId: string, reason: string) =>
    apiClient.patch(`/refunds/${refundId}/reject`, { reason }),
};

// ─── HOTELS (admin) ───────────────────────────────────────────────────────────
// HotelsController exposes admin-only routes under `/hotels/admin/*`. There is
// no dedicated hotel-management collection — these endpoints surface the
// platform's hotel BOOKINGS plus aggregate stats. Response shape:
//   { bookings: [...], pagination: {...}, stats: {...} }
export const hotelsApi = {
  getAll: (params?: any) => apiClient.get('/hotels/admin/all', { params }),
  getTopHotels: (limit = 10) => apiClient.get('/hotels/admin/top-hotels', { params: { limit } }),
};

// ─── INSURANCE (admin) ────────────────────────────────────────────────────────
// InsuranceController exposes admin-only routes under `/insurance/admin/*`.
// `admin/all` lists issued insurance POLICIES + aggregate stats. Response:
//   { data: [...], pagination: {...}, stats: {...} }
// `retry` re-fires the Bajaj Allianz issuance call for policies stuck in the
// INITIATED state.
export const insuranceApi = {
  getAll: (params?: any) => apiClient.get('/insurance/admin/all', { params }),
  retry: (policyRef: string) => apiClient.post(`/insurance/admin/${policyRef}/retry`),
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

// `mockDataApi` exposes admin endpoints that seed/manipulate sample mock data
// for local development. Production builds should never reach these — we gate
// the export so importing `mockDataApi` in a prod bundle yields `undefined`
// and any accidental call surfaces as a TypeError in dev rather than silently
// hitting a real endpoint. Set NODE_ENV=production to disable.
export const mockDataApi =
  process.env.NODE_ENV !== 'production'
    ? {
        getAll:  (type?: string) => apiClient.get('/admin/mock-data', { params: type ? { type } : {} }),
        create:  (data: any)     => apiClient.post('/admin/mock-data', data),
        update:  (id: string, data: any) => apiClient.put(`/admin/mock-data/${id}`, data),
        toggle:  (id: string)    => apiClient.put(`/admin/mock-data/${id}/toggle`),
        delete:  (id: string)    => apiClient.delete(`/admin/mock-data/${id}`),
      }
    : undefined;

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
export const reviewsApi = {
  getPending:  (params?: any) => apiClient.get('/reviews/admin/pending', { params }),
  getAll:      (params?: any) => apiClient.get('/reviews/admin/all', { params }),
  approve:     (id: string)  => apiClient.post(`/reviews/admin/${id}/approve`),
  hide:        (id: string)  => apiClient.post(`/reviews/admin/${id}/hide`),
  delete:      (id: string)  => apiClient.delete(`/reviews/admin/${id}`),
  respond:     (id: string, response: string) => apiClient.post(`/reviews/admin/${id}/respond`, { response }),
};
