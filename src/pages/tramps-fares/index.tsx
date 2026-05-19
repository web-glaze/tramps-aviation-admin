import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Skeleton,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  Stack,
  Paper,
  Badge,
  Checkbox,
  Toolbar,
  Menu,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ImportOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import { trampsAviationFaresApi } from "../../api";
import MainCard from "../../components/MainCard";
import DateRangeFilter, { defaultLast30, DateRangeValue } from "../../components/DateRangeFilter";
import useUserContext from "../../hooks/useUser";
import { PERMISSIONS } from "../../constants/permissions";

// ── Compact date helper for the Schedule column ─────────────────────────────
// "2026-05-18" → "18 May 26"  — fits two of these side-by-side in a 160px
// column without wrapping. Falls back to the raw string if parsing fails so
// legacy / malformed rows still render.
const _MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtCompactDate(iso?: string): string {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return iso;
  const y = m[1].slice(2);
  const mo = _MONTHS[parseInt(m[2], 10) - 1] || m[2];
  const d = parseInt(m[3], 10);
  return `${d} ${mo} ${y}`;
}

const emptySegment = {
  flightNumber: "",
  airline: "",
  origin: "",
  destination: "",
  departureTime: "",
  arrivalTime: "",
  travelDate: "",
  baggage: "",
  cabinClass: "ECONOMY",
};

const emptyFlight: any = {
  type: "flight",
  isActive: true,
  mode: "both",
  flightNumber: "",
  airline: "",
  origin: "",
  destination: "",
  // ── Split date/time fields (May 2026) ────────────────────────────────────
  // Older fares were saved with a single travelDate + "HH:MM-HH:MM" timing
  // string. The backend schema now also accepts departureDate / arrivalDate
  // / departureTime / arrivalTime, and auto-mirrors them onto the legacy
  // fields. We send both shapes on save so the listing tables (which still
  // read travelDate/timing) keep working without further migration.
  departureDate: "",
  arrivalDate: "",
  departureTime: "",
  arrivalTime: "",
  // Legacy fields — populated from the split fields on save for
  // back-compat with the listing/table renderers.
  travelDate: "",
  timing: "",
  returnDate: "",
  returnTiming: "",
  fare: "",
  baseFare: "",
  airlineTax: "",
  baggage: "30KG",
  cabinBaggage: "7KG",
  cabinClass: "ECONOMY",
  tripType: "OneWay",
  stops: 0,
  viaAirport: "",
  seatsAvailable: 9,
  isNonRefundable: true,
  isNonChangeable: true,
  notes: "",
  segments: [],
};
const emptyHotel = {
  type: "hotel",
  isActive: true,
  mode: "both",
  hotelName: "",
  city: "",
  address: "",
  stars: 4,
  pricePerNight: "",
  roomType: "STANDARD",
  roomDescription: "Deluxe Room",
  cancellationPolicy: "FREE_CANCELLATION",
  mealPlan: "ROOM_ONLY",
  amenities: "",
  maxGuests: 2,
  notes: "",
};
const emptyIns = {
  type: "insurance",
  isActive: true,
  mode: "both",
  planName: "",
  planType: "BASIC",
  tripTypeInsurance: "domestic",
  premiumPerPerson: "",
  medicalCover: 200000,
  cancellationCover: 10000,
  baggageCover: 5000,
  flightDelayCover: 5000,
  benefits: "",
  notes: "",
};

function StatCard({ label, value, color }: any) {
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        flex: 1,
      }}
    >
      <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          color={color || "text.primary"}
        >
          {value ?? "—"}
        </Typography>
      </CardContent>
    </Card>
  );
}

