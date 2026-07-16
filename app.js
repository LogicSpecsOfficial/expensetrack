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
            
            cachedAllParks = [];
            cachedAllMeters = [];
            cachedAllToilets = [];

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
            
            cachedAllParks = [];
            cachedAllMeters = [];
            cachedAllToilets = [];

            renderFilterPills();
            await refreshActiveTabData(false);
        },
        async (error) => {
            console.warn("GPS tracking failed, falling back to Kowloon center coordinates.", error);
            userCoordinates = { lat: 22.3193, lng: 114.1694 };
            
            cachedAllParks = [];
            cachedAllMeters = [];
            cachedAllToilets = [];

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

function displayResults(items, isMeter = false) {
    statusText.textContent = "";
    uiSearchTitle.textContent = `${t.searchTitle} (${items.length})`;
    if (items.length === 0) {
        resultsDiv.innerHTML = `<div class="empty-notice">${t.noRecords}</div>`;
        return;
    }
    resultsDiv.innerHTML = items.map(item => isMeter ? generateMeterCardHTML(item) : generateCardHTML(item)).join('');
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

themeToggleBtn.addEventListener('click', toggleTheme);

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
