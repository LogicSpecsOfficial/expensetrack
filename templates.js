// templates.js
const svgHome = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
const svgGps = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 19-9-9 19-2-8-8-2z"/></svg>`;
const svgStarOutline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const svgStarFilled = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff9f43" stroke="#ff9f43" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const svgRefresh = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;
const svgSearch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const svgClose = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const svgArrowUp = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;

function hasEVCharging(park) {
    const evKeywords = ['EV', 'ELECTRIC', '充電', '充电', 'CHARG'];
    if (park.facilities && Array.isArray(park.facilities)) {
        if (park.facilities.some(f => evKeywords.some(kw => String(f).toUpperCase().includes(kw)))) return true;
    }
    if (park.carpark_Type && evKeywords.some(kw => String(park.carpark_Type).toUpperCase().includes(kw))) return true;
    return evKeywords.some(kw => JSON.stringify(park).toUpperCase().includes(kw));
}

function getVacancyCount(park) {
    if (park.liveInfo && park.liveInfo.privateCar && park.liveInfo.privateCar.length > 0) {
        const count = park.liveInfo.privateCar[0].vacancy; return (count !== undefined && count !== null && count >= 0) ? count : -1;
    }
    return -1;
}

function groupMeteredParking(meters) {
    const groups = {};
    meters.forEach(m => {
        const key = m.address;
        if (!groups[key]) {
            groups[key] = { park_Id: m.address, name: m.rawStreet, address: m.address, district: m.district, distance: m.distance, latitude: m.latitude, longitude: m.longitude, totalSpaces: 0, vacantSpaces: 0 };
        }
        const g = groups[key]; g.totalSpaces += 1; if (m.vacancyStatus === 'V') g.vacantSpaces += 1;
        if (m.distance < g.distance) { g.distance = m.distance; g.latitude = m.latitude; g.longitude = m.longitude; }
    });
    return Object.values(groups).sort((a, b) => a.distance - b.distance);
}

function formatCarparkFees(park) {
    if (!park) return '';
    let privateCar = park.privateCar;
    if (!privateCar) return '';

    // 解決政府 API 有時回傳陣列 (Array) 有時回傳對象 (Object) 的結構偏差
    if (Array.isArray(privateCar)) {
        if (privateCar.length > 0) {
            privateCar = privateCar[0];
        } else {
            return '';
        }
    }

    if (typeof privateCar !== 'object') return '';

    const hourly = privateCar.hourlyCharges || [];
    const dayNight = privateCar.dayNightParks || [];

    if (hourly.length === 0 && dayNight.length === 0) return '';

    const translateType = (type) => {
        if (type === 'hourly') return '時租';
        if (type === 'half-hourly') return '半時租';
        if (type === 'day-park') return '日泊';
        if (type === 'night-park') return '夜泊';
        if (type === '6-hours-park') return '6小時泊';
        if (type === '12-hours-park') return '12小時泊';
        if (type === '24-hours-park') return '24小時泊';
        return type;
    };

    const translateWeekdays = (wd) => {
        if (!wd || wd.length === 0) return '每天';
        if (wd.length === 8 || (wd.includes('MON') && wd.includes('SUN') && wd.length >= 7)) return '星期一至日';
        if (wd.includes('MON') && wd.includes('FRI') && wd.length === 5 && !wd.includes('SAT') && !wd.includes('SUN')) return '星期一至五';
        if (wd.includes('SAT') && wd.includes('SUN') && wd.length === 2) return '星期六至日';
        
        const mapping = { 'MON': '一', 'TUE': '二', 'WED': '三', 'THU': '四', 'FRI': '五', 'SAT': '六', 'SUN': '日', 'PH': '公眾假期' };
        return wd.map(w => mapping[w] || w).join('/');
    };

    const allRules = [];
    hourly.forEach(h => {
        allRules.push({
            type: translateType(h.type),
            weekdays: translateWeekdays(h.weekdays),
            time: `${h.periodStart || ''}-${h.periodEnd || ''}`,
            price: h.price !== undefined ? `$${h.price}/${h.type === 'half-hourly' ? '半小時' : '小時'}` : '未提供'
        });
    });

    dayNight.forEach(d => {
        allRules.push({
            type: translateType(d.type),
            weekdays: translateWeekdays(d.weekdays),
            time: `${d.periodStart || ''}-${d.periodEnd || ''}`,
            price: d.price !== undefined ? `$${d.price}/次` : '未提供'
        });
    });

    if (allRules.length === 0) return '';

    // 單一規則直接一行字顯示[cite: 12]
    if (allRules.length === 1) {
        const rule = allRules[0];
        return `<span class="single-fee-text" style="font-weight: 500; color: var(--text-main);">${rule.type}：${rule.price} (${rule.weekdays} ${rule.time})</span>`;
    }

    // 將 park_Id 強制轉為字串，徹底防止純數字 ID 呼叫 .replace 崩潰
    const safeParkId = String(park.park_Id).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueId = `fee-table-${safeParkId}`;
    const toggleBtnId = `fee-btn-${safeParkId}`;

    return `
    <div class="fee-collapsible-wrapper" style="margin-top: 2px; width: 100%;">
        <button id="${toggleBtnId}" class="fee-toggle-btn" onclick="toggleFeeTable('${safeParkId}', event)" style="background: none; border: none; color: var(--accent); font-size: 0.75rem; font-weight: 600; padding: 0; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
            <span>顯示收費詳情</span>
            <svg id="arrow-${safeParkId}" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s; transform: rotate(0deg);"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div id="${uniqueId}" style="display: none; max-height: 0; overflow: hidden; transition: max-height 0.25s ease-out; margin-top: 4px; width: 100%;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left; color: var(--text-main); border: 1px solid var(--border-color); background-color: var(--bg-primary); border-radius: 4px; overflow: hidden;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--border-color); background-color: rgba(128,128,128,0.06);">
                        <th style="padding: 4px 6px; font-weight: 600;">類型</th>
                        <th style="padding: 4px 6px; font-weight: 600;">適用日子</th>
                        <th style="padding: 4px 6px; font-weight: 600;">時段</th>
                        <th style="padding: 4px 6px; font-weight: 600;">收費</th>
                    </tr>
                </thead>
                <tbody>
                    ${allRules.map(r => `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 4px 6px; font-weight: 500;">${r.type}</td>
                            <td style="padding: 4px 6px; opacity: 0.8;">${r.weekdays}</td>
                            <td style="padding: 4px 6px; opacity: 0.8; white-space: nowrap;">${r.time}</td>
                            <td style="padding: 4px 6px; font-weight: 600; color: var(--accent);">${r.price}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}

