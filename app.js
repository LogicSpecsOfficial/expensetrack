document.getElementById('btn-search').addEventListener('click', searchRoute);
document.getElementById('route-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchRoute();
});

async function searchRoute() {
    const route = document.getElementById('route-input').value.trim().toUpperCase();
    const container = document.getElementById('results-container');
    container.innerHTML = '';
    
    if (!route) {
        updateStatus('Please enter a route number.');
        return;
    }

    updateStatus(`Searching route ${route}...`);

    try {
        // Run lookups for KMB and Citybus (CTB) concurrently 
        const [kmbData, ctbData] = await Promise.all([
            fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-eta/${route}`).then(r => r.json()).catch(() => null),
            fetch(`https://rt.data.gov.hk/v1/transport/citybus/eta/CTB/${route}/outbound`).then(r => r.json()).catch(() => null)
        ]);

        let hasResults = false;

        // 1. Process KMB Results
        if (kmbData && kmbData.data && kmbData.data.length > 0) {
            hasResults = true;
            renderRouteGroup('KMB', kmbData.data);
        }

        // 2. Process Citybus (CTB) Results
        if (ctbData && ctbData.data && ctbData.data.length > 0) {
            hasResults = true;
            renderRouteGroup('CTB', ctbData.data);
        }

        if (!hasResults) {
            updateStatus(`No active schedules found for route ${route}.`);
        } else {
            updateStatus('Live ETAs Loaded.');
        }

    } catch (err) {
        console.error(err);
        updateStatus('Network error. Please try again.');
    }
}

function renderRouteGroup(company, etaItems) {
    const container = document.getElementById('results-container');
    
    // Group arrivals by unique physical stop names
    const stopsMap = {};
    etaItems.forEach(item => {
        if (!item.eta) return;
        const stopName = item.stop_name_tc || item.stop_name_en || `Stop ID: ${item.stop}`;
        if (!stopsMap[stopName]) {
            stopsMap[stopName] = [];
        }
        stopsMap[stopName].push(item.eta);
    });

    if (Object.keys(stopsMap).length === 0) return;

    // Create container segment header
    const section = document.createElement('div');
    section.style.marginBottom = '20px';
    
    const badge = document.createElement('span');
    badge.className = `company-badge ${company.toLowerCase()}-badge`;
    badge.innerText = company;
    section.appendChild(badge);

    // Build unique rows for each stop location
    Object.entries(stopsMap).forEach(([stopName, etas]) => {
        // Sort timestamps chronologically
        etas.sort((a, b) => new Date(a) - new Date(b));

        const row = document.createElement('div');
        row.className = 'stop-row';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'stop-name';
        nameSpan.innerText = stopName;
        row.appendChild(nameSpan);

        const etaContainer = document.createElement('div');
        etaContainer.className = 'eta-container';

        // Display the immediate bus time
        const firstEtaHtml = formatEta(etas[0]);
        const mainEta = document.createElement('div');
        mainEta.className = 'eta-main';
        mainEta.innerHTML = firstEtaHtml;
        etaContainer.appendChild(mainEta);

        // Append the second bus timing block underneath if active
        if (etas[1]) {
            const secondEtaHtml = formatEta(etas[1]);
            const subEta = document.createElement('div');
            subEta.className = 'eta-sub';
            subEta.innerHTML = `Next: ${secondEtaHtml}`;
            etaContainer.appendChild(subEta);
        }

        row.appendChild(etaContainer);
        section.appendChild(row);
    });

    container.appendChild(section);
}

function formatEta(etaTimestamp) {
    if (!etaTimestamp) return '--:--';
    const etaDate = new Date(etaTimestamp);
    const diffMs = etaDate - Date.now();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    
    const hours = String(etaDate.getHours()).padStart(2, '0');
    const mins = String(etaDate.getMinutes()).padStart(2, '0');
    const clockTime = `${hours}:${mins}`;

    if (diffMins <= 0) return `${clockTime} (Arv)`;
    return `${clockTime} (${diffMins}m)`;
}

function updateStatus(msg) {
    document.getElementById('status-msg').innerText = msg;
}
