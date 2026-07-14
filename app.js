const i18n = {
    zh_TW: {
        title: "最近的香港停車場",
        btnText: "GPS 定位",
        btnFavShow: "我的收藏",
        btnFavHide: "隱藏收藏",
        favTitle: "我的收藏夾",
        searchTitle: "搜尋結果",
        tabOffStreet: "室內停車場",
        tabMetered: "路邊咪錶位",
        gpsLocating: "正在獲取您的位置...",
        apiFetching: "正在讀取停車場數據...",
        addressSearching: "正在搜尋該地址...",
        addressError: "找不到該地址，請嘗試輸入其他關鍵字。",
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
        addFav: "收藏",
        removeFav: "取消收藏",
        optAll: "全部",
        optHideFull: "隱藏已滿車位",
        optEVOnly: "僅顯示充電位",
        optVacant: "僅顯示空置",
        optOccupied: "僅顯示使用中",
        searchPlaceholder: "搜尋香港地址、大廈、商場或街道...",
        searchBtnText: "搜尋",
        clearBtnText: "清除",
        evBadge: "設有充電設備",
        refreshBtnText: "更新數據"
    },
    en_US: {
        title: "Nearest HK Car Parks",
        btnText: "GPS Locate",
        btnFavShow: "Favorites",
        btnFavHide: "Hide Favs",
        favTitle: "My Favorites",
        searchTitle: "Search Results",
        tabOffStreet: "Off-Street Lots",
        tabMetered: "On-Street Meters",
        gpsLocating: "Acquiring location...",
        apiFetching: "Fetching car park data...",
        addressSearching: "Searching address...",
        addressError: "Address not found. Please try other keywords.",
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
        addFav: "Favorite",
        removeFav: "Unfavorite",
        optAll: "All",
        optHideFull: "Hide Full Lots",
        optEVOnly: "EV Charging Only",
        optVacant: "Vacant Only",
        optOccupied: "Occupied Only",
        searchPlaceholder: "Search HK address, building, mall, or street...",
        searchBtnText: "Search",
        clearBtnText: "Clear",
        evBadge: "EV Charger",
        refreshBtnText: "Refresh"
    }
};

let currentLang = 'zh_TW';
let currentTab = 'offstreet';
let userCoordinates = null;
let cachedAllParks = [];
let cachedAllMeters = [];
let favorites = JSON.parse(localStorage.getItem('hk_carpark_favs')) || [];
let searchHistory = JSON.parse(localStorage.getItem('hk_carpark_history')) || [];
let activeMeterFilter = 'all';

let offstreetFilters = {
    hideFull: false,
    evOnly: false
};

const langSelect = document.getElementById('langSelect');
const uiTitle = document.getElementById('ui-title');
const tabOffStreet = document.getElementById('tabOffStreet');
const tabMetered = document.getElementById('tabMetered');
const locateBtn = document.getElementById('locateBtn');
const showFavBtn = document.getElementById('showFavBtn');
const refreshBtn = document.getElementById('refreshBtn');
const statusText = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const favoritesList = document.getElementById('favoritesList');
const favWrapper = document.getElementById('fav-wrapper');
const uiFavTitle = document.getElementById('ui-fav-title');
const uiSearchTitle = document.getElementById('ui-search-title');
const filterContainer = document.getElementById('filter-container');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function updateUIStaticText() {
    uiTitle.textContent = i18n[currentLang].title;
    locateBtn.textContent = i18n[currentLang].btnText;
    refreshBtn.textContent = i18n[currentLang].refreshBtnText;
    uiFavTitle.textContent = i18n[currentLang].favTitle;
    uiSearchTitle.textContent = i18n[currentLang].searchTitle;
    tabOffStreet.textContent = i18n[currentLang].tabOffStreet;
    tabMetered.textContent = i18n[currentLang].tabMetered;
    showFavBtn.textContent = favWrapper.style.display === 'none' ? i18n[currentLang].btnFavShow : i18n[currentLang].btnFavHide;
    
    searchInput.placeholder = i18n[currentLang].searchPlaceholder;
    searchBtn.textContent = i18n[currentLang].searchBtnText;
    clearHistoryBtn.textContent = i18n[currentLang].clearBtnText;
    
    renderFilterPills();
}

