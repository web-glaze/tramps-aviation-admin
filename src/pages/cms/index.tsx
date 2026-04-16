import { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Tabs, Tab, Button, TextField, Switch,
  FormControlLabel, Alert, Snackbar, CircularProgress,
  Card, CardContent, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid,
} from '@mui/material';
import {
  SaveOutlined, ReloadOutlined, PlusOutlined,
  DeleteOutlined, EyeOutlined, SettingOutlined,
} from '@ant-design/icons';
import { cmsApi } from '../../api';
import MainCard from '../../components/MainCard';

// ── Predefined page slugs & labels ────────────────────────────────────────────
const PRESET_PAGES = [
  { slug: 'privacy',  label: '🔒 Privacy Policy',      desc: 'How you collect/use user data' },
  { slug: 'terms',    label: '📄 Terms & Conditions',   desc: 'Rules for using the platform' },
  { slug: 'refund',   label: '💰 Refund Policy',        desc: 'Cancellation and refund rules' },
  { slug: 'faq',      label: '❓ FAQs',                 desc: 'Frequently asked questions' },
  { slug: 'about',    label: '🏢 About Us',             desc: 'Company info and mission' },
];

// ── Simple Rich Text Toolbar ──────────────────────────────────────────────────
function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync value → DOM only when it changes from outside (e.g. page switch)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
  };

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const toolbarBtns = [
    { label: 'B',  title: 'Bold',          action: () => exec('bold'),          style: { fontWeight: 800 } },
    { label: 'I',  title: 'Italic',        action: () => exec('italic'),         style: { fontStyle: 'italic' } },
    { label: 'U',  title: 'Underline',     action: () => exec('underline'),      style: { textDecoration: 'underline' } },
    { label: 'H1', title: 'Heading 1',     action: () => exec('formatBlock', 'h1') },
    { label: 'H2', title: 'Heading 2',     action: () => exec('formatBlock', 'h2') },
    { label: 'H3', title: 'Heading 3',     action: () => exec('formatBlock', 'h3') },
    { label: 'P',  title: 'Paragraph',     action: () => exec('formatBlock', 'p') },
    { label: '• List', title: 'Bullet List', action: () => exec('insertUnorderedList') },
    { label: '1. List', title: 'Numbered List', action: () => exec('insertOrderedList') },
    { label: '🔗', title: 'Insert Link',   action: () => {
      const url = prompt('Enter URL:');
      if (url) exec('createLink', url);
    }},
    { label: '—',  title: 'Horizontal Rule', action: () => exec('insertHorizontalRule') },
  ];

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
        {toolbarBtns.map(btn => (
          <Button
            key={btn.title} size="small" variant="outlined" title={btn.title}
            onClick={btn.action}
            sx={{ minWidth: 40, px: 1, py: 0.25, fontSize: '12px', ...btn.style }}
          >
            {btn.label}
          </Button>
        ))}
      </Box>
      {/* Editable area */}
      <Box
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        sx={{
          minHeight: 400, p: 2.5, outline: 'none',
          fontSize: '14px', lineHeight: 1.7,
          '& h1': { fontSize: '1.8rem', fontWeight: 700, my: 1.5 },
          '& h2': { fontSize: '1.4rem', fontWeight: 700, my: 1.2 },
          '& h3': { fontSize: '1.15rem', fontWeight: 600, my: 1 },
          '& p':  { my: 0.8 },
          '& ul, & ol': { pl: 3, my: 0.5 },
          '& li': { mb: 0.25 },
          '& a':  { color: '#208dcb', textDecoration: 'underline' },
          '& table': { borderCollapse: 'collapse', width: '100%', my: 1 },
          '& td, & th': { border: '1px solid #ddd', p: '6px 8px' },
          '& strong': { fontWeight: 700 },
          '& hr': { my: 1.5, border: 'none', borderTop: '1px solid #ddd' },
        }}
      />
    </Box>
  );
}

// ── Page Editor ───────────────────────────────────────────────────────────────
function PageEditor({ slug, onSaved }: { slug: string; onSaved: (msg: string) => void }) {
  const [page, setPage]     = useState<any>({ slug, title: '', content: '', isPublished: true, metaTitle: '', metaDescription: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setLoading(true);
    cmsApi.getPage(slug)
      .then(res => { const d = res.data?.data || res.data; if (d) setPage(d); })
      .catch(() => {}) // page may not exist yet
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await cmsApi.upsert(slug, page);
      onSaved(`✅ "${page.title || slug}" saved successfully!`);
    } catch (e: any) {
      onSaved('❌ Failed to save: ' + (e?.response?.data?.message || 'Error'));
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {PRESET_PAGES.find(p => p.slug === slug)?.label || slug}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Public URL: <code style={{ background: '#f0f0f0', padding: '1px 4px', borderRadius: 3 }}>/{slug}</code>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={page.isPublished} onChange={e => setPage((p: any) => ({ ...p, isPublished: e.target.checked }))} />}
            label={<Typography variant="body2">{page.isPublished ? '🟢 Published' : '⚫ Draft'}</Typography>}
          />
          <Button size="small" variant="outlined" startIcon={<EyeOutlined />} onClick={() => setPreview(!preview)}>
            {preview ? 'Edit' : 'Preview'}
          </Button>
          <Button variant="contained" startIcon={saving ? undefined : <SaveOutlined />} onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null} Save
          </Button>
        </Box>
      </Box>

      {/* Meta fields */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={12}>
          <TextField fullWidth label="Page Title" value={page.title || ''}
            onChange={e => setPage((p: any) => ({ ...p, title: e.target.value }))} />
        </Grid>
        <Grid size={6}>
          <TextField fullWidth label="Meta Title (SEO)" value={page.metaTitle || ''}
            onChange={e => setPage((p: any) => ({ ...p, metaTitle: e.target.value }))} />
        </Grid>
        <Grid size={6}>
          <TextField fullWidth label="Meta Description (SEO)" value={page.metaDescription || ''}
            onChange={e => setPage((p: any) => ({ ...p, metaDescription: e.target.value }))} />
        </Grid>
      </Grid>

      {/* Preview or Editor */}
      {preview ? (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3, minHeight: 400, bgcolor: 'background.paper' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Preview (as seen on website)</Typography>
          <div dangerouslySetInnerHTML={{ __html: page.content || '' }} style={{ lineHeight: 1.7, fontSize: 14 }} />
        </Box>
      ) : (
        <RichEditor
          value={page.content || ''}
          onChange={content => setPage((p: any) => ({ ...p, content }))}
        />
      )}

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" size="large" startIcon={saving ? undefined : <SaveOutlined />} onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null} Save Changes
        </Button>
      </Box>
    </Box>
  );
}

