import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Skeleton, Tooltip, Alert, Snackbar, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { SearchOutlined, EyeOutlined, StopOutlined, RollbackOutlined, ReloadOutlined } from '@ant-design/icons';
import { bookingsApi } from '../../api';
import MainCard from '../../components/MainCard';

const statusConfig: Record<string, { label: string; color: any }> = {
  confirmed: { label: 'Confirmed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
  pending_payment: { label: 'Pending', color: 'warning' },
  refunded: { label: 'Refunded', color: 'info' },
  processing: { label: 'Processing', color: 'default' },
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.getAll({ page, limit: 10, search, status: statusFilter, type: typeFilter });
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setBookings(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch { setBookings([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, [page, statusFilter, typeFilter]);

  const handleCancel = async (id: string) => {
    try {
      await bookingsApi.cancel(id, 'Admin cancelled');
      setSnack({ open: true, msg: 'Booking cancelled', sev: 'warning' });
      fetchBookings();
    } catch { setSnack({ open: true, msg: 'Failed to cancel', sev: 'error' }); }
  };

  const handleRefund = async (id: string) => {
    try {
      await bookingsApi.refund(id, { reason: 'Admin initiated refund' });
      setSnack({ open: true, msg: 'Refund initiated', sev: 'success' });
      fetchBookings();
    } catch { setSnack({ open: true, msg: 'Failed to initiate refund', sev: 'error' }); }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>All Bookings</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        View and manage all platform bookings — flights, hotels, insurance
      </Typography>

      <MainCard>
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); fetchBookings(); }} sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 200 }}>
            <TextField
              size="small" placeholder="Search by booking ref, customer..." value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
            />
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="pending_payment">Pending</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="refunded">Refunded</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="flight">Flight</MenuItem>
              <MenuItem value="hotel">Hotel</MenuItem>
              <MenuItem value="insurance">Insurance</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh"><IconButton onClick={fetchBookings} size="small"><ReloadOutlined /></IconButton></Tooltip>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Booking Ref</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(7).fill(0).map((_, i) => (
                  <TableRow key={i}>{Array(8).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : bookings.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>No bookings found</TableCell></TableRow>
              ) : (
                bookings.map((b: any) => {
                  const s = statusConfig[b.status] || { label: b.status, color: 'default' };
                  return (
                    <TableRow key={b._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary">{b.bookingRef || b._id?.slice(-8)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{b.userId?.name || b.customerName || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{b.userId?.email || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={b.type || 'flight'} size="small" variant="outlined" color="primary" />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>₹{(b.totalAmount || 0).toLocaleString('en-IN')}</Typography>
                      </TableCell>
                      <TableCell>{b.agentId?.agencyName || b.agentId?.userId?.name || 'Direct'}</TableCell>
                      <TableCell>{b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                      <TableCell><Chip label={s.label} color={s.color} size="small" /></TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="View"><IconButton size="small" color="primary" onClick={() => { setSelected(b); setViewOpen(true); }}><EyeOutlined /></IconButton></Tooltip>
                          {b.status === 'confirmed' && (
                            <Tooltip title="Cancel"><IconButton size="small" color="warning" onClick={() => handleCancel(b._id)}><StopOutlined /></IconButton></Tooltip>
                          )}
                          {b.status === 'cancelled' && (
                            <Tooltip title="Refund"><IconButton size="small" color="info" onClick={() => handleRefund(b._id)}><RollbackOutlined /></IconButton></Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">Total: {total} bookings</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={bookings.length < 10} onClick={() => setPage(p => p + 1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Booking Details — {selected?.bookingRef || selected?._id?.slice(-8)}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Grid container spacing={2}>
              {[
                ['Booking Ref', selected.bookingRef || selected._id?.slice(-8)],
                ['Customer', selected.userId?.name || '—'],
                ['Email', selected.userId?.email || '—'],
                ['Type', selected.type || 'Flight'],
                ['Amount', `₹${(selected.totalAmount || 0).toLocaleString('en-IN')}`],
                ['Status', selected.status],
                ['Agent', selected.agentId?.agencyName || 'Direct'],
                ['Date', selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-IN') : '—'],
                ['Cancellation Reason', selected.cancellationReason || 'N/A'],
              ].map(([l, v]) => (
                <Grid size={6} key={l}>
                  <Typography variant="caption" color="text.secondary">{l}</Typography>
                  <Typography variant="body2" fontWeight={600}>{v}</Typography>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
