import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Skeleton, Tooltip, Grid, Card, CardContent, FormControl, InputLabel,
  Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Snackbar, CircularProgress,
} from '@mui/material';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined, RedoOutlined,
} from '@ant-design/icons';
import { insuranceApi } from '../../api';
import MainCard from '../../components/MainCard';
import useDebounce from '../../hooks/useDebounce';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// INSURANCE — admin view of issued policies
// ─────────────────────────────────────────────────────────────────────────────
// Backend: InsuranceController @ `/insurance/admin/*`
//   GET  /insurance/admin/all?page&limit&status&planType
//        → { data: [...], pagination: {...},
//            stats: { totalPremium, totalCommission, totalPolicies, activePolicies } }
//   POST /insurance/admin/:policyRef/retry
//        → re-fires the Bajaj Allianz issuance call for a stuck INITIATED policy
// Both are guarded by RolesGuard + @Roles(Role.ADMIN). The retry action is the
// only mutation the backend exposes for insurance; it is permission-gated on
// BOOKINGS_EDIT to mirror how other admin write actions are gated.
//
// Note: the insurance backend has no `search` query param, so this page filters
// by status / plan type only. A client-side search box would silently do
// nothing — so we omit it rather than offer a misleading control.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, { color: any; label: string }> = {
  active:    { color: 'success', label: 'Active' },
  issued:    { color: 'success', label: 'Issued' },
  initiated: { color: 'warning', label: 'Initiated' },
  failed:    { color: 'error',   label: 'Failed' },
  cancelled: { color: 'error',   label: 'Cancelled' },
  expired:   { color: 'default', label: 'Expired' },
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

