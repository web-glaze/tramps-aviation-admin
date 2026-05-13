export const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
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
