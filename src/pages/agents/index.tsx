import { useEffect, useState } from 'react';
import {
  Box, Grid, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select,
  FormControl, InputLabel, Tooltip, Avatar, Skeleton, CircularProgress,
  Alert, Snackbar, Divider,
} from '@mui/material';
import {
  SearchOutlined, EyeOutlined, CheckCircleOutlined, StopOutlined,
  DeleteOutlined, ReloadOutlined, WalletOutlined,
} from '@ant-design/icons';
import { agentsApi } from '../../api';
import MainCard from '../../components/MainCard';

const statusColor: Record<string, any> = {
  active: 'success', suspended: 'error', pending: 'warning', inactive: 'warning',
};

export default function AgentsPage() {
  const [agents, setAgents]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [viewOpen, setViewOpen]       = useState(false);
  const [snack, setSnack]             = useState({ open: false, msg: '', sev: 'success' as any });

  // ── Wallet Credit dialog state ──────────────────────────────────────────────
  const [walletAgent, setWalletAgent]   = useState<any>(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletNote, setWalletNote]     = useState('');
  const [walletLoading, setWalletLoading] = useState(false);

  const showSnack = (msg: string, sev: any = 'success') => setSnack({ open: true, msg, sev });

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await agentsApi.getAll({ page, limit: 10, search, status: statusFilter });
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setAgents(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch { setAgents([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, [page, statusFilter]);
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchAgents(); };

  const handleApprove = async (id: string) => {
    try { await agentsApi.approve(id); showSnack('Agent approved successfully'); fetchAgents(); }
    catch { showSnack('Failed to approve agent', 'error'); }
  };

  const handleSuspend = async (id: string) => {
    try { await agentsApi.suspend(id); showSnack('Agent suspended', 'warning'); fetchAgents(); }
    catch { showSnack('Failed to suspend agent', 'error'); }
  };

  // ── Wallet Credit ───────────────────────────────────────────────────────────
  const openWalletCredit = (agent: any) => {
    setWalletAgent(agent);
    setWalletAmount('');
    setWalletNote('');
  };

  const handleWalletCredit = async () => {
    if (!walletAgent || !walletAmount || Number(walletAmount) <= 0) return;
    setWalletLoading(true);
    try {
      await agentsApi.walletCredit(walletAgent.agentId || walletAgent.id || walletAgent._id, Number(walletAmount), walletNote || 'Admin manual credit');
      showSnack(`✅ ₹${Number(walletAmount).toLocaleString('en-IN')} credited to ${walletAgent.contactPerson || walletAgent.agencyName}'s wallet`);
      setWalletAgent(null);
      fetchAgents();
    } catch (e: any) {
      showSnack(e?.response?.data?.message || 'Failed to credit wallet', 'error');
    } finally { setWalletLoading(false); }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Agents (B2B)</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Manage all registered travel agents on the platform
      </Typography>

      <MainCard>
        {/* Toolbar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 200 }}>
            <TextField
              size="small"
              placeholder="Search by name, email, agent ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
              sx={{ flex: 1 }}
            />
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive / Pending</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAgents} size="small"><ReloadOutlined /></IconButton>
          </Tooltip>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Agency</TableCell>
                <TableCell>Agent ID</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Wallet</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>KYC</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <TableRow key={i}>{Array(9).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>No agents found</TableCell>
                </TableRow>
              ) : (
                agents.map((a: any, i: number) => (
                  <TableRow key={a._id} hover>
                    <TableCell>{(page - 1) * 10 + i + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '0.75rem' }}>
                          {(a.contactPerson || a.userId?.name || a.name || 'A').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {a.contactPerson || a.userId?.name || a.name || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{a.email || a.userId?.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{a.agencyName || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" color="primary">{a.agentId || '—'}</Typography>
                    </TableCell>
                    <TableCell>{a.phone || a.userId?.phone || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        ₹{(a.walletBalance || 0).toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={a.status || 'pending'} color={statusColor[a.status || 'pending'] || 'default'} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={a.kycStatus || 'pending'}
                        color={a.kycStatus === 'approved' ? 'success' : a.kycStatus === 'rejected' ? 'error' : 'warning'}
                        size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" color="primary" onClick={() => { setSelectedAgent(a); setViewOpen(true); }}>
                            <EyeOutlined />
                          </IconButton>
                        </Tooltip>
                        {/* 💰 Wallet Credit button */}
                        <Tooltip title="Credit Wallet">
                          <IconButton size="small" color="success" onClick={() => openWalletCredit(a)}>
                            <WalletOutlined />
                          </IconButton>
                        </Tooltip>
                        {a.status !== 'active' && (
                          <Tooltip title="Approve">
                            <IconButton size="small" color="success" onClick={() => handleApprove(a._id)}>
                              <CheckCircleOutlined />
                            </IconButton>
                          </Tooltip>
                        )}
                        {a.status === 'active' && (
                          <Tooltip title="Suspend">
                            <IconButton size="small" color="warning" onClick={() => handleSuspend(a._id)}>
                              <StopOutlined />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">Total: {total} agents</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={agents.length < 10} onClick={() => setPage(p => p + 1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      {/* ── View Agent Dialog ─────────────────────────────────────────────── */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Agent Details</DialogTitle>
        <DialogContent dividers>
          {selectedAgent && (
            <Grid container spacing={2}>
              {[
                ['Name', selectedAgent.contactPerson || selectedAgent.userId?.name || selectedAgent.name],
                ['Email', selectedAgent.email || selectedAgent.userId?.email],
                ['Agency', selectedAgent.agencyName],
                ['Agent ID', selectedAgent.agentId],
                ['Phone', selectedAgent.phone],
                ['Status', selectedAgent.status],
                ['KYC Status', selectedAgent.kycStatus],
                ['Wallet Balance', `₹${(selectedAgent.walletBalance || 0).toLocaleString('en-IN')}`],
                ['Commission %', `${selectedAgent.commissionRate || 0}%`],
                ['Joined', selectedAgent.createdAt ? new Date(selectedAgent.createdAt).toLocaleDateString('en-IN') : '—'],
              ].map(([label, val]) => (
                <Grid size={6} key={label}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" fontWeight={600}>{val || '—'}</Typography>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedAgent && (
            <Button color="success" startIcon={<WalletOutlined />} onClick={() => { setViewOpen(false); openWalletCredit(selectedAgent); }}>
              Credit Wallet
            </Button>
          )}
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Wallet Credit Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!walletAgent} onClose={() => setWalletAgent(null)} maxWidth="xs" fullWidth>
        <DialogTitle>💰 Credit Wallet</DialogTitle>
        <DialogContent>
          {walletAgent && (
            <Box>
              <Box sx={{ p: 1.5, bgcolor: 'success.lighter', borderRadius: 2, mb: 2.5, border: '1px solid', borderColor: 'success.light' }}>
                <Typography variant="subtitle2" fontWeight={700} color="success.dark">
                  {walletAgent.contactPerson || walletAgent.agencyName}
                </Typography>
                <Typography variant="caption" color="success.dark">
                  {walletAgent.agentId} &nbsp;|&nbsp; Current Balance: ₹{(walletAgent.walletBalance || 0).toLocaleString('en-IN')}
                </Typography>
              </Box>
              <TextField
                fullWidth label="Amount to Credit (₹)" type="number"
                value={walletAmount}
                onChange={e => setWalletAmount(e.target.value)}
                inputProps={{ min: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                sx={{ mb: 2 }}
                autoFocus
              />
              <TextField
                fullWidth label="Note / Reason (optional)"
                placeholder="e.g. Bonus credit, Refund adjustment..."
                value={walletNote}
                onChange={e => setWalletNote(e.target.value)}
                multiline rows={2}
              />
              {walletAmount && Number(walletAmount) > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  New balance after credit: <strong>₹{((walletAgent.walletBalance || 0) + Number(walletAmount)).toLocaleString('en-IN')}</strong>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWalletAgent(null)}>Cancel</Button>
          <Button
            variant="contained" color="success"
            disabled={!walletAmount || Number(walletAmount) <= 0 || walletLoading}
            onClick={handleWalletCredit}
          >
            {walletLoading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Credit ₹{Number(walletAmount || 0).toLocaleString('en-IN')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}