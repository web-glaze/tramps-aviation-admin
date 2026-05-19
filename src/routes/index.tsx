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
import PopularContentPage from '../pages/popular-content';
import ReviewsPage from '../pages/reviews';
import PagesManager from '../pages/cms';
import EnquiriesPage from '../pages/enquiries';
import SubAgentsPage from '../pages/subagents';
import { FlightsPage, HotelsPage, InsurancePage, RefundsPage } from '../pages/misc';
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

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
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
      { path: 'refunds', element: <ProtectedRoute permission={PERMISSIONS.BOOKINGS_VIEW} element={<RefundsPage />} />, errorElement: <PageError /> },
      { path: 'reports', element: <ProtectedRoute permission={PERMISSIONS.REPORTS_VIEW} element={<ReportsPage />} />, errorElement: <PageError /> },
      { path: 'promo', element: <ProtectedRoute permission={PERMISSIONS.PROMOS_VIEW} element={<PromoPage />} />, errorElement: <PageError /> },
      { path: 'notifications', element: <ProtectedRoute permission={PERMISSIONS.NOTIFICATIONS_VIEW} element={<NotificationsPage />} />, errorElement: <PageError /> },
      { path: 'settings', element: <ProtectedRoute permission={PERMISSIONS.SETTINGS_VIEW} element={<SettingsPage />} />, errorElement: <PageError /> },
      { path: 'admin-users', element: <ProtectedRoute permission={PERMISSIONS.ADMIN_USERS_VIEW} element={<AdminUsersPage />} />, errorElement: <PageError /> },
      { path: 'tramps-fares', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_FARES_VIEW} element={<TrampsAviationFaresPage />} />, errorElement: <PageError /> },
      { path: 'popular-content', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_POPULAR_VIEW} element={<PopularContentPage />} />, errorElement: <PageError /> },
      { path: 'reviews', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_REVIEWS_VIEW} element={<ReviewsPage />} />, errorElement: <PageError /> },
      { path: 'pages', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_PAGES_VIEW} element={<PagesManager />} />, errorElement: <PageError /> },
      { path: 'enquiries', element: <ProtectedRoute permission={PERMISSIONS.CONTENT_ENQUIRIES_VIEW} element={<EnquiriesPage />} />, errorElement: <PageError /> },
    ],
  },
]);

export default router;
