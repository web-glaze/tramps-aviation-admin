// ─────────────────────────────────────────────────────────────────────────────
// AddSeriesFare.tsx — TBO-style full-page "Add Series Fare" form (also handles EDIT).
//
// This is a full page (not a dialog). Two routes funnel through this same
// component:
//
//   /tramps-fares/add-series                → CREATE mode (no params)
//   /tramps-fares/edit-series/:groupId      → EDIT mode (groupId param present)
//
// In edit mode we fetch the existing series fare group on mount via
//   GET /admin/tramps-fares/series/:groupId
// and prefill ALL form sections — master data, flight info, Adult/Child/Infant
// fares, AND the Day Allocation Inventory table from each per-day fare doc.
//
// Series semantics: instead of a single ticket, the admin enters a
// Travel-From → Travel-To date range. The backend (POST /admin/tramps-fares/
// series) expands that range into ONE fare document per calendar day. So a
// 1–5 May range with ticketsPerDay=2 produces 5 day-tickets, each seeded with
// 2 seats. The response carries a shared `seriesGroupId` linking them.
//
// Backend contract — POST/PUT /admin/tramps-fares/series body:
//   { sector?, origin, destination, airline, flightNumber, cabinClass?,
//     tripType?, mode?, isNonRefundable?, isNonChangeable?, stops?, viaAirport?,
//     baggage?, cabinBaggage?, departureTime, arrivalTime, segments?,
//     adultBaseFare, adultTax, childBaseFare?, childTax?, infantBaseFare?,
//     infantTax?, agencySurcharge?, travelFrom, travelTo, ticketsPerDay,
//     // Per-day overrides + day-level config (Day Allocation Inventory):
//     pnrsByDate?: Record<string, string[]>,
//     farePerDay?: Record<string, number>,
//     ticketsPerDayByDate?: Record<string, number>,
//     disabledDates?: string[],
//     disableBeforeHrs?: number }
//
// CREATE response: { seriesGroupId, created, travelFrom, travelTo, fares: [...] }
// GET    response: { seriesGroupId, count, fares: [...] }  // per Phase 1
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
  Chip,
  Stack,
  IconButton,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { trampsAviationFaresApi } from "../../api";
import MainCard from "../../components/MainCard";

// ── A fresh, blank stop-segment ──────────────────────────────────────────────
// Segments are OPTIONAL on the series contract — they describe the individual
// legs of a multi-stop journey. Kept deliberately lightweight here.
const emptySegment = {
  flightNumber: "",
  airline: "",
  origin: "",
  destination: "",
  departureTime: "",
  arrivalTime: "",
  baggage: "",
};

// ── The full form state ──────────────────────────────────────────────────────
// All numeric fare fields are stored as strings while typing (so the inputs
// can be cleared) and coerced to numbers only at submit time.
const initialForm = {
  // Master Data
  origin: "",
  destination: "",
  airline: "",
  flightNumber: "",
  cabinClass: "ECONOMY",
  tripType: "OneWay",
  mode: "both",
  // ── Status / fare-rule toggles (May 2026) ────────────────────────────────
  // The single legacy "refundable" switch was replaced with three explicit
  // toggles matching the TBO admin UX (orange-coloured switches in the owner
  // screenshot). All three are stored exactly as the backend expects them:
  //   isActive          → drives whether the series + each per-day fare is
  //                       searchable / bookable. Defaults to true. Also seeds
  //                       the "Active" column of every freshly-generated row
  //                       in the Day Allocation Inventory table.
  //   isNonRefundable   → fare rule flag, sent as-is on submit. Defaults true.
  //   isNonChangeable   → fare rule flag, sent as-is on submit. Defaults true.
  isActive: true,
  isNonRefundable: true,
  isNonChangeable: true,
  travelFrom: "",
  travelTo: "",
  ticketsPerDay: "1",
  // Default "disable before hours" — drives the per-row default in the Day
  // Allocation Inventory table. Backend default is 24 if omitted.
  disableBeforeHrs: "24",

  // Flight Information
  departureTime: "",
  arrivalTime: "",
  stops: "0",
  viaAirport: "",
  baggage: "30KG",
  cabinBaggage: "7KG",

  // Fare Information (per pax type — strings while editing)
  adultBaseFare: "",
  adultTax: "",
  childBaseFare: "",
  childTax: "",
  infantBaseFare: "",
  infantTax: "",
  // A single agency surcharge applied across all pax types.
  agencySurcharge: "0",
};

// Small numeric helper — turns "" / undefined / bad input into 0.
const toNum = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ── Day-row state shape (Day Allocation Inventory) ───────────────────────────
// One entry per YYYY-MM-DD date in the Travel-From→Travel-To range. Values
// are stored as strings to keep inputs controllable while typing; coerced to
// numbers at submit time.
type DayRow = {
  pnr: string;                // raw text — split into PNR list on submit
  fare: string;               // per-day adult-total override (empty = use default)
  ticketsPerDay: string;      // per-day seat count (empty = use form default)
  disableBeforeHrs: string;   // per-day cutoff hours (empty = use form default)
  active: boolean;            // false → date sent in `disabledDates`
};

