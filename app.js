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

// 補回先前重構時遺漏的主題初始化定義
function initTheme() {
    const savedTheme = localStorage.getItem('hk_carpark_theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggleBtn) themeToggleBtn.innerHTML = sunIcon;
    } else {
        document.body.classList.remove('dark-theme');
        if (themeToggleBtn) themeToggleBtn.innerHTML = moonIcon;
    }
}

// 補回先前重構時遺漏的主題切換定義
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    if (isDark) {
        localStorage.setItem('hk_carpark_theme', 'dark');
        if (themeToggleBtn) themeToggleBtn.innerHTML = sunIcon;
    } else {
        localStorage.setItem('hk_carpark_theme', 'light');
        if (themeToggleBtn) themeToggleBtn.innerHTML = moonIcon;
    }
}

// 補回先前重構時遺漏的頂部功能鍵真實 SVG 圖標渲染注入定義
function updateUIStaticText() {
    if (homeBtn) homeBtn.innerHTML = svgHome;
    if (locateBtn) {
        locateBtn.innerHTML = svgGps;
        locateBtn.title = t.btnText || "GPS 定位";
        locateBtn.setAttribute('aria-label', t.btnText || "GPS 定位");
    }
    if (refreshBtn) {
        refreshBtn.innerHTML = svgRefresh;
        refreshBtn.title = t.refreshBtnText || "更新數據";
        refreshBtn.setAttribute('aria-label', t.refreshBtnText || "更新數據");
    }
    if (showFavBtn && favWrapper) {
        showFavBtn.innerHTML = favWrapper.style.display === 'none' ? svgStarOutline : svgStarFilled;
        showFavBtn.title = favWrapper.style.display === 'none' ? (t.btnFavShow || "顯示收藏") : (t.btnFavHide || "隱藏收藏");
        showFavBtn.setAttribute('aria-label', favWrapper.style.display === 'none' ? (t.btnFavShow || "顯示收藏") : (t.btnFavHide || "隱藏收藏"));
    }
    if (searchWrapper && searchToggleBtn) {
        const isOpen = searchWrapper.classList.contains('open');
        searchToggleBtn.innerHTML = isOpen ? svgClose : svgSearch;
        searchToggleBtn.title = isOpen ? "關閉搜尋" : "展開搜尋";
        searchToggleBtn.setAttribute('aria-label', isOpen ? "關閉搜尋" : "展開搜尋");
    }

    const uiFavTitle = document.getElementById('ui-fav-title');
    const uiSearchTitle = document.getElementById('ui-search-title');
    const tabOffStreet = document.getElementById('tabOffStreet');
    const tabMetered = document.getElementById('tabMetered');
    const tabToilet = document.getElementById('tabToilet');

    if (uiFavTitle) uiFavTitle.textContent = t.favTitle;
    if (uiSearchTitle) uiSearchTitle.textContent = t.searchTitle;
    if (tabOffStreet) tabOffStreet.textContent = t.tabOffStreet;
    if (tabMetered) tabMetered.textContent = t.tabMetered;
    if (tabToilet) tabToilet.textContent = t.tabToilet || "公廁";

    if (searchInput) searchInput.placeholder = t.searchPlaceholder;
    if (searchBtn) searchBtn.textContent = t.searchBtnText;
    if (clearHistoryBtn) clearHistoryBtn.textContent = t.clearBtnText;
    
    if (typeof renderFilterPills === 'function') renderFilterPills();
}

async function triggerAddressSearch(forcedQuery = null) {
    const inputVal = typeof forcedQuery === 'string' ? forcedQuery : searchInput.value.trim();
    if (!inputVal) return;
    let query = synonymMap[inputVal.toLowerCase().replace(/\s+/g, '')] || inputVal;
    if (typeof forcedQuery === 'string') searchInput.value = inputVal;

    if (statusText) statusText.textContent = t.addressSearching;
    if (resultsDiv) resultsDiv.innerHTML = "";
    [locateBtn, searchBtn, refreshBtn].forEach(b => { if (b) b.disabled = true; });
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
            saveSearch(inputVal); 
            if (typeof renderFilterPills === 'function') renderFilterPills(); 
            if (searchWrapper) searchWrapper.classList.remove('open'); 
            if (searchToggleBtn) searchToggleBtn.innerHTML = svgSearch;
            if (typeof refreshActiveTabData === 'function') await refreshActiveTabData(false); 
            if (document.activeElement) document.activeElement.blur();
        } else { if (statusText) statusText.textContent = t.addressError; }
    } catch (err) { if (statusText) statusText.textContent = t.addressError; console.error(err); }
    finally { [locateBtn, searchBtn, refreshBtn].forEach(b => { if (b) b.disabled = false; }); }
}

