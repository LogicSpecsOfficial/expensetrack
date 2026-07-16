// app.js
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

async function triggerAddressSearch(forcedQuery = null) {
    const inputVal = typeof forcedQuery === 'string' ? forcedQuery : searchInput.value.trim();
    if (!inputVal) return;
    let query = synonymMap[inputVal.toLowerCase().replace(/\s+/g, '')] || inputVal;
    if (typeof forcedQuery === 'string') searchInput.value = inputVal;

    statusText.textContent = t.addressSearching; resultsDiv.innerHTML = "";
    [locateBtn, searchBtn, refreshBtn].forEach(b => b.disabled = true);
    try {
        const responseText = await fetchTextThroughProxy(`https://www.als.gov.hk/lookup?q=${encodeURIComponent(query)}`, true);
        let latMatch = responseText.match(/"Latitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Latitude>([0-9.]+)<\/Latitude>/i);
        let lngMatch = responseText.match(/"Longitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Longitude>([0-9.]+)<\/Longitude>/i);
        let lat = latMatch ? parseFloat(latMatch[1]) : null, lng = lngMatch ? parseFloat(lngMatch[1]) : null;

        if (!lat || !lng) {
            const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
            const photonData = await photonRes.json();
            if (photonData.features?.length > 0) { [lng, lat] = photonData.features[0].geometry.coordinates; }
        }
        if (lat && lng) {
            userCoordinates = { lat, lng }; cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = [];
            saveSearch(inputVal); renderFilterPills(); searchWrapper.classList.remove('open'); searchToggleBtn.innerHTML = svgSearch;
            await refreshActiveTabData(false); if (document.activeElement) document.activeElement.blur();
        } else { statusText.textContent = t.addressError; }
    } catch (err) { statusText.textContent = t.addressError; console.error(err); }
    finally { [locateBtn, searchBtn, refreshBtn].forEach(b => b.disabled = false); }
}

searchToggleBtn.addEventListener('click', () => {
    searchWrapper.classList.toggle('open'); const isOpen = searchWrapper.classList.contains('open');
    searchToggleBtn.innerHTML = isOpen ? svgClose : svgSearch; if (isOpen) searchInput.focus();
});
searchBtn.addEventListener('click', () => triggerAddressSearch());
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') triggerAddressSearch(); });
clearHistoryBtn.addEventListener('click', () => { searchHistory = []; localStorage.removeItem('hk_carpark_history'); renderSearchHistory(); });

locateBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { statusText.textContent = t.noSupport; return; }
    [locateBtn, refreshBtn].forEach(b => b.disabled = true); statusText.textContent = t.gpsLocating; resultsDiv.innerHTML = "";
    navigator.geolocation.getCurrentPosition(
        async (pos) => { userCoordinates = { lat: pos.coords.latitude, lng: pos.coords.longitude }; cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; renderFilterPills(); await refreshActiveTabData(false); },
        async () => { userCoordinates = { lat: 22.3193, lng: 114.1694 }; cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; renderFilterPills(); statusText.textContent = "定位未開啟，已顯示九龍中心數據"; await refreshActiveTabData(false); },
        { enableHighAccuracy: true }
    );
});

refreshBtn.addEventListener('click', async () => { if (!userCoordinates) locateBtn.click(); else await refreshActiveTabData(false); });
showFavBtn.addEventListener('click', () => { favWrapper.style.display = (favWrapper.style.display === 'none') ? 'block' : 'none'; if (favWrapper.style.display === 'block' && cachedAllParks.length === 0) silentFetchData(); else renderFavorites(); updateUIStaticText(); });
themeToggleBtn.addEventListener('click', toggleTheme);
if (homeBtn) { homeBtn.addEventListener('click', () => { userCoordinates = null; cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; currentTab = 'offstreet'; tabOffStreet.classList.add('active'); [tabMetered, tabToilet].forEach(t => t.classList.remove('active')); renderFilterPills(); uiSearchTitle.textContent = t.searchTitle; statusText.textContent = ""; renderWelcomeMessage(); }); }

window.addEventListener('scroll', () => {
    stickyHeader.classList.toggle('scrolled', window.scrollY > 20);
    backToTopBtn.classList.toggle('visible', window.scrollY > 300);
});
backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

initTheme();
updateUIStaticText();
renderSearchHistory();
renderWelcomeMessage();
