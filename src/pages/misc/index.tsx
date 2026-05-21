// ─────────────────────────────────────────────────────────────────────────────
// MISC — formerly the home of placeholder stub pages
// ─────────────────────────────────────────────────────────────────────────────
// This file used to export four placeholder components — FlightsPage,
// HotelsPage, InsurancePage and RefundsPage — that rendered an empty card.
//
// They have all been replaced by real, backend-backed admin pages:
//   • /refunds   → src/pages/refunds/index.tsx   (RefundController @ /refunds)
//   • /flights   → src/pages/flights/index.tsx   (/admin/tramps-fares — flight inventory)
//   • /hotels    → src/pages/hotels/index.tsx    (/hotels/admin/all)
//   • /insurance → src/pages/insurance/index.tsx (/insurance/admin/all)
//
// `src/routes/index.tsx` now imports directly from those page directories.
// This file is intentionally left empty (no exports) so nothing accidentally
// re-imports the old stubs. It can be deleted once confirmed unused.
//
// NOTE: SubagentsPage placeholder was likewise removed earlier — that module
// now lives at `src/pages/subagents/index.tsx`.

export {};
