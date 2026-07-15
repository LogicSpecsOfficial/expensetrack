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

// SVG 圖標代碼
const svgGps = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 19-9-9 19-2-8-8-2z"/></svg>`;
const svgStarOutline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const svgStarFilled = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff9f43" stroke="#ff9f43" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const svgRefresh = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;
const svgSearch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const svgClose = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const svgArrowUp = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;

const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

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

function setDistanceFilter(distanceValue) {
    activeDistanceFilter = distanceValue;
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

function getVacancyCount(park) {
    if (park.liveInfo && park.liveInfo.privateCar && park.liveInfo.privateCar.length > 0) {
        const count = park.liveInfo.privateCar[0].vacancy;
        return (count !== undefined && count !== null && count >= 0) ? count : -1;
    }
    return -1;
}

function groupMeteredParking(meters) {
    const groups = {};
    meters.forEach(m => {
        const key = m.address;
        if (!groups[key]) {
            groups[key] = {
                park_Id: m.address,
                name: m.rawStreet,
                address: m.address,
                district: m.district,
                distance: m.distance,
                latitude: m.latitude,
                longitude: m.longitude,
                totalSpaces: 0,
                vacantSpaces: 0
            };
        }
        const g = groups[key];
        g.totalSpaces += 1;
        if (m.vacancyStatus === 'V') {
            g.vacantSpaces += 1;
        }
        if (m.distance < g.distance) {
            g.distance = m.distance;
            g.latitude = m.latitude;
            g.longitude = m.longitude;
        }
    });
    return Object.values(groups).sort((a, b) => a.distance - b.distance);
}

async function renderActiveTabDisplay() {
    if (!userCoordinates) return;
    if (currentTab === 'offstreet') {
        if (cachedAllParks.length > 0) {
            let filteredParks = [...cachedAllParks];
            if (activeDistanceFilter !== 'all') {
                const limit = parseFloat(activeDistanceFilter);
                filteredParks = filteredParks.filter(p => p.distance <= limit);
            }
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
            if (offstreetFilters.sortByVacancy) {
                filteredParks.sort((a, b) => {
                    const vacA = getVacancyCount(a);
                    const vacB = getVacancyCount(b);
                    if (vacA !== vacB) return vacB - vacA;
                    return a.distance - b.distance;
                });
            } else {
                filteredParks.sort((a, b) => a.distance - b.distance);
            }
            displayResults(filteredParks.slice(0, 30), false);
        } else {
            await refreshActiveTabData(false);
        }
    } else if (currentTab === 'metered') {
        if (cachedAllMeters.length > 0) {
            let groupedMeters = groupMeteredParking(cachedAllMeters);
            if (activeDistanceFilter !== 'all') {
                const limit = parseFloat(activeDistanceFilter);
                groupedMeters = groupedMeters.filter(m => m.distance <= limit);
            }
            if (activeMeterFilter === 'vacant') {
                groupedMeters = groupedMeters.filter(m => m.vacantSpaces > 0);
            } else if (activeMeterFilter === 'occupied') {
                groupedMeters = groupedMeters.filter(m => m.vacantSpaces === 0);
            }
            displayResults(groupedMeters.slice(0, 30), true);
        } else {
            await refreshActiveTabData(false);
        }
    } else if (currentTab === 'toilet') {
        if (cachedAllToilets.length > 0) {
            let filteredToilets = [...cachedAllToilets];
            if (activeDistanceFilter !== 'all') {
                const limit = parseFloat(activeDistanceFilter);
                filteredToilets = filteredToilets.filter(item => item.distance <= limit);
            }
            filteredToilets.sort((a, b) => a.distance - b.distance);
            displayToiletResults(filteredToilets.slice(0, 30));
        } else {
            await refreshActiveTabData(false);
        }
    }
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
            await fetchToilets(userCoordinates.lat, userCoordinates.lng);
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

function generateCardHTML(park) {
    const isFav = favorites.includes(park.park_Id);
    let displayAddress = park.displayAddress || (park.address && park.address.displayAddress) || '';
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress + " " + (park.name || ''))}`;

    let heightText = (park.heightRestrictions || []).map(h => h.height ? `${h.height}m` : '').filter(Boolean).join(', ');
    let cardStatusClass = 'status-unknown';
    let boxStatusClass = '';
    let vacancyNumClass = '';
    let dotClass = 'dot-grey';
    let vacancyHTML = `
        <div class="vacancy-badge unknown">
            <span class="vacancy-num">--</span>
            <span class="vacancy-label">${t.noVacancyData}</span>
        </div>`;

    if (park.liveInfo && park.liveInfo.privateCar && park.liveInfo.privateCar.length > 0) {
        const count = park.liveInfo.privateCar[0].vacancy;
        if (count !== undefined && count !== null && count >= 0) {
            if (count >= 10) {
                cardStatusClass = 'status-high';
                boxStatusClass = 'available';
                vacancyNumClass = '';
                dotClass = 'dot-green';
            } else if (count > 0) {
                cardStatusClass = 'status-medium';
                boxStatusClass = 'moderate';
                vacancyNumClass = 'medium';
                dotClass = 'dot-orange';
            } else {
                cardStatusClass = 'status-empty';
                boxStatusClass = 'full';
                vacancyNumClass = 'none';
                dotClass = 'dot-red';
            }
            vacancyHTML = `
                <div class="vacancy-badge ${boxStatusClass}">
                    <span class="vacancy-num ${vacancyNumClass}">${count}</span>
                    <span class="vacancy-label">${t.spaces}</span>
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
    if (park.carpark_Type) infoGridItems += `<div class="info-label">類型:</div><div>${park.carpark_Type}</div>`;
    if (heightText) infoGridItems += `<div class="info-label">${t.maxHeight}:</div><div>${heightText}</div>`;
    if (contactHTML) infoGridItems += `<div class="info-label">${t.contact}:</div><div>${contactHTML}</div>`;

    return `
        <div class="carpark-card ${cardStatusClass}">
            <div class="card-body-split">
                <div class="card-left">
                    <div class="carpark-name">
                        <span class="status-dot ${dotClass}"></span>
                        ${park.name || '---'}
                    </div>
                    <div class="tags-row">${distHTML} ${evBadgeHTML}</div>
                    ${infoGridItems ? `<div class="info-grid">${infoGridItems}</div>` : ''}
                </div>
                <div class="card-right">
                    <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${park.park_Id}')">${isFav ? t.removeFav : t.addFav}</button>
                    ${vacancyHTML}
                </div>
            </div>
        </div>`;
}

