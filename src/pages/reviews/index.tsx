import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Tabs, Tab, Button, Chip,
  Paper, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Avatar, Alert, CircularProgress,
  Badge, Select, MenuItem, FormControl, InputLabel, Stack
} from '@mui/material';
import {
  CheckCircleOutlined, DeleteOutlined, ReloadOutlined,
  EyeInvisibleOutlined, MessageOutlined
} from '@ant-design/icons';
import apiClient from '../../api';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

const reviewsApi = {
  getPending: (p?: any) => apiClient.get('/reviews/admin/pending', { params: p }),
  getAll:     (p?: any) => apiClient.get('/reviews/admin/all', { params: p }),
  approve:    (id: string) => apiClient.post(`/reviews/admin/${id}/approve`),
  hide:       (id: string) => apiClient.post(`/reviews/admin/${id}/hide`),
  delete:     (id: string) => apiClient.delete(`/reviews/admin/${id}`),
  respond:    (id: string, response: string) =>
    apiClient.post(`/reviews/admin/${id}/respond`, { response }),
};

const STAR_COLORS = ['','#f44336','#ff9800','#ffc107','#4caf50','#2196f3'];
const STAR_LABELS = ['','Poor','Fair','Good','Very Good','Excellent'];

// ── Single review card ────────────────────────────────────────────────────────
function ReviewCard({
  review, onApprove, onHide, onDelete, onRespond, canEdit,
}: {
  review: any;
  onApprove: (id: string) => void;
  onHide: (id: string) => void;
  onDelete: (id: string) => void;
  onRespond: (id: string, text: string) => void;
  canEdit: boolean;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState(review.adminResponse || '');
  const [delConfirm, setDelConfirm] = useState(false);

  if (!review) return null;

  const id        = review._id || review.id || '';
  const isApproved= review.isApproved === true;
  const isAgent   = review.reviewerModel === 'Agent';
  const isHotel   = review.type === 'hotel';
  const rating    = Math.min(5, Math.max(1, Math.round(review.overallRating || 1)));
  const initial   = (review.reviewerName || 'U')[0].toUpperCase();

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: isApproved ? 'divider' : 'warning.light',
        borderRadius: 2,
        p: 2.5,
        mb: 2,
        bgcolor: isApproved ? 'background.paper' : '#fffbf0',
      }}
    >
      {/* Header row */}
      <Box sx={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', mb:1.5 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
          <Avatar
            sx={{
              bgcolor: isAgent ? 'warning.main' : 'primary.main',
              width: 36, height: 36, fontSize: 14, fontWeight: 700,
            }}
          >
            {initial}
          </Avatar>
          <Box>
            <Box sx={{ display:'flex', alignItems:'center', gap:1, flexWrap:'wrap' }}>
              <Typography variant="body2" fontWeight={700}>
                {review.reviewerName || 'Unknown'}
              </Typography>
              <Chip
                label={isAgent ? 'Agent' : 'Customer'}
                size="small"
                color={isAgent ? 'warning' : 'primary'}
                sx={{ height: 18, fontSize: 10 }}
              />
              <Chip
                label={isHotel ? '🏨 Hotel' : '✈ Flight'}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: 10 }}
              />
            </Box>
            <Box sx={{ display:'flex', alignItems:'center', gap:1, mt:0.25 }}>
              <Typography variant="caption" color="text.secondary">
                {review.entityName || '—'}
              </Typography>
              <Typography variant="caption" color="text.disabled">·</Typography>
              <Typography variant="caption" color="text.disabled">
                Ref: {review.bookingRef || '—'}
              </Typography>
              <Typography variant="caption" color="text.disabled">·</Typography>
              <Typography variant="caption" color="text.disabled">
                {review.createdAt
                  ? new Date(review.createdAt).toLocaleDateString('en-IN')
                  : '—'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display:'flex', gap:0.5, flexShrink:0 }}>
          {/* Approve — only when pending and canEdit */}
          {canEdit && !isApproved && (
            <Tooltip title="Approve & Show on Homepage">
              <IconButton size="small" color="success" onClick={() => onApprove(id)}>
                <CheckCircleOutlined/>
              </IconButton>
            </Tooltip>
          )}
          {/* Hide — only when approved and canEdit */}
          {canEdit && isApproved && (
            <Tooltip title="Hide from Homepage">
              <IconButton size="small" color="warning" onClick={() => onHide(id)}>
                <EyeInvisibleOutlined/>
              </IconButton>
            </Tooltip>
          )}
          {/* Reply — only canEdit */}
          {canEdit && (
            <Tooltip title="Add / Edit Admin Response">
              <IconButton size="small" color="primary" onClick={() => setShowReply(v => !v)}>
                <MessageOutlined/>
              </IconButton>
            </Tooltip>
          )}
          {/* Delete — only canEdit */}
          {canEdit && (
            <Tooltip title="Delete Permanently">
              <IconButton size="small" color="error" onClick={() => setDelConfirm(true)}>
                <DeleteOutlined/>
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Stars */}
      <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
        <Box sx={{ color: STAR_COLORS[rating], fontWeight:700, fontSize:16 }}>
          {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
        </Box>
        <Typography variant="caption" sx={{ color: STAR_COLORS[rating], fontWeight:600 }}>
          {STAR_LABELS[rating]}
        </Typography>
      </Box>

      {/* Comment */}
      <Typography
        variant="body2"
        sx={{ color:'text.secondary', lineHeight:1.7, fontStyle:'italic', mb:1 }}
      >
        "{review.comment}"
      </Typography>

      {/* Sub-ratings */}
      {(review.serviceRating || review.cleanlinessRating || review.valueRating || review.punctualityRating) && (
        <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.75, mb:1 }}>
          {review.serviceRating     && <Chip label={`Service: ${review.serviceRating}★`}     size="small" variant="outlined"/>}
          {review.cleanlinessRating && <Chip label={`Clean: ${review.cleanlinessRating}★`}   size="small" variant="outlined"/>}
          {review.valueRating       && <Chip label={`Value: ${review.valueRating}★`}          size="small" variant="outlined"/>}
          {review.punctualityRating && <Chip label={`On-time: ${review.punctualityRating}★`} size="small" variant="outlined"/>}
        </Box>
      )}

      {/* Helpful count */}
      {(review.helpfulCount || 0) > 0 && (
        <Typography variant="caption" color="text.disabled" sx={{ mb:0.5, display:'block' }}>
          👍 {review.helpfulCount} found helpful
        </Typography>
      )}

      {/* Existing admin response */}
      {review.adminResponse && !showReply && (
        <Box sx={{
          mt:1.5, p:1.5, bgcolor:'primary.50', borderRadius:1.5,
          borderLeft:'3px solid', borderColor:'primary.main',
        }}>
          <Typography variant="caption" fontWeight={700} color="primary">
            Admin Response
          </Typography>
          <Typography variant="body2" color="primary.dark" sx={{ mt:0.5 }}>
            {review.adminResponse}
          </Typography>
        </Box>
      )}

      {/* Reply box */}
      {showReply && (
        <Box sx={{ mt:2 }}>
          <TextField
            multiline rows={2} fullWidth size="small"
            label="Admin Response (shown publicly under review)"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write your response to this review..."
          />
          <Box sx={{ display:'flex', gap:1, mt:1 }}>
            <Button
              size="small" variant="contained"
              onClick={() => { onRespond(id, replyText); setShowReply(false); }}
            >
              Save Response
            </Button>
            <Button size="small" onClick={() => setShowReply(false)}>Cancel</Button>
          </Box>
        </Box>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={delConfirm} onClose={() => setDelConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete this review?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This will permanently delete the review by <strong>{review.reviewerName}</strong>.
            This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelConfirm(false)}>Cancel</Button>
          <Button color="error" variant="contained"
            onClick={() => { setDelConfirm(false); onDelete(id); }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReviewsPage() {
  const { can } = useUserContext();
  const canEdit = can(PERMISSIONS.CONTENT_REVIEWS_EDIT);

  const [tab,          setTab]          = useState(0);
  const [pending,      setPending]      = useState<any[]>([]);
  const [reviews,      setReviews]      = useState<any[]>([]);
  const [loadingP,     setLoadingP]     = useState(false);
  const [loadingA,     setLoadingA]     = useState(false);
  const [errorP,       setErrorP]       = useState('');
  const [errorA,       setErrorA]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [pendingCount, setPendingCount] = useState(0);

  const loadPending = useCallback(async () => {
    setLoadingP(true); setErrorP('');
    try {
      const r   = await reviewsApi.getPending();
      const d   = (r as any)?.data;
      const arr = d?.data ?? d ?? [];
      setPending(Array.isArray(arr) ? arr.filter(Boolean) : []);
      setPendingCount(d?.pagination?.total ?? arr.length ?? 0);
    } catch (e: any) {
      setErrorP(e?.response?.data?.message || 'Failed to load. Check backend.');
    } finally { setLoadingP(false); }
  }, []);

  const loadAll = useCallback(async () => {
    setLoadingA(true); setErrorA('');
    try {
      const params: any = { status: 'approved' };
      if (typeFilter !== 'all') params.type = typeFilter;
      const r   = await reviewsApi.getAll(params);
      const d   = (r as any)?.data;
      const arr = d?.data ?? d ?? [];
      setReviews(Array.isArray(arr) ? arr.filter(Boolean) : []);
    } catch (e: any) {
      setErrorA(e?.response?.data?.message || 'Failed to load.');
    } finally { setLoadingA(false); }
  }, [typeFilter]);

  useEffect(() => { loadPending(); }, [loadPending]);
  useEffect(() => { if (tab === 1) loadAll(); }, [tab, loadAll]);

  const handleApprove = async (id: string) => {
    try { await reviewsApi.approve(id); loadPending(); if (tab===1) loadAll(); }
    catch (e: any) { alert(e?.response?.data?.message || 'Error approving'); }
  };
  const handleHide = async (id: string) => {
    try { await reviewsApi.hide(id); loadAll(); }
    catch (e: any) { alert(e?.response?.data?.message || 'Error hiding'); }
  };
  const handleDelete = async (id: string) => {
    try { await reviewsApi.delete(id); loadPending(); if (tab===1) loadAll(); }
    catch (e: any) { alert(e?.response?.data?.message || 'Error deleting'); }
  };
  const handleRespond = async (id: string, response: string) => {
    try { await reviewsApi.respond(id, response); if (tab===1) loadAll(); }
    catch (e: any) { alert(e?.response?.data?.message || 'Error saving response'); }
  };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb:3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>⭐ Reviews Management</Typography>
        <Typography color="text.secondary">
          Moderate customer and agent reviews. Approve → visible on homepage.
          Hide → removed from homepage (not deleted). Delete → permanent removal.
        </Typography>
        {pendingCount > 0 && (
          <Alert severity="warning" sx={{ mt:2 }} icon={false}>
            ⏳ <strong>{pendingCount} review{pendingCount > 1 ? 's' : ''}</strong> waiting for your approval
          </Alert>
        )}
        <Alert severity="info" sx={{ mt:1.5 }} icon={false}>
          💡 <strong>Show / Hide actions:</strong> Use <strong>✅ Approve</strong> to publish a pending review.
          Use <strong>🙈 Hide</strong> to remove a published review from homepage without deleting it.
          Use <strong>🗑 Delete</strong> to permanently remove.
        </Alert>
      </Box>

      <Card elevation={0} sx={{ border:'1px solid', borderColor:'divider', borderRadius:2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom:'1px solid', borderColor:'divider', px:2 }}
        >
          <Tab
            label={
              <Badge badgeContent={pendingCount} color="warning" max={99}>
                <Box sx={{ pr: pendingCount > 0 ? 1.5 : 0 }}>Pending Approval</Box>
              </Badge>
            }
          />
          <Tab label="Published Reviews"/>
        </Tabs>

        <CardContent sx={{ p:3 }}>
          {/* ── Pending tab ── */}
          {tab === 0 && (
            <Box>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Pending ({pending.length})
                </Typography>
                <Button startIcon={<ReloadOutlined/>} onClick={loadPending} variant="outlined" size="small">
                  Refresh
                </Button>
              </Box>

              {errorP && <Alert severity="error" sx={{ mb:2 }}>{errorP}</Alert>}

              {loadingP ? (
                <Box sx={{ display:'flex', justifyContent:'center', py:6 }}>
                  <CircularProgress/>
                </Box>
              ) : pending.length === 0 ? (
                <Box sx={{ py:8, textAlign:'center' }}>
                  <Typography fontSize={48} sx={{ mb:1 }}>✅</Typography>
                  <Typography variant="h6" fontWeight={700}>All caught up!</Typography>
                  <Typography color="text.secondary">No reviews waiting for approval.</Typography>
                </Box>
              ) : (
                pending.map(r => r && (
                  <ReviewCard
                    key={r._id || r.id}
                    review={r}
                    onApprove={handleApprove}
                    onHide={handleHide}
                    onDelete={handleDelete}
                    onRespond={handleRespond}
                    canEdit={canEdit}
                  />
                ))
              )}
            </Box>
          )}

          {/* ── Published tab ── */}
          {tab === 1 && (
            <Box>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2, flexWrap:'wrap', gap:1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Published Reviews ({reviews.length})
                </Typography>
                <Stack direction="row" spacing={1}>
                  <FormControl size="small" sx={{ minWidth:130 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={typeFilter}
                      label="Type"
                      onChange={e => setTypeFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="flight">✈ Flights</MenuItem>
                      <MenuItem value="hotel">🏨 Hotels</MenuItem>
                    </Select>
                  </FormControl>
                  <Button startIcon={<ReloadOutlined/>} onClick={loadAll} variant="outlined" size="small">
                    Refresh
                  </Button>
                </Stack>
              </Box>

              {errorA && <Alert severity="error" sx={{ mb:2 }}>{errorA}</Alert>}

              {loadingA ? (
                <Box sx={{ display:'flex', justifyContent:'center', py:6 }}>
                  <CircularProgress/>
                </Box>
              ) : reviews.length === 0 ? (
                <Box sx={{ py:8, textAlign:'center' }}>
                  <Typography color="text.secondary">
                    No published reviews yet. Approve pending reviews to show them here.
                  </Typography>
                </Box>
              ) : (
                reviews.map(r => r && (
                  <ReviewCard
                    key={r._id || r.id}
                    review={r}
                    onApprove={handleApprove}
                    onHide={handleHide}
                    onDelete={handleDelete}
                    onRespond={handleRespond}
                    canEdit={canEdit}
                  />
                ))
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
