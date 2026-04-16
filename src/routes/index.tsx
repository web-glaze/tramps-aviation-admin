import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import Login from '../pages/authentication/Login';
import Dashboard from '../pages/dashboard';
import AgentsPage from '../pages/agents';
import CustomersPage from '../pages/customers';
import KycPage from '../pages/kyc';
import BookingsPage from '../pages/bookings';
import WalletPage from '../pages/wallet';
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
import { FlightsPage, HotelsPage, InsurancePage, RefundsPage, SubagentsPage } from '../pages/misc';
import { Box, Typography, Button } from '@mui/material';

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
      { index: true, element: <Dashboard />, errorElement: <PageError /> },
      { path: 'dashboard', element: <Dashboard />, errorElement: <PageError /> },
      { path: 'agents', element: <AgentsPage />, errorElement: <PageError /> },
      { path: 'customers', element: <CustomersPage />, errorElement: <PageError /> },
      { path: 'kyc', element: <KycPage />, errorElement: <PageError /> },
      { path: 'subagents', element: <SubagentsPage />, errorElement: <PageError /> },
      { path: 'bookings', element: <BookingsPage />, errorElement: <PageError /> },
      { path: 'flights', element: <FlightsPage />, errorElement: <PageError /> },
      { path: 'hotels', element: <HotelsPage />, errorElement: <PageError /> },
      { path: 'insurance', element: <InsurancePage />, errorElement: <PageError /> },
      { path: 'wallet', element: <WalletPage />, errorElement: <PageError /> },
      { path: 'commission', element: <CommissionPage />, errorElement: <PageError /> },
      { path: 'refunds', element: <RefundsPage />, errorElement: <PageError /> },
      { path: 'reports', element: <ReportsPage />, errorElement: <PageError /> },
      { path: 'promo', element: <PromoPage />, errorElement: <PageError /> },
      { path: 'notifications', element: <NotificationsPage />, errorElement: <PageError /> },
      { path: 'settings', element: <SettingsPage />, errorElement: <PageError /> },
      { path: 'tramps-fares', element: <TrampsAviationFaresPage />, errorElement: <PageError /> },
      { path: 'popular-content', element: <PopularContentPage />, errorElement: <PageError /> },
      { path: 'reviews', element: <ReviewsPage />, errorElement: <PageError /> },
      { path: 'pages', element: <PagesManager />, errorElement: <PageError /> },
      { path: 'enquiries', element: <EnquiriesPage />, errorElement: <PageError /> },
    ],
  },
]);

export default router;