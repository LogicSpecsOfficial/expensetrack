const i18n = {
    zh_TW: {
        title: "最近的香港停車場",
        btnText: "尋找最近的停車場",
        btnFavShow: "顯示我的收藏",
        btnFavHide: "隱藏我的收藏",
        favTitle: "我的收藏夾",
        searchTitle: "搜尋結果",
        tabOffStreet: "室內停車場",
        tabMetered: "路邊咪錶位",
        gpsLocating: "正在獲取您的位置...",
        apiFetching: "正在讀取停車場數據...",
        gpsError: "定位錯誤: ",
        apiError: "處理數據出錯: ",
        noSupport: "您的瀏覽器不支援地理定位功能。",
        showingResults: "顯示最近的 30 個地點：",
        noRecords: "未找到符合條件的地點紀錄。",
        noFavs: "此分類暫無收藏項目。",
        away: "公里外",
        address: "地址",
        district: "地區",
        maxHeight: "最高限高",
        contact: "聯絡電話",
        liveVacancy: "即時空位",
        spaces: "個空置車位",
        noVacancyData: "未有提供即時空位數據",
        distWarning: "[提示: 距離較遠]",
        aiPredictTitle: "AI 15分鐘後車位估算率",
        addFav: "收藏",
        removeFav: "取消收藏"
    },
    en_US: {
        title: "Nearest HK Car Parks",
        btnText: "Find Nearest Car Parks",
        btnFavShow: "Show My Favorites",
        btnFavHide: "Hide My Favorites",
        favTitle: "My Favorites",
        searchTitle: "Search Results",
        tabOffStreet: "Off-Street Lots",
        tabMetered: "On-Street Meters",
        gpsLocating: "Acquiring location...",
        apiFetching: "Fetching car park data...",
        gpsError: "Location error: ",
        apiError: "Error processing data: ",
        noSupport: "Geolocation is not supported by your browser.",
        showingResults: "Showing the nearest 30 records:",
        noRecords: "No matching records found nearby.",
        noFavs: "No favorited items in this tab.",
        away: "km away",
        address: "Address",
        district: "District",
        maxHeight: "Max Height",
        contact: "Contact",
        liveVacancy: "Live Vacancy",
        spaces: "spaces available",
        noVacancyData: "No live availability data provided",
        distWarning: "[Notice: Far Distance]",
        aiPredictTitle: "AI 15-Min Availability Probability",
        addFav: "Favorite",
        removeFav: "Unfavorite"
    }
};

let currentLang = 'zh_TW';
let currentTab = 'offstreet';
let userCoordinates = null;
let cachedAllParks = [];
let cachedAllMeters = [];
let favorites = JSON.parse(localStorage.getItem('hk_carpark_favs')) || [];

let refreshInterval = null;
let countdownValue = 15;

const langSelect = document.getElementById('langSelect');
const uiTitle = document.getElementById('ui-title');
const tabOffStreet = document.getElementById('tabOffStreet');
const tabMetered = document.getElementById('tabMetered');
const locateBtn = document.getElementById('locateBtn');
const showFavBtn = document.getElementById('showFavBtn');
const statusText = document.getElementById('status');
const countdownElement = document.getElementById('countdownText');
const resultsDiv = document.getElementById('results');
const favoritesList = document.getElementById('favoritesList');
const favWrapper = document.getElementById('fav-wrapper');
const uiFavTitle = document.getElementById('ui-fav-title');
const uiSearchTitle = document.getElementById('ui-search-title');

function updateUIStaticText() {
    uiTitle.textContent = i18n[currentLang].title;
    locateBtn.textContent = i18n[currentLang].btnText;
    uiFavTitle.textContent = i18n[currentLang].favTitle;
    uiSearchTitle.textContent = i18n[currentLang].searchTitle;
    tabOffStreet.textContent = i18n[currentLang].tabOffStreet;
    tabMetered.textContent = i18n[currentLang].tabMetered;
    showFavBtn.textContent = favWrapper.style.display === 'none' ? i18n[currentLang].btnFavShow : i18n[currentLang].btnFavHide;
    updateCountdownUI();
}

function updateCountdownUI() {
    if (!userCoordinates) {
        countdownElement.textContent = '';
        return;
    }
    countdownElement.textContent = currentLang === 'zh_TW' ? 
        `資料將在 ${countdownValue} 秒後自動更新` : 
        `Data will auto-refresh in ${countdownValue}s`;
}