// ── Custom Page Dialog ────────────────────────────────────────────────────────
function NewPageDialog({ open, onClose, onCreated }: any) {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');

  const handleCreate = () => {
    if (!slug.trim()) return;
    onCreated(slug.toLowerCase().replace(/\s+/g, '-'), title);
    setSlug(''); setTitle('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>➕ New Custom Page</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField fullWidth label="Page Slug" placeholder="e.g. cookie-policy"
          value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          helperText={`URL will be: /${slug || 'your-slug'}`} sx={{ mb: 2 }} />
        <TextField fullWidth label="Page Title" placeholder="e.g. Cookie Policy"
          value={title} onChange={e => setTitle(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!slug.trim()}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main CMS Page ─────────────────────────────────────────────────────────────
export default function CmsPage() {
  const [pages, setPages]         = useState<any[]>([]);
  const [activeSlug, setActiveSlug] = useState('privacy');
  const [snack, setSnack]         = useState('');
  const [seeding, setSeeding]     = useState(false);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [customSlugs, setCustomSlugs] = useState<string[]>([]);

  const loadPages = async () => {
    try {
      const res = await cmsApi.getAll();
      const d   = res.data?.data || res.data;
      const arr = Array.isArray(d) ? d : [];
      setPages(arr);
      // Collect custom slugs (not in PRESET_PAGES)
      const presets = PRESET_PAGES.map(p => p.slug);
      setCustomSlugs(arr.filter((p: any) => !presets.includes(p.slug)).map((p: any) => p.slug));
    } catch {}
  };

  useEffect(() => { loadPages(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await cmsApi.seed();
      setSnack('✅ Default pages seeded! Switch tabs to edit them.');
      loadPages();
    } catch { setSnack('❌ Seed failed'); }
    finally { setSeeding(false); }
  };

  const allTabs = [
    ...PRESET_PAGES,
    ...customSlugs.map(s => ({ slug: s, label: `📝 ${s}`, desc: 'Custom page' })),
  ];

  const activeTab = allTabs.findIndex(t => t.slug === activeSlug);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>📋 CMS — Pages & Policies</Typography>
        <Typography color="text.secondary" variant="body2">
          Manage all legal and informational pages. Changes reflect on the website immediately after saving.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }} icon={false}>
          💡 First time? Click <strong>"Load Default Content"</strong> to pre-fill all pages with professional travel-industry content.
          You can then edit any section to match your company details.
        </Alert>
      </Box>

      <MainCard
        title="Page Manager"
        secondary={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<PlusOutlined />} onClick={() => setNewPageOpen(true)}>
              New Page
            </Button>
            <Button size="small" variant="outlined" startIcon={<ReloadOutlined />} disabled={seeding} onClick={handleSeed}>
              {seeding ? <CircularProgress size={14} sx={{ mr: 0.5 }} /> : null}
              Load Default Content
            </Button>
          </Box>
        }
      >
        <Tabs
          value={activeTab < 0 ? 0 : activeTab}
          onChange={(_, i) => setActiveSlug(allTabs[i]?.slug || 'privacy')}
          variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 3 }}
        >
          {allTabs.map(t => (
            <Tab
              key={t.slug} label={t.label}
              iconPosition="end"
              icon={pages.find((p: any) => p.slug === t.slug)
                ? <Chip label="✓" size="small" color="success" sx={{ height: 16, fontSize: '10px', ml: 0.5 }} />
                : <Chip label="empty" size="small" variant="outlined" sx={{ height: 16, fontSize: '10px', ml: 0.5 }} />
              }
            />
          ))}
        </Tabs>

        <PageEditor key={activeSlug} slug={activeSlug} onSaved={msg => { setSnack(msg); loadPages(); }} />
      </MainCard>

      <NewPageDialog
        open={newPageOpen}
        onClose={() => setNewPageOpen(false)}
        onCreated={(slug: string, title: string) => {
          setCustomSlugs(s => [...s, slug]);
          setActiveSlug(slug);
          setNewPageOpen(false);
          setSnack(`✅ New page "${slug}" ready — add content and save!`);
        }}
      />

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')}
        message={snack} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} />
    </Box>
  );
}