const KMB_STOPS_API = 'https://data.etabus.gov.hk/v1/transport/kmb/stop';
const KMB_STOP_ETA = 'https://data.etabus.gov.hk/v1/transport/kmb/stop-eta';

let stopDatabase = [];
let favoriteStops = [];
let searchHistory = [];

document.addEventListener('DOMContentLoaded', initApp);
document.getElementById('btn-gps').addEventListener('click', handleGPS);
document.getElementById('btn-search').addEventListener('click', () => {
    const query = document.getElementById('search-input').value.trim();
    executeSearch(query);
});
document.getElementById('toggle-out-of-service').addEventListener('change', refreshCurrentViews);

async function initApp() {
    loadFavorites();
    renderFavorites();
    loadSearchHistory();
    renderSearchHistory();
    
    updateStatus('Loading bus stops into cache...');
    try {
        const cacheKey = 'hk_bus_stops_v9_data';
        const cacheTimeKey = 'hk_bus_stops_v9_time';
        
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);
        
        if (cached && cacheTime && (Date.now() - parseInt(cacheTime) < 86400000)) {
            stopDatabase = JSON.parse(cached);
            updateStatus('Ready');
            return;
        }

        updateStatus('Downloading transit databases...');
        
        // 1. Fetch KMB data independently
        let kmbStops = [];
        try {
            const res = await fetch(KMB_STOPS_API);
            const json = await res.json();
            if (json && json.data) {
                kmbStops = json.data.map(s => ({
                    id: s.stop,
                    name: s.name_tc || s.name_en,
                    lat: parseFloat(s.lat),
                    lng: parseFloat(s.long || s.lng),
                    company: 'KMB'
                }));
            }
        } catch (e) {
            console.error('KMB fetch failed:', e);
        }

        // 2. Fetch Citybus data independently using a secure backend text wrapper
        let ctbStops = [];
        try {
            const targetUrl = encodeURIComponent('https://rt.data.gov.hk/v2/transport/citybus/stop');
            const res = await fetch(`https://api.allorigins.win/get?url=${targetUrl}`);
            const wrapper = await res.json();
            if (wrapper && wrapper.contents) {
                const json = JSON.parse(wrapper.contents);
                if (json && json.data) {
                    ctbStops = json.data.map(s => ({
                        id: s.stop,
                        name: s.name_tc || s.name_en,
                        lat: parseFloat(s.lat),
                        lng: parseFloat(s.long || s.lng),
                        company: 'CTB'
                    }));
                }
            }
        } catch (e) {
            console.error('Citybus fetch failed:', e);
        }

        // Combine whichever dataset successfully downloaded
        stopDatabase = [...kmbStops, ...ctbStops];

        if (stopDatabase.length > 0) {
            localStorage.setItem(cacheKey, JSON.stringify(stopDatabase));
            localStorage.setItem(cacheTimeKey, Date.now().toString());
            updateStatus(`Ready (${kmbStops.length} KMB, ${ctbStops.length} CTB stops loaded)`);
        } else {
            updateStatus('Failed to download transit data. Check network connection.');
        }
    } catch (err) {
        console.error(err);
        updateStatus('System initialization failed.');
    }
}

function loadFavorites() {
    const cachedFavs = localStorage.getItem('hk_bus_user_favs');
    if (cachedFavs) {
        favoriteStops = JSON.parse(cachedFavs);
    }
}

function saveFavorites() {
    localStorage.setItem('hk_bus_user_favs', JSON.stringify(favoriteStops));
}

function toggleFavorite(stop) {
    const index = favoriteStops.findIndex(f => f.id === stop.id && f.company === stop.company);
    if (index > -1) {
        favoriteStops.splice(index, 1);
    } else {
        favoriteStops.push({
            id: stop.id,
            name: stop.name,
            company: stop.company,
            lat: stop.lat,
            lng: stop.lng
        });
    }
    saveFavorites();
    renderFavorites();
    
    const starBtn = document.querySelector(`#stops-container [data-id="${stop.company}-${stop.id}"]`);
    if (starBtn) starBtn.classList.toggle('active');
}

