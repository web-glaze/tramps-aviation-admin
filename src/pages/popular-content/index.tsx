import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Snackbar,
} from "@mui/material";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  StopOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import apiClient from "../../api";

// ── API helpers ───────────────────────────────────────────────────────────────
const api = {
  getFlights: () => apiClient.get("/popular/admin/flights"),
  createFlight: (d: any) => apiClient.post("/popular/admin/flights", d),
  updateFlight: (id: string, d: any) =>
    apiClient.put(`/popular/admin/flights/${id}`, d),
  deleteFlight: (id: string) =>
    apiClient.delete(`/popular/admin/flights/${id}`),
  toggleFlight: (id: string) =>
    apiClient.patch(`/popular/admin/flights/${id}/toggle`),
  getHotels: () => apiClient.get("/popular/admin/hotels"),
  createHotel: (d: any) => apiClient.post("/popular/admin/hotels", d),
  updateHotel: (id: string, d: any) =>
    apiClient.put(`/popular/admin/hotels/${id}`, d),
  deleteHotel: (id: string) => apiClient.delete(`/popular/admin/hotels/${id}`),
  toggleHotel: (id: string) =>
    apiClient.patch(`/popular/admin/hotels/${id}/toggle`),
  getCities: () => apiClient.get("/popular/admin/cities"),
  createCity: (d: any) => apiClient.post("/popular/admin/cities", d),
  updateCity: (id: string, d: any) =>
    apiClient.put(`/popular/admin/cities/${id}`, d),
  deleteCity: (id: string) => apiClient.delete(`/popular/admin/cities/${id}`),
  getCountries: () => apiClient.get("/popular/admin/countries"),
  createCountry: (d: any) => apiClient.post("/popular/admin/countries", d),
  updateCountry: (id: string, d: any) =>
    apiClient.put(`/popular/admin/countries/${id}`, d),
  deleteCountry: (id: string) =>
    apiClient.delete(`/popular/admin/countries/${id}`),
};

// ── Confirm delete dialog ─────────────────────────────────────────────────────
function ConfirmDelete({ open, name, onConfirm, onClose }: any) {
  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete "{name}"?</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">This cannot be undone.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Generic table + form hook ─────────────────────────────────────────────────
function useTab(
  fetchFn: () => Promise<any>,
  createFn: (d: any) => Promise<any>,
  updateFn: (id: string, d: any) => Promise<any>,
  deleteFn: (id: string) => Promise<any>,
  toggleFn?: (id: string) => Promise<any>,
) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; item?: any }>({
    open: false,
  });
  const [delItem, setDelItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetchFn();
      // Backend wraps: { success, statusCode, data: [...] }
      const raw = (r as any)?.data;
      const arr = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];
      setRows(arr);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          "Failed to load — check backend connection",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = (defaults: any = {}) => {
    setForm({ isActive: true, sortOrder: rows.length, ...defaults });
    setDialog({ open: true });
  };
  const openEdit = (item: any) => {
    setForm({ ...item });
    setDialog({ open: true, item });
  };

  const handleSave = async () => {
    try {
      if (dialog.item?._id) await updateFn(dialog.item._id, form);
      else await createFn(form);
      setDialog({ open: false });
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Error saving");
    }
  };

  const handleDelete = async () => {
    if (!delItem?._id) return;
    try {
      await deleteFn(delItem._id);
    } catch {}
    setDelItem(null);
    load();
  };

  const handleToggle = async (id: string) => {
    if (!toggleFn) return;
    try {
      await toggleFn(id);
      load();
    } catch {}
  };

  return {
    rows,
    loading,
    error,
    dialog,
    setDialog,
    delItem,
    setDelItem,
    form,
    setForm,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    handleToggle,
    load,
  };
}

