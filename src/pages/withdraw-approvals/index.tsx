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
  ClockCircleOutlined, CheckCircleOutlined, StopOutlined, BankOutlined,
} from '@ant-design/icons';
import { withdrawApprovalsApi } from '../../api';
import MainCard from '../../components/MainCard';
import DateRangeFilter, { defaultLast30, DateRangeValue } from '../../components/DateRangeFilter';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

type Status = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'all';

const STATUS_CHIP: Record<string, { color: any; label: string }> = {
  pending:   { color: 'warning', label: 'Pending' },
  approved:  { color: 'info',    label: 'Approved' },
  completed: { color: 'success', label: 'Paid' },
  rejected:  { color: 'error',   label: 'Rejected' },
  cancelled: { color: 'default', label: 'Cancelled' },
};

const fmtINR = (n?: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function StatCard({ icon, title, value, color, subtitle }: any) {
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
          <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
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

export default function WithdrawApprovalsPage() {
  const { can } = useUserContext();
  // Withdraws are real-money outflow — gate on the same wallets.approve
  // permission as topup approvals so finance ops handles both queues with
  // one grant.
  const canApprove = can(PERMISSIONS.WALLETS_APPROVE) || can(PERMISSIONS.WALLETS_DEBIT);
  const canReject  = canApprove;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('pending');
  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultLast30());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  // Approve / reject dialogs
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [approveUtr, setApproveUtr] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actioning, setActioning] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (status !== 'all') params.status = status;
      if (search.trim()) params.search = search.trim();
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to)   params.to   = dateRange.to;
      const res = await withdrawApprovalsApi.list(params);
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setRows(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, search, dateRange]);

  const fetchStats = async () => {
    try {
      const res = await withdrawApprovalsApi.getStats();
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

  // Realtime — refresh queue + counters when a new withdraw request is
  // submitted by an agent, or when the server flags a stats change.
  useEffect(() => {
    const onNewWithdraw = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const name = detail.agentName || detail.agentCode || 'Agent';
      const amount = Number(detail.amount || 0).toLocaleString('en-IN');
      setSnack({ open: true, msg: `New withdraw request: ${name} — ₹${amount}`, sev: 'info' });
      fetchList();
      fetchStats();
    };
    const onStatsRefresh = () => {
      fetchList();
      fetchStats();
    };
    window.addEventListener('admin:withdraw:submitted', onNewWithdraw);
    window.addEventListener('admin:stats:refresh', onStatsRefresh);
    return () => {
      window.removeEventListener('admin:withdraw:submitted', onNewWithdraw);
      window.removeEventListener('admin:stats:refresh', onStatsRefresh);
    };
  }, [fetchList]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    if (!approveUtr.trim()) {
      setSnack({
        open: true,
        msg: 'UTR is required — push the NEFT first, then enter the reference here',
        sev: 'error',
      });
      return;
    }
    setActioning(true);
    try {
      await withdrawApprovalsApi.approve(approveTarget._id, {
        utrNumber: approveUtr.trim(),
        note: approveNote.trim() || undefined,
      });
      setSnack({
        open: true,
        msg: 'Withdraw approved & wallet debited. Agent will be notified.',
        sev: 'success',
      });
      setApproveTarget(null);
      setApproveUtr('');
      setApproveNote('');
      fetchList();
      fetchStats();
    } catch (err: any) {
      setSnack({
        open: true,
        msg: err?.response?.data?.message || 'Approve failed',
        sev: 'error',
      });
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setSnack({
        open: true,
        msg: 'Rejection reason is required',
        sev: 'error',
      });
      return;
    }
    setActioning(true);
    try {
      await withdrawApprovalsApi.reject(rejectTarget._id, {
        reason: rejectReason.trim(),
      });
      setSnack({
        open: true,
        msg: 'Withdraw rejected — funds released back to agent wallet.',
        sev: 'warning',
      });
      setRejectTarget(null);
      setRejectReason('');
      fetchList();
      fetchStats();
    } catch (err: any) {
      setSnack({
        open: true,
        msg: err?.response?.data?.message || 'Reject failed',
        sev: 'error',
      });
    } finally {
      setActioning(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Withdraw Approvals
      </Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Agent cash-out requests — push NEFT to the bank account shown, then
        record the UTR here to debit the agent's wallet.
      </Typography>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<ClockCircleOutlined />}
            title="Pending"
            value={stats?.pending?.count ?? '—'}
            subtitle={fmtINR(stats?.pending?.amount)}
            color="#ed6c02"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<CheckCircleOutlined />}
            title="Paid this Month"
            value={stats?.completedThisMonth?.count ?? '—'}
            subtitle={fmtINR(stats?.completedThisMonth?.amount)}
            color="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<BankOutlined />}
            title="Total Paid"
            value={stats?.completed?.count ?? '—'}
            subtitle={fmtINR(stats?.completed?.amount)}
            color="#1976d2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<StopOutlined />}
            title="Rejected"
            value={stats?.rejected?.count ?? '—'}
            subtitle={fmtINR(stats?.rejected?.amount)}
            color="#c62828"
          />
        </Grid>
      </Grid>

      <MainCard>
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              fetchList();
            }}
            sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 220 }}
          >
            <TextField
              size="small"
              placeholder="Search by agent name / ID / email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="contained" size="small">
              Search
            </Button>
          </Box>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as Status);
                setPage(1);
              }}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Paid</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton
              onClick={() => {
                fetchList();
                fetchStats();
              }}
              size="small"
            >
              <ReloadOutlined />
            </IconButton>
          </Tooltip>
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 2.5,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <DateRangeFilter
            label="Submitted between:"
            value={dateRange}
            onChange={(v) => {
              setDateRange(v);
              setPage(1);
            }}
            onClear={() => {
              setDateRange({ from: '', to: '' });
              setPage(1);
            }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Agent</TableCell>
                <TableCell>Agent ID</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Bank Account</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>UTR / Reason</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      {Array(8)
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
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{ py: 5, color: 'text.secondary' }}
                  >
                    No withdraw requests found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r: any) => {
                  const st = STATUS_CHIP[r.status] || {
                    color: 'default',
                    label: r.status,
                  };
                  const isPending = r.status === 'pending';
                  const bank = r.bankAccount || {};
                  const agent = r.agentId && typeof r.agentId === 'object' ? r.agentId : null;
                  return (
                    <TableRow key={r._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {agent?.contactPerson || agent?.agencyName || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {agent?.email || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {agent?.agentId || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>{fmtINR(r.amount)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {bank.bankName || '—'}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontFamily="monospace"
                          display="block"
                        >
                          A/c {bank.accountNumber || '—'}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontFamily="monospace"
                          display="block"
                        >
                          IFSC {bank.ifsc || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip label={st.label} color={st.color} size="small" />
                      </TableCell>
                      <TableCell>
                        {r.utrNumber && (
                          <Typography variant="caption" fontFamily="monospace">
                            UTR: {r.utrNumber}
                          </Typography>
                        )}
                        {r.rejectionReason && (
                          <Tooltip title={r.rejectionReason}>
                            <Typography
                              variant="caption"
                              color="error"
                              display="block"
                              sx={{
                                maxWidth: 160,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
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
                              <Tooltip title="Approve & mark paid">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => {
                                    setApproveTarget(r);
                                    setApproveUtr('');
                                    setApproveNote('');
                                  }}
                                >
                                  <CheckOutlined />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canReject && (
                              <Tooltip title="Reject (release funds)">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setRejectTarget(r);
                                    setRejectReason('');
                                  }}
                                >
                                  <CloseOutlined />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {r.processedAt
                              ? new Date(r.processedAt).toLocaleDateString('en-IN')
                              : '—'}
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
            Total: {total} requests
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

      {/* Approve dialog */}
      <Dialog
        open={!!approveTarget}
        onClose={() => !actioning && setApproveTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Approve Withdraw & Record UTR</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Push the NEFT FIRST from the owner bank account, then enter the
            UTR below. This will permanently debit the agent's wallet.
          </Alert>
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 1,
              mb: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>
                Pay {fmtINR(approveTarget?.amount)} to{' '}
                {approveTarget?.agentId?.contactPerson ||
                  approveTarget?.agentId?.agencyName ||
                  '—'}
              </strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>A/c Name:</strong> {approveTarget?.bankAccount?.accountName}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>A/c No:</strong>{' '}
              <span style={{ fontFamily: 'monospace' }}>
                {approveTarget?.bankAccount?.accountNumber}
              </span>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>IFSC:</strong>{' '}
              <span style={{ fontFamily: 'monospace' }}>
                {approveTarget?.bankAccount?.ifsc}
              </span>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>Bank:</strong> {approveTarget?.bankAccount?.bankName}
              {approveTarget?.bankAccount?.branch
                ? ` — ${approveTarget?.bankAccount?.branch}`
                : ''}
            </Typography>
          </Box>
          <TextField
            fullWidth
            required
            label="UTR / NEFT Reference Number"
            placeholder="e.g. SBIN23H019341204"
            value={approveUtr}
            onChange={(e) => setApproveUtr(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Note (optional)"
            placeholder="e.g. Paid via SBI corporate net banking"
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveTarget(null)} disabled={actioning}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={actioning || !approveUtr.trim()}
          >
            {actioning ? 'Recording…' : 'Approve & Mark Paid'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        open={!!rejectTarget}
        onClose={() => !actioning && setRejectTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reject Withdraw</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            The held amount ({fmtINR(rejectTarget?.amount)}) will be released
            back to the agent's wallet. They will be notified with this
            reason.
          </Alert>
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="Rejection reason"
            placeholder="e.g. Bank account name doesn't match agency name on file"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)} disabled={actioning}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={actioning || !rejectReason.trim()}
          >
            {actioning ? 'Rejecting…' : 'Reject & Release Funds'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
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
    </Box>
  );
}
