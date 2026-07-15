// === 全局狀態宣告 ===
let currentTab = 'offstreet';
let userCoordinates = null;
let cachedAllParks = [];
let cachedAllMeters = [];
let cachedAllToilets = [];
let favorites = JSON.parse(localStorage.getItem('hk_carpark_favs')) || [];
let searchHistory = JSON.parse(localStorage.getItem('hk_carpark_history')) || [];
let activeMeterFilter = 'all';
let activeDistanceFilter = '1';

let offstreetFilters = {
    hideFull: false,
    evOnly: false,
    sortByVacancy: false
};

// === DOM 節點獲取 ===
const uiTitle = document.getElementById('ui-title');
const tabOffStreet = document.getElementById('tabOffStreet');
const tabMetered = document.getElementById('tabMetered');
const tabToilet = document.getElementById('tabToilet');
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
const themeToggleBtn = document.getElementById('themeToggleBtn');
const searchToggleBtn = document.getElementById('searchToggleBtn');
const searchWrapper = document.getElementById('searchWrapper');
const backToTopBtn = document.getElementById('backToTopBtn');
const stickyHeader = document.querySelector('.sticky-header-wrapper');

// === SVG 圖標常數 ===
const svgGps = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 19-9-9 19-2-8-8-2z"/></svg>`;
const svgStarOutline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const svgStarFilled = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff9f43" stroke="#ff9f43" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const svgRefresh = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;
const svgSearch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const svgClose = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const svgArrowUp = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;

const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

