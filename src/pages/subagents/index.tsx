import { useCallback, useEffect, useState } from 'react';
import {
  Box, Grid, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select,
  FormControl, InputLabel, Tooltip, Avatar, Skeleton, CircularProgress,
  Alert, Snackbar, Link as MuiLink, Divider,
} from '@mui/material';
import {
  SearchOutlined, EyeOutlined, StopOutlined, CheckCircleOutlined,
  ReloadOutlined, FileSearchOutlined, ExportOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { subAgentsApi } from '../../api';
import MainCard from '../../components/MainCard';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

// ─── Types ───────────────────────────────────────────────────────────────────
// Kept narrow — backend returns slightly different shapes depending on populate
// state, so `any` is allowed at the boundaries but feature usage is typed.

interface ParentAgent {
  _id: string;
  agencyName?: string;
  email?: string;
  agentId?: string;
  commissionRate?: number;
  status?: string;
  phone?: string;
  contactPerson?: string;
}

interface SubAgentRow {
  _id: string;
  name: string;
  email: string;
  phone: string;
  designation?: string;
  parentAgentId?: ParentAgent | string | null;
  isActive: boolean;
  status: 'active' | 'suspended' | string;
  totalBookings: number;
  totalSpend?: number;
  suspendReason?: string;
  suspendedAt?: string;
  createdAt?: string;
  permissions?: string[];
}

interface SubAgentDetail extends SubAgentRow {
  bookings?: any[];
  parentAgent?: ParentAgent;
}

const statusColor: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  active: 'success',
  suspended: 'error',
  inactive: 'warning',
};

const bookingStatusColor: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  confirmed: 'success',
  ticketed: 'success',
  cancelled: 'error',
  failed: 'error',
  refunded: 'info',
  partially_refunded: 'info',
  pending: 'warning',
};

const PAGE_SIZE = 20;

