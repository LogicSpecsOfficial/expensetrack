/**
 * HTML Templates Generator
 */
const Templates = {
    /**
     * Template for dynamic Expense rows
     */
    expenseItem(expense) {
        return `
            <li class="list-item expense-item" data-id="${expense.id}">
                <div class="item-details">
                    <span class="item-category badge-${expense.category.toLowerCase()}">${expense.category}</span>
                    <span class="item-title">${expense.title}</span>
                </div>
                <div class="item-actions">
                    <span class="item-value font-negative">-$${parseFloat(expense.amount).toFixed(2)}</span>
                    <button class="delete-btn" onclick="app.deleteExpense('${expense.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </li>
        `;
    },

    /**
     * Template for EV Charging Stations Card
     */
    evChargingItem(station) {
        const props = station.properties;
        const coords = station.geometry ? station.geometry.coordinates : null;
        const lat = coords ? coords[1] : '';
        const lng = coords ? coords[0] : '';
        
        // Extract useful attributes from Government Dataset Structure
        const nameEN = props.Location || props.Name_EN || "EV Charging Station";
        const nameZH = props.Name_TC || "";
        const address = props.Address || "Hong Kong";
        const provider = props.Provider || "EPD";
        const chargerType = props.Type || "Standard / Quick";
        const quantity = props.No_of_Charger || "1";

        return `
            <li class="list-item spot-item">
                <div class="item-details">
                    <span class="item-category badge-charging"><i class="fa-solid fa-bolt"></i> EV Station</span>
                    <span class="item-title">${nameEN} <small>${nameZH}</small></span>
                    <span class="item-address"><i class="fa-solid fa-location-dot"></i> ${address}</span>
                    <div class="spot-meta-details">
                        <span><strong>Provider:</strong> ${provider}</span>
                        <span><strong>Type:</strong> ${chargerType} (${quantity} chargers)</span>
                    </div>
                </div>
                ${lat && lng ? `
                <div class="item-actions">
                    <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" class="map-link-btn">
                        <i class="fa-solid fa-map-location-dot"></i> Map
                    </a>
                </div>
                ` : ''}
            </li>
        `;
    },

    /**
     * Template for Public Toilet Card
     */
    toiletItem(toilet) {
        const props = toilet.properties;
        const coords = toilet.geometry ? toilet.geometry.coordinates : null;
        const lat = coords ? coords[1] : '';
        const lng = coords ? coords[0] : '';

        const name = props.Name_EN || "Public Toilet";
        const address = props.Address_EN || "Hong Kong";
        const dynamicMeta = props.With_Barrier_Free_Facilities === "Yes" ? 
            `<span class="badge-accessible"><i class="fa-solid fa-wheelchair"></i> Accessible</span>` : '';

        return `
            <li class="list-item spot-item">
                <div class="item-details">
                    <span class="item-category badge-toilet"><i class="fa-solid fa-restroom"></i> Toilet</span>
                    <span class="item-title">${name}</span>
                    <span class="item-address"><i class="fa-solid fa-location-dot"></i> ${address}</span>
                    <div class="spot-meta-details">
                        ${dynamicMeta}
                    </div>
                </div>
                ${lat && lng ? `
                <div class="item-actions">
                    <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" class="map-link-btn">
                        <i class="fa-solid fa-map-location-dot"></i> Map
                    </a>
                </div>
                ` : ''}
            </li>
        `;
    },

    /**
     * Template for Parking Space Card
     */
    parkingItem(parking) {
        return `
            <li class="list-item spot-item">
                <div class="item-details">
                    <span class="item-category badge-parking"><i class="fa-solid fa-square-parking"></i> Parking</span>
                    <span class="item-title">${parking.name || 'Metered Parking'}</span>
                    <span class="item-address"><i class="fa-solid fa-location-dot"></i> ${parking.address || 'Street Parking'}</span>
                    <div class="spot-meta-details">
                        <span><strong>Vacancy:</strong> ${parking.vacancy || 'Available'}</span>
                    </div>
                </div>
            </li>
        `;
    }
};
