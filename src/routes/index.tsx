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
import { FlightsPage, HotelsPage, InsurancePage, RefundsPage, SubagentsPage } from '../pages/misc';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'kyc', element: <KycPage /> },
      { path: 'subagents', element: <SubagentsPage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'flights', element: <FlightsPage /> },
      { path: 'hotels', element: <HotelsPage /> },
      { path: 'insurance', element: <InsurancePage /> },
      { path: 'wallet', element: <WalletPage /> },
      { path: 'commission', element: <CommissionPage /> },
      { path: 'refunds', element: <RefundsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'promo', element: <PromoPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

export default router;