export default function SubAgentsPage() {
  const navigate = useNavigate();
  const { can } = useUserContext();
  // Sub-agents are governed by the same agent permissions for now
  const canSuspend = can(PERMISSIONS.AGENTS_SUSPEND);

  const [rows, setRows]                 = useState<SubAgentRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);

  // Detail modal state
  const [detailOpen, setDetailOpen]       = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail]               = useState<SubAgentDetail | null>(null);
  const [detailBookings, setDetailBookings] = useState<any[]>([]);

  // Suspend dialog
  const [suspendTarget, setSuspendTarget] = useState<SubAgentRow | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);

  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' | 'warning' | 'info' }>({
    open: false, msg: '', sev: 'success',
  });
  const showSnack = (msg: string, sev: typeof snack.sev = 'success') =>
    setSnack({ open: true, msg, sev });

  // ── Fetch list ────────────────────────────────────────────────────────────
  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await subAgentsApi.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      const raw = res.data?.data ?? res.data;
      const arr: SubAgentRow[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];
      setRows(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch (e: any) {
      setRows([]);
      setTotal(0);
      showSnack(
        e?.response?.data?.message || 'Failed to load sub-agents',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRows();
  };

  // ── Detail modal ──────────────────────────────────────────────────────────
  const openDetail = async (row: SubAgentRow) => {
    setDetail(row as SubAgentDetail);
    setDetailBookings([]);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const [d, b] = await Promise.all([
        subAgentsApi.getOne(row._id),
        subAgentsApi.getBookings(row._id, { page: 1, limit: 10 }),
      ]);
      const fullDetail = d.data?.data ?? d.data;
      setDetail({ ...row, ...fullDetail });
      const bookingsRaw = b.data?.data ?? b.data;
      const list = Array.isArray(bookingsRaw?.data)
        ? bookingsRaw.data
        : Array.isArray(bookingsRaw)
          ? bookingsRaw
          : [];
      setDetailBookings(list);
    } catch (e: any) {
      showSnack(
        e?.response?.data?.message || 'Failed to load sub-agent details',
        'error',
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Suspend / unsuspend ───────────────────────────────────────────────────
  const handleUnsuspend = async (row: SubAgentRow) => {
    if (!window.confirm(
      `Reactivate ${row.name}? They will regain access to the B2B portal.`,
    )) return;
    try {
      await subAgentsApi.unsuspend(row._id);
      showSnack(`${row.name} reactivated`);
      fetchRows();
    } catch (e: any) {
      showSnack(
        e?.response?.data?.message || 'Failed to reactivate sub-agent',
        'error',
      );
    }
  };

  const confirmSuspend = async () => {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    try {
      await subAgentsApi.suspend(suspendTarget._id, suspendReason || undefined);
      showSnack(`${suspendTarget.name} suspended`, 'warning');
      setSuspendTarget(null);
      setSuspendReason('');
      fetchRows();
    } catch (e: any) {
      showSnack(
        e?.response?.data?.message || 'Failed to suspend sub-agent',
        'error',
      );
    } finally {
      setSuspendLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const parentOf = (row: SubAgentRow): ParentAgent | null => {
    const p = row.parentAgentId;
    if (!p || typeof p === 'string') return null;
    return p;
  };

  const openParentInNewTab = (parent: ParentAgent | null) => {
    if (!parent?._id && !parent?.agentId) return;
    // The agents page filters via the search box. Use agentId (TAHPXXXXX) when
    // available because it's far more readable in the URL than the Mongo _id.
    const query = parent.agentId || parent.email || parent._id;
    window.open(`/agents?search=${encodeURIComponent(String(query))}`, '_blank');
  };

  const viewBookingsForSubAgent = (row: SubAgentRow) => {
    navigate(`/bookings?subAgentId=${row._id}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Sub-Agents</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Sub-agents are sales staff created by master agents under their own account.
        Manage their access and review their activity here.
      </Typography>

      <MainCard>
        {/* Toolbar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Box
            component="form"
            onSubmit={handleSearchSubmit}
            sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 220 }}
          >
            <TextField
              size="small"
              placeholder="Search name, email, phone, or parent agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchOutlined /></InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton onClick={fetchRows} size="small"><ReloadOutlined /></IconButton>
          </Tooltip>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Sub-Agent</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Parent Agent</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Bookings</TableCell>
                <TableCell align="right">Total Spend</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    <FileSearchOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                    No sub-agents found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, i) => {
                  const parent = parentOf(row);
                  const status = row.status || (row.isActive ? 'active' : 'suspended');
                  return (
                    <TableRow key={row._id} hover>
                      <TableCell>{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 32, height: 32,
                              bgcolor: 'primary.light',
                              fontSize: '0.75rem',
                            }}
                          >
                            {(row.name || 'S').charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {row.name || '—'}
                            </Typography>
                            {row.designation && (
                              <Typography variant="caption" color="text.secondary">
                                {row.designation}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{row.email || '—'}</TableCell>
                      <TableCell>{row.phone || '—'}</TableCell>
                      <TableCell>
                        {parent ? (
                          <MuiLink
                            component="button"
                            type="button"
                            underline="hover"
                            onClick={() => openParentInNewTab(parent)}
                            sx={{ textAlign: 'left', cursor: 'pointer' }}
                          >
                            <Typography variant="body2" fontWeight={600}>
                              {parent.agencyName || parent.email || '—'}
                            </Typography>
                            {parent.agentId && (
                              <Typography
                                variant="caption"
                                color="primary"
                                fontFamily="monospace"
                                sx={{ display: 'block' }}
                              >
                                {parent.agentId}
                              </Typography>
                            )}
                          </MuiLink>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleDateString('en-IN')
                          : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {(row.totalBookings || 0).toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          ₹{(row.totalSpend || 0).toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={status}
                          color={statusColor[status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary" onClick={() => openDetail(row)}>
                              <EyeOutlined />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Bookings">
                            <IconButton size="small" onClick={() => viewBookingsForSubAgent(row)}>
                              <ExportOutlined />
                            </IconButton>
                          </Tooltip>
                          {canSuspend && status === 'active' && (
                            <Tooltip title="Suspend">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => { setSuspendTarget(row); setSuspendReason(''); }}
                              >
                                <StopOutlined />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canSuspend && status === 'suspended' && (
                            <Tooltip title="Reactivate">
                              <IconButton size="small" color="success" onClick={() => handleUnsuspend(row)}>
                                <CheckCircleOutlined />
                              </IconButton>
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

        {/* Pagination */}
        <Box
          sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Page {page} of {totalPages} &nbsp;|&nbsp; Total: {total} sub-agents
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </Box>
        </Box>
      </MainCard>

      {/* ── Detail Dialog ──────────────────────────────────────────────────── */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Sub-Agent Details</DialogTitle>
        <DialogContent dividers>
          {detailLoading && !detail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : detail ? (
            <Box>
              <Grid container spacing={2}>
                {[
                  ['Name', detail.name],
                  ['Email', detail.email],
                  ['Phone', detail.phone],
                  ['Designation', detail.designation || '—'],
                  ['Status', detail.status || (detail.isActive ? 'active' : 'suspended')],
                  ['Total Bookings', String(detail.totalBookings ?? 0)],
                  ['Total Spend', `₹${(detail.totalSpend || 0).toLocaleString('en-IN')}`],
                  ['Created', detail.createdAt ? new Date(detail.createdAt).toLocaleString('en-IN') : '—'],
                ].map(([label, val]) => (
                  <Grid size={6} key={label}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{val || '—'}</Typography>
                  </Grid>
                ))}

                {detail.permissions && detail.permissions.length > 0 && (
                  <Grid size={12}>
                    <Typography variant="caption" color="text.secondary">Permissions</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {detail.permissions.map((p: string) => (
                        <Chip key={p} label={p} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                )}

                {detail.suspendReason && (
                  <Grid size={12}>
                    <Alert severity="warning">
                      <Typography variant="body2">
                        <strong>Suspended:</strong> {detail.suspendReason}
                      </Typography>
                      {detail.suspendedAt && (
                        <Typography variant="caption" color="text.secondary">
                          on {new Date(detail.suspendedAt).toLocaleString('en-IN')}
                        </Typography>
                      )}
                    </Alert>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Parent agent */}
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Parent Agent
              </Typography>
              {(() => {
                const parent = parentOf(detail);
                if (!parent) {
                  return (
                    <Typography variant="body2" color="text.secondary">
                      Parent agent information not available.
                    </Typography>
                  );
                }
                return (
                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">Agency</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {parent.agencyName || '—'}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">Agent ID</Typography>
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace" color="primary">
                        {parent.agentId || '—'}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">Email</Typography>
                      <Typography variant="body2">{parent.email || '—'}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">Commission %</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {parent.commissionRate != null ? `${parent.commissionRate}%` : '—'}
                      </Typography>
                    </Grid>
                    <Grid size={12}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openParentInNewTab(parent)}
                      >
                        Open parent agent in new tab
                      </Button>
                    </Grid>
                  </Grid>
                );
              })()}

              <Divider sx={{ my: 2 }} />

              {/* Last 10 bookings */}
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Recent Bookings (last 10)
              </Typography>
              {detailLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : detailBookings.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No bookings attributed to this sub-agent yet.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Ref</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailBookings.map((b: any) => (
                        <TableRow key={b._id || b.bookingRef} hover>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {b.bookingRef || (b._id ? String(b._id).slice(-8) : '—')}
                            </Typography>
                          </TableCell>
                          <TableCell>{b.bookingType || b.type || '—'}</TableCell>
                          <TableCell>
                            {b.createdAt
                              ? new Date(b.createdAt).toLocaleDateString('en-IN')
                              : '—'}
                          </TableCell>
                          <TableCell align="right">
                            ₹{((b.fare?.customerFare ?? b.fare?.totalFare ?? 0)).toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={b.status || 'pending'}
                              color={bookingStatusColor[b.status] || 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {detail && (
            <Button onClick={() => viewBookingsForSubAgent(detail)}>
              View All Bookings
            </Button>
          )}
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Suspend Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={!!suspendTarget}
        onClose={() => !suspendLoading && setSuspendTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Suspend Sub-Agent</DialogTitle>
        <DialogContent>
          {suspendTarget && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>{suspendTarget.name}</strong> ({suspendTarget.email}) will be locked
                out of the B2B portal immediately. They can be reactivated at any time.
              </Alert>
              <TextField
                fullWidth
                label="Reason (optional)"
                placeholder="e.g. Policy violation, account review..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                multiline
                rows={3}
                autoFocus
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSuspendTarget(null)}
            disabled={suspendLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={confirmSuspend}
            disabled={suspendLoading}
            startIcon={
              suspendLoading
                ? <CircularProgress size={16} color="inherit" />
                : <StopOutlined />
            }
          >
            Suspend
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
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
