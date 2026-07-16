// utils.js
function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

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
