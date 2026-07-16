/**
 * Main Application Controller
 */
const app = {
    expenses: [],
    toiletsData: null,
    evData: null,

    init() {
        // Initialize UI Elements & Triggers
        UI.init();

        // Load local records
        this.loadExpenses();

        // Bind Custom Actions
        this.bindEvents();

        // Warm up / Preload HK data
        this.preloadMapResources();
    },

    bindEvents() {
        // Handle new expense additions
        if (UI.elements.expenseForm) {
            UI.elements.expenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addExpense();
            });
        }

        // Handle Toilet Search Click & Enter Key
        if (UI.elements.toiletSearchBtn) {
            UI.elements.toiletSearchBtn.addEventListener('click', () => this.searchToilets());
        }
        if (UI.elements.toiletSearchInput) {
            UI.elements.toiletSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchToilets();
            });
        }

        // Handle EV Charging Search Click & Enter Key
        if (UI.elements.evSearchBtn) {
            UI.elements.evSearchBtn.addEventListener('click', () => this.searchEVCharging());
        }
        if (UI.elements.evSearchInput) {
            UI.elements.evSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchEVCharging();
            });
        }

        // Handle Parking Search Trigger
        if (UI.elements.parkingSearchBtn) {
            UI.elements.parkingSearchBtn.addEventListener('click', () => {
                UI.renderParking();
            });
        }
    },

    async preloadMapResources() {
        try {
            // Lazy load government files in background to prevent mobile network lag
            this.toiletsData = await APIService.getPublicToilets();
            this.evData = await APIService.getEVChargingStations();
        } catch (e) {
            console.warn("Preloading geospatial data failed. Checking active offline caches...", e);
        }
    },

    // --- Search Handlers ---
    async searchToilets() {
        const query = UI.elements.toiletSearchInput.value.trim();
        if (!this.toiletsData) {
            UI.elements.toiletList.innerHTML = '<li class="info-message"><i class="fa-solid fa-spinner fa-spin"></i> Downloading database...</li>';
            try {
                this.toiletsData = await APIService.getPublicToilets();
            } catch (error) {
                UI.elements.toiletList.innerHTML = '<li class="info-message font-negative">Failed to load public toilet data.</li>';
                return;
            }
        }
        UI.renderToilets(this.toiletsData, query);
    },

    async searchEVCharging() {
        const query = UI.elements.evSearchInput.value.trim();
        if (!this.evData) {
            UI.elements.evList.innerHTML = '<li class="info-message"><i class="fa-solid fa-spinner fa-spin"></i> Fetching charging station data...</li>';
            try {
                this.evData = await APIService.getEVChargingStations();
            } catch (error) {
                UI.elements.evList.innerHTML = '<li class="info-message font-negative">Failed to load charging station data.</li>';
                return;
            }
        }
        UI.renderEVCharging(this.evData, query);
    },

    // --- Expense Handler Actions ---
    loadExpenses() {
        const data = localStorage.getItem('expenses');
        this.expenses = data ? JSON.parse(data) : [];
        UI.renderExpenses(this.expenses);
    },

    addExpense() {
        const titleInput = document.getElementById('expense-title');
        const amountInput = document.getElementById('expense-amount');
        const categoryInput = document.getElementById('expense-category');

        const newExpense = {
            id: 'exp_' + Date.now(),
            title: titleInput.value.trim(),
            amount: parseFloat(amountInput.value),
            category: categoryInput.value,
            date: new Date().toISOString()
        };

        this.expenses.unshift(newExpense);
        this.saveExpenses();
        
        // Reset and update visual components
        titleInput.value = '';
        amountInput.value = '';
        UI.renderExpenses(this.expenses);
    },

    deleteExpense(id) {
        this.expenses = this.expenses.filter(item => item.id !== id);
        this.saveExpenses();
        UI.renderExpenses(this.expenses);
    },

    saveExpenses() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
    }
};

// Start application
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