export default function InsurancePage() {
  const { can } = useUserContext();
  // Retry re-issues a policy with the Bajaj API — treat it as a booking-edit
  // level action and gate it accordingly.
  const canRetry = can(PERMISSIONS.BOOKINGS_EDIT);

  const [rows, setRows]       = useState<any[]>([]);
  const [stats, setStats]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // The insurance admin endpoint has no `search` param — we filter the
  // currently loaded page client-side by policy/booking ref instead.
  const [search, setSearch]   = useState('');
  const debouncedSearch       = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter]     = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);

  const [selected, setSelected] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [snack, setSnack]       = useState({ open: false, msg: '', sev: 'success' as any });

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      if (planFilter) params.planType = planFilter;
      const res = await insuranceApi.getAll(params);
      // Insurance admin endpoint returns { data, pagination, stats }.
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setRows(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
      if (raw?.stats) setStats(raw.stats);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, planFilter]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  // Client-side narrowing of the loaded page by policy/booking ref. The backend
  // does not support a server-side search param for insurance policies.
  const visibleRows = debouncedSearch.trim()
    ? rows.filter((p) => {
        const q = debouncedSearch.trim().toLowerCase();
        return (
          (p.policyRef || '').toLowerCase().includes(q) ||
          (p.bookingRef || '').toLowerCase().includes(q) ||
          (p.contactEmail || '').toLowerCase().includes(q)
        );
      })
    : rows;

  // ── Retry a stuck (INITIATED) policy ────────────────────────────────────────
  const handleRetry = async (policyRef: string) => {
    if (!window.confirm(`Retry Bajaj Allianz issuance for policy ${policyRef}?`)) return;
    setRetrying(policyRef);
    try {
      await insuranceApi.retry(policyRef);
      setSnack({ open: true, msg: 'Retry initiated — check status shortly', sev: 'success' });
      fetchPolicies();
    } catch (e: any) {
      setSnack({ open: true, msg: e?.response?.data?.message || 'Retry failed', sev: 'error' });
    } finally {
      setRetrying(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Insurance Management</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        View all travel insurance policies issued through the platform
      </Typography>

      {/* Stats strip — figures come from the admin endpoint's aggregate. */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard title="Total Policies" value={stats?.totalPolicies ?? '—'} color="#1677ff" />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard title="Active Policies" value={stats?.activePolicies ?? '—'} color="#52c41a" />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard
            title="Total Premium"
            value={stats ? `₹${Number(stats.totalPremium || 0).toLocaleString('en-IN')}` : '—'}
            color="#722ed1"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard
            title="Platform Commission"
            value={stats ? `₹${Number(stats.totalCommission || 0).toLocaleString('en-IN')}` : '—'}
            color="#fa8c16"
          />
        </Grid>
      </Grid>

      <MainCard>
        {/* Toolbar — client search + status/plan filters + refresh */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <TextField
            size="small" placeholder="Filter loaded page by policy / booking ref..." value={search}
            onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 200 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="initiated">Initiated</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Trip Type</InputLabel>
            <Select label="Trip Type" value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="domestic">Domestic</MenuItem>
              <MenuItem value="international">International</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchPolicies} size="small"><ReloadOutlined /></IconButton>
          </Tooltip>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Policy Ref</TableCell>
                <TableCell>Booking Ref</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Trip</TableCell>
                <TableCell>Travellers</TableCell>
                <TableCell>Premium</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(8).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                  </TableRow>
                ))
              ) : visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No insurance policies found
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((p: any) => {
                  // Status comes back as a PolicyStatus enum value — normalise
                  // to lower-case for the chip lookup.
                  const key = String(p.status || '').toLowerCase();
                  const s = STATUS_CHIP[key] || { label: p.status, color: 'default' };
                  return (
                    <TableRow key={p._id || p.policyRef} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary" fontFamily="monospace">
                          {p.policyRef || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{p.bookingRef || '—'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{p.planName || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{p.origin || '?'} → {p.destination || '?'}</Typography>
                        <Typography variant="caption" color="text.secondary"
                          sx={{ textTransform: 'capitalize' }}>
                          {p.tripType || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>{p.passengerCount ?? p.passengers?.length ?? '—'}</TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>₹{Number(p.totalPremium || 0).toLocaleString('en-IN')}</Typography>
                      </TableCell>
                      <TableCell><Chip label={s.label} color={s.color} size="small" /></TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary"
                              onClick={() => { setSelected(p); setViewOpen(true); }}>
                              <EyeOutlined />
                            </IconButton>
                          </Tooltip>
                          {/* Retry only makes sense for INITIATED (stuck) policies. */}
                          {canRetry && key === 'initiated' && (
                            <Tooltip title="Retry Bajaj issuance">
                              <span>
                                <IconButton size="small" color="warning"
                                  disabled={retrying === p.policyRef}
                                  onClick={() => handleRetry(p.policyRef)}>
                                  {retrying === p.policyRef
                                    ? <CircularProgress size={16} />
                                    : <RedoOutlined />}
                                </IconButton>
                              </span>
                            </Tooltip>
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
          <Typography variant="body2" color="text.secondary">Total: {total} policies</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={rows.length < 10} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      {/* ── View Policy dialog ─────────────────────────────────────────────── */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Insurance Policy — {selected?.policyRef}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Grid container spacing={2}>
              {[
                ['Policy Ref', selected.policyRef],
                ['Booking Ref', selected.bookingRef || '—'],
                ['Plan', selected.planName || '—'],
                ['Trip Type', selected.tripType || '—'],
                ['Route', `${selected.origin || '?'} → ${selected.destination || '?'}`],
                ['Departure', selected.departureDate ? new Date(selected.departureDate).toLocaleDateString('en-IN') : '—'],
                ['Return', selected.returnDate ? new Date(selected.returnDate).toLocaleDateString('en-IN') : '—'],
                ['Travellers', selected.passengerCount ?? selected.passengers?.length ?? '—'],
                ['Premium / Person', `₹${Number(selected.premiumPerPerson || 0).toLocaleString('en-IN')}`],
                ['Total Premium', `₹${Number(selected.totalPremium || 0).toLocaleString('en-IN')}`],
                ['Platform Commission', `₹${Number(selected.platformCommission || 0).toLocaleString('en-IN')}`],
                ['Status', selected.status],
                ['Bajaj Policy No.', selected.bajajPolicyNumber || '—'],
                ['Contact Email', selected.contactEmail || '—'],
              ].map(([l, v]) => (
                <Grid size={6} key={l}>
                  <Typography variant="caption" color="text.secondary">{l}</Typography>
                  <Typography variant="body2" fontWeight={600}>{v}</Typography>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selected?.policyDocumentUrl && (
            <Button onClick={() => window.open(selected.policyDocumentUrl, '_blank')}>
              Open Policy Document
            </Button>
          )}
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
