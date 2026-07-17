self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'TRIGGER_PUSH_NOTIFICATION') {
    const payloadTitle = event.data.title;
    const configurations = {
      body: event.data.message,
      tag: event.data.identifier,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };

    event.waitUntil(
      self.registration.showNotification(payloadTitle, configurations)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabsList) => {
      for (const clientTab of tabsList) {
        if ('focus' in clientTab) return clientTab.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
