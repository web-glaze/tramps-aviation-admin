import { useEffect, useState } from 'react';
import {
  Box, Grid, Typography, Skeleton, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, Avatar, Divider,
} from '@mui/material';
import {
  TeamOutlined, UserOutlined, BookOutlined, WalletOutlined,
  SafetyCertificateOutlined, ArrowUpOutlined, RiseOutlined,
  BarChartOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api';
import MainCard from '../../components/MainCard';
import useUserContext from '../../hooks/useUser';

const fmtINR = (n: number = 0) =>
  `₹${n.toLocaleString('en-IN')}`;

interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
  change?: string;
  onClick?: () => void;
  loading?: boolean;
}

const StatCard = ({ title, value, icon: Icon, color, bg, change, onClick, loading }: StatCardProps) => (
  <Card
    elevation={0}
    onClick={onClick}
    sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 2,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s',
      '&:hover': onClick ? { borderColor: 'primary.light', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' } : {},
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      {loading ? (
        <>
          <Skeleton variant="rounded" width={40} height={40} sx={{ mb: 2 }} />
          <Skeleton width="60%" height={32} />
          <Skeleton width="80%" height={16} />
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon style={{ fontSize: 20, color }} />
            </Box>
            {change && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main', fontSize: '0.75rem', fontWeight: 600 }}>
                <ArrowUpOutlined style={{ fontSize: 10 }} /> {change}
              </Box>
            )}
          </Box>
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ lineHeight: 1 }}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
        </>
      )}
    </CardContent>
  </Card>
);

