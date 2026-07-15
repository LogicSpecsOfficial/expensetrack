// === 室內停車場專屬渲染邏輯 ===

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

async function renderOffstreetDisplay() {
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
}

function getOffstreetFavHTML() {
    let html = '';
    const favOffstreet = cachedAllParks.filter(park => favorites.includes(park.park_Id));
    favOffstreet.forEach(p => {
        html += generateCardHTML(p);
    });
    return html;
}
