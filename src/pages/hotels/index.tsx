import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Skeleton, Tooltip, Grid, Card, CardContent, FormControl, InputLabel,
  Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { hotelsApi } from '../../api';
import MainCard from '../../components/MainCard';
import useDebounce from '../../hooks/useDebounce';

// ─────────────────────────────────────────────────────────────────────────────
// HOTELS — admin view of hotel bookings (read-only)
// ─────────────────────────────────────────────────────────────────────────────
// Backend: HotelsController @ `/hotels/admin/all`
//   GET /hotels/admin/all?page&limit&status&bookingType&search
//     → { bookings: [...], pagination: { page, limit, total, totalPages },
//         stats: { totalBookings, totalRevenue, totalNights, b2bCount, b2cCount } }
// The endpoint is guarded by RolesGuard + @Roles(Role.ADMIN). There is no
// hotel-cancellation admin route (cancellation is agent/customer-initiated via
// `/hotels/:bookingRef/cancel`), so this admin page is intentionally read-only.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, { color: any; label: string }> = {
  confirmed: { color: 'success', label: 'Confirmed' },
  cancelled: { color: 'error',   label: 'Cancelled' },
  pending:   { color: 'warning', label: 'Pending' },
  failed:    { color: 'error',   label: 'Failed' },
  refunded:  { color: 'info',    label: 'Refunded' },
};

function StatCard({ title, value, color }: { title: string; value: any; color: string }) {
  return (
    <Card sx={{ height: '100%', borderLeft: `4px solid ${color}` }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" fontWeight={600}
          sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.2, mt: 0.5 }}>
          {value ?? '—'}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function HotelsPage() {
  const [rows, setRows]       = useState<any[]>([]);
  const [stats, setStats]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const debouncedSearch       = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);

  const [selected, setSelected] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.bookingType = typeFilter; // 'b2b' | 'b2c'
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const res = await hotelsApi.getAll(params);
      // Hotels admin endpoint returns { bookings, pagination, stats }.
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.bookings) ? raw.bookings : (Array.isArray(raw) ? raw : []);
      setRows(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
      if (raw?.stats) setStats(raw.stats);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, debouncedSearch]);

  useEffect(() => { fetchHotels(); }, [fetchHotels]);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Hotels Management</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        View all hotel bookings made across the platform — B2B and B2C
      </Typography>

      {/* Stats strip — figures come from the admin endpoint's aggregate. */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard title="Confirmed Bookings" value={stats?.totalBookings ?? '—'} color="#1677ff" />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard
            title="Total Revenue"
            value={stats ? `₹${Number(stats.totalRevenue || 0).toLocaleString('en-IN')}` : '—'}
            color="#52c41a"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard title="Room Nights" value={stats?.totalNights ?? '—'} color="#722ed1" />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard
            title="B2B / B2C Split"
            value={stats ? `${stats.b2bCount || 0} / ${stats.b2cCount || 0}` : '—'}
            color="#fa8c16"
          />
        </Grid>
      </Grid>

      <MainCard>
        {/* Toolbar — search + status/type filters + refresh */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Box
            component="form"
            onSubmit={(e) => { e.preventDefault(); fetchHotels(); }}
            sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 200 }}
          >
            <TextField
              size="small" placeholder="Search by booking ref, hotel, email..." value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
            />
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="refunded">Refunded</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Channel</InputLabel>
            <Select label="Channel" value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="b2b">B2B</MenuItem>
              <MenuItem value="b2c">B2C</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchHotels} size="small"><ReloadOutlined /></IconButton>
          </Tooltip>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Booking Ref</TableCell>
                <TableCell>Hotel</TableCell>
                <TableCell>Guest</TableCell>
                <TableCell>Check-in / out</TableCell>
                <TableCell>Rooms / Nights</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(9).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No hotel bookings found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((h: any) => {
                  const s = STATUS_CHIP[h.status] || { label: h.status, color: 'default' };
                  // Lead guest = first guest flagged isLead, else the first guest.
                  const lead = h.guests?.find((g: any) => g.isLead) || h.guests?.[0];
                  const guestName = lead ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : '';
                  const amount = h.fare?.customerFare ?? 0;
                  return (
                    <TableRow key={h._id || h.bookingRef} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary">{h.bookingRef || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{h.hotelName || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {h.address?.city || ''}{h.starRating ? ` · ${h.starRating}★` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{guestName || h.contactEmail || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{h.contactEmail || ''}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {h.checkInDate ? new Date(h.checkInDate).toLocaleDateString('en-IN') : '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {h.checkOutDate ? new Date(h.checkOutDate).toLocaleDateString('en-IN') : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>{h.rooms ?? '—'} / {h.nights ?? '—'}</TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>₹{Number(amount).toLocaleString('en-IN')}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined"
                          label={(h.bookingType || '').toUpperCase() || '—'}
                          color={h.bookingType === 'b2b' ? 'primary' : 'secondary'} />
                      </TableCell>
                      <TableCell><Chip label={s.label} color={s.color} size="small" /></TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" color="primary"
                            onClick={() => { setSelected(h); setViewOpen(true); }}>
                            <EyeOutlined />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">Total: {total} hotel bookings</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={rows.length < 10} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      {/* ── View Hotel Booking dialog ──────────────────────────────────────── */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Hotel Booking — {selected?.bookingRef}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Grid container spacing={2}>
              {[
                ['Booking Ref', selected.bookingRef],
                ['Hotel', selected.hotelName],
                ['City', selected.address?.city || '—'],
                ['Star Rating', selected.starRating ? `${selected.starRating}★` : '—'],
                ['Check-in', selected.checkInDate ? new Date(selected.checkInDate).toLocaleDateString('en-IN') : '—'],
                ['Check-out', selected.checkOutDate ? new Date(selected.checkOutDate).toLocaleDateString('en-IN') : '—'],
                ['Rooms', selected.rooms ?? '—'],
                ['Nights', selected.nights ?? '—'],
                ['Room Type', selected.room?.roomTypeName || '—'],
                ['Amount', `₹${Number(selected.fare?.customerFare || 0).toLocaleString('en-IN')}`],
                ['Channel', (selected.bookingType || '').toUpperCase() || '—'],
                ['Status', selected.status],
                ['Contact Email', selected.contactEmail || '—'],
                ['TBO Confirmation', selected.tboConfirmationNumber || '—'],
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
    </Box>
  );
}
