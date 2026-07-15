// === 公眾廁所定位專屬抓取與渲染邏輯 ===

async function fetchToilets(lat, lng) {
    const targetUrl = '/api/toilet-xml';
    const response = await fetch(targetUrl);
    if (!response.ok) {
        throw new Error("無法連接公廁伺服器 (狀態碼: " + response.status + ")");
    }
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    if (xmlDoc.querySelector('parsererror')) {
        throw new Error("XML 語法解析失敗");
    }

    const mapNodes = xmlDoc.getElementsByTagName('map');
    const tempToilets = [];

    for (let i = 0; i < mapNodes.length; i++) {
        const node = mapNodes[i];
        
        const type = node.querySelector('type')?.textContent || '';
        const name = node.querySelector('name_c')?.textContent || '';
        const address = node.querySelector('address_c')?.textContent || '';
        const coordinateText = node.querySelector('map_coordinate')?.textContent || '';

        const isToiletByName = name.includes('公廁') || name.includes('廁所') || name.toLowerCase().includes('toilet');

        if (type === '1' || type === '2' || isToiletByName) {
            let tLat = 0;
            let tLng = 0;

            if (coordinateText) {
                const parts = coordinateText.split(',');
                if (parts.length === 2) {
                    tLat = parseFloat(parts[0].trim());
                    tLng = parseFloat(parts[1].trim());
                }
            }

            if (tLat !== 0 && tLng !== 0) {
                const distance = calcDistance(lat, lng, tLat, tLng);
                tempToilets.push({
                    park_Id: `toilet-${tLat}-${tLng}`, 
                    name: name,
                    address: address,
                    latitude: tLat,
                    longitude: tLng,
                    type: type === '1' ? '公廁' : (type === '2' ? '旱廁' : '設施'),
                    distance: distance
                });
            }
        }
    }

    cachedAllToilets = tempToilets;
    await renderToiletDisplay();
}

function generateToiletCardHTML(toilet) {
    const isFav = favorites.includes(toilet.park_Id);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${toilet.latitude},${toilet.longitude}`;
    
    const cardStatusClass = 'status-high'; 
    const dotClass = 'dot-green';
    
    let distWarningHTML = toilet.distance > 5 ? `<span class="distance-warning">${t.distWarning}</span>` : '';
    const distHTML = toilet.distance !== Infinity ? `<span class="distance">${toilet.distance.toFixed(2)} ${t.away}</span>${distWarningHTML}` : '';

    let typeHTML = (toilet.type && toilet.type !== '設施') ? `
        <div class="info-label">類型:</div><div>${toilet.type}</div>
    ` : '';

    return `
        <div class="carpark-card ${cardStatusClass}">
            <div class="card-body-split">
                <div class="card-left">
                    <div class="carpark-name">
                        <span class="status-dot ${dotClass}"></span>
                        ${toilet.name}
                    </div>
                    <div class="tags-row">${distHTML}</div>
                    <div class="info-grid">
                        <div class="info-label">${t.address || '地址'}:</div><div><a href="${mapUrl}" target="_blank" class="map-link">${toilet.address}</a></div>
                        ${typeHTML}
                    </div>
                </div>
                <div class="card-right">
                    <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${toilet.park_Id}')">${isFav ? t.removeFav : t.addFav}</button>
                    <div style="height: 40px; visibility: hidden;"></div>
                </div>
            </div>
        </div>`;
}

function displayToiletResults(items) {
    statusText.textContent = ""; 
    uiSearchTitle.textContent = `${t.searchTitle} (${items.length})`; 
    
    if (items.length === 0) {
        resultsDiv.innerHTML = `<div class="empty-notice">${t.noRecords}</div>`;
        return;
    }
    resultsDiv.innerHTML = items.map(item => generateToiletCardHTML(item)).join('');
}

async function renderToiletDisplay() {
    if (cachedAllToilets.length > 0) {
        let filteredToilets = [...cachedAllToilets];
        if (activeDistanceFilter !== 'all') {
            const limit = parseFloat(activeDistanceFilter);
            filteredToilets = filteredToilets.filter(item => item.distance <= limit);
        }
        filteredToilets.sort((a, b) => a.distance - b.distance);
        displayToiletResults(filteredToilets.slice(0, 30));
    } else {
        await refreshActiveTabData(false);
    }
}

function getToiletFavHTML() {
    let html = '';
    const favToilets = cachedAllToilets.filter(toilet => favorites.includes(toilet.park_Id));
    favToilets.forEach(toilet => {
        html += generateToiletCardHTML(toilet);
    });
    return html;
}
