class ParkingTracker {
  constructor() {
    this.trackedCarparks = new Map();
    this.pollingIntervalId = null;
    this.expiryTimeoutId = null;
    this.pollDuration = 10000; // 10 seconds
    this.maxTrackingTime = 1800000; // 30 minutes auto-expiry
    this.swRegistration = null;
  }

  async init() {
    await this.registerServiceWorker();
    this.setupUIListeners();
    this.renderControlPanel();
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async toggleTracking(carparkId, carparkName, currentSpaces) {
    if (this.trackedCarparks.has(carparkId)) {
      this.stopTrackingSingle(carparkId);
      return;
    }

    const hasPermission = await this.requestNotificationPermission();
    if (!hasPermission) {
      alert('Notification permissions are required to alert you when a space opens up.');
      return;
    }

    // Initialize tracking state for this specific carpark
    this.trackedCarparks.set(carparkId, {
      name: carparkName,
      lastKnownSpaces: parseInt(currentSpaces, 10) || 0,
      timestamp: Date.now()
    });

    this.updateCardUIState(carparkId, true);
    this.managePollingLifecycle();
  }

  stopTrackingSingle(carparkId) {
    if (this.trackedCarparks.has(carparkId)) {
      this.trackedCarparks.delete(carparkId);
      this.updateCardUIState(carparkId, false);
      this.managePollingLifecycle();
    }
  }

  stopAllTracking() {
    const trackedIds = Array.from(this.trackedCarparks.keys());
    trackedIds.forEach((id) => {
      this.updateCardUIState(id, false);
    });
    this.trackedCarparks.clear();
    this.managePollingLifecycle();
  }

  managePollingLifecycle() {
    this.renderControlPanel();

    if (this.trackedCarparks.size > 0) {
      if (!this.pollingIntervalId) {
        this.pollingIntervalId = setInterval(() => this.pollCarparkData(), this.pollDuration);
      }
      if (!this.expiryTimeoutId) {
        this.expiryTimeoutId = setTimeout(() => {
          this.stopAllTracking();
          this.sendLocalNotification('Tracking Expired', 'Tracking stopped automatically after 30 minutes to save battery power.', 'expiry-alert');
        }, this.maxTrackingTime);
      }
    } else {
      this.clearTimers();
    }
  }

  clearTimers() {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
    if (this.expiryTimeoutId) {
      clearTimeout(this.expiryTimeoutId);
      this.expiryTimeoutId = null;
    }
  }

  async pollCarparkData() {
    // This loops through all active trackers and evaluates current spaces.
    // In production, replace this mock iteration with your actual system fetch call.
    for (const [carparkId, data] of this.trackedCarparks.entries()) {
      try {
        const currentSpaces = await this.fetchLiveSpaces(carparkId);
        
        if (data.lastKnownSpaces === 0 && currentSpaces >= 1) {
          this.sendLocalNotification(
            'Parking Space Available',
            `${data.name} now has ${currentSpaces} space available.`,
            `carpark-${carparkId}`
          );
          this.stopTrackingSingle(carparkId);
        } else {
          data.lastKnownSpaces = currentSpaces;
          this.trackedCarparks.set(carparkId, data);
        }
      } catch (error) {
        console.error(`Error polling data for carpark ${carparkId}:`, error);
      }
    }
  }

  async fetchLiveSpaces(carparkId) {
    // Simulated live lookup matching your backend data structure.
    // Replace with your real live data API object reading logic if necessary.
    const badgeElement = document.querySelector(`[data-id="${carparkId}"] .space-badge`);
    if (badgeElement) {
      return parseInt(badgeElement.textContent, 10) || 0;
    }
    return 0;
  }

  sendLocalNotification(title, body, tag) {
    if (this.swRegistration && 'showNotification' in this.swRegistration) {
      this.swRegistration.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: title,
        body: body,
        tag: tag
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: body, tag: tag });
    }
  }

  updateCardUIState(carparkId, isTracking) {
    const card = document.querySelector(`[data-id="${carparkId}"]`);
    if (!card) return;

    const bellBtn = card.querySelector('.notification-bell-btn');
    if (!bellBtn) return;

    if (isTracking) {
      card.classList.add('tracking-active');
      bellBtn.classList.add('active');
      bellBtn.textContent = 'Tracking On';
    } else {
      card.classList.remove('tracking-active');
      bellBtn.classList.remove('active');
      bellBtn.textContent = 'Track Spaces';
    }
  }

  setupUIListeners() {
    const container = document.getElementById('carpark-list-container');
    if (!container) return;

    container.addEventListener('click', (event) => {
      const bellBtn = event.target.closest('.notification-bell-btn');
      if (bellBtn) {
        event.stopPropagation(); // Prevents the map popup from opening
        const card = bellBtn.closest('.carpark-card');
        const id = card.getAttribute('data-id');
        const name = card.querySelector('.carpark-name').textContent;
        const spaces = card.querySelector('.space-badge').textContent;
        
        this.toggleTracking(id, name, spaces);
        return;
      }

      const card = event.target.closest('.carpark-card');
      if (card) {
        const lat = card.getAttribute('data-lat');
        const lng = card.getAttribute('data-lng');
        if (typeof window.openMapPopup === 'function') {
          window.openMapPopup(lat, lng);
        }
      }
    });
  }

  renderControlPanel() {
    let panel = document.getElementById('tracking-control-panel');
    
    if (this.trackedCarparks.size === 0) {
      if (panel) panel.remove();
      return;
    }

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'tracking-control-panel';
      document.body.appendChild(panel);
    }

    const count = this.trackedCarparks.size;
    panel.innerHTML = `
      <div class="panel-content">
        <div class="panel-status">
          <span class="pulse-indicator"></span>
          <span class="status-text">Monitoring ${count} carpark${count > 1 ? 's' : ''}</span>
        </div>
        <button id="stop-all-tracking-btn" class="stop-panel-btn">Stop All Alerts</button>
      </div>
    `;

    document.getElementById('stop-all-tracking-btn').addEventListener('click', () => {
      this.stopAllTracking();
    });
  }
}

window.parkingTrackerInstance = new ParkingTracker();
document.addEventListener('DOMContentLoaded', () => {
  window.parkingTrackerInstance.init();
});