const statusConfig: Record<string, { label: string; color: any }> = {
  confirmed: { label: 'Confirmed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
  pending_payment: { label: 'Pending', color: 'warning' },
  refunded: { label: 'Refunded', color: 'info' },
  processing: { label: 'Processing', color: 'default' },
};

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useUserContext();

  useEffect(() => {
    dashboardApi.getStats()
      .then((res) => {
        const d = res.data?.data ?? res.data;
        // FIX: Backend returns { summary:{...}, recentBookings:[...], topAgents:[...] }
        // Merge summary fields + recentBookings + topAgents into one stats object
        const summary = d?.summary || d?.stats || d;
        setStats({
          ...summary,
          // FIX: backend returns platformRevenue but frontend reads totalRevenue
          totalRevenue: summary?.totalRevenue ?? summary?.platformRevenue ?? 0,
          recentBookings: d?.recentBookings || [],
          topAgents: d?.topAgents || [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { title: 'Total Agents',     value: stats?.totalAgents     ?? 0, icon: TeamOutlined,              color: '#1890ff', bg: '#e6f4ff', path: '/agents' },
    { title: 'Active Agents',    value: stats?.activeAgents    ?? 0, icon: TeamOutlined,              color: '#52c41a', bg: '#f6ffed', path: '/agents' },
    { title: 'Pending KYC',      value: stats?.pendingKyc      ?? 0, icon: SafetyCertificateOutlined, color: '#fa8c16', bg: '#fff7e6', path: '/kyc' },
    { title: 'Total Customers',  value: stats?.totalCustomers  ?? 0, icon: UserOutlined,              color: '#722ed1', bg: '#f9f0ff', path: '/customers' },
    { title: 'Total Bookings',   value: stats?.totalBookings   ?? 0, icon: BookOutlined,              color: '#13c2c2', bg: '#e6fffb', path: '/bookings' },
    { title: 'Total Revenue',    value: fmtINR(stats?.totalRevenue), icon: DollarOutlined,            color: '#eb2f96', bg: '#fff0f6', path: '/reports' },
    { title: "Today's Bookings", value: stats?.todayBookings   ?? 0, icon: RiseOutlined,              color: '#fa541c', bg: '#fff2e8', path: '/bookings' },
    { title: 'Pending Refunds',  value: stats?.pendingRefunds  ?? 0, icon: WalletOutlined,            color: '#f5222d', bg: '#fff1f0', path: '/refunds' },
  ];

  return (
    <Box>
      {/* Welcome Banner */}
      <MainCard sx={{ mb: 3, background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', border: 'none' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" color="white" fontWeight={700} gutterBottom>
              Welcome Back, {user?.name || 'Admin'}! 👋
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              Here's what's happening on your travel platform today.
            </Typography>
          </Box>
          <Box sx={{ fontSize: 64, opacity: 0.8, display: { xs: 'none', sm: 'block' } }}>✈️</Box>
        </Box>
      </MainCard>

      {/* Stats Grid */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {cards.map((card) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={card.title}>
            <StatCard {...card} loading={loading} onClick={() => navigate(card.path)} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* Recent Bookings */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <MainCard
            title="Recent Bookings"
            secondary={
              <Button size="small" variant="text" onClick={() => navigate('/bookings')}>
                View All →
              </Button>
            }
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Booking Ref</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(5).fill(0).map((_, j) => (
                          <TableCell key={j}><Skeleton /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (stats?.recentBookings || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No bookings yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    (stats?.recentBookings || []).map((b: any, i: number) => {
                      const s = statusConfig[b.status] || { label: b.status, color: 'default' };
                      return (
                        <TableRow key={b._id || i} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color="primary">
                              {b.bookingRef || b._id?.slice(-8)}
                            </Typography>
                          </TableCell>
                          <TableCell>{b.customerName || b.contactEmail || b.userId?.name || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip label={b.type || 'Flight'} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{fmtINR(b.totalAmount || 0)}</TableCell>
                          <TableCell>
                            <Chip label={s.label} color={s.color} size="small" />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </MainCard>
        </Grid>

        {/* Top Agents */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <MainCard
            title="Top Performing Agents"
            secondary={
              <Button size="small" variant="text" onClick={() => navigate('/agents')}>
                View All →
              </Button>
            }
          >
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2 }}>
                  <Skeleton variant="circular" width={36} height={36} />
                  <Box flex={1}><Skeleton width="70%" /><Skeleton width="50%" /></Box>
                  <Skeleton width={60} />
                </Box>
              ))
            ) : (stats?.topAgents || []).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <TeamOutlined style={{ fontSize: 32, opacity: 0.3 }} />
                <Typography variant="body2" sx={{ mt: 1 }}>No agents yet</Typography>
              </Box>
            ) : (
              (stats?.topAgents || []).map((a: any, i: number) => (
                <Box key={a._id || i}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
                    <Avatar
                      sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      #{i + 1}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography variant="subtitle2" fontWeight={600} noWrap>
                        {a.agencyName || a.contactPerson || 'Agent'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {a.agentId || a.email || '—'}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} color="success.main">
                      {fmtINR(a.totalRevenue || 0)}
                    </Typography>
                  </Box>
                  {i < (stats?.topAgents?.length || 0) - 1 && <Divider />}
                </Box>
              ))
            )}
          </MainCard>
        </Grid>
      </Grid>

      {/* Quick Actions — Full Width Row */}
      <MainCard title="Quick Actions" sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {[
            { label: 'Review KYC',        icon: SafetyCertificateOutlined, path: '/kyc',        color: '#fa8c16', bg: '#fff7e6', desc: 'Verify agent documents' },
            { label: 'Manage Wallets',    icon: WalletOutlined,            path: '/wallet',     color: '#1890ff', bg: '#e6f4ff', desc: 'Credit / debit agent wallets' },
            { label: 'All Bookings',      icon: BookOutlined,              path: '/bookings',   color: '#13c2c2', bg: '#e6fffb', desc: 'View & manage bookings' },
            { label: 'Agents (B2B)',       icon: TeamOutlined,              path: '/agents',     color: '#722ed1', bg: '#f9f0ff', desc: 'Manage travel agents' },
            { label: 'Commission Rules',  icon: BarChartOutlined,          path: '/commission', color: '#52c41a', bg: '#f6ffed', desc: 'Set commission rates' },
            { label: 'View Reports',      icon: RiseOutlined,              path: '/reports',    color: '#eb2f96', bg: '#fff0f6', desc: 'Analytics & insights' },
            { label: 'Promo Codes',       icon: DollarOutlined,            path: '/promo',      color: '#fa541c', bg: '#fff2e8', desc: 'Manage discount codes' },
            { label: 'Tramps Aviation Fares',      icon: BarChartOutlined,          path: '/tramps-fares', color: '#08979c', bg: '#e6fffb', desc: 'Set special fares' },
          ].map(({ label, icon: Icon, path, color, bg, desc }) => (
            <Box
              key={label}
              onClick={() => navigate(path)}
              sx={{
                flex: '1 1 120px',
                minWidth: 120,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                p: 2.5,
                borderRadius: 2,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: color,
                  transform: 'translateY(-3px)',
                  boxShadow: `0 4px 20px ${color}22`,
                },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1.5,
                }}
              >
                <Icon style={{ fontSize: 22, color }} />
              </Box>
              <Typography variant="body2" fontWeight={700} align="center" sx={{ mb: 0.5 }}>
                {label}
              </Typography>
              <Typography variant="caption" color="text.secondary" align="center" sx={{ lineHeight: 1.3 }}>
                {desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </MainCard>
    </Box>
  );
}