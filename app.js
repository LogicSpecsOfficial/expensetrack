let currentTab = 'offstreet';
let userCoordinates = null;
let cachedAllParks = [];
let cachedAllMeters = [];
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

// SVG 圖標代碼
const svgGps = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="m3 11 19-9-9 19-2-8-8-2z"/></svg>`;
const svgStarOutline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const svgStarFilled = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const svgRefresh = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;
const svgSearch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

const defaultSunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>`;
const defaultMoonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;

const getSunIcon = () => (typeof sunIcon !== 'undefined' ? sunIcon : defaultSunIcon);
const getMoonIcon = () => (typeof moonIcon !== 'undefined' ? moonIcon : defaultMoonIcon);

function initTheme() {
    const savedTheme = localStorage.getItem('hk_carpark_theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleBtn.innerHTML = getSunIcon();
    } else {
        document.body.classList.remove('dark-theme');
        themeToggleBtn.innerHTML = getMoonIcon();
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    if (isDark) {
        localStorage.setItem('hk_carpark_theme', 'dark');
        themeToggleBtn.innerHTML = getSunIcon();
    } else {
        localStorage.setItem('hk_carpark_theme', 'light');
        themeToggleBtn.innerHTML = getMoonIcon();
    }
}

function updateUIStaticText() {
    uiTitle.textContent = t.title;
    
    // 將按鈕文字替換為純圖標，提升介面可用度
    locateBtn.innerHTML = svgGps;
    refreshBtn.innerHTML = svgRefresh;
    searchBtn.innerHTML = svgSearch;
    showFavBtn.innerHTML = favWrapper.style.display === 'none' ? svgStarOutline : svgStarFilled;
    
    uiFavTitle.textContent = t.favTitle;
    uiSearchTitle.textContent = t.searchTitle;
    tabOffStreet.textContent = t.tabOffStreet;
    tabMetered.textContent = t.tabMetered;
    
    searchInput.placeholder = t.searchPlaceholder;
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
    } else {
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
    } else {
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

themeToggleBtn.addEventListener('click', toggleTheme);

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
        } else {
            await fetchMeteredParking(userCoordinates.lat, userCoordinates.lng);
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
    } else {
        const groupedMeters = groupMeteredParking(cachedAllMeters);
        const favMeters = groupedMeters.filter(meterGroup => favorites.includes(meterGroup.park_Id));
        favMeters.forEach(m => html += generateMeterCardHTML(m));
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

// 基礎距離計算與網絡請求輔助函數
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function fetchTextThroughProxy(url, useProxy = false) {
    if (useProxy) {
        try {
            const res = await fetch(url);
            return await res.text();
        } catch (e) {
            const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
            const res = await fetch(proxyUrl);
            return await res.text();
        }
    } else {
        const res = await fetch(url);
        return await res.text();
    }
}

async function fetchCarParks(lat, lng) {
    const url = 'https://api.data.gov.hk/v1/carpark-info-vacancy';
    const res = await fetch(url);
    const data = await res.json();
    
    if (data && data.results) {
        cachedAllParks = data.results.map(park => {
            const parkLat = parseFloat(park.latitude || 0);
            const parkLng = parseFloat(park.longitude || 0);
            return {
                ...park,
                distance: getDistance(lat, lng, parkLat, parkLng)
            };
        });
        await renderActiveTabDisplay();
    }
}

async function fetchMeteredParking(lat, lng) {
    const infoUrl = 'https://api.data.gov.hk/v1/carpark-info-vacancy?vehicle_type=privateCar';
    const res = await fetch(infoUrl);
    const data = await res.json();
    
    if (data && data.results) {
        cachedAllMeters = data.results.filter(p => p.carpark_Type === 'Metered').map(m => {
            const mLat = parseFloat(m.latitude || 0);
            const mLng = parseFloat(m.longitude || 0);
            return {
                address: m.address || m.name || '',
                rawStreet: m.name || '',
                district: m.district || '',
                latitude: mLat,
                longitude: mLng,
                vacancyStatus: (m.liveInfo && m.liveInfo.privateCar && m.liveInfo.privateCar[0] && m.liveInfo.privateCar[0].vacancy > 0) ? 'V' : 'O',
                distance: getDistance(lat, lng, mLat, mLng)
            };
        });
        await renderActiveTabDisplay();
    }
}

async function silentFetchData() {
    if (userCoordinates) {
        try {
            await fetchCarParks(userCoordinates.lat, userCoordinates.lng);
            await fetchMeteredParking(userCoordinates.lat, userCoordinates.lng);
        } catch (e) {
            console.warn("Silent fetch background error:", e);
        }
    }
}

initTheme();
updateUIStaticText();
renderSearchHistory();
renderWelcomeMessage();
