// app.js
const homeBtn = document.getElementById('homeBtn');
const locateBtn = document.getElementById('locateBtn');
const showFavBtn = document.getElementById('showFavBtn');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const searchToggleBtn = document.getElementById('searchToggleBtn');
const searchWrapper = document.getElementById('searchWrapper');
const backToTopBtn = document.getElementById('backToTopBtn');
const stickyHeader = document.querySelector('.sticky-header-wrapper');
const favWrapper = document.getElementById('fav-wrapper');

function initTheme() {
    const savedTheme = localStorage.getItem('hk_carpark_theme') || 'light';
    if (savedTheme === 'dark') { document.body.classList.add('dark-theme'); if (themeToggleBtn) themeToggleBtn.innerHTML = sunIcon; }
    else { document.body.classList.remove('dark-theme'); if (themeToggleBtn) themeToggleBtn.innerHTML = moonIcon; }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('hk_carpark_theme', isDark ? 'dark' : 'light');
    if (themeToggleBtn) themeToggleBtn.innerHTML = isDark ? sunIcon : moonIcon;
}

function updateUIStaticText() {
    if (homeBtn) homeBtn.innerHTML = svgHome;
    if (locateBtn) locateBtn.innerHTML = svgGps;
    if (refreshBtn) refreshBtn.innerHTML = svgRefresh;
    if (showFavBtn && favWrapper) showFavBtn.innerHTML = favWrapper.style.display === 'none' ? svgStarOutline : svgStarFilled;
    if (searchToggleBtn && searchWrapper) searchToggleBtn.innerHTML = searchWrapper.classList.contains('open') ? svgClose : svgSearch;
    if (typeof renderFilterPills === 'function') renderFilterPills();
}

function saveSearch(query) {
    searchHistory = searchHistory.filter(item => item.toLowerCase() !== query.toLowerCase()); searchHistory.unshift(query);
    if (searchHistory.length > 5) searchHistory = searchHistory.slice(0, 5);
    localStorage.setItem('hk_carpark_history', JSON.stringify(searchHistory));
    if (typeof renderSearchHistory === 'function') renderSearchHistory();
}

function toggleFavorite(id) {
    favorites = favorites.includes(id) ? favorites.filter(favId => favId !== id) : [...favorites, id];
    localStorage.setItem('hk_carpark_favs', JSON.stringify(favorites));
    if (typeof renderFavorites === 'function') renderFavorites();
    if (typeof renderActiveTabDisplay === 'function') renderActiveTabDisplay();
}