function initAutoRefreshLoop() {
    if (refreshInterval) clearInterval(refreshInterval);
    countdownValue = 15;
    updateCountdownUI();
    
    refreshInterval = setInterval(async () => {
        countdownValue--;
        if (countdownValue <= 0) {
            countdownValue = 15;
            if (userCoordinates) {
                await refreshActiveTabData(true);
            }
        }
        updateCountdownUI();
    }, 1000);
}

async function switchTab(tabName) {
    currentTab = tabName;
    if (currentTab === 'offstreet') {
        tabOffStreet.classList.add('active');
        tabMetered.classList.remove('active');
    } else {
        tabMetered.classList.add('active');
        tabOffStreet.classList.remove('active');
    }
    renderFavorites();
    await renderActiveTabDisplay();
}

async function renderActiveTabDisplay() {
    if (!userCoordinates) return;
    if (currentTab === 'offstreet') {
        if (cachedAllParks.length > 0) {
            displayResults(cachedAllParks.slice(0, 30), false);
        } else {
            await refreshActiveTabData(false);
        }
    } else {
        if (cachedAllMeters.length > 0) {
            displayResults(cachedAllMeters.slice(0, 30), true);
        } else {
            await refreshActiveTabData(false);
        }
    }
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];
    
    const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    let headerIndex = -1;
    let headers = [];
    
    for (let i = 0; i < lines.length; i++) {
        const cleanLine = lines[i].replace(/^\uFEFF/i, '').trim();
        if (!cleanLine) continue;
        const testHeaders = cleanLine.split(splitRegex).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
        
        if (testHeaders.includes('parkingspaceid') || testHeaders.includes('parking_space_id') || testHeaders.includes('occupancystatus')) {
            headerIndex = i;
            headers = testHeaders;
            break;
        }
    }
    
    if (headerIndex === -1) {
        headerIndex = 0;
        headers = lines[0].split(splitRegex).map(h => h.replace(/^\uFEFF/i, '').replace(/^["']|["']$/g, '').trim().toLowerCase());
    }
    
    const results = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const currentline = line.split(splitRegex);
        if (currentline.length < headers.length) continue;
        
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            const val = currentline[j] ? currentline[j].replace(/^["']|["']$/g, '').trim() : '';
            obj[headers[j]] = val;
        }
        results.push(obj);
    }
    return results;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function calculateOffStreetAIPrediction(currentVacancy) {
    if (currentVacancy === undefined || currentVacancy === null || currentVacancy < 0) return null;
    if (currentVacancy === 0) return 0;

    const now = new Date();
    const hour = now.getHours();

    if (hour >= 23 || hour < 6) {
        return 100;
    }

    const day = now.getDay();
    let trendFactor = 1.0;
    if (day >= 1 && day <= 5) {
        if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) trendFactor = 0.75;
    } else {
        if (hour >= 12 && hour <= 18) trendFactor = 0.65;
    }

    let prediction = Math.min(100, Math.max(15, currentVacancy * 4 * trendFactor));
    return Math.round(prediction);
}

function calculateMeteredAIPrediction(status) {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 23 || hour < 6) {
        return status === 'V' ? 100 : 0;
    }
    
    const isPeak = hour >= 8 && hour <= 20;
    if (status === 'V') {
        return isPeak ? 30 : 80;
    } else {
        return isPeak ? 12 : 45;
    }
}

async function fetchTextThroughProxy(rawUrl) {
    // 1. Native Direct Connection
    try {
        const res = await fetch(rawUrl);
        if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 100) return text;
        }
    } catch (e) {
        console.warn("Direct native request blocked, applying proxies.");
    }

    // 2. Proxy A: corsproxy.io (Unencoded directly)
    try {
        const proxyUrl = `https://corsproxy.io/?${rawUrl}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 100) return text;
        }
    } catch (e) {
        console.warn("Proxy A (corsproxy.io) failed, trying fallback.");
    }

    // 3. Proxy B: api.codetabs.com
    try {
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rawUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 100) return text;
        }
    } catch (e) {
        console.warn("Proxy B (codetabs) failed, trying fallback.");
    }

    // 4. Proxy C: api.allorigins.win
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rawUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const data = await res.json();
            if (data && data.contents && data.contents.trim().length > 100) return data.contents;
        }
    } catch (e) {
        console.error("All proxies failed.");
    }

    throw new Error("Unable to fetch metered parking datasets through proxy streams.");
}

locateBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        statusText.textContent = i18n[currentLang].noSupport;
        return;
    }
    locateBtn.disabled = true;
    statusText.textContent = i18n[currentLang].gpsLocating;
    resultsDiv.innerHTML = "";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            userCoordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
            initAutoRefreshLoop();
            await refreshActiveTabData(false);
        },
        async (error) => {
            console.warn("GPS tracking failed, falling back to Kowloon center coordinates.", error);
            userCoordinates = { lat: 22.3193, lng: 114.1694 };
            initAutoRefreshLoop();
            statusText.textContent = currentLang === 'zh_TW' ? "定位未開啟，已顯示九龍中心數據" : "GPS failed, displaying Kowloon defaults.";
            await refreshActiveTabData(false);
        },
        { enableHighAccuracy: true }
    );
});

showFavBtn.addEventListener('click', () => {
    if (favWrapper.style.display === 'none') {
        favWrapper.style.display = 'block';
        if (cachedAllParks.length === 0) {
            silentFetchData();
        } else {
            renderFavorites();
        }
    } else {
        favWrapper.style.display = 'none';
    }
    updateUIStaticText();
});

async function refreshActiveTabData(isBackgroundRefresh = false) {
    if (!userCoordinates) return;
    if (!isBackgroundRefresh) {
        statusText.textContent = i18n[currentLang].apiFetching;
        locateBtn.disabled = true;
    }
    try {
        if (currentTab === 'offstreet') {
            await fetchCarParks(userCoordinates.lat, userCoordinates.lng);
        } else {
            await fetchMeteredParking(userCoordinates.lat, userCoordinates.lng);
        }
    } catch (err) {
        if (!isBackgroundRefresh) {
            statusText.textContent = `${i18n[currentLang].apiError}${err.message}`;
        }
        console.error("Data processing error log:", err);
    } finally {
        if (!isBackgroundRefresh) {
            locateBtn.disabled = false;
        }
    }
}

async function fetchCarParks(userLat, userLng) {
    const infoUrl = `https://api.data.gov.hk/v1/carpark-info-vacancy?data=info&lang=${currentLang}`;
    const vacancyUrl = `https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&lang=${currentLang}`;

    const [infoRes, vacancyRes] = await Promise.all([fetch(infoUrl), fetch(vacancyUrl)]);
    if (!infoRes.ok || !vacancyRes.ok) throw new Error("API network failure");
    
    const infoData = await infoRes.json();
    const vacancyData = await vacancyRes.json();

    const vacancyMap = new Map();
    (vacancyData.results || []).forEach(v => vacancyMap.set(v.park_Id, v));

    cachedAllParks = (infoData.results || []).map(park => {
        const distance = calculateDistance(userLat, userLng, park.latitude, park.longitude);
        const liveInfo = vacancyMap.get(park.park_Id);
        return { ...park, distance, liveInfo };
    }).sort((a, b) => a.distance - b.distance);

    displayResults(cachedAllParks.slice(0, 30), false);
    renderFavorites();
}

