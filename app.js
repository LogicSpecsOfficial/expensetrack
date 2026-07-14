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
            
            // 更精確地提取政府地址，避免抓到 JSON 括號 [{
            let addrMatch = responseText.match(/"SuggestedAddress"\s*:\s*"([^"]+)"/i) 
                            || responseText.match(/"EngChiAddress"\s*:\s*"([^"]+)"/i)
                            || responseText.match(/<SuggestedAddress>([^<]+)<\/SuggestedAddress>/i);
                            
            if (addrMatch && addrMatch[1] && !addrMatch[1].includes('[{')) {
                locationName = addrMatch[1].trim();
            } else {
                locationName = inputVal; // 如果擷取失敗或格式異常，直接顯示使用者輸入的字詞
            }
        } else {
            // 引擎 2：政府無結果，背景靜默啟用 Photon API 智慧搜尋
            const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
            const photonRes = await fetch(photonUrl);
            const photonData = await photonRes.json();
            
            if (photonData.features && photonData.features.length > 0) {
                const coordinates = photonData.features[0].geometry.coordinates;
                lng = coordinates[0];
                lat = coordinates[1];
                
                const prop = photonData.features[0].properties;
                // 優先使用地標名稱，否則使用街道與城市組合
                locationName = prop.name || [prop.street, prop.city].filter(Boolean).join(', ');
                
                // 如果 Photon 回傳的名稱依然是空的，回退到使用者輸入的關鍵字
                if (!locationName) locationName = inputVal;
            }
        }

        if (lat && lng) {
            userCoordinates = { lat, lng };
            currentSearchLocationName = locationName; // 儲存乾淨的定位點名稱
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
