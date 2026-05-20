/**
 * src/lib/realtime/socket.ts — Socket.io client for the admin panel.
 *
 * Single source of truth for the realtime channel between the admin
 * panel and the backend `/admin` namespace. Replaces ad-hoc manual
 * refresh clicks / hard-reloads with push-based updates:
 *
 *   booking:update        → window event (dashboard + bookings list react)
 *   topup:submitted       → window event + toast in header
 *   withdraw:submitted    → window event + toast in header
 *   kyc:submitted         → window event (kyc list refetches)
 *   agent:registered      → window event (agents list refetches)
 *   stats:refresh         → window event (dashboard re-pulls counters)
 *   notification:new      → window event (bell badge increments)
 *
 * Pages listen for the matching `CustomEvent` on `window`. The header
 * bell listens for `admin:notification` to update its badge. The auth
 * provider calls `connectAdminSocket(token)` after a successful login
 * and `disconnectAdminSocket()` on logout.
 *
 * NOTE on toast lib: the admin panel uses MUI `<Snackbar>` per-page —
 * there's no global toast provider yet. Rather than introduce one, the
 * socket layer just dispatches window events and logs; pages render
 * their own snackbars off the dispatched detail if they want a toast.
 * The header bell shows a counter badge which is more useful than a
 * transient toast for admins reviewing a queue anyway.
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let reconnectAttempts = 0;

// REACT_APP_API_URL is typically `http://host:port/api`. The socket
// server is mounted on the root origin (not `/api`), so we strip a
// trailing `/api` segment when present before appending `/admin`.
function resolveOrigin(): string {
  const raw =
    process.env.REACT_APP_API_URL ||
    'https://tramps-aviation-backend.onrender.com/api';
  return raw.replace(/\/api\/?$/, '');
}

export interface BookingUpdatePayload {
  bookingRef?: string;
  bookingId?: string;
  status?: string;
  agentId?: string;
  customerId?: string;
  totalAmount?: number;
  [key: string]: any;
}

export interface TopupSubmittedPayload {
  txnId?: string;
  agentId: string;
  agentName?: string;
  agentCode?: string;
  amount: number;
  utr?: string;
}

export interface WithdrawSubmittedPayload {
  txnId?: string;
  agentId: string;
  agentName?: string;
  agentCode?: string;
  amount: number;
}

export interface KycSubmittedPayload {
  agentId: string;
  agentName?: string;
  agentCode?: string;
}

export interface AgentRegisteredPayload {
  agentId: string;
  agentName?: string;
  agentCode?: string;
  email?: string;
}

export interface AdminNotificationPayload {
  id?: string;
  title?: string;
  body?: string;
  type?: string;
  createdAt?: string;
  [key: string]: any;
}

export function connectAdminSocket(token: string): Socket | null {
  if (typeof window === 'undefined') return null;
  if (!token) return null;
  if (socket?.connected) return socket;

  // If we have a stale (disconnected) socket lying around, tear it down
  // before creating a new one so we don't leak listeners.
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const origin = resolveOrigin();

  socket = io(`${origin}/admin`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('[Admin Socket] Connected:', socket?.id);
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    // eslint-disable-next-line no-console
    console.log('[Admin Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    reconnectAttempts++;
    if (reconnectAttempts === 1) {
      // eslint-disable-next-line no-console
      console.warn('[Admin Socket] Connection error:', err.message);
    }
  });

  // ═════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS — dispatch window events for pages to react to.
  // ═════════════════════════════════════════════════════════════════════

  socket.on('booking:update', (data: BookingUpdatePayload) => {
    // eslint-disable-next-line no-console
    console.log('[Admin Socket] booking:update', data);
    window.dispatchEvent(
      new CustomEvent('admin:booking:update', { detail: data }),
    );
  });

  socket.on('topup:submitted', (data: TopupSubmittedPayload) => {
    // eslint-disable-next-line no-console
    console.log('[Admin Socket] topup:submitted', data);
    window.dispatchEvent(
      new CustomEvent('admin:topup:submitted', { detail: data }),
    );
  });

  socket.on('withdraw:submitted', (data: WithdrawSubmittedPayload) => {
    // eslint-disable-next-line no-console
    console.log('[Admin Socket] withdraw:submitted', data);
    window.dispatchEvent(
      new CustomEvent('admin:withdraw:submitted', { detail: data }),
    );
  });

  socket.on('kyc:submitted', (data: KycSubmittedPayload) => {
    // eslint-disable-next-line no-console
    console.log('[Admin Socket] kyc:submitted', data);
    window.dispatchEvent(
      new CustomEvent('admin:kyc:submitted', { detail: data }),
    );
  });

  socket.on('agent:registered', (data: AgentRegisteredPayload) => {
    // eslint-disable-next-line no-console
    console.log('[Admin Socket] agent:registered', data);
    window.dispatchEvent(
      new CustomEvent('admin:agent:registered', { detail: data }),
    );
  });

  socket.on('stats:refresh', () => {
    window.dispatchEvent(new CustomEvent('admin:stats:refresh'));
  });

  socket.on('notification:new', (notification: AdminNotificationPayload) => {
    window.dispatchEvent(
      new CustomEvent('admin:notification', { detail: notification }),
    );
  });

  return socket;
}

export function disconnectAdminSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getAdminSocket(): Socket | null {
  return socket;
}

/** Join a server-side room (e.g., `agent:<agentId>` to scope events). */
export function joinAdminRoom(roomName: string) {
  socket?.emit('join', { room: roomName });
}

/** Leave a server-side room on unmount. */
export function leaveAdminRoom(roomName: string) {
  socket?.emit('leave', { room: roomName });
}