function renderFilterPills() {
    if (!userCoordinates) {
        filterContainer.style.display = 'none';
        return;
    }
    filterContainer.style.display = 'flex';
    
    if (currentTab === 'offstreet') {
        filterContainer.innerHTML = `
            <button class="pill-btn color-red ${offstreetFilters.hideFull ? 'active' : ''}" onclick="toggleOffstreetFilter('hideFull')">${i18n[currentLang].optHideFull}</button>
            <button class="pill-btn color-green ${offstreetFilters.evOnly ? 'active' : ''}" onclick="toggleOffstreetFilter('evOnly')">${i18n[currentLang].optEVOnly}</button>
        `;
    } else {
        filterContainer.innerHTML = `
            <button class="pill-btn color-blue ${activeMeterFilter === 'all' ? 'active' : ''}" onclick="setMeterFilter('all')">${i18n[currentLang].optAll}</button>
            <button class="pill-btn color-green ${activeMeterFilter === 'vacant' ? 'active' : ''}" onclick="setMeterFilter('vacant')">${i18n[currentLang].optVacant}</button>
            <button class="pill-btn color-red ${activeMeterFilter === 'occupied' ? 'active' : ''}" onclick="setMeterFilter('occupied')">${i18n[currentLang].optOccupied}</button>
        `;
    }
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
    renderFilterPills();
    renderFavorites();
    await renderActiveTabDisplay();
}

function toggleOffstreetFilter(filterName) {
    offstreetFilters[filterName] = !offstreetFilters[filterName];
    renderFilterPills();
    renderActiveTabDisplay();
}

function setMeterFilter(filterValue) {
    activeMeterFilter = filterValue;
    renderFilterPills();
    renderActiveTabDisplay();
}

function hasEVCharging(park) {
    const evKeywords = ['EV', 'ELECTRIC', '充電', '充电', 'CHARG'];
    
    if (park.facilities && Array.isArray(park.facilities)) {
        if (park.facilities.some(f => evKeywords.some(kw => String(f).toUpperCase().includes(kw)))) {
            return true;
        }
    }
    if (park.carpark_Type && evKeywords.some(kw => String(park.carpark_Type).toUpperCase().includes(kw))) {
        return true;
    }
    const searchString = JSON.stringify(park).toUpperCase();
    return evKeywords.some(kw => searchString.includes(kw));
}

