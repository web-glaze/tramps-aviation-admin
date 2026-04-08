import { useEffect, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Skeleton, Tooltip, Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, Divider, Card, CardContent, Stack,
} from '@mui/material';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined,
  CheckCircleOutlined, StopOutlined, ImportOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { trampsAviationFaresApi } from '../../api';
import MainCard from '../../components/MainCard';

// ── Empty templates ───────────────────────────────────────────────────────────
const emptyFlight = {
  type:'flight', isActive:true, mode:'both',
  flightNumber:'', airline:'', origin:'', destination:'', travelDate:'', timing:'',
  returnDate:'', returnTiming:'', fare:'', baggage:'30KG', cabinBaggage:'7KG',
  cabinClass:'ECONOMY', tripType:'OneWay', stops:0, viaAirport:'', seatsAvailable:9,
  isNonRefundable:true, isNonChangeable:true, notes:'',
};
const emptyHotel = {
  type:'hotel', isActive:true, mode:'both',
  hotelName:'', city:'', address:'', stars:4, pricePerNight:'', roomType:'STANDARD',
  roomDescription:'Deluxe Room', cancellationPolicy:'FREE_CANCELLATION',
  mealPlan:'ROOM_ONLY', amenities:'', maxGuests:2, notes:'',
};
const emptyIns = {
  type:'insurance', isActive:true, mode:'both',
  planName:'', planType:'BASIC', tripTypeInsurance:'domestic', premiumPerPerson:'',
  medicalCover:200000, cancellationCover:10000, baggageCover:5000, flightDelayCover:5000,
  benefits:'', notes:'',
};

function StatCard({ label, value, color }: any) {
  return (
    <Card elevation={0} sx={{ border:'1px solid', borderColor:'divider', borderRadius:2, flex:1 }}>
      <CardContent sx={{ py:2, '&:last-child':{ pb:2 } }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700} color={color||'text.primary'}>{value??'—'}</Typography>
      </CardContent>
    </Card>
  );
}

// ── Bulk parser ───────────────────────────────────────────────────────────────
function parseBulk(text: string, type: string) {
  const lines  = text.split('\n').map(l=>l.trim()).filter(Boolean);
  const records: any[] = [];
  const errors:  string[] = [];
  lines.forEach((line, i) => {
    const p = line.split('|').map(s=>s.trim());
    try {
      if (type === 'flight') {
        if (p.length < 6) throw new Error('Need 6+ fields');
        const [flNo,orig,dest,date,timing,fare,bag,airline,tripT,retDate,retTiming,seats,stops] = p;
        const [dep,arr] = (timing||'').split('-');
        records.push({ type:'flight', flightNumber:flNo, origin:orig.toUpperCase().slice(0,3), destination:dest.toUpperCase().slice(0,3), sector:`${orig.toUpperCase().slice(0,3)}-${dest.toUpperCase().slice(0,3)}`, travelDate:date, timing, departureTime:dep?.trim()||'', arrivalTime:arr?.trim()||'', fare:Number(fare), baggage:bag||'30KG', cabinBaggage:'7KG', airline:airline||'', tripType:tripT||'OneWay', returnDate:retDate||'', returnTiming:retTiming||'', seatsAvailable:parseInt(seats||'9')||9, stops:parseInt(stops||'0')||0, cabinClass:'ECONOMY', mode:'both', isActive:true, isNonRefundable:true, isNonChangeable:true, notes:'' });
      } else if (type === 'hotel') {
        if (p.length < 4) throw new Error('Need 4+ fields');
        const [name,city,stars,ppn,meal,cancel,ams] = p;
        records.push({ type:'hotel', hotelName:name, city, address:city, stars:parseInt(stars)||4, pricePerNight:Number(ppn)||0, mealPlan:meal||'ROOM_ONLY', cancellationPolicy:cancel||'FREE_CANCELLATION', amenities:(ams||'').split(',').map((s:string)=>s.trim()).filter(Boolean), roomType:'STANDARD', roomDescription:'Deluxe Room', maxGuests:2, mode:'both', isActive:true, notes:'' });
      } else {
        if (p.length < 3) throw new Error('Need 3+ fields');
        const [name,tripT,prem,med,cancel,bag,bens] = p;
        records.push({ type:'insurance', planName:name, planType:'BASIC', tripTypeInsurance:tripT||'domestic', premiumPerPerson:Number(prem)||0, coverage:{ medical:Number(med)||200000, tripCancellation:Number(cancel)||10000, baggageLoss:Number(bag)||5000 }, benefits:(bens||'').split(',').map((s:string)=>s.trim()).filter(Boolean), mode:'both', isActive:true, notes:'' });
      }
    } catch(e:any) { errors.push(`Line ${i+1}: ${e.message}`); }
  });
  return { records, errors };
}

