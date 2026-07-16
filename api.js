/**
 * API Service for interacting with HK CSDI / Gov Data endpoints
 */
const APIService = {
    // API Endpoints
    urls: {
        parking: 'https://api.data.gov.hk/v1/carpark-info-vacancy', // Example placeholder API
        toilets: 'https://geodata.gov.hk/gs/api/v1.0.0/dev/gis/fehd/public-toilet',
        evCharging: 'https://geodata.gov.hk/gs/api/v1.0.0/dev/gis/epd/ev-charging-stations'
    },

    /**
     * Helper to perform fetch requests safely
     */
    async fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Fetch Error:", error);
            throw error;
        }
    },

    /**
     * Fetch public toilets GeoJSON data
     */
    async getPublicToilets() {
        return await this.fetchData(this.urls.toilets);
    },

    /**
     * Fetch EV Charging Stations GeoJSON data
     */
    async getEVChargingStations() {
        return await this.fetchData(this.urls.evCharging);
    },

    /**
     * Fetch Metered Parking spots or vacancies
     */
    async getMeteredParking() {
        // Fallback demo/mock endpoint since actual CSDI endpoints can require coordinate requests
        try {
            const res = await fetch('https://api.data.gov.hk/v1/carpark-info-vacancy');
            return await res.json();
        } catch (e) {
            console.warn("Parking API failed. Generating mock visual items.", e);
            return null;
        }
    }
};
