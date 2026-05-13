export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://13.207.25.212:8080/api";

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
