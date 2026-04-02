import { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, TextField, Button, Switch, FormControlLabel,
  Alert, Snackbar, Divider, Card, CardContent, InputAdornment,
} from '@mui/material';
import { SaveOutlined } from '@ant-design/icons';
import { settingsApi } from '../../api';
import MainCard from '../../components/MainCard';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({
    platformName: 'Tramps Aviation',
    supportEmail: 'support@travel.com',
    supportPhone: '+91 9999999999',
    minWalletTopup: 500,
    maxWalletTopup: 500000,
    defaultCurrency: 'INR',
    gstPercent: 18,
    tdsPercent: 5,
    autoKycApproval: false,
    maintenanceMode: false,
  });
  const [pricing, setPricing] = useState<any>({
    flightMarkup: 2,
    hotelMarkup: 5,
    insuranceMarkup: 10,
    b2bDiscount: 3,
  });
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  useEffect(() => {
    settingsApi.get().then(res => {
      const d = res.data?.data || res.data;
      if (d) setSettings((s: any) => ({ ...s, ...d }));
    }).catch(() => {}).finally(() => setLoading(false));

    settingsApi.getPricingRules().then(res => {
      const d = res.data?.data || res.data;
      if (d) setPricing((p: any) => ({ ...p, ...d }));
    }).catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    try {
      await settingsApi.update(settings);
      setSnack({ open: true, msg: 'Settings saved successfully', sev: 'success' });
    } catch { setSnack({ open: true, msg: 'Failed to save settings', sev: 'error' }); }
  };

  const handleSavePricing = async () => {
    try {
      await settingsApi.updatePricingRules(pricing);
      setSnack({ open: true, msg: 'Pricing rules saved', sev: 'success' });
    } catch { setSnack({ open: true, msg: 'Failed to save pricing', sev: 'error' }); }
  };

  const s = settings;
  const p = pricing;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Platform Settings</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>Configure platform-wide settings and pricing rules</Typography>

      <Grid container spacing={3}>
        {/* General Settings */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <MainCard title="General Settings">
            <Grid container spacing={2.5}>
              <Grid size={12}>
                <TextField fullWidth label="Platform Name" value={s.platformName} onChange={(e) => setSettings((f: any) => ({ ...f, platformName: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Support Email" value={s.supportEmail} onChange={(e) => setSettings((f: any) => ({ ...f, supportEmail: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Support Phone" value={s.supportPhone} onChange={(e) => setSettings((f: any) => ({ ...f, supportPhone: e.target.value }))} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="Default Currency" value={s.defaultCurrency} onChange={(e) => setSettings((f: any) => ({ ...f, defaultCurrency: e.target.value }))} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="GST %" type="number" value={s.gstPercent} onChange={(e) => setSettings((f: any) => ({ ...f, gstPercent: e.target.value }))}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
              </Grid>
              <Grid size={12}>
                <Divider sx={{ my: 0.5 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Wallet Limits</Typography>
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="Min Topup (₹)" type="number" value={s.minWalletTopup} onChange={(e) => setSettings((f: any) => ({ ...f, minWalletTopup: e.target.value }))} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="Max Topup (₹)" type="number" value={s.maxWalletTopup} onChange={(e) => setSettings((f: any) => ({ ...f, maxWalletTopup: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <Divider sx={{ my: 0.5 }} />
                <FormControlLabel
                  control={<Switch checked={s.autoKycApproval} onChange={(e) => setSettings((f: any) => ({ ...f, autoKycApproval: e.target.checked }))} />}
                  label="Auto-approve KYC submissions"
                />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={<Switch checked={s.maintenanceMode} color="error" onChange={(e) => setSettings((f: any) => ({ ...f, maintenanceMode: e.target.checked }))} />}
                  label={<Typography color={s.maintenanceMode ? 'error' : 'text.primary'}>Maintenance Mode {s.maintenanceMode ? '(ACTIVE — Users cannot login)' : ''}</Typography>}
                />
              </Grid>
              <Grid size={12}>
                <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSaveSettings} fullWidth>
                  Save General Settings
                </Button>
              </Grid>
            </Grid>
          </MainCard>
        </Grid>

        {/* Pricing Rules */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <MainCard title="Pricing & Markup Rules">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure markup percentages for each travel product type
            </Typography>
            <Grid container spacing={2.5}>
              {[
                { label: 'Flight Markup', key: 'flightMarkup', emoji: '✈️' },
                { label: 'Hotel Markup', key: 'hotelMarkup', emoji: '🏨' },
                { label: 'Insurance Markup', key: 'insuranceMarkup', emoji: '🛡️' },
                { label: 'B2B Agent Discount', key: 'b2bDiscount', emoji: '🤝' },
              ].map(({ label, key, emoji }) => (
                <Grid size={12} key={key}>
                  <TextField
                    fullWidth
                    label={`${emoji} ${label}`}
                    type="number"
                    value={p[key]}
                    onChange={(e) => setPricing((f: any) => ({ ...f, [key]: e.target.value }))}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                  />
                </Grid>
              ))}
              <Grid size={12}>
                <Button variant="contained" color="secondary" startIcon={<SaveOutlined />} onClick={handleSavePricing} fullWidth>
                  Save Pricing Rules
                </Button>
              </Grid>
            </Grid>
          </MainCard>

          {/* Info Card */}
          <Card elevation={0} sx={{ mt: 2.5, border: '1px solid', borderColor: 'info.light', borderRadius: 2, bgcolor: 'info.lighter' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="info.dark" fontWeight={700} gutterBottom>ℹ️ How Markup Works</Typography>
              <Typography variant="body2" color="info.dark" sx={{ opacity: 0.9 }}>
                Markup % is added on top of the supplier cost. For example, a 2% flight markup on ₹10,000 fare → ₹10,200 displayed to B2B agents.
                B2B Discount is deducted from final price for verified agents.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
