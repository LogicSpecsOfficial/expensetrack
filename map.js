// map.js
let leafletLoaded = false;
let meterMap = null;
let meterMarkerGroup = null;

function loadLeaflet() {
    return new Promise((resolve, reject) => {
        if (leafletLoaded) {
            resolve();
            return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
            leafletLoaded = true;
            resolve();
        };
        script.onerror = () => reject(new Error('Failed to load map scripts'));
        document.body.appendChild(script);
    });
}

async function openMeterMap(address) {
    let overlay = document.getElementById('mapOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mapOverlay';
        overlay.className = 'map-overlay';
        overlay.innerHTML = `
            <div id="meterMapCanvas" class="map-canvas"></div>
            <button id="closeMapBtn" class="close-map-btn" aria-label="Close Map">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        `;
        document.body.appendChild(overlay);
        document.getElementById('closeMapBtn').addEventListener('click', closeMeterMap);
    }

    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';

    try {
        await loadLeaflet();
        
        if (typeof cachedAllMeters === 'undefined' || !Array.isArray(cachedAllMeters)) return;
        const spaces = cachedAllMeters.filter(m => m.address === address);
        if (spaces.length === 0) return;

        let target = spaces.find(m => m.vacancyStatus === 'V');
        if (!target) {
            target = spaces.reduce((closest, current) => current.distance < closest.distance ? current : closest, spaces[0]);
        }

        if (!meterMap) {
            meterMap = L.map('meterMapCanvas', {
                zoomControl: false
            }).setView([target.latitude, target.longitude], 18);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(meterMap);

            meterMarkerGroup = L.layerGroup().addTo(meterMap);
        } else {
            meterMarkerGroup.clearLayers();
            meterMap.setView([target.latitude, target.longitude], 18);
        }

        const isDark = document.body.classList.contains('dark-theme');
        const vacantColor = '#198754';
        const occupiedColor = isDark ? '#a0a0a0' : '#6c757d';

        spaces.forEach(m => {
            const isVacant = m.vacancyStatus === 'V';
            const markerColor = isVacant ? vacantColor : occupiedColor;

            const marker = L.circleMarker([m.latitude, m.longitude], {
                radius: 8,
                fillColor: markerColor,
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            });

            const statusText = isVacant ? '空置' : '使用中';
            marker.bindPopup(`<strong>車位編號: ${m.park_Id}</strong><br>狀態: ${statusText}<br>路段: ${m.rawStreet}`);
            meterMarkerGroup.addLayer(marker);
        });

        setTimeout(() => {
            if (meterMap) meterMap.invalidateSize();
        }, 100);

    } catch (err) {
        console.error(err);
        closeMeterMap();
    }
}

function closeMeterMap() {
    const overlay = document.getElementById('mapOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    document.body.style.overflow = '';
}
