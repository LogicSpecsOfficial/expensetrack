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

function decodeUnicode(str) {
    if (!str) return '';
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
}

function withTimeout(promise, ms, errorMsg) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(errorMsg)), ms);
        promise.then(
            res => { clearTimeout(timer); resolve(res); },
            err => { clearTimeout(timer); reject(err); }
        );
    });
}

function extractAddressData(text) {
    let buildingName = "";
    let streetAddress = "";

    try {
        const data = JSON.parse(text);
        const suggested = data?.SuggestedAddress || data?.AddressLookupResult?.SuggestedAddress;
        if (Array.isArray(suggested) && suggested.length > 0) {
            const premises = suggested[0]?.Address?.PremisesAddress;
            if (premises && premises.ChiPremisesAddress) {
                const chi = premises.ChiPremisesAddress;
                buildingName = chi.BuildingName ? decodeUnicode(chi.BuildingName).trim() : "";
                
                const region = chi.Region ? decodeUnicode(chi.Region).trim() : "";
                const district = chi.ChiDistrict || chi.District || "";
                let cleanDistrict = "";
                if (district && typeof district === 'object') {
                    cleanDistrict = district.content || district.DistrictName || "";
                } else {
                    cleanDistrict = district;
                }
                cleanDistrict = cleanDistrict ? decodeUnicode(cleanDistrict).trim() : "";
                
                const streetObj = chi.ChiStreet || chi.Street || {};
                let streetName = "";
                let buildingNo = "";
                if (streetObj && typeof streetObj === 'object') {
                    streetName = streetObj.StreetName ? decodeUnicode(streetObj.StreetName).trim() : "";
                    buildingNo = streetObj.BuildingNoFrom ? decodeUnicode(streetObj.BuildingNoFrom).trim() : "";
                }
                
                const distPart = (cleanDistrict.startsWith(region) || !region) ? cleanDistrict : (region + cleanDistrict);
                const streetPart = streetName + (buildingNo ? buildingNo + '號' : '');
                
                streetAddress = (distPart + streetPart).trim();
                if (buildingName || streetAddress) {
                    return { buildingName, streetAddress };
                }
            }
        }
    } catch (e) {
        console.warn("JSON parse failed, falling back to regex:", e);
    }

    const regionMatch = text.match(/<Region>([^<]+)<\/Region>/i) || text.match(/"Region"\s*:\s*"([^"]+)"/i);
    const districtMatch = text.match(/<District[^>]*>([^<]+)<\/District>/i) || 
                         text.match(/"ChiDistrict"\s*:\s*"([^"]+)"/i) || 
                         text.match(/"DistrictName"\s*:\s*"([^"]+)"/i) || 
                         text.match(/"District"\s*:\s*"([^"]+)"/i);
    const streetMatch = text.match(/<StreetName>([^<]+)<\/StreetName>/i) || text.match(/"StreetName"\s*:\s*"([^"]+)"/i);
    const noMatch = text.match(/<BuildingNoFrom>([^<]+)<\/BuildingNoFrom>/i) || text.match(/"BuildingNoFrom"\s*:\s*"([^"]+)"/i);
    const bldMatch = text.match(/<BuildingName>([^<]+)<\/BuildingName>/i) || text.match(/"BuildingName"\s*:\s*"([^"]+)"/i);

    const region = regionMatch ? decodeUnicode(regionMatch[1].trim()) : "";
    const district = districtMatch ? decodeUnicode(districtMatch[1].trim()) : "";
    const street = streetMatch ? decodeUnicode(streetMatch[1].trim()) : "";
    const no = noMatch ? decodeUnicode(noMatch[1].trim()) : "";
    const bld = bldMatch ? decodeUnicode(bldMatch[1].trim()) : "";

    if (bld) buildingName = bld;
    
    const distPart = (district.startsWith(region) || !region) ? district : (region + district);
    const streetPart = street + (no ? no + '號' : '');
    streetAddress = (distPart + streetPart).trim();

    return { buildingName, streetAddress };
}

