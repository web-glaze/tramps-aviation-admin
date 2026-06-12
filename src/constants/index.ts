// Vite reads env vars via `import.meta.env` (CRA used process.env).
// `envPrefix: ['VITE_', 'REACT_APP_']` in vite.config.ts means BOTH
// REACT_APP_API_URL and VITE_API_URL are exposed during the migration
// window. `(import.meta as any)` keeps this safe under Jest / CRA too.
export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.REACT_APP_API_URL ||
  "https://tramps-aviation-backend.onrender.com/api";

// Base URL without /api — used for media/file URLs returned by the server
export const MEDIA_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

export const USER_ROLE = {
  ADMIN: "admin",
  AGENT: "agent",
  CUSTOMER: "customer",
};

export const BOOKING_STATUS = {
  CONFIRMED: "confirmed",
  PENDING: "pending_payment",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  PROCESSING: "processing",
};

export const KYC_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};
