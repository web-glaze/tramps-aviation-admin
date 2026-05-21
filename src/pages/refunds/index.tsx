import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Skeleton, Tooltip, Alert, Snackbar, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent, CircularProgress,
} from '@mui/material';
import {
  SearchOutlined, EyeOutlined, CheckOutlined, CloseOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { refundsApi } from '../../api';
import MainCard from '../../components/MainCard';
import useDebounce from '../../hooks/useDebounce';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// REFUNDS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
// Real refunds queue. The dashboard's "Pending Refunds" card links to /refunds
// and previously hit a placeholder stub — this page replaces it.
//
// Backend: RefundController (mounted at root `/refunds`).
//   GET    /refunds                 → paginated list { data, pagination }
//   PATCH  /refunds/:refundId/process → approve (credits agent wallet for B2B)
//   PATCH  /refunds/:refundId/reject  → reject with reason
// Both write actions are guarded by @Permissions('bookings.refund'), so the
// Approve / Reject buttons are gated on PERMISSIONS.BOOKINGS_REFUND to mirror
// what the server actually enforces.
//
// A Refund document carries: refundId, bookingId (populated → bookingRef),
// userId (populated → name/email), agentId (present ⇒ B2B), bookingAmount,
// cancellationPenalty, refundAmount, status, refundMethod, reason, adminNote.
// ─────────────────────────────────────────────────────────────────────────────

// Refund status → MUI Chip colour mapping. The backend RefundStatus enum
// values are lower-case strings (pending / processing / completed / rejected).
const STATUS_CHIP: Record<string, { color: any; label: string }> = {
  pending:    { color: 'warning', label: 'Pending' },
  processing: { color: 'info',    label: 'Processing' },
  completed:  { color: 'success', label: 'Completed' },
  rejected:   { color: 'error',   label: 'Rejected' },
};

// Small KPI tile shown in the stats strip above the table.
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

export default function RefundsPage() {
  const { can } = useUserContext();
  // The backend process/reject routes both require `bookings.refund` — gate the
  // action buttons on the same permission so the UI never offers an action the
  // server will reject.
  const canManage = can(PERMISSIONS.BOOKINGS_REFUND);

  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  // Debounce search so the API fires ~400ms after typing stops, not per key.
  const debouncedSearch       = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [snack, setSnack]     = useState({ open: false, msg: '', sev: 'success' as any });

  // View-details dialog
  const [selected, setSelected] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Approve / reject dialogs (separate state so one can't clobber the other).
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [approveNote, setApproveNote]     = useState('');
  const [rejectTarget, setRejectTarget]   = useState<any>(null);
  const [rejectReason, setRejectReason]   = useState('');
  const [actioning, setActioning]         = useState(false);

  const showSnack = (msg: string, sev: any = 'success') => setSnack({ open: true, msg, sev });

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      // The backend `getRefunds` filter only supports status/agentId server-side.
      // We still forward `search` so a future server-side search picks it up;
      // until then the field simply narrows nothing harmful.
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const res = await refundsApi.getAll(params);
      // `paginate()` returns { data, pagination: { total, ... } }; some wrappers
      // nest it under res.data.data — unwrap defensively like other admin pages.
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
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

  // ── Approve / process a refund ──────────────────────────────────────────────
  const handleApprove = async () => {
    if (!approveTarget) return;
    setActioning(true);
    try {
      // process() is keyed by the human-readable refundId, not the Mongo _id.
      await refundsApi.process(approveTarget.refundId, approveNote.trim() || undefined);
      showSnack(`Refund ${approveTarget.refundId} processed`);
      setApproveTarget(null);
      setApproveNote('');
      fetchRefunds();
    } catch (e: any) {
      showSnack(e?.response?.data?.message || 'Failed to process refund', 'error');
    } finally {
      setActioning(false);
    }
  };

  // ── Reject a refund ─────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      showSnack('A rejection reason is required', 'error');
      return;
    }
    setActioning(true);
    try {
      await refundsApi.reject(rejectTarget.refundId, reason);
      showSnack(`Refund ${rejectTarget.refundId} rejected`, 'warning');
      setRejectTarget(null);
      setRejectReason('');
      fetchRefunds();
    } catch (e: any) {
      showSnack(e?.response?.data?.message || 'Failed to reject refund', 'error');
    } finally {
      setActioning(false);
    }
  };

  // Derive lightweight stats from the current page of results. The refund
  // backend has no /stats endpoint, so this is an honest "this page" summary
  // rather than a fabricated platform-wide total.
  const pendingCount   = rows.filter((r) => r.status === 'pending').length;
  const completedCount = rows.filter((r) => r.status === 'completed').length;
  const pageRefundSum  = rows.reduce((s, r) => s + (Number(r.refundAmount) || 0), 0);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Refunds Management</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Review, approve and reject refund requests for cancelled bookings
      </Typography>

      {/* Stats strip — summarises the currently loaded page of refunds. */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Pending (this page)" value={loading ? '…' : pendingCount} color="#faad14" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Completed (this page)" value={loading ? '…' : completedCount} color="#52c41a" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            title="Refund value (this page)"
            value={loading ? '…' : `₹${pageRefundSum.toLocaleString('en-IN')}`}
            color="#1677ff"
          />
        </Grid>
      </Grid>

      <MainCard>
        {/* Toolbar — search + status filter + refresh */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Box
            component="form"
            onSubmit={(e) => { e.preventDefault(); fetchRefunds(); }}
            sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 200 }}
          >
            <TextField
              size="small" placeholder="Search by refund / booking ref..." value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
            />
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status" value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchRefunds} size="small"><ReloadOutlined /></IconButton>
          </Tooltip>
        </Box>

        {/* Refunds table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Refund ID</TableCell>
                <TableCell>Booking Ref</TableCell>
                <TableCell>Customer / Agent</TableCell>
                <TableCell>Booking Amount</TableCell>
                <TableCell>Penalty</TableCell>
                <TableCell>Refund Amount</TableCell>
                <TableCell>Reason</TableCell>
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
                    No refund requests found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r: any) => {
                  const s = STATUS_CHIP[r.status] || { label: r.status, color: 'default' };
                  // bookingId is populated by the backend (.populate('bookingId',
                  // 'bookingRef totalAmount')); userId is populated with name/email.
                  const bookingRef = r.bookingId?.bookingRef || (typeof r.bookingId === 'string' ? r.bookingId.slice(-8) : '—');
                  const who = r.userId?.name || r.userId?.email || '—';
                  // agentId present ⇒ this was a B2B booking (refund goes to wallet).
                  const channel = r.agentId ? 'B2B (wallet)' : 'B2C';
                  return (
                    <TableRow key={r._id || r.refundId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary" fontFamily="monospace">
                          {r.refundId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{bookingRef}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{who}</Typography>
                        <Typography variant="caption" color="text.secondary">{channel}</Typography>
                      </TableCell>
                      <TableCell>₹{Number(r.bookingAmount || 0).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color={r.cancellationPenalty ? 'error.main' : 'text.secondary'}>
                          ₹{Number(r.cancellationPenalty || 0).toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700} color="success.dark">
                          ₹{Number(r.refundAmount || 0).toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={r.reason || ''}>
                          <Typography
                            variant="body2"
                            sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {r.reason || '—'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell><Chip label={s.label} color={s.color} size="small" /></TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary"
                              onClick={() => { setSelected(r); setViewOpen(true); }}>
                              <EyeOutlined />
                            </IconButton>
                          </Tooltip>
                          {/* Approve / reject only for PENDING refunds — once a
                              refund is processing/completed/rejected the backend
                              rejects further state changes. */}
                          {canManage && r.status === 'pending' && (
                            <>
                              <Tooltip title="Approve / Process">
                                <IconButton size="small" color="success"
                                  onClick={() => { setApproveTarget(r); setApproveNote(''); }}>
                                  <CheckOutlined />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton size="small" color="error"
                                  onClick={() => { setRejectTarget(r); setRejectReason(''); }}>
                                  <CloseOutlined />
                                </IconButton>
                              </Tooltip>
                            </>
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

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">Total: {total} refunds</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={rows.length < 10} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      {/* ── View Refund dialog ─────────────────────────────────────────────── */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Refund Details — {selected?.refundId}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Grid container spacing={2}>
              {[
                ['Refund ID', selected.refundId],
                ['Booking Ref', selected.bookingId?.bookingRef || '—'],
                ['Customer / User', selected.userId?.name || selected.userId?.email || '—'],
                ['Channel', selected.agentId ? 'B2B (Agent)' : 'B2C (Customer)'],
                ['Booking Amount', `₹${Number(selected.bookingAmount || 0).toLocaleString('en-IN')}`],
                ['Cancellation Penalty', `₹${Number(selected.cancellationPenalty || 0).toLocaleString('en-IN')}`],
                ['Refund Amount', `₹${Number(selected.refundAmount || 0).toLocaleString('en-IN')}`],
                ['Refund Method', selected.refundMethod || '—'],
                ['Status', selected.status],
                ['Reason', selected.reason || '—'],
                ['Admin Note', selected.adminNote || '—'],
                ['Requested', selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-IN') : '—'],
                ['Processed', selected.processedAt ? new Date(selected.processedAt).toLocaleString('en-IN') : '—'],
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

      {/* ── Approve dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!approveTarget} onClose={() => !actioning && setApproveTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Process Refund</DialogTitle>
        <DialogContent>
          {approveTarget && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This will credit <strong>₹{Number(approveTarget.refundAmount || 0).toLocaleString('en-IN')}</strong>
                {approveTarget.agentId ? ' to the agent wallet' : ' via the original payment method'} and
                mark the booking as refunded. This action cannot be undone.
              </Alert>
              <TextField
                fullWidth label="Admin note (optional)" multiline rows={2}
                placeholder="e.g. Approved per cancellation policy"
                value={approveNote} onChange={(e) => setApproveNote(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveTarget(null)} disabled={actioning}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={actioning}>
            {actioning ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Process Refund
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reject dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!rejectTarget} onClose={() => !actioning && setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Refund</DialogTitle>
        <DialogContent>
          {rejectTarget && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Rejecting refund <strong>{rejectTarget.refundId}</strong>. A reason is required and
                will be saved to the audit trail.
              </Typography>
              <TextField
                fullWidth label="Rejection reason" multiline rows={3} autoFocus required
                value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)} disabled={actioning}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject}
            disabled={actioning || !rejectReason.trim()}>
            {actioning ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Reject Refund
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