function getFormattedAddress(addrData) {
    const bld = addrData.buildingName;
    const str = addrData.streetAddress;
    if (bld && str) {
        return `${bld}，${str}`;
    } else if (str) {
        return str;
    } else if (bld) {
        return bld;
    }
    return "";
}

async function refreshActiveTabData(isBackgroundRefresh = false) {
    if (!userCoordinates) return;
    const statusText = document.getElementById('status');
    if (!isBackgroundRefresh && statusText) { 
        let loadingMsg = t.apiFetching;
        if (currentTab === 'metered') loadingMsg = t.meterFetching;
        else if (currentTab === 'toilet') loadingMsg = t.toiletFetching;
        statusText.innerHTML = `<span class="loading-container">${loadingMsg}<span class="loading-dots"><span></span><span></span><span></span></span></span>`;
        [locateBtn, refreshBtn].forEach(b => { if (b) b.disabled = true; }); 
    }
    try {
        if (currentTab === 'offstreet' && typeof fetchCarParks === 'function') await fetchCarParks(userCoordinates.lat, userCoordinates.lng);
        else if (currentTab === 'metered' && typeof fetchMeteredParking === 'function') await fetchMeteredParking(userCoordinates.lat, userCoordinates.lng);
        else if (currentTab === 'toilet' && typeof fetchToilets === 'function') await fetchToilets(userCoordinates.lat, userCoordinates.lng);
    } catch (err) {
        if (!isBackgroundRefresh && statusText) statusText.textContent = `${t.apiError}${err.message}`;
        console.error(err);
    } finally {
        if (!isBackgroundRefresh) { if (statusText) statusText.innerHTML = ""; [locateBtn, refreshBtn].forEach(b => { if (b) b.disabled = false; }); }
    }
}