async function fetchMeteredParking(userLat, userLng) {
    const rawInfoUrl = 'https://resource.data.one.gov.hk/td/psiparkingspaces/spaceinfo/parkingspaces.csv';
    const rawVacancyUrl = 'https://resource.data.one.gov.hk/td/psiparkingspaces/occupancystatus/occupancystatus.csv';

    const [infoText, vacancyText] = await Promise.all([
        fetchTextThroughProxy(rawInfoUrl),
        fetchTextThroughProxy(rawVacancyUrl)
    ]);

    const infoRows = parseCSV(infoText);
    const vacancyRows = parseCSV(vacancyText);

    const occupancyMap = new Map();
    vacancyRows.forEach(row => {
        const spaceId = row['parking_space_id'] || row['parkingspaceid'] || '';
        const status = row['occupancy_status'] || row['occupancystatus'] || '';
        if (spaceId) occupancyMap.set(spaceId, status);
    });

    cachedAllMeters = [];
    infoRows.forEach(row => {
        const vehicleType = row['vehicle_type'] || row['vehicletype'] || '';
        if (vehicleType.toUpperCase() !== 'A') return;

        const latVal = row['latitude'] || row['lat'] || '';
        const lngVal = row['longitude'] || row['lng'] || '';
        const lat = parseFloat(latVal);
        const lng = parseFloat(lngVal);
        if (isNaN(lat) || isNaN(lng)) return;

        const distance = calculateDistance(userLat, userLng, lat, lng);
        const spaceId = row['parking_space_id'] || row['parkingspaceid'] || '';
        const status = occupancyMap.get(spaceId) || 'V';

        const streetTc = row['street_tc'] || '';
        const streetEn = row['street_en'] || row['street'] || '';
        const districtTc = row['district_tc'] || '';
        const districtEn = row['district_en'] || row['district'] || '';

        cachedAllMeters.push({
            park_Id: spaceId,
            name: currentLang === 'zh_TW' ? `${streetTc} ${spaceId}` : `${streetEn} ${spaceId}`,
            address: currentLang === 'zh_TW' ? `${districtTc} ${streetTc}` : `${districtEn} ${streetEn}`,
            district: currentLang === 'zh_TW' ? districtTc : districtEn,
            latitude: lat,
            longitude: lng,
            distance: distance,
            vacancyStatus: status
        });
    });

    cachedAllMeters.sort((a, b) => a.distance - b.distance);
    displayResults(cachedAllMeters.slice(0, 30), true);
    renderFavorites();
}

