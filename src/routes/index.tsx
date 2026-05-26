import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import Login from '../pages/authentication/Login';
import Dashboard from '../pages/dashboard';
import AdminUsersPage from '../pages/admin-users';
import AgentsPage from '../pages/agents';
import CustomersPage from '../pages/customers';
import KycPage from '../pages/kyc';
import BookingsPage from '../pages/bookings';
import WalletPage from '../pages/wallet';
import TopupRequestsPage from '../pages/topup-requests';
import WithdrawApprovalsPage from '../pages/withdraw-approvals';
import TboSettlementsPage from '../pages/tbo-settlements';
import CommissionPage from '../pages/commission';
import ReportsPage from '../pages/reports';
import PromoPage from '../pages/promo';
import NotificationsPage from '../pages/notifications';
import SettingsPage from '../pages/settings';
import TrampsAviationFaresPage from '../pages/tramps-fares';
import AddSeriesFarePage from '../pages/tramps-fares/AddSeriesFare';
import BulkImportSeriesPage from '../pages/tramps-fares/BulkImportSeries';
import PopularContentPage from '../pages/popular-content';
import ReviewsPage from '../pages/reviews';
import PagesManager from '../pages/cms';
import EnquiriesPage from '../pages/enquiries';
import SubAgentsPage from '../pages/subagents';
// These four were placeholder stubs in `pages/misc` — now full admin pages
// each backed by a real backend endpoint (refunds, series-fare inventory,
// hotel bookings, insurance policies).
import RefundsPage from '../pages/refunds';
import FlightsPage from '../pages/flights';
import HotelsPage from '../pages/hotels';
import InsurancePage from '../pages/insurance';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import useUserContext from '../hooks/useUser';
import { PERMISSIONS } from '../constants/permissions';

// Error element shown when any page crashes — much better than blank screen
function PageError() {
  return (
    <Box sx={{ p: 4, textAlign: 'center', mt: 8 }}>
      <Typography variant="h5" fontWeight={700} color="error" gutterBottom>
        Something went wrong on this page
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        An unexpected error occurred. Please try refreshing or go back to dashboard.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
        <Button variant="contained" onClick={() => window.location.href = '/dashboard'}>
          Go to Dashboard
        </Button>
      </Box>
    </Box>
  );
}

function ProtectedRoute({
  permission,
  element,
}: {
  permission?: string;
  element: React.ReactElement;
}) {
  const { can, loading } = useUserContext();
  // Wait for fresh permissions from server before checking access
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (permission && !can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }
  return element;
}

