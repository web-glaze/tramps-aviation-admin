import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Avatar, Skeleton, Tooltip, Alert, Snackbar, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { SearchOutlined, EyeOutlined, StopOutlined, ReloadOutlined } from '@ant-design/icons';
import { customersApi } from '../../api';
import MainCard from '../../components/MainCard';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customersApi.getAll({ page, limit: 10, search });
      const d = res.data?.data || res.data;
      setCustomers(d?.customers || d?.items || d || []);
      setTotal(d?.total || 0);
    } catch { setCustomers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, [page]);

  const handleSuspend = async (id: string) => {
    try {
      await customersApi.suspend(id);
      setSnack({ open: true, msg: 'Customer suspended', sev: 'warning' });
      fetchCustomers();
    } catch { setSnack({ open: true, msg: 'Failed', sev: 'error' }); }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Customers (B2C)</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Manage all B2C customers registered on the platform
      </Typography>

      <MainCard>
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); fetchCustomers(); }} sx={{ display: 'flex', gap: 1, flex: 1 }}>
            <TextField
              size="small" placeholder="Search customers..." value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
            />
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>
          <Tooltip title="Refresh"><IconButton onClick={fetchCustomers} size="small"><ReloadOutlined /></IconButton></Tooltip>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Bookings</TableCell>
                <TableCell>Total Spent</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <TableRow key={i}>{Array(8).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>No customers found</TableCell></TableRow>
              ) : (
                customers.map((c: any, i: number) => (
                  <TableRow key={c._id} hover>
                    <TableCell>{(page - 1) * 10 + i + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.light', fontSize: '0.75rem' }}>
                          {(c.name || 'C').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>{c.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{c.phone || '—'}</TableCell>
                    <TableCell>{c.totalBookings || 0}</TableCell>
                    <TableCell>₹{(c.totalSpent || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Chip label={c.isActive !== false ? 'Active' : 'Suspended'} color={c.isActive !== false ? 'success' : 'error'} size="small" />
                    </TableCell>
                    <TableCell>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="View"><IconButton size="small" color="primary" onClick={() => { setSelected(c); setViewOpen(true); }}><EyeOutlined /></IconButton></Tooltip>
                        <Tooltip title="Suspend"><IconButton size="small" color="warning" onClick={() => handleSuspend(c._id)}><StopOutlined /></IconButton></Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">Total: {total}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={customers.length < 10} onClick={() => setPage(p => p + 1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Customer Details</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Grid container spacing={2}>
              {[['Name', selected.name], ['Email', selected.email], ['Phone', selected.phone], ['Status', selected.isActive !== false ? 'Active' : 'Suspended'], ['Total Bookings', selected.totalBookings || 0], ['Total Spent', `₹${(selected.totalSpent || 0).toLocaleString('en-IN')}`], ['Joined', selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-IN') : '—']].map(([l, v]) => (
                <Grid size={6} key={l}>
                  <Typography variant="caption" color="text.secondary">{l}</Typography>
                  <Typography variant="body2" fontWeight={600}>{v || '—'}</Typography>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
