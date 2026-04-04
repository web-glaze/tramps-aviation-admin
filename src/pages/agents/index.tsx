import { useEffect, useState } from 'react';
import {
  Box, Grid, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select,
  FormControl, InputLabel, Tooltip, Avatar, Skeleton, CircularProgress,
  Alert, Snackbar,
} from '@mui/material';
import {
  SearchOutlined, EyeOutlined, CheckCircleOutlined, StopOutlined,
  DeleteOutlined, ReloadOutlined, FilterOutlined,
} from '@ant-design/icons';
import { agentsApi } from '../../api';
import MainCard from '../../components/MainCard';

const statusColor: Record<string, any> = {
  active: 'success', suspended: 'error', pending: 'warning', inactive: 'default',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await agentsApi.getAll({ page, limit: 10, search, status: statusFilter });
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setAgents(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchAgents(); };

  const handleApprove = async (id: string) => {
    try {
      await agentsApi.approve(id);
      setSnack({ open: true, msg: 'Agent approved successfully', sev: 'success' });
      fetchAgents();
    } catch { setSnack({ open: true, msg: 'Failed to approve agent', sev: 'error' }); }
  };

  const handleSuspend = async (id: string) => {
    try {
      await agentsApi.suspend(id);
      setSnack({ open: true, msg: 'Agent suspended', sev: 'warning' });
      fetchAgents();
    } catch { setSnack({ open: true, msg: 'Failed to suspend agent', sev: 'error' }); }
  };

  const handleView = async (agent: any) => {
    setSelectedAgent(agent);
    setViewOpen(true);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Agents (B2B)
      </Typography>
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
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment>,
              }}
              sx={{ flex: 1 }}
            />
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton onClick={fetchAgents} size="small">
              <ReloadOutlined />
            </IconButton>
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
                  <TableRow key={i}>
                    {Array(9).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No agents found
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((a: any, i: number) => (
                  <TableRow key={a._id} hover>
                    <TableCell>{(page - 1) * 10 + i + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '0.75rem' }}>
                          {(a.userId?.name || a.name || 'A').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {a.userId?.name || a.name || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {a.userId?.email || a.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{a.agencyName || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" color="primary">
                        {a.agentId || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{a.phone || a.userId?.phone || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        ₹{(a.walletBalance || 0).toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.status || 'pending'}
                        color={statusColor[a.status || 'pending'] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.kycStatus || 'pending'}
                        color={a.kycStatus === 'approved' ? 'success' : a.kycStatus === 'rejected' ? 'error' : 'warning'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" color="primary" onClick={() => handleView(a)}>
                            <EyeOutlined />
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
          <Typography variant="body2" color="text.secondary">
            Total: {total} agents
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button size="small" variant="outlined" disabled={agents.length < 10} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </Box>
        </Box>
      </MainCard>

      {/* View Agent Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Agent Details</DialogTitle>
        <DialogContent dividers>
          {selectedAgent && (
            <Grid container spacing={2}>
              {[
                ['Name', selectedAgent.userId?.name || selectedAgent.name],
                ['Email', selectedAgent.userId?.email || selectedAgent.email],
                ['Agency', selectedAgent.agencyName],
                ['Agent ID', selectedAgent.agentId],
                ['Phone', selectedAgent.phone || selectedAgent.userId?.phone],
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
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
