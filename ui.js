/**
 * UI State and DOM Manipulation Controller
 */
const UI = {
    // Current Active Tab State
    currentTab: 'expenses',

    // Cached DOM elements
    elements: {
        tabs: null,
        panes: null,
        expenseForm: null,
        expenseList: null,
        totalExpense: null,
        parkingSearchInput: null,
        parkingSearchBtn: null,
        parkingList: null,
        evSearchInput: null,
        evSearchBtn: null,
        evList: null,
        toiletSearchInput: null,
        toiletSearchBtn: null,
        toiletList: null
    },

    init() {
        // Cache DOM Elements
        this.elements.tabs = document.querySelectorAll('.tab-btn');
        this.elements.panes = document.querySelectorAll('.tab-pane');
        this.elements.expenseForm = document.getElementById('expense-form');
        this.elements.expenseList = document.getElementById('expense-list');
        this.elements.totalExpense = document.getElementById('total-expense');
        
        this.elements.parkingSearchInput = document.getElementById('parking-search');
        this.elements.parkingSearchBtn = document.getElementById('parking-search-btn');
        this.elements.parkingList = document.getElementById('parking-list');
        
        this.elements.evSearchInput = document.getElementById('ev-search');
        this.elements.evSearchBtn = document.getElementById('ev-search-btn');
        this.elements.evList = document.getElementById('ev-list');

        this.elements.toiletSearchInput = document.getElementById('toilet-search');
        this.elements.toiletSearchBtn = document.getElementById('toilet-search-btn');
        this.elements.toiletList = document.getElementById('toilet-list');

        this.bindEvents();
    },

    bindEvents() {
        // Tab Navigation click handlers
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
    },

    switchTab(tabId) {
        this.currentTab = tabId;
        
        // Toggle tab button states
        this.elements.tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Toggle pane visibility
        this.elements.panes.forEach(pane => {
            if (pane.id === tabId) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    },

    // Expenses Rendering
    renderExpenses(expenses) {
        if (!this.elements.expenseList) return;
        this.elements.expenseList.innerHTML = '';
        
        if (expenses.length === 0) {
            this.elements.expenseList.innerHTML = '<li class="info-message">No transactions recorded yet.</li>';
            this.elements.totalExpense.textContent = '$0.00';
            return;
        }

        let total = 0;
        expenses.forEach(exp => {
            total += parseFloat(exp.amount);
            this.elements.expenseList.innerHTML += Templates.expenseItem(exp);
        });

        this.elements.totalExpense.textContent = `$${total.toFixed(2)}`;
    },

    // Toilets Renderer
    renderToilets(toilets, filterText = '') {
        if (!this.elements.toiletList) return;
        this.elements.toiletList.innerHTML = '';

        const features = toilets.features || [];
        const filtered = features.filter(item => {
            const address = item.properties.Address_EN || '';
            const name = item.properties.Name_EN || '';
            return address.toLowerCase().includes(filterText.toLowerCase()) || 
                   name.toLowerCase().includes(filterText.toLowerCase());
        });

        if (filtered.length === 0) {
            this.elements.toiletList.innerHTML = '<li class="info-message">No public toilets found matching your search.</li>';
            return;
        }

        // Limit results render to prevent lag on mobile
        filtered.slice(0, 30).forEach(toilet => {
            this.elements.toiletList.innerHTML += Templates.toiletItem(toilet);
        });
    },

    // EV Charging Renderer (New Implementation)
    renderEVCharging(evData, filterText = '') {
        if (!this.elements.evList) return;
        this.elements.evList.innerHTML = '';

        const features = evData.features || [];
        const filtered = features.filter(item => {
            const address = item.properties.Address || '';
            const name = item.properties.Location || item.properties.Name_EN || '';
            return address.toLowerCase().includes(filterText.toLowerCase()) || 
                   name.toLowerCase().includes(filterText.toLowerCase());
        });

        if (filtered.length === 0) {
            this.elements.evList.innerHTML = '<li class="info-message">No matching EV charging stations found.</li>';
            return;
        }

        // Limit rendering to first 30 elements for maximum performance
        filtered.slice(0, 30).forEach(station => {
            this.elements.evList.innerHTML += Templates.evChargingItem(station);
        });
    },

    // Parking Renderer
    renderParking(parkingData) {
        if (!this.elements.parkingList) return;
        this.elements.parkingList.innerHTML = '';
        
        // Render simple mock parking lists directly for representation
        const sampleLocations = [
            { name: "Central Star Ferry Parking Lot", address: "Man Kwong Street, Central", vacancy: "15 Spaces" },
            { name: "Sino Plaza Parking Garage", address: "255 Gloucester Road, Causeway Bay", vacancy: "Full" },
            { name: "Ocean Terminal Car Park", address: "3 Canton Road, Tsim Sha Tsui", vacancy: "42 Spaces" }
        ];

        sampleLocations.forEach(p => {
            this.elements.parkingList.innerHTML += Templates.parkingItem(p);
        });
    }
};
