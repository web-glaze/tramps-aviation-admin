/**
 * Admin → FAQs editor.
 *
 * Single page with two audience tabs (Agent / Customer). The MAIN
 * surface is a "multi-add" form: admins can stack any number of empty
 * Q&A rows, fill them in, and submit them all as a single bulk-create
 * call. Below the form sits a live list of every FAQ already saved
 * for the active audience, with inline edit / toggle-active / delete
 * actions.
 *
 * Wired to /faqs/admin + POST /faqs/bulk + PATCH /faqs/:id + DELETE
 * /faqs/:id on the backend (FaqsController).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { faqsApi } from '../../api';

type Audience = 'agent' | 'customer';

interface FaqDraft {
  question: string;
  answer: string;
  category: string;
}

interface FaqRow {
  _id: string;
  question: string;
  answer: string;
  audience: Audience;
  category?: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const emptyDraft = (): FaqDraft => ({ question: '', answer: '', category: '' });

export default function FaqsPage() {
  const [audience, setAudience] = useState<Audience>('agent');
  const [drafts, setDrafts] = useState<FaqDraft[]>([emptyDraft()]);
  const [list, setList] = useState<FaqRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<FaqRow>>({});
  const [snack, setSnack] = useState<{ open: boolean; msg: string; ok: boolean }>({
    open: false,
    msg: '',
    ok: true,
  });

  const showToast = (msg: string, ok = true) =>
    setSnack({ open: true, msg, ok });

  // ─── List loader ────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await faqsApi.list(audience);
      const items =
        res?.data?.items || res?.data?.data?.items || res?.data || [];
      setList(Array.isArray(items) ? items : []);
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Failed to load FAQs', false);
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ─── Multi-add row controls ────────────────────────────────────────
  const addRow = () => setDrafts((d) => [...d, emptyDraft()]);
  const removeRow = (idx: number) =>
    setDrafts((d) => (d.length === 1 ? d : d.filter((_, i) => i !== idx)));
  const updateRow = (idx: number, patch: Partial<FaqDraft>) =>
    setDrafts((d) => d.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const validDrafts = useMemo(
    () =>
      drafts
        .map((d, i) => ({ d, i }))
        .filter(
          ({ d }) =>
            d.question.trim().length >= 5 && d.answer.trim().length >= 5,
        ),
    [drafts],
  );

  const submitAll = async () => {
    if (validDrafts.length === 0) {
      showToast('Please fill in at least one Q&A row (5+ characters)', false);
      return;
    }
    setSaving(true);
    try {
      const payload = validDrafts.map(({ d }) => ({
        question: d.question.trim(),
        answer: d.answer.trim(),
        audience,
        category: d.category?.trim() || undefined,
      }));
      await faqsApi.bulkCreate(payload);
      showToast(`Added ${payload.length} FAQ(s)`);
      setDrafts([emptyDraft()]);
      void reload();
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Bulk save failed', false);
    } finally {
      setSaving(false);
    }
  };

  // ─── Inline edit ───────────────────────────────────────────────────
  const startEdit = (row: FaqRow) => {
    setEditingId(row._id);
    setEditDraft({
      question: row.question,
      answer: row.answer,
      category: row.category || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = async (id: string) => {
    try {
      await faqsApi.update(id, {
        question: editDraft.question?.trim(),
        answer: editDraft.answer?.trim(),
        category: editDraft.category?.trim() || null,
      });
      showToast('Updated');
      cancelEdit();
      void reload();
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Update failed', false);
    }
  };

  const toggleActive = async (row: FaqRow) => {
    try {
      await faqsApi.update(row._id, { isActive: !row.isActive });
      void reload();
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Toggle failed', false);
    }
  };

  const removeRowDb = async (row: FaqRow) => {
    if (!window.confirm(`Delete this FAQ?\n\n${row.question}`)) return;
    try {
      await faqsApi.remove(row._id);
      showToast('Deleted');
      void reload();
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Delete failed', false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            FAQs Editor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage frequently asked questions surfaced on the agent portal
            and the customer site.
          </Typography>
        </Box>
        <Tooltip title="Reload list">
          <IconButton onClick={() => void reload()} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Tabs
        value={audience}
        onChange={(_e, v) => setAudience(v as Audience)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          value="agent"
          label="Agent FAQs"
          icon={<HelpOutlineIcon fontSize="small" />}
          iconPosition="start"
        />
        <Tab
          value="customer"
          label="Customer FAQs"
          icon={<HelpOutlineIcon fontSize="small" />}
          iconPosition="start"
        />
      </Tabs>

      {/* ── Multi-add editor ─────────────────────────────────────────── */}
      <Card sx={{ mb: 3 }} variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography fontWeight={700}>
              Add new {audience === 'agent' ? 'Agent' : 'Customer'} FAQs
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addRow}
                variant="outlined"
              >
                Add row
              </Button>
              <Button
                size="small"
                startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
                onClick={submitAll}
                variant="contained"
                disabled={saving || validDrafts.length === 0}
              >
                Save {validDrafts.length > 0 ? `(${validDrafts.length})` : ''}
              </Button>
            </Stack>
          </Stack>

          <Stack spacing={2}>
            {drafts.map((row, idx) => (
              <Card
                key={idx}
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  borderStyle: 'dashed',
                }}
              >
                <Stack direction="row" alignItems="center" mb={1.5}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Row #{idx + 1}
                  </Typography>
                  <Box flex={1} />
                  {drafts.length > 1 && (
                    <Tooltip title="Remove this row">
                      <IconButton size="small" onClick={() => removeRow(idx)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Question"
                      value={row.question}
                      onChange={(e) =>
                        updateRow(idx, { question: e.target.value })
                      }
                      placeholder={
                        audience === 'agent'
                          ? 'e.g. How do I top up my wallet?'
                          : 'e.g. Can I cancel my booking?'
                      }
                    />
                    <TextField
                      size="small"
                      label="Category (optional)"
                      value={row.category}
                      onChange={(e) =>
                        updateRow(idx, { category: e.target.value })
                      }
                      placeholder="e.g. Wallet, KYC"
                      sx={{ minWidth: 200 }}
                    />
                  </Stack>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    label="Answer"
                    value={row.answer}
                    onChange={(e) =>
                      updateRow(idx, { answer: e.target.value })
                    }
                    placeholder="Plain text. Use line breaks for readability."
                  />
                </Stack>
              </Card>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* ── Existing list ────────────────────────────────────────────── */}
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Typography fontWeight={700}>
              Saved {audience === 'agent' ? 'Agent' : 'Customer'} FAQs
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {list.length} total
            </Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box textAlign="center" py={6}>
              <CircularProgress size={28} />
            </Box>
          ) : list.length === 0 ? (
            <Alert severity="info">
              No FAQs saved yet for {audience}s. Add some above and they will
              appear here.
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              {list.map((row) => {
                const isEditing = editingId === row._id;
                return (
                  <Card
                    key={row._id}
                    variant="outlined"
                    sx={{ p: 2, opacity: row.isActive ? 1 : 0.55 }}
                  >
                    {isEditing ? (
                      <Stack spacing={1.5}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Question"
                          value={editDraft.question || ''}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, question: e.target.value }))
                          }
                        />
                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          minRows={2}
                          label="Answer"
                          value={editDraft.answer || ''}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, answer: e.target.value }))
                          }
                        />
                        <TextField
                          size="small"
                          label="Category"
                          value={editDraft.category || ''}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, category: e.target.value }))
                          }
                          sx={{ maxWidth: 240 }}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={() => saveEdit(row._id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box flex={1}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                            <Typography fontWeight={700}>{row.question}</Typography>
                            {row.category && (
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 11,
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: 1,
                                  bgcolor: 'primary.50',
                                  color: 'primary.main',
                                  fontWeight: 700,
                                }}
                              >
                                {row.category}
                              </Box>
                            )}
                          </Stack>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ whiteSpace: 'pre-wrap' }}
                          >
                            {row.answer}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Tooltip
                            title={row.isActive ? 'Active — visible' : 'Hidden'}
                          >
                            <Switch
                              size="small"
                              checked={row.isActive}
                              onChange={() => toggleActive(row)}
                            />
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => startEdit(row)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => removeRowDb(row)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    )}
                  </Card>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snack.ok ? 'success' : 'error'}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
