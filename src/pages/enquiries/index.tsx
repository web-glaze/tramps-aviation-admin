import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Chip, Button, IconButton, TextField, Select, MenuItem,
  FormControl, InputLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Snackbar, CircularProgress, Grid,
  Skeleton, InputAdornment, Tooltip, Divider,
} from '@mui/material';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined, DeleteOutlined,
  SendOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import apiClient from '../../api';
import MainCard from '../../components/MainCard';
import useDebounce from '../../hooks/useDebounce';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

const contactApi = {
  getAll:   (p: any)   => apiClient.get('/contact/admin/enquiries', { params: p }),
  getOne:   (id: string) => apiClient.get(`/contact/admin/enquiries/${id}`),
  update:   (id: string, d: any) => apiClient.patch(`/contact/admin/enquiries/${id}`, d),
  reply:    (id: string, d: any) => apiClient.post(`/contact/admin/enquiries/${id}/reply`, d),
  delete:   (id: string) => apiClient.delete(`/contact/admin/enquiries/${id}`),
  unread:   ()           => apiClient.get('/contact/admin/enquiries/unread-count'),
};

const STATUS_COLOR: Record<string, any> = {
  new: 'error', in_progress: 'warning', resolved: 'success', closed: 'default',
};
const TYPE_LABEL: Record<string, string> = {
  general: '💬 General', booking_help: '✈️ Booking Help', refund: '💰 Refund',
  agent_support: '🤝 Agent Support', complaint: '⚠️ Complaint',
  partnership: '🏢 Partnership', other: '📋 Other',
};
const USER_TYPE_COLOR: Record<string, any> = {
  customer: 'primary', agent: 'secondary', visitor: 'default',
};

