import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Skeleton, Tooltip, Alert, Snackbar, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Card, CardContent, Stack, Divider,
} from '@mui/material';
import {
  PlusOutlined, ReloadOutlined, SyncOutlined, CheckCircleOutlined,
  DollarOutlined, ExclamationCircleOutlined, RiseOutlined, EyeOutlined,
  CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import { tboSettlementsApi } from '../../api';
import MainCard from '../../components/MainCard';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

type Status = 'pending' | 'disputed' | 'paid' | 'all';

const STATUS_CHIP: Record<string, { color: any; label: string }> = {
  pending:  { color: 'warning', label: 'Pending' },
  disputed: { color: 'error',   label: 'Disputed' },
  paid:     { color: 'success', label: 'Paid' },
};

const fmtINR = (n?: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function StatCard({ icon, title, value, subtitle, color }: any) {
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
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.1 }}>
            {value ?? '—'}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Create dialog ──────────────────────────────────────────────────────────
function CreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    settlementPeriod: '',
    invoiceNumber: '',
    startDate: '',
    endDate: '',
    totalAmount: '',
    totalCommission: '',
    totalPLB: '',
    notes: '',
    bookingsJson: '',
  });
  const [err, setErr] = useState('');

  const reset = () => {
    setForm({
      settlementPeriod: '',
      invoiceNumber: '',
      startDate: '',
      endDate: '',
      totalAmount: '',
      totalCommission: '',
      totalPLB: '',
      notes: '',
      bookingsJson: '',
    });
    setErr('');
  };

  const submit = async () => {
    setErr('');
    if (!form.settlementPeriod || !form.invoiceNumber || !form.startDate || !form.endDate || !form.totalAmount) {
      setErr('Period, invoice number, dates and total amount are required');
      return;
    }
    // Parse the optional bookings JSON (CSV-style paste also acceptable
    // in a future iteration — for now we ask admins for JSON to keep
    // this controller skinny).
    let bookings: any[] | undefined = undefined;
    if (form.bookingsJson.trim()) {
      try {
        const parsed = JSON.parse(form.bookingsJson);
        if (!Array.isArray(parsed)) throw new Error('not array');
        bookings = parsed;
      } catch {
        setErr('Bookings JSON must be a valid JSON array of {tboBookingId, fare, commission?, plb?}.');
        return;
      }
    }
    setSaving(true);
    try {
      await tboSettlementsApi.create({
        settlementPeriod: form.settlementPeriod.trim(),
        invoiceNumber: form.invoiceNumber.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        totalAmount: Number(form.totalAmount) || 0,
        totalCommission: Number(form.totalCommission) || 0,
        totalPLB: Number(form.totalPLB) || 0,
        notes: form.notes.trim() || undefined,
        bookings,
      });
      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle>New TBO Settlement / Invoice</DialogTitle>
      <DialogContent>
        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              required
              size="small"
              label="Settlement Period (e.g. 2026-W19)"
              value={form.settlementPeriod}
              onChange={(e) =>
                setForm((f) => ({ ...f, settlementPeriod: e.target.value }))
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              required
              size="small"
              label="Invoice Number"
              value={form.invoiceNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, invoiceNumber: e.target.value }))
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              required
              type="date"
              size="small"
              label="Start Date"
              InputLabelProps={{ shrink: true }}
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              required
              type="date"
              size="small"
              label="End Date"
              InputLabelProps={{ shrink: true }}
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              required
              type="number"
              size="small"
              label="Total Amount (TBO billed)"
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              value={form.totalAmount}
              onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              size="small"
              label="Total Commission"
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              value={form.totalCommission}
              onChange={(e) =>
                setForm((f) => ({ ...f, totalCommission: e.target.value }))
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              size="small"
              label="Total PLB"
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              value={form.totalPLB}
              onChange={(e) => setForm((f) => ({ ...f, totalPLB: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              label="Notes"
              multiline
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              label='Bookings (JSON array) — optional, runs auto-reconcile on save'
              placeholder='[{"tboBookingId":"TBO123","fare":12500,"commission":250,"plb":0}]'
              multiline
              rows={4}
              value={form.bookingsJson}
              onChange={(e) =>
                setForm((f) => ({ ...f, bookingsJson: e.target.value }))
              }
              helperText="Paste the invoice line items as JSON. If left empty you can add bookings later & run reconciliation."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Create Settlement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Detail dialog ──────────────────────────────────────────────────────────
function DetailDialog({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [txRef, setTxRef] = useState('');
  const [paidNote, setPaidNote] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await tboSettlementsApi.getOne(id);
      setData(res.data?.data ?? res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const runReconcile = async () => {
    if (!id) return;
    setActing(true);
    try {
      await tboSettlementsApi.reconcile(id);
      setSnack({ open: true, msg: 'Reconciliation complete', sev: 'success' });
      await load();
      onChanged();
    } catch (e: any) {
      setSnack({
        open: true,
        msg: e?.response?.data?.message || 'Reconcile failed',
        sev: 'error',
      });
    } finally {
      setActing(false);
    }
  };

  const markPaid = async () => {
    if (!id) return;
    if (!txRef.trim()) {
      setSnack({ open: true, msg: 'Transaction reference is required', sev: 'error' });
      return;
    }
    setActing(true);
    try {
      await tboSettlementsApi.markPaid(id, {
        transactionRef: txRef.trim(),
        note: paidNote.trim() || undefined,
      });
      setSnack({ open: true, msg: 'Settlement marked paid', sev: 'success' });
      setMarkPaidOpen(false);
      setTxRef('');
      setPaidNote('');
      await load();
      onChanged();
    } catch (e: any) {
      setSnack({
        open: true,
        msg: e?.response?.data?.message || 'Mark paid failed',
        sev: 'error',
      });
    } finally {
      setActing(false);
    }
  };

  if (!id) return null;
  const st = data ? STATUS_CHIP[data.status] : null;
  const recon = data?.reconciliation || {};
  const lines = (data?.bookings || []) as any[];
  const unmatched = lines.filter((b) => !b.matched);

  return (
    <Dialog open={!!id} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <span>Settlement Detail</span>
          {data && (
            <>
              <Typography variant="body2" color="text.secondary">
                · {data.settlementPeriod} · Invoice {data.invoiceNumber}
              </Typography>
              {st && <Chip label={st.label} color={st.color} size="small" />}
            </>
          )}
        </Stack>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={200} />
          </Box>
        ) : !data ? (
          <Alert severity="error">Failed to load settlement</Alert>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Total Amount
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {fmtINR(data.totalAmount)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Commission
                </Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {fmtINR(data.totalCommission)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  PLB
                </Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {fmtINR(data.totalPLB)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Net Payable
                </Typography>
                <Typography variant="h6" fontWeight={700} color="warning.main">
                  {fmtINR(data.netPayable)}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
              <Chip
                label={`Matched: ${recon.matchedCount || 0}`}
                color="success"
                size="small"
                icon={<CheckCircleOutlined />}
              />
              <Chip
                label={`Unmatched: ${recon.unmatchedCount || 0}`}
                color={recon.unmatchedCount ? 'error' : 'default'}
                size="small"
                icon={<ExclamationCircleOutlined />}
              />
              <Chip
                label={`In DB only: ${recon.onlyInDbCount || 0}`}
                color={recon.onlyInDbCount ? 'warning' : 'default'}
                size="small"
              />
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                startIcon={<SyncOutlined />}
                onClick={runReconcile}
                disabled={acting}
              >
                Re-reconcile
              </Button>
              {data.status !== 'paid' && (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<DollarOutlined />}
                  onClick={() => setMarkPaidOpen(true)}
                  disabled={acting}
                >
                  Mark Paid
                </Button>
              )}
            </Stack>

            {recon.unmatchedCount > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {recon.unmatchedCount} invoice line(s) don't match our records.
                Resolve before paying TBO.
              </Alert>
            )}

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Line Items ({lines.length})
            </Typography>
            <TableContainer sx={{ maxHeight: 380 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>TBO Booking ID</TableCell>
                    <TableCell>Our Ref</TableCell>
                    <TableCell align="right">Fare</TableCell>
                    <TableCell align="right">Commission</TableCell>
                    <TableCell align="right">PLB</TableCell>
                    <TableCell>Match</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No line items
                      </TableCell>
                    </TableRow>
                  )}
                  {lines.map((b: any, i: number) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontFamily: 'monospace' }}>
                        {b.tboBookingId}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>
                        {b.bookingRef || '—'}
                      </TableCell>
                      <TableCell align="right">{fmtINR(b.fare)}</TableCell>
                      <TableCell align="right">{fmtINR(b.commission)}</TableCell>
                      <TableCell align="right">{fmtINR(b.plb)}</TableCell>
                      <TableCell>
                        {b.matched ? (
                          <Chip
                            label="Match"
                            color="success"
                            size="small"
                            icon={<CheckOutlined />}
                          />
                        ) : (
                          <Tooltip title={b.mismatchReason || ''}>
                            <Chip
                              label={b.mismatchReason?.split(' ')[0] || 'Issue'}
                              color="error"
                              size="small"
                              icon={<CloseOutlined />}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {unmatched.length > 0 && (
              <>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1 }} color="error">
                  Discrepancies ({unmatched.length})
                </Typography>
                {unmatched.map((b: any, i: number) => (
                  <Box
                    key={i}
                    sx={{
                      p: 1,
                      mb: 0.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'error.light',
                      bgcolor: 'error.lighter',
                    }}
                  >
                    <Typography variant="caption" fontFamily="monospace">
                      {b.tboBookingId} — {b.mismatchReason}
                    </Typography>
                  </Box>
                ))}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Mark paid sub-dialog */}
      <Dialog
        open={markPaidOpen}
        onClose={() => !acting && setMarkPaidOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Mark Paid</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Recording payment of <strong>{fmtINR(data?.netPayable)}</strong> to
            TBO. Push the NEFT first, then enter the reference here.
          </Typography>
          <TextField
            fullWidth
            required
            size="small"
            label="Transaction Reference / UTR"
            value={txRef}
            onChange={(e) => setTxRef(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            size="small"
            label="Note (optional)"
            multiline
            rows={2}
            value={paidNote}
            onChange={(e) => setPaidNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarkPaidOpen(false)} disabled={acting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={markPaid}
            disabled={acting || !txRef.trim()}
          >
            {acting ? 'Saving…' : 'Confirm Paid'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snack.sev}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

export default function TboSettlementsPage() {
  const { can } = useUserContext();
  const canEdit = can(PERMISSIONS.REPORTS_EXPORT);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState<Status>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (status !== 'all') params.status = status;
      const res = await tboSettlementsApi.list(params);
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
      setRows(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  const fetchStats = async () => {
    try {
      const res = await tboSettlementsApi.getStats();
      setStats(res.data?.data ?? res.data);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchList();
  }, [fetchList]);
  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        TBO Settlements
      </Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Weekly TBO invoice reconciliation. The system matches invoice line
        items against our bookings and flags discrepancies before payment.
      </Typography>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<DollarOutlined />}
            title="Pending to TBO"
            value={stats?.pending?.count ?? '—'}
            subtitle={fmtINR(stats?.pending?.netPayable)}
            color="#ed6c02"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<CheckCircleOutlined />}
            title="Paid YTD"
            value={stats?.paidYTD?.count ?? '—'}
            subtitle={fmtINR(stats?.paidYTD?.netPaid)}
            color="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<RiseOutlined />}
            title="Margin %"
            value={`${stats?.marginPercent ?? '0'}%`}
            subtitle={`${fmtINR(stats?.paidYTD?.commissionEarned)} commission + ${fmtINR(stats?.paidYTD?.plbEarned)} PLB`}
            color="#1976d2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<DollarOutlined />}
            title="Booked Volume YTD"
            value={fmtINR(stats?.paidYTD?.totalAmount)}
            subtitle={`Across ${stats?.paidYTD?.count ?? 0} settlements`}
            color="#7b1fa2"
          />
        </Grid>
      </Grid>

      <MainCard>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 2.5,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Stack direction="row" spacing={1}>
            {(['all', 'pending', 'disputed', 'paid'] as Status[]).map((s) => (
              <Chip
                key={s}
                label={s.charAt(0).toUpperCase() + s.slice(1)}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                color={status === s ? 'primary' : 'default'}
                variant={status === s ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={() => {
                fetchList();
                fetchStats();
              }}
            >
              <ReloadOutlined />
            </IconButton>
          </Tooltip>
          {canEdit && (
            <Button
              variant="contained"
              size="small"
              startIcon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              New Settlement
            </Button>
          )}
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell>Invoice #</TableCell>
                <TableCell>Date Range</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Commission</TableCell>
                <TableCell align="right">Net Payable</TableCell>
                <TableCell>Recon</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      {Array(9)
                        .fill(0)
                        .map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No settlements found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r: any) => {
                  const st = STATUS_CHIP[r.status] || { color: 'default', label: r.status };
                  const recon = r.reconciliation || {};
                  return (
                    <TableRow key={r._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {r.settlementPeriod}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {r.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {r.startDate
                            ? new Date(r.startDate).toLocaleDateString('en-IN')
                            : '—'}{' '}
                          –{' '}
                          {r.endDate
                            ? new Date(r.endDate).toLocaleDateString('en-IN')
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{fmtINR(r.totalAmount)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {fmtINR(r.totalCommission)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700}>{fmtINR(r.netPayable)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Matched / unmatched / DB-only">
                            <Box>
                              <Typography variant="caption" color="success.main">
                                {recon.matchedCount || 0}
                              </Typography>
                              {' / '}
                              <Typography
                                variant="caption"
                                color={recon.unmatchedCount ? 'error.main' : 'text.secondary'}
                              >
                                {recon.unmatchedCount || 0}
                              </Typography>
                              {' / '}
                              <Typography
                                variant="caption"
                                color={recon.onlyInDbCount ? 'warning.main' : 'text.secondary'}
                              >
                                {recon.onlyInDbCount || 0}
                              </Typography>
                            </Box>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip label={st.label} color={st.color} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View detail / reconcile / mark paid">
                          <IconButton size="small" onClick={() => setDetailId(r._id)}>
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

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 2,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Total: {total} settlements
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={rows.length < 20}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </Box>
        </Box>
      </MainCard>

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          fetchList();
          fetchStats();
        }}
      />
      <DetailDialog
        id={detailId}
        onClose={() => setDetailId(null)}
        onChanged={() => {
          fetchList();
          fetchStats();
        }}
      />
    </Box>
  );
}