function renderFavorites() {
    const container = document.getElementById('fav-container');
    const section = document.getElementById('fav-section');
    container.innerHTML = '';

    if (favoriteStops.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    favoriteStops.forEach(stop => {
        const card = createStopCard(stop, true);
        container.appendChild(card);
        fetchETA(stop.company, stop.id, true);
    });
}

function loadSearchHistory() {
    const cachedHistory = localStorage.getItem('hk_bus_search_history');
    if (cachedHistory) {
        searchHistory = JSON.parse(cachedHistory);
    }
}

function saveSearchHistory(query) {
    if (!query) return;
    searchHistory = searchHistory.filter(h => h !== query);
    searchHistory.unshift(query);
    if (searchHistory.length > 5) {
        searchHistory.pop();
    }
    localStorage.setItem('hk_bus_search_history', JSON.stringify(searchHistory));
    renderSearchHistory();
}

function renderSearchHistory() {
    const container = document.getElementById('history-list');
    container.innerHTML = '';
    searchHistory.forEach(query => {
        const tag = document.createElement('span');
        tag.className = 'history-tag';
        tag.innerText = query;
        tag.addEventListener('click', () => {
            document.getElementById('search-input').value = query;
            executeSearch(query);
        });
        container.appendChild(tag);
    });
}

function handleGPS() {
    if (!navigator.geolocation) {
        updateStatus('Geolocation not supported by device.');
        return;
    }
    updateStatus('Acquiring location coordinates...');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            findNearbyStops(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
            updateStatus('GPS access denied or timed out.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

async function executeSearch(query) {
    if (!query) return;
    updateStatus('Searching matching address points...');
    
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}+Hong+Kong&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'MiniHKBusTrackerApp' } });
        const data = await res.json();
        
        if (data && data.length > 0) {
            saveSearchHistory(query);
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            findNearbyStops(lat, lon);
        } else {
            updateStatus('No results found for that address.');
        }
    } catch (err) {
        updateStatus('Search system error occurred.');
    }
}

let lastCoordinates = null;

function findNearbyStops(lat, lng) {
    lastCoordinates = { lat, lng };
    updateStatus('Calculating nearest stations...');
    
    const stopsWithDistance = stopDatabase.map(stop => ({
        ...stop,
        distance: getDistance(lat, lng, stop.lat, stop.lng)
    }));

    const kmbStops = stopsWithDistance.filter(s => s.company === 'KMB' && !isNaN(s.distance));
    const ctbStops = stopsWithDistance.filter(s => s.company === 'CTB' && !isNaN(s.distance));

    kmbStops.sort((a, b) => a.distance - b.distance);
    ctbStops.sort((a, b) => a.distance - b.distance);

    const closestKmb = kmbStops.slice(0, 3);
    const closestCtb = ctbStops.slice(0, 3);

    const combinedStops = [...closestKmb, ...closestCtb];
    combinedStops.sort((a, b) => a.distance - b.distance);

    document.getElementById('results-section').classList.remove('hidden');
    renderStops(combinedStops);
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

function refreshCurrentViews() {
    renderFavorites();
    if (lastCoordinates) {
        findNearbyStops(lastCoordinates.lat, lastCoordinates.lng);
    }
}

function createStopCard(stop, isFavSection = false) {
    const stopEl = document.createElement('div');
    stopEl.className = `stop-card ${stop.company.toLowerCase()}`;
    
    const prefix = isFavSection ? 'fav' : 'res';
    const isSaved = favoriteStops.some(f => f.id === stop.id && f.company === stop.company);
    const distanceSpan = stop.distance !== undefined ? `<span class="stop-dist">${Math.round(stop.distance)}m away</span>` : '';

    stopEl.innerHTML = `
        <div class="stop-header">
            <div class="stop-info">
                <span class="stop-name">[${stop.company}] ${stop.name}</span>
                ${distanceSpan}
            </div>
            <button class="btn-fav ${isSaved ? 'active' : ''}" data-id="${stop.company}-${stop.id}">★</button>
        </div>
        <div id="eta-list-${prefix}-${stop.company}-${stop.id}" class="eta-list">
            <div style="font-size:13px; color:#86868b; padding:4px 0;">Querying live ETA data...</div>
        </div>
    `;

    stopEl.querySelector('.btn-fav').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(stop);
    });

    return stopEl;
}

