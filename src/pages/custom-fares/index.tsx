import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField,
  InputAdornment, Skeleton, Tooltip, Alert, Snackbar, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, FormControl,
  InputLabel, Select, MenuItem, Switch, FormControlLabel, Divider,
  Card, CardContent, Stack,
} from '@mui/material';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  SearchOutlined, CheckCircleOutlined, StopOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { customFaresApi } from '../../api';
import MainCard from '../../components/MainCard';

// ─── Empty form template ───────────────────────────────────────────────────────
const emptyForm = {
  flightNumber: '',
  airline: '',
  origin: '',
  destination: '',
  travelDate: '',
  timing: '',
  fare: '',
  baggage: '30KG',
  cabinClass: 'ECONOMY',
  isNonRefundable: true,
  isNonChangeable: true,
  mode: 'both',
  isActive: true,
  notes: '',
};

// ─── Stats card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, flex: 1 }}>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700} color={color || 'text.primary'}>{value ?? '—'}</Typography>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CustomFaresPage() {
  const [fares, setFares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFare, setEditFare] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Bulk add dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  // Filter
  const [activeFilter, setActiveFilter] = useState('');

  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });
  const showSnack = (msg: string, sev: any = 'success') => setSnack({ open: true, msg, sev });

  // ─── Fetch fares ───────────────────────────────────────────────────────────
  const fetchFares = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (activeFilter !== '') params.isActive = activeFilter;
      const res = await customFaresApi.getAll(params);
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setFares(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch { setFares([]); }
    finally { setLoading(false); }
  };

  // ─── Fetch stats ───────────────────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const res = await customFaresApi.getStats();
      setStats(res.data?.data ?? res.data);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchFares(); }, [page, activeFilter]);
  useEffect(() => { fetchStats(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchFares(); };

  // ─── Open create dialog ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditFare(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  // ─── Open edit dialog ──────────────────────────────────────────────────────
  const openEdit = (fare: any) => {
    setEditFare(fare);
    setForm({
      flightNumber: fare.flightNumber || '',
      airline: fare.airline || '',
      origin: fare.origin || '',
      destination: fare.destination || '',
      travelDate: fare.travelDate || '',
      timing: fare.timing || `${fare.departureTime || ''}-${fare.arrivalTime || ''}`,
      fare: fare.fare || '',
      baggage: fare.baggage || '30KG',
      cabinClass: fare.cabinClass || 'ECONOMY',
      isNonRefundable: fare.isNonRefundable !== false,
      isNonChangeable: fare.isNonChangeable !== false,
      mode: fare.mode || 'both',
      isActive: fare.isActive !== false,
      notes: fare.notes || '',
    });
    setDialogOpen(true);
  };

  // ─── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.flightNumber || !form.origin || !form.destination || !form.travelDate || !form.timing || !form.fare) {
      showSnack('Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, fare: Number(form.fare) };
      if (editFare) {
        await customFaresApi.update(editFare._id, payload);
        showSnack('Fare updated successfully');
      } else {
        await customFaresApi.create(payload);
        showSnack('Fare created successfully');
      }
      setDialogOpen(false);
      fetchFares();
      fetchStats();
    } catch (e: any) {
      showSnack(e?.response?.data?.message || 'Failed to save fare', 'error');
    } finally { setSaving(false); }
  };

  // ─── Toggle active ─────────────────────────────────────────────────────────
  const handleToggle = async (id: string) => {
    try {
      await customFaresApi.toggle(id);
      showSnack('Status updated');
      fetchFares();
      fetchStats();
    } catch { showSnack('Failed to toggle status', 'error'); }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true); };
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await customFaresApi.delete(deleteId);
      showSnack('Fare deleted');
      setDeleteOpen(false);
      fetchFares();
      fetchStats();
    } catch { showSnack('Failed to delete', 'error'); }
  };

  // ─── Bulk add ──────────────────────────────────────────────────────────────
  // Format per line: FLIGHT_NO | ORIGIN | DEST | DATE(YYYY-MM-DD) | TIMING(HH:MM-HH:MM) | FARE | BAGGAGE | AIRLINE
  // Example: IX-191 | ATQ | DXB | 2026-04-21 | 00:15-02:55 | 28700 | 30KG | Air India Express
  const handleBulkSave = async () => {
    const lines = bulkText.trim().split('\n').filter((l) => l.trim());
    if (!lines.length) { showSnack('No data to import', 'error'); return; }

    const faresArr: any[] = [];
    const errors: string[] = [];

    lines.forEach((line, i) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length < 6) { errors.push(`Line ${i + 1}: need at least 6 columns`); return; }
      const [flightNumber, origin, destination, travelDate, timing, fare, baggage, airline] = parts;
      if (!flightNumber || !origin || !destination || !travelDate || !timing || !fare) {
        errors.push(`Line ${i + 1}: missing required field`);
        return;
      }
      faresArr.push({
        flightNumber, origin, destination, travelDate, timing,
        fare: Number(fare),
        baggage: baggage || '30KG',
        airline: airline || '',
        mode: 'both',
        isActive: true,
        isNonRefundable: true,
        isNonChangeable: true,
      });
    });

    if (errors.length) { showSnack(errors[0], 'error'); return; }

    setBulkSaving(true);
    try {
      const res = await customFaresApi.bulkCreate(faresArr);
      showSnack(`Imported ${res.data?.inserted || faresArr.length} fares successfully`);
      setBulkOpen(false);
      setBulkText('');
      fetchFares();
      fetchStats();
    } catch (e: any) {
      showSnack(e?.response?.data?.message || 'Bulk import failed', 'error');
    } finally { setBulkSaving(false); }
  };

  const f = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>✈️ Custom Fares</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Manage B2B special group fares (like screenshots). These show in flight search above TBO/mock data.
      </Typography>

      {/* Stats row */}
      {stats && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <StatCard label="Total Fares" value={stats.total} />
          <StatCard label="Active Fares" value={stats.active} color="success.main" />
          <StatCard label="Sectors" value={stats.sectors} color="primary.main" />
        </Stack>
      )}

      <MainCard>
        {/* Toolbar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 220 }}>
            <TextField
              size="small"
              placeholder="Search sector, flight no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
              sx={{ flex: 1 }}
            />
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton onClick={() => { fetchFares(); fetchStats(); }} size="small"><ReloadOutlined /></IconButton>
          </Tooltip>

          <Button
            variant="outlined" size="small" startIcon={<ThunderboltOutlined />}
            onClick={() => { setBulkText(''); setBulkOpen(true); }}
          >
            Bulk Import
          </Button>

          <Button variant="contained" size="small" startIcon={<PlusOutlined />} onClick={openCreate}>
            Add Fare
          </Button>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Flight</TableCell>
                <TableCell>Sector</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Timing</TableCell>
                <TableCell>Fare (₹)</TableCell>
                <TableCell>Baggage</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(10).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                  </TableRow>
                ))
              ) : fares.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No custom fares found. Click "Add Fare" or "Bulk Import" to add fares from the screenshots.
                  </TableCell>
                </TableRow>
              ) : (
                fares.map((fare: any, i: number) => (
                  <TableRow key={fare._id} hover sx={{ opacity: fare.isActive ? 1 : 0.5 }}>
                    <TableCell>{(page - 1) * 20 + i + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {fare.flightNumber}
                      </Typography>
                      {fare.airline && (
                        <Typography variant="caption" color="text.secondary">{fare.airline}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={fare.sector || `${fare.origin}-${fare.destination}`} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{fare.travelDate}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {fare.timing || `${fare.departureTime || ''}–${fare.arrivalTime || ''}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="success.dark">
                        ₹{Number(fare.fare).toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell>{fare.baggage}</TableCell>
                    <TableCell>
                      <Chip
                        label={fare.mode}
                        size="small"
                        color={fare.mode === 'production' ? 'error' : fare.mode === 'development' ? 'warning' : 'info'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={fare.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={fare.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" color="primary" onClick={() => openEdit(fare)}>
                            <EditOutlined />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={fare.isActive ? 'Deactivate' : 'Activate'}>
                          <IconButton size="small" color={fare.isActive ? 'warning' : 'success'} onClick={() => handleToggle(fare._id)}>
                            {fare.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => confirmDelete(fare._id)}>
                            <DeleteOutlined />
                          </IconButton>
                        </Tooltip>
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
          <Typography variant="body2" color="text.secondary">Total: {total} fares</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={fares.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editFare ? 'Edit Fare' : 'Add New Fare'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {/* Flight Number */}
            <Grid size={6}>
              <TextField
                label="Flight Number *" fullWidth size="small"
                placeholder="e.g. IX-191"
                value={form.flightNumber}
                onChange={(e) => f('flightNumber', e.target.value)}
              />
            </Grid>
            {/* Airline / Agency Label */}
            <Grid size={6}>
              <TextField
                label="Airline / Agency Name" fullWidth size="small"
                placeholder="e.g. Tramps Aviation / Air India"
                value={form.airline}
                onChange={(e) => f('airline', e.target.value)}
                helperText="Apni agency ka naam ya airline naam"
              />
            </Grid>
            {/* Origin */}
            <Grid size={6}>
              <TextField
                label="Origin Code *" fullWidth size="small"
                placeholder="e.g. ATQ"
                value={form.origin}
                onChange={(e) => f('origin', e.target.value.toUpperCase())}
                inputProps={{ maxLength: 3 }}
              />
            </Grid>
            {/* Destination */}
            <Grid size={6}>
              <TextField
                label="Destination Code *" fullWidth size="small"
                placeholder="e.g. DXB"
                value={form.destination}
                onChange={(e) => f('destination', e.target.value.toUpperCase())}
                inputProps={{ maxLength: 3 }}
              />
            </Grid>
            {/* Travel Date */}
            <Grid size={6}>
              <TextField
                label="Travel Date *" fullWidth size="small" type="date"
                value={form.travelDate}
                onChange={(e) => f('travelDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="YYYY-MM-DD format"
              />
            </Grid>
            {/* Timing */}
            <Grid size={6}>
              <TextField
                label="Timing *" fullWidth size="small"
                placeholder="e.g. 00:15-02:55"
                value={form.timing}
                onChange={(e) => f('timing', e.target.value)}
                helperText="Format: HH:MM-HH:MM"
              />
            </Grid>
            {/* Fare */}
            <Grid size={6}>
              <TextField
                label="Fare (₹) *" fullWidth size="small" type="number"
                placeholder="e.g. 28700"
                value={form.fare}
                onChange={(e) => f('fare', e.target.value)}
              />
            </Grid>
            {/* Baggage */}
            <Grid size={6}>
              <TextField
                label="Baggage" fullWidth size="small"
                placeholder="e.g. 30KG"
                value={form.baggage}
                onChange={(e) => f('baggage', e.target.value)}
              />
            </Grid>
            {/* Cabin Class */}
            <Grid size={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Cabin Class</InputLabel>
                <Select label="Cabin Class" value={form.cabinClass} onChange={(e) => f('cabinClass', e.target.value)}>
                  <MenuItem value="ECONOMY">Economy</MenuItem>
                  <MenuItem value="BUSINESS">Business</MenuItem>
                  <MenuItem value="FIRST">First</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* Mode */}
            <Grid size={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Show In</InputLabel>
                <Select label="Show In" value={form.mode} onChange={(e) => f('mode', e.target.value)}>
                  <MenuItem value="both">Both (Dev + Prod)</MenuItem>
                  <MenuItem value="development">Development only</MenuItem>
                  <MenuItem value="production">Production only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* Notes */}
            <Grid size={12}>
              <TextField
                label="Notes" fullWidth size="small" multiline rows={2}
                placeholder="Any special conditions or notes..."
                value={form.notes}
                onChange={(e) => f('notes', e.target.value)}
              />
            </Grid>
            {/* Switches */}
            <Grid size={12}>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={<Switch checked={form.isNonRefundable} onChange={(e) => f('isNonRefundable', e.target.checked)} />}
                  label="Non-Refundable"
                />
                <FormControlLabel
                  control={<Switch checked={form.isNonChangeable} onChange={(e) => f('isNonChangeable', e.target.checked)} />}
                  label="Non-Changeable"
                />
                <FormControlLabel
                  control={<Switch checked={form.isActive} onChange={(e) => f('isActive', e.target.checked)} />}
                  label="Active"
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editFare ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bulk Import Dialog ────────────────────────────────────────────────── */}
      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Bulk Import Fares</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            One fare per line. Format (pipe-separated):<br />
            <strong>FlightNo | Origin | Dest | Date(YYYY-MM-DD) | Timing(HH:MM-HH:MM) | Fare | Baggage | Airline</strong>
          </Alert>
          <Alert icon={false} sx={{ mb: 2, bgcolor: 'grey.100', fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.primary' }}>
            IX-191 | ATQ | DXB | 2026-04-21 | 00:15-02:55 | 28700 | 30KG | Air India Express<br />
            IX-191 | ATQ | DXB | 2026-04-22 | 00:15-02:55 | 28700 | 30KG | Air India Express<br />
            IX-137 | ATQ | SHJ | 2026-04-21 | 13:30-16:05 | 30000 | 30KG | Air India Express<br />
            XJ-231 | DEL | DMK | 2026-05-05 | 20:55-02:40 | 12500 | 20KG | AirAsia
          </Alert>
          <TextField
            label="Paste fare data here"
            fullWidth
            multiline
            rows={12}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="IX-191 | ATQ | DXB | 2026-04-21 | 00:15-02:55 | 28700 | 30KG | Air India Express"
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Lines: {bulkText.trim() ? bulkText.trim().split('\n').filter(l => l.trim()).length : 0}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBulkSave} disabled={bulkSaving || !bulkText.trim()}>
            {bulkSaving ? 'Importing...' : 'Import Fares'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Fare?</DialogTitle>
        <DialogContent>
          <Typography>This action cannot be undone. The fare will be permanently deleted.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ──────────────────────────────────────────────────────────── */}
      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
