import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, Avatar, Skeleton,
  Tooltip, Alert, Snackbar, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, TextField, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { kycApi } from '../../api';
import MainCard from '../../components/MainCard';

export default function KycPage() {
  const [kycs, setKycs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  const fetchKycs = async () => {
    setLoading(true);
    try {
      const res = await kycApi.getAll({ page, limit: 10, status: statusFilter });
      const d = res.data?.data || res.data;
      setKycs(d?.kycs || d?.items || d || []);
    } catch { setKycs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchKycs(); }, [page, statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      await kycApi.approve(id);
      setSnack({ open: true, msg: 'KYC approved! Agent is now active.', sev: 'success' });
      fetchKycs();
    } catch { setSnack({ open: true, msg: 'Failed to approve KYC', sev: 'error' }); }
  };

  const handleReject = async () => {
    try {
      await kycApi.reject(rejectTarget, rejectReason);
      setSnack({ open: true, msg: 'KYC rejected', sev: 'warning' });
      setRejectOpen(false);
      setRejectReason('');
      fetchKycs();
    } catch { setSnack({ open: true, msg: 'Failed to reject KYC', sev: 'error' }); }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>KYC Verification</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Review and verify agent KYC documents
      </Typography>

      <MainCard>
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh"><IconButton onClick={fetchKycs} size="small"><ReloadOutlined /></IconButton></Tooltip>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Agency</TableCell>
                <TableCell>Document Type</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>{Array(7).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : kycs.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>No KYC submissions found</TableCell></TableRow>
              ) : (
                kycs.map((k: any, i: number) => (
                  <TableRow key={k._id} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.light', fontSize: '0.75rem' }}>
                          {(k.agentId?.userId?.name || k.agentName || 'A').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>{k.agentId?.userId?.name || k.agentName || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{k.agentId?.agentId || '—'}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{k.agentId?.agencyName || '—'}</TableCell>
                    <TableCell><Chip label={k.documentType || 'Aadhaar/PAN'} size="small" variant="outlined" /></TableCell>
                    <TableCell>{k.createdAt ? new Date(k.createdAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={k.status || 'pending'}
                        color={k.status === 'approved' ? 'success' : k.status === 'rejected' ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="View Documents">
                          <IconButton size="small" color="primary" onClick={() => { setSelected(k); setViewOpen(true); }}>
                            <EyeOutlined />
                          </IconButton>
                        </Tooltip>
                        {k.status === 'pending' && (
                          <>
                            <Tooltip title="Approve KYC">
                              <IconButton size="small" color="success" onClick={() => handleApprove(k._id)}>
                                <CheckCircleOutlined />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject KYC">
                              <IconButton size="small" color="error" onClick={() => { setRejectTarget(k._id); setRejectOpen(true); }}>
                                <CloseCircleOutlined />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
          <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Button size="small" variant="outlined" disabled={kycs.length < 10} onClick={() => setPage(p => p + 1)}>Next</Button>
        </Box>
      </MainCard>

      {/* View KYC Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>KYC Documents</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Grid container spacing={2}>
              {[
                ['Agent', selected.agentId?.userId?.name || '—'],
                ['Agency', selected.agentId?.agencyName || '—'],
                ['Agent ID', selected.agentId?.agentId || '—'],
                ['Document Type', selected.documentType || '—'],
                ['Status', selected.status],
                ['Submitted', selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-IN') : '—'],
                ['Reject Reason', selected.rejectReason || 'N/A'],
              ].map(([l, v]) => (
                <Grid size={6} key={l}>
                  <Typography variant="caption" color="text.secondary">{l}</Typography>
                  <Typography variant="body2" fontWeight={600}>{v}</Typography>
                </Grid>
              ))}
              {selected.documents?.map((doc: any, i: number) => (
                <Grid size={12} key={i}>
                  <Typography variant="caption" color="text.secondary">Document {i + 1}</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Button size="small" variant="outlined" href={doc.url || doc} target="_blank">
                      View Document
                    </Button>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>Close</Button>
          {selected?.status === 'pending' && (
            <>
              <Button color="error" onClick={() => { setRejectTarget(selected._id); setViewOpen(false); setRejectOpen(true); }}>Reject</Button>
              <Button color="success" variant="contained" onClick={() => { handleApprove(selected._id); setViewOpen(false); }}>Approve</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject KYC</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={3} label="Rejection Reason" value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)} sx={{ mt: 1 }}
            placeholder="Please provide reason for rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleReject} disabled={!rejectReason.trim()}>Reject</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