// ── Build an inclusive YYYY-MM-DD list between two date strings ──────────────
// Returns [] if either input is missing/invalid or `to` is before `from`.
function enumerateDates(from: string, to: string): string[] {
  if (!from || !to) return [];
  const f = new Date(from + "T00:00:00");
  const t = new Date(to + "T00:00:00");
  if (isNaN(f.getTime()) || isNaN(t.getTime()) || t < f) return [];
  const out: string[] = [];
  const cursor = new Date(f);
  while (cursor <= t) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export default function AddSeriesFarePage() {
  const navigate = useNavigate();
  // The single route param drives the create-vs-edit mode switch — when
  // present we fetch + prefill, when absent we start with a blank form.
  const { groupId } = useParams<{ groupId?: string }>();
  const isEdit = !!groupId;

  const [form, setForm] = useState<any>({ ...initialForm });
  const [segments, setSegments] = useState<any[]>([]);
  // The Day Allocation Inventory state — keyed by YYYY-MM-DD so admin edits
  // to a date survive shrinking/extending the range and coming back.
  const [dayRows, setDayRows] = useState<Record<string, DayRow>>({});
  const [saving, setSaving] = useState(false);
  // In edit mode we show a centered spinner while the GET resolves so the
  // admin doesn't see and start editing an empty form.
  const [loading, setLoading] = useState<boolean>(isEdit);
  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    sev: "success" as any,
  });
  const toast = (msg: string, sev: any = "success") =>
    setSnack({ open: true, msg, sev });

  // Generic field setter — `f('origin', 'DEL')`.
  const f = (key: string, val: any) =>
    setForm((p: any) => ({ ...p, [key]: val }));

  // ── Auto-built sector ──────────────────────────────────────────────────────
  // The contract has an optional `sector` — we derive it as "ORIGIN-DEST" so
  // the listing/search UI gets a consistent label without manual entry.
  const sector = useMemo(() => {
    const o = (form.origin || "").trim().toUpperCase();
    const d = (form.destination || "").trim().toUpperCase();
    return o && d ? `${o}-${d}` : "";
  }, [form.origin, form.destination]);

  // ── Live day-count hint ─────────────────────────────────────────────────────
  // Inclusive number of calendar days in the Travel-From → Travel-To range.
  // The backend creates one day-ticket per day, so this is the approximate
  // ticket count surfaced to the admin before they submit.
  const dayCount = useMemo(() => {
    if (!form.travelFrom || !form.travelTo) return 0;
    const from = new Date(form.travelFrom + "T00:00:00");
    const to = new Date(form.travelTo + "T00:00:00");
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
    if (to < from) return 0;
    // +1 to make the range inclusive of both endpoints.
    const ms = to.getTime() - from.getTime();
    return Math.floor(ms / 86400000) + 1;
  }, [form.travelFrom, form.travelTo]);

  // ── Per-row fare totals ─────────────────────────────────────────────────────
  // Each pax row's Total is Base Fare + Taxes + Agency Surcharge, recomputed
  // live on every keystroke (it's a useMemo over the relevant form fields).
  // The same `agencySurcharge` is added to every pax type, matching how the
  // backend applies the shared surcharge.
  const surcharge = toNum(form.agencySurcharge);
  const adultTotal = useMemo(
    () => toNum(form.adultBaseFare) + toNum(form.adultTax) + surcharge,
    [form.adultBaseFare, form.adultTax, surcharge],
  );
  const childTotal = useMemo(
    () => toNum(form.childBaseFare) + toNum(form.childTax) + surcharge,
    [form.childBaseFare, form.childTax, surcharge],
  );
  const infantTotal = useMemo(
    () => toNum(form.infantBaseFare) + toNum(form.infantTax) + surcharge,
    [form.infantBaseFare, form.infantTax, surcharge],
  );

  // ── Day Allocation auto-generation ─────────────────────────────────────────
  // Whenever Travel-From, Travel-To, the default ticketsPerDay, or the default
  // disableBeforeHrs change we re-derive the row list. Existing edits for a
  // date that's still in the new range are PRESERVED — this lets the admin
  // tweak the date range without losing already-typed per-day overrides.
  // Dates that disappear from the new range have their state dropped.
  useEffect(() => {
    const dates = enumerateDates(form.travelFrom, form.travelTo);
    if (dates.length === 0) {
      // Empty range → clear the whole table.
      setDayRows({});
      return;
    }
    setDayRows((prev) => {
      const next: Record<string, DayRow> = {};
      for (const d of dates) {
        if (prev[d]) {
          // Keep the admin's existing edits for this date.
          next[d] = prev[d];
        } else {
          // Seed a new row from the current form defaults. The "Active"
          // column inherits the master `isActive` toggle — flipping the
          // top-level toggle to OFF therefore seeds new rows as inactive
          // (the row's Active checkbox can still be toggled independently).
          next[d] = {
            pnr: "",
            fare: "",
            ticketsPerDay: "",
            disableBeforeHrs: "",
            active: form.isActive !== false,
          };
        }
      }
      return next;
    });
    // We intentionally only re-run when the range bounds change. Per-row
    // changes inside `dayRows` don't (and shouldn't) regenerate the table.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.travelFrom, form.travelTo]);

  // Per-row setter — patches a single field on a single date's row.
  const updateDayRow = (date: string, key: keyof DayRow, val: any) => {
    setDayRows((prev) => ({
      ...prev,
      [date]: { ...prev[date], [key]: val },
    }));
  };

  // Excel-style fill-down — copy a value into the same column for
  // EVERY day-row in the table. Used by the "Apply to all" buttons in
  // the master defaults bar so admins don't have to type the same PNR
  // / hrs / tickets in 30 rows individually.
  //
  // June 2026: skips ROWS where active === false so admins can mark a
  // few specific days off and still bulk-fill the rest. Also lets the
  // admin pass `sourceDate` to start the fill from any row (not just
  // the first row in the table).
  const fillAllDayRows = (
    key: keyof DayRow,
    val: any,
    opts?: { sourceDate?: string; includeInactive?: boolean },
  ) => {
    setDayRows((prev) => {
      const next: Record<string, DayRow> = {};
      Object.keys(prev).forEach((date) => {
        const row = prev[date];
        // Skip the source row (it already has the value we're copying)
        // so we don't trigger a redundant re-render of that input.
        if (opts?.sourceDate === date) {
          next[date] = row;
          return;
        }
        // Respect Active = false unless the caller forces inclusion.
        if (!opts?.includeInactive && row.active === false) {
          next[date] = row;
          return;
        }
        next[date] = { ...row, [key]: val };
      });
      return next;
    });
  };
  // Remove a single date from the table (admin's "remove this day" action).
  // The corresponding date is then sent to the backend in `disabledDates`
  // only if the date is also outside the current range — otherwise just
  // dropping the row is enough since we omit it from all the per-day maps.
  const deleteDayRow = (date: string) => {
    setDayRows((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
  };

  // Sorted array view used to render the table — keeps date order stable
  // regardless of how the object's keys were inserted.
  const sortedDayDates = useMemo(
    () => Object.keys(dayRows).sort(),
    [dayRows],
  );

  // ── Segment editor handlers ─────────────────────────────────────────────────
  const addSeg = () => setSegments((s) => [...s, { ...emptySegment }]);
  const removeSeg = (i: number) =>
    setSegments((s) => s.filter((_, idx) => idx !== i));
  const updateSeg = (i: number, key: string, val: string) =>
    setSegments((s) =>
      s.map((seg, idx) => (idx === i ? { ...seg, [key]: val } : seg)),
    );

  // ── EDIT mode: load the existing series group ──────────────────────────────
  // Runs once on mount when `groupId` is present. The GET returns a list of
  // per-day fare docs sharing the same seriesGroupId — we use the FIRST
  // doc to seed all the "shared" fields (master data, flight info, fares)
  // and then walk every doc to build the dayRows map.
  useEffect(() => {
    if (!isEdit || !groupId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await trampsAviationFaresApi.getSeries(groupId);
        const data = res.data?.data ?? res.data ?? {};
        const fares: any[] = Array.isArray(data.fares) ? data.fares : [];
        if (cancelled) return;
        if (fares.length === 0) {
          toast("Series has no fares — nothing to edit.", "error");
          setLoading(false);
          return;
        }
        // ── Seed shared fields from the FIRST per-day fare doc ─────────────
        const head = fares[0];
        // Range bounds — derive from the docs themselves so we never expand
        // beyond what actually exists.
        const datesSorted = fares
          .map((d: any) => d.departureDate || d.travelDate)
          .filter(Boolean)
          .sort();
        const travelFrom = datesSorted[0] || "";
        const travelTo = datesSorted[datesSorted.length - 1] || "";

        setForm((p: any) => ({
          ...p,
          origin: head.origin || "",
          destination: head.destination || "",
          airline: head.airline || "",
          flightNumber: head.flightNumber || "",
          cabinClass: head.cabinClass || "ECONOMY",
          tripType: head.tripType || "OneWay",
          mode: head.mode || "both",
          // ── Toggle prefill ───────────────────────────────────────────────
          // The series GET returns the per-day fare docs verbatim, so we read
          // the three flags off the head doc. `isActive` falls back to true
          // (a freshly-created doc is active unless explicitly disabled).
          // `isNonRefundable` / `isNonChangeable` default to true to match
          // the form's initial state (typical of restricted series fares).
          isActive: head.isActive !== false,
          isNonRefundable: head.isNonRefundable !== false,
          isNonChangeable: head.isNonChangeable !== false,
          travelFrom,
          travelTo,
          ticketsPerDay: String(head.seatsAvailable ?? head.ticketsPerDay ?? 1),
          disableBeforeHrs: String(head.disableBeforeHrs ?? 24),
          departureTime: head.departureTime || "",
          arrivalTime: head.arrivalTime || "",
          stops: String(head.stops ?? 0),
          viaAirport: head.viaAirport || "",
          baggage: head.baggage || "30KG",
          cabinBaggage: head.cabinBaggage || "7KG",
          adultBaseFare:
            head.adultBaseFare !== undefined ? String(head.adultBaseFare) :
            (head.baseFare !== undefined ? String(head.baseFare) : ""),
          adultTax:
            head.adultTax !== undefined ? String(head.adultTax) :
            (head.airlineTax !== undefined ? String(head.airlineTax) : ""),
          childBaseFare: head.childBaseFare !== undefined ? String(head.childBaseFare) : "",
          childTax:     head.childTax     !== undefined ? String(head.childTax)     : "",
          infantBaseFare: head.infantBaseFare !== undefined ? String(head.infantBaseFare) : "",
          infantTax:     head.infantTax     !== undefined ? String(head.infantTax)     : "",
          agencySurcharge: head.agencySurcharge !== undefined ? String(head.agencySurcharge) : "0",
        }));
        // Stop-segments live on the head doc — reuse as-is.
        if (Array.isArray(head.segments)) setSegments(head.segments);

        // ── Build day-row state from each per-day fare doc ───────────────
        // For each doc we map:
        //   pnr              → comma-joined pool (admin edits as text)
        //   fare             → only set if it differs from the head's adult-total
        //                       so a 0-override is meaningful but identical
        //                       values render as empty (= "use default")
        //   ticketsPerDay    → seatsAvailable (or per-day override)
        //   disableBeforeHrs → per-doc field (or empty = use form default)
        //   active           → !isActive maps to "Inactive" status chip
        const rows: Record<string, DayRow> = {};
        const headAdultTotal =
          toNum(head.adultBaseFare ?? head.baseFare ?? 0) +
          toNum(head.adultTax ?? head.airlineTax ?? 0) +
          toNum(head.agencySurcharge ?? 0);
        for (const doc of fares) {
          const date = doc.departureDate || doc.travelDate;
          if (!date) continue;
          const pool: string[] = Array.isArray(doc.pnrPool) ? doc.pnrPool : [];
          const docTotal =
            toNum(doc.adultBaseFare ?? doc.baseFare ?? 0) +
            toNum(doc.adultTax ?? doc.airlineTax ?? 0) +
            toNum(doc.agencySurcharge ?? 0);
          rows[date] = {
            pnr: pool.join(", "),
            fare: docTotal && docTotal !== headAdultTotal ? String(docTotal) : "",
            ticketsPerDay:
              doc.seatsAvailable !== undefined
                ? String(doc.seatsAvailable)
                : "",
            disableBeforeHrs:
              doc.disableBeforeHrs !== undefined
                ? String(doc.disableBeforeHrs)
                : "",
            active: doc.isActive !== false,
          };
        }
        setDayRows(rows);
      } catch (e: any) {
        toast(
          e?.response?.data?.message || "Failed to load series for editing",
          "error",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, isEdit]);

  // ── Submit (handles both CREATE and EDIT) ──────────────────────────────────
  const handleSubmit = async () => {
    // Required-field validation per the contract. Note adultBaseFare/adultTax
    // must be present (numeric, including 0 is allowed) — child/infant are
    // optional.
    const missing: string[] = [];
    if (!form.origin.trim()) missing.push("Origin");
    if (!form.destination.trim()) missing.push("Destination");
    if (!form.airline.trim()) missing.push("Airline");
    if (!form.flightNumber.trim()) missing.push("Flight Number");
    if (!form.departureTime.trim()) missing.push("Departure Time");
    if (!form.arrivalTime.trim()) missing.push("Arrival Time");
    if (form.adultBaseFare === "") missing.push("Adult Base Fare");
    if (form.adultTax === "") missing.push("Adult Tax");
    if (!form.travelFrom) missing.push("Travel From");
    if (!form.travelTo) missing.push("Travel To");
    if (!form.ticketsPerDay || toNum(form.ticketsPerDay) < 1)
      missing.push("Tickets Per Day");
    if (missing.length) {
      toast(`Required: ${missing.join(", ")}`, "error");
      return;
    }
    // Cross-field: Travel-To cannot precede Travel-From.
    if (form.travelTo < form.travelFrom) {
      toast("Travel To cannot be before Travel From.", "error");
      return;
    }

    // ── Derive per-day maps from the Day Allocation Inventory ──────────────
    // We walk each kept row and build:
    //   pnrsByDate          — only dates with at least one valid PNR
    //   farePerDay          — only dates with a non-empty per-day override
    //   ticketsPerDayByDate — only dates with a per-day seats override
    //   disabledDates       — only dates whose Active checkbox is OFF
    // Empty/default values are OMITTED so the backend's defaults apply.
    const pnrsByDate: Record<string, string[]> = {};
    const farePerDay: Record<string, number> = {};
    const ticketsPerDayByDate: Record<string, number> = {};
    const disabledDates: string[] = [];
    for (const date of sortedDayDates) {
      const row = dayRows[date];
      if (!row) continue;
      const pool = (row.pnr || "")
        .split(/[\n,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9]{4,12}$/.test(s));
      if (pool.length) pnrsByDate[date] = pool;
      if (row.fare !== "") farePerDay[date] = toNum(row.fare);
      if (row.ticketsPerDay !== "")
        ticketsPerDayByDate[date] = toNum(row.ticketsPerDay);
      if (!row.active) disabledDates.push(date);
    }

    // Build the request body exactly per the backend contract. Optional
    // numeric pax fields are only included when the admin entered a value.
    const body: any = {
      sector,
      origin: form.origin.trim().toUpperCase(),
      destination: form.destination.trim().toUpperCase(),
      airline: form.airline.trim(),
      flightNumber: form.flightNumber.trim(),
      cabinClass: form.cabinClass,
      tripType: form.tripType,
      mode: form.mode,
      // ── Status / fare-rule flags ─────────────────────────────────────────
      // The three master toggles sit at the top of the page and write
      // directly to the backend-facing fields — no UI inversion any more.
      isActive: form.isActive !== false,
      isNonRefundable: form.isNonRefundable !== false,
      isNonChangeable: form.isNonChangeable !== false,
      stops: toNum(form.stops),
      viaAirport: form.viaAirport.trim().toUpperCase() || undefined,
      baggage: form.baggage.trim() || undefined,
      cabinBaggage: form.cabinBaggage.trim() || undefined,
      departureTime: form.departureTime.trim(),
      arrivalTime: form.arrivalTime.trim(),
      // Adult fare is required.
      adultBaseFare: toNum(form.adultBaseFare),
      adultTax: toNum(form.adultTax),
      agencySurcharge: surcharge,
      travelFrom: form.travelFrom,
      travelTo: form.travelTo,
      ticketsPerDay: toNum(form.ticketsPerDay),
      disableBeforeHrs: toNum(form.disableBeforeHrs) || 24,
    };
    // Optional child / infant fares — only sent when filled in.
    if (form.childBaseFare !== "")
      body.childBaseFare = toNum(form.childBaseFare);
    if (form.childTax !== "") body.childTax = toNum(form.childTax);
    if (form.infantBaseFare !== "")
      body.infantBaseFare = toNum(form.infantBaseFare);
    if (form.infantTax !== "") body.infantTax = toNum(form.infantTax);
    // Optional segments — only sent when the admin added stop legs.
    if (segments.length) body.segments = segments;
    // Per-day maps — only sent when they're non-empty so the backend can
    // fall back to its defaults for any day not explicitly customized.
    if (Object.keys(pnrsByDate).length) body.pnrsByDate = pnrsByDate;
    if (Object.keys(farePerDay).length) body.farePerDay = farePerDay;
    if (Object.keys(ticketsPerDayByDate).length)
      body.ticketsPerDayByDate = ticketsPerDayByDate;
    if (disabledDates.length) body.disabledDates = disabledDates;

    setSaving(true);
    try {
      if (isEdit && groupId) {
        // ── UPDATE — replaces the whole group with the current spec. ─────
        await trampsAviationFaresApi.updateSeries(groupId, body);
        toast(`Series updated — ${groupId}`, "success");
      } else {
        // ── CREATE — expands the range into one day-ticket per day. ──────
        const res = await trampsAviationFaresApi.createSeries(body);
        const data = res.data?.data ?? res.data ?? {};
        const created = data.created ?? data.fares?.length ?? dayCount;
        const newGroupId = data.seriesGroupId || "—";
        toast(
          `Series created — ${created} day-tickets generated (${newGroupId})`,
          "success",
        );
      }
      // Brief pause so the success snackbar is visible, then return to the
      // fares listing where the new/updated series rows will appear.
      setTimeout(() => navigate("/tramps-fares"), 1200);
    } catch (e: any) {
      toast(
        e?.response?.data?.message ||
          (isEdit ? "Failed to update series fare" : "Failed to create series fare"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Initial loading spinner (edit mode only) ───────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    // Bottom padding leaves room for the sticky action bar so it never
    // overlaps the last section's content.
    <Box sx={{ pb: 12 }}>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <IconButton size="small" onClick={() => navigate("/tramps-fares")}>
          <ArrowLeftOutlined />
        </IconButton>
        <Typography variant="h4" fontWeight={700}>
          {isEdit ? "Edit Series Fare" : "Add Series Fare"}
        </Typography>
      </Stack>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3, ml: 5 }}>
        {isEdit
          ? `Editing series group ${groupId}. The Travel-From → Travel-To range is locked — use the Day Allocation table to remove individual days.`
          : "Create a TBO-style fare series. The Travel-From → Travel-To range is expanded into one bookable day-ticket per calendar day."}
      </Typography>

      {/* ── SECTION 1 — Master Data ──────────────────────────────────────── */}
      <MainCard title="Master Data" sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Origin *"
              fullWidth
              size="small"
              placeholder="DEL"
              inputProps={{ maxLength: 3 }}
              value={form.origin}
              onChange={(e) => f("origin", e.target.value.toUpperCase())}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Destination *"
              fullWidth
              size="small"
              placeholder="DXB"
              inputProps={{ maxLength: 3 }}
              value={form.destination}
              onChange={(e) => f("destination", e.target.value.toUpperCase())}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {/* Sector is auto-built from Origin-Destination — read only. */}
            <TextField
              label="Sector (auto)"
              fullWidth
              size="small"
              value={sector}
              placeholder="ORIGIN-DEST"
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Airline *"
              fullWidth
              size="small"
              placeholder="IndiGo"
              value={form.airline}
              onChange={(e) => f("airline", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Flight Number *"
              fullWidth
              size="small"
              placeholder="6E-211"
              value={form.flightNumber}
              onChange={(e) => f("flightNumber", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Cabin Class</InputLabel>
              <Select
                label="Cabin Class"
                value={form.cabinClass}
                onChange={(e) => f("cabinClass", e.target.value)}
              >
                <MenuItem value="ECONOMY">Economy</MenuItem>
                <MenuItem value="PREMIUM">Premium</MenuItem>
                <MenuItem value="BUSINESS">Business</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Trip Type</InputLabel>
              <Select
                label="Trip Type"
                value={form.tripType}
                onChange={(e) => f("tripType", e.target.value)}
              >
                <MenuItem value="OneWay">One Way</MenuItem>
                <MenuItem value="RoundTrip">Round Trip</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {/* "Mode" (Both/Development/Production) was a dev-only switch and
              has been removed from the UI — every new series is implicitly
              `mode: "both"`. The form state still carries `mode: "both"` so
              the submit/edit payload stays valid. */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Travel From *"
              fullWidth
              size="small"
              type="date"
              value={form.travelFrom}
              onChange={(e) => f("travelFrom", e.target.value)}
              InputLabelProps={{ shrink: true }}
              // In EDIT mode the range is locked — shrinking/extending it
              // here would silently lose days. Admin removes days via the
              // Day Allocation table's delete-row action instead.
              InputProps={{ readOnly: isEdit }}
              disabled={isEdit}
              helperText={isEdit ? "Locked in edit mode" : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Travel To *"
              fullWidth
              size="small"
              type="date"
              value={form.travelTo}
              onChange={(e) => f("travelTo", e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{ readOnly: isEdit }}
              disabled={isEdit}
              helperText={isEdit ? "Locked in edit mode" : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Tickets Per Day *"
              fullWidth
              size="small"
              type="number"
              inputProps={{ min: 1 }}
              value={form.ticketsPerDay}
              onChange={(e) => f("ticketsPerDay", e.target.value)}
            />
          </Grid>
          {/* ── Status / fare-rule toggles row ─────────────────────────────
              Three explicit MUI Switches matching the orange-coloured TBO
              admin screenshot. They occupy a full-width grid cell so they
              sit on a single row on desktop and wrap to multiple rows on
              small screens. Labels are on the right of each switch (MUI
              default for FormControlLabel). Each switch writes directly to
              the backend-facing field name (no UI inversion) so the submit
              body builder can copy the values across as-is. */}
          <Grid size={12}>
            <Box
              sx={{
                display: "flex",
                gap: 3,
                flexWrap: "wrap",
                alignItems: "center",
                pt: 0.5,
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    color="warning"
                    checked={form.isActive !== false}
                    onChange={(e) => f("isActive", e.target.checked)}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    color="warning"
                    checked={form.isNonRefundable !== false}
                    onChange={(e) => f("isNonRefundable", e.target.checked)}
                  />
                }
                label="Non-Refundable"
              />
              <FormControlLabel
                control={
                  <Switch
                    color="warning"
                    checked={form.isNonChangeable !== false}
                    onChange={(e) => f("isNonChangeable", e.target.checked)}
                  />
                }
                label="Non-Changeable"
              />
            </Box>
          </Grid>
        </Grid>

        {/* Live hint — approximate number of day-tickets that will be made. */}
        <Box sx={{ mt: 2 }}>
          <Chip
            color={dayCount > 0 ? "primary" : "default"}
            variant="outlined"
            label={
              dayCount > 0
                ? `This will ${isEdit ? "manage" : "create"} approximately ${dayCount} ticket${
                    dayCount !== 1 ? "s" : ""
                  } (one per day)`
                : "Select Travel From & Travel To to preview the ticket count"
            }
          />
        </Box>
      </MainCard>

      {/* ── SECTION 2 — Flight Information ───────────────────────────────── */}
      <MainCard title="Flight Information" sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Departure Time * (HH:MM)"
              fullWidth
              size="small"
              placeholder="09:30"
              value={form.departureTime}
              onChange={(e) => f("departureTime", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Arrival Time * (HH:MM)"
              fullWidth
              size="small"
              placeholder="13:45"
              value={form.arrivalTime}
              onChange={(e) => f("arrivalTime", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Stops"
              fullWidth
              size="small"
              type="number"
              inputProps={{ min: 0 }}
              value={form.stops}
              onChange={(e) => f("stops", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Via Airport (if stop)"
              fullWidth
              size="small"
              placeholder="HYD"
              inputProps={{ maxLength: 3 }}
              value={form.viaAirport}
              onChange={(e) => f("viaAirport", e.target.value.toUpperCase())}
              // Only meaningful when there is at least one stop.
              disabled={toNum(form.stops) < 1}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Check-in Baggage"
              fullWidth
              size="small"
              placeholder="30KG"
              value={form.baggage}
              onChange={(e) => f("baggage", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Cabin Baggage"
              fullWidth
              size="small"
              placeholder="7KG"
              value={form.cabinBaggage}
              onChange={(e) => f("cabinBaggage", e.target.value)}
            />
          </Grid>
        </Grid>

        {/* ── Optional stop-segment editor ───────────────────────────────── */}
        <Box sx={{ mt: 3 }}>
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
              Stop Segments (optional) — one segment per connection leg
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
                No segments added — treated as a non-stop flight. Click "Add
                Segment" to add a stop leg.
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
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="Flight No"
                      fullWidth
                      size="small"
                      placeholder="6E-211"
                      value={seg.flightNumber}
                      onChange={(e) =>
                        updateSeg(i, "flightNumber", e.target.value)
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="Airline"
                      fullWidth
                      size="small"
                      placeholder="IndiGo"
                      value={seg.airline}
                      onChange={(e) => updateSeg(i, "airline", e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
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
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="Destination"
                      fullWidth
                      size="small"
                      placeholder="HYD"
                      inputProps={{ maxLength: 3 }}
                      value={seg.destination}
                      onChange={(e) =>
                        updateSeg(
                          i,
                          "destination",
                          e.target.value.toUpperCase(),
                        )
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="Dep Time (HH:MM)"
                      fullWidth
                      size="small"
                      placeholder="09:30"
                      value={seg.departureTime}
                      onChange={(e) =>
                        updateSeg(i, "departureTime", e.target.value)
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="Arr Time (HH:MM)"
                      fullWidth
                      size="small"
                      placeholder="11:30"
                      value={seg.arrivalTime}
                      onChange={(e) =>
                        updateSeg(i, "arrivalTime", e.target.value)
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
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
      </MainCard>

      {/* ── SECTION 3 — Fare Information ─────────────────────────────────── */}
      <MainCard title="Fare Information" sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
          Adult Base Fare & Taxes are required. Child / Infant rows are
          optional. The Total column updates live: Base Fare + Taxes + Agency
          Surcharge.
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Pax Type</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell>Base Fare</TableCell>
                <TableCell>Taxes</TableCell>
                <TableCell>Agency Surcharge</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* ── ADULT ROW ─────────────────────────────────────────────
                  The Adult row drives the shared `agencySurcharge` — its
                  surcharge input writes the single form.agencySurcharge value
                  applied to every pax type. */}
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    Adult *
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label="INR" size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    placeholder="5100"
                    value={form.adultBaseFare}
                    onChange={(e) => f("adultBaseFare", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    placeholder="899"
                    value={form.adultTax}
                    onChange={(e) => f("adultTax", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    placeholder="0"
                    value={form.agencySurcharge}
                    onChange={(e) => f("agencySurcharge", e.target.value)}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="primary">
                    ₹ {adultTotal.toLocaleString("en-IN")}
                  </Typography>
                </TableCell>
              </TableRow>

              {/* ── CHILD ROW (optional) ──────────────────────────────────
                  Surcharge cell is read-only here — the shared surcharge is
                  driven only from the Adult row. */}
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    Child
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label="INR" size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    placeholder="optional"
                    value={form.childBaseFare}
                    onChange={(e) => f("childBaseFare", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    placeholder="optional"
                    value={form.childTax}
                    onChange={(e) => f("childTax", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    ₹ {surcharge.toLocaleString("en-IN")}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700}>
                    ₹ {childTotal.toLocaleString("en-IN")}
                  </Typography>
                </TableCell>
              </TableRow>

              {/* ── INFANT ROW (optional) ─────────────────────────────────*/}
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    Infant
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label="INR" size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    placeholder="optional"
                    value={form.infantBaseFare}
                    onChange={(e) => f("infantBaseFare", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    placeholder="optional"
                    value={form.infantTax}
                    onChange={(e) => f("infantTax", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    ₹ {surcharge.toLocaleString("en-IN")}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700}>
                    ₹ {infantTotal.toLocaleString("en-IN")}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </MainCard>

      {/* ── SECTION 4 — Day Allocation Inventory ────────────────────────────
          Replaces the old PNR Pool textarea. One row per calendar day in the
          Travel-From → Travel-To range, auto-generated when the range or
          defaults change (existing per-day edits are preserved). Each row
          can independently override PNRs, fare, seats, cutoff hours, and
          active status. The submit handler turns this table into the
          pnrsByDate / farePerDay / ticketsPerDayByDate / disabledDates maps
          described in the backend contract. */}
      <MainCard title="Day Allocation Inventory" sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
          One row per calendar day in the travel range. PNR, Fare and Tickets
          left blank fall back to the master defaults from the sections above.
          Uncheck "Active" to mark a day as inactive (sent as a disabled date
          to the backend). Use the trash icon to drop a day entirely.
        </Typography>

        {/* ── Master defaults + Excel-style "Apply to all rows" ────────
            June 2026: added per-field "Apply to all rows" buttons so
            the admin can type a value once at the top and push it into
            every day-row at once (like Excel's drag-fill or a TBO bulk
            edit). Each button uses fillAllDayRows() to mutate that one
            column across every row in `dayRows`. ─────────────────── */}
        <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Master: Disable Before Hrs */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                label="Default Disable Before Hrs"
                size="small"
                type="number"
                inputProps={{ min: 0 }}
                sx={{ width: 220 }}
                value={form.disableBeforeHrs}
                onChange={(e) => f("disableBeforeHrs", e.target.value)}
              />
              <Button
                size="small"
                variant="outlined"
                disabled={sortedDayDates.length === 0 || !form.disableBeforeHrs}
                onClick={() => fillAllDayRows("disableBeforeHrs", form.disableBeforeHrs)}
                sx={{ minWidth: 0, px: 1.5, whiteSpace: "nowrap" }}
                title="Copy this value into every day-row's Disable Before Hrs column"
              >
                ↓ All rows
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              Hours before departure to auto-close bookings
            </Typography>
          </Box>

          {/* Master: Tickets / Day */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                label="Default Tickets / Day"
                size="small"
                type="number"
                inputProps={{ min: 0 }}
                sx={{ width: 180 }}
                value={form.ticketsPerDay}
                onChange={(e) => f("ticketsPerDay", e.target.value)}
              />
              <Button
                size="small"
                variant="outlined"
                disabled={sortedDayDates.length === 0 || !form.ticketsPerDay}
                onClick={() => fillAllDayRows("ticketsPerDay", form.ticketsPerDay)}
                sx={{ minWidth: 0, px: 1.5, whiteSpace: "nowrap" }}
                title="Copy this value into every day-row's Tickets / Day column"
              >
                ↓ All rows
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              Seats released per travel day
            </Typography>
          </Box>

          {/* Day count badge */}
          <Box sx={{ alignSelf: "center", ml: "auto" }}>
            <Typography
              variant="caption"
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 999,
                bgcolor: "primary.50",
                color: "primary.main",
                fontWeight: 700,
              }}
            >
              {sortedDayDates.length} day{sortedDayDates.length !== 1 ? "s" : ""}{" "}
              in the table
            </Typography>
          </Box>
        </Box>

        {sortedDayDates.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 3, textAlign: "center", borderStyle: "dashed", borderColor: "divider" }}
          >
            <Typography variant="caption" color="text.secondary">
              Pick Travel From & Travel To above — one row per day will appear here.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 460 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">Active</TableCell>
                  <TableCell>Travel Date</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      PNR
                      <Box
                        component="button"
                        type="button"
                        title="Copy the FIRST row's PNR into every row below"
                        onClick={() => {
                          const firstDate = sortedDayDates[0];
                          const firstVal = dayRows[firstDate]?.pnr;
                          if (firstVal) fillAllDayRows("pnr", firstVal);
                        }}
                        sx={{
                          ml: 0.25,
                          background: "transparent",
                          border: 0,
                          cursor: "pointer",
                          color: "primary.main",
                          fontSize: 12,
                          fontWeight: 700,
                          p: 0,
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        ↓ fill
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>Disable Before Hrs</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      Tickets / Day
                      <Box
                        component="button"
                        type="button"
                        title="Copy the FIRST row's tickets value into every row below"
                        onClick={() => {
                          const firstDate = sortedDayDates[0];
                          const firstVal = dayRows[firstDate]?.ticketsPerDay;
                          if (firstVal !== "" && firstVal != null)
                            fillAllDayRows("ticketsPerDay", firstVal);
                        }}
                        sx={{
                          ml: 0.25,
                          background: "transparent",
                          border: 0,
                          cursor: "pointer",
                          color: "primary.main",
                          fontSize: 12,
                          fontWeight: 700,
                          p: 0,
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        ↓ fill
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>Tickets Left</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Segment</TableCell>
                  <TableCell>Fare</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedDayDates.map((date) => {
                  const row = dayRows[date];
                  // Defaults shown as placeholders so the admin sees what
                  // the row will resolve to when a cell is left blank.
                  const defaultTickets = toNum(form.ticketsPerDay) || 1;
                  const defaultHrs = toNum(form.disableBeforeHrs) || 24;
                  const defaultFare = adultTotal;
                  // Tickets-left mirrors the per-row override or the form
                  // default — for a brand new row, "left" == "per day".
                  // In edit mode the actual backend `seatsAvailable` is what
                  // populated `ticketsPerDay` for that row already.
                  const ticketsLeft =
                    row.ticketsPerDay !== ""
                      ? toNum(row.ticketsPerDay)
                      : defaultTickets;
                  return (
                    <TableRow key={date} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          color="primary"
                          checked={row.active}
                          onChange={(e) => updateDayRow(date, "active", e.target.checked)}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2" fontWeight={600}>
                          {date}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <TextField
                            size="small"
                            placeholder="ABCD12, EFGH34"
                            sx={{ minWidth: 160 }}
                            value={row.pnr}
                            onChange={(e) => updateDayRow(date, "pnr", e.target.value.toUpperCase())}
                          />
                          <Box
                            component="button"
                            type="button"
                            disabled={!row.pnr}
                            title="Copy this PNR into every ACTIVE row in the table"
                            onClick={() => {
                              if (row.pnr) {
                                fillAllDayRows("pnr", row.pnr, { sourceDate: date });
                              }
                            }}
                            sx={{
                              background: "transparent",
                              border: "1px solid",
                              borderColor: "primary.main",
                              borderRadius: 1,
                              color: "primary.main",
                              cursor: "pointer",
                              fontSize: 10,
                              fontWeight: 800,
                              px: 0.6,
                              py: 0.2,
                              opacity: row.pnr ? 1 : 0.4,
                              "&:hover": { bgcolor: "primary.50" },
                              "&:disabled": { cursor: "not-allowed" },
                            }}
                          >
                            ↓
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          inputProps={{ min: 0 }}
                          placeholder={String(defaultHrs)}
                          sx={{ width: 90 }}
                          value={row.disableBeforeHrs}
                          onChange={(e) => updateDayRow(date, "disableBeforeHrs", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        {/* June 2026 — per-row "↓ fill from here" so
                            admin can type any row's tickets and push
                            it down to every active row below (skipping
                            inactive ones via fillAllDayRows). */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0 }}
                            placeholder={String(defaultTickets)}
                            sx={{ width: 90 }}
                            value={row.ticketsPerDay}
                            onChange={(e) => updateDayRow(date, "ticketsPerDay", e.target.value)}
                          />
                          <Box
                            component="button"
                            type="button"
                            disabled={row.ticketsPerDay === "" || row.ticketsPerDay == null}
                            title="Copy this value into every ACTIVE row in the table"
                            onClick={() => {
                              if (row.ticketsPerDay !== "" && row.ticketsPerDay != null) {
                                fillAllDayRows("ticketsPerDay", row.ticketsPerDay, {
                                  sourceDate: date,
                                });
                              }
                            }}
                            sx={{
                              background: "transparent",
                              border: "1px solid",
                              borderColor: "primary.main",
                              borderRadius: 1,
                              color: "primary.main",
                              cursor: "pointer",
                              fontSize: 10,
                              fontWeight: 800,
                              px: 0.6,
                              py: 0.2,
                              opacity: row.ticketsPerDay === "" || row.ticketsPerDay == null ? 0.4 : 1,
                              "&:hover": { bgcolor: "primary.50" },
                              "&:disabled": { cursor: "not-allowed" },
                            }}
                          >
                            ↓
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {ticketsLeft}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.active ? "Active" : "Inactive"}
                          color={row.active ? "success" : "default"}
                          variant={row.active ? "filled" : "outlined"}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={sector || "—"}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          inputProps={{ min: 0 }}
                          placeholder={String(defaultFare)}
                          sx={{ width: 110 }}
                          value={row.fare}
                          onChange={(e) => updateDayRow(date, "fare", e.target.value)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteDayRow(date)}
                          aria-label={`Delete row for ${date}`}
                        >
                          <DeleteOutlined />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </MainCard>

      {/* ── Sticky bottom action bar ─────────────────────────────────────── */}
      <Paper
        elevation={3}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          px: 3,
          py: 2,
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button
          variant="outlined"
          color="inherit"
          disabled={saving}
          onClick={() => navigate("/tramps-fares")}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<CheckCircleOutlined />}
          disabled={saving}
          onClick={handleSubmit}
        >
          {saving
            ? (isEdit ? "Saving…" : "Creating…")
            : (isEdit ? "Save Changes" : "Create Series")}
        </Button>
      </Paper>

      {/* ── Snackbar ─────────────────────────────────────────────────────── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
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
