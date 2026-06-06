import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Skeleton, Tooltip, Alert, Snackbar, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent, Stack,
} from '@mui/material';
import {
  SearchOutlined, CheckOutlined, CloseOutlined, ReloadOutlined,
  ClockCircleOutlined, CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import { topupRequestsApi } from '../../api';
import MainCard from '../../components/MainCard';
import DateRangeFilter, { defaultLast30, DateRangeValue } from '../../components/DateRangeFilter';
import useDebounce from '../../hooks/useDebounce';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

type Status = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_CHIP: Record<string, { color: any; label: string }> = {
  pending:        { color: 'warning', label: 'Pending' },
  pending_admin:  { color: 'warning', label: 'Pending' },
  approved:       { color: 'success', label: 'Approved' },
  completed:      { color: 'success', label: 'Completed' },
  rejected:       { color: 'error',   label: 'Rejected' },
};

// The backend populates the agent under `agentId` (an object), and uses
// status 'pending_admin' for not-yet-reviewed requests. Helpers below read the
// data defensively so the page never renders an object as a React child.
function getAgent(r: any): any {
  return r?.agentId && typeof r.agentId === 'object' ? r.agentId : r?.agent;
}
function isPendingRow(status: string): boolean {
  return status === 'pending' || status === 'pending_admin';
}

// Coerce a stat value to a plain number. Accepts a number, or a
// { count, amount } object (the backend's breakdown shape). Returns undefined
// when there's nothing usable so the card shows "—" instead of crashing.
function statNum(v: any): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === 'object' ? (v.count ?? v.amount) : v;
  const num = Number(n);
  return Number.isFinite(num) ? num : undefined;
}