const BULK_HINTS = {
  flight: {
    format: 'FlightNo | Origin | Dest | Date(YYYY-MM-DD) | Timing(HH:MM-HH:MM) | Fare | Baggage | Airline | TripType | ReturnDate | ReturnTiming | Seats | Stops',
    examples: [
      'IX-191 | ATQ | DXB | 2026-04-21 | 00:15-02:55 | 28700 | 30KG | Air India Express | OneWay | | | 9 | 0',
      'IX-137 | ATQ | SHJ | 2026-04-21 | 13:30-16:05 | 30000 | 30KG | Air India Express | OneWay | | | 12 | 0',
      '6E-211 | DEL | BOM | 2026-05-10 | 09:30-11:45 | 3776  | 15KG | IndiGo | RoundTrip | 2026-05-15 | 14:00-16:15 | 9 | 0',
    ],
  },
  hotel: {
    format: 'HotelName | City | Stars | PricePerNight | MealPlan | Cancellation | Amenities(comma)',
    examples: [
      'Taj Mahal Palace | Mumbai | 5 | 12000 | BREAKFAST_INCLUDED | FREE_CANCELLATION | WiFi,Pool,Spa',
      'Radisson Blu | Delhi | 4 | 6500 | ROOM_ONLY | FREE_CANCELLATION | WiFi,Gym',
      'Holiday Inn | Goa | 4 | 5200 | BREAKFAST_INCLUDED | NON_REFUNDABLE | WiFi,Pool,Beach',
    ],
  },
  insurance: {
    format: 'PlanName | TripType | Premium | MedicalCover | CancellationCover | BaggageCover | Benefits(comma)',
    examples: [
      'Basic Cover | domestic | 199 | 200000 | 10000 | 5000 | Medical Emergency,Trip Cancellation',
      'Standard Cover | domestic | 349 | 250000 | 25000 | 15000 | Medical Emergency,Trip Cancellation,Baggage Loss',
      'International Premium | international | 799 | 500000 | 50000 | 25000 | Medical Emergency,Trip Cancellation,Baggage Loss,Flight Delay',
    ],
  },
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TrampsTicketsPage() {
  const [tabIdx, setTabIdx]   = useState(0);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [stats,   setStats]   = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRec,    setEditRec]    = useState<any>(null);
  const [form,       setForm]       = useState<any>(emptyFlight);
  const [saving,     setSaving]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [bulkOpen,     setBulkOpen]     = useState(false);
  const [bulkText,     setBulkText]     = useState('');
  const [bulkPreview,  setBulkPreview]  = useState<any[]>([]);
  const [bulkErrors,   setBulkErrors]   = useState<string[]>([]);
  const [bulkSaving,   setBulkSaving]   = useState(false);

  const [snack, setSnack] = useState({ open:false, msg:'', sev:'success' as any });
  const toast = (msg:string, sev:any='success') => setSnack({ open:true, msg, sev });

  const types = ['flight','hotel','insurance'];
  const type  = types[tabIdx];
  const empties = [emptyFlight, emptyHotel, emptyIns];

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit:20, type };
      if (search)          params.search   = search;
      if (activeFilter!=='') params.isActive = activeFilter;
      const res = await trampsAviationFaresApi.getAll(params);
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setRecords(arr); setTotal(raw?.pagination?.total || arr.length || 0);
    } catch { setRecords([]); }
    finally { setLoading(false); }
  };
  const loadStats = async () => {
    try { const r = await trampsAviationFaresApi.getStats(); setStats(r.data?.data ?? r.data); } catch {}
  };
  useEffect(() => { load(); }, [tabIdx, page, activeFilter]);
  useEffect(() => { loadStats(); }, []);

  const handleSearch = (e:any) => { e.preventDefault(); setPage(1); load(); };

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const openAdd = () => { setEditRec(null); setForm({...empties[tabIdx]}); setDialogOpen(true); };
  const openEdit = (r:any) => {
    const fd = {...r};
    if (r.type==='hotel' && Array.isArray(r.amenities)) fd.amenities = r.amenities.join(', ');
    if (r.type==='insurance') {
      fd.medicalCover      = r.coverage?.medical||0;
      fd.cancellationCover = r.coverage?.tripCancellation||0;
      fd.baggageCover      = r.coverage?.baggageLoss||0;
      fd.flightDelayCover  = r.coverage?.flightDelay||0;
      fd.benefits = Array.isArray(r.benefits) ? r.benefits.join(', ') : r.benefits;
    }
    setEditRec(r); setForm(fd); setDialogOpen(true);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const required: Record<string,string[]> = {
      flight:    ['flightNumber','origin','destination','travelDate','timing','fare'],
      hotel:     ['hotelName','city','pricePerNight'],
      insurance: ['planName','premiumPerPerson'],
    };
    const missing = (required[type]||[]).filter(k=>!form[k]);
    if (missing.length) { toast(`Required: ${missing.join(', ')}`, 'error'); return; }

    setSaving(true);
    try {
      const payload = {...form, type, fare:Number(form.fare||0), pricePerNight:Number(form.pricePerNight||0), premiumPerPerson:Number(form.premiumPerPerson||0) };
      if (type==='hotel') payload.amenities = typeof form.amenities==='string' ? form.amenities.split(',').map((s:string)=>s.trim()).filter(Boolean) : form.amenities;
      if (type==='insurance') {
        payload.coverage = { medical:+form.medicalCover, tripCancellation:+form.cancellationCover, baggageLoss:+form.baggageCover, flightDelay:+form.flightDelayCover };
        payload.benefits = typeof form.benefits==='string' ? form.benefits.split(',').map((s:string)=>s.trim()).filter(Boolean) : form.benefits;
      }
      if (editRec) { await trampsAviationFaresApi.update(editRec._id, payload); toast('✅ Ticket updated'); }
      else         { await trampsAviationFaresApi.create(payload);               toast('✅ Ticket created'); }
      setDialogOpen(false); load(); loadStats();
    } catch(e:any) { toast(e?.response?.data?.message||'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (r:any) => {
    try { await trampsAviationFaresApi.toggle(r._id); toast(r.isActive?'⏸ Deactivated':'▶ Activated','info'); load(); loadStats(); }
    catch { toast('Failed','error'); }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await trampsAviationFaresApi.delete(deleteTarget._id); toast('🗑 Deleted'); setDeleteTarget(null); load(); loadStats(); }
    catch { toast('Delete failed','error'); }
  };

  // ── Bulk ──────────────────────────────────────────────────────────────────
  const handleBulkParse = (txt:string) => {
    setBulkText(txt);
    const { records:r, errors:e } = parseBulk(txt, type);
    setBulkPreview(r); setBulkErrors(e);
  };
  const handleBulkSave = async () => {
    if (!bulkPreview.length) return;
    setBulkSaving(true);
    try {
      const res = await trampsAviationFaresApi.bulkCreate(bulkPreview);
      toast(`✅ Imported ${res.data?.inserted||bulkPreview.length} tickets`);
      setBulkOpen(false); setBulkText(''); setBulkPreview([]); load(); loadStats();
    } catch(e:any) { toast(e?.response?.data?.message||'Import failed','error'); }
    finally { setBulkSaving(false); }
  };

  const f = (k:string,v:any) => setForm((p:any)=>({...p,[k]:v}));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>✈️ Tramps Aviation Tickets</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb:3 }}>
        Manage special flights, hotels and insurance plans. These appear in search results above TBO / mock data — in both dev and production.
      </Typography>

      {stats && (
        <Stack direction="row" spacing={2} sx={{ mb:3 }}>
          <StatCard label="Total"     value={stats.total} />
          <StatCard label="Active"    value={stats.active}    color="success.main" />
          <StatCard label="Flights"   value={stats.flights}   color="primary.main" />
          <StatCard label="Hotels"    value={stats.hotels}    color="secondary.main" />
          <StatCard label="Insurance" value={stats.insurance} color="warning.main" />
        </Stack>
      )}

      <MainCard>
        {/* Tabs */}
        <Box sx={{ borderBottom:1, borderColor:'divider', mb:2, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <Tabs value={tabIdx} onChange={(_,v)=>{ setTabIdx(v); setPage(1); }}>
            <Tab label="✈ Flights" />
            <Tab label="🏨 Hotels" />
            <Tab label="🛡 Insurance" />
          </Tabs>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh"><IconButton size="small" onClick={()=>{load();loadStats();}}><ReloadOutlined/></IconButton></Tooltip>
            <Button variant="outlined" size="small" startIcon={<ImportOutlined/>} onClick={()=>{setBulkText('');setBulkPreview([]);setBulkErrors([]);setBulkOpen(true);}}>Bulk Import</Button>
            <Button variant="contained" size="small" startIcon={<PlusOutlined/>} onClick={openAdd}>Add {type}</Button>
          </Stack>
        </Box>

        {/* Search + filter toolbar */}
        <Box sx={{ display:'flex', gap:2, mb:2, flexWrap:'wrap', alignItems:'center' }}>
          <Box component="form" onSubmit={handleSearch} sx={{ display:'flex', gap:1, flex:1, minWidth:200 }}>
            <TextField size="small" placeholder={type==='flight'?'Search sector, flight no…':type==='hotel'?'Search hotel, city…':'Search plan name…'}
              value={search} onChange={e=>setSearch(e.target.value)}
              InputProps={{ startAdornment:<InputAdornment position="start"><SearchOutlined/></InputAdornment> }} sx={{ flex:1 }}/>
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>
          <FormControl size="small" sx={{ minWidth:130 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={activeFilter} onChange={e=>{setActiveFilter(e.target.value);setPage(1);}}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>#</TableCell>
              {/* FLIGHT columns */}
              {tabIdx===0 && <><TableCell>Flight</TableCell><TableCell>Sector</TableCell><TableCell>Date</TableCell><TableCell>Timing</TableCell><TableCell>Trip</TableCell><TableCell>Fare ₹</TableCell><TableCell>Baggage</TableCell><TableCell>Seats</TableCell></>}
              {/* HOTEL columns */}
              {tabIdx===1 && <><TableCell>Hotel</TableCell><TableCell>City</TableCell><TableCell>Stars</TableCell><TableCell align="right">Per Night</TableCell><TableCell>Meal Plan</TableCell><TableCell>Cancellation</TableCell></>}
              {/* INSURANCE columns */}
              {tabIdx===2 && <><TableCell>Plan</TableCell><TableCell>Type</TableCell><TableCell align="right">Premium/Person</TableCell><TableCell>Medical Cover</TableCell><TableCell>Benefits</TableCell></>}
              <TableCell>Mode</TableCell><TableCell>Status</TableCell><TableCell align="center">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {loading ? Array(5).fill(0).map((_,i)=>(
                <TableRow key={i}>{Array(10).fill(0).map((_,j)=><TableCell key={j}><Skeleton/></TableCell>)}</TableRow>
              )) : records.length===0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py:6, color:'text.secondary' }}>
                    No {type} tickets yet. Click "Add {type}" or "Bulk Import".
                  </TableCell>
                </TableRow>
              ) : records.map((r:any, i:number)=>(
                <TableRow key={r._id} hover sx={{ opacity:r.isActive?1:0.55 }}>
                  <TableCell>{(page-1)*20+i+1}</TableCell>

                  {/* FLIGHT rows */}
                  {r.type==='flight'&&<>
                    <TableCell><Typography variant="body2" fontWeight={600} color="primary">{r.flightNumber}</Typography><Typography variant="caption" color="text.secondary" display="block">{r.airline}</Typography></TableCell>
                    <TableCell><Chip label={r.sector||`${r.origin}-${r.destination}`} size="small" variant="outlined"/></TableCell>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{r.travelDate}</Typography></TableCell>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{r.timing}</Typography></TableCell>
                    <TableCell><Chip label={r.tripType||'OneWay'} size="small" color={r.tripType==='RoundTrip'?'secondary':'default'}/></TableCell>
                    <TableCell><Typography variant="body2" fontWeight={700} color="success.dark">₹{Number(r.fare).toLocaleString()}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{r.baggage}</Typography><Typography variant="caption" color="text.secondary" display="block">{r.cabinBaggage} cabin</Typography></TableCell>
                    <TableCell>{r.seatsAvailable||'—'}</TableCell>
                  </>}

                  {/* HOTEL rows */}
                  {r.type==='hotel'&&<>
                    <TableCell><Typography variant="body2" fontWeight={600}>{r.hotelName}</Typography></TableCell>
                    <TableCell>{r.city}</TableCell>
                    <TableCell>{'★'.repeat(r.stars||3)}</TableCell>
                    <TableCell align="right"><Typography variant="body2" fontWeight={700} color="success.dark">₹{Number(r.pricePerNight).toLocaleString()}</Typography></TableCell>
                    <TableCell><Chip label={r.mealPlan||'ROOM_ONLY'} size="small" variant="outlined"/></TableCell>
                    <TableCell><Chip label={r.cancellationPolicy==='FREE_CANCELLATION'?'Free Cancel':'Non-Refund'} size="small" color={r.cancellationPolicy==='FREE_CANCELLATION'?'success':'error'}/></TableCell>
                  </>}

                  {/* INSURANCE rows */}
                  {r.type==='insurance'&&<>
                    <TableCell><Typography variant="body2" fontWeight={600}>{r.planName}</Typography></TableCell>
                    <TableCell><Chip label={r.tripTypeInsurance||'domestic'} size="small"/></TableCell>
                    <TableCell align="right"><Typography variant="body2" fontWeight={700} color="success.dark">₹{Number(r.premiumPerPerson).toLocaleString()}</Typography></TableCell>
                    <TableCell><Typography variant="caption">₹{(r.coverage?.medical||0).toLocaleString()}</Typography></TableCell>
                    <TableCell><Typography variant="caption" sx={{ maxWidth:150, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{(r.benefits||[]).join(', ')}</Typography></TableCell>
                  </>}

                  <TableCell><Chip label={r.mode||'both'} size="small" color={r.mode==='production'?'error':r.mode==='development'?'warning':'info'}/></TableCell>
                  <TableCell><Chip label={r.isActive?'Active':'Off'} size="small" color={r.isActive?'success':'default'}/></TableCell>
                  <TableCell align="center">
                    <Box sx={{ display:'flex', gap:0.5, justifyContent:'center' }}>
                      <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={()=>openEdit(r)}><EditOutlined/></IconButton></Tooltip>
                      <Tooltip title={r.isActive?'Deactivate':'Activate'}><IconButton size="small" color={r.isActive?'warning':'success'} onClick={()=>handleToggle(r)}>{r.isActive?<StopOutlined/>:<CheckCircleOutlined/>}</IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={()=>setDeleteTarget(r)}><DeleteOutlined/></IconButton></Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mt:2, pt:2, borderTop:'1px solid', borderColor:'divider' }}>
          <Typography variant="body2" color="text.secondary">Total: {total} {type} ticket{total!==1?'s':''}</Typography>
          <Box sx={{ display:'flex', gap:1 }}>
            <Button size="small" variant="outlined" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={records.length<20} onClick={()=>setPage(p=>p+1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      {/* ── Add/Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={()=>setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>{editRec?'✏️ Edit':'➕ Add'} {type.charAt(0).toUpperCase()+type.slice(1)} Ticket</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt:0 }}>

            {/* FLIGHT FORM */}
            {type==='flight'&&<>
              <Grid size={6}><TextField label="Flight Number *" fullWidth size="small" placeholder="IX-191" value={form.flightNumber||''} onChange={e=>f('flightNumber',e.target.value)}/></Grid>
              <Grid size={6}><TextField label="Airline / Agency" fullWidth size="small" placeholder="Air India Express" value={form.airline||''} onChange={e=>f('airline',e.target.value)}/></Grid>
              <Grid size={3}><TextField label="Origin *" fullWidth size="small" placeholder="ATQ" value={form.origin||''} onChange={e=>f('origin',e.target.value.toUpperCase())} inputProps={{maxLength:3}}/></Grid>
              <Grid size={3}><TextField label="Destination *" fullWidth size="small" placeholder="DXB" value={form.destination||''} onChange={e=>f('destination',e.target.value.toUpperCase())} inputProps={{maxLength:3}}/></Grid>
              <Grid size={3}><TextField label="Stops" fullWidth size="small" type="number" value={form.stops??0} onChange={e=>f('stops',+e.target.value)} inputProps={{min:0,max:3}}/></Grid>
              <Grid size={3}><TextField label="Via Airport" fullWidth size="small" placeholder="DXB" value={form.viaAirport||''} onChange={e=>f('viaAirport',e.target.value.toUpperCase())} inputProps={{maxLength:3}}/></Grid>
              <Grid size={3}>
                <FormControl fullWidth size="small"><InputLabel>Trip Type</InputLabel>
                  <Select label="Trip Type" value={form.tripType||'OneWay'} onChange={e=>f('tripType',e.target.value)}>
                    <MenuItem value="OneWay">One Way</MenuItem>
                    <MenuItem value="RoundTrip">Round Trip</MenuItem>
                    <MenuItem value="MultiCity">Multi City</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={3}><TextField label="Travel Date *" fullWidth size="small" type="date" value={form.travelDate||''} onChange={e=>f('travelDate',e.target.value)} InputLabelProps={{shrink:true}}/></Grid>
              <Grid size={3}><TextField label="Timing * (HH:MM-HH:MM)" fullWidth size="small" placeholder="00:15-02:55" value={form.timing||''} onChange={e=>f('timing',e.target.value)}/></Grid>
              <Grid size={3}><TextField label="Seats Available" fullWidth size="small" type="number" value={form.seatsAvailable||9} onChange={e=>f('seatsAvailable',+e.target.value)}/></Grid>
              {form.tripType==='RoundTrip'&&<>
                <Grid size={6}><TextField label="Return Date" fullWidth size="small" type="date" value={form.returnDate||''} onChange={e=>f('returnDate',e.target.value)} InputLabelProps={{shrink:true}}/></Grid>
                <Grid size={6}><TextField label="Return Timing (HH:MM-HH:MM)" fullWidth size="small" placeholder="14:00-16:30" value={form.returnTiming||''} onChange={e=>f('returnTiming',e.target.value)}/></Grid>
              </>}
              <Grid size={4}><TextField label="Fare ₹/person *" fullWidth size="small" type="number" value={form.fare||''} onChange={e=>f('fare',e.target.value)}/></Grid>
              <Grid size={4}><TextField label="Check-in Baggage" fullWidth size="small" placeholder="30KG" value={form.baggage||''} onChange={e=>f('baggage',e.target.value)}/></Grid>
              <Grid size={4}><TextField label="Cabin Baggage" fullWidth size="small" placeholder="7KG" value={form.cabinBaggage||''} onChange={e=>f('cabinBaggage',e.target.value)}/></Grid>
              <Grid size={4}>
                <FormControl fullWidth size="small"><InputLabel>Cabin Class</InputLabel>
                  <Select label="Cabin Class" value={form.cabinClass||'ECONOMY'} onChange={e=>f('cabinClass',e.target.value)}>
                    <MenuItem value="ECONOMY">Economy</MenuItem>
                    <MenuItem value="PREMIUM_ECONOMY">Premium Economy</MenuItem>
                    <MenuItem value="BUSINESS">Business</MenuItem>
                    <MenuItem value="FIRST">First Class</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={4}>
                <FormControl fullWidth size="small"><InputLabel>Show In</InputLabel>
                  <Select label="Show In" value={form.mode||'both'} onChange={e=>f('mode',e.target.value)}>
                    <MenuItem value="both">Both (Dev + Prod)</MenuItem>
                    <MenuItem value="development">Dev only</MenuItem>
                    <MenuItem value="production">Prod only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={4}><TextField label="Notes" fullWidth size="small" value={form.notes||''} onChange={e=>f('notes',e.target.value)}/></Grid>
              <Grid size={12}><Divider sx={{ mb:1 }}/><Box sx={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                <FormControlLabel control={<Switch checked={!!form.isNonRefundable} onChange={e=>f('isNonRefundable',e.target.checked)}/>} label="Non-Refundable"/>
                <FormControlLabel control={<Switch checked={!!form.isNonChangeable} onChange={e=>f('isNonChangeable',e.target.checked)}/>} label="Non-Changeable"/>
                <FormControlLabel control={<Switch checked={!!form.isActive}        onChange={e=>f('isActive',e.target.checked)}/>}        label="Active"/>
              </Box></Grid>
            </>}

            {/* HOTEL FORM */}
            {type==='hotel'&&<>
              <Grid size={8}><TextField label="Hotel Name *" fullWidth size="small" placeholder="Taj Mahal Palace" value={form.hotelName||''} onChange={e=>f('hotelName',e.target.value)}/></Grid>
              <Grid size={4}><TextField label="Stars (1-5)" fullWidth size="small" type="number" value={form.stars||4} onChange={e=>f('stars',+e.target.value)} inputProps={{min:1,max:5}}/></Grid>
              <Grid size={6}><TextField label="City *" fullWidth size="small" placeholder="Mumbai" value={form.city||''} onChange={e=>f('city',e.target.value)}/></Grid>
              <Grid size={6}><TextField label="Address" fullWidth size="small" placeholder="202 Main Road" value={form.address||''} onChange={e=>f('address',e.target.value)}/></Grid>
              <Grid size={4}><TextField label="Price/Night ₹ *" fullWidth size="small" type="number" placeholder="6500" value={form.pricePerNight||''} onChange={e=>f('pricePerNight',e.target.value)}/></Grid>
              <Grid size={4}><TextField label="Room Type" fullWidth size="small" placeholder="STANDARD" value={form.roomType||''} onChange={e=>f('roomType',e.target.value)}/></Grid>
              <Grid size={4}><TextField label="Max Guests" fullWidth size="small" type="number" value={form.maxGuests||2} onChange={e=>f('maxGuests',+e.target.value)}/></Grid>
              <Grid size={6}>
                <FormControl fullWidth size="small"><InputLabel>Meal Plan</InputLabel>
                  <Select label="Meal Plan" value={form.mealPlan||'ROOM_ONLY'} onChange={e=>f('mealPlan',e.target.value)}>
                    <MenuItem value="ROOM_ONLY">Room Only</MenuItem>
                    <MenuItem value="BREAKFAST_INCLUDED">Breakfast Included</MenuItem>
                    <MenuItem value="HALF_BOARD">Half Board</MenuItem>
                    <MenuItem value="FULL_BOARD">Full Board</MenuItem>
                    <MenuItem value="ALL_INCLUSIVE">All Inclusive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={6}>
                <FormControl fullWidth size="small"><InputLabel>Cancellation</InputLabel>
                  <Select label="Cancellation" value={form.cancellationPolicy||'FREE_CANCELLATION'} onChange={e=>f('cancellationPolicy',e.target.value)}>
                    <MenuItem value="FREE_CANCELLATION">Free Cancellation</MenuItem>
                    <MenuItem value="NON_REFUNDABLE">Non-Refundable</MenuItem>
                    <MenuItem value="PARTIAL_REFUND">Partial Refund</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}><TextField label="Amenities (comma separated)" fullWidth size="small" placeholder="WiFi, Pool, Restaurant, Gym, Spa" value={form.amenities||''} onChange={e=>f('amenities',e.target.value)}/></Grid>
              <Grid size={6}><TextField label="Room Description" fullWidth size="small" placeholder="Deluxe Room with City View" value={form.roomDescription||''} onChange={e=>f('roomDescription',e.target.value)}/></Grid>
              <Grid size={6}>
                <FormControl fullWidth size="small"><InputLabel>Show In</InputLabel>
                  <Select label="Show In" value={form.mode||'both'} onChange={e=>f('mode',e.target.value)}>
                    <MenuItem value="both">Both (Dev + Prod)</MenuItem>
                    <MenuItem value="development">Dev only</MenuItem>
                    <MenuItem value="production">Prod only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}><TextField label="Notes" fullWidth size="small" value={form.notes||''} onChange={e=>f('notes',e.target.value)}/></Grid>
              <Grid size={12}><Divider sx={{ mb:1 }}/><FormControlLabel control={<Switch checked={!!form.isActive} onChange={e=>f('isActive',e.target.checked)}/>} label="Active"/></Grid>
            </>}

            {/* INSURANCE FORM */}
            {type==='insurance'&&<>
              <Grid size={8}><TextField label="Plan Name *" fullWidth size="small" placeholder="Basic Travel Cover" value={form.planName||''} onChange={e=>f('planName',e.target.value)}/></Grid>
              <Grid size={4}>
                <FormControl fullWidth size="small"><InputLabel>Plan Type</InputLabel>
                  <Select label="Plan Type" value={form.planType||'BASIC'} onChange={e=>f('planType',e.target.value)}>
                    <MenuItem value="BASIC">Basic</MenuItem>
                    <MenuItem value="STANDARD">Standard</MenuItem>
                    <MenuItem value="PREMIUM">Premium</MenuItem>
                    <MenuItem value="COMPREHENSIVE">Comprehensive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={4}>
                <FormControl fullWidth size="small"><InputLabel>Trip Type</InputLabel>
                  <Select label="Trip Type" value={form.tripTypeInsurance||'domestic'} onChange={e=>f('tripTypeInsurance',e.target.value)}>
                    <MenuItem value="domestic">Domestic</MenuItem>
                    <MenuItem value="international">International</MenuItem>
                    <MenuItem value="both">Both</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={4}><TextField label="Premium/Person ₹ *" fullWidth size="small" type="number" placeholder="199" value={form.premiumPerPerson||''} onChange={e=>f('premiumPerPerson',e.target.value)}/></Grid>
              <Grid size={4}>
                <FormControl fullWidth size="small"><InputLabel>Show In</InputLabel>
                  <Select label="Show In" value={form.mode||'both'} onChange={e=>f('mode',e.target.value)}>
                    <MenuItem value="both">Both (Dev + Prod)</MenuItem>
                    <MenuItem value="development">Dev only</MenuItem>
                    <MenuItem value="production">Prod only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={3}><TextField label="Medical Cover ₹"       fullWidth size="small" type="number" value={form.medicalCover||200000}      onChange={e=>f('medicalCover',+e.target.value)}/></Grid>
              <Grid size={3}><TextField label="Trip Cancellation ₹"   fullWidth size="small" type="number" value={form.cancellationCover||10000}   onChange={e=>f('cancellationCover',+e.target.value)}/></Grid>
              <Grid size={3}><TextField label="Baggage Loss ₹"        fullWidth size="small" type="number" value={form.baggageCover||5000}         onChange={e=>f('baggageCover',+e.target.value)}/></Grid>
              <Grid size={3}><TextField label="Flight Delay ₹"        fullWidth size="small" type="number" value={form.flightDelayCover||5000}     onChange={e=>f('flightDelayCover',+e.target.value)}/></Grid>
              <Grid size={12}><TextField label="Benefits (comma separated)" fullWidth size="small" placeholder="Medical Emergency, Trip Cancellation, Baggage Loss, Flight Delay" value={form.benefits||''} onChange={e=>f('benefits',e.target.value)}/></Grid>
              <Grid size={12}><TextField label="Notes" fullWidth size="small" value={form.notes||''} onChange={e=>f('notes',e.target.value)}/></Grid>
              <Grid size={12}><Divider sx={{ mb:1 }}/><FormControlLabel control={<Switch checked={!!form.isActive} onChange={e=>f('isActive',e.target.checked)}/>} label="Active"/></Grid>
            </>}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving?'Saving…':editRec?'Update':'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* ── Bulk Import Dialog ────────────────────────────────────────────── */}
      <Dialog open={bulkOpen} onClose={()=>setBulkOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle fontWeight={700}><ImportOutlined/> Bulk Import {type.charAt(0).toUpperCase()+type.slice(1)} Tickets</DialogTitle>
        <DialogContent dividers sx={{ p:0 }}>
          <Box sx={{ p:2, bgcolor:'info.lighter', borderBottom:'1px solid', borderColor:'divider' }}>
            <Typography variant="caption" color="info.dark" fontWeight={600} display="block" gutterBottom>One ticket per line (pipe-separated):</Typography>
            <Typography variant="caption" color="info.dark" fontFamily="monospace" fontWeight={700}>{BULK_HINTS[type as keyof typeof BULK_HINTS]?.format}</Typography>
          </Box>
          <Box sx={{ p:2, bgcolor:'grey.50', borderBottom:'1px solid', borderColor:'divider' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb:0.5 }}>Examples (click to add):</Typography>
            {BULK_HINTS[type as keyof typeof BULK_HINTS]?.examples.map((ex,i)=>(
              <Typography key={i} variant="caption" fontFamily="monospace" color="text.secondary" display="block"
                sx={{ cursor:'pointer', mb:0.5, '&:hover':{ color:'primary.main' } }}
                onClick={()=>handleBulkParse((bulkText?bulkText+'\n':'')+ex)}>{ex}</Typography>
            ))}
            <Typography variant="caption" color="primary.main">↑ Click to add example</Typography>
          </Box>
          <Box sx={{ p:2 }}>
            <TextField multiline rows={7} fullWidth placeholder={`Paste ${type} data here…`}
              value={bulkText} onChange={e=>handleBulkParse(e.target.value)}
              inputProps={{ style:{ fontFamily:'monospace', fontSize:13 } }}/>
            <Typography variant="caption" color="text.secondary" sx={{ mt:0.5, display:'block' }}>
              Lines: {bulkText.split('\n').filter(l=>l.trim()).length} · Parsed: {bulkPreview.length} · Errors: {bulkErrors.length}
            </Typography>
          </Box>
          {bulkErrors.length>0 && <Box sx={{ px:2, pb:1 }}>{bulkErrors.map((e,i)=><Alert key={i} severity="warning" sx={{ mb:0.5, py:0 }}><Typography variant="caption">{e}</Typography></Alert>)}</Box>}
          {bulkPreview.length>0 && (
            <Box sx={{ px:2, pb:2 }}>
              <Divider sx={{ mb:1.5 }}><Typography variant="caption" color="text.secondary">Preview — {bulkPreview.length} ticket{bulkPreview.length!==1?'s':''}</Typography></Divider>
              <TableContainer sx={{ maxHeight:200, border:'1px solid', borderColor:'divider', borderRadius:1 }}>
                <Table size="small" stickyHeader>
                  <TableHead><TableRow>
                    {type==='flight'&&<><TableCell>Flight</TableCell><TableCell>Route</TableCell><TableCell>Date</TableCell><TableCell>Timing</TableCell><TableCell>Trip</TableCell><TableCell align="right">Fare</TableCell><TableCell>Bag</TableCell><TableCell>Seats</TableCell></>}
                    {type==='hotel'&&<><TableCell>Hotel</TableCell><TableCell>City</TableCell><TableCell>Stars</TableCell><TableCell align="right">Per Night</TableCell><TableCell>Meal</TableCell></>}
                    {type==='insurance'&&<><TableCell>Plan</TableCell><TableCell>Type</TableCell><TableCell align="right">Premium</TableCell><TableCell>Medical</TableCell></>}
                  </TableRow></TableHead>
                  <TableBody>
                    {bulkPreview.map((r,i)=>(
                      <TableRow key={i} hover>
                        {type==='flight'&&<><TableCell><Typography variant="caption" fontFamily="monospace">{r.airline} {r.flightNumber}</Typography></TableCell><TableCell><Typography variant="caption" fontFamily="monospace">{r.origin}→{r.destination}</Typography></TableCell><TableCell><Typography variant="caption">{r.travelDate}</Typography></TableCell><TableCell><Typography variant="caption">{r.timing}</Typography></TableCell><TableCell><Chip label={r.tripType} size="small"/></TableCell><TableCell align="right"><b>₹{(r.fare||0).toLocaleString()}</b></TableCell><TableCell><Typography variant="caption">{r.baggage}</Typography></TableCell><TableCell>{r.seatsAvailable}</TableCell></>}
                        {type==='hotel'&&<><TableCell>{r.hotelName}</TableCell><TableCell>{r.city}</TableCell><TableCell>{'★'.repeat(r.stars||3)}</TableCell><TableCell align="right"><b>₹{(r.pricePerNight||0).toLocaleString()}</b></TableCell><TableCell><Typography variant="caption">{r.mealPlan}</Typography></TableCell></>}
                        {type==='insurance'&&<><TableCell>{r.planName}</TableCell><TableCell><Chip label={r.tripTypeInsurance} size="small"/></TableCell><TableCell align="right"><b>₹{(r.premiumPerPerson||0).toLocaleString()}</b></TableCell><TableCell><Typography variant="caption">₹{(r.coverage?.medical||0).toLocaleString()}</Typography></TableCell></>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setBulkOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<ImportOutlined/>} onClick={handleBulkSave} disabled={bulkSaving||bulkPreview.length===0}>
            {bulkSaving?'Importing…':`Import ${bulkPreview.length>0?bulkPreview.length+' ':''}Ticket${bulkPreview.length!==1?'s':''}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign:'center', pt:4, pb:2 }}>
          <Box sx={{ width:52, height:52, borderRadius:'50%', bgcolor:'error.lighter', display:'flex', alignItems:'center', justifyContent:'center', mx:'auto', mb:2 }}>
            <ExclamationCircleOutlined style={{ fontSize:26, color:'#d32f2f' }}/>
          </Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>Delete Ticket?</Typography>
          <Typography variant="body2" color="text.secondary">
            "<b>{deleteTarget?.flightNumber||deleteTarget?.hotelName||deleteTarget?.planName}</b>" will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px:3, pb:3, gap:1 }}>
          <Button fullWidth variant="outlined" onClick={()=>setDeleteTarget(null)}>Cancel</Button>
          <Button fullWidth variant="contained" color="error" onClick={handleDelete}>Yes, Delete</Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      <Snackbar open={snack.open} autoHideDuration={3500} onClose={()=>setSnack(s=>({...s,open:false}))}
        anchorOrigin={{ vertical:'top', horizontal:'center' }}>
        <Alert onClose={()=>setSnack(s=>({...s,open:false}))} severity={snack.sev} variant="filled" elevation={6}
          sx={{ minWidth:260, fontWeight:500, borderRadius:2 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
