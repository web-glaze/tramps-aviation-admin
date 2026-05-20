/**
 * web-messaging.ts — Firebase Cloud Messaging (FCM) init for the Admin panel.
 *
 * Admin doesn't use Zustand — we surface incoming pushes as window CustomEvents
 * that individual pages (topup-requests, withdraw-approvals, bookings, kyc,
 * agents) can listen to and refresh their lists from. The Header also picks
 * these up to bump its notification bell badge.
 *
 * Env vars (REACT_APP_*) come from CRA at build time. When any are missing
 * the helpers no-op gracefully so dev installs without a Firebase project
 * still boot.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  deleteToken,
  Messaging,
} from 'firebase/messaging';
import apiClient from '../../api';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let currentToken: string | null = null;

function isConfigured(): boolean {
  return !!(firebaseConfig.apiKey && VAPID_KEY);
}

function ensureApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (!isConfigured()) {
    console.warn('[FCM] Firebase not configured — skipping init');
    return null;
  }
  if (!app) {
    app = getApps()[0] || initializeApp(firebaseConfig as any);
  }
  return app;
}

export function isFCMSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;
  return isConfigured();
}

export function getFCMPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  if (!isFCMSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Initialize FCM for the current logged-in admin user.
 * Safe to call multiple times — idempotent.
 */
export async function initFCM(): Promise<{ ok: boolean; token?: string; error?: string }> {
  if (!isFCMSupported()) {
    return { ok: false, error: 'FCM not supported or not configured' };
  }

  const firebaseApp = ensureApp();
  if (!firebaseApp) return { ok: false, error: 'Firebase app init failed' };

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    console.log('[FCM] Admin service worker registered');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, error: `Permission ${permission}` };
    }

    messaging = getMessaging(firebaseApp);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return { ok: false, error: 'No token received' };

    currentToken = token;
    console.log('[FCM] Admin token obtained:', token.slice(0, 20) + '...');

    // Backend route is the same `/fcm/register` — controller infers admin
    // role from the bearer token (admin_token has role='admin' in JWT).
    try {
      await apiClient.post('/fcm/register', {
        token,
        platform: 'web',
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
        },
      });
      console.log('[FCM] Admin token registered with backend');
    } catch (err) {
      console.warn('[FCM] Backend registration failed (non-fatal)', err);
    }

    onMessage(messaging, handleForegroundMessage);

    return { ok: true, token };
  } catch (err: any) {
    console.error('[FCM] Admin init failed:', err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

function handleForegroundMessage(payload: any) {
  console.log('[FCM] Admin foreground message:', payload);

  const type = payload.data?.type;
  const data = payload.data || {};

  // Admin-side event routing — each domain page subscribes to its slice
  // and re-fetches its list when an event arrives.
  switch (type) {
    case 'TOPUP_SUBMITTED':
    case 'TOPUP_APPROVED':
    case 'TOPUP_REJECTED':
      window.dispatchEvent(new CustomEvent('admin:topup:update', { detail: data }));
      break;

    case 'WITHDRAW_SUBMITTED':
    case 'WITHDRAW_APPROVED':
    case 'WITHDRAW_REJECTED':
      window.dispatchEvent(new CustomEvent('admin:withdraw:update', { detail: data }));
      break;

    case 'BOOKING_CREATED':
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_CANCELLED':
    case 'BOOKING_FAILED':
      window.dispatchEvent(new CustomEvent('admin:booking:update', { detail: data }));
      break;

    case 'KYC_SUBMITTED':
    case 'KYC_APPROVED':
    case 'KYC_REJECTED':
      window.dispatchEvent(new CustomEvent('admin:kyc:update', { detail: data }));
      break;

    case 'AGENT_REGISTERED':
      window.dispatchEvent(new CustomEvent('admin:agent:update', { detail: data }));
      break;

    case 'REVIEW_SUBMITTED':
      window.dispatchEvent(new CustomEvent('admin:review:update', { detail: data }));
      break;
  }

  // Generic in-app notification — bell badge / toast layer can pick this up
  window.dispatchEvent(
    new CustomEvent('admin:notification', {
      detail: {
        title: payload.notification?.title,
        body: payload.notification?.body,
        ...data,
      },
    }),
  );
}

/**
 * Clean up — call on logout.
 */
export async function teardownFCM(): Promise<void> {
  try {
    if (messaging && currentToken) {
      await deleteToken(messaging);
      try {
        await apiClient.post('/fcm/unregister', { token: currentToken });
      } catch {
        /* non-fatal */
      }
    }
    currentToken = null;
  } catch (err) {
    console.warn('[FCM] Teardown failed:', err);
  }
}
