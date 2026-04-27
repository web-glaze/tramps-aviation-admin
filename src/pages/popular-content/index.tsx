import React, { useState, useEffect, useRef } from "react";
import {
  Box, Typography, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Table, TableHead, TableRow,
  TableCell, TableBody, Paper, Chip, Alert, CircularProgress, Tooltip,
  Grid, Card, CardContent, Switch, FormControlLabel, Snackbar,
} from "@mui/material";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  CheckCircleOutlined, StopOutlined, UploadOutlined, DownloadOutlined,
} from "@ant-design/icons";
import apiClient, { settingsApi } from "../../api";

// ── API helpers ───────────────────────────────────────────────────────────────
const api = {
  getFlights:    ()                  => apiClient.get("/popular/admin/flights"),
  createFlight:  (d: any)            => apiClient.post("/popular/admin/flights", d),
  updateFlight:  (id: string, d: any)=> apiClient.put(`/popular/admin/flights/${id}`, d),
  deleteFlight:  (id: string)        => apiClient.delete(`/popular/admin/flights/${id}`),
  toggleFlight:  (id: string)        => apiClient.patch(`/popular/admin/flights/${id}/toggle`),

  getHotels:     ()                  => apiClient.get("/popular/admin/hotels"),
  createHotel:   (d: any)            => apiClient.post("/popular/admin/hotels", d),
  updateHotel:   (id: string, d: any)=> apiClient.put(`/popular/admin/hotels/${id}`, d),
  deleteHotel:   (id: string)        => apiClient.delete(`/popular/admin/hotels/${id}`),
  toggleHotel:   (id: string)        => apiClient.patch(`/popular/admin/hotels/${id}/toggle`),

  getCities:     ()                  => apiClient.get("/popular/admin/cities"),
  createCity:    (d: any)            => apiClient.post("/popular/admin/cities", d),
  updateCity:    (id: string, d: any)=> apiClient.put(`/popular/admin/cities/${id}`, d),
  deleteCity:    (id: string)        => apiClient.delete(`/popular/admin/cities/${id}`),

  getCountries:  ()                  => apiClient.get("/popular/admin/countries"),
  createCountry: (d: any)            => apiClient.post("/popular/admin/countries", d),
  updateCountry: (id: string, d: any)=> apiClient.put(`/popular/admin/countries/${id}`, d),
  deleteCountry: (id: string)        => apiClient.delete(`/popular/admin/countries/${id}`),

  seed: ()                           => apiClient.post("/popular/admin/seed"),
};

// ── Confirm delete ─────────────────────────────────────────────────────────────
function ConfirmDelete({ open, name, onConfirm, onClose }: any) {
  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete "{name}"?</DialogTitle>
      <DialogContent><Typography color="text.secondary">This cannot be undone.</Typography></DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Generic tab hook ──────────────────────────────────────────────────────────
function useTab(fetchFn: any, createFn: any, updateFn: any, deleteFn: any, toggleFn?: any) {
  const [rows, setRows]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; item?: any }>({ open: false });
  const [delItem, setDelItem] = useState<any>(null);
  const [form, setForm]     = useState<any>({});

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetchFn();
      const raw = (r as any)?.data;
      const arr = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
      setRows(arr);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load");
    } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const openCreate = (defaults: any = {}) => {
    setForm({ isActive: true, sortOrder: rows.length, ...defaults });
    setDialog({ open: true });
  };
  const openEdit = (item: any) => { setForm({ ...item }); setDialog({ open: true, item }); };

  const handleSave = async () => {
    try {
      if (dialog.item?._id) await updateFn(dialog.item._id, form);
      else await createFn(form);
      setDialog({ open: false }); load();
    } catch (e: any) { alert(e?.response?.data?.message || "Error saving"); }
  };

  const handleDelete = async () => {
    if (!delItem?._id) return;
    try { await deleteFn(delItem._id); } catch {}
    setDelItem(null); load();
  };

  const handleToggle = async (id: string) => {
    if (!toggleFn) return;
    try { await toggleFn(id); load(); } catch {}
  };

  return { rows, loading, error, dialog, setDialog, delItem, setDelItem, form, setForm, openCreate, openEdit, handleSave, handleDelete, handleToggle, load };
}

