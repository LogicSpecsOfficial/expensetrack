// api.js
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// 恢復至完全穩定的 CSV 解析邏輯，確保大小寫相容性與正確清除 BOM 字元
function parseCSV(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];
    const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    let headerIndex = -1; let headers = [];
    for (let i = 0; i < lines.length; i++) {
        const cleanLine = lines[i].replace(/^\uFEFF/i, '').trim();
        if (!cleanLine) continue;
        const testHeaders = cleanLine.split(splitRegex).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
        if (testHeaders.includes('parkingspaceid') || testHeaders.includes('parking_space_id') || testHeaders.includes('occupancystatus')) {
            headerIndex = i; headers = testHeaders; break;
        }
    }
    if (headerIndex === -1) {
        headerIndex = 0; headers = lines[0].split(splitRegex).map(h => h.replace(/^\uFEFF/i, '').replace(/^["']|["']$/g, '').trim().toLowerCase());
    }
    const results = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const currentline = lines[i].split(splitRegex); if (currentline.length < headers.length) continue;
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j] ? currentline[j].replace(/^["']|["']$/g, '').trim() : '';
        }
        results.push(obj);
    }
    return results;
}

async function fetchTextThroughProxy(rawUrl, useJSONHeader = false) {
    const fetchOptions = useJSONHeader ? { headers: { 'Accept': 'application/json' } } : {};
    try { const res = await fetch(rawUrl, fetchOptions); if (res.ok) return await res.text(); } catch (e) {}
    const proxies = [`https://corsproxy.io/?${encodeURIComponent(rawUrl)}`, `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rawUrl)}`];
    for (let proxy of proxies) { try { const res = await fetch(proxy, fetchOptions); if (res.ok) return await res.text(); } catch (e) {} }
    try { const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rawUrl)}`); if (res.ok) { const data = await res.json(); return data.contents; } } catch (e) {}
    throw new Error("Unable to fetch data through proxy connections.");
}

function getPrivateCarHourlyFees(park) {
    if (!park || !park.rents || !Array.isArray(park.rents)) return null;
    const rates = [];
    for (let i = 0; i < park.rents.length; i++) {
        const r = park.rents[i];
        if (!r) continue;
        const vType = String(r.vehicleType || '').toLowerCase();
        const rType = String(r.rentType || '').toLowerCase();
        const isPrivateCar = vType.includes('private car') || vType.includes('私家車') || vType.includes('pc');
        const isHourly = rType.includes('hourly') || rType.includes('時租');
        if (isPrivateCar && isHourly && r.rate) {
            rates.push(r.rate);
        }
    }
    return rates.length > 0 ? rates : null;
}

async function fetchCarParks(userLat, userLng) {
    const [infoRes, vacancyRes] = await Promise.all([fetch('https://api.data.gov.hk/v1/carpark-info-vacancy?data=info&lang=zh_TW'), fetch('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&lang=zh_TW')]);
    if (!infoRes.ok || !vacancyRes.ok) throw new Error("API network failure");
    const infoData = await infoRes.json(), vacancyData = await vacancyRes.json(), vacancyMap = new Map();
    (vacancyData.results || []).forEach(v => vacancyMap.set(v.park_Id, v));
    
    const filteredParks = [];
    (infoData.results || []).forEach(park => {
        const fees = getPrivateCarHourlyFees(park);
        if (fees && fees.length > 0) {
            filteredParks.push({
                ...park,
                distance: calculateDistance(userLat, userLng, park.latitude, park.longitude),
                liveInfo: vacancyMap.get(park.park_Id),
                privateCarHourlyFees: fees
            });
        }
    });
    cachedAllParks = filteredParks.sort((a, b) => a.distance - b.distance);
    await renderActiveTabDisplay(); renderFavorites();
}

async function fetchMeteredParking(userLat, userLng) {
    const [infoText, vacancyText] = await Promise.all([fetchTextThroughProxy('https://resource.data.one.gov.hk/td/psiparkingspaces/spaceinfo/parkingspaces.csv'), fetchTextThroughProxy('https://resource.data.one.gov.hk/td/psiparkingspaces/occupancystatus/occupancystatus.csv')]);
    const infoRows = parseCSV(infoText), vacancyRows = parseCSV(vacancyText), occupancyMap = new Map();
    vacancyRows.forEach(row => { const spaceId = row['parking_space_id'] || row['parkingspaceid'] || ''; if (spaceId) occupancyMap.set(spaceId, row['occupancy_status'] || row['occupancystatus'] || ''); });
    cachedAllMeters = [];
    infoRows.forEach(row => {
        if ((row['vehicle_type'] || row['vehicletype'] || '').toUpperCase() !== 'A') return;
        const lat = parseFloat(row['latitude'] || row['lat'] || ''), lng = parseFloat(row['longitude'] || row['lng'] || ''); if (isNaN(lat) || isNaN(lng)) return;
        const spaceId = row['parking_space_id'] || row['parkingspaceid'] || '';
        cachedAllMeters.push({ park_Id: spaceId, name: `${row['street_tc'] || ''} ${spaceId}`, address: `${row['district_tc'] || ''} ${row['street_tc'] || ''}`, district: row['district_tc'] || '', latitude: lat, longitude: lng, distance: calculateDistance(userLat, userLng, lat, lng), vacancyStatus: occupancyMap.get(spaceId) || 'V', rawStreet: row['street_tc'] || '', rawDistrict: row['district_tc'] || '' });
    });
    cachedAllMeters.sort((a, b) => a.distance - b.distance);
    await renderActiveTabDisplay(); renderFavorites();
}

async function fetchToilets(lat, lng) {
    const response = await fetch('/api/toilet-xml'); if (!response.ok) throw new Error("公廁服務器連接失敗");
    const xmlText = await response.text(), xmlDoc = (new DOMParser()).parseFromString(xmlText, "text/xml");
    const mapNodes = xmlDoc.getElementsByTagName('map'), tempToilets = [];
    for (let i = 0; i < mapNodes.length; i++) {
        const node = mapNodes[i], name = node.querySelector('name_c')?.textContent || '', type = node.querySelector('type')?.textContent || '';
        if (type === '1' || type === '2' || name.includes('公廁') || name.includes('廁所')) {
            const coord = (node.querySelector('map_coordinate')?.textContent || '').split(',');
            if (coord.length === 2) {
                const tLat = parseFloat(coord[0].trim()), tLng = parseFloat(coord[1].trim());
                if (tLat && tLng) tempToilets.push({ park_Id: `toilet-${tLat}-${tLng}`, name: name, address: node.querySelector('address_c')?.textContent || '', latitude: tLat, longitude: tLng, type: type === '1' ? '公廁' : (type === '2' ? '旱廁' : '設施'), distance: calculateDistance(lat, lng, tLat, tLng) });
            }
        }
    }
    cachedAllToilets = tempToilets; await renderActiveTabDisplay(); renderFavorites();
}

async function silentFetchData() {
    try {
        const [infoRes, vacancyRes] = await Promise.all([fetch('https://api.data.gov.hk/v1/carpark-info-vacancy?data=info&lang=zh_TW'), fetch('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&lang=zh_TW')]);
        if (infoRes.ok && vacancyRes.ok) {
            const infoData = await infoRes.json(), vacancyData = await vacancyRes.json(), vacancyMap = new Map();
            (vacancyData.results || []).forEach(v => vacancyMap.set(v.park_Id, v));
            
            const filteredParks = [];
            (infoData.results || []).forEach(p => {
                const fees = getPrivateCarHourlyFees(p);
                if (fees && fees.length > 0) {
                    filteredParks.push({
                        ...p,
                        distance: Infinity,
                        liveInfo: vacancyMap.get(p.park_Id),
                        privateCarHourlyFees: fees
                    });
                }
            });
            cachedAllParks = filteredParks;
            renderFavorites();
        }
    } catch (e) {}
}
