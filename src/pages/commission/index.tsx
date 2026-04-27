import { useEffect, useMemo, useState } from "react";
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
  Tooltip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Switch,
  Divider,
  InputAdornment,
  Stack,
  Card,
  CardContent,
  Autocomplete,
  Paper,
  Collapse,
  LinearProgress,
} from "@mui/material";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CalculatorOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  RiseOutlined,
  TagsOutlined,
  InfoCircleOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { commissionApi, agentsApi } from "../../api";
import MainCard from "../../components/MainCard";

// ── Type definitions for form state ─────────────────────────────
type RuleType =
  | "global"
  | "airline"
  | "route"
  | "agent"
  | "flight"
  | "hotel"
  | "insurance"
  | "seasonal"
  | "volume"
  | "all";

type CommissionType = "percentage" | "flat";
type ReleaseRule = "immediate" | "after_travel" | "manual";

interface RuleForm {
  name: string;
  description: string;
  type: RuleType;
  commissionType: CommissionType;
  commissionValue: string;
  minCommission: string;
  maxCommission: string;
  releaseRule: ReleaseRule;
  priority: string;
  // scope
  airline: string;
  fromCity: string;
  toCity: string;
  agentId: string;
  // volume
  minBookingsPerMonth: string;
  // validity (datetime-local strings)
  validFrom: string;
  validTo: string;
  // state
  isActive: boolean;
}

const emptyForm: RuleForm = {
  name: "",
  description: "",
  type: "global",
  commissionType: "percentage",
  commissionValue: "",
  minCommission: "0",
  maxCommission: "0",
  releaseRule: "immediate",
  priority: "0",
  airline: "",
  fromCity: "",
  toCity: "",
  agentId: "",
  minBookingsPerMonth: "0",
  validFrom: "",
  validTo: "",
  isActive: true,
};

// ── Helpers ─────────────────────────────────────────────────────
const RULE_TYPE_LABELS: Record<RuleType, string> = {
  global: "Global (All bookings)",
  airline: "Airline Specific",
  route: "Route Specific",
  agent: "Agent Specific",
  flight: "Product: Flight",
  hotel: "Product: Hotel",
  insurance: "Product: Insurance",
  seasonal: "Seasonal / Time-bound",
  volume: "Volume Based",
  all: "All Products",
};

const RULE_TYPE_COLORS: Record<RuleType, any> = {
  global: "default",
  airline: "primary",
  route: "info",
  agent: "secondary",
  flight: "primary",
  hotel: "success",
  insurance: "info",
  seasonal: "warning",
  volume: "error",
  all: "default",
};

const POPULAR_AIRLINES = [
  { code: "6E", name: "IndiGo" },
  { code: "AI", name: "Air India" },
  { code: "SG", name: "SpiceJet" },
  { code: "UK", name: "Vistara" },
  { code: "QP", name: "Akasa Air" },
  { code: "I5", name: "AIX Connect" },
  { code: "*", name: "All Airlines" },
];

const POPULAR_AIRPORTS = [
  "DEL",
  "BOM",
  "BLR",
  "MAA",
  "HYD",
  "CCU",
  "COK",
  "GOI",
  "PNQ",
  "AMD",
  "JAI",
  "LKO",
  "IXC",
  "GAU",
  "SXR",
  "IXR",
  "PAT",
  "BHO",
  "NAG",
  "VNS",
];