async function renderActiveTabDisplay() {
    if (!userCoordinates) return;
    if (currentTab === 'offstreet') {
        if (cachedAllParks.length > 0) {
            let filteredParks = cachedAllParks;
            if (offstreetFilters.hideFull) {
                filteredParks = filteredParks.filter(p => {
                    if (p.liveInfo && p.liveInfo.privateCar && p.liveInfo.privateCar.length > 0) {
                        const count = p.liveInfo.privateCar[0].vacancy;
                        return count === undefined || count === null || count > 0;
                    }
                    return true; 
                });
            }
            if (offstreetFilters.evOnly) {
                filteredParks = filteredParks.filter(p => hasEVCharging(p));
            }
            displayResults(filteredParks.slice(0, 30), false);
        } else {
            await refreshActiveTabData(false);
        }
    } else {
        if (cachedAllMeters.length > 0) {
            let filteredMeters = cachedAllMeters;
            if (activeMeterFilter === 'vacant') {
                filteredMeters = cachedAllMeters.filter(m => m.vacancyStatus === 'V');
            } else if (activeMeterFilter === 'occupied') {
                filteredMeters = cachedAllMeters.filter(m => m.vacancyStatus !== 'V');
            }
            displayResults(filteredMeters.slice(0, 30), true);
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

async function fetchTextThroughProxy(rawUrl, useJSONHeader = false) {
    const fetchOptions = useJSONHeader ? { headers: { 'Accept': 'application/json' } } : {};

    try {
        const res = await fetch(rawUrl, fetchOptions);
        if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 20) return text;
        }
    } catch (e) {
        console.warn("Direct native request failed, applying proxies.");
    }

    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;
        const res = await fetch(proxyUrl, fetchOptions);
        if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 20) return text;
        }
    } catch (e) {
        console.warn("Proxy A (corsproxy.io) failed, trying fallback.");
    }

    try {
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rawUrl)}`;
        const res = await fetch(proxyUrl, fetchOptions);
        if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 20) return text;
        }
    } catch (e) {
        console.warn("Proxy B (codetabs) failed, trying fallback.");
    }

    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rawUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const data = await res.json();
            if (data && data.contents && data.contents.trim().length > 20) return data.contents;
        }
    } catch (e) {
        console.error("All proxies failed.");
    }

    throw new Error("Unable to fetch data through proxy connections.");
}

function renderSearchHistory() {
    const historyWrapper = document.getElementById('history-wrapper');
    const historyChips = document.getElementById('historyChips');
    
    if (searchHistory.length === 0) {
        historyWrapper.style.display = 'none';
        return;
    }
    
    historyWrapper.style.display = 'flex';
    historyChips.innerHTML = searchHistory.map(item => {
        const escapedItem = item.replace(/'/g, "\\'");
        return `<button class="history-chip" onclick="triggerAddressSearch('${escapedItem}')">${item}</button>`;
    }).join('');
}

function saveSearch(query) {
    searchHistory = searchHistory.filter(item => item.toLowerCase() !== query.toLowerCase());
    searchHistory.unshift(query);
    if (searchHistory.length > 5) {
        searchHistory = searchHistory.slice(0, 5);
    }
    localStorage.setItem('hk_carpark_history', JSON.stringify(searchHistory));
    renderSearchHistory();
}

async function triggerAddressSearch(forcedQuery = null) {
    const query = typeof forcedQuery === 'string' ? forcedQuery : searchInput.value.trim();
    if (!query) return;

    if (typeof forcedQuery === 'string') {
        searchInput.value = query;
    }

    statusText.textContent = i18n[currentLang].addressSearching;
    resultsDiv.innerHTML = "";
    locateBtn.disabled = true;
    searchBtn.disabled = true;
    refreshBtn.disabled = true;

    try {
        const searchUrl = `https://www.als.gov.hk/lookup?q=${encodeURIComponent(query)}`;
        const responseText = await fetchTextThroughProxy(searchUrl, true);
        
        const latMatch = responseText.match(/"Latitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Latitude>([0-9.]+)<\/Latitude>/i);
        const lngMatch = responseText.match(/"Longitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Longitude>([0-9.]+)<\/Longitude>/i);

        if (latMatch && lngMatch) {
            const lat = parseFloat(latMatch[1]);
            const lng = parseFloat(lngMatch[1]);
            userCoordinates = { lat, lng };
            
            saveSearch(query);
            renderFilterPills();
            statusText.textContent = currentLang === 'zh_TW' ? `已定位至搜尋地點: ${query}` : `Positioned to searched place: ${query}`;
            await refreshActiveTabData(false);
        } else {
            statusText.textContent = i18n[currentLang].addressError;
        }
    } catch (err) {
        statusText.textContent = i18n[currentLang].addressError;
        console.error("Address lookup error:", err);
    } finally {
        locateBtn.disabled = false;
        searchBtn.disabled = false;
        refreshBtn.disabled = false;
    }
}

searchBtn.addEventListener('click', () => triggerAddressSearch());
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        triggerAddressSearch();
    }
});

clearHistoryBtn.addEventListener('click', () => {
    searchHistory = [];
    localStorage.removeItem('hk_carpark_history');
    renderSearchHistory();
});

locateBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        statusText.textContent = i18n[currentLang].noSupport;
        return;
    }
    locateBtn.disabled = true;
    refreshBtn.disabled = true;
    statusText.textContent = i18n[currentLang].gpsLocating;
    resultsDiv.innerHTML = "";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            userCoordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
            renderFilterPills();
            await refreshActiveTabData(false);
        },
        async (error) => {
            console.warn("GPS tracking failed, falling back to Kowloon center coordinates.", error);
            userCoordinates = { lat: 22.3193, lng: 114.1694 };
            renderFilterPills();
            statusText.textContent = currentLang === 'zh_TW' ? "定位未開啟，已顯示九龍中心數據" : "GPS failed, displaying Kowloon defaults.";
            await refreshActiveTabData(false);
        },
        { enableHighAccuracy: true }
    );
});

