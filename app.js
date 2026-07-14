let currentTab = 'offstreet';
let userCoordinates = null;
let currentSearchLocationName = ''; // 用於持久儲存當前定位點名稱
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
    locateBtn.textContent = t.btnText;
    refreshBtn.textContent = t.refreshBtnText;
    uiFavTitle.textContent = t.favTitle;
    uiSearchTitle.textContent = t.searchTitle;
    tabOffStreet.textContent = t.tabOffStreet;
    tabMetered.textContent = t.tabMetered;
    showFavBtn.textContent = favWrapper.style.display === 'none' ? t.btnFavShow : t.btnFavHide;
    
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

// 輔助函數：保留中文字符、數字，去除英文
function cleanToChineseOnly(str) {
    if (!str) return "";
    return str.replace(/[a-zA-Z]/g, "").replace(/\s+/g, " ").trim();
}

// 輔助解析政府 ALS 複雜地址結構的函數
function extractAddress(responseText, defaultVal) {
    try {
        const data = JSON.parse(responseText);
        if (data && data.SuggestedAddress && data.SuggestedAddress.length > 0) {
            const premises = data.SuggestedAddress[0].Address.PremisesAddress;
            if (premises && premises.ChiPremisesAddress) {
                const chi = premises.ChiPremisesAddress;
                let addr = "";
                if (chi.Region && chi.Region !== "香港特別行政區") addr += chi.Region;
                if (chi.ChiDistrict && chi.ChiDistrict["Sub-district"]) addr += chi.ChiDistrict["Sub-district"];
                if (chi.ChiEstate && chi.ChiEstate.EstateName) addr += chi.ChiEstate.EstateName;
                if (chi.ChiStreet && chi.ChiStreet.StreetName) {
                    addr += chi.ChiStreet.StreetName;
                    if (chi.ChiStreet.BuildingNoFrom) addr += chi.ChiStreet.BuildingNoFrom + "號";
                }
                if (chi.BuildingName) addr += chi.BuildingName;
                
                const cleanAddr = cleanToChineseOnly(addr);
                if (cleanAddr) return cleanAddr;
            }
        }
    } catch (e) {
        // parsing error fallback
    }

    // XML 正則表達式解析備用方案
    let region = responseText.match(/<Region>([^<]+)<\/Region>/i);
    region = region ? region[1] : "";
    if (region === "香港特別行政區") region = "";

    let subDistrict = responseText.match(/<Sub-district>([^<]+)<\/Sub-district>/i);
    subDistrict = subDistrict ? subDistrict[1] : "";

    let streetName = responseText.match(/<StreetName>([^<]+)<\/StreetName>/i);
    streetName = streetName ? streetName[1] : "";
    let buildingNo = responseText.match(/<BuildingNoFrom>([^<]+)<\/BuildingNoFrom>/i);
    buildingNo = buildingNo ? buildingNo[1] + "號" : "";

    let buildingName = responseText.match(/<BuildingName>([^<]+)<\/BuildingName>/i);
    buildingName = buildingName ? buildingName[1] : "";

    let combined = region + subDistrict + streetName + buildingNo + buildingName;
    const cleanCombined = cleanToChineseOnly(combined);
    if (cleanCombined) return cleanCombined;

    return defaultVal;
}