function generateCardHTML(park) {
    const isFav = favorites.includes(park.park_Id);
    let displayAddress = park.displayAddress || (park.address && park.address.displayAddress) || '';
    
    displayAddress = displayAddress.replace(/^(地址\s*[:：]\s*)/i, '').trim();
    
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress + " " + (park.name || ''))}`;
    let heightText = (park.heightRestrictions || []).map(h => h.height ? `${h.height}m` : '').filter(Boolean).join(', ');
    let cardStatusClass = 'status-unknown', boxStatusClass = '', vacancyNumClass = '';
    let vacancyHTML = `<div class="vacancy-badge unknown"><span class="vacancy-num">--</span><span class="vacancy-label">${t.noVacancyData}</span></div>`;
    const count = getVacancyCount(park);
    if (count >= 0) {
        if (count >= 10) { cardStatusClass = 'status-high'; boxStatusClass = 'available'; }
        else if (count > 0) { cardStatusClass = 'status-medium'; boxStatusClass = 'moderate'; vacancyNumClass = 'medium'; }
        else { cardStatusClass = 'status-empty'; boxStatusClass = 'full'; vacancyNumClass = 'none'; }
        vacancyHTML = `<div class="vacancy-badge ${boxStatusClass}"><span class="vacancy-num ${vacancyNumClass}">${count}</span><span class="vacancy-label">${t.spaces}</span></div>`;
    }
    let distHTML = park.distance !== Infinity ? `<span class="distance">${park.distance.toFixed(2)} ${t.away}</span>${park.distance > 5 ? `<span class="distance-warning">${t.distWarning}</span>` : ''}` : '';
    let infoGridItems = displayAddress ? `<div class="info-label">${t.address}:</div><div><a href="${mapUrl}" target="_blank" class="map-link">${displayAddress}</a></div>` : '';
    if (heightText) infoGridItems += `<div class="info-label">${t.maxHeight}:</div><div>${heightText}</div>`;
    if (park.contactNo) infoGridItems += `<div class="info-label">${t.contact}:</div><div><a href="tel:${park.contactNo.replace(/\s+/g, '')}" class="phone-link">${park.contactNo}</a></div>`;
    
    const feeHTML = formatCarparkFees(park);
    if (feeHTML) {
        infoGridItems += `<div class="info-label">${t.feeTitle}:</div><div>${feeHTML}</div>`;
    }

    const favBtnHTML = `<button class="card-fav-btn inline-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${park.park_Id}')" aria-label="${isFav ? t.removeFav : t.addFav}">${isFav ? svgStarFilled : svgStarOutline}</button>`;
    
    return `<div class="carpark-card ${cardStatusClass}"><div class="card-body-split"><div class="card-left"><div class="carpark-name">${favBtnHTML}${park.name || '---'}</div><div class="tags-row">${distHTML} ${hasEVCharging(park) ? `<span class="status-badge ev-charger">${t.evBadge}</span>` : ''}</div>${infoGridItems ? `<div class="info-grid">${infoGridItems}</div>` : ''}</div><div class="card-right">${vacancyHTML}</div></div></div>`;
}

function generateMeterCardHTML(meterGroup) {
    const isFav = favorites.includes(meterGroup.park_Id); const isAnyVacant = meterGroup.vacantSpaces > 0;
    const favBtnHTML = `<button class="card-fav-btn inline-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${meterGroup.park_Id}')" aria-label="${isFav ? t.removeFav : t.addFav}">${isFav ? svgStarFilled : svgStarOutline}</button>`;
    
    return `<div class="carpark-card ${isAnyVacant ? 'status-high' : 'status-empty'}"><div class="card-body-split"><div class="card-left"><div class="carpark-name">${favBtnHTML}${meterGroup.name}</div><div class="tags-row"><span class="distance">${meterGroup.distance.toFixed(2)} ${t.away}</span>${meterGroup.distance > 5 ? `<span class="distance-warning">${t.distWarning}</span>` : ''}</div><div class="info-grid"><div class="info-label">${t.address}:</div><div><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meterGroup.address)}" target="_blank" class="map-link">${meterGroup.address}</a></div><div class="info-label">${t.district}:</div><div>${meterGroup.district || '---'}</div></div></div><div class="card-right"><div class="vacancy-badge ${isAnyVacant ? 'available' : 'full'}"><span class="vacancy-num ${!isAnyVacant ? 'none' : ''}">${meterGroup.vacantSpaces}/${meterGroup.totalSpaces}</span><span class="vacancy-label">${t.vacantMeters}</span></div></div></div></div>`;
}