export default function EnquiriesPage() {
  const { can } = useUserContext();
  const canEdit = can(PERMISSIONS.CONTENT_ENQUIRIES_EDIT);

  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [stats, setStats]         = useState<any>({});
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  // Debounce search so the API fires ~400ms after typing stops, not per key.
  const debouncedSearch           = useDebounce(search, 400);
  const [statusF, setStatusF]     = useState('');
  const [typeF, setTypeF]         = useState('');
  const [selected, setSelected]   = useState<any>(null);
  const [viewOpen, setViewOpen]   = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying]   = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [snack, setSnack]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contactApi.getAll({ page, limit: 15, status: statusF, type: typeF, search: debouncedSearch });
      const d   = res.data?.data || res.data;
      setRows(Array.isArray(d?.data) ? d.data : []);
      setTotal(d?.pagination?.total || 0);
      if (d?.stats) setStats(d.stats);
    } catch { setRows([]); } finally { setLoading(false); }
  }, [page, statusF, typeF, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const handleView = async (row: any) => {
    try {
      const res = await contactApi.getOne(row._id);
      setSelected(res.data?.data || res.data);
      setAdminNote((res.data?.data || res.data).adminNote || '');
      setReplyText('');
      setViewOpen(true);
    } catch {}
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await contactApi.update(id, { status });
    setSnack(`✅ Status updated to ${status}`);
    load();
    if (selected?._id === id) setSelected((s: any) => s ? { ...s, status } : s);
  };

  const handleSaveNote = async () => {
    if (!selected) return;
    await contactApi.update(selected._id, { adminNote });
    setSnack('✅ Note saved');
    setSelected((s: any) => s ? { ...s, adminNote } : s);
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    try {
      await contactApi.reply(selected._id, { message: replyText, adminName: 'Support Team' });
      setSnack('✅ Reply sent via email!');
      setReplyText('');
      handleUpdateStatus(selected._id, 'in_progress');
    } catch { setSnack('❌ Failed to send reply'); }
    finally { setReplying(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this enquiry?')) return;
    await contactApi.delete(id);
    setSnack('Deleted');
    setViewOpen(false);
    load();
  };

  const totalNew = stats.new || 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h4" fontWeight={700}>
          📩 Enquiries & Contact
        </Typography>
        {totalNew > 0 && <Chip label={`${totalNew} New`} color="error" size="small" />}
      </Box>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        All customer, agent and visitor enquiries submitted via the website
      </Typography>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'New',         key: 'new',         color: '#ef4444' },
          { label: 'In Progress', key: 'in_progress', color: '#f59e0b' },
          { label: 'Resolved',    key: 'resolved',    color: '#10b981' },
          { label: 'Closed',      key: 'closed',      color: '#6b7280' },
        ].map(s => (
          <Grid size={{ xs: 6, md: 3 }} key={s.key}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center',
              cursor: 'pointer', bgcolor: statusF === s.key ? `${s.color}15` : 'transparent',
              borderLeftColor: s.color, borderLeftWidth: 3,
            }} onClick={() => setStatusF(statusF === s.key ? '' : s.key)}>
              <Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>{stats[s.key] || 0}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <MainCard>
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <TextField size="small" placeholder="Search name, email, subject..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 200 }} />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={typeF} onChange={e => setTypeF(e.target.value)}>
              <MenuItem value="">All Types</MenuItem>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={statusF} onChange={e => setStatusF(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh"><IconButton onClick={load} size="small"><ReloadOutlined /></IconButton></Tooltip>
        </Box>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                {['Name / Contact', 'Subject', 'Type', 'User', 'Status', 'Date', 'Actions'].map(h => (
                  <TableCell key={h}><b>{h}</b></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? Array(6).fill(0).map((_, i) => (
                <TableRow key={i}>{Array(7).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
              )) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  No enquiries found
                </TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r._id} hover sx={{ opacity: r.isRead ? 0.85 : 1, fontWeight: r.isRead ? 'normal' : 'bold' }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={r.isRead ? 400 : 700}>{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.email}</Typography>
                    {r.phone && <Typography variant="caption" color="text.secondary" display="block">{r.phone}</Typography>}
                    {r.agentId && <Chip label={r.agentId} size="small" variant="outlined" sx={{ mt: 0.25, height: 16, fontSize: '10px' }} />}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {!r.isRead && <span style={{ color: '#ef4444', marginRight: 4 }}>●</span>}{r.subject}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography variant="caption">{TYPE_LABEL[r.type] || r.type}</Typography></TableCell>
                  <TableCell><Chip label={r.userType} size="small" color={USER_TYPE_COLOR[r.userType] || 'default'} variant="outlined" /></TableCell>
                  <TableCell><Chip label={r.status?.replace('_', ' ')} size="small" color={STATUS_COLOR[r.status] || 'default'} /></TableCell>
                  <TableCell><Typography variant="caption">{new Date(r.createdAt).toLocaleDateString('en-IN')}</Typography></TableCell>
                  <TableCell>
                    <Tooltip title="View & Reply">
                      <IconButton size="small" color="primary" onClick={() => handleView(r)}><EyeOutlined /></IconButton>
                    </Tooltip>
                    {canEdit && (
                      <Tooltip title="Mark Resolved">
                        <IconButton size="small" color="success" onClick={() => handleUpdateStatus(r._id, 'resolved')}>
                          <CheckCircleOutlined />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canEdit && (
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(r._id)}>
                          <DeleteOutlined />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">Total: {total} enquiries</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={rows.length < 15} onClick={() => setPage(p => p + 1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      {/* Detail / Reply Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography fontWeight={700}>📩 Enquiry Details</Typography>
            {selected && <Typography variant="caption" color="text.secondary">Ref: #{String(selected._id).slice(-8).toUpperCase()}</Typography>}
          </Box>
          {selected && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {['new','in_progress','resolved','closed'].map(s => (
                <Chip key={s} label={s.replace('_',' ')} size="small"
                  color={STATUS_COLOR[s]} variant={selected.status === s ? 'filled' : 'outlined'}
                  onClick={() => canEdit && handleUpdateStatus(selected._id, s)}
                  sx={{ cursor: canEdit ? 'pointer' : 'default' }} />
              ))}
            </Box>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Grid container spacing={2.5}>
              {/* Left: enquiry info */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, mb: 2 }}>
                  <Grid container spacing={1.5}>
                    {[
                      ['Name', selected.name], ['Email', selected.email],
                      ['Phone', selected.phone || '—'], ['User Type', selected.userType],
                      ['Type', TYPE_LABEL[selected.type] || selected.type],
                      ['Agent ID', selected.agentId || '—'],
                      ['Booking Ref', selected.bookingRef || '—'],
                      ['Submitted', new Date(selected.createdAt).toLocaleString('en-IN')],
                    ].map(([k, v]) => (
                      <Grid size={6} key={k}>
                        <Typography variant="caption" color="text.secondary">{k}</Typography>
                        <Typography variant="body2" fontWeight={600}>{v}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Subject</Typography>
                <Typography variant="body1" fontWeight={600} sx={{ mb: 1.5 }}>{selected.subject}</Typography>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Message</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {selected.message}
                </Typography>
              </Grid>

              {/* Right: reply + note */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>📧 Reply via Email</Typography>
                <TextField fullWidth multiline rows={5} placeholder="Type your reply here..."
                  value={replyText} onChange={e => setReplyText(e.target.value)} sx={{ mb: 1 }}
                  disabled={!canEdit} />
                <Button fullWidth variant="contained" startIcon={replying ? undefined : <SendOutlined />}
                  disabled={!canEdit || !replyText.trim() || replying} onClick={handleReply}>
                  {replying ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null} Send Reply
                </Button>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight={700} gutterBottom>📝 Internal Note</Typography>
                <TextField fullWidth multiline rows={3} placeholder="Add internal note (not sent to user)..."
                  value={adminNote} onChange={e => setAdminNote(e.target.value)} sx={{ mb: 1 }}
                  disabled={!canEdit} />
                {canEdit && <Button fullWidth variant="outlined" onClick={handleSaveNote}>Save Note</Button>}

                {selected.resolvedAt && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Resolved on {new Date(selected.resolvedAt).toLocaleDateString('en-IN')}
                    {selected.resolvedBy && ` by ${selected.resolvedBy}`}
                  </Alert>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {canEdit && (
            <Button color="error" startIcon={<DeleteOutlined />} onClick={() => selected && handleDelete(selected._id)}>
              Delete
            </Button>
          )}
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')}
        message={snack} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} />
    </Box>
  );
}