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

    const cards = container.children;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.nodeType !== 1) continue;

      if (!card.querySelector('.parking-tracker-btn-container')) {
        const uniqueId = card.getAttribute('data-id') || `generated-id-${i}`;
        if (!card.getAttribute('data-id')) {
          card.setAttribute('data-id', uniqueId);
        }

        // 建立整合式下層按鈕容器（完全不使用任何分割線樣式）
        const actionArea = document.createElement('div');
        actionArea.className = 'parking-tracker-btn-container';
        
        // 建立左側「查看地圖」按鈕與純向量 SVG 圖標
        const mapBtn = document.createElement('button');
        mapBtn.className = 'parking-action-btn parking-map-view-btn';
        mapBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          查看地圖
        `;

        // 建立右側「追蹤車位」按鈕與純向量 SVG 雷達圖標
        const actionBtn = document.createElement('button');
        actionBtn.className = 'parking-action-btn parking-tracker-toggle-btn';
        
        if (this.activeTrackedItems.has(uniqueId)) {
          actionBtn.classList.add('tracking-active');
          actionBtn.textContent = '正在追蹤';
        } else {
          actionBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>
            追蹤車位
          `;
        }

        actionArea.appendChild(mapBtn);
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

    if (this.activeTrackedItems.size >= 2) {
      alert('系統最多只能同時背景追蹤 2 個車位，請先取消現有的追蹤項目。');
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

    // 啟動 4 秒鐘直觀式背景更新機制提示
    buttonElement.classList.add('tracking-confirming');
    buttonElement.textContent = '已啟動背景追蹤。您可以關閉瀏覽器，有車位時將發送通知。';

    setTimeout(() => {
      // 確保使用者中途沒有提早點擊取消
      if (this.activeTrackedItems.has(carparkId)) {
        buttonElement.classList.remove('tracking-confirming');
        buttonElement.classList.add('tracking-active');
        buttonElement.textContent = '正在追蹤';
      }
    }, 4000);

    this.activeTrackedItems.set(carparkId, {
      title: carparkName,
      previousCount: initialSpaces,
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
        if (btn) {
          btn.classList.remove('tracking-active');
          btn.classList.remove('tracking-confirming');
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>
            追蹤車位
          `;
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

  cancelAllTrackers() {
    const activeKeys = Array.from(this.activeTrackedItems.keys());
    activeKeys.forEach(key => this.cancelSingleTracker(key));
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
    const clone = cardElement.cloneNode(true);
    const btnContainer = clone.querySelector('.parking-tracker-btn-container');
    if (btnContainer) btnContainer.remove();

    const badgeText = clone.textContent.replace(/[\r\n\t]/g, ' ');
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

    // 擷取階段監聽（Capture Phase）：完全杜絕誤觸地圖行為，只在點擊「查看地圖」時允許卡片行為
    resultsArea.addEventListener('click', (e) => {
      const meteredTab = document.getElementById('tabMetered');
      if (!meteredTab || !meteredTab.classList.contains('active')) return;

      const toggleBtn = e.target.closest('.parking-tracker-toggle-btn');
      const mapViewBtn = e.target.closest('.parking-map-view-btn');
      const card = e.target.closest('#results > *');

      if (toggleBtn) {
        e.stopPropagation();
        e.preventDefault();
        if (card) this.toggleTrackingState(card, toggleBtn);
        return;
      }

      if (mapViewBtn) {
        e.stopPropagation();
        e.preventDefault();
        if (card) {
          this.isSimulatingCardClick = true;
          card.click(); // 完美調用並觸發原網站內建的地圖點擊監聽邏輯
          this.isSimulatingCardClick = false;
        }
        return;
      }

      // 如果點擊卡片內的其他空白區域，則完全進行攔截阻斷，防止跳出地圖彈窗
      if (card && !this.isSimulatingCardClick) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  }

  refreshControlOverlay() {
    let island = document.getElementById('mobile-top-tracker-island');

    if (this.activeTrackedItems.size === 0) {
      if (island) island.remove();
      return;
    }

    if (!island) {
      island = document.createElement('div');
      island.id = 'mobile-top-tracker-island';
      document.body.appendChild(island);
    }

    let rowsHtml = '';
    for (const [id, data] of this.activeTrackedItems.entries()) {
      rowsHtml += `
        <div class="island-row">
          <span class="island-carpark-name">${data.title}</span>
          <button class="island-cancel-btn" data-cancel-id="${id}">取消</button>
        </div>
      `;
    }

    island.innerHTML = `
      <div class="island-header">
        <span class="island-pulse"></span>
        <span>智慧背景車位監察中</span>
      </div>
      <div class="island-list-container">
        ${rowsHtml}
      </div>
    `;

    // 綁定獨立的取消按鈕事件
    island.querySelectorAll('.island-cancel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.target.getAttribute('data-cancel-id');
        this.cancelSingleTracker(targetId);
      });
    });
  }
}

window.mobileParkingTrackerReference = new MobileParkingTracker();
document.addEventListener('DOMContentLoaded', () => {
  window.mobileParkingTrackerReference.startup();
});