function StatCard({ icon, title, value, color }: any) {
  return (
    <Card sx={{ height: '100%', borderLeft: `4px solid ${color}` }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48, height: 48, borderRadius: 2,
            bgcolor: `${color}15`, color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
            {value == null || typeof value === 'object' ? '—' : String(value)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TopupRequestsPage() {
  const { can } = useUserContext();
  // Top-ups touch real money — gate on the wallets.approve permission, which
  // is what the backend approve/reject routes actually require (same as the
  // withdraw-approvals queue).
  const canApprove = can(PERMISSIONS.WALLETS_APPROVE) || can(PERMISSIONS.WALLETS_DEBIT);
  const canReject  = canApprove;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState('');
  // Debounce search so the API fires ~400ms after typing stops, not per key.
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState<Status>('pending');
  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultLast30());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  // Approve / reject dialogs
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [approveNote, setApproveNote] = useState('');
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actioning, setActioning] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (status !== 'all') params.status = status;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (dateRange.from) params.fromDate = dateRange.from;
      if (dateRange.to)   params.toDate   = dateRange.to;
      const res = await topupRequestsApi.list(params);
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setRows(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [page, status, debouncedSearch, dateRange]);

  const fetchStats = async () => {
    try {
      const res = await topupRequestsApi.getStats();
      setStats(res.data?.data ?? res.data);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { fetchStats(); }, []);

  // Realtime — refresh the queue + counter cards whenever a new top-up
  // request lands or the server signals stats changed. Show a snackbar
  // so the reviewing admin notices the new entry even if they're
  // mid-scroll.
  useEffect(() => {
    const onNewTopup = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const name = detail.agentName || detail.agentCode || 'Agent';
      const amount = Number(detail.amount || 0).toLocaleString('en-IN');
      setSnack({ open: true, msg: `New top-up: ${name} — ₹${amount}`, sev: 'info' });
      fetchList();
      fetchStats();
    };
    const onStatsRefresh = () => {
      fetchList();
      fetchStats();
    };
    window.addEventListener('admin:topup:submitted', onNewTopup);
    window.addEventListener('admin:stats:refresh', onStatsRefresh);
    return () => {
      window.removeEventListener('admin:topup:submitted', onNewTopup);
      window.removeEventListener('admin:stats:refresh', onStatsRefresh);
    };
  }, [fetchList]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActioning(true);
    try {
      await topupRequestsApi.approve(approveTarget._id || approveTarget.txnId, approveNote.trim() || undefined);
      setSnack({ open: true, msg: 'Top-up approved & wallet credited', sev: 'success' });
      setApproveTarget(null);
      setApproveNote('');
      fetchList();
      fetchStats();
    } catch (err: any) {
      setSnack({ open: true, msg: err?.response?.data?.message || 'Approve failed', sev: 'error' });
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setSnack({ open: true, msg: 'Rejection reason is required', sev: 'error' });
      return;
    }
    setActioning(true);
    try {
      await topupRequestsApi.reject(rejectTarget._id || rejectTarget.txnId, rejectReason.trim());
      setSnack({ open: true, msg: 'Top-up rejected — agent will be notified', sev: 'warning' });
      setRejectTarget(null);
      setRejectReason('');
      fetchList();
      fetchStats();
    } catch (err: any) {
      setSnack({ open: true, msg: err?.response?.data?.message || 'Reject failed', sev: 'error' });
    } finally {
      setActioning(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Pending Top-up Approvals</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Review agent wallet top-up requests submitted via bank transfer / UPI.
        Approving credits the agent's wallet automatically.
      </Typography>

      {/* Stats — backend returns { pendingNow, breakdown: { pending_admin,
          approved, rejected }: { count, amount } }. Read those fields and
          coerce to a number so StatCard always gets a primitive. */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<ClockCircleOutlined />} title="Pending"  value={statNum(stats?.pendingNow ?? stats?.breakdown?.pending_admin?.count ?? stats?.pending)} color="#ed6c02" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<CheckCircleOutlined />} title="Approved" value={statNum(stats?.breakdown?.approved?.count ?? stats?.approved)} color="#2e7d32" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<StopOutlined />}        title="Rejected" value={statNum(stats?.breakdown?.rejected?.count ?? stats?.rejected)} color="#c62828" />
        </Grid>
      </Grid>

      <MainCard>
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); fetchList(); }} sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 220 }}>
            <TextField
              size="small" placeholder="Search by agent name / ID / UTR..." value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
            />
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value as Status); setPage(1); }}>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={() => { fetchList(); fetchStats(); }} size="small"><ReloadOutlined /></IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <DateRangeFilter
            label="Submitted between:"
            value={dateRange}
            onChange={(v) => { setDateRange(v); setPage(1); }}
            onClear={() => { setDateRange({ from: '', to: '' }); setPage(1); }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Agent</TableCell>
                <TableCell>Agent ID</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>UTR / Reference</TableCell>
                <TableCell>Bank</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <TableRow key={i}>{Array(8).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>No top-up requests found</TableCell></TableRow>
              ) : (
                rows.map((r: any) => {
                  const st = STATUS_CHIP[r.status] || { color: 'default', label: String(r.status ?? '—') };
                  const isPending = isPendingRow(r.status);
                  const agent = getAgent(r);
                  return (
                    <TableRow key={r._id || r.txnId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {agent?.contactPerson || agent?.agencyName || r.agentName || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {agent?.email || r.agentEmail || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {agent?.agentId || agent?.agentCode || r.agentCode || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>
                          ₹{Number(r.amount || 0).toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">{r.utr || r.reference || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{r.bankName || r.bank || r.method || '—'}</Typography>
                        {r.upiId && (
                          <Typography variant="caption" color="text.secondary">{r.upiId}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip label={st.label} color={st.color} size="small" />
                        {r.rejectionReason && (
                          <Tooltip title={r.rejectionReason}>
                            <Typography
                              variant="caption"
                              color="error"
                              display="block"
                              sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {r.rejectionReason}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {isPending ? (
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            {canApprove && (
                              <Tooltip title="Approve & credit wallet">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => { setApproveTarget(r); setApproveNote(''); }}
                                >
                                  <CheckOutlined />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canReject && (
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => { setRejectTarget(r); setRejectReason(''); }}
                                >
                                  <CloseOutlined />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {r.processedBy?.name || r.approvedBy?.name || '—'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">Total: {total} requests</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={rows.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onClose={() => !actioning && setApproveTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Approve Top-up</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Credit <strong>₹{Number(approveTarget?.amount || 0).toLocaleString('en-IN')}</strong> to{' '}
            <strong>{getAgent(approveTarget)?.contactPerson || getAgent(approveTarget)?.agencyName || '—'}</strong>'s wallet?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Note (optional)"
            placeholder="e.g., Verified UTR with bank statement"
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveTarget(null)} disabled={actioning}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={actioning}>
            {actioning ? 'Approving…' : 'Approve & Credit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onClose={() => !actioning && setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Top-up</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            The agent will be notified with this reason — it must be specific
            enough for them to resubmit correctly (e.g. "UTR not found in bank
            statement, please share screenshot").
          </Alert>
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)} disabled={actioning}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={actioning || !rejectReason.trim()}>
            {actioning ? 'Rejecting…' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
