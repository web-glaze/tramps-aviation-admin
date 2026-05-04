import { useState } from 'react';
import {
  Box, Typography, TextField, Button, Grid, FormControl, InputLabel,
  Select, MenuItem, Alert, Snackbar, Card, CardContent,
} from '@mui/material';
import { SendOutlined, BellOutlined } from '@ant-design/icons';
import { notificationsApi } from '../../api';
import MainCard from '../../components/MainCard';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

export default function NotificationsPage() {
  const { can } = useUserContext();
  const canSend = can(PERMISSIONS.NOTIFICATIONS_SEND);

  const [form, setForm] = useState({ title: '', body: '', target: 'all', userType: 'all' });
  const [sending, setSending] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  const handleSend = async () => {
    if (!form.title || !form.body) return;
    setSending(true);
    try {
      await notificationsApi.send(form);
      setSnack({ open: true, msg: 'Notification sent successfully!', sev: 'success' });
      setForm({ title: '', body: '', target: 'all', userType: 'all' });
    } catch {
      setSnack({ open: true, msg: 'Failed to send notification', sev: 'error' });
    } finally {
      setSending(false);
    }
  };

  const templates = [
    { label: 'Booking Confirmed', title: 'Booking Confirmed! ✈️', body: 'Your travel booking has been confirmed. Have a great trip!' },
    { label: 'Promo Alert', title: 'Exclusive Deal Just For You! 🎉', body: 'Use code TRAVEL20 and get 20% off on your next booking.' },
    { label: 'KYC Approved', title: 'KYC Approved ✅', body: 'Your KYC verification is complete. You can now access all agent features.' },
    { label: 'Wallet Credit', title: 'Wallet Credited 💰', body: 'Your travel wallet has been credited. Check your balance now.' },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Send Notifications</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Send push notifications to agents and customers
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <MainCard title="Compose Notification">
            <Grid container spacing={2.5}>
              <Grid size={6}>
                <FormControl fullWidth>
                  <InputLabel>Target Audience</InputLabel>
                  <Select label="Target Audience" value={form.target} onChange={(e) => setForm(f => ({ ...f, target: e.target.value }))}>
                    <MenuItem value="all">All Users</MenuItem>
                    <MenuItem value="agents">Agents Only</MenuItem>
                    <MenuItem value="customers">Customers Only</MenuItem>
                    <MenuItem value="specific">Specific User</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={6}>
                <FormControl fullWidth>
                  <InputLabel>User Type</InputLabel>
                  <Select label="User Type" value={form.userType} onChange={(e) => setForm(f => ({ ...f, userType: e.target.value }))}>
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="b2b">B2B Agents</MenuItem>
                    <MenuItem value="b2c">B2C Customers</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth label="Notification Title" value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Enter notification title..." required
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth label="Notification Body" value={form.body}
                  onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
                  multiline rows={4}
                  placeholder="Enter notification message..." required
                />
              </Grid>
              <Grid size={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={() => setForm({ title: '', body: '', target: 'all', userType: 'all' })}>
                    Clear
                  </Button>
                  <Button
                    variant="contained" startIcon={<SendOutlined />}
                    onClick={handleSend} disabled={!canSend || sending || !form.title || !form.body}
                  >
                    {sending ? 'Sending...' : canSend ? 'Send Notification' : 'No Permission to Send'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </MainCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <MainCard title="Quick Templates">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click a template to auto-fill the form
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {templates.map((t) => (
                <Card
                  key={t.label}
                  elevation={0}
                  onClick={() => setForm(f => ({ ...f, title: t.title, body: t.body }))}
                  sx={{
                    border: '1px solid', borderColor: 'divider', borderRadius: 2, cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lighter', transform: 'translateX(4px)' },
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <BellOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                      <Typography variant="subtitle2" fontWeight={700}>{t.label}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>{t.title}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ opacity: 0.7 }} noWrap>{t.body}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </MainCard>

          {/* Preview */}
          {(form.title || form.body) && (
            <MainCard title="Preview" sx={{ mt: 2.5 }}>
              <Box
                sx={{
                  bgcolor: '#1a1a2e', borderRadius: 3, p: 2, color: 'white',
                  border: '8px solid #333', position: 'relative',
                }}
              >
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✈️</Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.7 }}>TravelAdmin</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.5, ml: 'auto' }}>now</Typography>
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{form.title || 'Notification Title'}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>{form.body || 'Notification message...'}</Typography>
                </Box>
              </Box>
            </MainCard>
          )}
        </Grid>
      </Grid>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