async function triggerAddressSearch(forcedQuery = null) {
    const inputVal = typeof forcedQuery === 'string' ? forcedQuery : searchInput.value.trim(); if (!inputVal) return;
    let query = synonymMap[inputVal.toLowerCase().replace(/\s+/g, '')] || inputVal; if (typeof forcedQuery === 'string') searchInput.value = inputVal;
    if (statusText) statusText.textContent = t.addressSearching; if (resultsDiv) resultsDiv.innerHTML = "";
    [locateBtn, searchBtn, refreshBtn].forEach(b => { if (b) b.disabled = true; });
    try {
        const responseText = await fetchTextThroughProxy(`https://www.als.gov.hk/lookup?q=${encodeURIComponent(query)}`, true);
        let latMatch = responseText.match(/"Latitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Latitude>([0-9.]+)<\/Latitude>/i);
        let lngMatch = responseText.match(/"Longitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Longitude>([0-9.]+)<\/Longitude>/i);
        let lat = latMatch ? parseFloat(latMatch[1]) : null, lng = lngMatch ? parseFloat(lngMatch[1]) : null;
        if (!lat || !lng) {
            const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`); const photonData = await photonRes.json();
            if (photonData.features?.length > 0) { [lng, lat] = photonData.features[0].geometry.coordinates; }
        }
        if (lat && lng) {
            userCoordinates = { lat, lng }; cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = [];
            saveSearch(inputVal); if (typeof renderFilterPills === 'function') renderFilterPills();
            if (searchWrapper) searchWrapper.classList.remove('open'); updateUIStaticText();
            if (typeof refreshActiveTabData === 'function') await refreshActiveTabData(false);
            if (document.activeElement) document.activeElement.blur();
        } else { if (statusText) statusText.textContent = t.addressError; }
    } catch (err) { if (statusText) statusText.textContent = t.addressError; console.error(err); }
    finally { [locateBtn, searchBtn, refreshBtn].forEach(b => { if (b) b.disabled = false; }); }
}

if (searchToggleBtn && searchWrapper) { searchToggleBtn.addEventListener('click', () => { searchWrapper.classList.toggle('open'); searchToggleBtn.innerHTML = searchWrapper.classList.contains('open') ? svgClose : svgSearch; if (searchWrapper.classList.contains('open') && searchInput) searchInput.focus(); }); }
if (searchBtn) searchBtn.addEventListener('click', () => triggerAddressSearch());
if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') triggerAddressSearch(); });
if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => { searchHistory = []; localStorage.removeItem('hk_carpark_history'); if (typeof renderSearchHistory === 'function') renderSearchHistory(); });

if (locateBtn) {
    locateBtn.addEventListener('click', () => {
        if (!navigator.geolocation) { if (statusText) statusText.textContent = t.noSupport; return; }
        [locateBtn, refreshBtn].forEach(b => { if (b) b.disabled = true; }); if (statusText) statusText.textContent = t.gpsLocating; if (resultsDiv) resultsDiv.innerHTML = "";
        navigator.geolocation.getCurrentPosition(
            async (pos) => { userCoordinates = { lat: pos.coords.latitude, lng: pos.coords.longitude }; cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; if (typeof renderFilterPills === 'function') renderFilterPills(); if (typeof refreshActiveTabData === 'function') await refreshActiveTabData(false); },
            async () => { userCoordinates = { lat: 22.3193, lng: 114.1694 }; cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; if (typeof renderFilterPills === 'function') renderFilterPills(); if (statusText) statusText.textContent = "定位未開啟，已顯示九龍中心數據"; if (typeof refreshActiveTabData === 'function') await refreshActiveTabData(false); },
            { enableHighAccuracy: true }
        );
    });
}
if (refreshBtn) refreshBtn.addEventListener('click', async () => { if (!userCoordinates) { if (locateBtn) locateBtn.click(); } else { if (typeof refreshActiveTabData === 'function') await refreshActiveTabData(false); } });
if (showFavBtn) { showFavBtn.addEventListener('click', () => { if (favWrapper) favWrapper.style.display = (favWrapper.style.display === 'none') ? 'block' : 'none'; if (favWrapper && favWrapper.style.display === 'block' && cachedAllParks.length === 0) { if (typeof silentFetchData === 'function') silentFetchData(); } else { if (typeof renderFavorites === 'function') renderFavorites(); } updateUIStaticText(); }); }
if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
if (homeBtn) { homeBtn.addEventListener('click', () => { userCoordinates = null; cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; currentTab = 'offstreet'; tabOffStreet.classList.add('active'); ['tabMetered', 'tabToilet'].forEach(id => { const t = document.getElementById(id); if (t) t.classList.remove('active'); }); if (typeof renderFilterPills === 'function') renderFilterPills(); document.getElementById('ui-search-title').textContent = t.searchTitle; statusText.textContent = ""; if (typeof renderWelcomeMessage === 'function') renderWelcomeMessage(); }); }

window.addEventListener('scroll', () => { if (stickyHeader) stickyHeader.classList.toggle('scrolled', window.scrollY > 20); if (backToTopBtn) backToTopBtn.classList.toggle('visible', window.scrollY > 300); });
if (backToTopBtn) backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

initTheme(); updateUIStaticText();
if (typeof renderSearchHistory === 'function') renderSearchHistory();
if (typeof renderWelcomeMessage === 'function') renderWelcomeMessage();
