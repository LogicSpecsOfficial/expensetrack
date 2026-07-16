// 計算兩個經緯度之間的距離（公里）
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 解析 CSV 格式數據
function parseCSV(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];
    
    const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    let headerIndex = -1;
    let headers = [];
    
    for (let i = 0; i < lines.length; i++) {
        const cleanLine = lines[i].replace(/^\uFEFF/i, '').trim();
        if (!cleanLine) continue;
        const testHeaders = cleanLine.split(splitRegex).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
        
        if (testHeaders.includes('parkingspaceid') || testHeaders.includes('parking_space_id') || testHeaders.includes('occupancystatus')) {
            headerIndex = i;
            headers = testHeaders;
            break;
        }
    }
    
    if (headerIndex === -1) {
        headerIndex = 0;
        headers = lines[0].split(splitRegex).map(h => h.replace(/^\uFEFF/i).replace(/^["']|["']$/g, '').trim().toLowerCase());
    }
    
    const results = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const currentline = line.split(splitRegex);
        if (currentline.length < headers.length) continue;
        
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            const val = currentline[j] ? currentline[j].replace(/^["']|["']$/g, '').trim() : '';
            obj[headers[j]] = val;
        }
        results.push(obj);
    }
    return results;
}

// 代理伺服器抓取文字數據
async function fetchTextThroughProxy(rawUrl, useJSONHeader = false) {
    const fetchOptions = useJSONHeader ? { headers: { 'Accept': 'application/json' } } : {};

    try {
        const res = await fetch(rawUrl, fetchOptions);
        if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 20) return text;
        }
    } catch (e) {
        console.warn("Direct native request failed, applying proxies.");
    }

    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;
        const res = await fetch(proxyUrl, fetchOptions);
        if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 20) return text;
        }
    } catch (e) {
        console.warn("Proxy A failed, trying fallback.");
    }

    try {
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rawUrl)}`;
        const res = await fetch(proxyUrl, fetchOptions);
        if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 20) return text;
        }
    } catch (e) {
        console.warn("Proxy B failed, trying fallback.");
    }

    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rawUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const data = await res.json();
            if (data && data.contents && data.contents.trim().length > 20) return data.contents;
        }
    } catch (e) {
        console.error("All proxies failed.");
    }

    throw new Error("Unable to fetch data through proxy connections.");
}

// 獲取室內停車場數據
async function fetchCarParks(userLat, userLng) {
    const infoUrl = 'https://api.data.gov.hk/v1/carpark-info-vacancy?data=info&lang=zh_TW';
    const vacancyUrl = 'https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&lang=zh_TW';

    const [infoRes, vacancyRes] = await Promise.all([fetch(infoUrl), fetch(vacancyUrl)]);
    if (!infoRes.ok || !vacancyRes.ok) throw new Error("API network failure");
    
    const infoData = await infoRes.json();
    const vacancyData = await vacancyRes.json();

    const vacancyMap = new Map();
    (vacancyData.results || []).forEach(v => vacancyMap.set(v.park_Id, v));

    cachedAllParks = (infoData.results || []).map(park => {
        const distance = calculateDistance(userLat, userLng, park.latitude, park.longitude);
        const liveInfo = vacancyMap.get(park.park_Id);
        return { ...park, distance, liveInfo };
    }).sort((a, b) => a.distance - b.distance);

    await renderActiveTabDisplay();
    renderFavorites();
}

// 獲取路邊咪錶數據
async function fetchMeteredParking(userLat, userLng) {
    const rawInfoUrl = 'https://resource.data.one.gov.hk/td/psiparkingspaces/spaceinfo/parkingspaces.csv';
    const rawVacancyUrl = 'https://resource.data.one.gov.hk/td/psiparkingspaces/occupancystatus/occupancystatus.csv';

    const [infoText, vacancyText] = await Promise.all([
        fetchTextThroughProxy(rawInfoUrl),
        fetchTextThroughProxy(rawVacancyUrl)
    ]);

    const infoRows = parseCSV(infoText);
    const vacancyRows = parseCSV(vacancyText);

    const occupancyMap = new Map();
    vacancyRows.forEach(row => {
        const spaceId = row['parking_space_id'] || row['parkingspaceid'] || '';
        const status = row['occupancy_status'] || row['occupancystatus'] || '';
        if (spaceId) occupancyMap.set(spaceId, status);
    });

    cachedAllMeters = [];
    infoRows.forEach(row => {
        const vehicleType = row['vehicle_type'] || row['vehicletype'] || '';
        if (vehicleType.toUpperCase() !== 'A') return;

        const latVal = row['latitude'] || row['lat'] || '';
        const lngVal = row['longitude'] || row['lng'] || '';
        const lat = parseFloat(latVal);
        const lng = parseFloat(lngVal);
        if (isNaN(lat) || isNaN(lng)) return;

        const distance = calculateDistance(userLat, userLng, lat, lng);
        const spaceId = row['parking_space_id'] || row['parkingspaceid'] || '';
        const status = occupancyMap.get(spaceId) || 'V';

        const streetTc = row['street_tc'] || '';
        const districtTc = row['district_tc'] || '';

        cachedAllMeters.push({
            park_Id: spaceId,
            name: `${streetTc} ${spaceId}`,
            address: `${districtTc} ${streetTc}`,
            district: districtTc,
            latitude: lat,
            longitude: lng,
            distance: distance,
            vacancyStatus: status,
            rawStreet: streetTc,
            rawDistrict: districtTc
        });
    });

    cachedAllMeters.sort((a, b) => a.distance - b.distance);
    
    await renderActiveTabDisplay();
    renderFavorites();
}

// 背景靜態加載收藏夾數據
async function silentFetchData() {
    try {
        const infoUrl = 'https://api.data.gov.hk/v1/carpark-info-vacancy?data=info&lang=zh_TW';
        const vacancyUrl = 'https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&lang=zh_TW';
        const [infoRes, vacancyRes] = await Promise.all([fetch(infoUrl), fetch(vacancyUrl)]);
        if (infoRes.ok && vacancyRes.ok) {
            const infoData = await infoRes.json();
            const vacancyData = await vacancyRes.json();
            const vacancyMap = new Map();
            (vacancyData.results || []).forEach(v => vacancyMap.set(v.park_Id, v));
            cachedAllParks = (infoData.results || []).map(p => ({ ...p, distance: Infinity, liveInfo: vacancyMap.get(p.park_Id) }));
            renderFavorites();
        }
    } catch (e) {}
}
