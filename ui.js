// ui.js
const filterContainer = document.getElementById('filter-container');
const resultsDiv = document.getElementById('results');
const favoritesList = document.getElementById('favoritesList');

function renderFilterPills() {
    if (!userCoordinates) { filterContainer.style.display = 'none'; return; }
    filterContainer.style.display = 'flex';
    let distHTML = `<div class="filter-row">` + ['0.5', '1', '2', 'all'].map(v => `<button class="pill-btn color-blue ${activeDistanceFilter === v ? 'active' : ''}" onclick="setDistanceFilter('${v}')">${v === 'all' ? t.distAll : (v === '0.5' ? t.dist500m : t['dist' + v + 'km'])}</button>`).join('') + `</div>`;
    let statusHTML = '';
    if (currentTab === 'offstreet') {
        statusHTML = `<div class="filter-row">
            <button class="pill-btn color-red ${offstreetFilters.hideFull ? 'active' : ''}" onclick="toggleOffstreetFilter('hideFull')">${t.optHideFull}</button>
            <button class="pill-btn color-green ${offstreetFilters.evOnly ? 'active' : ''}" onclick="toggleOffstreetFilter('evOnly')">${t.optEVOnly}</button>
            <button class="pill-btn color-blue ${offstreetFilters.sortByVacancy ? 'active' : ''}" onclick="toggleOffstreetFilter('sortByVacancy')">${t.optSortVacancy}</button>
        </div>`;
    } else if (currentTab === 'metered') {
        statusHTML = `<div class="filter-row">` + ['all', 'vacant', 'occupied'].map(v => `<button class="pill-btn ${v === 'all' ? 'color-blue' : (v === 'vacant' ? 'color-green' : 'color-red')} ${activeMeterFilter === v ? 'active' : ''}" onclick="setMeterFilter('${v}')">${t['opt' + v.charAt(0).toUpperCase() + v.slice(1)]}</button>`).join('') + `</div>`;
    }
    filterContainer.innerHTML = distHTML + statusHTML;
}

async function switchTab(tabName) {
    currentTab = tabName;
    ['tabOffStreet', 'tabMetered', 'tabToilet'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('active'); });
    const activeEl = document.getElementById(currentTab === 'offstreet' ? 'tabOffStreet' : (currentTab === 'metered' ? 'tabMetered' : 'tabToilet'));
    if (activeEl) activeEl.classList.add('active');
    renderFilterPills(); renderFavorites(); await renderActiveTabDisplay();
}

function toggleOffstreetFilter(filterName) { offstreetFilters[filterName] = !offstreetFilters[filterName]; renderFilterPills(); renderActiveTabDisplay(); }
function setMeterFilter(filterValue) { activeMeterFilter = filterValue; renderFilterPills(); renderActiveTabDisplay(); }
function setDistanceFilter(distanceValue) { activeDistanceFilter = distanceValue; renderFilterPills(); renderActiveTabDisplay(); }

async function renderActiveTabDisplay() {
    if (!userCoordinates) return;
    if (currentTab === 'offstreet') {
        if (cachedAllParks.length > 0) {
            let filtered = [...cachedAllParks];
            if (activeDistanceFilter !== 'all') filtered = filtered.filter(p => p.distance <= parseFloat(activeDistanceFilter));
            if (offstreetFilters.hideFull) filtered = filtered.filter(p => getVacancyCount(p) !== 0);
            if (offstreetFilters.evOnly) filtered = filtered.filter(p => hasEVCharging(p));
            filtered.sort((a, b) => offstreetFilters.sortByVacancy ? (getVacancyCount(b) - getVacancyCount(a) || a.distance - b.distance) : a.distance - b.distance);
            displayResults(filtered.slice(0, 30), false);
        } else { await refreshActiveTabData(false); }
    } else if (currentTab === 'metered') {
        if (cachedAllMeters.length > 0) {
            let grouped = groupMeteredParking(cachedAllMeters);
            if (activeDistanceFilter !== 'all') grouped = grouped.filter(m => m.distance <= parseFloat(activeDistanceFilter));
            if (activeMeterFilter === 'vacant') grouped = grouped.filter(m => m.vacantSpaces > 0);
            else if (activeMeterFilter === 'occupied') grouped = grouped.filter(m => m.vacantSpaces === 0);
            displayResults(grouped.slice(0, 30), true);
        } else { await refreshActiveTabData(false); }
    } else if (currentTab === 'toilet') {
        if (cachedAllToilets.length > 0) {
            let filtered = [...cachedAllToilets];
            if (activeDistanceFilter !== 'all') filtered = filtered.filter(item => item.distance <= parseFloat(activeDistanceFilter));
            filtered.sort((a, b) => a.distance - b.distance);
            displayToiletResults(filtered.slice(0, 30));
        } else { await refreshActiveTabData(false); }
    }
}

function renderSearchHistory() {
    const wrapper = document.getElementById('history-wrapper'), chips = document.getElementById('historyChips');
    if (searchHistory.length === 0) { wrapper.style.display = 'none'; return; }
    wrapper.style.display = 'flex'; chips.innerHTML = searchHistory.map(item => `<button class="history-chip" onclick="triggerAddressSearch('${item.replace(/'/g, "\\'")}')">${item}</button>`).join('');
}

function displayResults(items, isMeter = false) {
    const statusText = document.getElementById('status'); if (statusText) statusText.textContent = ""; 
    document.getElementById('ui-search-title').textContent = `${t.searchTitle} (${items.length})`;
    resultsDiv.innerHTML = items.length === 0 ? `<div class="empty-notice">${t.noRecords}</div>` : items.map(item => isMeter ? generateMeterCardHTML(item) : generateCardHTML(item)).join('');
}

function displayToiletResults(items) {
    const statusText = document.getElementById('status'); if (statusText) statusText.textContent = ""; 
    document.getElementById('ui-search-title').textContent = `${t.searchTitle} (${items.length})`;
    resultsDiv.innerHTML = items.length === 0 ? `<div class="empty-notice">${t.noRecords}</div>` : items.map(item => generateToiletCardHTML(item)).join('');
}

function renderFavorites() {
    if (favorites.length === 0) { favoritesList.innerHTML = `<div class="empty-notice">${t.noFavs}</div>`; return; }
    let html = '';
    if (currentTab === 'offstreet') cachedAllParks.filter(p => favorites.includes(p.park_Id)).forEach(p => html += generateCardHTML(p));
    else if (currentTab === 'metered') groupMeteredParking(cachedAllMeters).filter(m => favorites.includes(m.park_Id)).forEach(m => html += generateMeterCardHTML(m));
    else if (currentTab === 'toilet') cachedAllToilets.filter(item => favorites.includes(item.park_Id)).forEach(item => html += generateToiletCardHTML(item));
    favoritesList.innerHTML = html ? html : `<div class="empty-notice">${t.noFavs}</div>`;
}