async function triggerAddressSearch(forcedQuery = null) {
    const inputVal = typeof forcedQuery === 'string' ? forcedQuery : searchInput.value.trim(); if (!inputVal) return;
    let query = synonymMap[inputVal.toLowerCase().replace(/\s+/g, '')] || inputVal; if (typeof forcedQuery === 'string') searchInput.value = inputVal;
    const statusText = document.getElementById('status'); 
    if (statusText) {
        statusText.innerHTML = `<span class="loading-container">${t.addressSearching}<span class="loading-dots"><span></span><span></span><span></span></span></span>`;
    }
    document.getElementById('results').innerHTML = "";
    [locateBtn, searchBtn, refreshBtn].forEach(b => { if (b) b.disabled = true; });
    
    let lat = null, lng = null;
    resolvedLocationName = '';
    
    try {
        await withTimeout((async () => {
            const responseText = await fetchTextThroughProxy(`https://www.als.gov.hk/lookup?q=${encodeURIComponent(query)}`, true);
            
            let latMatch = responseText.match(/"Latitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Latitude>([0-9.]+)<\/Latitude>/i);
            let lngMatch = responseText.match(/"Longitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Longitude>([0-9.]+)<\/Longitude>/i);
            lat = latMatch ? parseFloat(latMatch[1]) : null;
            lng = lngMatch ? parseFloat(lngMatch[1]) : null;

            if (synonymMap[inputVal.toLowerCase().replace(/\s+/g, '')]) {
                resolvedLocationName = synonymMap[inputVal.toLowerCase().replace(/\s+/g, '')];
            } else {
                const addrData = extractAddressData(responseText);
                resolvedLocationName = getFormattedAddress(addrData);
                if (!resolvedLocationName) {
                    resolvedLocationName = inputVal;
                }
            }

            if (!lat || !lng) {
                const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`); 
                const photonData = await photonRes.json();
                if (photonData.features?.length > 0) { 
                    [lng, lat] = photonData.features[0].geometry.coordinates; 
                    if (photonData.features[0].properties?.name) {
                        resolvedLocationName = photonData.features[0].properties.name;
                    }
                }
            }
        })(), 2000, "Timeout");

        if (lat && lng) {
            userCoordinates = { lat, lng }; cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = [];
            saveSearch(inputVal); if (typeof renderFilterPills === 'function') renderFilterPills();
            if (searchWrapper) searchWrapper.classList.remove('open'); updateUIStaticText();
            await refreshActiveTabData(false);
        } else { 
            if (statusText) statusText.textContent = t.addressError; 
        }
    } catch (err) { 
        if (statusText) statusText.textContent = t.addressError; 
        console.error(err); 
    } finally { 
        [locateBtn, searchBtn, refreshBtn].forEach(b => { if (b) b.disabled = false; }); 
    }
}

if (searchToggleBtn && searchWrapper) { searchToggleBtn.addEventListener('click', () => { searchWrapper.classList.toggle('open'); searchToggleBtn.innerHTML = searchWrapper.classList.contains('open') ? svgClose : svgSearch; if (searchWrapper.classList.contains('open') && searchInput) searchInput.focus(); }); }
if (searchBtn) searchBtn.addEventListener('click', () => triggerAddressSearch());
if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') triggerAddressSearch(); });
if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => { searchHistory = []; localStorage.removeItem('hk_carpark_history'); if (typeof renderSearchHistory === 'function') renderSearchHistory(); });

if (locateBtn) {
    locateBtn.addEventListener('click', () => {
        const statusText = document.getElementById('status');
        if (!navigator.geolocation) { if (statusText) statusText.textContent = t.noSupport; return; }
        [locateBtn, refreshBtn].forEach(b => { if (b) b.disabled = true; }); 
        if (statusText) {
            statusText.innerHTML = `<span class="loading-container">${t.gpsLocating}<span class="loading-dots"><span></span><span></span><span></span></span></span>`;
        }
        document.getElementById('results').innerHTML = "";
        navigator.geolocation.getCurrentPosition(
            async (pos) => { 
                userCoordinates = { lat: pos.coords.latitude, lng: pos.coords.longitude }; 
                resolvedLocationName = "當前位置";
                cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; 
                if (typeof renderFilterPills === 'function') renderFilterPills(); 
                await refreshActiveTabData(false); 
            },
            async () => { 
                userCoordinates = { lat: 22.3193, lng: 114.1694 }; 
                resolvedLocationName = "九龍中心 (預設)";
                cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; 
                if (typeof renderFilterPills === 'function') renderFilterPills(); 
                if (statusText) statusText.textContent = "定位未開啟，已顯示九龍中心數據"; 
                await refreshActiveTabData(false); 
            },
            { enableHighAccuracy: true }
        );
    });
}
if (refreshBtn) refreshBtn.addEventListener('click', async () => { if (!userCoordinates) { if (locateBtn) locateBtn.click(); } else { await refreshActiveTabData(false); } });
if (showFavBtn) { showFavBtn.addEventListener('click', () => { if (favWrapper) favWrapper.style.display = (favWrapper.style.display === 'none') ? 'block' : 'none'; if (favWrapper && favWrapper.style.display === 'block' && cachedAllParks.length === 0) { if (typeof silentFetchData === 'function') silentFetchData(); } else { if (typeof renderFavorites === 'function') renderFavorites(); } updateUIStaticText(); }); }
if (homeBtn) { homeBtn.addEventListener('click', () => { userCoordinates = null; resolvedLocationName = ''; cachedAllParks = []; cachedAllMeters = []; cachedAllToilets = []; currentTab = 'offstreet'; tabOffStreet.classList.add('active'); ['tabMetered', 'tabToilet'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('active'); }); if (typeof renderFilterPills === 'function') renderFilterPills(); document.getElementById('ui-search-title').textContent = t.searchTitle; const subtitleEl = document.getElementById('searchSubtitle'); if (subtitleEl) subtitleEl.style.display = 'none'; const statusText = document.getElementById('status'); if (statusText) statusText.textContent = ""; if (typeof renderWelcomeMessage === 'function') renderWelcomeMessage(); }); }

window.addEventListener('scroll', () => { if (stickyHeader) stickyHeader.classList.toggle('scrolled', window.scrollY > 20); if (backToTopBtn) backToTopBtn.classList.toggle('visible', window.scrollY > 300); });
if (backToTopBtn) backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

initTheme(); updateUIStaticText();
if (typeof renderSearchHistory === 'function') renderSearchHistory();
if (typeof renderWelcomeMessage === 'function') renderWelcomeMessage();