// 輔助將 Nominatim 地址結構重組為乾淨中文的函數
function buildChineseAddressFromOSM(addressObj, displayName, defaultVal) {
    if (!addressObj) {
        return cleanToChineseOnly(displayName) || defaultVal;
    }
    
    const landmark = addressObj.amenity || addressObj.attraction || addressObj.shop || addressObj.building || addressObj.supermarket || addressObj.mall || addressObj.tourism || addressObj.place || "";
    const road = addressObj.road || "";
    const houseNumber = addressObj.house_number ? addressObj.house_number + "號" : "";
    const suburb = addressObj.suburb || addressObj.neighbourhood || addressObj.quarter || "";
    
    const cleanLandmark = cleanToChineseOnly(landmark);
    const cleanRoad = cleanToChineseOnly(road);
    const cleanSuburb = cleanToChineseOnly(suburb);
    
    let addrParts = [];
    // 依據中文「地區 -> 街道 + 門牌 -> 地標」層級重組
    if (cleanSuburb) addrParts.push(cleanSuburb);
    if (cleanRoad) addrParts.push(cleanRoad + houseNumber);
    if (cleanLandmark) addrParts.push(cleanLandmark);
    
    if (addrParts.length > 0) {
        return addrParts.join("");
    }
    
    return cleanToChineseOnly(displayName) || defaultVal;
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
        let lat = null;
        let lng = null;
        let locationName = ""; 

        // 引擎 1：嘗試官方政府 ALS 服務
        const searchUrl = `https://www.als.gov.hk/lookup?q=${encodeURIComponent(query)}`;
        const responseText = await fetchTextThroughProxy(searchUrl, true);
        
        let latMatch = responseText.match(/"Latitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Latitude>([0-9.]+)<\/Latitude>/i);
        let lngMatch = responseText.match(/"Longitude"\s*:\s*"?([0-9.]+)"?/i) || responseText.match(/<Longitude>([0-9.]+)<\/Longitude>/i);

        if (latMatch && lngMatch) {
            lat = parseFloat(latMatch[1]);
            lng = parseFloat(lngMatch[1]);
            locationName = extractAddress(responseText, inputVal);
        } else {
            // 引擎 2：政府無結果，背景靜默啟用 OSM Nominatim API (強制請求繁體中文)
            try {
                const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=zh-HK&addressdetails=1`;
                const osmRes = await fetch(osmUrl);
                const osmData = await osmRes.json();
                
                if (osmData && osmData.length > 0) {
                    lat = parseFloat(osmData[0].lat);
                    lng = parseFloat(osmData[0].lon);
                    locationName = buildChineseAddressFromOSM(osmData[0].address, osmData[0].display_name, inputVal);
                }
            } catch (osmErr) {
                console.warn("OSM Nominatim failed, falling back to Photon:", osmErr);
            }
            
            // 引擎 3：如果 Nominatim 依然失敗，降級使用 Photon API
            if (!lat || !lng) {
                const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
                const photonRes = await fetch(photonUrl);
                const photonData = await photonRes.json();
                
                if (photonData.features && photonData.features.length > 0) {
                    const coordinates = photonData.features[0].geometry.coordinates;
                    lng = coordinates[0];
                    lat = coordinates[1];
                    
                    const prop = photonData.features[0].properties;
                    const addressParts = [];
                    if (prop.name) addressParts.push(prop.name);
                    if (prop.street) {
                        let streetStr = prop.street;
                        if (prop.housenumber) streetStr = prop.housenumber + " " + streetStr;
                        addressParts.push(streetStr);
                    }
                    if (prop.district) addressParts.push(prop.district);
                    
                    locationName = cleanToChineseOnly(addressParts.filter(Boolean).join(''));
                    if (!locationName) locationName = inputVal;
                }
            }
        }

        if (lat && lng) {
            userCoordinates = { lat, lng };
            currentSearchLocationName = locationName; 
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
            currentSearchLocationName = "您的位置"; 
            renderFilterPills();
            await refreshActiveTabData(false);
        },
        async (error) => {
            console.warn("GPS tracking failed, falling back to Kowloon center coordinates.", error);
            userCoordinates = { lat: 22.3193, lng: 114.1694 };
            currentSearchLocationName = "九龍中心"; 
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
    
    if (currentSearchLocationName) {
        uiSearchTitle.textContent = `${t.searchTitle} (${items.length}) - 近 ${currentSearchLocationName}`; 
    } else {
        uiSearchTitle.textContent = `${t.searchTitle} (${items.length})`; 
    }
    
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

// Haversine 距離計算公式
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

// 數據請求：CORS 代理方案
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

// 請求室內停車場資料
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

// 請求咪錶位資料
async function fetchMeteredParking(lat, lng) {
    // 香港政府咪錶資料之靜態與動態整合查詢 API
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

// 背景靜態獲取預載
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
