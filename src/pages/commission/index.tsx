import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Button, IconButton, Tooltip, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
  FormControl, InputLabel, Select, MenuItem, Skeleton,
} from '@mui/material';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { commissionApi } from '../../api';
import MainCard from '../../components/MainCard';

const emptyRule = { name: '', type: 'flight', commissionType: 'percentage', value: '', description: '' };

export default function CommissionPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);
  const [form, setForm] = useState(emptyRule);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await commissionApi.getRules();
      const d = res.data?.data || res.data;
      setRules(d?.rules || d || []);
    } catch { setRules([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRules(); }, []);

  const openCreate = () => { setEditRule(null); setForm(emptyRule); setDialogOpen(true); };
  const openEdit = (rule: any) => { setEditRule(rule); setForm({ name: rule.name, type: rule.type, commissionType: rule.commissionType, value: rule.value, description: rule.description || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editRule) {
        await commissionApi.updateRule(editRule._id, form);
        setSnack({ open: true, msg: 'Commission rule updated', sev: 'success' });
      } else {
        await commissionApi.createRule(form);
        setSnack({ open: true, msg: 'Commission rule created', sev: 'success' });
      }
      setDialogOpen(false);
      fetchRules();
    } catch { setSnack({ open: true, msg: 'Failed to save rule', sev: 'error' }); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this commission rule?')) return;
    try {
      await commissionApi.deleteRule(id);
      setSnack({ open: true, msg: 'Rule deleted', sev: 'warning' });
      fetchRules();
    } catch { setSnack({ open: true, msg: 'Failed to delete', sev: 'error' }); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>Commission Rules</Typography>
          <Typography color="text.secondary" variant="body2">Configure commission rates for agents across different travel products</Typography>
        </Box>
        <Button variant="contained" startIcon={<PlusOutlined />} onClick={openCreate}>Add Rule</Button>
      </Box>

      <MainCard>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Rule Name</TableCell>
                <TableCell>Travel Type</TableCell>
                <TableCell>Commission Type</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <TableRow key={i}>{Array(8).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No commission rules configured yet.</Typography>
                    <Button variant="outlined" startIcon={<PlusOutlined />} onClick={openCreate} sx={{ mt: 1.5 }}>Add First Rule</Button>
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((r: any, i: number) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell><Typography fontWeight={600}>{r.name}</Typography></TableCell>
                    <TableCell>
                      <Chip label={r.type} size="small" color={r.type === 'flight' ? 'primary' : r.type === 'hotel' ? 'success' : 'info'} />
                    </TableCell>
                    <TableCell>
                      <Chip label={r.commissionType} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700} color="primary">
                        {r.commissionType === 'percentage' ? `${r.value}%` : `₹${r.value}`}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.description || '—'}</TableCell>
                    <TableCell>
                      <Chip label={r.isActive !== false ? 'Active' : 'Inactive'} color={r.isActive !== false ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => openEdit(r)}><EditOutlined /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(r._id)}><DeleteOutlined /></IconButton></Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </MainCard>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editRule ? 'Edit Commission Rule' : 'Create Commission Rule'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField fullWidth label="Rule Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Travel Type</InputLabel>
                <Select label="Travel Type" value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
                  <MenuItem value="flight">Flight</MenuItem>
                  <MenuItem value="hotel">Hotel</MenuItem>
                  <MenuItem value="insurance">Insurance</MenuItem>
                  <MenuItem value="all">All</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Commission Type</InputLabel>
                <Select label="Commission Type" value={form.commissionType} onChange={(e) => setForm(f => ({ ...f, commissionType: e.target.value }))}>
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                  <MenuItem value="flat">Flat Amount (₹)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth label={form.commissionType === 'percentage' ? 'Commission Value (%)' : 'Commission Value (₹)'}
                type="number" value={form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))}
                inputProps={{ min: 0, max: form.commissionType === 'percentage' ? 100 : undefined }}
              />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Description (optional)" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} multiline rows={2} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name || !form.value}>
            {editRule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
