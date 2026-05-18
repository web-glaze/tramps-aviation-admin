import { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, TextField, Button, Switch, FormControlLabel,
  Alert, Snackbar, Divider, Card, InputAdornment, Stack, Tooltip, Chip,
} from '@mui/material';
import { SaveOutlined, SwapOutlined } from '@ant-design/icons';
import { settingsApi } from '../../api';
import MainCard from '../../components/MainCard';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

// Detect whether we're running in a production build. Used to gate the
// Series row in feature toggles — series mode is dev-only until the
// pipeline is hardened.
const IS_PROD = process.env.NODE_ENV === 'production';

// Products that can have per-product markup / commission toggled by admin.
// Order here drives the rendering order in the "Feature Toggles" card below.
type FeatureProduct = 'flight' | 'hotel' | 'series' | 'insurance';
const FEATURE_PRODUCTS: { key: FeatureProduct; label: string; emoji: string; devOnly?: boolean }[] = [
  { key: 'flight',    label: 'Flights',      emoji: '✈️' },
  { key: 'hotel',     label: 'Hotels',       emoji: '🏨' },
  { key: 'insurance', label: 'Insurance',    emoji: '🛡️' },
  { key: 'series',    label: 'Series Fares', emoji: '🎫', devOnly: true },
];

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
  // ── Per-product feature flags ──────────────────────────────────────────────
  // These two arrays decide which products are "live" for agents in the B2B
  // portal. Anything not in the list is force-disabled — agents see a lock
  // icon on the matching markup row, and search results omit commission for
  // that product.
  markupEnabledProducts:     ['flight', 'hotel', 'insurance', 'series'] as FeatureProduct[],
  commissionEnabledProducts: ['flight', 'hotel', 'insurance', 'series'] as FeatureProduct[],
  // Bank accounts shown on B2B "Make Payment → Bank Transfer" tab. Admin
  // adds entries via the new "Bank Accounts" card on this page; B2B reads
  // them via /admin/public-settings.
  bankAccounts: [] as Array<{
    accountName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    branch?: string;
    upiId?: string;
    isActive?: boolean;
  }>,
};

const defaultPricing = {
  flightMarkup: 2,
  hotelMarkup: 5,
  insuranceMarkup: 10,
  b2bDiscount: 3,
  // Series fare markup — gated off in production (the backend currently
  // disables series mode in prod). Default 0 so existing installs are
  // unaffected.
  seriesMarkup: 0,
};

