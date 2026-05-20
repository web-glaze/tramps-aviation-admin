import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Skeleton, Tooltip, Alert, Snackbar, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { SearchOutlined, EyeOutlined, StopOutlined, RollbackOutlined, ReloadOutlined } from '@ant-design/icons';
import { bookingsApi } from '../../api';
import MainCard from '../../components/MainCard';
import DateRangeFilter, { defaultLast30, DateRangeValue } from '../../components/DateRangeFilter';
import useDebounce from '../../hooks/useDebounce';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

// Type filter values that the bookings page understands. Used to validate
// the `?type=` query param so we don't accept arbitrary values from the URL.
const ALLOWED_TYPE_FILTERS = ['flight', 'hotel', 'insurance', 'series', 'refund'];

const statusConfig: Record<string, { label: string; color: any }> = {
  confirmed: { label: 'Confirmed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
  pending_payment: { label: 'Pending', color: 'warning' },
  refunded: { label: 'Refunded', color: 'info' },
  processing: { label: 'Processing', color: 'default' },
};

export default function BookingsPage() {
  const { can } = useUserContext();
  const canCancel = can(PERMISSIONS.BOOKINGS_CANCEL);
  const canRefund = can(PERMISSIONS.BOOKINGS_REFUND);

  const [searchParams] = useSearchParams();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Debounce search so the API fires ~400ms after typing stops, not per key.
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('');
  // Pre-fill the type filter from `?type=...` (e.g. the sidebar's
  // "Series Bookings" entry deep-links to `/bookings?type=series`). We
  // initialize from the query param so the very first fetch is already
  // scoped — avoiding a flash of "all bookings" before the filter applies.
  const initialType = (() => {
    const q = searchParams.get('type') || '';
    return ALLOWED_TYPE_FILTERS.includes(q) ? q : '';
  })();
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultLast30());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      // "Series" is a UI-only filter — map it to the backend's productType
      // query param (or tokenPrefix as a fallback). All other types map 1:1
      // to the existing `type` query param.
      const params: any = { page, limit: 10, search: debouncedSearch, status: statusFilter };
      if (typeFilter === 'series') {
        params.productType = 'series';
        params.tokenPrefix = 'TRAMPS-';
      } else if (typeFilter) {
        params.type = typeFilter;
      }
      if (dateRange.from) params.fromDate = dateRange.from;
      if (dateRange.to)   params.toDate   = dateRange.to;
      const res = await bookingsApi.getAll(params);
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setBookings(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch { setBookings([]); }
    finally { setLoading(false); }
  }, [page, statusFilter, typeFilter, debouncedSearch, dateRange]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Realtime — re-pull the list on any booking lifecycle event. Cheap
  // refetch (page is paginated, limit=10) — no need to splice into
  // existing state and risk mis-sorting.
  useEffect(() => {
    const onBookingUpdate = () => fetchBookings();
    window.addEventListener('admin:booking:update', onBookingUpdate);
    return () => window.removeEventListener('admin:booking:update', onBookingUpdate);
  }, [fetchBookings]);

  // React to ?type= changes that happen after mount — e.g. when the user
  // clicks the "Series Bookings" sidebar entry while already on /bookings.
  // Without this, the URL would update but the filter dropdown wouldn't.
  useEffect(() => {
    const q = searchParams.get('type') || '';
    const next = ALLOWED_TYPE_FILTERS.includes(q) ? q : '';
    setTypeFilter(prev => (prev === next ? prev : next));
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Pre-fix: cancel and refund were one-click, no confirm. A misclick on
  // the wrong row triggered a real cancellation against TBO and refunded
  // money to the agent's wallet. Both are irreversible from the admin
  // panel — confirm first, and ask for a reason for refunds so we have an
  // audit trail.
  const handleCancel = async (id: string) => {
    if (!window.confirm(
      'Cancel this booking? This will release inventory at the supplier and notify the customer/agent.',
    )) {
      return;
    }
    try {
      await bookingsApi.cancel(id, 'Admin cancelled');
      setSnack({ open: true, msg: 'Booking cancelled', sev: 'warning' });
      fetchBookings();
    } catch { setSnack({ open: true, msg: 'Failed to cancel', sev: 'error' }); }
  };

  const handleRefund = async (id: string) => {
    const reason = window.prompt(
      'Refund this booking? Enter a short reason (will be saved to the audit log):',
      'Admin initiated refund',
    );
    if (reason === null) return; // user cancelled
    const trimmed = reason.trim();
    if (!trimmed) {
      setSnack({ open: true, msg: 'Refund reason is required', sev: 'error' });
      return;
    }
    try {
      await bookingsApi.refund(id, { reason: trimmed });
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
              <MenuItem value="series">Series (TRAMPS-*)</MenuItem>
              <MenuItem value="refund">Refund</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh"><IconButton onClick={fetchBookings} size="small"><ReloadOutlined /></IconButton></Tooltip>
        </Box>
        {/* Date range — filters bookings by createdAt between from/to. */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <DateRangeFilter
            label="Booking date:"
            value={dateRange}
            onChange={(v) => { setDateRange(v); setPage(1); }}
            onClear={() => { setDateRange({ from: '', to: '' }); setPage(1); }}
          />
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
                  // Detect series bookings — TBO result token prefixed with
                  // TRAMPS- means this came from our in-house series fare
                  // pipeline rather than a real GDS pull.
                  const isSeries = (b.productType === 'series')
                    || (typeof b.tboResultToken === 'string' && b.tboResultToken.startsWith('TRAMPS-'));
                  const flightInfo = b.flightNumber || b.flightDetails?.flightNumber || b.segments?.[0]?.flightNumber;
                  const seatInfo = b.seatNumbers?.length
                    ? b.seatNumbers.join(', ')
                    : b.passengers?.map((p: any) => p.seatNumber).filter(Boolean).join(', ');
                  const pnr = b.pnr || b.airlinePnr || b.gdsPnr;
                  // Customer fare = the agent-facing total (what was actually
                  // charged to the agent's wallet) — prefer customerFare,
                  // fall back to totalAmount.
                  const customerFare = b.customerFare ?? b.totalAmount ?? 0;
                  return (
                    <TableRow key={b._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary">{b.bookingRef || b._id?.slice(-8)}</Typography>
                        {isSeries && (flightInfo || pnr) && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {flightInfo}{flightInfo && pnr ? ' · ' : ''}{pnr && `PNR ${pnr}`}
                            {seatInfo ? ` · Seat ${seatInfo}` : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{b.customerName || b.contactEmail || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{b.customerEmail || b.contactEmail || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={isSeries ? 'series' : (b.type || 'flight')}
                          size="small"
                          variant="outlined"
                          color={isSeries ? 'warning' : 'primary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>₹{Number(customerFare).toLocaleString('en-IN')}</Typography>
                      </TableCell>
                      <TableCell>{b.agentId?.agencyName || b.agentId?.contactPerson || 'Direct'}</TableCell>
                      <TableCell>{b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                      <TableCell><Chip label={s.label} color={s.color} size="small" /></TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="View"><IconButton size="small" color="primary" onClick={() => { setSelected(b); setViewOpen(true); }}><EyeOutlined /></IconButton></Tooltip>
                          {canCancel && b.status === 'confirmed' && (
                            <Tooltip title="Cancel"><IconButton size="small" color="warning" onClick={() => handleCancel(b._id)}><StopOutlined /></IconButton></Tooltip>
                          )}
                          {canRefund && b.status === 'cancelled' && (
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
                ['Customer', selected.customerName || selected.contactEmail || '—'],
                ['Email', selected.customerEmail || selected.contactEmail || '—'],
                ['Type', selected.type || 'Flight'],
                ['Amount', `₹${(selected.totalAmount || 0).toLocaleString('en-IN')}`],
                ['Status', selected.status],
                ['Agent', selected.agentId?.agencyName || selected.agentId?.contactPerson || 'Direct'],
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
