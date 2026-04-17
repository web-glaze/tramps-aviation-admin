import { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Tabs, Tab, Button, TextField, Switch,
  FormControlLabel, Alert, Snackbar, CircularProgress,
  Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid,
} from '@mui/material';
import {
  SaveOutlined, ReloadOutlined, PlusOutlined,
  EyeOutlined, PictureOutlined,
} from '@ant-design/icons';
import { cmsApi } from '../../api';
import MainCard from '../../components/MainCard';
import { API_BASE_URL } from '../../constants';

// ── Predefined page slugs & labels ────────────────────────────────────────────
const PRESET_PAGES = [
  { slug: 'privacy',  label: '🔒 Privacy Policy',      desc: 'How you collect/use user data' },
  { slug: 'terms',    label: '📄 Terms & Conditions',   desc: 'Rules for using the platform' },
  { slug: 'refund',   label: '💰 Refund Policy',        desc: 'Cancellation and refund rules' },
  { slug: 'faq',      label: '❓ FAQs',                 desc: 'Frequently asked questions' },
  { slug: 'about',    label: '🏢 About Us',             desc: 'Company info and mission' },
];

// ── Image Upload Helper ────────────────────────────────────────────────────────
async function uploadImageToServer(file: File): Promise<string> {
  const token = localStorage.getItem('admin_token');
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/upload/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json?.data?.url || json?.url;
}

// ── Cover Image Uploader ───────────────────────────────────────────────────────
function CoverImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImageToServer(file);
      onChange(url);
    } catch {
      setError('Upload failed. Check AWS/S3 config.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ mb: 2.5, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'grey.50' }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
        🖼️ Cover / Hero Image
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          (optional — displayed as full-width banner at the top of the page)
        </Typography>
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Paste image URL, or upload →"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          sx={{ flex: 1, minWidth: 260, bgcolor: 'background.paper' }}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <Button
          variant="contained"
          size="small"
          startIcon={uploading ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <PictureOutlined />}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {uploading ? 'Uploading…' : 'Upload Image'}
        </Button>
        {value && (
          <Button size="small" color="error" variant="outlined" onClick={() => onChange('')}>
            Remove
          </Button>
        )}
      </Box>

      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          ⚠️ {error}
        </Typography>
      )}

      {value && (
        <Box sx={{ mt: 1.5, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', maxHeight: 180 }}>
          <img
            src={value}
            alt="Cover preview"
            style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </Box>
      )}
    </Box>
  );
}

// ── Rich Text Editor with Image Upload ────────────────────────────────────────
function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const savedRange = useRef<Range | null>(null);

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

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const insertImageInEditor = (url: string) => {
    ref.current?.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.style.cssText = 'max-width:100%;height:auto;border-radius:8px;margin:12px 0;display:block;';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      // Wrap in a paragraph for cleaner HTML
      const wrapper = document.createElement('p');
      wrapper.appendChild(img);
      range.insertNode(wrapper);
      range.setStartAfter(wrapper);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      ref.current?.appendChild(img);
    }
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const url = await uploadImageToServer(file);
      insertImageInEditor(url);
    } catch {
      alert('Image upload failed. Please check your AWS/S3 configuration.');
    } finally {
      setImgUploading(false);
      if (imgInputRef.current) imgInputRef.current.value = '';
    }
  };

  const handleImageByUrl = () => {
    saveSelection();
    const url = prompt('Paste image URL:');
    if (url?.trim()) insertImageInEditor(url.trim());
  };

  const textBtns = [
    { label: 'B',       title: 'Bold',           action: () => exec('bold'),               style: { fontWeight: 800 } },
    { label: 'I',       title: 'Italic',          action: () => exec('italic'),             style: { fontStyle: 'italic' } },
    { label: 'U',       title: 'Underline',       action: () => exec('underline'),          style: { textDecoration: 'underline' } },
    { label: 'H1',      title: 'Heading 1',       action: () => exec('formatBlock', 'h1') },
    { label: 'H2',      title: 'Heading 2',       action: () => exec('formatBlock', 'h2') },
    { label: 'H3',      title: 'Heading 3',       action: () => exec('formatBlock', 'h3') },
    { label: 'P',       title: 'Paragraph',       action: () => exec('formatBlock', 'p') },
    { label: '• List',  title: 'Bullet List',     action: () => exec('insertUnorderedList') },
    { label: '1. List', title: 'Numbered List',   action: () => exec('insertOrderedList') },
    { label: '🔗 Link', title: 'Insert Link',     action: () => { const u = prompt('Enter URL:'); if (u) exec('createLink', u); } },
    { label: '—',       title: 'Horizontal Rule', action: () => exec('insertHorizontalRule') },
  ];

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {/* Toolbar */}
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1,
        bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider',
        alignItems: 'center',
      }}>
        {textBtns.map(btn => (
          <Button
            key={btn.title}
            size="small"
            variant="outlined"
            title={btn.title}
            onMouseDown={e => { e.preventDefault(); saveSelection(); btn.action(); }}
            sx={{ minWidth: 36, px: 1, py: 0.25, fontSize: '12px', ...(btn as any).style }}
          >
            {btn.label}
          </Button>
        ))}

        {/* Divider */}
        <Box sx={{ width: '1px', height: 24, bgcolor: 'divider', mx: 0.5 }} />

        {/* Image by URL */}
        <Button
          size="small"
          variant="outlined"
          title="Insert image by URL"
          onMouseDown={e => { e.preventDefault(); handleImageByUrl(); }}
          sx={{ px: 1, py: 0.25, fontSize: '12px' }}
        >
          🌐 Image URL
        </Button>

        {/* Upload image from computer */}
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageFileUpload}
        />
        <Button
          size="small"
          variant="contained"
          color="primary"
          title="Upload image from computer"
          disabled={imgUploading}
          onMouseDown={e => { e.preventDefault(); saveSelection(); }}
          onClick={() => imgInputRef.current?.click()}
          startIcon={imgUploading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : <PictureOutlined />}
          sx={{ px: 1.5, py: 0.25, fontSize: '12px' }}
        >
          {imgUploading ? 'Uploading…' : '📤 Upload Image'}
        </Button>
      </Box>

      {/* Editable area */}
      <Box
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        sx={{
          minHeight: 420,
          p: 2.5,
          outline: 'none',
          fontSize: '14px',
          lineHeight: 1.8,
          '& h1': { fontSize: '1.8rem', fontWeight: 700, my: 1.5, lineHeight: 1.3 },
          '& h2': { fontSize: '1.4rem', fontWeight: 700, my: 1.2, lineHeight: 1.3 },
          '& h3': { fontSize: '1.15rem', fontWeight: 600, my: 1, lineHeight: 1.3 },
          '& p':  { my: 0.8 },
          '& ul, & ol': { pl: 3, my: 0.5 },
          '& li': { mb: 0.3 },
          '& a':  { color: '#208dcb', textDecoration: 'underline' },
          '& table': { borderCollapse: 'collapse', width: '100%', my: 1 },
          '& td, & th': { border: '1px solid #ddd', p: '6px 8px' },
          '& strong': { fontWeight: 700 },
          '& hr': { my: 1.5, border: 'none', borderTop: '1px solid #ddd' },
          '& img': {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '8px',
            margin: '12px 0',
            display: 'block',
          },
        }}
      />
    </Box>
  );
}