function SegmentEditor({
  segments,
  onChange,
}: {
  segments: any[];
  onChange: (s: any[]) => void;
}) {
  const addSeg = () => onChange([...segments, { ...emptySegment }]);
  const removeSeg = (i: number) =>
    onChange(segments.filter((_, idx) => idx !== i));
  const updateSeg = (i: number, key: string, val: string) =>
    onChange(segments.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)));

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          Stop Segments (TBO-style) — one segment per connection leg
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PlusOutlined />}
          onClick={addSeg}
        >
          Add Segment
        </Button>
      </Box>

      {segments.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            textAlign: "center",
            borderStyle: "dashed",
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            No segments added — this is a non-stop flight. Click "Add Segment"
            to add a stop leg.
          </Typography>
        </Paper>
      ) : (
        segments.map((seg, i) => (
          <Paper
            key={i}
            variant="outlined"
            sx={{
              p: 2,
              mb: 1.5,
              borderColor: "primary.light",
              borderLeft: "3px solid",
              borderLeftColor: "primary.main",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Chip
                label={`Segment ${i + 1}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <IconButton
                size="small"
                color="error"
                onClick={() => removeSeg(i)}
              >
                <MinusCircleOutlined />
              </IconButton>
            </Box>
            <Grid container spacing={1.5}>
              <Grid size={3}>
                <TextField
                  label="Flight No"
                  fullWidth
                  size="small"
                  placeholder="6E-211"
                  value={seg.flightNumber}
                  onChange={(e) => updateSeg(i, "flightNumber", e.target.value)}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Airline"
                  fullWidth
                  size="small"
                  placeholder="IndiGo"
                  value={seg.airline}
                  onChange={(e) => updateSeg(i, "airline", e.target.value)}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Origin"
                  fullWidth
                  size="small"
                  placeholder="DEL"
                  inputProps={{ maxLength: 3 }}
                  value={seg.origin}
                  onChange={(e) =>
                    updateSeg(i, "origin", e.target.value.toUpperCase())
                  }
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Destination"
                  fullWidth
                  size="small"
                  placeholder="DXB"
                  inputProps={{ maxLength: 3 }}
                  value={seg.destination}
                  onChange={(e) =>
                    updateSeg(i, "destination", e.target.value.toUpperCase())
                  }
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Dep Time (HH:MM)"
                  fullWidth
                  size="small"
                  placeholder="14:30"
                  value={seg.departureTime}
                  onChange={(e) =>
                    updateSeg(i, "departureTime", e.target.value)
                  }
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Arr Time (HH:MM)"
                  fullWidth
                  size="small"
                  placeholder="17:45"
                  value={seg.arrivalTime}
                  onChange={(e) => updateSeg(i, "arrivalTime", e.target.value)}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Travel Date"
                  fullWidth
                  size="small"
                  type="date"
                  value={seg.travelDate}
                  onChange={(e) => updateSeg(i, "travelDate", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Baggage (opt)"
                  fullWidth
                  size="small"
                  placeholder="30KG"
                  value={seg.baggage}
                  onChange={(e) => updateSeg(i, "baggage", e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>
        ))
      )}
    </Box>
  );
}

function parseBulk(text: string, type: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const records: any[] = [];
  const errors: string[] = [];
  lines.forEach((line, i) => {
    const p = line.split("|").map((s) => s.trim());
    try {
      if (type === "flight") {
        if (p.length < 6) throw new Error("Need 6+ fields");
        // ── Format detection ─────────────────────────────────────────────
        // The bulk import accepts two flight layouts so old templates keep
        // working after the May 2026 date/time split:
        //   LEGACY (≥6 cols):  FlightNo | Origin | Dest | Date | Timing(HH:MM-HH:MM) | TotalFare | ...
        //   NEW    (≥8 cols):  FlightNo | Origin | Dest | DepartureDate | ArrivalDate |
        //                      DepartureTime | ArrivalTime | TotalFare | ...
        // Heuristic: col index 4 in NEW is a YYYY-MM-DD date; in LEGACY
        // it's a "HH:MM-HH:MM" timing string. If col[4] contains a colon
        // it's almost certainly the timing column → legacy layout.
        const isLegacyLayout = (p[4] || "").includes(":");
        let flNo: string,
          orig: string,
          dest: string,
          depDate: string,
          arrDate: string,
          depTime: string,
          arrTime: string,
          fare: string,
          bag: string,
          airline: string,
          tripT: string,
          retDate: string,
          retTiming: string,
          seats: string,
          stops: string,
          baseFareRaw: string,
          taxRaw: string,
          viaAirport: string,
          pnrsRaw: string,
          segmentsRaw: string;
        if (isLegacyLayout) {
          [
            flNo,
            orig,
            dest,
            depDate,
            // legacy "HH:MM-HH:MM" → split into dep/arr times below
            depTime, // placeholder, real values assigned after the split
            fare,
            bag,
            airline,
            tripT,
            retDate,
            retTiming,
            seats,
            stops,
            baseFareRaw,
            taxRaw,
            viaAirport,
            pnrsRaw,
            segmentsRaw,
          ] = p as any;
          const timing = depTime;
          const [dep, arr] = (timing || "").split("-");
          depTime = (dep || "").trim();
          arrTime = (arr || "").trim();
          arrDate = depDate; // legacy templates can't express overnight arrivals
        } else {
          [
            flNo,
            orig,
            dest,
            depDate,
            arrDate,
            depTime,
            arrTime,
            fare,
            bag,
            airline,
            tripT,
            retDate,
            retTiming,
            seats,
            stops,
            baseFareRaw,
            taxRaw,
            viaAirport,
            pnrsRaw,
            segmentsRaw,
          ] = p as any;
          arrDate = arrDate || depDate;
        }
        const date = depDate; // kept for downstream code that reads `date`
        const dep = depTime;
        const arr = arrTime;
        const timing =
          depTime && arrTime ? `${depTime}-${arrTime}` : "";

        // ── Parse PNRs (optional column 17). Comma-separated. If empty,
        //    backend will auto-seed placeholder PNRs.
        const pnrPool = (pnrsRaw || "")
          .split(",")
          .map((s: string) => s.trim().toUpperCase())
          .filter((s: string) => /^[A-Z0-9]{4,12}$/.test(s));

        // ── Parse Segments (optional column 18). Multi-stop format:
        //    "FLT,ORIG,DEST,DEP,ARR;FLT,ORIG,DEST,DEP,ARR"
        //    Segments are separated by ";", fields within a segment by ",".
        const segments = (segmentsRaw || "")
          .split(";")
          .map((seg: string) => seg.trim())
          .filter(Boolean)
          .map((seg: string) => {
            const [sFlNo, sOrig, sDest, sDep, sArr, sBag] = seg
              .split(",")
              .map((s: string) => s.trim());
            return {
              flightNumber: sFlNo || "",
              airline: airline || "",
              origin: (sOrig || "").toUpperCase().slice(0, 3),
              destination: (sDest || "").toUpperCase().slice(0, 3),
              departureTime: sDep || "",
              arrivalTime: sArr || "",
              travelDate: date,
              baggage: sBag || bag || "30KG",
              cabinClass: "ECONOMY",
            };
          });

        const stopsNum = parseInt(stops || "0") || 0;
        if (segments.length > 1 && stopsNum === 0) {
          // user provided segments but stops=0 → auto-correct
          // (segments.length - 1) gives stop count
        }

        records.push({
          type: "flight",
          flightNumber: flNo,
          origin: orig.toUpperCase().slice(0, 3),
          destination: dest.toUpperCase().slice(0, 3),
          sector: `${orig.toUpperCase().slice(0, 3)}-${dest.toUpperCase().slice(0, 3)}`,
          // Send both legacy + split fields so the backend (and any
          // listing UI still reading travelDate/timing) sees consistent
          // values. Legacy templates supply only depDate, in which case
          // arrDate is set to depDate above.
          travelDate: date,
          timing,
          departureDate: depDate,
          arrivalDate: arrDate,
          departureTime: dep?.trim() || "",
          arrivalTime: arr?.trim() || "",
          fare: Number(fare) || 0,
          baseFare: Number(baseFareRaw) || 0,
          airlineTax: Number(taxRaw) || 0,
          baggage: bag || "30KG",
          cabinBaggage: "7KG",
          airline: airline || "",
          tripType: tripT || "OneWay",
          returnDate: retDate || "",
          returnTiming: retTiming || "",
          seatsAvailable: parseInt(seats || "9") || 9,
          stops:
            segments.length > 1
              ? Math.max(stopsNum, segments.length - 1)
              : stopsNum,
          viaAirport: (viaAirport || "").toUpperCase().slice(0, 3),
          cabinClass: "ECONOMY",
          mode: "both",
          isActive: true,
          isNonRefundable: true,
          isNonChangeable: true,
          notes: "",
          segments,
          pnrPool,
        });
      } else if (type === "hotel") {
        if (p.length < 4) throw new Error("Need 4+ fields");
        const [name, city, stars, ppn, meal, cancel, ams] = p;
        records.push({
          type: "hotel",
          hotelName: name,
          city,
          address: city,
          stars: parseInt(stars) || 4,
          pricePerNight: Number(ppn) || 0,
          mealPlan: meal || "ROOM_ONLY",
          cancellationPolicy: cancel || "FREE_CANCELLATION",
          amenities: (ams || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
          roomType: "STANDARD",
          roomDescription: "Deluxe Room",
          maxGuests: 2,
          mode: "both",
          isActive: true,
          notes: "",
        });
      } else {
        if (p.length < 3) throw new Error("Need 3+ fields");
        const [name, tripT, prem, med, cancel, bag, bens] = p;
        records.push({
          type: "insurance",
          planName: name,
          planType: "BASIC",
          tripTypeInsurance: tripT || "domestic",
          premiumPerPerson: Number(prem) || 0,
          coverage: {
            medical: Number(med) || 200000,
            tripCancellation: Number(cancel) || 10000,
            baggageLoss: Number(bag) || 5000,
          },
          benefits: (bens || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
          mode: "both",
          isActive: true,
          notes: "",
        });
      }
    } catch (e: any) {
      errors.push(`Line ${i + 1}: ${e.message}`);
    }
  });
  return { records, errors };
}

// ─── Excel / CSV column maps ──────────────────────────────────────────────
//   Column order MUST match the parser order. Keep in sync.
const BULK_COLUMNS: Record<string, string[]> = {
  flight: [
    "FlightNo",
    "Origin",
    "Dest",
    // ── Split date/time columns (May 2026) ─────────────────────────────
    // Legacy templates used a single "Date" + "Timing(HH:MM-HH:MM)" pair.
    // The new headers are explicit; the parser still falls back to the
    // legacy combined "Date"/"Timing" cells when only those are present.
    "DepartureDate",
    "ArrivalDate",
    "DepartureTime",
    "ArrivalTime",
    "TotalFare",
    "Baggage",
    "Airline",
    "TripType",
    "ReturnDate",
    "ReturnTiming",
    "Seats",
    "Stops",
    "BaseFare",
    "TaxAmount",
    "ViaAirport",
    "PNRs",
    "Segments",
  ],
  hotel: [
    "HotelName",
    "City",
    "Stars",
    "PricePerNight",
    "MealPlan",
    "Cancellation",
    "Amenities",
  ],
  insurance: [
    "PlanName",
    "TripType",
    "Premium",
    "MedicalCover",
    "CancellationCover",
    "BaggageCover",
    "Benefits",
  ],
};

// One canonical example per type — EVERY column filled with realistic
// values (RoundTrip + 1 stop) so admins can copy-paste and edit out the
// fields they don't need rather than reverse-engineering blank cells.
// PNRs match the seat count so the row is bookable as-is.
const BULK_SAMPLE_ROWS: Record<string, string[][]> = {
  flight: [
    [
      "6E-211",                                                                   // FlightNo
      "DEL",                                                                      // Origin
      "BLR",                                                                      // Dest
      "2026-05-10",                                                               // DepartureDate
      "2026-05-10",                                                               // ArrivalDate (= dep for same-day)
      "09:30",                                                                    // DepartureTime (HH:MM 24h)
      "13:45",                                                                    // ArrivalTime   (HH:MM 24h)
      "5999",                                                                     // TotalFare
      "15KG",                                                                     // Baggage
      "IndiGo",                                                                   // Airline
      "RoundTrip",                                                                // TripType
      "2026-05-15",                                                               // ReturnDate
      "18:00-22:15",                                                              // ReturnTiming (HH:MM-HH:MM)
      "9",                                                                        // Seats
      "1",                                                                        // Stops
      "5100",                                                                     // BaseFare
      "899",                                                                      // TaxAmount
      "HYD",                                                                      // ViaAirport (used when Stops > 0)
      "ABCD12,EFGH34,WXYZ56,QRST78,LMNO90,PQRS01,TUVW23,XYZA45,BCDE67",           // PNRs (9 PNRs = 9 seats)
      "6E-211,DEL,HYD,09:30,11:30;6E-212,HYD,BLR,12:15,13:45",                    // Segments per stop leg
    ],
  ],
  hotel: [
    [
      "Taj Mahal Palace",
      "Mumbai",
      "5",
      "12000",
      "BREAKFAST_INCLUDED",
      "FREE_CANCELLATION",
      "WiFi,Pool,Spa,Gym,AC",
    ],
  ],
  insurance: [
    [
      "International Premium",
      "international",
      "799",
      "500000",
      "50000",
      "25000",
      "Medical Emergency,Trip Cancellation,Baggage Loss,Flight Delay",
    ],
  ],
};

// Convert a 2D array (rows of cells) into pipe-separated text
function rowsToPipeText(rows: string[][], headerRow: boolean): string {
  const data = headerRow ? rows.slice(1) : rows;
  return data
    .filter((r) => r && r.some((c) => String(c ?? "").trim() !== ""))
    .map((r) => r.map((c) => String(c ?? "").trim()).join(" | "))
    .join("\n");
}

// Detect if first row looks like a header (has known column names)
function looksLikeHeader(row: string[], type: string): boolean {
  if (!row?.length) return false;
  const cols = (BULK_COLUMNS[type] || []).map((c) => c.toLowerCase());
  const matches = row.filter((c) =>
    cols.includes(String(c ?? "").trim().toLowerCase()),
  ).length;
  return matches >= 2; // at least 2 known headers
}

// Per UX feedback (May 2026): the bulk import dialog used to show 2-4
// half-filled examples per type and admins kept missing required columns.
// We now ship ONE complete reference example per type — every column
// populated with realistic values — so the meaning of each field is
// unambiguous.
const BULK_HINTS = {
  flight: {
    format:
      "FlightNo | Origin | Dest | DepartureDate(YYYY-MM-DD) | ArrivalDate(YYYY-MM-DD) | DepartureTime(HH:MM) | ArrivalTime(HH:MM) | TotalFare | Baggage | Airline | TripType | ReturnDate | ReturnTiming | Seats | Stops | BaseFare | TaxAmount | ViaAirport | PNRs(comma) | Segments(FLT,ORIG,DEST,DEP,ARR;…)",
    examples: [
      // New split-field example. The bulk parser also still accepts the
      // legacy "...| Date | HH:MM-HH:MM | TotalFare | ..." layout for
      // back-compat with previously-distributed templates.
      "6E-211 | DEL | BLR | 2026-05-10 | 2026-05-10 | 09:30 | 13:45 | 5999 | 15KG | IndiGo | RoundTrip | 2026-05-15 | 18:00-22:15 | 9 | 1 | 5100 | 899 | HYD | ABCD12,EFGH34,WXYZ56,QRST78,LMNO90,PQRS01,TUVW23,XYZA45,BCDE67 | 6E-211,DEL,HYD,09:30,11:30;6E-212,HYD,BLR,12:15,13:45",
    ],
  },
  hotel: {
    format:
      "HotelName | City | Stars | PricePerNight | MealPlan | Cancellation | Amenities(comma)",
    examples: [
      "Taj Mahal Palace | Mumbai | 5 | 12000 | BREAKFAST_INCLUDED | FREE_CANCELLATION | WiFi,Pool,Spa,Gym,AC",
    ],
  },
  insurance: {
    format:
      "PlanName | TripType | Premium | MedicalCover | CancellationCover | BaggageCover | Benefits(comma)",
    examples: [
      "International Premium | international | 799 | 500000 | 50000 | 25000 | Medical Emergency,Trip Cancellation,Baggage Loss,Flight Delay",
    ],
  },
};

export default function TrampsTicketsPage() {
  const { can } = useUserContext();
  const canEdit = can(PERMISSIONS.CONTENT_FARES_EDIT);

  const [tabIdx, setTabIdx] = useState(0);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("");
  // Date range filter — backend accepts `fromDate` / `toDate`, and after
  // the backend's "OR query" change it matches either `travelDate` or the
  // newer `departureDate` field so both legacy and new records show up.
  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultLast30());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRec, setEditRec] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyFlight);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    sev: "success" as any,
  });
  const toast = (msg: string, sev: any = "success") =>
    setSnack({ open: true, msg, sev });

  // PNR Pool management
  const [pnrPoolTarget, setPnrPoolTarget] = useState<any>(null); // which fare's pool we're editing
  const [pnrPoolList, setPnrPoolList] = useState<string[]>([]);
  const [pnrInput, setPnrInput] = useState(""); // textarea input for bulk add
  const [pnrSaving, setPnrSaving] = useState(false);

  // ── Multi-select / bulk actions ──────────────────────────────────────────
  // selectedIds tracks fare _id strings that have their row checkbox ticked.
  // Bulk Delete / Bulk Deactivate fan-out via Promise.allSettled — the
  // backend doesn't yet expose dedicated bulk endpoints, so individual
  // DELETE / PATCH calls are issued in parallel for the selected rows.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  // ── Row action menu ──────────────────────────────────────────────────
  // Per-row Edit / PNRs / Toggle / Delete were taking up 4 icon-buttons
  // worth of horizontal space and breaking the table layout. We now
  // collapse them into a single 3-dot MoreVert menu opened against the
  // anchor element below. Only one menu is open at a time so we can
  // share a single state pair across all rows.
  const [actionMenuRow, setActionMenuRow] = useState<any>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const openActionMenu = (row: any, el: HTMLElement) => {
    setActionMenuRow(row);
    setActionMenuAnchor(el);
  };
  const closeActionMenu = () => {
    setActionMenuRow(null);
    setActionMenuAnchor(null);
  };
  const [bulkActionRunning, setBulkActionRunning] = useState(false);
  // Reset the selection whenever the tab, search, page or filters change so
  // a stale checked id from the Flights tab never accidentally triggers a
  // delete in the Hotels tab.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [tabIdx, page, search, activeFilter, dateRange]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(records.map((r: any) => r._id)));
    else setSelectedIds(new Set());
  };
  const clearSelection = () => setSelectedIds(new Set());

  const runBulkAction = async (
    label: "deactivate" | "delete",
  ) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkActionRunning(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          label === "delete"
            ? trampsAviationFaresApi.delete(id)
            : trampsAviationFaresApi.toggle(id),
        ),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      if (fail === 0) {
        toast(
          label === "delete"
            ? `🗑 Deleted ${ok} ticket${ok !== 1 ? "s" : ""}`
            : `⏸ Toggled ${ok} ticket${ok !== 1 ? "s" : ""}`,
          "success",
        );
      } else {
        toast(
          `${ok} succeeded, ${fail} failed`,
          ok > 0 ? "warning" : "error",
        );
      }
      clearSelection();
      setBulkDeleteOpen(false);
      load();
      loadStats();
    } catch {
      toast("Bulk action failed", "error");
    } finally {
      setBulkActionRunning(false);
    }
  };

  const types = ["flight", "hotel", "insurance"];
  const type = types[tabIdx];
  const empties: any[] = [emptyFlight, emptyHotel, emptyIns];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20, type };
      if (search) params.search = search;
      if (activeFilter !== "") params.isActive = activeFilter;
      if (dateRange.from) params.fromDate = dateRange.from;
      if (dateRange.to)   params.toDate   = dateRange.to;
      const res = await trampsAviationFaresApi.getAll(params);
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];
      setRecords(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter, search, type, dateRange]);
  const loadStats = async () => {
    try {
      const r = await trampsAviationFaresApi.getStats();
      setStats(r.data?.data ?? r.data);
    } catch {}
  };
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadStats();
  }, []);
  const handleSearch = (e: any) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const openAdd = () => {
    setEditRec(null);
    setForm({ ...empties[tabIdx], segments: [], pnrPool: [], pnrInput: "" });
    setDialogOpen(true);
  };
  const openEdit = (r: any) => {
    const fd = { ...r };
    if (r.type === "hotel" && Array.isArray(r.amenities))
      fd.amenities = r.amenities.join(", ");
    if (r.type === "insurance") {
      fd.medicalCover = r.coverage?.medical || 0;
      fd.cancellationCover = r.coverage?.tripCancellation || 0;
      fd.baggageCover = r.coverage?.baggageLoss || 0;
      fd.flightDelayCover = r.coverage?.flightDelay || 0;
      fd.benefits = Array.isArray(r.benefits)
        ? r.benefits.join(", ")
        : r.benefits;
    }
    if (r.type === "flight") {
      fd.segments = Array.isArray(r.segments) ? r.segments : [];
      fd.pnrPool = Array.isArray(r.pnrPool) ? r.pnrPool : [];
      fd.pnrInput = ""; // always start with empty input field
      // ── Back-compat: hydrate split date/time fields from legacy data ──
      // Older fares stored a single travelDate + "HH:MM-HH:MM" timing
      // string. Fall back to those when the new fields are missing so the
      // edit dialog never shows blank required inputs for old records.
      fd.departureDate = r.departureDate || r.travelDate || "";
      fd.arrivalDate   = r.arrivalDate   || r.departureDate || r.travelDate || "";
      if (!r.departureTime || !r.arrivalTime) {
        const [dep, arr] = String(r.timing || "").split("-");
        fd.departureTime = r.departureTime || (dep || "").trim();
        fd.arrivalTime   = r.arrivalTime   || (arr || "").trim();
      } else {
        fd.departureTime = r.departureTime;
        fd.arrivalTime   = r.arrivalTime;
      }
    }
    setEditRec(r);
    setForm(fd);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const required: Record<string, string[]> = {
      flight: [
        "flightNumber",
        "origin",
        "destination",
        // Split date/time fields are the new source of truth. The legacy
        // travelDate/timing are synthesized below from these on submit.
        "departureDate",
        "arrivalDate",
        "departureTime",
        "arrivalTime",
        "fare",
      ],
      hotel: ["hotelName", "city", "pricePerNight"],
      insurance: ["planName", "premiumPerPerson"],
    };
    const missing = (required[type] || []).filter((k) => !form[k]);
    if (missing.length) {
      toast(`Required: ${missing.join(", ")}`, "error");
      return;
    }
    // Explicit cross-field check — arrival cannot precede departure. The
    // backend also rejects this, but failing in the UI gives a faster +
    // clearer error than the generic 400.
    if (
      type === "flight" &&
      form.departureDate &&
      form.arrivalDate &&
      form.arrivalDate < form.departureDate
    ) {
      toast("Arrival date cannot be before departure date.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        type,
        fare: Number(form.fare || 0),
        baseFare: Number(form.baseFare || 0),
        airlineTax: Number(form.airlineTax || 0),
        pricePerNight: Number(form.pricePerNight || 0),
        premiumPerPerson: Number(form.premiumPerPerson || 0),
      };
      if (type === "hotel")
        payload.amenities =
          typeof form.amenities === "string"
            ? form.amenities
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : form.amenities;
      if (type === "insurance") {
        payload.coverage = {
          medical: +form.medicalCover,
          tripCancellation: +form.cancellationCover,
          baggageLoss: +form.baggageCover,
          flightDelay: +form.flightDelayCover,
        };
        payload.benefits =
          typeof form.benefits === "string"
            ? form.benefits
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : form.benefits;
      }
      if (type === "flight") {
        const segs = Array.isArray(form.segments) ? form.segments : [];
        payload.segments = segs;
        // Auto-derive stops from segment count if not manually overridden
        if (segs.length > 0 && (form.stops === 0 || !form.stops))
          payload.stops = segs.length;
        // Auto-derive viaAirport from first segment's destination
        if (segs.length > 0 && !form.viaAirport && segs[0]?.destination)
          payload.viaAirport = segs[0].destination;

        // ── Date/time normalization ─────────────────────────────────────
        // Send both the new split fields (departureDate / arrivalDate /
        // departureTime / arrivalTime) AND the legacy combined fields
        // (travelDate / timing) so older list/table renderers and any
        // downstream consumer still work. Backend pre-save hook also
        // mirrors these in either direction, but doing it here is cheap
        // and makes the network payload self-explanatory.
        payload.departureDate = form.departureDate || "";
        payload.arrivalDate   = form.arrivalDate   || form.departureDate || "";
        payload.departureTime = form.departureTime || "";
        payload.arrivalTime   = form.arrivalTime   || "";
        payload.travelDate    = form.departureDate || form.travelDate || "";
        payload.timing        =
          form.departureTime && form.arrivalTime
            ? `${form.departureTime}-${form.arrivalTime}`
            : (form.timing || "");

        // ── PNR Pool: parse pnrInput + merge with existing pnrPool ──
        const existingPool: string[] = Array.isArray(form.pnrPool)
          ? form.pnrPool
          : [];
        const newPnrs: string[] = form.pnrInput
          ? (form.pnrInput as string)
              .split(/[\n,\s]+/)
              .map((s: string) => s.trim().toUpperCase())
              .filter((s: string) => /^[A-Z0-9]{4,12}$/.test(s))
          : [];
        // Merge: existing + new, deduplicated
        const existingSet = new Set(existingPool);
        const merged = [
          ...existingPool,
          ...newPnrs.filter((p: string) => !existingSet.has(p)),
        ];
        payload.pnrPool = merged;
        payload.pnrInput = undefined; // don't save this temp field
        delete payload.pnrInput;

        if (newPnrs.length > 0) {
          const dupes = newPnrs.filter((p: string) => existingSet.has(p));
          const added = newPnrs.length - dupes.length;
          toast(
            `✅ Ticket saved · ${added} new PNR${added !== 1 ? "s" : ""} added to pool (total: ${merged.length})`,
          );
        }
      }
      if (editRec) {
        await trampsAviationFaresApi.update(editRec._id, payload);
        toast("✅ Ticket updated");
      } else {
        await trampsAviationFaresApi.create(payload);
        toast("✅ Ticket created");
      }
      setDialogOpen(false);
      load();
      loadStats();
    } catch (e: any) {
      toast(e?.response?.data?.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (r: any) => {
    try {
      await trampsAviationFaresApi.toggle(r._id);
      toast(r.isActive ? "⏸ Deactivated" : "▶ Activated", "info");
      load();
      loadStats();
    } catch {
      toast("Failed", "error");
    }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await trampsAviationFaresApi.delete(deleteTarget._id);
      toast("🗑 Deleted");
      setDeleteTarget(null);
      load();
      loadStats();
    } catch {
      toast("Delete failed", "error");
    }
  };

  // ── PNR Pool handlers ─────────────────────────────────────────────────────
  const openPnrPool = (r: any) => {
    setPnrPoolTarget(r);
    setPnrPoolList(Array.isArray(r.pnrPool) ? r.pnrPool : []);
    setPnrInput("");
  };
  const handleAddPnrs = async () => {
    if (!pnrPoolTarget || !pnrInput.trim()) return;
    // Parse: comma, newline, or space separated
    const raw = pnrInput
      .split(/[\n,\s]+/)
      .map((s: string) => s.trim().toUpperCase())
      .filter(Boolean);
    if (!raw.length) {
      toast("No valid PNRs entered", "error");
      return;
    }
    setPnrSaving(true);
    try {
      const res = await trampsAviationFaresApi.addPnrs(pnrPoolTarget._id, raw);
      const pool = res.data?.data?.pool || res.data?.pool || [];
      setPnrPoolList(pool);
      setPnrInput("");
      toast(`✅ ${res.data?.data?.added ?? raw.length} PNR(s) added to pool`);
      load();
    } catch (e: any) {
      toast(e?.response?.data?.message || "Failed to add PNRs", "error");
    } finally {
      setPnrSaving(false);
    }
  };
  const handleRemovePnr = async (pnr: string) => {
    if (!pnrPoolTarget) return;
    try {
      const res = await trampsAviationFaresApi.removePnr(
        pnrPoolTarget._id,
        pnr,
      );
      const pool = res.data?.data?.pool || res.data?.pool || [];
      setPnrPoolList(pool);
      toast(`Removed ${pnr}`, "info");
      load();
    } catch {
      toast("Failed to remove", "error");
    }
  };
  const handleClearPool = async () => {
    if (!pnrPoolTarget) return;
    if (
      !window.confirm(
        `Clear ALL ${pnrPoolList.length} PNR(s) from the pool for ${pnrPoolTarget.flightNumber}?`,
      )
    )
      return;
    try {
      await trampsAviationFaresApi.clearPnrPool(pnrPoolTarget._id);
      setPnrPoolList([]);
      toast("Pool cleared", "warning");
      load();
    } catch {
      toast("Failed to clear", "error");
    }
  };

  const handleBulkParse = (txt: string) => {
    setBulkText(txt);
    const { records: r, errors: e } = parseBulk(txt, type);
    setBulkPreview(r);
    setBulkErrors(e);
  };

  // ── Excel / CSV upload — auto-populates the textarea in pipe format ──
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const handleBulkFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) {
        toast("No sheet found in file", "error");
        return;
      }
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false,
      }) as any;
      if (!rows.length) {
        toast("File is empty", "warning");
        return;
      }
      const hasHeader = looksLikeHeader(rows[0], type);
      const text = rowsToPipeText(rows, hasHeader);
      handleBulkParse(text);
      toast(
        `Loaded ${rows.length - (hasHeader ? 1 : 0)} rows from ${file.name}`,
        "success",
      );
    } catch (err: any) {
      toast(`Failed to read file: ${err.message || err}`, "error");
    } finally {
      if (bulkFileRef.current) bulkFileRef.current.value = "";
    }
  };

  // ── Download a pre-formatted Excel template with headers + sample rows ──
  const handleDownloadTemplate = () => {
    try {
      const headers = BULK_COLUMNS[type] || [];
      const samples = BULK_SAMPLE_ROWS[type] || [];
      const sheetData = [headers, ...samples];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      // Set column widths for readability
      ws["!cols"] = headers.map((h) => ({
        wch: Math.max(12, h.length + 2),
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tickets");
      XLSX.writeFile(wb, `tramps-${type}-template.xlsx`);
      toast(`Template downloaded — fill rows below the header & re-upload`);
    } catch (err: any) {
      toast(`Template export failed: ${err.message || err}`, "error");
    }
  };

  const handleBulkSave = async () => {
    if (!bulkPreview.length) return;
    setBulkSaving(true);
    try {
      const res = await trampsAviationFaresApi.bulkCreate(bulkPreview);
      toast(`✅ Imported ${res.data?.inserted || bulkPreview.length} tickets`);
      setBulkOpen(false);
      setBulkText("");
      setBulkPreview([]);
      load();
      loadStats();
    } catch (e: any) {
      toast(e?.response?.data?.message || "Import failed", "error");
    } finally {
      setBulkSaving(false);
    }
  };

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        ✈️ Tramps Aviation Tickets
      </Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        Manage special flights, hotels and insurance plans. These appear in
        search results above TBO / mock data — in both dev and production.
      </Typography>

      {stats && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Active" value={stats.active} color="success.main" />
          <StatCard
            label="Flights"
            value={stats.flights}
            color="primary.main"
          />
          <StatCard
            label="Hotels"
            value={stats.hotels}
            color="secondary.main"
          />
          <StatCard
            label="Insurance"
            value={stats.insurance}
            color="warning.main"
          />
        </Stack>
      )}

      <MainCard>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Tabs
            value={tabIdx}
            onChange={(_, v) => {
              setTabIdx(v);
              setPage(1);
            }}
          >
            <Tab label="✈ Flights" />
            <Tab label="🏨 Hotels" />
            <Tab label="🛡 Insurance" />
          </Tabs>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton
                size="small"
                onClick={() => {
                  load();
                  loadStats();
                }}
              >
                <ReloadOutlined />
              </IconButton>
            </Tooltip>
            {canEdit && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ImportOutlined />}
                onClick={() => {
                  setBulkText("");
                  setBulkPreview([]);
                  setBulkErrors([]);
                  setBulkOpen(true);
                }}
              >
                Bulk Import
              </Button>
            )}
            {canEdit && (
              <Button
                variant="contained"
                size="small"
                startIcon={<PlusOutlined />}
                onClick={openAdd}
              >
                Add {type}
              </Button>
            )}
          </Stack>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{ display: "flex", gap: 1, flex: 1, minWidth: 200 }}
          >
            <TextField
              size="small"
              placeholder={
                type === "flight"
                  ? "Search sector, flight no…"
                  : type === "hotel"
                    ? "Search hotel, city…"
                    : "Search plan name…"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            <Button type="submit" variant="contained" size="small">
              Search
            </Button>
          </Box>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {/* Date range — backend matches against travelDate OR departureDate
            so both legacy and new records are returned. */}
        {tabIdx === 0 && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <DateRangeFilter
              label="Travel/Departure date:"
              value={dateRange}
              onChange={(v) => { setDateRange(v); setPage(1); }}
              onClear={() => { setDateRange({ from: '', to: '' }); setPage(1); }}
            />
          </Box>
        )}

        {/* ── Bulk-action toolbar — only renders when at least one row is
              checked. Bulk Deactivate fans out toggleActive in parallel;
              Bulk Delete prompts a confirm dialog before fanning out
              delete in parallel. There is no dedicated bulk endpoint
              on the backend yet, so per-row calls are wrapped in
              Promise.allSettled and the success/failure counts are
              surfaced via the existing toast snackbar. ─────────────── */}
        {selectedIds.size > 0 && (
          <Toolbar
            disableGutters
            sx={{
              mb: 1.5,
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: "primary.lighter",
              border: "1px solid",
              borderColor: "primary.light",
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              minHeight: "auto !important",
            }}
          >
            <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>
              {selectedIds.size} selected
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<StopOutlined />}
              disabled={bulkActionRunning}
              onClick={() => runBulkAction("deactivate")}
            >
              Bulk Deactivate
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<DeleteOutlined />}
              disabled={bulkActionRunning}
              onClick={() => setBulkDeleteOpen(true)}
            >
              Bulk Delete
            </Button>
            <Button
              size="small"
              variant="text"
              disabled={bulkActionRunning}
              onClick={clearSelection}
            >
              Clear Selection
            </Button>
          </Toolbar>
        )}

        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    color="primary"
                    indeterminate={
                      selectedIds.size > 0 &&
                      selectedIds.size < records.length
                    }
                    checked={
                      records.length > 0 &&
                      selectedIds.size === records.length
                    }
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    disabled={loading || records.length === 0}
                  />
                </TableCell>
                <TableCell>#</TableCell>
                {tabIdx === 0 && (
                  <>
                    <TableCell>Flight</TableCell>
                    <TableCell>Sector</TableCell>
                    {/* SCHEDULE — combines Dep/Arr Date and Dep/Arr Time into
                        one stacked column to keep the table responsive on
                        narrow screens. Previously these were 4 separate
                        columns which forced horizontal overflow. */}
                    <TableCell sx={{ minWidth: 140 }}>Schedule</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      Trip
                    </TableCell>
                    <TableCell>Fare ₹</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                      Baggage
                    </TableCell>
                    <TableCell>Seats</TableCell>
                    <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                      Stops/Seg
                    </TableCell>
                  </>
                )}
                {tabIdx === 1 && (
                  <>
                    <TableCell>Hotel</TableCell>
                    <TableCell>City</TableCell>
                    <TableCell>Stars</TableCell>
                    <TableCell align="right">Per Night</TableCell>
                    <TableCell>Meal Plan</TableCell>
                    <TableCell>Cancellation</TableCell>
                  </>
                )}
                {tabIdx === 2 && (
                  <>
                    <TableCell>Plan</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Premium/Person</TableCell>
                    <TableCell>Medical Cover</TableCell>
                    <TableCell>Benefits</TableCell>
                  </>
                )}
                <TableCell>Mode</TableCell>
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
                      {/* Flight tab: 13 columns (checkbox + # + Flight +
                          Sector + Schedule + Trip + Fare + Baggage + Seats +
                          Stops + Mode + Status + Actions). Hotels/Insurance
                          keep 11. Skeleton count is informational only —
                          colSpan only matters for the empty-state row. */}
                      {Array(tabIdx === 0 ? 13 : 11)
                        .fill(0)
                        .map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={tabIdx === 0 ? 13 : 11}
                    align="center"
                    sx={{ py: 6 }}
                  >
                    <Typography color="text.secondary">
                      No {type} tickets found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r, i) => (
                  <TableRow
                    key={r._id}
                    hover
                    selected={selectedIds.has(r._id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        color="primary"
                        checked={selectedIds.has(r._id)}
                        onChange={() => toggleSelect(r._id)}
                      />
                    </TableCell>
                    <TableCell>{(page - 1) * 20 + i + 1}</TableCell>

                    {r.type === "flight" && (
                      <>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="primary"
                          >
                            {r.flightNumber}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {r.airline}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={r.sector || `${r.origin}-${r.destination}`}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        {/* SCHEDULE — single column combining dep/arr date
                             + dep/arr time stacked vertically. Falls back to
                             legacy `travelDate` + `timing` for rows that
                             predate the May-2026 schema split. ALWAYS shows
                             both departure and arrival dates side-by-side so
                             admins see at a glance whether the flight lands
                             same-day or next-day. Overnight flights get a
                             warning-colour indicator on the arrival date. */}
                        <TableCell sx={{ minWidth: 140, whiteSpace: "nowrap" }}>
                          {(() => {
                            const dep = r.departureDate || r.travelDate || "";
                            const arr = r.arrivalDate || r.travelDate || dep;
                            const depTime =
                              r.departureTime ||
                              r.timing?.split("-")[0]?.trim() ||
                              "";
                            const arrTime =
                              r.arrivalTime ||
                              r.timing?.split("-")[1]?.trim() ||
                              "";
                            const overnight = !!(arr && dep && arr !== dep);
                            return (
                              <Box sx={{ lineHeight: 1.4 }}>
                                {/* DATE LINE — compact "DD MMM YY" format so
                                     both dep and arr dates fit on one row
                                     without wrapping. */}
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: 11,
                                    display: "block",
                                    whiteSpace: "nowrap",
                                  }}
                                  color="text.secondary"
                                >
                                  {fmtCompactDate(dep)}
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{ mx: 0.5, fontSize: 11 }}
                                    color="text.disabled"
                                  >
                                    →
                                  </Typography>
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{ fontSize: 11 }}
                                    color={
                                      overnight ? "warning.main" : "text.secondary"
                                    }
                                  >
                                    {fmtCompactDate(arr)}
                                    {overnight && (
                                      <Typography
                                        component="span"
                                        variant="caption"
                                        color="warning.main"
                                        sx={{ ml: 0.5, fontSize: 10, fontWeight: 700 }}
                                      >
                                        +1d
                                      </Typography>
                                    )}
                                  </Typography>
                                </Typography>
                                {/* TIME LINE — dominant, bold for quick scan. */}
                                <Typography
                                  variant="body2"
                                  fontFamily="monospace"
                                  sx={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {depTime || "—"}
                                  {arrTime && (
                                    <Typography
                                      component="span"
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ mx: 0.5, fontSize: 12 }}
                                    >
                                      →
                                    </Typography>
                                  )}
                                  {arrTime}
                                </Typography>
                              </Box>
                            );
                          })()}
                        </TableCell>
                        <TableCell
                          sx={{ display: { xs: "none", sm: "table-cell" } }}
                        >
                          <Chip
                            label={r.tripType || "OneWay"}
                            size="small"
                            color={
                              r.tripType === "RoundTrip"
                                ? "secondary"
                                : "default"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color="success.dark"
                          >
                            ₹{Number(r.fare).toLocaleString()}
                          </Typography>
                          {r.baseFare > 0 ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              ₹{Number(r.baseFare).toLocaleString()} + ₹
                              {Number(r.airlineTax || 0).toLocaleString()} tax
                            </Typography>
                          ) : (
                            <Typography
                              variant="caption"
                              color="warning.main"
                              display="block"
                            >
                              ~tax estimated
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell
                          sx={{ display: { xs: "none", md: "table-cell" } }}
                        >
                          <Typography variant="caption">{r.baggage}</Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {r.cabinBaggage} cabin
                          </Typography>
                        </TableCell>
                        <TableCell>{r.seatsAvailable || "—"}</TableCell>
                        <TableCell
                          sx={{ display: { xs: "none", lg: "table-cell" } }}
                        >
                          {(r.stops || 0) > 0 ? (
                            <Chip
                              label={`${r.stops} stop`}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              label="Non-stop"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          )}
                          {r.viaAirport && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              via {r.viaAirport}
                            </Typography>
                          )}
                          {Array.isArray(r.segments) &&
                            r.segments.length > 0 && (
                              <Chip
                                label={`${r.segments.length} seg`}
                                size="small"
                                color="info"
                                sx={{ mt: 0.5 }}
                              />
                            )}
                        </TableCell>
                      </>
                    )}

                    {r.type === "hotel" && (
                      <>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {r.hotelName}
                          </Typography>
                        </TableCell>
                        <TableCell>{r.city}</TableCell>
                        <TableCell>{"★".repeat(r.stars || 3)}</TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color="success.dark"
                          >
                            ₹{Number(r.pricePerNight).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={r.mealPlan || "ROOM_ONLY"}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              r.cancellationPolicy === "FREE_CANCELLATION"
                                ? "Free Cancel"
                                : "Non-Refund"
                            }
                            size="small"
                            color={
                              r.cancellationPolicy === "FREE_CANCELLATION"
                                ? "success"
                                : "error"
                            }
                          />
                        </TableCell>
                      </>
                    )}

                    {r.type === "insurance" && (
                      <>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {r.planName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={r.tripTypeInsurance || "domestic"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color="success.dark"
                          >
                            ₹{Number(r.premiumPerPerson).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            ₹{(r.coverage?.medical || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              maxWidth: 150,
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {(r.benefits || []).join(", ")}
                          </Typography>
                        </TableCell>
                      </>
                    )}

                    <TableCell>
                      <Chip
                        label={r.mode || "both"}
                        size="small"
                        color={
                          r.mode === "production"
                            ? "error"
                            : r.mode === "development"
                              ? "warning"
                              : "info"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={r.isActive ? "Active" : "Off"}
                        size="small"
                        color={r.isActive ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {/* Single 3-dot menu — collapses Edit / PNRs /
                          Toggle / Delete into one button to save column
                          width. Badge on the dot itself shows PNR pool
                          count so the empty-pool warning is still visible
                          without opening the menu. */}
                      {canEdit && (
                        <Tooltip title="Row actions">
                          <IconButton
                            size="small"
                            onClick={(e) => openActionMenu(r, e.currentTarget)}
                          >
                            {r.type === "flight" ? (
                              <Badge
                                badgeContent={(r.pnrPool || []).length}
                                color={
                                  (r.pnrPool || []).length === 0
                                    ? "error"
                                    : "success"
                                }
                                max={99}
                                overlap="circular"
                              >
                                <MoreVertIcon fontSize="small" />
                              </Badge>
                            ) : (
                              <MoreVertIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Shared row-action menu ──────────────────────────────────────
            One Menu instance for the whole table — opens against whichever
            row's 3-dot button was clicked. Lighter than rendering 4 buttons
            per row and keeps the Actions column compact. */}
        <Menu
          anchorEl={actionMenuAnchor}
          open={Boolean(actionMenuAnchor)}
          onClose={closeActionMenu}
          slotProps={{ paper: { sx: { minWidth: 180 } } }}
        >
          <MenuItem
            onClick={() => {
              const row = actionMenuRow;
              closeActionMenu();
              if (row) openEdit(row);
            }}
          >
            <ListItemIcon>
              <EditOutlined style={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText primary="Edit" />
          </MenuItem>
          {actionMenuRow?.type === "flight" && (
            <MenuItem
              onClick={() => {
                const row = actionMenuRow;
                closeActionMenu();
                if (row) openPnrPool(row);
              }}
            >
              <ListItemIcon>
                <Badge
                  badgeContent={(actionMenuRow?.pnrPool || []).length}
                  color={
                    (actionMenuRow?.pnrPool || []).length === 0
                      ? "error"
                      : "success"
                  }
                  max={99}
                >
                  <KeyOutlined style={{ fontSize: 16 }} />
                </Badge>
              </ListItemIcon>
              <ListItemText
                primary="Manage PNRs"
                secondary={`${(actionMenuRow?.pnrPool || []).length} in pool`}
              />
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              const row = actionMenuRow;
              closeActionMenu();
              if (row) handleToggle(row);
            }}
          >
            <ListItemIcon>
              {actionMenuRow?.isActive ? (
                <StopOutlined style={{ fontSize: 16, color: "#ed6c02" }} />
              ) : (
                <CheckCircleOutlined style={{ fontSize: 16, color: "#2e7d32" }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={actionMenuRow?.isActive ? "Deactivate" : "Activate"}
            />
          </MenuItem>
          <MenuItem
            onClick={() => {
              const row = actionMenuRow;
              closeActionMenu();
              if (row) setDeleteTarget(row);
            }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon>
              <DeleteOutlined style={{ fontSize: 16, color: "#d32f2f" }} />
            </ListItemIcon>
            <ListItemText primary="Delete" />
          </MenuItem>
        </Menu>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 2,
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Total: {total} {type} ticket{total !== 1 ? "s" : ""}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
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
              disabled={records.length < 20}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </Box>
        </Box>
      </MainCard>

      {/* ── Add/Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle fontWeight={700}>
          {editRec ? "✏️ Edit" : "➕ Add"}{" "}
          {type.charAt(0).toUpperCase() + type.slice(1)} Ticket
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {type === "flight" && (
              <>
                <Grid size={6}>
                  <TextField
                    label="Flight Number *"
                    fullWidth
                    size="small"
                    placeholder="IX-191"
                    value={form.flightNumber || ""}
                    onChange={(e) => f("flightNumber", e.target.value)}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label="Airline / Agency"
                    fullWidth
                    size="small"
                    placeholder="Air India Express"
                    value={form.airline || ""}
                    onChange={(e) => f("airline", e.target.value)}
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Origin *"
                    fullWidth
                    size="small"
                    placeholder="ATQ"
                    value={form.origin || ""}
                    onChange={(e) => f("origin", e.target.value.toUpperCase())}
                    inputProps={{ maxLength: 3 }}
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Destination *"
                    fullWidth
                    size="small"
                    placeholder="DXB"
                    value={form.destination || ""}
                    onChange={(e) =>
                      f("destination", e.target.value.toUpperCase())
                    }
                    inputProps={{ maxLength: 3 }}
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Stops (0=nonstop)"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.stops ?? 0}
                    onChange={(e) => f("stops", +e.target.value)}
                    inputProps={{ min: 0, max: 5 }}
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Via Airport (if stop)"
                    fullWidth
                    size="small"
                    placeholder="DXB"
                    value={form.viaAirport || ""}
                    onChange={(e) =>
                      f("viaAirport", e.target.value.toUpperCase())
                    }
                    inputProps={{ maxLength: 3 }}
                  />
                </Grid>
                <Grid size={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Trip Type</InputLabel>
                    <Select
                      label="Trip Type"
                      value={form.tripType || "OneWay"}
                      onChange={(e) => f("tripType", e.target.value)}
                    >
                      <MenuItem value="OneWay">One Way</MenuItem>
                      <MenuItem value="RoundTrip">Round Trip</MenuItem>
                      <MenuItem value="MultiCity">Multi City</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {/* ── Departure / Arrival date+time ─────────────────────
                    Replaced the old single "Travel Date" + "HH:MM-HH:MM"
                    timing pair with 4 explicit inputs so admins can model
                    overnight flights (arrivalDate > departureDate) without
                    eyeballing a free-text range.  */}
                <Grid size={3}>
                  <TextField
                    label="Departure Date *"
                    fullWidth
                    size="small"
                    type="date"
                    value={form.departureDate || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      f("departureDate", v);
                      // Mirror onto legacy travelDate so the listing table
                      // (which still reads travelDate) keeps showing this fare.
                      f("travelDate", v);
                      // If arrivalDate is empty or earlier than the new
                      // departureDate, snap it to match — admin can still
                      // bump it forward for overnight legs.
                      if (!form.arrivalDate || form.arrivalDate < v) {
                        f("arrivalDate", v);
                      }
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Arrival Date *"
                    fullWidth
                    size="small"
                    type="date"
                    value={form.arrivalDate || form.departureDate || ""}
                    onChange={(e) => f("arrivalDate", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: form.departureDate || undefined }}
                    helperText={
                      form.arrivalDate &&
                      form.departureDate &&
                      form.arrivalDate < form.departureDate
                        ? "Must be on or after departure date"
                        : undefined
                    }
                    error={
                      !!(
                        form.arrivalDate &&
                        form.departureDate &&
                        form.arrivalDate < form.departureDate
                      )
                    }
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Departure Time *"
                    fullWidth
                    size="small"
                    type="time"
                    value={form.departureTime || ""}
                    onChange={(e) => f("departureTime", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 60 }}
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Arrival Time *"
                    fullWidth
                    size="small"
                    type="time"
                    value={form.arrivalTime || ""}
                    onChange={(e) => f("arrivalTime", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 60 }}
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Seats Available"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.seatsAvailable || 9}
                    onChange={(e) => f("seatsAvailable", +e.target.value)}
                  />
                </Grid>
                {form.tripType === "RoundTrip" && (
                  <>
                    <Grid size={6}>
                      <TextField
                        label="Return Date"
                        fullWidth
                        size="small"
                        type="date"
                        value={form.returnDate || ""}
                        onChange={(e) => f("returnDate", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={6}>
                      <TextField
                        label="Return Timing (HH:MM-HH:MM)"
                        fullWidth
                        size="small"
                        placeholder="14:00-16:30"
                        value={form.returnTiming || ""}
                        onChange={(e) => f("returnTiming", e.target.value)}
                      />
                    </Grid>
                  </>
                )}

                {/* TBO-style segment editor */}
                <Grid size={12}>
                  <Divider sx={{ my: 1.5 }} />
                  <SegmentEditor
                    segments={Array.isArray(form.segments) ? form.segments : []}
                    onChange={(segs) => f("segments", segs)}
                  />
                </Grid>

                <Grid size={12}>
                  <Divider sx={{ my: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Fare Breakdown (if set — exact values shown to agent; else
                      frontend shows ~15% tax estimate)
                    </Typography>
                  </Divider>
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Base Fare ₹/person"
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="e.g. 24000"
                    value={form.baseFare || ""}
                    onChange={(e) => f("baseFare", e.target.value)}
                    helperText="Airline base fare without tax"
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Tax & Fees ₹/person"
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="e.g. 4700"
                    value={form.airlineTax || ""}
                    onChange={(e) => f("airlineTax", e.target.value)}
                    helperText="Govt tax + airline surcharge"
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Total Fare ₹/person *"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.fare || ""}
                    onChange={(e) => f("fare", e.target.value)}
                    helperText="BaseFare + Tax = Total (Customer Pays)"
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Check-in Baggage"
                    fullWidth
                    size="small"
                    placeholder="30KG"
                    value={form.baggage || ""}
                    onChange={(e) => f("baggage", e.target.value)}
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Cabin Baggage"
                    fullWidth
                    size="small"
                    placeholder="7KG"
                    value={form.cabinBaggage || ""}
                    onChange={(e) => f("cabinBaggage", e.target.value)}
                  />
                </Grid>
                <Grid size={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Cabin Class</InputLabel>
                    <Select
                      label="Cabin Class"
                      value={form.cabinClass || "ECONOMY"}
                      onChange={(e) => f("cabinClass", e.target.value)}
                    >
                      <MenuItem value="ECONOMY">Economy</MenuItem>
                      <MenuItem value="PREMIUM_ECONOMY">
                        Premium Economy
                      </MenuItem>
                      <MenuItem value="BUSINESS">Business</MenuItem>
                      <MenuItem value="FIRST">First Class</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Show In</InputLabel>
                    <Select
                      label="Show In"
                      value={form.mode || "both"}
                      onChange={(e) => f("mode", e.target.value)}
                    >
                      <MenuItem value="both">Both (Dev + Prod)</MenuItem>
                      <MenuItem value="development">Dev only</MenuItem>
                      <MenuItem value="production">Prod only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Notes"
                    fullWidth
                    size="small"
                    value={form.notes || ""}
                    onChange={(e) => f("notes", e.target.value)}
                  />
                </Grid>

                {/* ── PNR Pool — directly inside form ─────────────────────── */}
                <Grid size={12}>
                  <Divider sx={{ my: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                      sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      🔑 PNR Pool — Airline PNRs (Admin-Managed & Preloaded)
                    </Typography>
                  </Divider>
                  <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
                    <Typography variant="caption">
                      Enter airline PNRs here (one per line or separated by
                      commas). When an agent books a ticket, the system
                      automatically assigns a PNR from this pool. The agent does
                      not need to enter anything.
                    </Typography>
                  </Alert>

                  {/* Show existing PNRs when editing */}
                  {editRec &&
                    Array.isArray(form.pnrPool) &&
                    form.pnrPool.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mb: 0.75 }}
                        >
                          Current pool ({form.pnrPool.length} PNR
                          {form.pnrPool.length !== 1 ? "s" : ""}):
                        </Typography>
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}
                        >
                          {(form.pnrPool as string[]).map(
                            (pnr: string, i: number) => (
                              <Chip
                                key={pnr}
                                label={i === 0 ? `→ ${pnr}` : pnr}
                                size="small"
                                color={i === 0 ? "primary" : "default"}
                                variant={i === 0 ? "filled" : "outlined"}
                                onDelete={() => {
                                  const updated = (
                                    form.pnrPool as string[]
                                  ).filter(
                                    (_: string, idx: number) => idx !== i,
                                  );
                                  f("pnrPool", updated);
                                }}
                                sx={{
                                  fontFamily: "monospace",
                                  fontWeight: 600,
                                  letterSpacing: 1,
                                }}
                              />
                            ),
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          → = next to be assigned · ✕ to remove before saving
                        </Typography>
                      </Box>
                    )}

                  <TextField
                    label="Add PNRs (one per line or comma separated)"
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    placeholder={
                      "ABCD12\nEFGH34\nWXYZ56\n\nYa ek line mein: ABCD12, EFGH34, WXYZ56"
                    }
                    value={form.pnrInput || ""}
                    onChange={(e) =>
                      f("pnrInput", e.target.value.toUpperCase())
                    }
                    inputProps={{
                      style: { fontFamily: "monospace", fontSize: 13 },
                    }}
                    helperText="Format: 4–12 alphanumeric (A-Z, 0-9). Ek ticket ke liye ek PNR hona chahiye."
                  />
                  {/* Parse and preview */}
                  {form.pnrInput &&
                    (() => {
                      const parsed = (form.pnrInput as string)
                        .split(/[\n,\s]+/)
                        .map((s: string) => s.trim().toUpperCase())
                        .filter((s: string) => /^[A-Z0-9]{4,12}$/.test(s));
                      return parsed.length > 0 ? (
                        <Box
                          sx={{
                            mt: 0.75,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.5,
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="success.main"
                            fontWeight={600}
                          >
                            {parsed.length} valid PNR
                            {parsed.length !== 1 ? "s" : ""}:
                          </Typography>
                          {parsed.map((p: string) => (
                            <Chip
                              key={p}
                              label={p}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{
                                fontFamily: "monospace",
                                fontWeight: 600,
                                fontSize: 11,
                              }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography
                          variant="caption"
                          color="error.main"
                          sx={{ mt: 0.5, display: "block" }}
                        >
                          ⚠ Koi valid PNR nahi — check karo format (4-12
                          alphanumeric only)
                        </Typography>
                      );
                    })()}
                </Grid>

                <Grid size={12}>
                  <Divider sx={{ mb: 1 }} />
                  <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!form.isNonRefundable}
                          onChange={(e) =>
                            f("isNonRefundable", e.target.checked)
                          }
                        />
                      }
                      label="Non-Refundable"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!form.isNonChangeable}
                          onChange={(e) =>
                            f("isNonChangeable", e.target.checked)
                          }
                        />
                      }
                      label="Non-Changeable"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!form.isActive}
                          onChange={(e) => f("isActive", e.target.checked)}
                        />
                      }
                      label="Active"
                    />
                  </Box>
                </Grid>
              </>
            )}

            {type === "hotel" && (
              <>
                <Grid size={8}>
                  <TextField
                    label="Hotel Name *"
                    fullWidth
                    size="small"
                    placeholder="Taj Mahal Palace"
                    value={form.hotelName || ""}
                    onChange={(e) => f("hotelName", e.target.value)}
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Stars (1-5)"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.stars || 4}
                    onChange={(e) => f("stars", +e.target.value)}
                    inputProps={{ min: 1, max: 5 }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label="City *"
                    fullWidth
                    size="small"
                    placeholder="Mumbai"
                    value={form.city || ""}
                    onChange={(e) => f("city", e.target.value)}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label="Address"
                    fullWidth
                    size="small"
                    placeholder="202 Main Road"
                    value={form.address || ""}
                    onChange={(e) => f("address", e.target.value)}
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Price/Night ₹ *"
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="6500"
                    value={form.pricePerNight || ""}
                    onChange={(e) => f("pricePerNight", e.target.value)}
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Room Type"
                    fullWidth
                    size="small"
                    value={form.roomType || ""}
                    onChange={(e) => f("roomType", e.target.value)}
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Max Guests"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.maxGuests || 2}
                    onChange={(e) => f("maxGuests", +e.target.value)}
                  />
                </Grid>
                <Grid size={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Meal Plan</InputLabel>
                    <Select
                      label="Meal Plan"
                      value={form.mealPlan || "ROOM_ONLY"}
                      onChange={(e) => f("mealPlan", e.target.value)}
                    >
                      <MenuItem value="ROOM_ONLY">Room Only</MenuItem>
                      <MenuItem value="BREAKFAST_INCLUDED">
                        Breakfast Included
                      </MenuItem>
                      <MenuItem value="HALF_BOARD">Half Board</MenuItem>
                      <MenuItem value="FULL_BOARD">Full Board</MenuItem>
                      <MenuItem value="ALL_INCLUSIVE">All Inclusive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Cancellation</InputLabel>
                    <Select
                      label="Cancellation"
                      value={form.cancellationPolicy || "FREE_CANCELLATION"}
                      onChange={(e) => f("cancellationPolicy", e.target.value)}
                    >
                      <MenuItem value="FREE_CANCELLATION">
                        Free Cancellation
                      </MenuItem>
                      <MenuItem value="NON_REFUNDABLE">Non-Refundable</MenuItem>
                      <MenuItem value="PARTIAL_REFUND">Partial Refund</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Amenities (comma separated)"
                    fullWidth
                    size="small"
                    placeholder="WiFi, Pool, Gym"
                    value={form.amenities || ""}
                    onChange={(e) => f("amenities", e.target.value)}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label="Room Description"
                    fullWidth
                    size="small"
                    value={form.roomDescription || ""}
                    onChange={(e) => f("roomDescription", e.target.value)}
                  />
                </Grid>
                <Grid size={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Show In</InputLabel>
                    <Select
                      label="Show In"
                      value={form.mode || "both"}
                      onChange={(e) => f("mode", e.target.value)}
                    >
                      <MenuItem value="both">Both (Dev + Prod)</MenuItem>
                      <MenuItem value="development">Dev only</MenuItem>
                      <MenuItem value="production">Prod only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Notes"
                    fullWidth
                    size="small"
                    value={form.notes || ""}
                    onChange={(e) => f("notes", e.target.value)}
                  />
                </Grid>
                <Grid size={12}>
                  <Divider sx={{ mb: 1 }} />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!form.isActive}
                        onChange={(e) => f("isActive", e.target.checked)}
                      />
                    }
                    label="Active"
                  />
                </Grid>
              </>
            )}

            {type === "insurance" && (
              <>
                <Grid size={8}>
                  <TextField
                    label="Plan Name *"
                    fullWidth
                    size="small"
                    placeholder="Basic Travel Cover"
                    value={form.planName || ""}
                    onChange={(e) => f("planName", e.target.value)}
                  />
                </Grid>
                <Grid size={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Plan Type</InputLabel>
                    <Select
                      label="Plan Type"
                      value={form.planType || "BASIC"}
                      onChange={(e) => f("planType", e.target.value)}
                    >
                      <MenuItem value="BASIC">Basic</MenuItem>
                      <MenuItem value="STANDARD">Standard</MenuItem>
                      <MenuItem value="PREMIUM">Premium</MenuItem>
                      <MenuItem value="COMPREHENSIVE">Comprehensive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Trip Type</InputLabel>
                    <Select
                      label="Trip Type"
                      value={form.tripTypeInsurance || "domestic"}
                      onChange={(e) => f("tripTypeInsurance", e.target.value)}
                    >
                      <MenuItem value="domestic">Domestic</MenuItem>
                      <MenuItem value="international">International</MenuItem>
                      <MenuItem value="both">Both</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Premium/Person ₹ *"
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="199"
                    value={form.premiumPerPerson || ""}
                    onChange={(e) => f("premiumPerPerson", e.target.value)}
                  />
                </Grid>
                <Grid size={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Show In</InputLabel>
                    <Select
                      label="Show In"
                      value={form.mode || "both"}
                      onChange={(e) => f("mode", e.target.value)}
                    >
                      <MenuItem value="both">Both (Dev + Prod)</MenuItem>
                      <MenuItem value="development">Dev only</MenuItem>
                      <MenuItem value="production">Prod only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Medical Cover ₹"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.medicalCover || 200000}
                    onChange={(e) => f("medicalCover", +e.target.value)}
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Trip Cancellation ₹"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.cancellationCover || 10000}
                    onChange={(e) => f("cancellationCover", +e.target.value)}
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Baggage Loss ₹"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.baggageCover || 5000}
                    onChange={(e) => f("baggageCover", +e.target.value)}
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    label="Flight Delay ₹"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.flightDelayCover || 5000}
                    onChange={(e) => f("flightDelayCover", +e.target.value)}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Benefits (comma separated)"
                    fullWidth
                    size="small"
                    placeholder="Medical Emergency, Trip Cancellation, Baggage Loss"
                    value={form.benefits || ""}
                    onChange={(e) => f("benefits", e.target.value)}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Notes"
                    fullWidth
                    size="small"
                    value={form.notes || ""}
                    onChange={(e) => f("notes", e.target.value)}
                  />
                </Grid>
                <Grid size={12}>
                  <Divider sx={{ mb: 1 }} />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!form.isActive}
                        onChange={(e) => f("isActive", e.target.checked)}
                      />
                    }
                    label="Active"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editRec ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bulk Import Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle fontWeight={700}>
          <ImportOutlined /> Bulk Import{" "}
          {type.charAt(0).toUpperCase() + type.slice(1)} Tickets
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: "info.lighter",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="caption"
              color="info.dark"
              fontWeight={600}
              display="block"
              gutterBottom
            >
              One ticket per line (pipe-separated):
            </Typography>
            <Typography
              variant="caption"
              color="info.dark"
              fontFamily="monospace"
              fontWeight={700}
            >
              {BULK_HINTS[type as keyof typeof BULK_HINTS]?.format}
            </Typography>
          </Box>
          {type === "flight" && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: "warning.lighter",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="warning.dark"
                fontWeight={600}
                display="block"
              >
                🛬 Multi-stop flights: fill the <b>Segments</b> column with each
                leg in order — format{" "}
                <code>FLT,ORIG,DEST,DEP,ARR;FLT,ORIG,DEST,DEP,ARR</code>. Stops
                count is auto-calculated from segments.
              </Typography>
              <Typography
                variant="caption"
                color="success.dark"
                fontWeight={600}
                display="block"
                sx={{ mt: 0.5 }}
              >
                🎟️ <b>PNRs</b> column (optional) — paste real airline PNRs
                comma-separated (e.g. <code>ABC123,DEF456</code>). Leave blank
                to auto-seed placeholders. PNRs must be 4–12 chars (A–Z, 0–9).
              </Typography>
              <Typography
                variant="caption"
                color="info.dark"
                fontWeight={600}
                display="block"
                sx={{ mt: 0.5 }}
              >
                📊 Prefer Excel? Click <b>Download Template</b>, fill the rows,
                then <b>Upload Excel/CSV</b> — the textarea auto-fills in the
                correct format.
              </Typography>
            </Box>
          )}

          {/* ── Excel / CSV import & template buttons ───────────────────── */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <input
              ref={bulkFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleBulkFile(f);
              }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<ImportOutlined />}
              onClick={() => bulkFileRef.current?.click()}
            >
              Upload Excel / CSV
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={handleDownloadTemplate}
            >
              📥 Download Template
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              .xlsx, .xls, .csv supported · headers auto-detected
            </Typography>
          </Box>

          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 0.5 }}
            >
              Examples (click to add):
            </Typography>
            {BULK_HINTS[type as keyof typeof BULK_HINTS]?.examples.map(
              (ex, i) => (
                <Typography
                  key={i}
                  variant="caption"
                  fontFamily="monospace"
                  color="text.secondary"
                  display="block"
                  sx={{
                    cursor: "pointer",
                    mb: 0.5,
                    "&:hover": { color: "primary.main" },
                  }}
                  onClick={() =>
                    handleBulkParse((bulkText ? bulkText + "\n" : "") + ex)
                  }
                >
                  {ex}
                </Typography>
              ),
            )}
            <Typography variant="caption" color="primary.main">
              ↑ Click to add example
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <TextField
              multiline
              rows={7}
              fullWidth
              placeholder={`Paste ${type} data here…`}
              value={bulkText}
              onChange={(e) => handleBulkParse(e.target.value)}
              inputProps={{ style: { fontFamily: "monospace", fontSize: 13 } }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block" }}
            >
              Lines: {bulkText.split("\n").filter((l) => l.trim()).length} ·
              Parsed: {bulkPreview.length} · Errors: {bulkErrors.length}
            </Typography>
          </Box>
          {bulkErrors.length > 0 && (
            <Box sx={{ px: 2, pb: 1 }}>
              {bulkErrors.map((e, i) => (
                <Alert key={i} severity="warning" sx={{ mb: 0.5, py: 0 }}>
                  <Typography variant="caption">{e}</Typography>
                </Alert>
              ))}
            </Box>
          )}
          {bulkPreview.length > 0 && (
            <Box sx={{ px: 2, pb: 2 }}>
              <Divider sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Preview — {bulkPreview.length} record
                  {bulkPreview.length !== 1 ? "s" : ""}
                </Typography>
              </Divider>
              <TableContainer
                sx={{
                  maxHeight: 200,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {type === "flight" && (
                        <>
                          <TableCell>Flight</TableCell>
                          <TableCell>Route</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Fare</TableCell>
                          <TableCell>Bag</TableCell>
                          <TableCell>Seats</TableCell>
                          <TableCell>Stops</TableCell>
                        </>
                      )}
                      {type === "hotel" && (
                        <>
                          <TableCell>Hotel</TableCell>
                          <TableCell>City</TableCell>
                          <TableCell>Stars</TableCell>
                          <TableCell>Per Night</TableCell>
                          <TableCell>Meal</TableCell>
                        </>
                      )}
                      {type === "insurance" && (
                        <>
                          <TableCell>Plan</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Premium</TableCell>
                          <TableCell>Medical</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bulkPreview.map((r, i) => (
                      <TableRow key={i} hover>
                        {type === "flight" && (
                          <>
                            <TableCell>
                              <Typography
                                variant="caption"
                                fontFamily="monospace"
                              >
                                {r.airline} {r.flightNumber}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="caption"
                                fontFamily="monospace"
                              >
                                {r.origin}→{r.destination}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {r.travelDate}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <b>₹{(r.fare || 0).toLocaleString()}</b>
                              {r.baseFare > 0 && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                >
                                  ₹{r.baseFare}+₹{r.airlineTax || 0} tax
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {r.baggage}
                              </Typography>
                            </TableCell>
                            <TableCell>{r.seatsAvailable}</TableCell>
                            <TableCell>
                              {r.stops > 0 ? (
                                <Chip
                                  label={`${r.stops}s via ${r.viaAirport || "?"}`}
                                  size="small"
                                  color="warning"
                                />
                              ) : (
                                <Chip
                                  label="Nonstop"
                                  size="small"
                                  color="success"
                                />
                              )}
                            </TableCell>
                          </>
                        )}
                        {type === "hotel" && (
                          <>
                            <TableCell>{r.hotelName}</TableCell>
                            <TableCell>{r.city}</TableCell>
                            <TableCell>{"★".repeat(r.stars || 3)}</TableCell>
                            <TableCell>
                              ₹{(r.pricePerNight || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>{r.mealPlan}</TableCell>
                          </>
                        )}
                        {type === "insurance" && (
                          <>
                            <TableCell>{r.planName}</TableCell>
                            <TableCell>{r.tripTypeInsurance}</TableCell>
                            <TableCell>
                              ₹{(r.premiumPerPerson || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              ₹{(r.coverage?.medical || 0).toLocaleString()}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<ImportOutlined />}
            onClick={handleBulkSave}
            disabled={bulkSaving || bulkPreview.length === 0}
          >
            {bulkSaving
              ? "Importing…"
              : `Import ${bulkPreview.length > 0 ? bulkPreview.length + " " : ""}Ticket${bulkPreview.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── PNR Pool Management Dialog ────────────────────────────────────── */}
      <Dialog
        open={!!pnrPoolTarget}
        onClose={() => setPnrPoolTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight={700}>
          🔑 PNR Pool — {pnrPoolTarget?.flightNumber} (
          {pnrPoolTarget?.sector ||
            `${pnrPoolTarget?.origin}-${pnrPoolTarget?.destination}`}
          )
        </DialogTitle>
        <DialogContent dividers>
          {/* Info box */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              display="block"
              fontWeight={600}
              gutterBottom
            >
              How PNR Pool works:
            </Typography>
            <Typography variant="caption" display="block">
              The admin pre-loads airline PNRs into this pool in advance. When
              an agent makes a booking, the system automatically assigns one
              PNR from the pool — the agent doesn&apos;t need to type anything.
              Once the pool is empty, new bookings are blocked until more PNRs
              are added.
            </Typography>
          </Alert>

          {/* Pool status */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: 2,
              p: 1.5,
              bgcolor:
                pnrPoolList.length === 0 ? "error.lighter" : "success.lighter",
              borderRadius: 2,
              border: "1px solid",
              borderColor:
                pnrPoolList.length === 0 ? "error.light" : "success.light",
            }}
          >
            <KeyOutlined
              style={{
                color: pnrPoolList.length === 0 ? "#d32f2f" : "#2e7d32",
                fontSize: 20,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body2"
                fontWeight={700}
                color={pnrPoolList.length === 0 ? "error.main" : "success.main"}
              >
                {pnrPoolList.length === 0
                  ? "⚠️ Pool is EMPTY — bookings will be blocked!"
                  : `✅ ${pnrPoolList.length} PNR(s) available in pool`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Each booking consumes one PNR from the top of the list (FIFO
                order)
              </Typography>
            </Box>
            {pnrPoolList.length > 0 && (
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={handleClearPool}
              >
                Clear All
              </Button>
            )}
          </Box>

          {/* Current PNRs in pool */}
          {pnrPoolList.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  display: "block",
                  mb: 1,
                }}
              >
                PNRs in Pool (top = assigned first):
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {pnrPoolList.map((pnr, i) => (
                  <Chip
                    key={pnr}
                    label={`${i === 0 ? "→ " : ""}${pnr}`}
                    size="small"
                    color={i === 0 ? "primary" : "default"}
                    variant={i === 0 ? "filled" : "outlined"}
                    onDelete={() => handleRemovePnr(pnr)}
                    sx={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      letterSpacing: 1,
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Add new PNRs */}
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{
              textTransform: "uppercase",
              letterSpacing: 0.5,
              display: "block",
              mb: 1,
            }}
          >
            Add PNRs to Pool:
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            size="small"
            placeholder={
              "Enter PNRs — one per line, or comma/space separated:\nABCD12\nEFGH34\nWXYZ56"
            }
            value={pnrInput}
            onChange={(e) => setPnrInput(e.target.value)}
            inputProps={{
              style: {
                fontFamily: "monospace",
                fontSize: 13,
                textTransform: "uppercase",
              },
            }}
            helperText="Format: 4–12 alphanumeric characters each (e.g. ABCD12, J4K2M9). Duplicates auto-ignored."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPnrPoolTarget(null)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<PlusOutlined />}
            onClick={handleAddPnrs}
            disabled={pnrSaving || !pnrInput.trim()}
          >
            {pnrSaving ? "Adding…" : "Add PNRs to Pool"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ textAlign: "center", pt: 4, pb: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              bgcolor: "error.lighter",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <ExclamationCircleOutlined
              style={{ fontSize: 26, color: "#d32f2f" }}
            />
          </Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Delete Ticket?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            "
            <b>
              {deleteTarget?.flightNumber ||
                deleteTarget?.hotelName ||
                deleteTarget?.planName}
            </b>
            " will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="error"
            onClick={handleDelete}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bulk Delete Confirm ─────────────────────────────────────────────
            Triggered from the "Bulk Delete" button in the multi-select
            toolbar. Shows the count and warns it cannot be undone. The
            actual fan-out happens in runBulkAction("delete") via
            Promise.allSettled — partial failures surface as a warning
            toast. */}
      <Dialog
        open={bulkDeleteOpen}
        onClose={() =>
          !bulkActionRunning && setBulkDeleteOpen(false)
        }
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ textAlign: "center", pt: 4, pb: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              bgcolor: "error.lighter",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <ExclamationCircleOutlined
              style={{ fontSize: 26, color: "#d32f2f" }}
            />
          </Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Delete {selectedIds.size} ticket
            {selectedIds.size !== 1 ? "s" : ""}?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will permanently remove the selected{" "}
            <b>{selectedIds.size}</b>{" "}
            {type} ticket{selectedIds.size !== 1 ? "s" : ""}. This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            disabled={bulkActionRunning}
            onClick={() => setBulkDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="error"
            disabled={bulkActionRunning}
            onClick={() => runBulkAction("delete")}
          >
            {bulkActionRunning ? "Deleting…" : "Yes, Delete All"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.sev}
          variant="filled"
          elevation={6}
          sx={{ minWidth: 260, fontWeight: 500, borderRadius: 2 }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