function generateToiletCardHTML(toilet) {
    const isFav = favorites.includes(toilet.park_Id);
    const favBtnHTML = `<button class="card-fav-btn inline-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${toilet.park_Id}')" aria-label="${isFav ? t.removeFav : t.addFav}">${isFav ? svgStarFilled : svgStarOutline}</button>`;
    
    return `<div class="carpark-card status-high"><div class="card-body-split"><div class="card-left"><div class="carpark-name">${favBtnHTML}${toilet.name}</div><div class="tags-row"><span class="distance">${toilet.distance.toFixed(2)} ${t.away}</span>${toilet.distance > 5 ? `<span class="distance-warning">${t.distWarning}</span>` : ''}</div><div class="info-grid"><div class="info-label">地址:</div><div><a href="https://www.google.com/maps/search/?api=1&query=${toilet.latitude},${toilet.longitude}" target="_blank" class="map-link">${toilet.address}</a></div>${toilet.type !== '設施' ? `<div class="info-label">類型:</div><div>${toilet.type}</div>` : ''}</div></div><div class="card-right"><div style="height: 40px; visibility: hidden;"></div></div></div></div>`;
}

function renderWelcomeMessage() {
    document.getElementById('results').innerHTML = `<div class="welcome-box" style="text-align: center; padding: 15px 10px;"><style>.welcome-box-item svg { width: 20px !important; height: 20px !important; display: block !important; }</style><h3 style="margin-bottom: 8px;">歡迎使用香港車位及公廁搜尋</h3><p style="opacity: 0.8; font-size: 14px; margin-bottom: 20px;">功能圖標說明如下：</p><div style="max-width: 420px; margin: 0 auto; text-align: left; font-size: 14px;"><div class="welcome-box-item" style="display: flex; align-items: center; margin-bottom: 14px;"><div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(128,128,128,0.12); border-radius: 6px; margin-right: 14px; flex-shrink: 0; color: inherit;">${sunIcon}</div><div><strong>主題按鈕：</strong>切換深色或淺色視覺模式</div></div><div class="welcome-box-item" style="display: flex; align-items: center; margin-bottom: 14px;"><div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(128,128,128,0.12); border-radius: 6px; margin-right: 14px; flex-shrink: 0; color: inherit;">${svgStarOutline}</div><div><strong>收藏按鈕：</strong>切換顯示或隱藏已收藏的清單</div></div><div class="welcome-box-item" style="display: flex; align-items: center; margin-bottom: 14px;"><div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(128,128,128,0.12); border-radius: 6px; margin-right: 14px; flex-shrink: 0; color: inherit;">${svgSearch}</div><div><strong>搜尋按鈕：</strong>展開或關閉地址搜尋欄</div></div><div class="welcome-box-item" style="display: flex; align-items: center; margin-bottom: 14px;"><div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(128,128,128,0.12); border-radius: 6px; margin-right: 14px; flex-shrink: 0; color: inherit;">${svgRefresh}</div><div><strong>更新按鈕：</strong>刷新並獲取最新的即時數據</div></div><div class="welcome-box-item" style="display: flex; align-items: center; margin-bottom: 14px;"><div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(128,128,128,0.12); border-radius: 6px; margin-right: 14px; flex-shrink: 0; color: inherit;">${svgGps}</div><div><strong>定位按鈕：</strong>尋找當前位置附近的車位與公廁</div></div></div></div>`;
}
