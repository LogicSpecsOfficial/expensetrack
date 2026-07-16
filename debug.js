// debug.js - 2026年行動端專用政府 API 數據智慧診斷工具
(function() {
    // 建立浮動按鈕
    const debugBtn = document.createElement('button');
    debugBtn.id = 'floatingDebugBtn';
    debugBtn.innerHTML = '🛠️ API 數據分析';
    debugBtn.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 10000;
        background-color: var(--accent, #0d6efd);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 10px 18px;
        font-size: 0.8rem;
        font-weight: bold;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        cursor: pointer;
        transition: transform 0.2s, background-color 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
    `;
    
    // 按鈕點擊微反饋
    debugBtn.addEventListener('touchstart', () => { debugBtn.style.transform = 'scale(0.92)'; });
    debugBtn.addEventListener('touchend', () => { debugBtn.style.transform = 'scale(1)'; });
    debugBtn.addEventListener('click', toggleDebugModal);
    
    document.body.appendChild(debugBtn);

    // 建立全螢幕模態診斷視窗
    const modal = document.createElement('div');
    modal.id = 'debugModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.6);
        backdrop-filter: blur(5px);
        z-index: 10001;
        display: none;
        justify-content: center;
        align-items: center;
        padding: 16px;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
        background-color: var(--surface, #ffffff);
        color: var(--text-main, #212529);
        width: 100%;
        max-width: 500px;
        height: 85vh;
        border-radius: 12px;
        border: 1px solid var(--border-color, #dee2e6);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    container.innerHTML = `
        <div style="padding: 16px; border-bottom: 1px solid var(--border-color, #dee2e6); display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: bold;">🔍 API 數據實時診斷面板</h3>
            <button onclick="document.getElementById('debugModal').style.display='none'" style="background: none; border: none; font-size: 1.5rem; color: var(--text-muted, #6c757d); cursor: pointer; line-height: 1; padding: 4px;">&times;</button>
        </div>
        <div id="debugContent" style="padding: 16px; overflow-y: auto; flex: 1; font-family: monospace; font-size: 0.75rem; line-height: 1.5;">
            <div style="text-align: center; color: var(--text-muted, #6c757d); padding-top: 50px;">
                <p style="font-size: 1.2rem;">📡 尚未獲取 API 數據</p>
                <p>請先點擊首頁的「GPS 定位」或搜尋地址，成功加載室內停車場後，此處將自動解析最真實的 JSON 結構！</p>
            </div>
        </div>
        <div style="padding: 12px; border-top: 1px solid var(--border-color, #dee2e6); background-color: rgba(128,128,128,0.04); text-align: center;">
            <button onclick="document.getElementById('debugModal').style.display='none'" style="background-color: var(--text-main, #212529); color: var(--surface, #ffffff); border: none; padding: 8px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">關閉診斷</button>
        </div>
    `;
    
    modal.appendChild(container);
    document.body.appendChild(modal);

    function toggleDebugModal() {
        modal.style.display = modal.style.display === 'none' || modal.style.display === '' ? 'flex' : 'none';
    }

    // 全局註冊：供 api.js 數據讀取成功後調用
    window.analyzeRawApiData = function(results) {
        if (!results || results.length === 0) return;
        const debugContent = document.getElementById('debugContent');
        if (!debugContent) return;

        // 智慧診斷分析
        const testItem = results[0];
        const hasPC = 'privateCar' in testItem;
        const pcType = hasPC ? (Array.isArray(testItem.privateCar) ? 'Array (陣列)' : typeof testItem.privateCar) : '不存在';
        
        let subPC = null;
        if (hasPC) {
            subPC = Array.isArray(testItem.privateCar) ? testItem.privateCar[0] : testItem.privateCar;
        }
        
        const hasHourly = subPC ? ('hourlyCharges' in subPC || 'hourlycharges' in subPC) : false;
        const hasDayNight = subPC ? ('dayNightParks' in subPC || 'daynightparks' in subPC) : false;

        let diagnosisHTML = `
            <div style="background-color: rgba(13, 110, 253, 0.08); border: 1px solid var(--accent, #0d6efd); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; color: var(--accent, #0d6efd); font-size: 0.85rem; font-weight: bold;">📊 數據結構智慧診斷結論</h4>
                <p style="margin: 3px 0;">🟢 成功讀取停車場總數: <b>${results.length} 個</b></p>
                <p style="margin: 3px 0;">🔍 <code>privateCar</code> 欄位狀態: <span style="color: ${hasPC ? 'green' : 'red'}; font-weight: bold;">${pcType}</span></p>
                <p style="margin: 3px 0;">🕒 <code>hourlyCharges</code> 欄位狀態: <span style="color: ${hasHourly ? 'green' : 'red'}; font-weight: bold;">${hasHourly ? '存在' : '不存在'}</span></p>
                <p style="margin: 3px 0;">🌙 <code>dayNightParks</code> 欄位狀態: <span style="color: ${hasDayNight ? 'green' : 'red'}; font-weight: bold;">${hasDayNight ? '存在' : '不存在'}</span></p>
            </div>
            <h4 style="margin: 12px 0 6px 0; border-left: 3px solid var(--text-main, #212529); padding-left: 8px; font-size: 0.85rem;">📋 前 3 個停車場的原始數據結構 (JSON)：</h4>
        `;

        // 擷取前三個展示
        const subset = results.slice(0, 3).map(item => {
            return {
                park_Id: item.park_Id,
                name: item.name,
                privateCar_raw_type: Array.isArray(item.privateCar) ? 'Array' : typeof item.privateCar,
                privateCar_sample: item.privateCar ? (Array.isArray(item.privateCar) ? item.privateCar.slice(0, 1) : item.privateCar) : null,
                raw_keys: Object.keys(item)
            };
        });

        diagnosisHTML += `<pre style="background-color: var(--bg-primary, #f8f9fa); border: 1px solid var(--border-color, #dee2e6); padding: 10px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(subset, null, 2)}</pre>`;
        
        debugContent.innerHTML = diagnosisHTML;
    };
})();
