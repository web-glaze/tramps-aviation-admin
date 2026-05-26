// ─────────────────────────────────────────────────────────────────────────────
// BulkImportSeries.tsx — TBO-style full-page "Bulk Import" workflow for the
// admin Series Fare feature.
//
// Routes to this page:
//   /tramps-fares/bulk-import   → fresh import session
//
// This page replaces the legacy dialog flow (still mounted in
// `src/pages/tramps-fares/index.tsx`) with a four-step wizard that follows
// the same MainCard layout + sticky-action-bar pattern as AddSeriesFare:
//   1. Download template    — calls trampsAviationFaresApi.getTemplate()
//                              and triggers a browser download.
//   2. Upload file          — accepts .csv / .xlsx / .xls. Parses client-side
//                              with SheetJS (xlsx).
//   3. Preview              — paginated MUI table of parsed rows with a
//                              per-row "remove" action. Failed rows live in
//                              a separate "Skipped" tab with the reason.
//   4. Submit               — sticky bottom bar. Calls
//                              trampsAviationFaresApi.bulkCreate(rows) and
//                              navigates back to /tramps-fares on success.
//
// Column / parsing logic mirrors the existing dialog's `parseBulk` so admins
// can keep using the same templates / pasted layouts. Logic is copied here
// (not lifted) so the dialog keeps working unchanged.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { trampsAviationFaresApi } from "../../api";
import MainCard from "../../components/MainCard";

// ─── Column map — kept in sync with the dialog template ────────────────────
// The downloadable template (and the parser below) both assume this column
// order. If the backend evolves, update here AND in the legacy dialog.
const BULK_COLUMNS_FLIGHT = [
  "FlightNo",
  "Origin",
  "Dest",
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
];

// One realistic example row — admins can copy/edit instead of starting from
// scratch. Matches the dialog template's "BULK_SAMPLE_ROWS.flight" entry.
const BULK_SAMPLE_ROW_FLIGHT: string[] = [
  "6E-211",
  "DEL",
  "BLR",
  "2026-05-10",
  "2026-05-10",
  "09:30",
  "13:45",
  "5999",
  "15KG",
  "IndiGo",
  "RoundTrip",
  "2026-05-15",
  "18:00-22:15",
  "9",
  "1",
  "5100",
  "899",
  "HYD",
  "ABCD12,EFGH34,WXYZ56,QRST78,LMNO90,PQRS01,TUVW23,XYZA45,BCDE67",
  "6E-211,DEL,HYD,09:30,11:30;6E-212,HYD,BLR,12:15,13:45",
];

// ── Header-detection helper ─────────────────────────────────────────────────
// Same as the dialog version — counts how many cells in the first row match
// our known column names. ≥2 matches → treat row 0 as a header and skip it.
function looksLikeHeader(row: string[]): boolean {
  if (!row?.length) return false;
  const cols = BULK_COLUMNS_FLIGHT.map((c) => c.toLowerCase());
  const matches = row.filter((c) =>
    cols.includes(String(c ?? "").trim().toLowerCase()),
  ).length;
  return matches >= 2;
}

// ── Convert a sheet's 2D array into pipe-separated lines ────────────────────
// Mirrors the dialog's `rowsToPipeText` so the parser below behaves
// identically for the same uploaded file.
function rowsToPipeText(rows: string[][], headerRow: boolean): string {
  const data = headerRow ? rows.slice(1) : rows;
  return data
    .filter((r) => r && r.some((c) => String(c ?? "").trim() !== ""))
    .map((r) => r.map((c) => String(c ?? "").trim()).join(" | "))
    .join("\n");
}

// ── Result shape for one parsed line ────────────────────────────────────────
// `valid` rows are sent to bulkCreate; `skipped` rows surface in the
// "Skipped" tab with the failure reason so admins can fix the source and
// re-upload.
type ParseResult = {
  valid: any[];
  skipped: { lineNo: number; raw: string; reason: string }[];
};