function toggleFavorite(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(favId => favId !== id);
    } else {
        favorites.push(id);
    }
    localStorage.setItem('hk_carpark_favs', JSON.stringify(favorites));
    
    renderFavorites();
    renderActiveTabDisplay();
}

function generateCardHTML(park) {
    const t = i18n[currentLang];
    const isFav = favorites.includes(park.park_Id);
    let displayAddress = park.displayAddress || (park.address && park.address.displayAddress) || '';
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress + " " + (park.name || ''))}`;

    let heightText = (park.heightRestrictions || []).map(h => h.height ? `${h.height}m` : '').filter(Boolean).join(', ');
    let vacancyHTML = `<div class="vacancy-box">Notice: ${t.noVacancyData}</div>`;
    let aiPredictionHTML = '';

    if (park.liveInfo && park.liveInfo.privateCar && park.liveInfo.privateCar.length > 0) {
        const count = park.liveInfo.privateCar[0].vacancy;
        if (count !== undefined && count !== null && count >= 0) {
            vacancyHTML = `
                <div class="vacancy-box ${count === 0 ? 'full' : 'available'}">
                    <strong>${t.liveVacancy}:</strong> 
                    <span class="vacancy-num ${count === 0 ? 'none' : ''}">${count}</span> ${t.spaces}
                </div>`;
            
            const aiPct = calculateOffStreetAIPrediction(count);
            if (aiPct !== null) {
                aiPredictionHTML = `
                    <div class="ai-box">
                        <strong>${t.aiPredictTitle}:</strong> <span class="ai-num">${aiPct}%</span>
                    </div>`;
            }
        }
    }

    let contactHTML = park.contactNo ? `<a href="tel:${park.contactNo.replace(/\s+/g, '')}" class="phone-link">${park.contactNo}</a>` : '';
    
    let distWarningHTML = park.distance > 5 ? `<span class="distance-warning">${t.distWarning}</span>` : '';
    const distHTML = park.distance !== Infinity ? `<span class="distance">${park.distance.toFixed(2)} ${t.away}</span>${distWarningHTML}` : '';

    let infoGridItems = '';
    if (displayAddress) infoGridItems += `<div class="info-label">${t.address}:</div><div><a href="${mapUrl}" target="_blank" class="map-link">${displayAddress}</a></div>`;
    if (park.district) infoGridItems += `<div class="info-label">${t.district}:</div><div>${park.district}</div>`;
    if (park.carpark_Type) infoGridItems += `<div class="info-label">${currentLang === 'zh_TW' ? '類型' : 'Type'}:</div><div>${park.carpark_Type}</div>`;
    if (heightText) infoGridItems += `<div class="info-label">${t.maxHeight}:</div><div>${heightText}</div>`;
    if (contactHTML) infoGridItems += `<div class="info-label">${t.contact}:</div><div>${contactHTML}</div>`;

    return `
        <div class="carpark-card">
            <div class="card-header">
                <div class="carpark-name">${park.name || '---'}</div>
                <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${park.park_Id}')">${isFav ? t.removeFav : t.addFav}</button>
            </div>
            <div class="tags-row">${distHTML}</div>
            ${infoGridItems ? `<div class="info-grid">${infoGridItems}</div>` : ''}
            ${vacancyHTML}
            ${aiPredictionHTML}
        </div>`;
}

function generateMeterCardHTML(meter) {
    const t = i18n[currentLang];
    const isFav = favorites.includes(meter.park_Id);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meter.address)}`;
    const isVacant = meter.vacancyStatus === 'V';
    const statusLabel = isVacant ? (currentLang === 'zh_TW' ? '空置' : 'Vacant') : (currentLang === 'zh_TW' ? '使用中' : 'Occupied');

    let distWarningHTML = meter.distance > 5 ? `<span class="distance-warning">${t.distWarning}</span>` : '';
    const distHTML = meter.distance !== Infinity ? `<span class="distance">${meter.distance.toFixed(2)} ${t.away}</span>${distWarningHTML}` : '';
    const aiPct = calculateMeteredAIPrediction(meter.vacancyStatus);

    return `
        <div class="carpark-card">
            <div class="card-header">
                <div class="carpark-name">${meter.name}</div>
                <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${meter.park_Id}')">${isFav ? t.removeFav : t.addFav}</button>
            </div>
            <div class="tags-row">${distHTML}</div>
            <div class="info-grid">
                <div class="info-label">${t.address}:</div><div><a href="${mapUrl}" target="_blank" class="map-link">${meter.address}</a></div>
                <div class="info-label">${t.district}:</div><div>${meter.district || '---'}</div>
            </div>
            <div class="vacancy-box ${isVacant ? 'available' : 'full'}">
                <strong>${t.liveVacancy}:</strong> 
                <span class="vacancy-num ${!isVacant ? 'none' : ''}">${statusLabel}</span>
            </div>
            <div class="ai-box">
                <strong>${t.aiPredictTitle}:</strong> <span class="ai-num">${aiPct}%</span>
            </div>
        </div>`;
}