// === 主題切換與靜態文字更新 ===
function initTheme() {
    const savedTheme = localStorage.getItem('hk_carpark_theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleBtn.innerHTML = sunIcon;
    } else {
        document.body.classList.remove('dark-theme');
        themeToggleBtn.innerHTML = moonIcon;
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    if (isDark) {
        localStorage.setItem('hk_carpark_theme', 'dark');
        themeToggleBtn.innerHTML = sunIcon;
    } else {
        localStorage.setItem('hk_carpark_theme', 'light');
        themeToggleBtn.innerHTML = moonIcon;
    }
}

function updateUIStaticText() {
    uiTitle.textContent = t.title;
    locateBtn.innerHTML = svgGps;
    locateBtn.title = t.btnText || "GPS 定位";
    locateBtn.setAttribute('aria-label', t.btnText || "GPS 定位");
    refreshBtn.innerHTML = svgRefresh;
    refreshBtn.title = t.refreshBtnText || "更新數據";
    refreshBtn.setAttribute('aria-label', t.refreshBtnText || "更新數據");
    showFavBtn.innerHTML = favWrapper.style.display === 'none' ? svgStarOutline : svgStarFilled;
    showFavBtn.title = favWrapper.style.display === 'none' ? (t.btnFavShow || "顯示收藏") : (t.btnFavHide || "隱藏收藏");
    showFavBtn.setAttribute('aria-label', favWrapper.style.display === 'none' ? (t.btnFavShow || "顯示收藏") : (t.btnFavHide || "隱藏收藏"));
    const isOpen = searchWrapper.classList.contains('open');
    searchToggleBtn.innerHTML = isOpen ? svgClose : svgSearch;
    searchToggleBtn.title = isOpen ? "關閉搜尋" : "展開搜尋";
    searchToggleBtn.setAttribute('aria-label', isOpen ? "關閉搜尋" : "展開搜尋");

    uiFavTitle.textContent = t.favTitle;
    uiSearchTitle.textContent = t.searchTitle;
    tabOffStreet.textContent = t.tabOffStreet;
    tabMetered.textContent = t.tabMetered;
    if (tabToilet) tabToilet.textContent = t.tabToilet || "公廁";

    searchInput.placeholder = t.searchPlaceholder;
    searchBtn.textContent = t.searchBtnText;
    clearHistoryBtn.textContent = t.clearBtnText;
    renderFilterPills();
}

function renderFilterPills() {
    if (!userCoordinates) {
        filterContainer.style.display = 'none';
        return;
    }
    filterContainer.style.display = 'flex';
    let distHTML = `
        <div class="filter-row">
            <button class="pill-btn color-blue ${activeDistanceFilter === '0.5' ? 'active' : ''}" onclick="setDistanceFilter('0.5')">${t.dist500m}</button>
            <button class="pill-btn color-blue ${activeDistanceFilter === '1' ? 'active' : ''}" onclick="setDistanceFilter('1')">${t.dist1km}</button>
            <button class="pill-btn color-blue ${activeDistanceFilter === '2' ? 'active' : ''}" onclick="setDistanceFilter('2')">${t.dist2km}</button>
            <button class="pill-btn color-blue ${activeDistanceFilter === 'all' ? 'active' : ''}" onclick="setDistanceFilter('all')">${t.distAll}</button>
        </div>
    `;
    let statusHTML = '';
    if (currentTab === 'offstreet') {
        statusHTML = `
            <div class="filter-row">
                <button class="pill-btn color-red ${offstreetFilters.hideFull ? 'active' : ''}" onclick="toggleOffstreetFilter('hideFull')">${t.optHideFull}</button>
                <button class="pill-btn color-green ${offstreetFilters.evOnly ? 'active' : ''}" onclick="toggleOffstreetFilter('evOnly')">${t.optEVOnly}</button>
                <button class="pill-btn color-blue ${offstreetFilters.sortByVacancy ? 'active' : ''}" onclick="toggleOffstreetFilter('sortByVacancy')">${t.optSortVacancy}</button>
            </div>
        `;
    } else if (currentTab === 'metered') {
        statusHTML = `
            <div class="filter-row">
                <button class="pill-btn color-blue ${activeMeterFilter === 'all' ? 'active' : ''}" onclick="setMeterFilter('all')">${t.optAll}</button>
                <button class="pill-btn color-green ${activeMeterFilter === 'vacant' ? 'active' : ''}" onclick="setMeterFilter('vacant')">${t.optVacant}</button>
                <button class="pill-btn color-red ${activeMeterFilter === 'occupied' ? 'active' : ''}" onclick="setMeterFilter('occupied')">${t.optOccupied}</button>
            </div>
        `;
    }
    filterContainer.innerHTML = distHTML + statusHTML;
}

// === 分頁路由控制 ===
async function switchTab(tabName) {
    currentTab = tabName;
    tabOffStreet.classList.remove('active');
    tabMetered.classList.remove('active');
    if (tabToilet) tabToilet.classList.remove('active');

    if (currentTab === 'offstreet') {
        tabOffStreet.classList.add('active');
    } else if (currentTab === 'metered') {
        tabMetered.classList.add('active');
    } else if (currentTab === 'toilet') {
        if (tabToilet) tabToilet.classList.add('active');
    }
    renderFilterPills();
    renderFavorites();
    await renderActiveTabDisplay();
}

// 路由分流渲染
async function renderActiveTabDisplay() {
    if (!userCoordinates) return;
    if (currentTab === 'offstreet') {
        if (typeof renderOffstreetDisplay === 'function') {
            await renderOffstreetDisplay();
        }
    } else if (currentTab === 'metered') {
        if (typeof renderMeteredDisplay === 'function') {
            await renderMeteredDisplay();
        }
    } else if (currentTab === 'toilet') {
        if (typeof renderToiletDisplay === 'function') {
            await renderToiletDisplay();
        }
    }
}

// 路由分流收藏夾
function renderFavorites() {
    if (favorites.length === 0) {
        favoritesList.innerHTML = `<div class="empty-notice">${t.noFavs}</div>`;
        return;
    }
    let html = '';
    if (currentTab === 'offstreet' && typeof getOffstreetFavHTML === 'function') {
        html = getOffstreetFavHTML();
    } else if (currentTab === 'metered' && typeof getMeteredFavHTML === 'function') {
        html = getMeteredFavHTML();
    } else if (currentTab === 'toilet' && typeof getToiletFavHTML === 'function') {
        html = getToiletFavHTML();
    }
    favoritesList.innerHTML = html ? html : `<div class="empty-notice">${t.noFavs}</div>`;
}

// === 過濾器與測距輔助工具 ===
function setMeterFilter(filterValue) {
    activeMeterFilter = filterValue;
    renderFilterPills();
    renderActiveTabDisplay();
}

function setDistanceFilter(distanceValue) {
    activeDistanceFilter = distanceValue;
    renderFilterPills();
    renderActiveTabDisplay();
}

function toggleOffstreetFilter(filterName) {
    offstreetFilters[filterName] = !offstreetFilters[filterName];
    renderFilterPills();
    renderActiveTabDisplay();
}

function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// === 搜尋歷史功能 ===
function renderSearchHistory() {
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
    const inputVal = typeof forcedQuery === 'string' ? forcedQuery : searchInput.value.trim();
    if (!inputVal) return;

    const lookupKey = inputVal.toLowerCase().replace(/\s+/g, '');
    let query = inputVal;
    if (synonymMap[lookupKey]) {
        query = synonymMap[lookupKey];
    }

    if (typeof forcedQuery === 'string') {
        searchInput.value = inputVal;
    }

    statusText.textContent = t.addressSearching;
    resultsDiv.innerHTML = "";
    locateBtn.disabled = true;
    searchBtn.disabled = true;
    refreshBtn.disabled = true;

    try {
        const searchUrl = `https://www.als.gov.hk/lookup?q=${encodeURIComponent(query)}`;
        const responseText = await fetchTextThroughProxy(searchUrl, true);
        let latMatch = responseText.match(/"Latitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Latitude>([0-9.]+)<\/Latitude>/i);
        let lngMatch = responseText.match(/"Longitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Longitude>([0-9.]+)<\/Longitude>/i);

        let lat = null;
        let lng = null;

        if (latMatch && lngMatch) {
            lat = parseFloat(latMatch[1]);
            lng = parseFloat(lngMatch[1]);
        } else {
            const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
            const photonRes = await fetch(photonUrl);
            const photonData = await photonRes.json();
            if (photonData.features && photonData.features.length > 0) {
                const coordinates = photonData.features[0].geometry.coordinates;
                lng = coordinates[0];
                lat = coordinates[1];
            }
        }

        if (lat && lng) {
            userCoordinates = { lat, lng };
            saveSearch(inputVal);
            renderFilterPills();
            searchWrapper.classList.remove('open');
            searchToggleBtn.innerHTML = svgSearch;
            await refreshActiveTabData(false);
            if (document.activeElement) document.activeElement.blur();
        } else {
            statusText.textContent = t.addressError;
        }
    } catch (err) {
        statusText.textContent = t.addressError;
        console.error("Address lookup error:", err);
    } finally {
        locateBtn.disabled = false;
        searchBtn.disabled = false;
        refreshBtn.disabled = false;
    }
}

// === 事件監聽與 API 請求路由器 ===
searchToggleBtn.addEventListener('click', () => {
    searchWrapper.classList.toggle('open');
    const isOpen = searchWrapper.classList.contains('open');
    searchToggleBtn.innerHTML = isOpen ? svgClose : svgSearch;
    if (isOpen) {
        searchInput.focus();
    }
});

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
        statusText.textContent = t.noSupport;
        return;
    }
    locateBtn.disabled = true;
    refreshBtn.disabled = true;
    statusText.textContent = t.gpsLocating;
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
            statusText.textContent = "定位未開啟，已顯示九龍中心數據";
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
        statusText.textContent = t.apiFetching;
        locateBtn.disabled = true;
        refreshBtn.disabled = true;
    }
    try {
        if (currentTab === 'offstreet') {
            await fetchCarParks(userCoordinates.lat, userCoordinates.lng);
        } else if (currentTab === 'metered') {
            await fetchMeteredParking(userCoordinates.lat, userCoordinates.lng);
        } else if (currentTab === 'toilet') {
            if (typeof fetchToilets === 'function') {
                await fetchToilets(userCoordinates.lat, userCoordinates.lng);
            }
        }
    } catch (err) {
        if (!isBackgroundRefresh) {
            statusText.textContent = `${t.apiError}${err.message}`;
        }
        console.error("Data processing error log:", err);
    } finally {
        if (!isBackgroundRefresh) {
            locateBtn.disabled = false;
            refreshBtn.disabled = false;
        }
    }
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

function displayResults(items, isMeter = false) {
    statusText.textContent = "";
    uiSearchTitle.textContent = `${t.searchTitle} (${items.length})`;
    if (items.length === 0) {
        resultsDiv.innerHTML = `<div class="empty-notice">${t.noRecords}</div>`;
        return;
    }
    resultsDiv.innerHTML = items.map(item => isMeter ? generateMeterCardHTML(item) : generateCardHTML(item)).join('');
}

function renderWelcomeMessage() {
    resultsDiv.innerHTML = `
        <div class="welcome-box">
            <h3>${t.welcomeTitle}</h3>
            <p>${t.welcomeDesc}</p>
        </div>
    `;
}

// === 回到頂部 ===
backToTopBtn.innerHTML = svgArrowUp;

window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        stickyHeader.classList.add('scrolled');
    } else {
        stickyHeader.classList.remove('scrolled');
    }

    if (window.scrollY > 300) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// === 初始化啟動 ===
initTheme();
updateUIStaticText();
renderSearchHistory();
renderWelcomeMessage();