const fmtDateLocalInput = (isoOrDate?: string | Date) => {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatValue = (r: any) => {
  const v = r.commissionValue ?? r.value ?? 0;
  return r.commissionType === "percentage" || r.commissionType === "percent"
    ? `${v}%`
    : `₹${Number(v).toLocaleString("en-IN")}`;
};

// ── StatCard ────────────────────────────────────────────────────
function StatCard({ icon, title, value, color, sub }: any) {
  return (
    <Card sx={{ height: "100%", borderLeft: `4px solid ${color}` }}>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: `${color}15`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary">
              {sub}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════
export default function CommissionPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    sev: "success" as any,
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | RuleType>("all");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Preview calculator
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInput, setPreviewInput] = useState({
    bookingAmount: "10000",
    supplierCost: "9000",
    airline: "",
    fromCity: "",
    toCity: "",
    productType: "flight" as "flight" | "hotel" | "insurance",
  });
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────
  const fetchRules = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (typeFilter !== "all") params.type = typeFilter;
      if (activeFilter !== "all") params.isActive = activeFilter === "active";
      if (search.trim()) params.search = search.trim();

      const res = await commissionApi.getRules(params);
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];
      setRules(arr);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await commissionApi.getStats();
      setStats(res.data?.data ?? res.data);
    } catch {
      /* silent */
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await agentsApi.getAll({ limit: 500 });
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];
      setAgents(arr);
    } catch {
      setAgents([]);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchStats();
    fetchAgents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced re-fetch when filters change
  useEffect(() => {
    const t = setTimeout(fetchRules, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, activeFilter]);

  // ── Dialog handlers ─────────────────────────────────────────
  const openCreate = () => {
    setEditRule(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditRule(r);
    setForm({
      name: r.name || "",
      description: r.description || "",
      type: r.type || "global",
      commissionType:
        (r.commissionType === "percent"
          ? "percentage"
          : r.commissionType === "fixed"
            ? "flat"
            : r.commissionType) || "percentage",
      commissionValue: String(r.commissionValue ?? r.value ?? ""),
      minCommission: String(r.minCommission ?? 0),
      maxCommission: String(r.maxCommission ?? 0),
      releaseRule: r.releaseRule || "immediate",
      priority: String(r.priority ?? 0),
      airline: r.airline || "",
      fromCity: r.fromCity || "",
      toCity: r.toCity || "",
      agentId: r.agentId?._id || r.agentId || "",
      minBookingsPerMonth: String(r.minBookingsPerMonth ?? 0),
      validFrom: fmtDateLocalInput(r.validFrom),
      validTo: fmtDateLocalInput(r.validTo),
      isActive: r.isActive !== false,
    });
    setDialogOpen(true);
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return "Rule name is required";
    const val = Number(form.commissionValue);
    if (isNaN(val) || val < 0) return "Commission value must be 0 or more";
    if (form.commissionType === "percentage" && val > 100)
      return "Percentage cannot exceed 100%";
    if (form.type === "airline" && !form.airline.trim())
      return "Airline is required for airline-type rules";
    if (form.type === "route" && (!form.fromCity.trim() || !form.toCity.trim()))
      return "Both origin and destination cities are required for route rules";
    if (form.type === "agent" && !form.agentId)
      return "Please select an agent for agent-type rules";
    if (form.type === "seasonal" && (!form.validFrom || !form.validTo))
      return "Seasonal rules require Valid From and Valid To dates";
    if (form.validFrom && form.validTo && form.validFrom > form.validTo)
      return "“Valid From” must be before “Valid To”";
    const mn = Number(form.minCommission || 0);
    const mx = Number(form.maxCommission || 0);
    if (mx > 0 && mn > mx) return "Min Commission cannot exceed Max Commission";
    return null;
  };

  const handleSave = async () => {
    const err = validateForm();
    if (err) {
      setSnack({ open: true, msg: err, sev: "error" });
      return;
    }

    // Clean payload — strip blanks from optional scope fields
    const payload: any = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      commissionType: form.commissionType,
      commissionValue: Number(form.commissionValue),
      minCommission: Number(form.minCommission || 0),
      maxCommission: Number(form.maxCommission || 0),
      releaseRule: form.releaseRule,
      priority: Number(form.priority || 0),
      isActive: form.isActive,
    };
    if (form.airline) payload.airline = form.airline;
    if (form.fromCity) payload.fromCity = form.fromCity.toUpperCase();
    if (form.toCity) payload.toCity = form.toCity.toUpperCase();
    if (form.agentId) payload.agentId = form.agentId;
    if (form.minBookingsPerMonth)
      payload.minBookingsPerMonth = Number(form.minBookingsPerMonth);
    if (form.validFrom)
      payload.validFrom = new Date(form.validFrom).toISOString();
    if (form.validTo) payload.validTo = new Date(form.validTo).toISOString();

    setSaving(true);
    try {
      if (editRule) {
        await commissionApi.updateRule(editRule._id, payload);
        setSnack({
          open: true,
          msg: "Commission rule updated",
          sev: "success",
        });
      } else {
        await commissionApi.createRule(payload);
        setSnack({
          open: true,
          msg: "Commission rule created",
          sev: "success",
        });
      }
      setDialogOpen(false);
      fetchRules();
      fetchStats();
    } catch (err: any) {
      setSnack({
        open: true,
        msg: err?.response?.data?.message || "Failed to save rule",
        sev: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete rule "${name}"?\nThis cannot be undone.`))
      return;
    try {
      await commissionApi.deleteRule(id);
      setSnack({ open: true, msg: "Rule deleted", sev: "warning" });
      fetchRules();
      fetchStats();
    } catch {
      setSnack({ open: true, msg: "Failed to delete", sev: "error" });
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await commissionApi.toggleRule(id);
      fetchRules();
      fetchStats();
    } catch {
      setSnack({ open: true, msg: "Failed to toggle", sev: "error" });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await commissionApi.duplicateRule(id);
      setSnack({
        open: true,
        msg: "Rule duplicated (saved as inactive)",
        sev: "success",
      });
      fetchRules();
      fetchStats();
    } catch {
      setSnack({ open: true, msg: "Failed to duplicate", sev: "error" });
    }
  };

  // ── Preview calculator ──────────────────────────────────────
  const runPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await commissionApi.preview({
        bookingAmount: Number(previewInput.bookingAmount) || 0,
        supplierCost: Number(previewInput.supplierCost) || 0,
        airline: previewInput.airline || undefined,
        fromCity: previewInput.fromCity?.toUpperCase() || undefined,
        toCity: previewInput.toCity?.toUpperCase() || undefined,
        productType: previewInput.productType,
      });
      setPreviewResult(res.data?.data ?? res.data);
    } catch {
      setPreviewResult({ error: "Preview failed" });
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Conditional fields to show based on rule type ───────────
  const showAirlineField = ["airline"].includes(form.type);
  const showRouteFields = ["route"].includes(form.type);
  const showAgentField = ["agent"].includes(form.type);
  const showValidityReq = ["seasonal"].includes(form.type);
  const showVolumeField = ["volume"].includes(form.type);

  // ── Filtered + searched rules (client-side refinement) ──────
  const filteredRules = useMemo(() => rules, [rules]);

  return (
    <Box>
      {/* ── Header ─────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Commission Rules
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Configure how agents earn on every booking. Rules apply in priority
            order: Agent → Airline → Route → Seasonal → Product → Global.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<CalculatorOutlined />}
            onClick={() => {
              setPreviewOpen(true);
              setPreviewResult(null);
            }}
          >
            Preview Calculator
          </Button>
          <Button
            variant="outlined"
            startIcon={<ReloadOutlined />}
            onClick={() => {
              fetchRules();
              fetchStats();
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PlusOutlined />}
            onClick={openCreate}
          >
            Add Rule
          </Button>
        </Stack>
      </Box>

      {/* ── Stats Cards ────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<TagsOutlined />}
            title="Total Rules"
            value={stats?.total ?? "—"}
            color="#1976d2"
            sub={`${stats?.byType?.length ?? 0} different types`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<ThunderboltOutlined />}
            title="Active Rules"
            value={stats?.active ?? "—"}
            color="#2e7d32"
            sub={
              stats?.inactive ? `${stats.inactive} inactive` : "All operational"
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<RiseOutlined />}
            title="Most Used Rule"
            value={stats?.topUsed?.[0]?.name || "—"}
            color="#ed6c02"
            sub={
              stats?.topUsed?.[0]
                ? `Applied ${stats.topUsed[0].usageCount} times`
                : "No usage yet"
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<DollarOutlined />}
            title="Top Type"
            value={stats?.byType?.[0]?.type || "—"}
            color="#9c27b0"
            sub={stats?.byType?.[0] ? `${stats.byType[0].count} rules` : ""}
          />
        </Grid>
      </Grid>

      {/* ── Filter bar ─────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, airline, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch("")}>
                      <CloseOutlined />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <MenuItem value="all">All types</MenuItem>
                {(Object.keys(RULE_TYPE_LABELS) as RuleType[]).map((t) => (
                  <MenuItem key={t} value={t}>
                    {RULE_TYPE_LABELS[t]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active only</MenuItem>
                <MenuItem value="inactive">Inactive only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
            <Tooltip title="Results update as you type / change filters">
              <FilterOutlined style={{ fontSize: 20, color: "#666" }} />
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* ── How Priority Works — quick reference ──────────────── */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.light' }}>
        <Typography variant="subtitle2" color="info.dark" gutterBottom>
          📋 Commission Rules — Quick Reference
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" color="info.dark" display="block">
              <b>Priority order (highest wins):</b> Agent-specific (50+) → Airline-specific (10–49) → Route-specific (10–49) → Seasonal (10–49) → Global (0–9)
            </Typography>
            <Typography variant="caption" color="info.dark" display="block" sx={{ mt:0.5 }}>
              <b>Effect:</b> After a booking confirms, the matching rule automatically credits commission to the agent's wallet. Agents see it in their wallet history and on the e-ticket.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" color="info.dark" display="block">
              <b>Example setup:</b>
            </Typography>
            <Typography variant="caption" color="info.dark" display="block" sx={{ pl:1 }}>
              • "Base Commission" → Global, 3%, Priority 0 (applies to all)<br/>
              • "IndiGo Bonus" → Airline (IndiGo), 5%, Priority 10 (overrides global for IndiGo)<br/>
              • "Agent Rahul Special" → Agent-specific, 7%, Priority 50 (Rahul always gets 7%)
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Rules Table ────────────────────────────────────── */}
      <MainCard>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Rule Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Usage</TableCell>
                <TableCell>Validity</TableCell>
                <TableCell align="center">Active</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      {Array(10)
                        .fill(0)
                        .map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
              ) : filteredRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" gutterBottom>
                      {search || typeFilter !== "all" || activeFilter !== "all"
                        ? "No rules match your filters."
                        : "No commission rules configured yet."}
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PlusOutlined />}
                      onClick={openCreate}
                      sx={{ mt: 1.5 }}
                    >
                      Add First Rule
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRules.map((r: any, i: number) => {
                  const type = (r.type || "global") as RuleType;
                  const scopeLabel = r.airline
                    ? r.airline
                    : r.fromCity && r.toCity
                      ? `${r.fromCity} → ${r.toCity}`
                      : r.agentId?.agencyName
                        ? r.agentId.agencyName
                        : "—";
                  const validity =
                    r.validFrom || r.validTo
                      ? `${r.validFrom ? new Date(r.validFrom).toLocaleDateString() : "Any"} - ${r.validTo ? new Date(r.validTo).toLocaleDateString() : "Any"}`
                      : "Always";

                  return (
                    <TableRow key={r._id} hover>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{r.name}</Typography>
                        {r.description && (
                          <Typography variant="caption" color="text.secondary">
                            {r.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={RULE_TYPE_LABELS[type] || type}
                          size="small"
                          color={RULE_TYPE_COLORS[type] || "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{scopeLabel}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700} color="primary">
                          {formatValue(r)}
                        </Typography>
                        {(r.minCommission > 0 || r.maxCommission > 0) && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {r.minCommission > 0 && `min ₹${r.minCommission}`}
                            {r.minCommission > 0 &&
                              r.maxCommission > 0 &&
                              " · "}
                            {r.maxCommission > 0 && `max ₹${r.maxCommission}`}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.priority ?? 0}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {r.usageCount ?? 0}×
                        </Typography>
                        {r.lastUsedAt && (
                          <Typography variant="caption" color="text.secondary">
                            {new Date(r.lastUsedAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{validity}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          size="small"
                          checked={r.isActive !== false}
                          onChange={() => handleToggle(r._id)}
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
                          <Tooltip title="Duplicate">
                            <IconButton
                              size="small"
                              onClick={() => handleDuplicate(r._id)}
                            >
                              <CopyOutlined />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openEdit(r)}
                            >
                              <EditOutlined />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(r._id, r.name)}
                            >
                              <DeleteOutlined />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </MainCard>

      {/* ══════════════════════════════════════════════════ */}
      {/* Create / Edit Dialog                                 */}
      {/* ══════════════════════════════════════════════════ */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          {editRule ? "Edit Commission Rule" : "Create Commission Rule"}
          <Typography variant="caption" color="text.secondary" display="block">
            Rules with higher priority win when multiple match. Agent-specific
            always beats generic.
          </Typography>
        </DialogTitle>
        {/* How commission works — inline explainer */}
        <Box sx={{ mx:3, mt:1, mb:0, p:2, bgcolor:'primary.lighter', borderRadius:2, border:'1px solid', borderColor:'primary.light' }}>
          <Typography variant="caption" color="primary.dark" fontWeight={700} display="block" gutterBottom>
            💡 How Commission Rules Work
          </Typography>
          <Typography variant="caption" color="primary.dark" display="block" sx={{ mb:0.5 }}>
            <b>Rule Type</b> decides <i>which bookings</i> this rule applies to. Examples:
          </Typography>
          <Typography variant="caption" color="primary.dark" display="block" sx={{ mb:0.5, pl:1.5 }}>
            • <b>Global</b> → applies to ALL bookings (use as your base/default rate)<br/>
            • <b>Airline Specific</b> → only when agent books that airline (e.g. IndiGo gets 3%)<br/>
            • <b>Agent Specific</b> → only for one agent (your top agent gets extra 2%)<br/>
            • <b>Route Specific</b> → only DEL→BOM bookings get this rate<br/>
            • <b>Seasonal</b> → only between two dates (e.g. festive season bonus)
          </Typography>
          <Typography variant="caption" color="primary.dark" display="block" sx={{ mb:0.5 }}>
            <b>Priority (0–100)</b>: When multiple rules match, the <b>highest priority wins</b>.
            Set Global to 0, Airline-specific to 10, Agent-specific to 50 — then agent-specific always overrides.
          </Typography>
          <Typography variant="caption" color="primary.dark" display="block">
            <b>Effect on ticket</b>: After booking confirms, commission is credited to the agent's wallet automatically.
            Agent sees it in their wallet & on the ticket as "Commission Earned".
          </Typography>
        </Box>
        {saving && <LinearProgress />}
        <DialogContent dividers>
          <Grid container spacing={2.5} sx={{ mt: 0.25 }}>
            {/* Basic info */}
            <Grid size={12}>
              <Typography variant="overline" color="text.secondary">
                Basic info
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label="Rule Name"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g., IndiGo Q1 Special Commission"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Priority"
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value }))
                }
                helperText="Higher wins (0=lowest, 100=highest). Global=0, Airline=10, Agent=50"
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Description (optional)"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                multiline
                rows={2}
                placeholder="Internal note, e.g., Contract rate Jan-Mar 2026"
              />
            </Grid>

            {/* Scope selector */}
            <Grid size={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>
            <Grid size={12}>
              <Typography variant="overline" color="text.secondary">
                Rule scope
              </Typography>
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Rule Type</InputLabel>
                <Select
                  label="Rule Type"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value as RuleType }))
                  }
                >
                  {(Object.keys(RULE_TYPE_LABELS) as RuleType[]).map((t) => (
                    <MenuItem key={t} value={t}>
                      {RULE_TYPE_LABELS[t]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Conditional scope fields */}
            <Collapse in={showAirlineField} sx={{ width: "100%" }}>
              <Grid size={12} sx={{ mt: 2 }}>
                <Autocomplete
                  freeSolo
                  options={POPULAR_AIRLINES}
                  getOptionLabel={(o) =>
                    typeof o === "string" ? o : `${o.name} (${o.code})`
                  }
                  value={form.airline}
                  onInputChange={(_, v) =>
                    setForm((f) => ({ ...f, airline: v || "" }))
                  }
                  onChange={(_, v) => {
                    if (v && typeof v !== "string") {
                      setForm((f) => ({ ...f, airline: v.name }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Airline"
                      required
                      placeholder="e.g., IndiGo or 6E (use * for all)"
                    />
                  )}
                />
              </Grid>
            </Collapse>

            <Collapse in={showRouteFields} sx={{ width: "100%" }}>
              <Grid container spacing={2} sx={{ mt: 0.1 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    freeSolo
                    options={POPULAR_AIRPORTS}
                    value={form.fromCity}
                    onInputChange={(_, v) =>
                      setForm((f) => ({
                        ...f,
                        fromCity: (v || "").toUpperCase(),
                      }))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="From City/Airport"
                        required
                        placeholder="e.g., DEL"
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    freeSolo
                    options={POPULAR_AIRPORTS}
                    value={form.toCity}
                    onInputChange={(_, v) =>
                      setForm((f) => ({
                        ...f,
                        toCity: (v || "").toUpperCase(),
                      }))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="To City/Airport"
                        required
                        placeholder="e.g., BOM"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Collapse>

            <Collapse in={showAgentField} sx={{ width: "100%" }}>
              <Grid size={12} sx={{ mt: 2 }}>
                <FormControl fullWidth required>
                  <InputLabel>Agent</InputLabel>
                  <Select
                    label="Agent"
                    value={form.agentId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, agentId: e.target.value }))
                    }
                  >
                    {agents.map((a: any) => (
                      <MenuItem key={a._id} value={a._id}>
                        {a.agencyName} ({a.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Collapse>

            <Collapse in={showVolumeField} sx={{ width: "100%" }}>
              <Grid size={12} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Minimum Bookings Per Month"
                  type="number"
                  value={form.minBookingsPerMonth}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      minBookingsPerMonth: e.target.value,
                    }))
                  }
                  helperText="Rule activates for agents hitting this monthly threshold"
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Collapse>

            {/* Commission math */}
            <Grid size={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>
            <Grid size={12}>
              <Typography variant="overline" color="text.secondary">
                Commission amount
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Commission Type</InputLabel>
                <Select
                  label="Commission Type"
                  value={form.commissionType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      commissionType: e.target.value as CommissionType,
                    }))
                  }
                >
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                  <MenuItem value="flat">Flat Amount (₹)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                required
                label={
                  form.commissionType === "percentage"
                    ? "Commission Value (%)"
                    : "Commission Value (₹)"
                }
                type="number"
                value={form.commissionValue}
                onChange={(e) =>
                  setForm((f) => ({ ...f, commissionValue: e.target.value }))
                }
                inputProps={{
                  min: 0,
                  max: form.commissionType === "percentage" ? 100 : undefined,
                  step: 0.01,
                }}
                helperText={
                  form.commissionType === "percentage"
                    ? "e.g., 3 means agent earns 3% of total booking"
                    : "e.g., 150 means agent earns ₹150 flat per booking"
                }
                InputProps={{
                  startAdornment:
                    form.commissionType === "flat" ? (
                      <InputAdornment position="start">₹</InputAdornment>
                    ) : undefined,
                  endAdornment:
                    form.commissionType === "percentage" ? (
                      <InputAdornment position="end">%</InputAdornment>
                    ) : undefined,
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Min Commission (₹)"
                type="number"
                value={form.minCommission}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minCommission: e.target.value }))
                }
                helperText="Floor — even if % gives less (0 = no floor)"
                inputProps={{ min: 0 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Max Commission (₹)"
                type="number"
                value={form.maxCommission}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxCommission: e.target.value }))
                }
                helperText="Ceiling — even if % gives more (0 = no cap)"
                inputProps={{ min: 0 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Payout timing */}
            <Grid size={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>
            <Grid size={12}>
              <Typography variant="overline" color="text.secondary">
                Payout & validity
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Release Rule</InputLabel>
                <Select
                  label="Release Rule"
                  value={form.releaseRule}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      releaseRule: e.target.value as ReleaseRule,
                    }))
                  }
                >
                  <MenuItem value="immediate">
                    Immediate (wallet credit on booking)
                  </MenuItem>
                  <MenuItem value="after_travel">
                    After travel completion
                  </MenuItem>
                  <MenuItem value="manual">Manual (admin releases)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="datetime-local"
                label={`Valid From${showValidityReq ? " *" : ""}`}
                InputLabelProps={{ shrink: true }}
                value={form.validFrom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, validFrom: e.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="datetime-local"
                label={`Valid To${showValidityReq ? " *" : ""}`}
                InputLabelProps={{ shrink: true }}
                value={form.validTo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, validTo: e.target.value }))
                }
              />
            </Grid>

            {/* Active toggle */}
            <Grid size={12}>
              <Alert severity="info" icon={<InfoCircleOutlined />}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">
                    Active rules are applied to live bookings. Inactive rules
                    are saved but skipped.
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {form.isActive ? "Active" : "Inactive"}
                    </Typography>
                    <Switch
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isActive: e.target.checked }))
                      }
                    />
                  </Box>
                </Stack>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editRule ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════ */}
      {/* Preview Calculator Dialog                            */}
      {/* ══════════════════════════════════════════════════ */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalculatorOutlined />
            <Typography variant="h6">Commission Preview Calculator</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Simulate a booking to see which rule would apply and how much
            commission is earned. Does not affect live data.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.1 }}>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Booking Amount"
                type="number"
                value={previewInput.bookingAmount}
                onChange={(e) =>
                  setPreviewInput((p) => ({
                    ...p,
                    bookingAmount: e.target.value,
                  }))
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Supplier Cost"
                type="number"
                value={previewInput.supplierCost}
                onChange={(e) =>
                  setPreviewInput((p) => ({
                    ...p,
                    supplierCost: e.target.value,
                  }))
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
                helperText="Airline/hotel's actual rate"
              />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Product</InputLabel>
                <Select
                  label="Product"
                  value={previewInput.productType}
                  onChange={(e) =>
                    setPreviewInput((p) => ({
                      ...p,
                      productType: e.target.value as any,
                    }))
                  }
                >
                  <MenuItem value="flight">Flight</MenuItem>
                  <MenuItem value="hotel">Hotel</MenuItem>
                  <MenuItem value="insurance">Insurance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <Autocomplete
                freeSolo
                options={POPULAR_AIRLINES.map((a) => a.name)}
                value={previewInput.airline}
                onInputChange={(_, v) =>
                  setPreviewInput((p) => ({ ...p, airline: v || "" }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Airline (optional)"
                    placeholder="e.g., IndiGo"
                  />
                )}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="From (optional)"
                value={previewInput.fromCity}
                onChange={(e) =>
                  setPreviewInput((p) => ({
                    ...p,
                    fromCity: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="DEL"
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="To (optional)"
                value={previewInput.toCity}
                onChange={(e) =>
                  setPreviewInput((p) => ({
                    ...p,
                    toCity: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="BOM"
              />
            </Grid>
            <Grid size={12}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={runPreview}
                disabled={previewLoading}
                startIcon={<ThunderboltOutlined />}
              >
                {previewLoading ? "Calculating…" : "Calculate"}
              </Button>
            </Grid>

            {/* Result card */}
            {previewResult && (
              <Grid size={12}>
                <Card
                  variant="outlined"
                  sx={{
                    bgcolor: previewResult.error
                      ? "error.light"
                      : "success.light",
                    borderColor: previewResult.error
                      ? "error.main"
                      : "success.main",
                  }}
                >
                  <CardContent>
                    {previewResult.error ? (
                      <Typography color="error">
                        {previewResult.error}
                      </Typography>
                    ) : (
                      <>
                        <Typography variant="overline" color="text.secondary">
                          Result
                        </Typography>
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2">
                              Booking amount:
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              ₹
                              {Number(
                                previewInput.bookingAmount,
                              ).toLocaleString("en-IN")}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2">
                              Supplier cost:
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              ₹
                              {Number(previewInput.supplierCost).toLocaleString(
                                "en-IN",
                              )}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2">
                              Total margin:
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              ₹
                              {Number(previewResult.margin ?? 0).toLocaleString(
                                "en-IN",
                              )}
                            </Typography>
                          </Stack>
                          <Divider sx={{ my: 0.5 }} />
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body1" fontWeight={700}>
                              Agent earns:
                            </Typography>
                            <Typography
                              variant="h6"
                              color="success.dark"
                              fontWeight={700}
                            >
                              ₹
                              {Number(
                                previewResult.agentCommission ?? 0,
                              ).toLocaleString("en-IN")}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body1" fontWeight={700}>
                              Platform earns:
                            </Typography>
                            <Typography variant="h6" fontWeight={700}>
                              ₹
                              {Number(
                                previewResult.platformCommission ?? 0,
                              ).toLocaleString("en-IN")}
                            </Typography>
                          </Stack>
                          {previewResult.appliedRule && (
                            <>
                              <Divider sx={{ my: 0.5 }} />
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                              >
                                <Typography variant="caption">
                                  Matched rule:
                                </Typography>
                                <Chip
                                  size="small"
                                  label={`${previewResult.appliedRule.name} (${previewResult.appliedRule.type})`}
                                  color="primary"
                                />
                              </Stack>
                            </>
                          )}
                          {!previewResult.appliedRule && (
                            <Typography variant="caption" color="warning.dark">
                              ⚠ No matching rule found — agent gets 0
                              commission.
                            </Typography>
                          )}
                        </Stack>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.sev}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}