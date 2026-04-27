import { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, TextField, Button, Switch, FormControlLabel,
  Alert, Snackbar, Divider, Card, InputAdornment,
} from '@mui/material';
import { SaveOutlined, SwapOutlined } from '@ant-design/icons';
import { settingsApi } from '../../api';
import MainCard from '../../components/MainCard';

const defaultSettings = {
  platformName: 'Tramps Aviation',
  platformTagline: 'B2B & B2C Travel Platform',
  platformDescription: "India's premier travel booking platform. Best prices on flights, hotels and insurance for travelers & travel agents.",
  footerCopyright: 'Tramps Aviation India Pvt. Ltd. All rights reserved. | IATA Accredited | RBI Licensed',
  supportEmail: 'support@trampsaviation.com',
  supportPhone: '',
  supportPhoneDisplay: '1800-001-2345 (Toll Free)',
  minWalletTopup: 500,
  maxWalletTopup: 500000,
  defaultCurrency: 'INR',
  gstPercent: 18,
  autoKycApproval: false,
  maintenanceMode: false,
  socialFacebook: '',
  socialTwitter: '',
  socialInstagram: '',
  socialLinkedin: '',
  socialYoutube: '',
  socialWhatsapp: '',
  agentIdPrefix: 'TAHP',
  agentIdDigits: 5,
  // Address
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  gstNumber: '',
  panNumber: '',
  cinNumber: '',
};