// ── FLIGHTS tab ───────────────────────────────────────────────────────────────
function FlightRoutesTab() {
  const t = useTab(
    api.getFlights,
    api.createFlight,
    api.updateFlight,
    api.deleteFlight,
    api.toggleFlight,
  );

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          ✈️ Flight Routes ({t.rows.length})
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            startIcon={<ReloadOutlined />}
            onClick={t.load}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
          <Button
            startIcon={<PlusOutlined />}
            onClick={() => t.openCreate()}
            variant="contained"
            size="small"
          >
            Add Route
          </Button>
        </Box>
      </Box>

      {t.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t.error}
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }} icon={false}>
        💡 Routes appear on the homepage as quick-links. Toggle <b>Active</b> to
        show/hide without deleting.
      </Alert>

      {t.loading ? (
        <CircularProgress size={24} />
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell>
                  <b>Route</b>
                </TableCell>
                <TableCell>
                  <b>Price</b>
                </TableCell>
                <TableCell>
                  <b>Airline</b>
                </TableCell>
                <TableCell>
                  <b>Duration</b>
                </TableCell>
                <TableCell>
                  <b>Order</b>
                </TableCell>
                <TableCell>
                  <b>Status</b>
                </TableCell>
                <TableCell>
                  <b>Actions</b>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {t.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No routes yet. Click "Add Route" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {t.rows.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {r.fromCity} ({r.from}) → {r.toCity} ({r.to})
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="error" fontWeight={700}>
                      {r.price || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.airline || "—"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{r.duration || "—"}</TableCell>
                  <TableCell>{r.sortOrder ?? 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.isActive ? "Active" : "Hidden"}
                      color={r.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip
                      title={
                        r.isActive ? "Hide from homepage" : "Show on homepage"
                      }
                    >
                      <IconButton
                        size="small"
                        onClick={() => t.handleToggle(r._id)}
                      >
                        {r.isActive ? (
                          <StopOutlined style={{ color: "#f57c00" }} />
                        ) : (
                          <CheckCircleOutlined style={{ color: "#388e3c" }} />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => t.openEdit(r)}>
                        <EditOutlined />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        style={{ color: "#d32f2f" }}
                        onClick={() => t.setDelItem(r)}
                      >
                        <DeleteOutlined />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Create / Edit dialog */}
      <Dialog
        open={t.dialog.open}
        onClose={() => t.setDialog({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t.dialog.item ? "Edit Route" : "Add Popular Flight Route"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {(
              [
                ["from", "From IATA (e.g. DEL)"],
                ["fromCity", "From City"],
                ["to", "To IATA (e.g. BOM)"],
                ["toCity", "To City"],
                ["price", "Price (e.g. ₹2,199)"],
                ["airline", "Airline"],
                ["duration", "Duration (e.g. 2h 10m)"],
              ] as [string, string][]
            ).map(([k, l]) => (
              <Grid size={6} key={k}>
                <TextField
                  label={l}
                  value={t.form[k] || ""}
                  onChange={(e) =>
                    t.setForm({ ...t.form, [k]: e.target.value })
                  }
                  fullWidth
                  size="small"
                />
              </Grid>
            ))}
            <Grid size={6}>
              <TextField
                label="Sort Order"
                type="number"
                value={t.form.sortOrder ?? 0}
                onChange={(e) =>
                  t.setForm({ ...t.form, sortOrder: Number(e.target.value) })
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Image URL (optional)"
                value={t.form.imageUrl || ""}
                onChange={(e) =>
                  t.setForm({ ...t.form, imageUrl: e.target.value })
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={t.form.isActive !== false}
                    onChange={(e) =>
                      t.setForm({ ...t.form, isActive: e.target.checked })
                    }
                  />
                }
                label="Active — visible on homepage"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => t.setDialog({ open: false })}>Cancel</Button>
          <Button variant="contained" onClick={t.handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDelete
        open={!!t.delItem}
        name={t.delItem ? `${t.delItem.fromCity} → ${t.delItem.toCity}` : ""}
        onConfirm={t.handleDelete}
        onClose={() => t.setDelItem(null)}
      />
    </Box>
  );
}

// ── HOTELS tab ────────────────────────────────────────────────────────────────
function HotelsTab() {
  const t = useTab(
    api.getHotels,
    api.createHotel,
    api.updateHotel,
    api.deleteHotel,
    api.toggleHotel,
  );

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          🏨 Popular Hotels ({t.rows.length})
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            startIcon={<ReloadOutlined />}
            onClick={t.load}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
          <Button
            startIcon={<PlusOutlined />}
            onClick={() => t.openCreate({ stars: 4 })}
            variant="contained"
            size="small"
          >
            Add Hotel
          </Button>
        </Box>
      </Box>
      {t.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t.error}
        </Alert>
      )}
      {t.loading ? (
        <CircularProgress size={24} />
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell>
                  <b>Hotel</b>
                </TableCell>
                <TableCell>
                  <b>City</b>
                </TableCell>
                <TableCell>
                  <b>Stars</b>
                </TableCell>
                <TableCell>
                  <b>Price/Night</b>
                </TableCell>
                <TableCell>
                  <b>Rating</b>
                </TableCell>
                <TableCell>
                  <b>Status</b>
                </TableCell>
                <TableCell>
                  <b>Actions</b>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {t.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No hotels yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {t.rows.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {r.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {r.city}
                    {r.country ? `, ${r.country}` : ""}
                  </TableCell>
                  <TableCell>{"★".repeat(r.stars || 4)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="error" fontWeight={700}>
                      {r.pricePerNight || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.rating || "—"}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.isActive ? "Active" : "Hidden"}
                      color={r.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={r.isActive ? "Hide" : "Show"}>
                      <IconButton
                        size="small"
                        onClick={() => t.handleToggle(r._id)}
                      >
                        {r.isActive ? (
                          <StopOutlined style={{ color: "#f57c00" }} />
                        ) : (
                          <CheckCircleOutlined style={{ color: "#388e3c" }} />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => t.openEdit(r)}>
                        <EditOutlined />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        style={{ color: "#d32f2f" }}
                        onClick={() => t.setDelItem(r)}
                      >
                        <DeleteOutlined />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      <Dialog
        open={t.dialog.open}
        onClose={() => t.setDialog({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t.dialog.item ? "Edit Hotel" : "Add Popular Hotel"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {(
              [
                ["name", "Hotel Name"],
                ["city", "City"],
                ["country", "Country"],
                ["pricePerNight", "Price/Night (e.g. ₹12,000)"],
                ["rating", "Rating (e.g. 4.8)"],
              ] as [string, string][]
            ).map(([k, l]) => (
              <Grid size={6} key={k}>
                <TextField
                  label={l}
                  value={t.form[k] || ""}
                  onChange={(e) =>
                    t.setForm({ ...t.form, [k]: e.target.value })
                  }
                  fullWidth
                  size="small"
                />
              </Grid>
            ))}
            <Grid size={6}>
              <TextField
                label="Stars (3-5)"
                type="number"
                inputProps={{ min: 3, max: 5 }}
                value={t.form.stars || 4}
                onChange={(e) =>
                  t.setForm({ ...t.form, stars: Number(e.target.value) })
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Sort Order"
                type="number"
                value={t.form.sortOrder ?? 0}
                onChange={(e) =>
                  t.setForm({ ...t.form, sortOrder: Number(e.target.value) })
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Image URL (optional)"
                value={t.form.imageUrl || ""}
                onChange={(e) =>
                  t.setForm({ ...t.form, imageUrl: e.target.value })
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={t.form.isActive !== false}
                    onChange={(e) =>
                      t.setForm({ ...t.form, isActive: e.target.checked })
                    }
                  />
                }
                label="Active — visible on homepage"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => t.setDialog({ open: false })}>Cancel</Button>
          <Button variant="contained" onClick={t.handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDelete
        open={!!t.delItem}
        name={t.delItem?.name || ""}
        onConfirm={t.handleDelete}
        onClose={() => t.setDelItem(null)}
      />
    </Box>
  );
}

// ── CITIES tab ────────────────────────────────────────────────────────────────
function CitiesTab() {
  const t = useTab(
    api.getCities,
    api.createCity,
    api.updateCity,
    api.deleteCity,
  );

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          🏙️ Popular Cities ({t.rows.length})
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            startIcon={<ReloadOutlined />}
            onClick={t.load}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
          <Button
            startIcon={<PlusOutlined />}
            onClick={() => t.openCreate()}
            variant="contained"
            size="small"
          >
            Add City
          </Button>
        </Box>
      </Box>
      {t.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t.error}
        </Alert>
      )}
      {t.loading ? (
        <CircularProgress size={24} />
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell>
                  <b>City</b>
                </TableCell>
                <TableCell>
                  <b>Country</b>
                </TableCell>
                <TableCell>
                  <b>Tagline</b>
                </TableCell>
                <TableCell>
                  <b>Airport</b>
                </TableCell>
                <TableCell>
                  <b>Status</b>
                </TableCell>
                <TableCell>
                  <b>Actions</b>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {t.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No cities yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {t.rows.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {r.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.country}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {r.tagline}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.airportCode || "—"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.isActive ? "Active" : "Hidden"}
                      color={r.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => t.openEdit(r)}>
                        <EditOutlined />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        style={{ color: "#d32f2f" }}
                        onClick={() => t.setDelItem(r)}
                      >
                        <DeleteOutlined />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      <Dialog
        open={t.dialog.open}
        onClose={() => t.setDialog({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t.dialog.item ? "Edit City" : "Add Popular City"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {(
              [
                ["name", "City Name"],
                ["country", "Country"],
                ["tagline", "Tagline (e.g. Beach Paradise)"],
                ["airportCode", "Airport Code (e.g. GOI)"],
              ] as [string, string][]
            ).map(([k, l]) => (
              <Grid size={6} key={k}>
                <TextField
                  label={l}
                  value={t.form[k] || ""}
                  onChange={(e) =>
                    t.setForm({ ...t.form, [k]: e.target.value })
                  }
                  fullWidth
                  size="small"
                />
              </Grid>
            ))}
            <Grid size={12}>
              <TextField
                label="Image URL (optional)"
                value={t.form.imageUrl || ""}
                onChange={(e) =>
                  t.setForm({ ...t.form, imageUrl: e.target.value })
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Sort Order"
                type="number"
                value={t.form.sortOrder ?? 0}
                onChange={(e) =>
                  t.setForm({ ...t.form, sortOrder: Number(e.target.value) })
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={t.form.isActive !== false}
                    onChange={(e) =>
                      t.setForm({ ...t.form, isActive: e.target.checked })
                    }
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => t.setDialog({ open: false })}>Cancel</Button>
          <Button variant="contained" onClick={t.handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDelete
        open={!!t.delItem}
        name={t.delItem?.name || ""}
        onConfirm={t.handleDelete}
        onClose={() => t.setDelItem(null)}
      />
    </Box>
  );
}

// ── COUNTRIES tab ─────────────────────────────────────────────────────────────
function CountriesTab() {
  const t = useTab(
    api.getCountries,
    api.createCountry,
    api.updateCountry,
    api.deleteCountry,
  );

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          🌍 Popular Countries ({t.rows.length})
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            startIcon={<ReloadOutlined />}
            onClick={t.load}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
          <Button
            startIcon={<PlusOutlined />}
            onClick={() => t.openCreate()}
            variant="contained"
            size="small"
          >
            Add Country
          </Button>
        </Box>
      </Box>
      {t.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t.error}
        </Alert>
      )}
      {t.loading ? (
        <CircularProgress size={24} />
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell>
                  <b>Flag</b>
                </TableCell>
                <TableCell>
                  <b>Country</b>
                </TableCell>
                <TableCell>
                  <b>Tagline</b>
                </TableCell>
                <TableCell>
                  <b>Status</b>
                </TableCell>
                <TableCell>
                  <b>Actions</b>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {t.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No countries yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {t.rows.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>
                    <Typography fontSize={22}>{r.flag || "🌍"}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {r.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {r.tagline}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.isActive ? "Active" : "Hidden"}
                      color={r.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => t.openEdit(r)}>
                        <EditOutlined />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        style={{ color: "#d32f2f" }}
                        onClick={() => t.setDelItem(r)}
                      >
                        <DeleteOutlined />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      <Dialog
        open={t.dialog.open}
        onClose={() => t.setDialog({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t.dialog.item ? "Edit Country" : "Add Popular Country"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {(
              [
                ["name", "Country Name"],
                ["flag", "Flag Emoji (e.g. 🇲🇻)"],
                ["tagline", "Tagline (e.g. Island Paradise)"],
              ] as [string, string][]
            ).map(([k, l]) => (
              <Grid size={6} key={k}>
                <TextField
                  label={l}
                  value={t.form[k] || ""}
                  onChange={(e) =>
                    t.setForm({ ...t.form, [k]: e.target.value })
                  }
                  fullWidth
                  size="small"
                />
              </Grid>
            ))}
            <Grid size={12}>
              <TextField
                label="Image URL (optional)"
                value={t.form.imageUrl || ""}
                onChange={(e) =>
                  t.setForm({ ...t.form, imageUrl: e.target.value })
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Sort Order"
                type="number"
                value={t.form.sortOrder ?? 0}
                onChange={(e) =>
                  t.setForm({ ...t.form, sortOrder: Number(e.target.value) })
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={t.form.isActive !== false}
                    onChange={(e) =>
                      t.setForm({ ...t.form, isActive: e.target.checked })
                    }
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => t.setDialog({ open: false })}>Cancel</Button>
          <Button variant="contained" onClick={t.handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDelete
        open={!!t.delItem}
        name={t.delItem?.name || ""}
        onConfirm={t.handleDelete}
        onClose={() => t.setDelItem(null)}
      />
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

// ── Seed Button ───────────────────────────────────────────────────────────────
function SeedButton({ onMessage }: { onMessage: (m: string) => void }) {
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      size="small"
      variant="outlined"
      sx={{ ml: 2 }}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await apiClient.post("/popular/admin/seed");
          onMessage("✅ Default data loaded! Refresh each tab to see.");
        } catch (e: any) {
          onMessage("Error: " + (e?.response?.data?.message || "Seed failed"));
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "⏳ Loading…" : "🌱 Load Default Data"}
    </Button>
  );
}

export default function PopularContentPage() {
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState("");
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          🌟 Popular Content
        </Typography>
        <Typography color="text.secondary">
          Manage what appears on the homepage. Sections only appear when they
          have active items. Empty sections are automatically hidden from users.
        </Typography>
        <Alert severity="success" sx={{ mt: 2 }} icon={false}>
          ✅ <b>How it works:</b> Add items here → they show on homepage
          instantly. Toggle OFF to hide without deleting. No items = section not
          shown.
        </Alert>
        <Alert severity="info" sx={{ mt: 2 }} icon={false}>
          🌱 <b>First time?</b> Click "Load Default Data" to pre-fill sample
          routes, cities and countries.
          <SeedButton onMessage={setSnack} />
        </Alert>
      </Box>

      <Card
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2 }}
        >
          <Tab label="✈️ Flight Routes" />
          <Tab label="🏨 Hotels" />
          <Tab label="🏙️ Cities" />
          <Tab label="🌍 Countries" />
        </Tabs>
        <CardContent sx={{ p: 3 }}>
          {tab === 0 && <FlightRoutesTab />}
          {tab === 1 && <HotelsTab />}
          {tab === 2 && <CitiesTab />}
          {tab === 3 && <CountriesTab />}
        </CardContent>
      </Card>
      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack("")}
        message={snack}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />
    </Box>
  );
}