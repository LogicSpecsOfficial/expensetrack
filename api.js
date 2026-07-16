// ... Keep your existing fetchCarParks and fetchMeteredParking functions at the top of api.js ...

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
    
    let filteredToilets = [...cachedAllToilets];
    if (activeDistanceFilter !== 'all') {
        const limit = parseFloat(activeDistanceFilter);
        filteredToilets = filteredToilets.filter(item => item.distance <= limit);
    }
    filteredToilets.sort((a, b) => a.distance - b.distance);
    displayToiletResults(filteredToilets.slice(0, 30));
}