// ── Bulk Import Dialog ────────────────────────────────────────────────────────
function BulkImportDialog({ open, onClose, tabLabel, csvTemplate, csvHeaders, onImport }: {
  open: boolean; onClose: () => void; tabLabel: string;
  csvTemplate: string; csvHeaders: string[]; onImport: (rows: any[]) => Promise<void>;
}) {
  const [csv, setCsv]         = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult]   = useState("");
  const fileRef               = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      obj.isActive = obj.isActive !== "false";
      if (obj.sortOrder) obj.sortOrder = parseInt(obj.sortOrder) || 0;
      if (obj.stars) obj.stars = parseInt(obj.stars) || 4;
      return obj;
    });
  };

  const handleCSVChange = (text: string) => {
    setCsv(text);
    setPreview(parseCSV(text));
    setResult("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => handleCSVChange(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!preview.length) return;
    setImporting(true); setResult("");
    try {
      await onImport(preview);
      setResult(`✅ Successfully imported ${preview.length} ${tabLabel}!`);
      setCsv(""); setPreview([]);
    } catch (e: any) {
      setResult("❌ Import failed: " + (e?.response?.data?.message || "Unknown error"));
    } finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${tabLabel.toLowerCase().replace(/\s/g,"-")}-template.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>📥 Bulk Import — {tabLabel}</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }} icon={false}>
          Paste CSV data below, or upload a .csv file. First row must be headers.
          <Button size="small" startIcon={<DownloadOutlined />} onClick={downloadTemplate} sx={{ ml: 1 }}>
            Download Template
          </Button>
        </Alert>

        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Button variant="outlined" startIcon={<UploadOutlined />} onClick={() => fileRef.current?.click()} size="small">
            Upload CSV File
          </Button>
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleFileUpload} />
        </Box>

        <TextField
          fullWidth multiline rows={6} label="Or paste CSV data here"
          placeholder={csvTemplate}
          value={csv} onChange={e => handleCSVChange(e.target.value)}
          sx={{ fontFamily: "monospace", mb: 2 }}
        />

        {preview.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Preview — {preview.length} rows to import:
            </Typography>
            <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "auto", maxHeight: 200 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "grey.50" }}>
                  <TableRow>
                    {csvHeaders.map(h => <TableCell key={h}><b>{h}</b></TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {csvHeaders.map(h => <TableCell key={h}>{String(row[h] ?? "")}</TableCell>)}
                    </TableRow>
                  ))}
                  {preview.length > 5 && (
                    <TableRow><TableCell colSpan={csvHeaders.length} align="center">
                      <Typography variant="caption" color="text.secondary">…and {preview.length - 5} more rows</Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </>
        )}

        {result && (
          <Alert severity={result.startsWith("✅") ? "success" : "error"} sx={{ mt: 2 }}>
            {result}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" disabled={!preview.length || importing} onClick={handleImport}>
          {importing ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
          Import {preview.length > 0 ? `${preview.length} rows` : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── POPULAR ROUTES TAB (from Settings) ───────────────────────────────────────
function PopularRoutesTab({ onMessage }: { onMessage: (m: string) => void }) {
  const [routes, setRoutes]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.get();
      const d   = res.data?.data || res.data;
      setRoutes(d?.popularRoutes || []);
    } catch { onMessage("❌ Failed to load routes"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const save = async (updatedRoutes: any[]) => {
    setSaving(true);
    try {
      await settingsApi.update({ popularRoutes: updatedRoutes });
      onMessage("✅ Popular routes saved!");
    } catch { onMessage("❌ Failed to save routes"); }
    finally { setSaving(false); }
  };

  const addRoute    = () => setRoutes(r => [...r, { from:"", fromCity:"", to:"", toCity:"", price:"", isActive:true }]);
  const removeRoute = (i: number) => setRoutes(r => r.filter((_,idx) => idx !== i));
  const update      = (i: number, key: string, val: any) =>
    setRoutes(r => r.map((rt, idx) => idx === i ? { ...rt, [key]: val } : rt));
  const toggle      = (i: number) => update(i, "isActive", !routes[i].isActive);

  const CSV_HEADERS = ["from","fromCity","to","toCity","price","isActive"];
  const CSV_TEMPLATE = `from,fromCity,to,toCity,price,isActive\nDEL,Delhi,BOM,Mumbai,₹2199,true\nBOM,Mumbai,BLR,Bangalore,₹1899,true`;

  const handleBulkImport = async (rows: any[]) => {
    const merged = [...routes, ...rows];
    setRoutes(merged);
    await save(merged);
    setBulkOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2 }}>
        <Typography variant="h6" fontWeight={700}>🗺️ Popular Routes ({routes.length})</Typography>
        <Box sx={{ display:"flex", gap:1 }}>
          <Button size="small" variant="outlined" startIcon={<UploadOutlined />} onClick={() => setBulkOpen(true)}>Bulk Import</Button>
          <Button size="small" variant="outlined" startIcon={<ReloadOutlined />} onClick={load}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<PlusOutlined />} onClick={addRoute}>Add Route</Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb:2 }} icon={false}>
        💡 These routes show on the homepage as quick-links. Toggle to show/hide. Click <b>Save All</b> after making changes.
      </Alert>

      {loading ? <CircularProgress size={24} /> : (
        <Grid container spacing={2}>
          {routes.map((route, i) => (
            <Grid size={{ xs:12, md:6, lg:4 }} key={i}>
              <Card variant="outlined" sx={{ p:2, borderRadius:2, position:"relative", opacity: route.isActive ? 1 : 0.6 }}>
                <Box sx={{ position:"absolute", top:8, right:8, display:"flex", gap:0.5 }}>
                  <Tooltip title={route.isActive ? "Active — click to hide" : "Hidden — click to show"}>
                    <Switch size="small" checked={!!route.isActive} onChange={() => toggle(i)} />
                  </Tooltip>
                  <Tooltip title="Remove"><IconButton size="small" color="error" onClick={() => removeRoute(i)}><DeleteOutlined /></IconButton></Tooltip>
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb:1.5, display:"block" }}>
                  Route #{i+1} {!route.isActive && <Chip label="Hidden" size="small" sx={{ ml:0.5 }} />}
                </Typography>
                <Grid container spacing={1}>
                  {[["from","From Code","DEL"],["fromCity","From City","Delhi"],["to","To Code","BOM"],["toCity","To City","Mumbai"]].map(([k,l,ph]) => (
                    <Grid size={6} key={k}>
                      <TextField size="small" fullWidth label={l} placeholder={ph}
                        value={route[k] || ""} onChange={e => update(i, k, k==="from"||k==="to" ? e.target.value.toUpperCase() : e.target.value)}
                        inputProps={k==="from"||k==="to" ? { maxLength:3, style:{textTransform:"uppercase"} } : {}} />
                    </Grid>
                  ))}
                  <Grid size={12}>
                    <TextField size="small" fullWidth label="Display Price" placeholder="₹2,199"
                      value={route.price || ""} onChange={e => update(i, "price", e.target.value)} />
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          ))}
          {routes.length === 0 && (
            <Grid size={12}>
              <Paper elevation={0} sx={{ p:4, textAlign:"center", border:"1px dashed", borderColor:"divider", borderRadius:2 }}>
                <Typography color="text.secondary">No routes yet. Click "Add Route" to get started.</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {routes.length > 0 && (
        <Box sx={{ mt:3 }}>
          <Button variant="contained" disabled={saving} onClick={() => save(routes)}>
            {saving ? <CircularProgress size={18} sx={{ mr:1 }} /> : null}
            💾 Save All Routes
          </Button>
        </Box>
      )}

      <BulkImportDialog
        open={bulkOpen} onClose={() => setBulkOpen(false)}
        tabLabel="Popular Routes" csvHeaders={CSV_HEADERS} csvTemplate={CSV_TEMPLATE}
        onImport={handleBulkImport}
      />
    </Box>
  );
}

// ── FLIGHTS TAB ───────────────────────────────────────────────────────────────
function FlightRoutesTab({ onMessage }: { onMessage: (m: string) => void }) {
  const t = useTab(api.getFlights, api.createFlight, api.updateFlight, api.deleteFlight, api.toggleFlight);
  const [bulkOpen, setBulkOpen] = useState(false);

  const CSV_HEADERS = ["from","fromCity","to","toCity","price","airline","duration","sortOrder"];
  const CSV_TEMPLATE = `from,fromCity,to,toCity,price,airline,duration,sortOrder\nDEL,Delhi,BOM,Mumbai,₹2199,IndiGo,2h 10m,0\nBOM,Mumbai,BLR,Bangalore,₹1899,Air India,1h 40m,1`;

  const handleBulkImport = async (rows: any[]) => {
    let success = 0;
    for (const row of rows) {
      try { await api.createFlight({ ...row, isActive: true }); success++; } catch {}
    }
    onMessage(`✅ Imported ${success}/${rows.length} flight routes`);
    t.load(); setBulkOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2 }}>
        <Typography variant="h6" fontWeight={700}>✈️ Flight Routes ({t.rows.length})</Typography>
        <Box sx={{ display:"flex", gap:1 }}>
          <Button size="small" variant="outlined" startIcon={<UploadOutlined />} onClick={() => setBulkOpen(true)}>Bulk Import</Button>
          <Button size="small" variant="outlined" startIcon={<ReloadOutlined />} onClick={t.load}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<PlusOutlined />} onClick={() => t.openCreate()}>Add Route</Button>
        </Box>
      </Box>
      {t.error && <Alert severity="error" sx={{ mb:2 }}>{t.error}</Alert>}
      <Alert severity="info" sx={{ mb:2 }} icon={false}>
        💡 Routes appear on the homepage. Toggle <b>Active</b> to show/hide without deleting.
      </Alert>
      {t.loading ? <CircularProgress size={24} /> : (
        <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, overflow:"hidden" }}>
          <Table size="small">
            <TableHead sx={{ bgcolor:"grey.50" }}>
              <TableRow>
                {["Route","Price","Airline","Duration","Order","Status","Actions"].map(h=>(
                  <TableCell key={h}><b>{h}</b></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {t.rows.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" sx={{ py:3 }}>No routes yet. Click "Add Route" to create one.</Typography>
                </TableCell></TableRow>
              )}
              {t.rows.map(r => (
                <TableRow key={r._id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{r.fromCity} ({r.from}) → {r.toCity} ({r.to})</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="error" fontWeight={700}>{r.price||"—"}</Typography></TableCell>
                  <TableCell><Chip label={r.airline||"—"} size="small" variant="outlined" /></TableCell>
                  <TableCell>{r.duration||"—"}</TableCell>
                  <TableCell>{r.sortOrder??0}</TableCell>
                  <TableCell><Chip label={r.isActive?"Active":"Hidden"} color={r.isActive?"success":"default"} size="small" /></TableCell>
                  <TableCell>
                    <Tooltip title={r.isActive?"Hide":"Show"}>
                      <IconButton size="small" onClick={() => t.handleToggle(r._id)}>
                        {r.isActive ? <StopOutlined style={{ color:"#f57c00" }} /> : <CheckCircleOutlined style={{ color:"#388e3c" }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => t.openEdit(r)}><EditOutlined /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" style={{ color:"#d32f2f" }} onClick={() => t.setDelItem(r)}><DeleteOutlined /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      <Dialog open={t.dialog.open} onClose={() => t.setDialog({ open:false })} maxWidth="sm" fullWidth>
        <DialogTitle>{t.dialog.item ? "Edit Route" : "Add Popular Flight Route"}</DialogTitle>
        <DialogContent sx={{ pt:2 }}>
          <Grid container spacing={2}>
            {([["from","From IATA (e.g. DEL)"],["fromCity","From City"],["to","To IATA (e.g. BOM)"],["toCity","To City"],["price","Price (e.g. ₹2,199)"],["airline","Airline"],["duration","Duration (e.g. 2h 10m)"]] as [string,string][]).map(([k,l]) => (
              <Grid size={6} key={k}>
                <TextField label={l} value={t.form[k]||""} onChange={e => t.setForm({ ...t.form, [k]:e.target.value })} fullWidth size="small" />
              </Grid>
            ))}
            <Grid size={6}><TextField label="Sort Order" type="number" value={t.form.sortOrder??0} onChange={e => t.setForm({ ...t.form, sortOrder:Number(e.target.value) })} fullWidth size="small" /></Grid>
            <Grid size={12}><TextField label="Image URL (optional)" value={t.form.imageUrl||""} onChange={e => t.setForm({ ...t.form, imageUrl:e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={12}><FormControlLabel control={<Switch checked={t.form.isActive!==false} onChange={e => t.setForm({ ...t.form, isActive:e.target.checked })} />} label="Active — visible on homepage" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => t.setDialog({ open:false })}>Cancel</Button>
          <Button variant="contained" onClick={t.handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDelete open={!!t.delItem} name={t.delItem ? `${t.delItem.fromCity} → ${t.delItem.toCity}` : ""} onConfirm={t.handleDelete} onClose={() => t.setDelItem(null)} />
      <BulkImportDialog open={bulkOpen} onClose={() => setBulkOpen(false)} tabLabel="Flight Routes" csvHeaders={CSV_HEADERS} csvTemplate={CSV_TEMPLATE} onImport={handleBulkImport} />
    </Box>
  );
}

// ── HOTELS TAB ────────────────────────────────────────────────────────────────
function HotelsTab({ onMessage }: { onMessage: (m: string) => void }) {
  const t = useTab(api.getHotels, api.createHotel, api.updateHotel, api.deleteHotel, api.toggleHotel);
  const [bulkOpen, setBulkOpen] = useState(false);

  const CSV_HEADERS = ["name","city","country","pricePerNight","rating","stars","sortOrder"];
  const CSV_TEMPLATE = `name,city,country,pricePerNight,rating,stars,sortOrder\nTaj Mahal Hotel,Mumbai,India,₹12000,4.8,5,0\nThe Leela,Goa,India,₹8500,4.7,5,1`;

  const handleBulkImport = async (rows: any[]) => {
    let success = 0;
    for (const row of rows) {
      try { await api.createHotel({ ...row, isActive:true }); success++; } catch {}
    }
    onMessage(`✅ Imported ${success}/${rows.length} hotels`);
    t.load(); setBulkOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2 }}>
        <Typography variant="h6" fontWeight={700}>🏨 Popular Hotels ({t.rows.length})</Typography>
        <Box sx={{ display:"flex", gap:1 }}>
          <Button size="small" variant="outlined" startIcon={<UploadOutlined />} onClick={() => setBulkOpen(true)}>Bulk Import</Button>
          <Button size="small" variant="outlined" startIcon={<ReloadOutlined />} onClick={t.load}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<PlusOutlined />} onClick={() => t.openCreate({ stars:4 })}>Add Hotel</Button>
        </Box>
      </Box>
      {t.error && <Alert severity="error" sx={{ mb:2 }}>{t.error}</Alert>}
      {t.loading ? <CircularProgress size={24} /> : (
        <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, overflow:"hidden" }}>
          <Table size="small">
            <TableHead sx={{ bgcolor:"grey.50" }}>
              <TableRow>{["Hotel","City","Stars","Price/Night","Rating","Status","Actions"].map(h=><TableCell key={h}><b>{h}</b></TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {t.rows.length===0 && <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" sx={{ py:3 }}>No hotels yet.</Typography></TableCell></TableRow>}
              {t.rows.map(r => (
                <TableRow key={r._id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{r.name}</Typography></TableCell>
                  <TableCell>{r.city}{r.country?`, ${r.country}`:""}</TableCell>
                  <TableCell>{"★".repeat(r.stars||4)}</TableCell>
                  <TableCell><Typography variant="body2" color="error" fontWeight={700}>{r.pricePerNight||"—"}</Typography></TableCell>
                  <TableCell>{r.rating||"—"}</TableCell>
                  <TableCell><Chip label={r.isActive?"Active":"Hidden"} color={r.isActive?"success":"default"} size="small" /></TableCell>
                  <TableCell>
                    <Tooltip title={r.isActive?"Hide":"Show"}><IconButton size="small" onClick={() => t.handleToggle(r._id)}>{r.isActive?<StopOutlined style={{ color:"#f57c00" }}/>:<CheckCircleOutlined style={{ color:"#388e3c" }}/>}</IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => t.openEdit(r)}><EditOutlined /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" style={{ color:"#d32f2f" }} onClick={() => t.setDelItem(r)}><DeleteOutlined /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      <Dialog open={t.dialog.open} onClose={() => t.setDialog({ open:false })} maxWidth="sm" fullWidth>
        <DialogTitle>{t.dialog.item ? "Edit Hotel" : "Add Popular Hotel"}</DialogTitle>
        <DialogContent sx={{ pt:2 }}>
          <Grid container spacing={2}>
            {([["name","Hotel Name"],["city","City"],["country","Country"],["pricePerNight","Price/Night (e.g. ₹12,000)"],["rating","Rating (e.g. 4.8)"]] as [string,string][]).map(([k,l]) => (
              <Grid size={6} key={k}><TextField label={l} value={t.form[k]||""} onChange={e => t.setForm({ ...t.form, [k]:e.target.value })} fullWidth size="small" /></Grid>
            ))}
            <Grid size={6}><TextField label="Stars (3-5)" type="number" inputProps={{ min:3, max:5 }} value={t.form.stars||4} onChange={e => t.setForm({ ...t.form, stars:Number(e.target.value) })} fullWidth size="small" /></Grid>
            <Grid size={6}><TextField label="Sort Order" type="number" value={t.form.sortOrder??0} onChange={e => t.setForm({ ...t.form, sortOrder:Number(e.target.value) })} fullWidth size="small" /></Grid>
            <Grid size={12}><TextField label="Image URL (optional)" value={t.form.imageUrl||""} onChange={e => t.setForm({ ...t.form, imageUrl:e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={12}><FormControlLabel control={<Switch checked={t.form.isActive!==false} onChange={e => t.setForm({ ...t.form, isActive:e.target.checked })} />} label="Active — visible on homepage" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => t.setDialog({ open:false })}>Cancel</Button>
          <Button variant="contained" onClick={t.handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDelete open={!!t.delItem} name={t.delItem?.name||""} onConfirm={t.handleDelete} onClose={() => t.setDelItem(null)} />
      <BulkImportDialog open={bulkOpen} onClose={() => setBulkOpen(false)} tabLabel="Hotels" csvHeaders={CSV_HEADERS} csvTemplate={CSV_TEMPLATE} onImport={handleBulkImport} />
    </Box>
  );
}

// ── CITIES TAB ────────────────────────────────────────────────────────────────
function CitiesTab({ onMessage }: { onMessage: (m: string) => void }) {
  const t = useTab(api.getCities, api.createCity, api.updateCity, api.deleteCity);
  const [bulkOpen, setBulkOpen] = useState(false);

  const CSV_HEADERS = ["name","country","tagline","airportCode","sortOrder"];
  const CSV_TEMPLATE = `name,country,tagline,airportCode,sortOrder\nGoa,India,Beach Paradise,GOI,0\nManali,India,Mountain Escape,KUU,1`;

  const handleBulkImport = async (rows: any[]) => {
    let success = 0;
    for (const row of rows) {
      try { await api.createCity({ ...row, isActive:true }); success++; } catch {}
    }
    onMessage(`✅ Imported ${success}/${rows.length} cities`);
    t.load(); setBulkOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2 }}>
        <Typography variant="h6" fontWeight={700}>🏙️ Popular Cities ({t.rows.length})</Typography>
        <Box sx={{ display:"flex", gap:1 }}>
          <Button size="small" variant="outlined" startIcon={<UploadOutlined />} onClick={() => setBulkOpen(true)}>Bulk Import</Button>
          <Button size="small" variant="outlined" startIcon={<ReloadOutlined />} onClick={t.load}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<PlusOutlined />} onClick={() => t.openCreate()}>Add City</Button>
        </Box>
      </Box>
      {t.error && <Alert severity="error" sx={{ mb:2 }}>{t.error}</Alert>}
      {t.loading ? <CircularProgress size={24} /> : (
        <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, overflow:"hidden" }}>
          <Table size="small">
            <TableHead sx={{ bgcolor:"grey.50" }}>
              <TableRow>{["City","Country","Tagline","Airport","Status","Actions"].map(h=><TableCell key={h}><b>{h}</b></TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {t.rows.length===0 && <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" sx={{ py:3 }}>No cities yet.</Typography></TableCell></TableRow>}
              {t.rows.map(r => (
                <TableRow key={r._id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{r.name}</Typography></TableCell>
                  <TableCell>{r.country}</TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{r.tagline}</Typography></TableCell>
                  <TableCell><Chip label={r.airportCode||"—"} size="small" variant="outlined" /></TableCell>
                  <TableCell><Chip label={r.isActive?"Active":"Hidden"} color={r.isActive?"success":"default"} size="small" /></TableCell>
                  <TableCell>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => t.openEdit(r)}><EditOutlined /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" style={{ color:"#d32f2f" }} onClick={() => t.setDelItem(r)}><DeleteOutlined /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      <Dialog open={t.dialog.open} onClose={() => t.setDialog({ open:false })} maxWidth="sm" fullWidth>
        <DialogTitle>{t.dialog.item ? "Edit City" : "Add Popular City"}</DialogTitle>
        <DialogContent sx={{ pt:2 }}>
          <Grid container spacing={2}>
            {([["name","City Name"],["country","Country"],["tagline","Tagline (e.g. Beach Paradise)"],["airportCode","Airport Code (e.g. GOI)"]] as [string,string][]).map(([k,l]) => (
              <Grid size={6} key={k}><TextField label={l} value={t.form[k]||""} onChange={e => t.setForm({ ...t.form, [k]:e.target.value })} fullWidth size="small" /></Grid>
            ))}
            <Grid size={12}><TextField label="Image URL (optional)" value={t.form.imageUrl||""} onChange={e => t.setForm({ ...t.form, imageUrl:e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={6}><TextField label="Sort Order" type="number" value={t.form.sortOrder??0} onChange={e => t.setForm({ ...t.form, sortOrder:Number(e.target.value) })} fullWidth size="small" /></Grid>
            <Grid size={6}><FormControlLabel control={<Switch checked={t.form.isActive!==false} onChange={e => t.setForm({ ...t.form, isActive:e.target.checked })} />} label="Active" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => t.setDialog({ open:false })}>Cancel</Button>
          <Button variant="contained" onClick={t.handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDelete open={!!t.delItem} name={t.delItem?.name||""} onConfirm={t.handleDelete} onClose={() => t.setDelItem(null)} />
      <BulkImportDialog open={bulkOpen} onClose={() => setBulkOpen(false)} tabLabel="Cities" csvHeaders={CSV_HEADERS} csvTemplate={CSV_TEMPLATE} onImport={handleBulkImport} />
    </Box>
  );
}

// ── COUNTRIES TAB ─────────────────────────────────────────────────────────────
function CountriesTab({ onMessage }: { onMessage: (m: string) => void }) {
  const t = useTab(api.getCountries, api.createCountry, api.updateCountry, api.deleteCountry);
  const [bulkOpen, setBulkOpen] = useState(false);

  const CSV_HEADERS = ["name","flag","tagline","sortOrder"];
  const CSV_TEMPLATE = `name,flag,tagline,sortOrder\nMaldives,🇲🇻,Island Paradise,0\nThailand,🇹🇭,Land of Smiles,1`;

  const handleBulkImport = async (rows: any[]) => {
    let success = 0;
    for (const row of rows) {
      try { await api.createCountry({ ...row, isActive:true }); success++; } catch {}
    }
    onMessage(`✅ Imported ${success}/${rows.length} countries`);
    t.load(); setBulkOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2 }}>
        <Typography variant="h6" fontWeight={700}>🌍 Popular Countries ({t.rows.length})</Typography>
        <Box sx={{ display:"flex", gap:1 }}>
          <Button size="small" variant="outlined" startIcon={<UploadOutlined />} onClick={() => setBulkOpen(true)}>Bulk Import</Button>
          <Button size="small" variant="outlined" startIcon={<ReloadOutlined />} onClick={t.load}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<PlusOutlined />} onClick={() => t.openCreate()}>Add Country</Button>
        </Box>
      </Box>
      {t.error && <Alert severity="error" sx={{ mb:2 }}>{t.error}</Alert>}
      {t.loading ? <CircularProgress size={24} /> : (
        <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, overflow:"hidden" }}>
          <Table size="small">
            <TableHead sx={{ bgcolor:"grey.50" }}>
              <TableRow>{["Flag","Country","Tagline","Status","Actions"].map(h=><TableCell key={h}><b>{h}</b></TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {t.rows.length===0 && <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" sx={{ py:3 }}>No countries yet.</Typography></TableCell></TableRow>}
              {t.rows.map(r => (
                <TableRow key={r._id} hover>
                  <TableCell><Typography fontSize={22}>{r.flag||"🌍"}</Typography></TableCell>
                  <TableCell><Typography variant="body2" fontWeight={600}>{r.name}</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{r.tagline}</Typography></TableCell>
                  <TableCell><Chip label={r.isActive?"Active":"Hidden"} color={r.isActive?"success":"default"} size="small" /></TableCell>
                  <TableCell>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => t.openEdit(r)}><EditOutlined /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" style={{ color:"#d32f2f" }} onClick={() => t.setDelItem(r)}><DeleteOutlined /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      <Dialog open={t.dialog.open} onClose={() => t.setDialog({ open:false })} maxWidth="sm" fullWidth>
        <DialogTitle>{t.dialog.item ? "Edit Country" : "Add Popular Country"}</DialogTitle>
        <DialogContent sx={{ pt:2 }}>
          <Grid container spacing={2}>
            {([["name","Country Name"],["flag","Flag Emoji (e.g. 🇲🇻)"],["tagline","Tagline (e.g. Island Paradise)"]] as [string,string][]).map(([k,l]) => (
              <Grid size={6} key={k}><TextField label={l} value={t.form[k]||""} onChange={e => t.setForm({ ...t.form, [k]:e.target.value })} fullWidth size="small" /></Grid>
            ))}
            <Grid size={12}><TextField label="Image URL (optional)" value={t.form.imageUrl||""} onChange={e => t.setForm({ ...t.form, imageUrl:e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={6}><TextField label="Sort Order" type="number" value={t.form.sortOrder??0} onChange={e => t.setForm({ ...t.form, sortOrder:Number(e.target.value) })} fullWidth size="small" /></Grid>
            <Grid size={6}><FormControlLabel control={<Switch checked={t.form.isActive!==false} onChange={e => t.setForm({ ...t.form, isActive:e.target.checked })} />} label="Active" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => t.setDialog({ open:false })}>Cancel</Button>
          <Button variant="contained" onClick={t.handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDelete open={!!t.delItem} name={t.delItem?.name||""} onConfirm={t.handleDelete} onClose={() => t.setDelItem(null)} />
      <BulkImportDialog open={bulkOpen} onClose={() => setBulkOpen(false)} tabLabel="Countries" csvHeaders={CSV_HEADERS} csvTemplate={CSV_TEMPLATE} onImport={handleBulkImport} />
    </Box>
  );
}

// ── Seed Button ───────────────────────────────────────────────────────────────
function SeedButton({ onMessage }: { onMessage: (m: string) => void }) {
  const [loading, setLoading] = React.useState(false);
  return (
    <Button size="small" variant="outlined" sx={{ ml:2 }} disabled={loading}
      onClick={async () => {
        setLoading(true);
        try { await api.seed(); onMessage("✅ Default data loaded! Refresh each tab to see."); }
        catch (e: any) { onMessage("Error: " + (e?.response?.data?.message || "Seed failed")); }
        finally { setLoading(false); }
      }}>
      {loading ? "⏳ Loading…" : "🌱 Load Default Data"}
    </Button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PopularContentPage() {
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState("");

  const TABS = [
    { label:"🗺️ Popular Routes", component:<PopularRoutesTab onMessage={setSnack} /> },
    { label:"✈️ Flight Routes",   component:<FlightRoutesTab onMessage={setSnack} /> },
    { label:"🏨 Hotels",          component:<HotelsTab onMessage={setSnack} /> },
    { label:"🏙️ Cities",         component:<CitiesTab onMessage={setSnack} /> },
    { label:"🌍 Countries",       component:<CountriesTab onMessage={setSnack} /> },
  ];

  return (
    <Box>
      <Box sx={{ mb:3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>🌟 Popular Content</Typography>
        <Typography color="text.secondary">
          Manage what appears on the homepage. Sections only appear when they have active items.
        </Typography>
        <Alert severity="success" sx={{ mt:2 }} icon={false}>
          ✅ <b>How it works:</b> Add items here → they show on homepage instantly. Toggle OFF to hide without deleting.
        </Alert>
        <Alert severity="info" sx={{ mt:2 }} icon={false}>
          🌱 <b>First time?</b> Click "Load Default Data" to pre-fill sample routes, cities and countries.
          <SeedButton onMessage={setSnack} />
        </Alert>
      </Box>

      <Card elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom:"1px solid", borderColor:"divider", px:2 }} variant="scrollable" scrollButtons="auto">
          {TABS.map((t, i) => <Tab key={i} label={t.label} />)}
        </Tabs>
        <CardContent sx={{ p:3 }}>
          {TABS[tab]?.component}
        </CardContent>
      </Card>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack("")}
        message={snack} anchorOrigin={{ vertical:"top", horizontal:"center" }} />
    </Box>
  );
}