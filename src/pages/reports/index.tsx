import { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  FormControl, InputLabel, Select, MenuItem, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DownloadOutlined } from '@ant-design/icons';
import { reportsApi } from '../../api';
import MainCard from '../../components/MainCard';

const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1'];

export default function ReportsPage() {
  const [period, setPeriod] = useState('month');
  const [revenueData, setRevenueData] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [revRes, bkRes] = await Promise.all([
        reportsApi.getRevenue({ period }),
        reportsApi.getBookings({ period }),
      ]);
      setRevenueData(revRes.data?.data || revRes.data);
      setBookingData(bkRes.data?.data || bkRes.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, [period]);

  const handleExport = async (type: string) => {
    try {
      const res = await reportsApi.exportCsv(type, { period });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report-${period}.csv`;
      a.click();
    } catch {}
  };

  // Fallback chart data when API not connected
  const chartRevenue = revenueData?.chart || [
    { month: 'Jan', revenue: 120000, bookings: 45 },
    { month: 'Feb', revenue: 180000, bookings: 62 },
    { month: 'Mar', revenue: 150000, bookings: 54 },
    { month: 'Apr', revenue: 220000, bookings: 78 },
    { month: 'May', revenue: 190000, bookings: 68 },
    { month: 'Jun', revenue: 280000, bookings: 95 },
  ];

  const pieData = revenueData?.byType || [
    { name: 'Flights', value: 65 },
    { name: 'Hotels', value: 25 },
    { name: 'Insurance', value: 10 },
  ];

  const summaryCards = [
    { label: 'Total Revenue', value: `₹${((revenueData?.totalRevenue || 0) / 1000).toFixed(0)}K`, color: '#1890ff' },
    { label: 'Total Bookings', value: bookingData?.totalBookings || 0, color: '#52c41a' },
    { label: 'Avg Booking Value', value: `₹${(revenueData?.avgBookingValue || 0).toLocaleString('en-IN')}`, color: '#fa8c16' },
    { label: 'Cancellation Rate', value: `${revenueData?.cancellationRate || 0}%`, color: '#f5222d' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>Reports & Analytics</Typography>
          <Typography color="text.secondary" variant="body2">Platform performance metrics and insights</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Period</InputLabel>
            <Select label="Period" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<DownloadOutlined />} onClick={() => handleExport('revenue')} size="small">
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {summaryCards.map((c) => (
          <Grid size={{ xs: 6, md: 3 }} key={c.label}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                {loading ? <><Skeleton height={36} /><Skeleton width="60%" /></> : (
                  <>
                    <Typography variant="h4" fontWeight={700} sx={{ color: c.color }}>{c.value}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{c.label}</Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* Revenue Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <MainCard title="Revenue & Bookings Trend">
            {loading ? <Skeleton variant="rectangular" height={300} /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <RechartTip />
                  <Bar yAxisId="left" dataKey="revenue" fill="#1890ff" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar yAxisId="right" dataKey="bookings" fill="#52c41a" radius={[4, 4, 0, 0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </MainCard>
        </Grid>

        {/* Booking by Type Pie */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <MainCard title="Bookings by Type">
            {loading ? <Skeleton variant="rectangular" height={300} /> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                    {pieData.map((_: any, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <RechartTip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </MainCard>
        </Grid>

        {/* Top Agents Table */}
        <Grid size={12}>
          <MainCard title="Top Agents by Revenue">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Agent / Agency</TableCell>
                    <TableCell>Total Bookings</TableCell>
                    <TableCell>Total Revenue</TableCell>
                    <TableCell>Commission Earned</TableCell>
                    <TableCell>Avg Booking Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => <TableRow key={i}>{Array(6).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>)
                  ) : (revenueData?.topAgents || []).length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No data available</TableCell></TableRow>
                  ) : (
                    (revenueData?.topAgents || []).map((a: any, i: number) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: i < 3 ? 'primary.main' : 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', color: i < 3 ? 'white' : 'text.primary', fontSize: '0.7rem', fontWeight: 700 }}>
                            {i + 1}
                          </Box>
                        </TableCell>
                        <TableCell><Typography fontWeight={600}>{a.agencyName || a.name}</Typography></TableCell>
                        <TableCell>{a.totalBookings || 0}</TableCell>
                        <TableCell><Typography fontWeight={700}>₹{(a.totalRevenue || 0).toLocaleString('en-IN')}</Typography></TableCell>
                        <TableCell>₹{(a.commissionEarned || 0).toLocaleString('en-IN')}</TableCell>
                        <TableCell>₹{(a.avgBookingValue || 0).toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </MainCard>
        </Grid>
      </Grid>
    </Box>
  );
}