if (searchToggleBtn && searchWrapper) {
    searchToggleBtn.addEventListener('click', () => {
        searchWrapper.classList.toggle('open'); const isOpen = searchWrapper.classList.contains('open');
        searchToggleBtn.innerHTML = isOpen ? svgClose : svgSearch; if (isOpen && searchInput) searchInput.focus();
    });
}
if (searchBtn) searchBtn.addEventListener('click', () => triggerAddressSearch());
if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') triggerAddressSearch(); });
if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => { searchHistory = []; localStorage.removeItem('hk_carpark_history'); if (typeof renderSearchHistory === 'function') renderSearchHistory(); });

if (locateBtn) {
    locateBtn.addEventListener('click', () => {
        if (!navigator.geolocation) { if (statusText) statusText.textContent = t.noSupport; return; }
        [locateBtn, refreshBtn].forEach(b => { if (b) b.disabled = true; }); 
        if (statusText) statusText.textContent = t.gpsLocating; 
        if (resultsDiv) resultsDiv.innerHTML = "";
        navigator.geolocation.getCurrentPosition(
            async (pos) => { 
                userCoordinates = { lat: pos.coords.latitude, lng: pos.coords.longitude }; 
                cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; 
                if (typeof renderFilterPills === 'function') renderFilterPills(); 
                if (typeof refreshActiveTabData === 'function') await refreshActiveTabData(false); 
            },
            async () => { 
                userCoordinates = { lat: 22.3193, lng: 114.1694 }; 
                cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; 
                if (typeof renderFilterPills === 'function') renderFilterPills(); 
                if (statusText) statusText.textContent = "定位未開啟，已顯示九龍中心數據"; 
                if (typeof refreshActiveTabData === 'function') await refreshActiveTabData(false); 
            },
            { enableHighAccuracy: true }
        );
    });
}

if (refreshBtn) refreshBtn.addEventListener('click', async () => { if (!userCoordinates) { if (locateBtn) locateBtn.click(); } else { if (typeof refreshActiveTabData === 'function') await refreshActiveTabData(false); } });
if (showFavBtn) {
    showFavBtn.addEventListener('click', () => { 
        if (favWrapper) favWrapper.style.display = (favWrapper.style.display === 'none') ? 'block' : 'none'; 
        if (favWrapper && favWrapper.style.display === 'block' && cachedAllParks.length === 0) {
            if (typeof silentFetchData === 'function') silentFetchData(); 
        } else {
            if (typeof renderFavorites === 'function') renderFavorites(); 
        }
        updateUIStaticText(); 
    });
}
if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
if (homeBtn) { 
    homeBtn.addEventListener('click', () => { 
        userCoordinates = null; cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; currentTab = 'offstreet'; 
        if (tabOffStreet) tabOffStreet.classList.add('active'); 
        [tabMetered, tabToilet].forEach(t => { if (t) t.classList.remove('active'); }); 
        if (typeof renderFilterPills === 'function') renderFilterPills(); 
        if (uiSearchTitle) uiSearchTitle.textContent = t.searchTitle; 
        if (statusText) statusText.textContent = ""; 
        if (typeof renderWelcomeMessage === 'function') renderWelcomeMessage(); 
    }); 
}

window.addEventListener('scroll', () => {
    if (stickyHeader) stickyHeader.classList.toggle('scrolled', window.scrollY > 20);
    if (backToTopBtn) backToTopBtn.classList.toggle('visible', window.scrollY > 300);
});
if (backToTopBtn) backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

initTheme();
updateUIStaticText();
if (typeof renderSearchHistory === 'function') renderSearchHistory();
if (typeof renderWelcomeMessage === 'function') renderWelcomeMessage();
