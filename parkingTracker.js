class MobileParkingTracker {
  constructor() {
    this.activeTrackedItems = new Map();
    this.pollTimerId = null;
    this.shutdownTimerId = null;
    this.loopInterval = 10000; 
    this.expiryPeriod = 1800000; 
    this.swInstance = null;
    this.observerInstance = null;
  }

  async startup() {
    await this.connectServiceWorker();
    this.initDynamicObserver();
    this.attachInterfaceInterceptors();
    this.refreshControlOverlay();
  }

  async connectServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.swInstance = await navigator.serviceWorker.register('/sw.js');
        console.log('Background worker linked');
      } catch (err) {
        console.error('Worker allocation error:', err);
      }
    }
  }

  async requestAlertPermission() {
    if ('Notification' in window) {
      const status = await Notification.requestPermission();
      return status === 'granted';
    }
    return false;
  }

  initDynamicObserver() {
    const targetNode = document.getElementById('results');
    if (!targetNode) return;

    this.observerInstance = new MutationObserver(() => {
      const meteredTab = document.getElementById('tabMetered');
      if (meteredTab && meteredTab.classList.contains('active')) {
        this.injectTrackingTriggers();
      }
    });

    this.observerInstance.observe(targetNode, { childList: true, subtree: true });
  }

  injectTrackingTriggers() {
    const container = document.getElementById('results');
    if (!container) return;

    // Identify all direct card nodes rendered inside results
    const cards = container.children;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.nodeType !== 1) continue;

      if (!card.querySelector('.parking-tracker-btn-container')) {
        const uniqueId = card.getAttribute('data-id') || `generated-id-${i}`;
        if (!card.getAttribute('data-id')) {
          card.setAttribute('data-id', uniqueId);
        }

        const actionArea = document.createElement('div');
        actionArea.className = 'parking-tracker-btn-container';
        
        const actionBtn = document.createElement('button');
        actionBtn.className = 'parking-tracker-toggle-btn';
        
        if (this.activeTrackedItems.has(uniqueId)) {
          actionBtn.classList.add('tracking-active');
          actionBtn.textContent = '正在追蹤';
        } else {
          actionBtn.textContent = '追蹤車位';
        }

        actionArea.appendChild(actionBtn);
        card.appendChild(actionArea);
      }
    }
  }

  async toggleTrackingState(cardElement, buttonElement) {
    const carparkId = cardElement.getAttribute('data-id');
    if (!carparkId) return;

    if (this.activeTrackedItems.has(carparkId)) {
      this.cancelSingleTracker(carparkId);
      return;
    }

    const permitted = await this.requestAlertPermission();
    if (!permitted) {
      alert('請允許此應用程式發送通知，以便在有空置車位時即時提示您。');
      return;
    }

    const nameNode = cardElement.querySelector('h2, h3, h4, .title, .name') || cardElement;
    const carparkName = nameNode.textContent.trim().split('\n')[0];
    const initialSpaces = this.parseCurrentSpaces(cardElement);

    this.activeTrackedItems.set(carparkId, {
      title: carparkName,
      previousCount: initialSpaces,
      startedAt: Date.now()
    });

    buttonElement.classList.add('tracking-active');
    buttonElement.textContent = '正在追蹤';

    this.synchronizeExecutionLoop();
  }

  cancelSingleTracker(carparkId) {
    if (this.activeTrackedItems.has(carparkId)) {
      this.activeTrackedItems.delete(carparkId);
      
      const card = document.querySelector(`[data-id="${carparkId}"]`);
      if (card) {
        const btn = card.querySelector('.parking-tracker-toggle-btn');
        if (btn) {
          btn.classList.remove('tracking-active');
          btn.textContent = '追蹤車位';
        }
      }
      this.synchronizeExecutionLoop();
    }
  }

  cancelAllTrackers() {
    const activeKeys = Array.from(this.activeTrackedItems.keys());
    activeKeys.forEach(key => this.cancelSingleTracker(key));
  }

  synchronizeExecutionLoop() {
    this.refreshControlOverlay();

    if (this.activeTrackedItems.size > 0) {
      if (!this.pollTimerId) {
        this.pollTimerId = setInterval(() => {
          const nativeRefresh = document.getElementById('refreshBtn');
          if (nativeRefresh) {
            nativeRefresh.click(); 
          }
          setTimeout(() => this.evaluateTrackedMetrics(), 1500); 
        }, this.loopInterval);
      }
      if (!this.shutdownTimerId) {
        this.shutdownTimerId = setTimeout(() => {
          this.cancelAllTrackers();
          this.dispatchSystemAlert('追蹤超時安全結束', '系統已自動停止向背景請求數據以節省手機電力。', 'timeout-event');
        }, this.expiryPeriod);
      }
    } else {
      this.disableActiveTimers();
    }
  }

  disableActiveTimers() {
    if (this.pollTimerId) {
      clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }
    if (this.shutdownTimerId) {
      clearTimeout(this.shutdownTimerId);
      this.shutdownTimerId = null;
    }
  }

  evaluateTrackedMetrics() {
    for (const [id, data] of this.activeTrackedItems.entries()) {
      const card = document.querySelector(`[data-id="${id}"]`);
      if (!card) continue;

      const currentCount = this.parseCurrentSpaces(card);

      if (data.previousCount === 0 && currentCount >= 1) {
        this.dispatchSystemAlert(
          '車位可用通知',
          `${data.title} 現已有 ${currentCount} 個空置車位可用。`,
          `alert-${id}`
        );
        this.cancelSingleTracker(id);
      } else {
        data.previousCount = currentCount;
        this.activeTrackedItems.set(id, data);
      }
    }
  }

  parseCurrentSpaces(cardElement) {
    const badgeText = cardElement.textContent.replace(/[\r\n\t]/g, ' ');
    const digits = badgeText.match(/\d+/);
    return digits ? parseInt(digits[0], 10) : 0;
  }

  dispatchSystemAlert(title, message, identifier) {
    if (this.swInstance && this.swInstance.active) {
      this.swInstance.active.postMessage({
        action: 'TRIGGER_PUSH_NOTIFICATION',
        title: title,
        message: message,
        identifier: identifier
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message, tag: identifier });
    }
  }

  attachInterfaceInterceptors() {
    const resultsArea = document.getElementById('results');
    if (!resultsArea) return;

    resultsArea.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.parking-tracker-toggle-btn');
      if (toggleBtn) {
        e.stopPropagation();
        const card = toggleBtn.closest('[data-id]');
        if (card) {
          this.toggleTrackingState(card, toggleBtn);
        }
      }
    });
  }

  refreshControlOverlay() {
    let panel = document.getElementById('mobile-tracking-overlay-panel');

    if (this.activeTrackedItems.size === 0) {
      if (panel) panel.remove();
      return;
    }

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'mobile-tracking-overlay-panel';
      document.body.appendChild(panel);
    }

    const currentActiveSize = this.activeTrackedItems.size;
    panel.innerHTML = `
      <div class="tracker-panel-layout">
        <div class="tracker-panel-info">
          <span class="tracker-pulse-dot"></span>
          <span class="tracker-panel-text">正在監察 ${currentActiveSize} 個車位</span>
        </div>
        <button id="tracker-panel-kill-switch" class="tracker-panel-clear-btn">停止所有通知</button>
      </div>
    `;

    document.getElementById('tracker-panel-kill-switch').addEventListener('click', () => {
      this.cancelAllTrackers();
    });
  }
}

window.mobileParkingTrackerReference = new MobileParkingTracker();
document.addEventListener('DOMContentLoaded', () => {
  window.mobileParkingTrackerReference.startup();
});
