import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Avatar,
  Skeleton,
  Tooltip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Card,
  CardMedia,
  CardContent,
} from "@mui/material";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
} from "@ant-design/icons";
import { kycApi } from "../../api";
import MainCard from "../../components/MainCard";
import { MEDIA_BASE_URL } from "../../constants";
import useUserContext from "../../hooks/useUser";
import { PERMISSIONS } from "../../constants/permissions";

const PENDING_STATUSES = ["pending", "submitted", "under_review"];

const statusColor = (status: string) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  return "warning";
};

// Render a document — image inline, PDF as link
function DocViewer({ label, url }: { label: string; url: string }) {
  if (!url) return null;
  const fullUrl = url.startsWith("http") ? url : `${MEDIA_BASE_URL}${url}`;
  const isPdf = url.toLowerCase().endsWith(".pdf");
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {isPdf ? (
        <Box sx={{ p: 2, textAlign: "center", bgcolor: "grey.50" }}>
          <FilePdfOutlined style={{ fontSize: 40, color: "#f5222d" }} />
          <Typography
            variant="caption"
            display="block"
            sx={{ mt: 1, mb: 1 }}
            color="text.secondary"
          >
            {label}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            href={fullUrl}
            target="_blank"
          >
            Open PDF
          </Button>
        </Box>
      ) : (
        <>
          <Box
            sx={{ position: "relative", bgcolor: "grey.100", minHeight: 160 }}
          >
            <CardMedia
              component="img"
              image={fullUrl}
              alt={label}
              sx={{
                maxHeight: 220,
                objectFit: "contain",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => window.open(fullUrl, "_blank")}
              onError={(e: any) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
            <Box
              sx={{
                display: "none",
                height: 160,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                color: "text.secondary",
                gap: 1,
              }}
            >
              <FileImageOutlined style={{ fontSize: 32 }} />
              <Typography variant="caption">Image not available</Typography>
            </Box>
          </Box>
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
              >
                {label}
              </Typography>
              <Button
                size="small"
                href={fullUrl}
                target="_blank"
                sx={{ fontSize: 11, p: "2px 8px" }}
              >
                Full View
              </Button>
            </Box>
          </CardContent>
        </>
      )}
    </Card>
  );
}

export default function KycPage() {
  const { can } = useUserContext();
  const canApprove = can(PERMISSIONS.KYC_APPROVE);
  const canReject  = can(PERMISSIONS.KYC_REJECT);

  const [kycs, setKycs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState("");
  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    sev: "success" as any,
  });
  const [actionLoading, setActionLoading] = useState("");

  const fetchKycs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kycApi.getAll({
        page,
        limit: 10,
        status: statusFilter,
      });
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];
      setKycs(arr);
    } catch {
      setKycs([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchKycs(); }, [fetchKycs]);

  const handleApprove = async (id: string) => {
    setActionLoading(id + "_approve");
    try {
      await kycApi.approve(id);
      setSnack({
        open: true,
        msg: "✅ KYC Approved! Agent account is now active.",
        sev: "success",
      });
      setViewOpen(false);
      fetchKycs();
    } catch (e: any) {
      setSnack({
        open: true,
        msg: e?.response?.data?.message || "Failed to approve",
        sev: "error",
      });
    }
    setActionLoading("");
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(rejectTarget + "_reject");
    try {
      await kycApi.reject(rejectTarget, rejectReason);
      setSnack({
        open: true,
        msg: "❌ KYC Rejected. Agent notified.",
        sev: "warning",
      });
      setRejectOpen(false);
      setRejectReason("");
      setViewOpen(false);
      fetchKycs();
    } catch (e: any) {
      setSnack({
        open: true,
        msg: e?.response?.data?.message || "Failed to reject",
        sev: "error",
      });
    }
    setActionLoading("");
  };

  const getAgentName = (k: any) =>
    k
      ? k.agentName || k.agentId?.contactPerson || k.agentId?.email || "—"
      : "—";
  const getAgencyName = (k: any) =>
    k ? k.agencyName || k.agentId?.agencyName || "—" : "—";
  const needsReview = (k: any) => PENDING_STATUSES.includes(k?.status);

  const openView = (k: any) => {
    setSelected(k);
    setViewOpen(true);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        KYC Verification
      </Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Click the <b>👁 View</b> button to see all documents — then Approve or
        Reject inside.
      </Typography>

      <MainCard>
        <Box sx={{ display: "flex", gap: 2, mb: 2.5, alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              label="Status Filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">All Submissions</MenuItem>
              <MenuItem value="pending">Pending Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchKycs} size="small">
              <ReloadOutlined />
            </IconButton>
          </Tooltip>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: "auto" }}
          >
            {kycs.length} record{kycs.length !== 1 ? "s" : ""} found
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>#</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Agency</TableCell>
                <TableCell>Document Type</TableCell>
                <TableCell>Submitted On</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      {Array(7)
                        .fill(0)
                        .map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
              ) : kycs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.disabled">
                      No KYC submissions found
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {statusFilter === "pending"
                        ? "No pending submissions right now"
                        : 'Try "All Submissions" filter'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                kycs.map((k: any, i: number) => (
                  <TableRow key={k._id} hover>
                    <TableCell>{(page - 1) * 10 + i + 1}</TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: "warning.main",
                            fontWeight: 700,
                          }}
                        >
                          {getAgentName(k).charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {getAgentName(k)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {k.agentEmail || k.agentId?.email || "—"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {getAgencyName(k)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={k.documentType || "Aadhaar/PAN"}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      {k.submittedAt || k.createdAt
                        ? new Date(
                            k.submittedAt || k.createdAt,
                          ).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          k.status === "submitted"
                            ? "Pending Review"
                            : k.status || "pending"
                        }
                        color={statusColor(k.status) as any}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        {/* VIEW — primary action, shows all docs + approve/reject inside */}
                        <Tooltip
                          title={
                            needsReview(k)
                              ? "View Documents & Approve/Reject"
                              : "View Documents"
                          }
                        >
                          <Button
                            size="small"
                            variant={needsReview(k) ? "contained" : "outlined"}
                            color={needsReview(k) ? "warning" : "primary"}
                            startIcon={<EyeOutlined />}
                            onClick={() => openView(k)}
                            sx={{ textTransform: "none", fontWeight: 600 }}
                          >
                            {needsReview(k) ? "Review" : "View"}
                          </Button>
                        </Tooltip>
                        {k.status === "approved" && (
                          <Chip
                            label="Active"
                            color="success"
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {k.status === "rejected" && (
                          <Chip
                            label="Rejected"
                            color="error"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            mt: 2,
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            gap: 1,
          }}
        >
          <Button
            size="small"
            variant="outlined"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={kycs.length < 10}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </Box>
      </MainCard>

      {/* ── FULL VIEW DIALOG — shows all docs + approve/reject ── */}
      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { maxHeight: "90vh" } }}
      >
        <DialogTitle
          sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 1.5 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: "warning.main",
                width: 44,
                height: 44,
                fontWeight: 700,
              }}
            >
              {selected ? getAgentName(selected).charAt(0).toUpperCase() : "A"}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6" fontWeight={700}>
                {selected ? getAgentName(selected) : ""} — KYC Review
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selected ? getAgencyName(selected) : ""}
              </Typography>
            </Box>
            {selected && (
              <Chip
                label={
                  selected.status === "submitted"
                    ? "Pending Review"
                    : selected.status
                }
                color={statusColor(selected.status) as any}
                sx={{ fontWeight: 700, fontSize: 13, px: 1 }}
              />
            )}
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {selected && (
            <Grid container>
              {/* LEFT — Agent Info */}
              <Grid
                size={{ xs: 12, md: 4 }}
                sx={{
                  borderRight: { md: "1px solid" },
                  borderColor: { md: "divider" },
                  p: 2.5,
                }}
              >
                {/* Action buttons at top of left panel for pending */}
                {needsReview(selected) && (
                  <Box
                    sx={{
                      mb: 2.5,
                      p: 2,
                      bgcolor: "warning.lighter",
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "warning.light",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      color="warning.dark"
                      sx={{ mb: 1.5 }}
                    >
                      Action Required
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        flexDirection: "column",
                      }}
                    >
                      {canApprove && (
                        <Button
                          variant="contained"
                          color="success"
                          fullWidth
                          size="large"
                          startIcon={<CheckCircleOutlined />}
                          disabled={actionLoading === selected._id + "_approve"}
                          onClick={() => handleApprove(selected._id)}
                          sx={{ fontWeight: 700, py: 1.2 }}
                        >
                          ✓ Approve & Activate Agent
                        </Button>
                      )}
                      {canReject && (
                        <Button
                          variant="outlined"
                          color="error"
                          fullWidth
                          size="large"
                          startIcon={<CloseCircleOutlined />}
                          onClick={() => {
                            setRejectTarget(selected._id);
                            setRejectOpen(true);
                          }}
                          sx={{ fontWeight: 700, py: 1.2 }}
                        >
                          ✗ Reject KYC
                        </Button>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Agent Details */}
                <Typography
                  variant="overline"
                  color="text.secondary"
                  fontWeight={700}
                >
                  Agent Details
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                {[
                  ["Name", getAgentName(selected)],
                  ["Agency", getAgencyName(selected)],
                  [
                    "Email",
                    selected.agentEmail || selected.agentId?.email || "—",
                  ],
                  [
                    "Agent ID",
                    selected.agentCode || selected.agentId?.agentId || "—",
                  ],
                  ["Document Type", selected.documentType || "Aadhaar/PAN/GST"],
                  [
                    "Submitted",
                    selected.submittedAt || selected.createdAt
                      ? new Date(
                          selected.submittedAt || selected.createdAt,
                        ).toLocaleString("en-IN")
                      : "—",
                  ],
                  [
                    "Status",
                    selected.status === "submitted"
                      ? "Pending Review"
                      : selected.status,
                  ],
                ].map(([l, v]) => (
                  <Box key={l as string} sx={{ mb: 1.2 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {l}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {(v as string) || "—"}
                    </Typography>
                  </Box>
                ))}

                {/* Document Numbers */}
                {(selected.panNumber ||
                  selected.aadharNumber ||
                  selected.gstNumber ||
                  selected.bankName) && (
                  <>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      fontWeight={700}
                      sx={{ mt: 2, display: "block" }}
                    >
                      Document Numbers
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    {selected.panNumber && (
                      <Box sx={{ mb: 1.2 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          PAN Number
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          fontFamily="monospace"
                        >
                          {selected.panNumber}
                        </Typography>
                      </Box>
                    )}
                    {selected.aadharNumber && (
                      <Box sx={{ mb: 1.2 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Aadhaar Number
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          fontFamily="monospace"
                        >
                          {selected.aadharNumber}
                        </Typography>
                      </Box>
                    )}
                    {selected.gstNumber && (
                      <Box sx={{ mb: 1.2 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          GST Number
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          fontFamily="monospace"
                        >
                          {selected.gstNumber}
                        </Typography>
                      </Box>
                    )}
                    {selected.bankName && (
                      <Box sx={{ mb: 1.2 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Bank Details
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {selected.bankName}
                        </Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {selected.accountNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selected.ifscCode}
                        </Typography>
                      </Box>
                    )}
                  </>
                )}

                {/* Rejection note if rejected */}
                {selected.adminNote && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.5,
                      bgcolor: "error.lighter",
                      borderRadius: 1.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="error.dark"
                      fontWeight={700}
                      display="block"
                    >
                      Rejection Reason
                    </Typography>
                    <Typography variant="body2" color="error.dark">
                      {selected.adminNote}
                    </Typography>
                  </Box>
                )}
              </Grid>

              {/* RIGHT — Documents */}
              <Grid size={{ xs: 12, md: 8 }} sx={{ p: 2.5 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  fontWeight={700}
                >
                  Uploaded Documents
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {/* Check if any docs exist */}
                {!selected.panDocument &&
                !selected.aadharFront &&
                !selected.aadharBack &&
                !selected.gstDocument &&
                !selected.businessProof &&
                !selected.cancelledCheque &&
                (!selected.documents || selected.documents.length === 0) ? (
                  <Box
                    sx={{ textAlign: "center", py: 6, color: "text.secondary" }}
                  >
                    <FileImageOutlined style={{ fontSize: 48, opacity: 0.3 }} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      No documents uploaded yet
                    </Typography>
                    <Typography variant="caption">
                      Agent has not uploaded any files
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {selected.panDocument && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <DocViewer
                          label="PAN Card"
                          url={selected.panDocument}
                        />
                      </Grid>
                    )}
                    {selected.aadharFront && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <DocViewer
                          label="Aadhaar Front"
                          url={selected.aadharFront}
                        />
                      </Grid>
                    )}
                    {selected.aadharBack && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <DocViewer
                          label="Aadhaar Back"
                          url={selected.aadharBack}
                        />
                      </Grid>
                    )}
                    {selected.gstDocument && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <DocViewer
                          label="GST Certificate"
                          url={selected.gstDocument}
                        />
                      </Grid>
                    )}
                    {selected.businessProof && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <DocViewer
                          label="Business Proof"
                          url={selected.businessProof}
                        />
                      </Grid>
                    )}
                    {selected.cancelledCheque && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <DocViewer
                          label="Cancelled Cheque"
                          url={selected.cancelledCheque}
                        />
                      </Grid>
                    )}
                    {/* Legacy documents array */}
                    {selected.documents
                      ?.filter((d: any) => d)
                      .map((doc: any, i: number) => (
                        <Grid size={{ xs: 12, sm: 6 }} key={i}>
                          <DocViewer
                            label={`Document ${i + 1}`}
                            url={doc.url || doc}
                          />
                        </Grid>
                      ))}
                  </Grid>
                )}

                {/* Bottom action bar — also shown at bottom of docs for easy access */}
                {needsReview(selected) && (
                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      bgcolor: "grey.50",
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mr: "auto" }}
                    >
                      After reviewing all documents above, take action:
                    </Typography>
                    {canReject && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="large"
                        startIcon={<CloseCircleOutlined />}
                        onClick={() => {
                          setRejectTarget(selected._id);
                          setRejectOpen(true);
                        }}
                        sx={{ fontWeight: 700 }}
                      >
                        Reject
                      </Button>
                    )}
                    {canApprove && (
                      <Button
                        variant="contained"
                        color="success"
                        size="large"
                        startIcon={<CheckCircleOutlined />}
                        disabled={actionLoading === selected._id + "_approve"}
                        onClick={() => handleApprove(selected._id)}
                        sx={{ fontWeight: 700 }}
                      >
                        Approve & Activate
                      </Button>
                    )}
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button onClick={() => setViewOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reject KYC Submission</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Reason agent ko dikhega — clearly likho kya galat hai.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason *"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. The PAN card image is unclear. Kindly upload a clear photo again..."
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRejectOpen(false);
              setRejectReason("");
            }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleReject}
            disabled={!rejectReason.trim() || !!actionLoading}
          >
            Confirm Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.sev}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
