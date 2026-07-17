self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 監聽並接收主線程傳遞而來的車位狀態變更請求
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

// 當使用者點擊手機的橫幅通知時，自動將網頁帶回畫面焦點
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabsList) => {
      for (const clientTab of tabsList) {
        if ('focus' in clientTab) {
          return clientTab.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