const defaultPricing = {
  flightMarkup: 2,
  hotelMarkup: 5,
  insuranceMarkup: 10,
  b2bDiscount: 3,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(defaultSettings);
  const [pricing, setPricing]   = useState<any>(defaultPricing);
  const [snack, setSnack]       = useState({ open: false, msg: '', sev: 'success' as any });

  useEffect(() => {
    settingsApi.get().then(res => {
      const d = res.data?.data || res.data;
      if (d) setSettings((s: any) => ({ ...s, ...d }));
    }).catch(() => {});

    settingsApi.getPricingRules().then(res => {
      const d = res.data?.data || res.data;
      if (d) setPricing((p: any) => ({ ...p, ...d }));
    }).catch(() => {});
  }, []);

  const set = (key: string, val: any) => setSettings((s: any) => ({ ...s, [key]: val }));

  const handleSaveGeneral = async () => {
    try {
      await settingsApi.update(settings);
      setSnack({ open: true, msg: '✅ General settings saved!', sev: 'success' });
    } catch { setSnack({ open: true, msg: '❌ Failed to save settings', sev: 'error' }); }
  };

  const handleSavePricing = async () => {
    try {
      await settingsApi.updatePricingRules(pricing);
      setSnack({ open: true, msg: '✅ Pricing rules saved!', sev: 'success' });
    } catch { setSnack({ open: true, msg: '❌ Failed to save pricing', sev: 'error' }); }
  };

  const s = settings;
  const p = pricing;
  const previewId = `${s.agentIdPrefix || 'TAHP'}${'1'.padStart(s.agentIdDigits || 5, '0')}`;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Platform Settings</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Configure platform-wide settings, branding, social links and pricing rules.
        Popular Routes ko manage karne ke liye jaiye&nbsp;
        <strong>Homepage Content → 🌟 Popular Content → 🗺️ Popular Routes tab</strong>
      </Typography>

      <Grid container spacing={3}>

        {/* ── COLUMN 1 ───────────────────────────────────────────────────────── */}
        <Grid size={{ xs: 12, lg: 6 }}>

          {/* General Settings */}
          <MainCard title="⚙️ General Settings">
            <Grid container spacing={2.5}>
              <Grid size={12}>
                <TextField fullWidth label="Platform Name" value={s.platformName}
                  onChange={e => set('platformName', e.target.value)} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Platform Tagline" placeholder="B2B & B2C Travel Platform"
                  value={s.platformTagline} onChange={e => set('platformTagline', e.target.value)} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth multiline rows={2} label="Platform Description (Footer)"
                  placeholder="India's premier travel booking platform..."
                  value={s.platformDescription} onChange={e => set('platformDescription', e.target.value)} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth multiline rows={2} label="Footer Copyright Text"
                  placeholder="Tramps Aviation India Pvt. Ltd. All rights reserved."
                  value={s.footerCopyright} onChange={e => set('footerCopyright', e.target.value)} />
              </Grid>

              <Grid size={12}><Divider><Typography variant="caption" color="text.secondary">Contact Info</Typography></Divider></Grid>

              <Grid size={12}>
                <TextField fullWidth label="Support Email" value={s.supportEmail}
                  onChange={e => set('supportEmail', e.target.value)} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="Support Phone (actual number)" placeholder="+911800001234"
                  value={s.supportPhone} onChange={e => set('supportPhone', e.target.value)} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="Phone Display Text" placeholder="1800-001-2345 (Toll Free)"
                  value={s.supportPhoneDisplay} onChange={e => set('supportPhoneDisplay', e.target.value)} />
              </Grid>

              <Grid size={6}>
                <TextField fullWidth label="Default Currency" value={s.defaultCurrency}
                  onChange={e => set('defaultCurrency', e.target.value)} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="GST %" type="number" value={s.gstPercent}
                  onChange={e => set('gstPercent', e.target.value)}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
              </Grid>

              <Grid size={12}><Divider><Typography variant="caption" color="text.secondary">Wallet Limits</Typography></Divider></Grid>
              <Grid size={6}>
                <TextField fullWidth label="Min Topup (₹)" type="number" value={s.minWalletTopup}
                  onChange={e => set('minWalletTopup', e.target.value)} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="Max Topup (₹)" type="number" value={s.maxWalletTopup}
                  onChange={e => set('maxWalletTopup', e.target.value)} />
              </Grid>

              <Grid size={12}><Divider sx={{ my: 0.5 }} /></Grid>

              <Grid size={12}>
                <FormControlLabel
                  control={<Switch checked={s.autoKycApproval} onChange={e => set('autoKycApproval', e.target.checked)} />}
                  label="Auto-approve KYC submissions" />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={<Switch checked={s.maintenanceMode} color="error" onChange={e => set('maintenanceMode', e.target.checked)} />}
                  label={
                    <Typography color={s.maintenanceMode ? 'error' : 'text.primary'}>
                      Maintenance Mode {s.maintenanceMode ? '(ACTIVE — Users cannot login)' : ''}
                    </Typography>
                  } />
              </Grid>
              <Grid size={12}>
                <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSaveGeneral} fullWidth>
                  Save General Settings
                </Button>
              </Grid>
            </Grid>
          </MainCard>

          {/* Agent ID Format */}
          <MainCard title="🪪 Agent Registration ID Format" sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              New agents get IDs like <strong>{previewId}</strong>,{' '}
              <strong>{`${s.agentIdPrefix || 'TAHP'}${'2'.padStart(s.agentIdDigits || 5, '0')}`}</strong>, etc.
            </Typography>
            <Grid container spacing={2.5} alignItems="center">
              <Grid size={5}>
                <TextField fullWidth label="ID Prefix" placeholder="TAHP" value={s.agentIdPrefix}
                  inputProps={{ maxLength: 10, style: { textTransform: 'uppercase' } }}
                  onChange={e => set('agentIdPrefix', e.target.value.toUpperCase())}
                  helperText="e.g. TAHP, AGT, TRV" />
              </Grid>
              <Grid size={2} sx={{ textAlign: 'center' }}>
                <SwapOutlined style={{ fontSize: 20, color: '#aaa' }} />
              </Grid>
              <Grid size={5}>
                <TextField fullWidth label="Number of Digits" type="number" value={s.agentIdDigits}
                  inputProps={{ min: 3, max: 8 }}
                  onChange={e => set('agentIdDigits', parseInt(e.target.value) || 5)}
                  helperText="3–8 digits" />
              </Grid>
            </Grid>
            <Card elevation={0} sx={{ mt: 2, p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2, border: '1px solid', borderColor: 'primary.light' }}>
              <Typography variant="body2" color="primary.dark">
                <strong>Preview:</strong>&nbsp;
                {previewId} → {`${s.agentIdPrefix || 'TAHP'}${'2'.padStart(s.agentIdDigits || 5, '0')}`} → {`${s.agentIdPrefix || 'TAHP'}${'100'.padStart(s.agentIdDigits || 5, '0')}`}
              </Typography>
            </Card>
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSaveGeneral} fullWidth>
                Save ID Format
              </Button>
            </Box>
          </MainCard>

          {/* Company Address */}
          <MainCard title="🏢 Company Address & Details" sx={{ mt: 3 }}>
            <Grid container spacing={2.5}>
              <Grid size={12}>
                <TextField fullWidth label="Address Line 1" placeholder="Shop No. / Floor / Building Name"
                  value={s.addressLine1 || ''} onChange={e => set('addressLine1', e.target.value)} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Address Line 2" placeholder="Street / Area / Locality"
                  value={s.addressLine2 || ''} onChange={e => set('addressLine2', e.target.value)} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="City" value={s.city || ''} onChange={e => set('city', e.target.value)} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="State" value={s.state || ''} onChange={e => set('state', e.target.value)} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="Pincode" value={s.pincode || ''} onChange={e => set('pincode', e.target.value)} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="Country" value={s.country || 'India'} onChange={e => set('country', e.target.value)} />
              </Grid>
              <Grid size={12}><Divider><Typography variant="caption" color="text.secondary">Tax & Registration</Typography></Divider></Grid>
              <Grid size={4}>
                <TextField fullWidth label="GST Number" placeholder="22AAAAA0000A1Z5"
                  value={s.gstNumber || ''} onChange={e => set('gstNumber', e.target.value.toUpperCase())}
                  inputProps={{ style: { textTransform: 'uppercase' } }} />
              </Grid>
              <Grid size={4}>
                <TextField fullWidth label="PAN Number" placeholder="AAAAA9999A"
                  value={s.panNumber || ''} onChange={e => set('panNumber', e.target.value.toUpperCase())}
                  inputProps={{ style: { textTransform: 'uppercase' } }} />
              </Grid>
              <Grid size={4}>
                <TextField fullWidth label="CIN Number" placeholder="U74999XX0000PTC000000"
                  value={s.cinNumber || ''} onChange={e => set('cinNumber', e.target.value.toUpperCase())} />
              </Grid>
              <Grid size={12}>
                <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSaveGeneral} fullWidth>
                  Save Address & Details
                </Button>
              </Grid>
            </Grid>
          </MainCard>

        </Grid>

        {/* ── COLUMN 2 ───────────────────────────────────────────────────────── */}
        <Grid size={{ xs: 12, lg: 6 }}>

          {/* Social Media Links */}
          <MainCard title="📱 Social Media Links">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These URLs appear as clickable icons in the website footer. Leave blank to hide.
            </Typography>
            <Grid container spacing={2}>
              {[
                { key: 'socialFacebook',  label: '📘 Facebook',    placeholder: 'https://facebook.com/trampsaviation' },
                { key: 'socialTwitter',   label: '🐦 Twitter / X', placeholder: 'https://twitter.com/trampsaviation' },
                { key: 'socialInstagram', label: '📸 Instagram',   placeholder: 'https://instagram.com/trampsaviation' },
                { key: 'socialLinkedin',  label: '💼 LinkedIn',    placeholder: 'https://linkedin.com/company/trampsaviation' },
                { key: 'socialYoutube',   label: '▶️ YouTube',    placeholder: 'https://youtube.com/@trampsaviation' },
                { key: 'socialWhatsapp',  label: '💬 WhatsApp',    placeholder: 'https://wa.me/911800001234' },
              ].map(({ key, label, placeholder }) => (
                <Grid size={12} key={key}>
                  <TextField fullWidth label={label} placeholder={placeholder}
                    value={s[key] || ''} onChange={e => set(key, e.target.value)} />
                </Grid>
              ))}
              <Grid size={12}>
                <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSaveGeneral} fullWidth>
                  Save Social Links
                </Button>
              </Grid>
            </Grid>
          </MainCard>

          {/* Pricing Rules */}
          <MainCard title="💰 Pricing & Markup Rules" sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure markup percentages for each travel product type
            </Typography>
            <Grid container spacing={2.5}>
              {[
                { label: 'Flight Markup',      key: 'flightMarkup',    emoji: '✈️' },
                { label: 'Hotel Markup',       key: 'hotelMarkup',     emoji: '🏨' },
                { label: 'Insurance Markup',   key: 'insuranceMarkup', emoji: '🛡️' },
                { label: 'B2B Agent Discount', key: 'b2bDiscount',     emoji: '🤝' },
              ].map(({ label, key, emoji }) => (
                <Grid size={12} key={key}>
                  <TextField fullWidth label={`${emoji} ${label}`} type="number"
                    value={p[key]}
                    onChange={e => setPricing((f: any) => ({ ...f, [key]: e.target.value }))}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    inputProps={{ min: 0, max: 100, step: 0.1 }} />
                </Grid>
              ))}
              <Grid size={12}>
                <Button variant="contained" color="secondary" startIcon={<SaveOutlined />} onClick={handleSavePricing} fullWidth>
                  Save Pricing Rules
                </Button>
              </Grid>
            </Grid>
            <Card elevation={0} sx={{ mt: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 2, border: '1px solid', borderColor: 'info.light' }}>
              <Typography variant="body2" color="info.dark">
                <strong>ℹ️ How Markup Works:</strong> Markup % is added on top of supplier cost.
                E.g. 2% flight markup on ₹10,000 fare → ₹10,200 shown to B2B agents.
                B2B Discount is deducted from final price for verified agents.
              </Typography>
            </Card>
          </MainCard>

        </Grid>

      </Grid>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}