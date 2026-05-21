import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Skeleton, Tooltip, Grid, Card, CardContent, Alert,
} from '@mui/material';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { trampsAviationFaresApi } from '../../api';
import MainCard from '../../components/MainCard';
import useDebounce from '../../hooks/useDebounce';

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHTS — series-fare inventory (admin, read-only)
// ─────────────────────────────────────────────────────────────────────────────
// The platform has no general "flight bookings management" admin endpoint —
// flight BOOKINGS are managed from /bookings (filter Type=Flight). What it DOES
// expose is the in-house series-fare inventory: pre-negotiated bulk seats sold
// under the "TRAMPS-*" pipeline.
//
// This page is a focused, READ-ONLY view of that flight inventory. Full
// create / edit / PNR-pool management lives on the dedicated /tramps-fares
// page; here we surface only the `type: 'flight'` rows so an admin can see
// live flight inventory at a glance.
//
// Backend: AdminTrampsFaresController @ `/admin/tramps-fares`
//   GET /admin/tramps-fares?type=flight → { data, pagination }
//   GET /admin/tramps-fares/stats       → { total, active, flights, ... }
// Both are guarded by @Permissions('content.fares.view'); the route is wired
// with PERMISSIONS.BOOKINGS_VIEW (see routes/index.tsx) so it stays accessible
// from the bookings area of the sidebar.
// ─────────────────────────────────────────────────────────────────────────────

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

export default function FlightsPage() {
  const [rows, setRows]       = useState<any[]>([]);
  const [stats, setStats]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const debouncedSearch       = useDebounce(search, 400);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);

  const fetchFares = useCallback(async () => {
    setLoading(true);
    try {
      // Scope to flight-type series fares only — this page is the "flights" view.
      const params: any = { page, limit: 10, type: 'flight' };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const res = await trampsAviationFaresApi.getAll(params);
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setRows(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  // Stats are global (not paginated) — fetch once on mount.
  useEffect(() => {
    trampsAviationFaresApi.getStats()
      .then((res) => setStats(res.data?.data ?? res.data))
      .catch(() => setStats(null));
  }, []);

  useEffect(() => { fetchFares(); }, [fetchFares]);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Flights Inventory</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Live series-fare flight inventory. To manage flight bookings, use All Bookings
        (filter Type = Flight); to create or edit series fares, use Tramps Fares.
      </Typography>

      {/* Stats strip — platform-wide series-fare counts. */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Flight Fares" value={stats?.flights ?? '—'} color="#1677ff" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Active Fares (all types)" value={stats?.active ?? '—'} color="#52c41a" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Unique Sectors" value={stats?.sectors ?? '—'} color="#722ed1" />
        </Grid>
      </Grid>

      <MainCard>
        {/* Toolbar — search + refresh */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Box
            component="form"
            onSubmit={(e) => { e.preventDefault(); fetchFares(); }}
            sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 200 }}
          >
            <TextField
              size="small" placeholder="Search by sector, flight no, airline..." value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
            />
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchFares} size="small"><ReloadOutlined /></IconButton>
          </Tooltip>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sector</TableCell>
                <TableCell>Flight</TableCell>
                <TableCell>Airline</TableCell>
                <TableCell>Departure</TableCell>
                <TableCell>Fare (pp)</TableCell>
                <TableCell>Seats Left</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(7).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No flight inventory found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((f: any) => {
                  // Newer rows store the day in departureDate/Time; legacy rows
                  // mirror it on travelDate/timing — fall back gracefully.
                  const depDate = f.departureDate || f.travelDate || '';
                  const depTime = f.departureTime || (f.timing ? String(f.timing).split('-')[0] : '');
                  const sector = f.sector || `${f.origin || ''}-${f.destination || ''}`;
                  return (
                    <TableRow key={f._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary">{sector || '—'}</Typography>
                      </TableCell>
                      <TableCell>{f.flightNumber || '—'}</TableCell>
                      <TableCell>{f.airline || '—'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{depDate || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{depTime || ''}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>₹{Number(f.fare || 0).toLocaleString('en-IN')}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={f.seatsAvailable ?? 0}
                          color={(f.seatsAvailable ?? 0) > 0 ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={f.isActive ? 'Active' : 'Inactive'}
                          color={f.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">Total: {total} flight fares</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={rows.length < 10} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      <Alert severity="info" sx={{ mt: 2 }}>
        This is a read-only inventory view. Series fares are created and edited on the
        Tramps Fares page; flight bookings are processed from All Bookings.
      </Alert>
    </Box>
  );
}
