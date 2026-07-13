const KMB_STOPS_API = 'https://data.etabus.gov.hk/v1/transport/kmb/stop';
const CTB_STOPS_API = 'https://rt.data.gov.hk/v2/transport/citybus/stop';

let stopDatabase = [];
let favoriteStops = [];

document.addEventListener('DOMContentLoaded', initApp);
document.getElementById('btn-gps').addEventListener('click', handleGPS);
document.getElementById('btn-search').addEventListener('click', handleSearch);

async function initApp() {
    loadFavorites();
    renderFavorites();
    
    updateStatus('Loading bus stops into cache...');
    try {
        const cached = localStorage.getItem('hk_bus_stops_data');
        const cacheTime = localStorage.getItem('hk_bus_stops_time');
        
        if (cached && cacheTime && (Date.now() - parseInt(cacheTime) < 86400000)) {
            stopDatabase = JSON.parse(cached);
            updateStatus('Ready');
            return;
        }

        updateStatus('Downloading database (First run takes 5s)...');
        const [kmbRes, ctbRes] = await Promise.all([
            fetch(KMB_STOPS_API).then(r => r.json()),
            fetch(CTB_STOPS_API).then(r => r.json())
        ]);

        const kmbStops = (kmbRes.data || []).map(s => ({
            id: s.stop,
            name: s.name_tc || s.name_en,
            lat: parseFloat(s.lat),
            lng: parseFloat(s.long),
            company: 'KMB'
        }));

        const ctbStops = (ctbRes.data || []).map(s => ({
            id: s.stop,
            name: s.name_tc || s.name_en,
            lat: parseFloat(s.lat),
            lng: parseFloat(s.long),
            company: 'CTB'
        }));

        stopDatabase = [...kmbStops, ...ctbStops];
        localStorage.setItem('hk_bus_stops_data', JSON.stringify(stopDatabase));
        localStorage.setItem('hk_bus_stops_time', Date.now().toString());
        updateStatus('Ready');
    } catch (err) {
        console.error(err);
        updateStatus('Failed to download stop data. Refresh page to retry.');
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

async function handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    updateStatus('Searching matching address points...');
    
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}+Hong+Kong&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'MiniHKBusTrackerApp' } });
        const data = await res.json();
        
        if (data && data.length > 0) {
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

function findNearbyStops(lat, lng) {
    updateStatus('Calculating nearest stations...');
    
    const stopsWithDistance = stopDatabase.map(stop => ({
        ...stop,
        distance: getDistance(lat, lng, stop.lat, stop.lng)
    }));

    stopsWithDistance.sort((a, b) => a.distance - b.distance);
    const closestStops = stopsWithDistance.slice(0, 6);

    document.getElementById('results-section').classList.remove('hidden');
    renderStops(closestStops);
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
        let url = '';
        if (company === 'KMB') {
            url = `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${stopId}`;
        } else if (company === 'CTB') {
            url = `https://rt.data.gov.hk/v1/transport/batch/stop-eta/CTB/${stopId}`;
        }

        const res = await fetch(url);
        const json = await res.json();
        displayGenericEta(listContainer, json.data || []);
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div style="color:#ff3b30; font-size:13px;">ETA breakdown failed to load.</div>`;
    }
}

function displayGenericEta(container, etaData) {
    if (etaData.length === 0) {
        container.innerHTML = `<div style="font-size:13px; color:#86868b;">No scheduled buses active.</div>`;
        return;
    }

    const uniqueRoutes = {};
    etaData.forEach(item => {
        const key = `${item.route}_${item.dir}_${item.dest_tc}`;
        if (!uniqueRoutes[key]) uniqueRoutes[key] = [];
        if (item.eta) uniqueRoutes[key].push(item);
    });

    container.innerHTML = '';
    Object.values(uniqueRoutes).forEach(etags => {
        const primary = etags[0];
        const row = document.createElement('div');
        row.className = 'eta-row';
        
        const timesText = etags.slice(0, 3).map(e => calculateMinutes(e.eta)).join(', ');

        row.innerHTML = `
            <span class="bus-no">${primary.route}</span>
            <span class="bus-dest">To: ${primary.dest_tc || primary.dest_en}</span>
            <span class="bus-time">${timesText}</span>
        `;
        container.appendChild(row);
    });
}

function calculateMinutes(etaTimestamp) {
    if (!etaTimestamp) return '-- min';
    const diffMs = new Date(etaTimestamp) - Date.now();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMins <= 0) return 'Arriving';
    return `${diffMins} min`;
}

function updateStatus(msg) {
    document.getElementById('status-msg').innerText = msg;
}