export default function SettingsPage() {
  const { can } = useUserContext();
  const canEdit = can(PERMISSIONS.SETTINGS_EDIT);

  const [settings, setSettings] = useState<any>(defaultSettings);
  const [pricing, setPricing]   = useState<any>(defaultPricing);
  const [snack, setSnack]       = useState({ open: false, msg: '', sev: 'success' as any });

  useEffect(() => {
    settingsApi.get().then(res => {
      const d = res.data?.data || res.data;
      if (!d) return;
      setSettings((s: any) => ({
        ...s,
        ...d,
        // Settings docs created before the feature-flag schema landed don't
        // have these arrays — fall back to "all enabled" so the admin UI
        // doesn't render empty toggles that would silently disable products.
        markupEnabledProducts:     Array.isArray(d.markupEnabledProducts)
          ? d.markupEnabledProducts
          : s.markupEnabledProducts,
        commissionEnabledProducts: Array.isArray(d.commissionEnabledProducts)
          ? d.commissionEnabledProducts
          : s.commissionEnabledProducts,
      }));
      // seriesMarkupPercent lives on the Settings doc (not on the
      // /admin/pricing endpoint), so fold it into the pricing form state
      // here. Fall back to 0 when the field is missing on older docs.
      if (typeof d.seriesMarkupPercent === 'number') {
        setPricing((p: any) => ({ ...p, seriesMarkup: d.seriesMarkupPercent }));
      }
    }).catch(() => {});

    settingsApi.getPricingRules().then(res => {
      const d = res.data?.data || res.data;
      if (d) setPricing((p: any) => ({ ...p, ...d }));
    }).catch(() => {});
  }, []);

  const set = (key: string, val: any) => setSettings((s: any) => ({ ...s, [key]: val }));

  // ── Feature-flag helpers ─────────────────────────────────────────────────
  // The flag arrays use add/remove rather than a flat boolean per product so
  // we can extend later (e.g. 'cruise', 'visa') without touching the schema.
  const isFeatureOn = (
    field: 'markupEnabledProducts' | 'commissionEnabledProducts',
    product: FeatureProduct,
  ): boolean => {
    const list = settings[field] as FeatureProduct[] | undefined;
    return Array.isArray(list) ? list.includes(product) : true;
  };

  const toggleFeature = (
    field: 'markupEnabledProducts' | 'commissionEnabledProducts',
    product: FeatureProduct,
  ) => {
    setSettings((s: any) => {
      const cur: FeatureProduct[] = Array.isArray(s[field]) ? s[field] : ['flight', 'hotel', 'insurance', 'series'];
      const next = cur.includes(product)
        ? cur.filter((p) => p !== product)
        : [...cur, product];
      return { ...s, [field]: next };
    });
  };

  const handleSaveFeatureFlags = async () => {
    try {
      await settingsApi.update({
        markupEnabledProducts:     settings.markupEnabledProducts,
        commissionEnabledProducts: settings.commissionEnabledProducts,
      });
      setSnack({ open: true, msg: '✅ Feature toggles saved!', sev: 'success' });
    } catch {
      setSnack({ open: true, msg: '❌ Failed to save feature toggles', sev: 'error' });
    }
  };

  const handleSaveGeneral = async () => {
    try {
      await settingsApi.update(settings);
      setSnack({ open: true, msg: '✅ General settings saved!', sev: 'success' });
    } catch { setSnack({ open: true, msg: '❌ Failed to save settings', sev: 'error' }); }
  };

  const handleSavePricing = async () => {
    try {
      await settingsApi.updatePricingRules(pricing);
      // seriesMarkupPercent isn't accepted by the /admin/pricing endpoint —
      // it lives directly on the Settings doc. Persist via /admin/settings
      // so the dev-only field is saved alongside the rest of the markup
      // rules. We only send it in non-prod where the field is editable.
      if (!IS_PROD) {
        await settingsApi.update({
          seriesMarkupPercent: Number(pricing.seriesMarkup) || 0,
        });
      }
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
                <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSaveGeneral} fullWidth disabled={!canEdit}>
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
              <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSaveGeneral} fullWidth disabled={!canEdit}>
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
                <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSaveGeneral} fullWidth disabled={!canEdit}>
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
                <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSaveGeneral} fullWidth disabled={!canEdit}>
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
              {/* Series Markup — dev-only. Series fare pricing is gated off
                  in production builds, so this input is hidden there to
                  avoid the appearance of a setting that has no effect. */}
              {!IS_PROD && (
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="🎫 Series Markup % (Dev only)"
                    type="number"
                    value={p.seriesMarkup ?? 0}
                    onChange={e =>
                      setPricing((f: any) => ({ ...f, seriesMarkup: e.target.value }))
                    }
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    helperText="Active only in development environment. Series fare markup is disabled in production."
                  />
                </Grid>
              )}
              <Grid size={12}>
                <Button variant="contained" color="secondary" startIcon={<SaveOutlined />} onClick={handleSavePricing} fullWidth disabled={!canEdit}>
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

          {/* ── Per-Product Feature Toggles ──────────────────────────────────
              Controls which products allow agents to (a) configure their own
              markup and (b) earn commission. Disabling a product here:
                • locks the matching row in the agent's /b2b/markup page
                • hides the markup banner from the agent's /b2b/<product> search
                • strips commission from search-results decoration server-side
          */}
          <MainCard title="🎯 Per-Product Feature Toggles" sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Decide which products allow agents to configure markup and earn
              commission. Anything turned OFF here disappears for agents in
              real-time — no redeploy required.
            </Typography>

            {/* Header row */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 140px',
                alignItems: 'center',
                px: 2, py: 1,
                bgcolor: 'grey.50',
                borderRadius: 1.5,
                fontWeight: 700,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>PRODUCT</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center' }}>ALLOW MARKUP</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center' }}>ALLOW COMMISSION</Typography>
            </Box>

            {/* Per-product rows */}
            {FEATURE_PRODUCTS.map(({ key, label, emoji, devOnly }) => {
              const markupOn     = isFeatureOn('markupEnabledProducts',     key);
              const commissionOn = isFeatureOn('commissionEnabledProducts', key);
              // Dev-only products are locked in production builds — the
              // backend still accepts them but we don't surface the toggles
              // until the pipeline is fully production-ready.
              const lockedForProd = !!devOnly && IS_PROD;
              const switchesDisabled = !canEdit || lockedForProd;
              const lockTooltip = lockedForProd
                ? `${label} is dev-only — toggles are disabled in production builds.`
                : '';
              const markupSwitch = (
                <Switch
                  checked={markupOn}
                  onChange={() => toggleFeature('markupEnabledProducts', key)}
                  disabled={switchesDisabled}
                  color="primary"
                />
              );
              const commissionSwitch = (
                <Switch
                  checked={commissionOn}
                  onChange={() => toggleFeature('commissionEnabledProducts', key)}
                  disabled={switchesDisabled}
                  color="success"
                />
              );
              return (
                <Box
                  key={key}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 140px',
                    alignItems: 'center',
                    px: 2, py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-of-type': { borderBottom: 'none' },
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {emoji} {label}
                      </Typography>
                      {devOnly && (
                        <Chip
                          label="Dev only"
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {lockedForProd
                        ? 'Locked in production builds'
                        : !markupOn && !commissionOn
                          ? 'Both disabled — agents see no markup row & no commission'
                          : !markupOn
                            ? 'Commission only — agents can\'t mark up'
                            : !commissionOn
                              ? 'Markup only — no commission paid'
                              : 'Fully enabled'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    {lockedForProd
                      ? <Tooltip title={lockTooltip}><span>{markupSwitch}</span></Tooltip>
                      : markupSwitch}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    {lockedForProd
                      ? <Tooltip title={lockTooltip}><span>{commissionSwitch}</span></Tooltip>
                      : commissionSwitch}
                  </Box>
                </Box>
              );
            })}

            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveOutlined />}
                onClick={handleSaveFeatureFlags}
                fullWidth
                disabled={!canEdit}
              >
                Save Feature Toggles
              </Button>
            </Box>

            <Card elevation={0} sx={{ mt: 2, p: 1.5, bgcolor: 'warning.lighter', borderRadius: 2, border: '1px solid', borderColor: 'warning.light' }}>
              <Typography variant="body2" color="warning.dark">
                <strong>⚠️ Effect on agents:</strong> Disabling a product here
                takes effect within ~10 minutes (or on next agent page reload).
                The agent keeps their saved markup value — turning the toggle
                back ON restores it without manual re-entry.
              </Typography>
            </Card>
          </MainCard>

          {/* ── Bank Accounts (admin-managed) ────────────────────────────────
              Pre-fix: bank account / IFSC / UPI ID were hardcoded in the B2B
              source code (`1234567890` / `HDFC0001234` / `tramps@hdfcbank`).
              Now they're admin-managed here and exposed via /admin/public-settings
              so the B2B "Make Payment → Bank Transfer" tab + the Account →
              Bank Accounts page render the live list. */}
          <MainCard title="🏦 Bank Accounts (Wallet Top-up)" sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These accounts appear on the agent's "Make Payment → Bank Transfer"
              tab. Toggle "Active" to hide an account without deleting it.
            </Typography>
            <Stack spacing={2}>
              {(settings.bankAccounts || []).map((acc: any, idx: number) => (
                <Card key={idx} variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid size={{xs:12, md:4, sm:6}}>
                      <TextField
                        size="small" fullWidth label="Account Name"
                        value={acc.accountName || ''}
                        disabled={!canEdit}
                        onChange={(e) => set('bankAccounts',
                          settings.bankAccounts.map((a: any, i: number) =>
                            i === idx ? { ...a, accountName: e.target.value } : a))}
                      />
                    </Grid>
                    <Grid size={{xs:12, md:4, sm:6}}>
                      <TextField
                        size="small" fullWidth label="Account Number"
                        value={acc.accountNumber || ''}
                        disabled={!canEdit}
                        onChange={(e) => set('bankAccounts',
                          settings.bankAccounts.map((a: any, i: number) =>
                            i === idx ? { ...a, accountNumber: e.target.value } : a))}
                      />
                    </Grid>
                    <Grid size={{xs:12, md:4, sm:6}}>
                      <TextField
                        size="small" fullWidth label="IFSC Code"
                        value={acc.ifscCode || ''}
                        disabled={!canEdit}
                        onChange={(e) => set('bankAccounts',
                          settings.bankAccounts.map((a: any, i: number) =>
                            i === idx ? { ...a, ifscCode: e.target.value.toUpperCase() } : a))}
                      />
                    </Grid>
                    <Grid size={{xs:12, md:4, sm:6}}>
                      <TextField
                        size="small" fullWidth label="Bank Name"
                        value={acc.bankName || ''}
                        disabled={!canEdit}
                        onChange={(e) => set('bankAccounts',
                          settings.bankAccounts.map((a: any, i: number) =>
                            i === idx ? { ...a, bankName: e.target.value } : a))}
                      />
                    </Grid>
                    <Grid size={{xs:12, md:4, sm:6}}>
                      <TextField
                        size="small" fullWidth label="Branch (optional)"
                        value={acc.branch || ''}
                        disabled={!canEdit}
                        onChange={(e) => set('bankAccounts',
                          settings.bankAccounts.map((a: any, i: number) =>
                            i === idx ? { ...a, branch: e.target.value } : a))}
                      />
                    </Grid>
                    <Grid size={{xs:12, md:4, sm:6}}>
                      <TextField
                        size="small" fullWidth label="UPI ID (optional)"
                        value={acc.upiId || ''}
                        disabled={!canEdit}
                        onChange={(e) => set('bankAccounts',
                          settings.bankAccounts.map((a: any, i: number) =>
                            i === idx ? { ...a, upiId: e.target.value } : a))}
                      />
                    </Grid>
                    <Grid size={{xs:12, md:4, sm:6}}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={acc.isActive !== false}
                            disabled={!canEdit}
                            onChange={(e) => set('bankAccounts',
                              settings.bankAccounts.map((a: any, i: number) =>
                                i === idx ? { ...a, isActive: e.target.checked } : a))}
                          />
                        }
                        label="Active"
                      />
                    </Grid>
                    <Grid size={{xs:12, md:4, sm:6}} sx={{ textAlign: 'right' }}>
                      <Button
                        size="small" color="error" disabled={!canEdit}
                        onClick={() => set('bankAccounts',
                          settings.bankAccounts.filter((_: any, i: number) => i !== idx))}
                      >
                        Remove
                      </Button>
                    </Grid>
                  </Grid>
                </Card>
              ))}
              <Button
                variant="outlined"
                disabled={!canEdit}
                onClick={() => set('bankAccounts', [
                  ...(settings.bankAccounts || []),
                  { accountName: '', accountNumber: '', ifscCode: '', bankName: '', branch: '', upiId: '', isActive: true },
                ])}
                sx={{ alignSelf: 'flex-start' }}
              >
                + Add Bank Account
              </Button>
              <Box sx={{ pt: 1 }}>
                <Button
                  variant="contained" color="primary" startIcon={<SaveOutlined />}
                  disabled={!canEdit}
                  onClick={async () => {
                    try {
                      await settingsApi.update({ bankAccounts: settings.bankAccounts || [] });
                      setSnack({ open: true, msg: '✅ Bank accounts saved', sev: 'success' });
                    } catch {
                      setSnack({ open: true, msg: '❌ Failed to save bank accounts', sev: 'error' });
                    }
                  }}
                >
                  Save Bank Accounts
                </Button>
              </Box>
            </Stack>
          </MainCard>

        </Grid>

      </Grid>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}