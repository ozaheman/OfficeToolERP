// In js/app.js, add/modify the following parts:

// --- At the top, with other state variables ---
let allSiteData = {}; 

// --- In cacheDOMElements(), add these ---
// DOMElements.loadSiteUpdatesBtn = document.getElementById('load-site-updates-btn');
// DOMElements.siteUpdateFileInput = document.getElementById('site-update-file-input');

// --- In setupEventListeners(), add these ---
// DOMElements.loadSiteUpdatesBtn.addEventListener('click', () => DOMElements.siteUpdateFileInput.click());
// DOMElements.siteUpdateFileInput.addEventListener('change', handleSiteUpdateFileSelect);

// --- Add this new function to handle loading the site data file ---
function handleSiteUpdateFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const parsed = loadSiteDataFromXmlString(e.target.result);
        if (parsed) {
            allSiteData = parsed;
            renderDashboard(); // Re-render to show new statuses
            alert(`Loaded updates for ${Object.keys(allSiteData).length} projects.`);
        } else {
            alert('Could not parse site update file.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// --- Modify the renderDashboard() function ---
// Find the line where `row.innerHTML` is set and modify it to include the site status.
// Replace this part of the function:
/*
            const statusClass = (p.projectStatus || 'pending').toLowerCase().replace(/ /g, '-');
            ...
            row.innerHTML = `<td>${p.jobNo || 'N/A'}</td><td>...</td><td class="status-${statusClass}">${p.projectStatus || 'Pending'}</td>...`;
*/
// With this new version:
            const statusClass = (p.projectStatus || 'pending').toLowerCase().replace(/ /g, '-');
            const siteUpdate = allSiteData[p.jobNo];
            const siteStatus = siteUpdate ? siteUpdate.status : 'N/A';
            const siteStatusClass = siteStatus.toLowerCase().replace(/ /g, '-');
            const statusHtml = `
                <div>Office: <span class="status-${statusClass}">${p.projectStatus || 'Pending'}</span></div>
                <div style="margin-top:4px;">Site: <span class="status-${siteStatusClass}">${siteStatus}</span></div>
            `;
            const invoicesToDisplay = showAllInvoices ? (p.invoices || []) : (p.invoices || []).filter(inv => inv.status === 'Raised' || inv.status === 'Pending');
            const invoiceDetailsHtml = invoicesToDisplay.length > 0 ? invoicesToDisplay.map(inv => `<div class="invoice-row"><span><b>${inv.no}</b></span><span>${inv.date}</span><span style="font-weight:bold; text-align:right;">${formatCurrency(parseFloat(inv.amount || 0))}</span><span>(${inv.status})</span></div>`).join('') : 'No relevant invoices.';
            let actionsHtml = `<button class="edit-btn">View/Edit</button>`;
            if (siteUpdate && (siteUpdate.photos.length > 0 || siteUpdate.documents.length > 0)) {
                actionsHtml += `<button class="view-site-files-btn secondary-button" data-job-no="${p.jobNo}">View Site Files</button>`;
            }
            const docHtml = affectionPlanFile ? `<a class="affection-plan-link" data-job-no="${p.jobNo}">Affection Plan</a>` : `<span class="affection-plan-link not-available">Affection Plan</span>`;
            
            row.innerHTML = `<td>${p.jobNo || 'N/A'}</td><td>${p.clientName || 'N/A'}<br><small>${p.clientMobile || ''}</small></td><td>${p.plotNo || 'N/A'}<br><small>${p.agreementDate ? new Date(p.agreementDate).toLocaleDateString('en-CA') : 'N/A'}</small></td><td>${statusHtml}</td><td>${docHtml}</td><td>${invoiceDetailsHtml}</td><td>${actionsHtml}</td>`;