function renderStops(stops) {
    const container = document.getElementById('stops-container');
    container.innerHTML = '';
    updateStatus(`Displaying nearest ${stops.length} stops.`);

    stops.forEach(stop => {
        const card = createStopCard(stop, false);
        container.appendChild(card);
        fetchETA(stop.company, stop.id, false);
    });
}

async function fetchETA(company, stopId, isFavSection) {
    const prefix = isFavSection ? 'fav' : 'res';
    const listContainer = document.getElementById(`eta-list-${prefix}-${company}-${stopId}`);
    if (!listContainer) return;

    try {
        let etaData = [];
        if (company === 'KMB') {
            const res = await fetch(`${KMB_STOP_ETA}/${stopId}`);
            const json = await res.json();
            etaData = json.data || [];
        } else if (company === 'CTB') {
            const targetUrl = encodeURIComponent(`https://rt.data.gov.hk/v1/transport/batch/stop-eta/CTB/${stopId}`);
            const res = await fetch(`https://api.allorigins.win/get?url=${targetUrl}`);
            const wrapper = await res.json();
            if (wrapper && wrapper.contents) {
                const json = JSON.parse(wrapper.contents);
                etaData = json.data || [];
            }
        }
        displayGenericEta(listContainer, etaData, company);
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div style="color:#ff3b30; font-size:13px;">ETA breakdown failed to load.</div>`;
    }
}

function displayGenericEta(container, etaData, company) {
    const hideOutOfService = document.getElementById('toggle-out-of-service').checked;
    
    const uniqueRoutes = {};
    etaData.forEach(item => {
        const key = `${item.route}_${item.dir}_${item.dest_tc}`;
        if (!uniqueRoutes[key]) uniqueRoutes[key] = [];
        uniqueRoutes[key].push(item);
    });

    let renderedCount = 0;
    let routeColor = '#1d1d1f';
    if (company === 'KMB') routeColor = '#d9383a';
    if (company === 'CTB') routeColor = '#0055b3';

    container.innerHTML = '';

    Object.values(uniqueRoutes).forEach(etags => {
        const activeEntries = etags.filter(e => e.eta);
        
        if (hideOutOfService && activeEntries.length === 0) {
            return;
        }

        renderedCount++;
        const primary = etags[0];
        const row = document.createElement('div');
        row.className = 'eta-row';
        row.style.alignItems = 'flex-start';
        
        let timesHtml = '';
        if (activeEntries.length === 0) {
            timesHtml = `<div style="font-size: 13px; color: #86868b; font-style: italic; padding-top:2px;">No service</div>`;
        } else {
            activeEntries.slice(0, 3).forEach((e, idx) => {
                const formatted = formatEta(e.eta);
                if (idx === 0) {
                    timesHtml += `<div style="font-weight: 600; font-size: 16px; color: #00802b;">${formatted}</div>`;
                } else {
                    timesHtml += `<div style="font-size: 13px; color: #86868b; margin-top: 4px; padding-top: 4px; border-top: 1px dotted #e8e8ed;">${formatted}</div>`;
                }
            });
        }

        row.innerHTML = `
            <span class="bus-no" style="color: ${routeColor};">${primary.route}</span>
            <span class="bus-dest" style="padding-top: 2px;">To: ${primary.dest_tc || primary.dest_en}</span>
            <span class="bus-time" style="line-height: 1.2; text-align: right; min-width: 110px;">${timesHtml}</span>
        `;
        container.appendChild(row);
    });

    if (renderedCount === 0) {
        container.innerHTML = `<div style="font-size:13px; color:#86868b; padding:4px 0; font-style: italic;">No active routes matching filter preferences.</div>`;
    }
}

function formatEta(etaTimestamp) {
    if (!etaTimestamp) return '--:--';
    const etaDate = new Date(etaTimestamp);
    const diffMs = etaDate - Date.now();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    
    const hours = String(etaDate.getHours()).padStart(2, '0');
    const mins = String(etaDate.getMinutes()).padStart(2, '0');
    const clockTime = `${hours}:${mins}`;

    if (diffMins <= 0) return `${clockTime} (Arv)`;
    return `${clockTime} (${diffMins}m)`;
}

function updateStatus(msg) {
    document.getElementById('status-msg').innerText = msg;
}