refreshBtn.addEventListener('click', async () => {
    if (!userCoordinates) {
        locateBtn.click();
    } else {
        await refreshActiveTabData(false);
    }
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
        refreshBtn.disabled = true;
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
            refreshBtn.disabled = false;
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

    let filteredParks = cachedAllParks;
    if (offstreetFilters.hideFull) {
        filteredParks = cachedAllParks.filter(p => {
            if (p.liveInfo && p.liveInfo.privateCar && p.liveInfo.privateCar.length > 0) {
                const count = p.liveInfo.privateCar[0].vacancy;
                return count === undefined || count === null || count > 0;
            }
            return true;
        });
    }
    if (offstreetFilters.evOnly) {
        filteredParks = filteredParks.filter(p => hasEVCharging(p));
    }

    displayResults(filteredParks.slice(0, 30), false);
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
    
    let filteredMeters = cachedAllMeters;
    if (activeMeterFilter === 'vacant') {
        filteredMeters = cachedAllMeters.filter(m => m.vacancyStatus === 'V');
    } else if (activeMeterFilter === 'occupied') {
        filteredMeters = cachedAllMeters.filter(m => m.vacancyStatus !== 'V');
    }
    
    displayResults(filteredMeters.slice(0, 30), true);
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
    let cardStatusClass = 'status-unknown';
    let boxStatusClass = '';
    let vacancyNumClass = '';

    if (park.liveInfo && park.liveInfo.privateCar && park.liveInfo.privateCar.length > 0) {
        const count = park.liveInfo.privateCar[0].vacancy;
        if (count !== undefined && count !== null && count >= 0) {
            if (count >= 10) {
                cardStatusClass = 'status-high';
                boxStatusClass = 'available';
                vacancyNumClass = '';
            } else if (count > 0) {
                cardStatusClass = 'status-medium';
                boxStatusClass = 'moderate';
                vacancyNumClass = 'medium';
            } else {
                cardStatusClass = 'status-empty';
                boxStatusClass = 'full';
                vacancyNumClass = 'none';
            }
            vacancyHTML = `
                <div class="vacancy-box ${boxStatusClass}">
                    <strong>${t.liveVacancy}:</strong> 
                    <span class="vacancy-num ${vacancyNumClass}">${count}</span> ${t.spaces}
                </div>`;
        }
    }

    let contactHTML = park.contactNo ? `<a href="tel:${park.contactNo.replace(/\s+/g, '')}" class="phone-link">${park.contactNo}</a>` : '';
    
    let distWarningHTML = park.distance > 5 ? `<span class="distance-warning">${t.distWarning}</span>` : '';
    const distHTML = park.distance !== Infinity ? `<span class="distance">${park.distance.toFixed(2)} ${t.away}</span>${distWarningHTML}` : '';

    const hasEV = hasEVCharging(park);
    const evBadgeHTML = hasEV ? `<span class="status-badge ev-charger">${t.evBadge}</span>` : '';

    let infoGridItems = '';
    if (displayAddress) infoGridItems += `<div class="info-label">${t.address}:</div><div><a href="${mapUrl}" target="_blank" class="map-link">${displayAddress}</a></div>`;
    if (park.district) infoGridItems += `<div class="info-label">${t.district}:</div><div>${park.district}</div>`;
    if (park.carpark_Type) infoGridItems += `<div class="info-label">${currentLang === 'zh_TW' ? '類型' : 'Type'}:</div><div>${park.carpark_Type}</div>`;
    if (heightText) infoGridItems += `<div class="info-label">${t.maxHeight}:</div><div>${heightText}</div>`;
    if (contactHTML) infoGridItems += `<div class="info-label">${t.contact}:</div><div>${contactHTML}</div>`;

    return `
        <div class="carpark-card ${cardStatusClass}">
            <div class="card-header">
                <div class="carpark-name">${park.name || '---'}</div>
                <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${park.park_Id}')">${isFav ? t.removeFav : t.addFav}</button>
            </div>
            <div class="tags-row">${distHTML} ${evBadgeHTML}</div>
            ${infoGridItems ? `<div class="info-grid">${infoGridItems}</div>` : ''}
            ${vacancyHTML}
        </div>`;
}

function generateMeterCardHTML(meter) {
    const t = i18n[currentLang];
    const isFav = favorites.includes(meter.park_Id);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meter.address)}`;
    const isVacant = meter.vacancyStatus === 'V';
    const statusLabel = isVacant ? (currentLang === 'zh_TW' ? '空置' : 'Vacant') : (currentLang === 'zh_TW' ? '使用中' : 'Occupied');
    const cardStatusClass = isVacant ? 'status-high' : 'status-empty';

    let distWarningHTML = meter.distance > 5 ? `<span class="distance-warning">${t.distWarning}</span>` : '';
    const distHTML = meter.distance !== Infinity ? `<span class="distance">${meter.distance.toFixed(2)} ${t.away}</span>${distWarningHTML}` : '';

    return `
        <div class="carpark-card ${cardStatusClass}">
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
renderSearchHistory();
