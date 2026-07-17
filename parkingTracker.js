class MobileParkingTracker {
  constructor() {
    this.activeTrackedItems = new Map();
    this.pollTimerId = null;
    this.shutdownTimerId = null;
    this.loopInterval = 10000; 
    this.expiryPeriod = 1800000; 
    this.swInstance = null;
    this.observerInstance = null;
    this.isSimulatingCardClick = false;
    this.forcedHideForMap = false;
  }

  async startup() {
    await this.connectServiceWorker();
    this.initDynamicObserver();
    this.attachInterfaceInterceptors();
    this.startLayoutVisibilityLoop();
    this.cleanSearchTitleText();
    this.refreshControlOverlay();
  }

  async connectServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.swInstance = await navigator.serviceWorker.register('/sw.js');
      } catch (err) {
        console.error('Worker link error:', err);
      }
    }
  }

  initDynamicObserver() {
    const targetNode = document.getElementById('results');
    if (!targetNode) return;

    this.observerInstance = new MutationObserver(() => {
      this.cleanSearchTitleText();
      const meteredTab = document.getElementById('tabMetered');
      if (meteredTab && meteredTab.classList.contains('active')) {
        this.injectTrackingTriggers();
      }
    });
    this.observerInstance.observe(targetNode, { childList: true, subtree: true });
  }

  cleanSearchTitleText() {
    const titleEl = document.getElementById('ui-search-title');
    if (titleEl && titleEl.textContent) {
      const targets = ['（點擊卡片查看地圖位置）', '(點擊卡片查看地圖位置)'];
      targets.forEach(str => {
        if (titleEl.textContent.includes(str)) {
          titleEl.textContent = titleEl.textContent.replace(str, '');
        }
      });
    }
  }

  injectTrackingTriggers() {
    const container = document.getElementById('results');
    if (!container) return;

    const cards = container.children;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.nodeType !== 1 || card.querySelector('.parking-tracker-btn-container')) continue;

      const uniqueId = card.getAttribute('data-id') || `generated-id-${i}`;
      if (!card.getAttribute('data-id')) card.setAttribute('data-id', uniqueId);

      const currentSpaces = this.parseCurrentSpaces(card);
      const actionArea = document.createElement('div');
      actionArea.className = 'parking-tracker-btn-container';
      
      const mapBtn = document.createElement('button');
      mapBtn.className = 'parking-action-btn parking-map-view-btn';
      mapBtn.setAttribute('aria-label', '查看地圖');
      mapBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;

      const actionBtn = document.createElement('button');
      actionBtn.className = 'parking-action-btn parking-tracker-toggle-btn';
      actionBtn.setAttribute('aria-label', '追蹤車位');
      
      if (currentSpaces > 0) {
        actionBtn.classList.add('tracking-disabled');
        actionBtn.disabled = true;
        actionBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
      } else if (this.activeTrackedItems.has(uniqueId)) {
        actionBtn.classList.add('tracking-active');
        actionBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
      } else {
        actionBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>`;
      }

      actionArea.appendChild(mapBtn);
      actionArea.appendChild(actionBtn);
      card.appendChild(actionArea);
    }
  }

  showFloatingToast() {
    let toast = document.getElementById('parking-toast-notice');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'parking-toast-notice';
    toast.textContent = '已啟動背景追蹤。您可以關閉瀏覽器，有車位時將發送通知。';
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast) {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  async toggleTrackingState(cardElement, buttonElement) {
    const carparkId = cardElement.getAttribute('data-id');
    if (!carparkId) return;

    if (this.activeTrackedItems.has(carparkId)) {
      this.cancelSingleTracker(carparkId);
      return;
    }

    if (this.activeTrackedItems.size >= 2) {
      alert('系統最多只能同時背景追蹤 2 個車位，請先取消現有的追蹤項目。');
      return;
    }

    if ('Notification' in window && Notification.permission !== 'granted') {
      const status = await Notification.requestPermission();
      if (status !== 'granted') {
        alert('請允許此應用程式發送通知，以便在有空置車位時即時提示您。');
        return;
      }
    }

    const nameNode = cardElement.querySelector('h2, h3, h4, .title, .name') || cardElement;
    const carparkName = nameNode.textContent.trim().split('\n')[0];

    this.showFloatingToast();
    buttonElement.classList.add('tracking-active');
    buttonElement.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;

    this.activeTrackedItems.set(carparkId, {
      title: carparkName,
      previousCount: 0,
      startedAt: Date.now()
    });

    this.synchronizeExecutionLoop();
  }

  cancelSingleTracker(carparkId) {
    if (this.activeTrackedItems.has(carparkId)) {
      this.activeTrackedItems.delete(carparkId);
      const card = document.querySelector(`[data-id="${carparkId}"]`);
      if (card) {
        const btn = card.querySelector('.parking-tracker-toggle-btn');
        if (btn && !btn.disabled) {
          btn.className = 'parking-action-btn parking-tracker-toggle-btn';
          btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>`;
        }
      }
      this.synchronizeExecutionLoop();
    }
  }

  synchronizeExecutionLoop() {
    this.refreshControlOverlay();
    if (this.activeTrackedItems.size > 0) {
      if (!this.pollTimerId) {
        this.pollTimerId = setInterval(() => {
          const btn = document.getElementById('refreshBtn');
          if (btn) btn.click();
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
      if (this.pollTimerId) { clearInterval(this.pollTimerId); this.pollTimerId = null; }
      if (this.shutdownTimerId) { clearTimeout(this.shutdownTimerId); this.shutdownTimerId = null; }
    }
  }

  cancelAllTrackers() {
    Array.from(this.activeTrackedItems.keys()).forEach(key => this.cancelSingleTracker(key));
  }

  evaluateTrackedMetrics() {
    for (const [id, data] of this.activeTrackedItems.entries()) {
      const card = document.querySelector(`[data-id="${id}"]`);
      if (!card) continue;
      const currentCount = this.parseCurrentSpaces(card);
      if (data.previousCount === 0 && currentCount >= 1) {
        this.dispatchSystemAlert('車位可用通知', `${data.title} 現已有 ${currentCount} 個空置車位可用。`, `alert-${id}`);
        this.cancelSingleTracker(id);
      }
    }
  }

  parseCurrentSpaces(cardElement) {
    const subElements = cardElement.querySelectorAll('*');
    for (let i = 0; i < subElements.length; i++) {
      const el = subElements[i];
      if (el.textContent && el.textContent.includes('空置咪錶')) {
        const fractionMatch = el.textContent.match(/(\d+)\s*\/\s*\d+/);
        if (fractionMatch) return parseInt(fractionMatch[1], 10);
        const integerMatch = el.textContent.match(/\d+/);
        if (integerMatch) return parseInt(integerMatch[0], 10);
      }
    }
    return 0;
  }

  dispatchSystemAlert(title, message, identifier) {
    if (this.swInstance && this.swInstance.active) {
      this.swInstance.active.postMessage({ action: 'TRIGGER_PUSH_NOTIFICATION', title, message, identifier });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message, tag: identifier });
    }
  }

  startLayoutVisibilityLoop() {
    setInterval(() => {
      const resultsEl = document.getElementById('results');
      if (resultsEl) {
        const rect = resultsEl.getBoundingClientRect();
        const isHidden = rect.height === 0 || window.getComputedStyle(resultsEl).display === 'none';
        if (isHidden && !this.forcedHideForMap) {
          this.forcedHideForMap = true;
          this.refreshControlOverlay();
        } else if (!isHidden && this.forcedHideForMap) {
          this.forcedHideForMap = false;
          this.refreshControlOverlay();
        }
      }
    }, 400);
  }

  attachInterfaceInterceptors() {
    const resultsArea = document.getElementById('results');
    if (!resultsArea) return;

    resultsArea.addEventListener('click', (e) => {
      const meteredTab = document.getElementById('tabMetered');
      if (!meteredTab || !meteredTab.classList.contains('active')) return;

      const toggleBtn = e.target.closest('.parking-tracker-toggle-btn');
      const mapViewBtn = e.target.closest('.parking-map-view-btn');
      const card = e.target.closest('#results > *');

      if (toggleBtn) {
        e.stopPropagation(); e.preventDefault();
        if (card) this.toggleTrackingState(card, toggleBtn);
        return;
      }
      if (mapViewBtn) {
        e.stopPropagation(); e.preventDefault();
        if (card) {
          this.isSimulatingCardClick = true;
          this.forcedHideForMap = true;
          this.refreshControlOverlay();
          card.click();
          this.isSimulatingCardClick = false;
        }
        return;
      }
      if (card && !this.isSimulatingCardClick) {
        e.stopPropagation(); e.preventDefault();
      }
    }, true);
  }

  refreshControlOverlay() {
    let island = document.getElementById('mobile-bottom-tracker-island');
    if (this.activeTrackedItems.size === 0) {
      if (island) island.remove();
      return;
    }
    if (!island) {
      island = document.createElement('div');
      island.id = 'mobile-bottom-tracker-island';
      document.body.appendChild(island);
    }

    if (this.forcedHideForMap) {
      island.classList.add('island-hidden');
      return;
    } else {
      island.classList.remove('island-hidden');
    }

    let rowsHtml = '';
    for (const [id, data] of this.activeTrackedItems.entries()) {
      rowsHtml += `
        <div class="island-row">
          <span class="island-carpark-name">${data.title}</span>
          <button class="island-cancel-btn" data-cancel-id="${id}">取消</button>
        </div>`;
    }

    island.innerHTML = `
      <div class="island-header"><span class="island-pulse"></span><span>智慧背景車位監察中</span></div>
      <div class="island-list-container">${rowsHtml}</div>`;

    island.querySelectorAll('.island-cancel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.cancelSingleTracker(e.target.getAttribute('data-cancel-id'));
      });
    });
  }
}

window.mobileParkingTrackerReference = new MobileParkingTracker();
document.addEventListener('DOMContentLoaded', () => window.mobileParkingTrackerReference.startup());
