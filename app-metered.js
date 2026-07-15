// === 路邊咪錶位專屬渲染邏輯 ===

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

async function renderMeteredDisplay() {
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

function getMeteredFavHTML() {
    let html = '';
    const groupedMeters = groupMeteredParking(cachedAllMeters);
    const favMeters = groupedMeters.filter(meterGroup => favorites.includes(meterGroup.park_Id));
    favMeters.forEach(m => {
        html += generateMeterCardHTML(m);
    });
    return html;
}