// ── parseBulk — copied verbatim (minus hotel/insurance branches) from
// `tramps-fares/index.tsx`. Kept here so the dialog keeps working unchanged
// and so this page is self-contained. Returns both the records ready for the
// bulk API and a per-line skipped-row report. Supports two layouts:
//   LEGACY (≥6 cols):  FlightNo | Origin | Dest | Date | Timing(HH:MM-HH:MM)
//                       | TotalFare | …
//   NEW    (≥8 cols):  FlightNo | Origin | Dest | DepartureDate | ArrivalDate
//                       | DepartureTime | ArrivalTime | TotalFare | …
function parseBulkFlight(text: string): ParseResult {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const valid: any[] = [];
  const skipped: ParseResult["skipped"] = [];

  lines.forEach((line, i) => {
    const p = line.split("|").map((s) => s.trim());
    try {
      if (p.length < 6) throw new Error("Need at least 6 columns");
      // Heuristic: col index 4 of the NEW layout is a YYYY-MM-DD date; in
      // LEGACY it's a "HH:MM-HH:MM" timing string. A colon → legacy.
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
          depTime, // legacy "HH:MM-HH:MM" cell → split below
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
        arrDate = depDate; // legacy can't express overnight arrivals
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

      // ── Required-field check ──────────────────────────────────────────
      if (!flNo) throw new Error("FlightNo is required");
      if (!orig) throw new Error("Origin is required");
      if (!dest) throw new Error("Destination is required");
      if (!depDate) throw new Error("DepartureDate is required");
      if (!fare || isNaN(Number(fare))) throw new Error("TotalFare must be numeric");

      const date = depDate;
      const timing = depTime && arrTime ? `${depTime}-${arrTime}` : "";

      // ── Parse PNRs (comma-separated) ──────────────────────────────────
      const pnrPool = (pnrsRaw || "")
        .split(",")
        .map((s: string) => s.trim().toUpperCase())
        .filter((s: string) => /^[A-Z0-9]{4,12}$/.test(s));

      // ── Parse Segments (";" between, "," within) ──────────────────────
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

      valid.push({
        type: "flight",
        flightNumber: flNo,
        origin: orig.toUpperCase().slice(0, 3),
        destination: dest.toUpperCase().slice(0, 3),
        sector: `${orig.toUpperCase().slice(0, 3)}-${dest
          .toUpperCase()
          .slice(0, 3)}`,
        travelDate: date,
        timing,
        departureDate: depDate,
        arrivalDate: arrDate,
        departureTime: (depTime || "").trim(),
        arrivalTime: (arrTime || "").trim(),
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
    } catch (e: any) {
      skipped.push({
        lineNo: i + 1,
        raw: line,
        reason: e?.message || "Parse error",
      });
    }
  });

  return { valid, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────
export default function BulkImportSeriesPage() {
  const navigate = useNavigate();

  // ── Parsed rows: editable in-place via the "remove" action so admins can
  // drop bad rows before submit without re-uploading. Skipped rows are kept
  // separately so they don't pollute the valid count. ──────────────────────
  const [parsed, setParsed] = useState<ParseResult>({ valid: [], skipped: [] });
  const [fileName, setFileName] = useState<string>("");

  // ── Preview UI state ─────────────────────────────────────────────────────
  // `tabIdx` toggles between Valid / Skipped tabs. Pagination is per-tab.
  const [tabIdx, setTabIdx] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // ── Workflow state ───────────────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  // Track per-row backend failures returned by `bulkCreate` so we can
  // surface a partial-success summary if some rows succeed and others fail.
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  // Hidden file-input ref — the visible drop-zone delegates to this.
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    sev: "success" as any,
  });
  const toast = (msg: string, sev: any = "success") =>
    setSnack({ open: true, msg, sev });

  // ── Step 1 — Download template ──────────────────────────────────────────
  // Tries the server endpoint first (GET /admin/tramps-fares/template).
  // If the server doesn't respond with a file, falls back to a locally
  // generated XLSX so the admin is never stuck.
  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await trampsAviationFaresApi.getTemplate("flight");
      const blob = new Blob([res.data], {
        // Accept either CSV or Excel — content-type sniffed from response
        // headers when present, otherwise default to xlsx.
        type:
          (res.headers?.["content-type"] as string) ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      // Guess the extension from the content-type so the OS opens it cleanly.
      const ct = String(res.headers?.["content-type"] || "");
      const ext = ct.includes("csv") ? "csv" : "xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tramps-flight-template.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Template downloaded — fill the rows and upload below", "success");
    } catch (e: any) {
      // ── Local fallback ──────────────────────────────────────────────────
      // If the backend endpoint isn't available (404 / network / parse
      // error), generate the same template client-side from BULK_COLUMNS.
      try {
        const ws = XLSX.utils.aoa_to_sheet([
          BULK_COLUMNS_FLIGHT,
          BULK_SAMPLE_ROW_FLIGHT,
        ]);
        ws["!cols"] = BULK_COLUMNS_FLIGHT.map((h) => ({
          wch: Math.max(12, h.length + 2),
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tickets");
        XLSX.writeFile(wb, "tramps-flight-template.xlsx");
        toast(
          "Template downloaded (local fallback) — fill rows below the header",
          "info",
        );
      } catch (err: any) {
        toast(
          `Template download failed: ${err?.message || e?.message || "unknown"}`,
          "error",
        );
      }
    } finally {
      setDownloading(false);
    }
  };

  // ── Step 2 — Upload file ────────────────────────────────────────────────
  // Reads CSV/XLSX/XLS via SheetJS, auto-detects whether row 0 is a header,
  // converts to the dialog's pipe-format internally, and feeds it through
  // the shared parser. Failed rows land in `parsed.skipped`.
  const handleFile = async (file: File) => {
    setFileName(file.name);
    setSubmitErrors([]);
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
      const hasHeader = looksLikeHeader(rows[0]);
      const text = rowsToPipeText(rows, hasHeader);
      const result = parseBulkFlight(text);
      setParsed(result);
      setPage(0);
      setTabIdx(0);
      toast(
        `Detected ${result.valid.length} valid row${result.valid.length !== 1 ? "s" : ""}` +
          (result.skipped.length
            ? ` (${result.skipped.length} skipped)`
            : ""),
        result.valid.length ? "success" : "warning",
      );
    } catch (err: any) {
      toast(`Failed to read file: ${err?.message || err}`, "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Drag-and-drop handlers for the drop-zone ────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ── Step 3 — Remove a valid row before submit ───────────────────────────
  const removeValidRow = (absoluteIdx: number) => {
    setParsed((prev) => ({
      ...prev,
      valid: prev.valid.filter((_, i) => i !== absoluteIdx),
    }));
  };

  // Re-clamp the current page if removing the last row of a page leaves us
  // pointing past the end of the list.
  const validRows = parsed.valid;
  const skippedRows = parsed.skipped;
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(validRows.length / rowsPerPage)),
    [validRows.length, rowsPerPage],
  );
  if (page > pageCount - 1 && page !== 0) {
    // Defer correction to next render via a microtask-style setState call.
    // Avoids React's "setState during render" warning while keeping the UI
    // in sync after a remove that emptied the current page.
    setTimeout(() => setPage(Math.max(0, pageCount - 1)), 0);
  }

  // ── Step 4 — Submit ─────────────────────────────────────────────────────
  // Sends every kept valid row in a single POST. The backend may surface a
  // mixed-result response (some inserted, some rejected) — we extract a few
  // common error-shape variants and show the count in the success snackbar.
  const handleSubmit = async () => {
    if (!validRows.length) {
      toast("Nothing to import — add valid rows first", "error");
      return;
    }
    setImporting(true);
    setSubmitErrors([]);
    try {
      const res = await trampsAviationFaresApi.bulkCreate(validRows);
      const data = res.data?.data ?? res.data ?? {};
      const inserted =
        data.inserted ?? data.created ?? data.count ?? validRows.length;
      const failed =
        data.failed ??
        data.errors?.length ??
        Math.max(0, validRows.length - inserted);
      // Capture per-row error messages if the backend returned any so the
      // admin can see WHY individual rows were rejected.
      const errs: string[] = Array.isArray(data.errors)
        ? data.errors.map((e: any) =>
            typeof e === "string" ? e : e?.message || JSON.stringify(e),
          )
        : [];
      setSubmitErrors(errs);

      const totalSkipped = skippedRows.length + failed;
      toast(
        `${inserted} fare${inserted !== 1 ? "s" : ""} created` +
          (totalSkipped ? ` — ${totalSkipped} skipped` : ""),
        failed > 0 ? "warning" : "success",
      );

      // Brief pause so the snackbar is visible before navigating away.
      setTimeout(() => navigate("/tramps-fares"), 1400);
    } catch (e: any) {
      toast(e?.response?.data?.message || "Bulk import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  // ── Slices for paginated preview ────────────────────────────────────────
  const validPageRows = validRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );
  const skippedPageRows = skippedRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    // Bottom padding leaves room for the sticky action bar.
    <Box sx={{ pb: 12 }}>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <IconButton size="small" onClick={() => navigate("/tramps-fares")}>
          <ArrowLeftOutlined />
        </IconButton>
        <Typography variant="h4" fontWeight={700}>
          Bulk Import Series Fares
        </Typography>
      </Stack>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3, ml: 5 }}>
        Upload a CSV / Excel file of flight fares — preview, remove bad rows,
        then push them to the catalog in a single batch.
      </Typography>

      {/* ── STEP 1 — Download template ─────────────────────────────────── */}
      <MainCard title="Step 1 — Download Template" sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Download the canonical CSV / Excel template, fill one row per fare,
          and upload it in Step 2. The first row is treated as the header and
          skipped automatically when re-uploaded.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Button
            variant="contained"
            color="warning"
            startIcon={
              downloading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DownloadOutlined />
              )
            }
            onClick={handleDownloadTemplate}
            disabled={downloading}
          >
            {downloading ? "Preparing…" : "Download CSV / Excel template"}
          </Button>
          <Typography variant="caption" color="text.secondary">
            Required columns:{" "}
            <b>FlightNo, Origin, Dest, DepartureDate, DepartureTime, TotalFare</b>{" "}
            (plus optional columns for ArrivalDate / ArrivalTime, Baggage,
            Airline, TripType, Seats, Stops, BaseFare, TaxAmount, ViaAirport,
            PNRs, Segments).
          </Typography>
        </Stack>
      </MainCard>

      {/* ── STEP 2 — Upload file ───────────────────────────────────────── */}
      <MainCard title="Step 2 — Upload your file" sx={{ mb: 3 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Paper
          variant="outlined"
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          sx={{
            p: 4,
            textAlign: "center",
            borderStyle: "dashed",
            borderColor: "divider",
            cursor: "pointer",
            transition: "border-color 0.15s, background-color 0.15s",
            "&:hover": {
              borderColor: "warning.main",
              backgroundColor: "action.hover",
            },
          }}
        >
          <CloudUploadOutlined style={{ fontSize: 40, color: "#ed6c02" }} />
          <Typography variant="body1" fontWeight={600} sx={{ mt: 1 }}>
            Click to browse or drop a file here
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Accepted: .csv, .xlsx, .xls — headers auto-detected
          </Typography>
          {fileName && (
            <Box sx={{ mt: 1.5 }}>
              <Chip
                icon={<FileExcelOutlined />}
                label={fileName}
                color="success"
                variant="outlined"
              />
            </Box>
          )}
        </Paper>
        {(validRows.length > 0 || skippedRows.length > 0) && (
          <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap">
            <Chip
              color="success"
              variant="outlined"
              label={`${validRows.length} valid row${validRows.length !== 1 ? "s" : ""}`}
            />
            {skippedRows.length > 0 && (
              <Chip
                color="error"
                variant="outlined"
                label={`${skippedRows.length} skipped`}
              />
            )}
          </Stack>
        )}
      </MainCard>

      {/* ── STEP 3 — Preview ───────────────────────────────────────────── */}
      <MainCard title="Step 3 — Preview" sx={{ mb: 3 }}>
        {validRows.length === 0 && skippedRows.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              textAlign: "center",
              borderStyle: "dashed",
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Upload a file above — parsed rows will appear here.
            </Typography>
          </Paper>
        ) : (
          <>
            <Tabs
              value={tabIdx}
              onChange={(_, v) => {
                setTabIdx(v);
                setPage(0);
              }}
              sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
            >
              <Tab label={`Valid (${validRows.length})`} />
              <Tab label={`Skipped (${skippedRows.length})`} />
            </Tabs>

            {/* ── Valid rows tab ─────────────────────────────────────── */}
            {tabIdx === 0 && (
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ maxHeight: 480 }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Flight</TableCell>
                      <TableCell>Route</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Fare</TableCell>
                      <TableCell>Seats</TableCell>
                      <TableCell>PNRs</TableCell>
                      <TableCell>Stops</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {validPageRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                          <Typography variant="caption" color="text.secondary">
                            No valid rows on this page.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      validPageRows.map((r, i) => {
                        // Absolute index in the underlying array — needed
                        // for the remove action so we don't delete the
                        // wrong row when the table is paginated.
                        const absIdx = page * rowsPerPage + i;
                        return (
                          <TableRow key={absIdx} hover>
                            <TableCell>{absIdx + 1}</TableCell>
                            <TableCell>
                              <Typography
                                variant="caption"
                                fontFamily="monospace"
                                fontWeight={600}
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
                                {r.departureDate || r.travelDate}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="caption"
                                fontFamily="monospace"
                              >
                                {r.departureTime || "—"}
                                {r.arrivalTime ? ` → ${r.arrivalTime}` : ""}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <b>₹{(r.fare || 0).toLocaleString()}</b>
                            </TableCell>
                            <TableCell>{r.seatsAvailable}</TableCell>
                            <TableCell>
                              {(r.pnrPool || []).length > 0 ? (
                                <Chip
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  label={`${r.pnrPool.length} PNR`}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  color="default"
                                  variant="outlined"
                                  label="—"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {(r.stops || 0) > 0 ? (
                                <Chip
                                  size="small"
                                  color="warning"
                                  label={`${r.stops} stop`}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  color="success"
                                  label="Non-stop"
                                />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="error"
                                aria-label="Remove this row"
                                onClick={() => removeValidRow(absIdx)}
                              >
                                <DeleteOutlined />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* ── Skipped rows tab ───────────────────────────────────── */}
            {tabIdx === 1 && (
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ maxHeight: 480 }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Line #</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Raw row</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {skippedPageRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Typography variant="caption" color="text.secondary">
                            No skipped rows.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      skippedPageRows.map((s, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{s.lineNo}</TableCell>
                          <TableCell>
                            <Typography
                              variant="caption"
                              color="error.main"
                              fontWeight={600}
                            >
                              {s.reason}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 600 }}>
                            <Typography
                              variant="caption"
                              fontFamily="monospace"
                              sx={{
                                display: "block",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {s.raw}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Shared pagination — counts the active tab's list. */}
            <TablePagination
              component="div"
              count={tabIdx === 0 ? validRows.length : skippedRows.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}

        {/* Per-row backend errors (only set after a partial-success submit) */}
        {submitErrors.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="caption"
              color="error.main"
              fontWeight={700}
              display="block"
              sx={{ mb: 1 }}
            >
              Backend reported {submitErrors.length} per-row error
              {submitErrors.length !== 1 ? "s" : ""}:
            </Typography>
            {submitErrors.slice(0, 20).map((msg, i) => (
              <Alert key={i} severity="warning" sx={{ mb: 0.5, py: 0 }}>
                <Typography variant="caption">{msg}</Typography>
              </Alert>
            ))}
            {submitErrors.length > 20 && (
              <Typography variant="caption" color="text.secondary">
                …and {submitErrors.length - 20} more.
              </Typography>
            )}
          </Box>
        )}
      </MainCard>

      {/* ── STEP 4 — Sticky bottom action bar ──────────────────────────── */}
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
          disabled={importing}
          onClick={() => navigate("/tramps-fares")}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          startIcon={
            importing ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <CheckCircleOutlined />
            )
          }
          disabled={importing || validRows.length === 0}
          onClick={handleSubmit}
        >
          {importing
            ? "Importing…"
            : `Import ${validRows.length} fare${validRows.length !== 1 ? "s" : ""}`}
        </Button>
      </Paper>

      {/* ── Snackbar ──────────────────────────────────────────────────── */}
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