function generateMeterCardHTML(meterGroup) {
    const isFav = favorites.includes(meterGroup.park_Id);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meterGroup.address)}`;
    const vacantCount = meterGroup.vacantSpaces;
    const totalCount = meterGroup.totalSpaces;
    const isAnyVacant = vacantCount > 0;
    const cardStatusClass = isAnyVacant ? 'status-high' : 'status-empty';
    const boxStatusClass = isAnyVacant ? 'available' : 'full';
    const dotClass = isAnyVacant ? 'dot-green' : 'dot-red';

    let distWarningHTML = meterGroup.distance > 5 ? `<span class="distance-warning">${t.distWarning}</span>` : '';
    const distHTML = meterGroup.distance !== Infinity ? `<span class="distance">${meterGroup.distance.toFixed(2)} ${t.away}</span>${distWarningHTML}` : '';

    const vacancyLabel = `${vacantCount}/${totalCount}`;

    return `
        <div class="carpark-card ${cardStatusClass}">
            <div class="card-body-split">
                <div class="card-left">
                    <div class="carpark-name">
                        <span class="status-dot ${dotClass}"></span>
                        ${meterGroup.name}
                    </div>
                    <div class="tags-row">${distHTML}</div>
                    <div class="info-grid">
                        <div class="info-label">${t.address}:</div><div><a href="${mapUrl}" target="_blank" class="map-link">${meterGroup.address}</a></div>
                        <div class="info-label">${t.district}:</div><div>${meterGroup.district || '---'}</div>
                    </div>
                </div>
                <div class="card-right">
                    <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${meterGroup.park_Id}')">${isFav ? t.removeFav : t.addFav}</button>
                    <div class="vacancy-badge ${boxStatusClass}">
                        <span class="vacancy-num ${!isAnyVacant ? 'none' : ''}">${vacancyLabel}</span>
                        <span class="vacancy-label">${t.vacantMeters}</span>
                    </div>
                </div>
            </div>
        </div>`;
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

function renderFavorites() {
    if (favorites.length === 0) {
        favoritesList.innerHTML = `<div class="empty-notice">${t.noFavs}</div>`;
        return;
    }
    let html = '';
    if (currentTab === 'offstreet') {
        const favOffstreet = cachedAllParks.filter(park => favorites.includes(park.park_Id));
        favOffstreet.forEach(p => html += generateCardHTML(p));
    } else if (currentTab === 'metered') {
        const groupedMeters = groupMeteredParking(cachedAllMeters);
        const favMeters = groupedMeters.filter(meterGroup => favorites.includes(meterGroup.park_Id));
        favMeters.forEach(m => html += generateMeterCardHTML(m));
    } else if (currentTab === 'toilet') {
        const favToilets = cachedAllToilets.filter(toilet => favorites.includes(toilet.park_Id));
        favToilets.forEach(toilet => html += generateToiletCardHTML(toilet));
    }
    favoritesList.innerHTML = html ? html : `<div class="empty-notice">${t.noFavs}</div>`;
}

function renderWelcomeMessage() {
    resultsDiv.innerHTML = `
        <div class="welcome-box">
            <h3>${t.welcomeTitle}</h3>
            <p>${t.welcomeDesc}</p>
        </div>
    `;
}

// === 下方為新增的公廁 API 抓取、解析、測量與渲染邏輯 ===

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

async function fetchToilets(lat, lng) {
    const targetUrl = '/api/toilet-xml';
    const response = await fetch(targetUrl);
    if (!response.ok) {
        throw new Error("無法連接公廁伺服器 (狀態碼: " + response.status + ")");
    }
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    if (xmlDoc.querySelector('parsererror')) {
        throw new Error("XML 語法解析失敗");
    }

    const mapNodes = xmlDoc.getElementsByTagName('map');
    const tempToilets = [];

    for (let i = 0; i < mapNodes.length; i++) {
        const node = mapNodes[i];
        
        const type = node.querySelector('type')?.textContent || '';
        const name = node.querySelector('name_c')?.textContent || '';
        const address = node.querySelector('address_c')?.textContent || '';
        const coordinateText = node.querySelector('map_coordinate')?.textContent || '';

        const isToiletByName = name.includes('公廁') || name.includes('廁所') || name.toLowerCase().includes('toilet');

        if (type === '1' || type === '2' || isToiletByName) {
            let tLat = 0;
            let tLng = 0;

            if (coordinateText) {
                const parts = coordinateText.split(',');
                if (parts.length === 2) {
                    tLat = parseFloat(parts[0].trim());
                    tLng = parseFloat(parts[1].trim());
                }
            }

            if (tLat !== 0 && tLng !== 0) {
                const distance = calcDistance(lat, lng, tLat, tLng);
                tempToilets.push({
                    park_Id: `toilet-${tLat}-${tLng}`, 
                    name: name,
                    address: address,
                    latitude: tLat,
                    longitude: tLng,
                    type: type === '1' ? '公廁' : (type === '2' ? '旱廁' : '設施'),
                    distance: distance
                });
            }
        }
    }

    cachedAllToilets = tempToilets;
    
    let filteredToilets = [...cachedAllToilets];
    if (activeDistanceFilter !== 'all') {
        const limit = parseFloat(activeDistanceFilter);
        filteredToilets = filteredToilets.filter(item => item.distance <= limit);
    }
    filteredToilets.sort((a, b) => a.distance - b.distance);
    displayToiletResults(filteredToilets.slice(0, 30));
}

function generateToiletCardHTML(toilet) {
    const isFav = favorites.includes(toilet.park_Id);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${toilet.latitude},${toilet.longitude}`;
    
    const cardStatusClass = 'status-high'; 
    const dotClass = 'dot-green';
    
    let distWarningHTML = toilet.distance > 5 ? `<span class="distance-warning">${t.distWarning}</span>` : '';
    const distHTML = toilet.distance !== Infinity ? `<span class="distance">${toilet.distance.toFixed(2)} ${t.away}</span>${distWarningHTML}` : '';

    let typeHTML = (toilet.type && toilet.type !== '設施') ? `
        <div class="info-label">類型:</div><div>${toilet.type}</div>
    ` : '';

    return `
        <div class="carpark-card ${cardStatusClass}">
            <div class="card-body-split">
                <div class="card-left">
                    <div class="carpark-name">
                        <span class="status-dot ${dotClass}"></span>
                        ${toilet.name}
                    </div>
                    <div class="tags-row">${distHTML}</div>
                    <div class="info-grid">
                        <div class="info-label">${t.address || '地址'}:</div><div><a href="${mapUrl}" target="_blank" class="map-link">${toilet.address}</a></div>
                        ${typeHTML}
                    </div>
                </div>
                <div class="card-right">
                    <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${toilet.park_Id}')">${isFav ? t.removeFav : t.addFav}</button>
                    <div style="height: 40px; visibility: hidden;"></div>
                </div>
            </div>
        </div>`;
}

function displayToiletResults(items) {
    statusText.textContent = ""; 
    uiSearchTitle.textContent = `${t.searchTitle} (${items.length})`; 
    
    if (items.length === 0) {
        resultsDiv.innerHTML = `<div class="empty-notice">${t.noRecords}</div>`;
        return;
    }
    resultsDiv.innerHTML = items.map(item => generateToiletCardHTML(item)).join('');
}

// === 上方為新增的公廁邏輯 ===

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

initTheme();
updateUIStaticText();
renderSearchHistory();
renderWelcomeMessage();