function displayResults(items, isMeter = false) {
    statusText.textContent = i18n[currentLang].showingResults;
    if (items.length === 0) {
        resultsDiv.innerHTML = `<div class="empty-notice">${i18n[currentLang].noRecords}</div>`;
        return;
    }
    resultsDiv.innerHTML = items.map(item => isMeter ? generateMeterCardHTML(item) : generateCardHTML(item)).join('');
}

function renderFavorites() {
    if (favorites.length === 0) {
        favoritesList.innerHTML = `<div class="empty-notice">${i18n[currentLang].noFavs}</div>`;
        return;
    }
    
    let html = '';
    if (currentTab === 'offstreet') {
        const favOffstreet = cachedAllParks.filter(park => favorites.includes(park.park_Id));
        favOffstreet.forEach(p => html += generateCardHTML(p));
    } else {
        const favMeters = cachedAllMeters.filter(meter => favorites.includes(meter.park_Id));
        favMeters.forEach(m => html += generateMeterCardHTML(m));
    }
    
    favoritesList.innerHTML = html ? html : `<div class="empty-notice">${i18n[currentLang].noFavs}</div>`;
}

async function silentFetchData() {
    try {
        const infoUrl = `https://api.data.gov.hk/v1/carpark-info-vacancy?data=info&lang=${currentLang}`;
        const vacancyUrl = `https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&lang=${currentLang}`;
        const [infoRes, vacancyRes] = await Promise.all([fetch(infoUrl), fetch(vacancyUrl)]);
        if (infoRes.ok && vacancyRes.ok) {
            const infoData = await infoRes.json();
            const vacancyData = await vacancyRes.json();
            const vacancyMap = new Map();
            (vacancyData.results || []).forEach(v => vacancyMap.set(v.park_Id, v));
            cachedAllParks = (infoData.results || []).map(p => ({ ...p, distance: Infinity, liveInfo: vacancyMap.get(p.park_Id) }));
            renderFavorites();
        }
    } catch (e) {}
}

langSelect.addEventListener('change', async (e) => {
    currentLang = e.target.value;
    updateUIStaticText();
    if (userCoordinates) await refreshActiveTabData(false);
    else if (cachedAllParks.length > 0 || cachedAllMeters.length > 0) renderFavorites();
});

updateUIStaticText();
