self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle local notification requests from the main application thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const title = event.data.title;
    const options = {
      body: event.data.body,
      tag: event.data.tag,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Open or focus the web app when the user taps the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