// Login route guard — an already-authenticated admin hitting /login should
// land straight on the dashboard instead of seeing the login form again.
function LoginRoute() {
  const { isAuthenticated, loading } = useUserContext();
  // Wait for the initial session refresh before deciding (mirrors ProtectedRoute)
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Login />;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginRoute />,
    errorElement: <PageError />,
  },
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <PageError />,
    children: [
      { index: true, element: <ProtectedRoute permission={PERMISSIONS.DASHBOARD_VIEW} element={<Dashboard />} />, errorElement: <PageError /> },
      { path: 'dashboard', element: <ProtectedRoute permission={PERMISSIONS.DASHBOARD_VIEW} element={<Dashboard />} />, errorElement: <PageError /> },
      { path: 'agents', element: <ProtectedRoute permission={PERMISSIONS.AGENTS_VIEW} element={<AgentsPage />} />, errorElement: <PageError /> },
      { path: 'customers', element: <ProtectedRoute permission={PERMISSIONS.CUSTOMERS_VIEW} element={<CustomersPage />} />, errorElement: <PageError /> },
      { path: 'kyc', element: <ProtectedRoute permission={PERMISSIONS.KYC_VIEW} element={<KycPage />} />, errorElement: <PageError /> },
      { path: 'subagents', element: <ProtectedRoute permission={PERMISSIONS.AGENTS_VIEW} element={<SubAgentsPage />} />, errorElement: <PageError /> },
      { path: 'bookings', element: <ProtectedRoute permission={PERMISSIONS.BOOKINGS_VIEW} element={<BookingsPage />} />, errorElement: <PageError /> },
      { path: 'flights', element: <ProtectedRoute permission={PERMISSIONS.BOOKINGS_VIEW} element={<FlightsPage />} />, errorElement: <PageError /> },
      { path: 'hotels', element: <ProtectedRoute permission={PERMISSIONS.BOOKINGS_VIEW} element={<HotelsPage />} />, errorElement: <PageError /> },
      { path: 'insurance', element: <ProtectedRoute permission={PERMISSIONS.BOOKINGS_VIEW} element={<InsurancePage />} />, errorElement: <PageError /> },
      { path: 'wallet', element: <ProtectedRoute permission={PERMISSIONS.WALLETS_VIEW} element={<WalletPage />} />, errorElement: <PageError /> },
      { path: 'topup-requests', element: <ProtectedRoute permission={PERMISSIONS.WALLETS_VIEW} element={<TopupRequestsPage />} />, errorElement: <PageError /> },
      { path: 'withdraw-approvals', element: <ProtectedRoute permission={PERMISSIONS.WALLETS_VIEW} element={<WithdrawApprovalsPage />} />, errorElement: <PageError /> },
      { path: 'tbo-settlements', element: <ProtectedRoute permission={PERMISSIONS.REPORTS_VIEW} element={<TboSettlementsPage />} />, errorElement: <PageError /> },
      { path: 'commission', element: <ProtectedRoute permission={PERMISSIONS.COMMISSION_VIEW} element={<CommissionPage />} />, errorElement: <PageError /> },
      /* The refund LIST endpoint (GET /refunds) itself requires the
         `bookings.refund` permission server-side — gate the route on the
         same permission so a user without it never lands on an empty page. */
      { path: 'refunds', element: <ProtectedRoute permission={PERMISSIONS.BOOKINGS_REFUND} element={<RefundsPage />} />, errorElement: <PageError /> },
      { path: 'reports', element: <ProtectedRoute permission={PERMISSIONS.REPORTS_VIEW} element={<ReportsPage />} />, errorElement: <PageError /> },
      { path: 'promo', element: <ProtectedRoute permission={PERMISSIONS.PROMOS_VIEW} element={<PromoPage />} />, errorElement: <PageError /> },
      { path: 'notifications', element: <ProtectedRoute permission={PERMISSIONS.NOTIFICATIONS_VIEW} element={<NotificationsPage />} />, errorElement: <PageError /> },
      { path: 'settings', element: <ProtectedRoute permission={PERMISSIONS.SETTINGS_VIEW} element={<SettingsPage />} />, errorElement: <PageError /> },
      { path: 'admin-users', element: <ProtectedRoute permission={PERMISSIONS.ADMIN_USERS_VIEW} element={<AdminUsersPage />} />, errorElement: <PageError /> },
      { path: 'tramps-fares', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_FARES_VIEW} element={<TrampsAviationFaresPage />} />, errorElement: <PageError /> },
      /* TBO-style full-page "Add Series Fare" form — expands a date range into
         one day-ticket per day. Gated on the same fares-view permission as the
         /tramps-fares listing it links from. */
      { path: 'tramps-fares/add-series', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_FARES_VIEW} element={<AddSeriesFarePage />} />, errorElement: <PageError /> },
      /* Edit mode for series fares — same page component as add-series, but
         when a :groupId is present in the URL the form loads via GET
         /admin/tramps-fares/series/:groupId and saves via PUT. Reached from
         the row-action menu's "Edit" item on the Flights tab when the row
         has a seriesGroupId attached. */
      { path: 'tramps-fares/edit-series/:groupId', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_FARES_VIEW} element={<AddSeriesFarePage />} />, errorElement: <PageError /> },
      /* TBO-style full-page "Bulk Import" workflow — download a CSV/Excel
         template, upload a filled file, preview parsed rows, and submit to
         POST /admin/tramps-fares/bulk. Replaces the legacy dialog flow as
         the primary entry point (the dialog code is still mounted for
         back-compat but is no longer reachable from the toolbar). */
      { path: 'tramps-fares/bulk-import', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_FARES_VIEW} element={<BulkImportSeriesPage />} />, errorElement: <PageError /> },
      { path: 'popular-content', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_POPULAR_VIEW} element={<PopularContentPage />} />, errorElement: <PageError /> },
      { path: 'reviews', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_REVIEWS_VIEW} element={<ReviewsPage />} />, errorElement: <PageError /> },
      { path: 'pages', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_PAGES_VIEW} element={<PagesManager />} />, errorElement: <PageError /> },
      { path: 'enquiries', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_ENQUIRIES_VIEW} element={<EnquiriesPage />} />, errorElement: <PageError /> },
    ],
  },
]);

export default router;
