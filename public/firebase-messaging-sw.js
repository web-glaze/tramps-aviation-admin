// Service worker for Firebase Cloud Messaging — Admin Panel
// Path MUST be /firebase-messaging-sw.js (root) for Firebase SDK to find it.

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// === FIREBASE CONFIG ===
// These keys are PUBLIC (frontend config) — safe to commit.
// Replace with your actual values from Firebase Console → Project Settings.
const firebaseConfig = {
  apiKey: "AIzaSyDjmSf4EgZhzs2cq_w1N8YgSSPwioBHLxY",
  authDomain: "tramps-aviation.firebaseapp.com",
  projectId: "tramps-aviation",
  storageBucket: "tramps-aviation.firebasestorage.app",
  messagingSenderId: "64356638234",
  appId: "1:64356638234:web:8e0179a3a1b39113a43ba3",
};


const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'REPLACE_ME';

if (isConfigured) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM-SW] Admin background message:', payload);

      const title = payload.notification?.title || 'Tramps Aviation Admin';
      const options = {
        body: payload.notification?.body || '',
        icon: '/logo192.png',
        badge: '/logo192.png',
        data: payload.data,
        tag: payload.data?.type || 'admin',
        requireInteraction: false,
      };

      self.registration.showNotification(title, options);
    });
  } catch (err) {
    console.error('[FCM-SW] Init failed:', err);
  }
} else {
  console.warn('[FCM-SW] Firebase not configured — push notifications disabled');
}

// Notification click handler — opens the relevant admin page.
// Admin notifications carry domain-specific URLs (e.g. /topup-requests,
// /withdraw-approvals, /bookings) in their data.url payload.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
