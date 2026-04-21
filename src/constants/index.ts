export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8080/api";

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
