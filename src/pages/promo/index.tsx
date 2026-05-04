import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Button, IconButton, Tooltip, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
  FormControl, InputLabel, Select, MenuItem, Skeleton, Switch, FormControlLabel,
} from '@mui/material';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { promoApi } from '../../api';
import MainCard from '../../components/MainCard';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

const emptyForm = { code: '', discountType: 'percentage', discountValue: '', minBookingAmount: '', maxUsage: '', expiryDate: '', description: '', isActive: true };

export default function PromoPage() {
  const { can } = useUserContext();
  const canCreate = can(PERMISSIONS.PROMOS_CREATE);
  const canEdit   = can(PERMISSIONS.PROMOS_EDIT);
  const canDelete = can(PERMISSIONS.PROMOS_DELETE);

  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPromo, setEditPromo] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const res = await promoApi.getAll();
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setPromos(arr);
    } catch { setPromos([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPromos(); }, []);

  const openCreate = () => { setEditPromo(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setEditPromo(p);
    setForm({ code: p.code, discountType: p.discountType, discountValue: p.discountValue, minBookingAmount: p.minBookingAmount || '', maxUsage: p.maxUsage || '', expiryDate: p.expiryDate ? p.expiryDate.split('T')[0] : '', description: p.description || '', isActive: p.isActive !== false });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editPromo) {
        await promoApi.update(editPromo._id, form);
        setSnack({ open: true, msg: 'Promo updated', sev: 'success' });
      } else {
        await promoApi.create(form);
        setSnack({ open: true, msg: 'Promo created', sev: 'success' });
      }
      setDialogOpen(false);
      fetchPromos();
    } catch { setSnack({ open: true, msg: 'Failed to save promo', sev: 'error' }); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this promo code?')) return;
    try {
      await promoApi.delete(id);
      setSnack({ open: true, msg: 'Promo deleted', sev: 'warning' });
      fetchPromos();
    } catch { setSnack({ open: true, msg: 'Failed to delete', sev: 'error' }); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>Promo Codes</Typography>
          <Typography color="text.secondary" variant="body2">Manage discount and promotional codes for customers</Typography>
        </Box>
        {canCreate && <Button variant="contained" startIcon={<PlusOutlined />} onClick={openCreate}>Create Promo</Button>}
      </Box>

      <MainCard>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Discount</TableCell>
                <TableCell>Min Amount</TableCell>
                <TableCell>Usage</TableCell>
                <TableCell>Expiry</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(4).fill(0).map((_, i) => <TableRow key={i}>{Array(7).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>)
              ) : promos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No promo codes yet.</Typography>
                    {canCreate && <Button variant="outlined" startIcon={<PlusOutlined />} onClick={openCreate} sx={{ mt: 1.5 }}>Create First Promo</Button>}
                  </TableCell>
                </TableRow>
              ) : (
                promos.map((p: any) => (
                  <TableRow key={p._id} hover>
                    <TableCell>
                      <Typography fontWeight={700} fontFamily="monospace" color="primary" fontSize="0.9rem">{p.code}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700}>
                        {p.discountType === 'percentage' ? `${p.discountValue}%` : `₹${p.discountValue}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{p.discountType}</Typography>
                    </TableCell>
                    <TableCell>₹{(p.minBookingAmount || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell>{p.usedCount || 0} / {p.maxUsage || '∞'}</TableCell>
                    <TableCell>{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : 'No Expiry'}</TableCell>
                    <TableCell>
                      <Chip label={p.isActive !== false ? 'Active' : 'Inactive'} color={p.isActive !== false ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        {canEdit   && <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => openEdit(p)}><EditOutlined /></IconButton></Tooltip>}
                        {canDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(p._id)}><DeleteOutlined /></IconButton></Tooltip>}
                        {!canEdit && !canDelete && <Typography variant="caption" color="text.secondary">View only</Typography>}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </MainCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editPromo ? 'Edit Promo Code' : 'Create Promo Code'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField fullWidth label="Promo Code" value={form.code} onChange={(e) => setForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} required inputProps={{ style: { fontFamily: 'monospace', fontWeight: 700 } }} />
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Discount Type</InputLabel>
                <Select label="Discount Type" value={form.discountType} onChange={(e) => setForm((f: any) => ({ ...f, discountType: e.target.value }))}>
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                  <MenuItem value="flat">Flat Amount (₹)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label={form.discountType === 'percentage' ? 'Discount (%)' : 'Discount (₹)'} type="number" value={form.discountValue} onChange={(e) => setForm((f: any) => ({ ...f, discountValue: e.target.value }))} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label="Min Booking Amount (₹)" type="number" value={form.minBookingAmount} onChange={(e) => setForm((f: any) => ({ ...f, minBookingAmount: e.target.value }))} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label="Max Usage (blank = unlimited)" type="number" value={form.maxUsage} onChange={(e) => setForm((f: any) => ({ ...f, maxUsage: e.target.value }))} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label="Expiry Date" type="date" value={form.expiryDate} onChange={(e) => setForm((f: any) => ({ ...f, expiryDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} />} label="Active" />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Description (optional)" value={form.description} onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.code || !form.discountValue}>
            {editPromo ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