// ── Page Editor ───────────────────────────────────────────────────────────────
function PageEditor({ slug, onSaved }: { slug: string; onSaved: (msg: string) => void }) {
  const [page, setPage]       = useState<any>({ slug, title: '', content: '', isPublished: true, metaTitle: '', metaDescription: '', coverImage: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setLoading(true);
    cmsApi.getPage(slug)
      .then(res => { const d = res.data?.data || res.data; if (d) setPage({ coverImage: '', ...d }); })
      .catch(() => {})
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
      {/* Header row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {PRESET_PAGES.find(p => p.slug === slug)?.label || `📝 ${slug}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Public URL: <code style={{ background: '#f0f0f0', padding: '1px 6px', borderRadius: 3 }}>/{slug}</code>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControlLabel
            control={<Switch checked={!!page.isPublished} onChange={e => setPage((p: any) => ({ ...p, isPublished: e.target.checked }))} />}
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

      {/* Cover image */}
      <CoverImageField
        value={page.coverImage || ''}
        onChange={url => setPage((p: any) => ({ ...p, coverImage: url }))}
      />

      {/* Preview or Editor */}
      {preview ? (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
            👁️ Preview — as seen on the website
          </Typography>
          {page.coverImage && (
            <Box sx={{ maxHeight: 260, overflow: 'hidden' }}>
              <img src={page.coverImage} alt="Cover" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
            </Box>
          )}
          <Box
            sx={{
              p: 3, lineHeight: 1.8, fontSize: 14,
              '& h1': { fontSize: '1.8rem', fontWeight: 700, my: 1.5 },
              '& h2': { fontSize: '1.4rem', fontWeight: 700, my: 1.2 },
              '& h3': { fontSize: '1.1rem', fontWeight: 600, my: 1 },
              '& img': { maxWidth: '100%', height: 'auto', borderRadius: '8px', margin: '12px 0', display: 'block' },
              '& table': { borderCollapse: 'collapse', width: '100%', my: 1 },
              '& td, & th': { border: '1px solid #ddd', p: '6px 8px', fontSize: '13px' },
              '& ul, & ol': { pl: 3 },
              '& a': { color: '#208dcb' },
            }}
            dangerouslySetInnerHTML={{ __html: page.content || '<p style="color:#999">No content yet…</p>' }}
          />
        </Box>
      ) : (
        <RichEditor value={page.content || ''} onChange={content => setPage((p: any) => ({ ...p, content }))} />
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
  const [slug, setSlug]   = useState('');
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
  const [pages, setPages]             = useState<any[]>([]);
  const [activeSlug, setActiveSlug]   = useState('privacy');
  const [snack, setSnack]             = useState('');
  const [seeding, setSeeding]         = useState(false);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [customSlugs, setCustomSlugs] = useState<string[]>([]);

  const loadPages = async () => {
    try {
      const res = await cmsApi.getAll();
      const d   = res.data?.data || res.data;
      const arr = Array.isArray(d) ? d : [];
      setPages(arr);
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
          You can then edit text, add images (upload or URL), and add a cover/hero image per page.
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
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 3 }}
        >
          {allTabs.map(t => (
            <Tab
              key={t.slug}
              label={t.label}
              iconPosition="end"
              icon={
                pages.find((p: any) => p.slug === t.slug)
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

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </Box>
  );
}