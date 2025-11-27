// Global App object to hold shared state, DOM elements, and helper functions
// This MUST be defined before any of the tab modules are loaded.
const App = {
currentProjectJobNo: null,
currentInvoiceIndex: null,
showAllInvoices: false,
DOMElements: {},
ProjectTabs: {}, // To hold all the project tab modules
formatCurrency: (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(Math.round(num || 0)),
formatDate: (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-CA') : '',
readFileAsDataURL: (file) => {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result);
reader.onerror = error => reject(error);
reader.readAsDataURL(file);
});
},
setSelectOrOther: (selectEl, otherInputEl, value, otherValue) => {
if (!selectEl || !otherInputEl) return;
const optionExists = Array.from(selectEl.options).some(opt => opt.value === value);
if (optionExists && value) {
selectEl.value = value;
otherInputEl.value = '';
if (otherInputEl.parentElement) otherInputEl.parentElement.style.display = 'none';
} else {
selectEl.value = 'Other';
otherInputEl.value = value || otherValue || '';
if (otherInputEl.parentElement) otherInputEl.parentElement.style.display = 'block';
}
}
};

document.addEventListener('DOMContentLoaded', () => {
let lastScrumCheck = new Date(); // For periodic checks


// --- BULLETIN MODULE ---
const Bulletin = (() => {
    async function log(title, body) {
        const newItem = { title, body, timestamp: new Date() };
        await DB.addBulletinItem(newItem);
        await render();
    }
    async function render() {
        const items = await DB.getBulletinItems(20);
        const container = App.DOMElements['bulletin-list'];
        if (!container) return;
        if (items.length === 0) {
            container.innerHTML = '<p style="color: #888; text-align: center; padding-top: 20px;">No recent activity.</p>';
        } else {
            container.innerHTML = items.map(item => `
            <div class="bulletin-item">
                <div class="bulletin-item-header">
                    <span class="bulletin-item-title">${item.title}</span>
                    <span class="bulletin-item-time">${new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div class="bulletin-item-body">${item.body}</div>
            </div>`).join('');
        }
    }
    return { log, render };
})();
App.Bulletin = Bulletin; // Make it globally accessible

// --- DASHBOARD CALENDAR MODULE ---
const DashboardCalendar = (() => {
    let calendarDate = new Date();
    function changeMonth(offset) {
        calendarDate.setMonth(calendarDate.getMonth() + offset);
        render();
    }
    async function render() {
        const allStaff = await DB.getAllHRData();
        const eventsByDate = {};
        allStaff.forEach(staff => {
            (staff.leaves || []).forEach(leave => {
                let currentDate = new Date(leave.startDate);
                const endDate = new Date(leave.endDate);
                endDate.setDate(endDate.getDate() + 1);
                while (currentDate < endDate) {
                    const dateKey = currentDate.toDateString();
                    if (!eventsByDate[dateKey]) {
                        eventsByDate[dateKey] = [];
                    }
                    eventsByDate[dateKey].push(staff.name);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });
        });
        App.DOMElements['dash-cal-month-year'].textContent = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const gridBody = App.DOMElements['dash-cal-body'];
        gridBody.innerHTML = '';
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(year, month, 1);
        const startDayOfWeek = firstDayOfMonth.getDay();
        const currentDay = new Date(firstDayOfMonth);
        currentDay.setDate(currentDay.getDate() - startDayOfWeek);
        for (let i = 0; i < 42; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'dash-cal-day';
            const dayNum = document.createElement('span');
            dayNum.className = 'dash-cal-day-num';
            dayNum.textContent = currentDay.getDate();
            dayCell.appendChild(dayNum);
            if (currentDay.getMonth() !== month) dayCell.classList.add('other-month');
            if (currentDay.getTime() === today.getTime()) dayCell.classList.add('today');
            const dateKey = currentDay.toDateString();
            if (eventsByDate[dateKey]) {
                dayCell.classList.add('on-leave');
                dayCell.title = `On Leave:\n${eventsByDate[dateKey].join('\n')}`;
            }
            gridBody.appendChild(dayCell);
            currentDay.setDate(currentDay.getDate() + 1);
        }
    }
    return { render, changeMonth };
})();

// --- INITIALIZATION ---
async function main() {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
        await DB.init();
        cacheDOMElements();
        Object.values(App.ProjectTabs).forEach(module => module.init?.());
        initResizer();
        setupEventListeners();
        await renderDashboard();
        await DashboardCalendar.render();
        await Bulletin.render();
        setInterval(checkForUpdates, 5 * 60 * 1000);
    } catch (error) {
        console.error("Fatal Error initializing application:", error);
        document.body.innerHTML = `<div style='padding:40px; text-align:center; color:red;'><h2>Application Failed to Start</h2><p>Could not initialize the database. Please try clearing your browser's cache and site data for this page and try again.</p><p><i>Error: ${error.message}</i></p></div>`;
    }
}
// MODIFICATION START: Added helper to refresh Design Studio selector
App.refreshDesignStudioSelector = async function() {
    const projects = await DB.getAllProjects();
    // Filter for projects that are typically design-focused
    const designProjects = projects.filter(p => !(p.scopeOfWorkTypes?.['Modification'] || p.scopeOfWorkTypes?.['AOR Service']));
    const selector = App.DOMElements['design-project-selector'];
    if (!selector) return;

    const currentValue = selector.value; // Save current selection
    selector.innerHTML = '<option value="">-- All Projects (Cumulative View) --</option>';
    designProjects.forEach(p => {
        const isSelected = p.jobNo === currentValue ? ' selected' : '';
        selector.innerHTML += `<option value="${p.jobNo}"${isSelected}>${p.jobNo} - ${p.projectDescription || p.clientName}</option>`;
    });
};
// MODIFICATION END
async function checkForUpdates() {
    console.log("Checking for updates...");
    const allScrumData = await DB.getAllScrumData();
    const now = new Date();
    for (const scrum of allScrumData) {
        for (const task of scrum.tasks) {
            const dueDate = new Date(task.dueDate);
            if (dueDate >= lastScrumCheck && dueDate < now && task.status !== 'Done') {
                 Bulletin.log('Task Nearing Due Date', `Task "<strong>${task.name}</strong>" for project <strong>${scrum.jobNo}</strong> is due today.`);
            }
        }
    }
    lastScrumCheck = now;
    console.log("Update check complete.");
}

// --- VIEW MANAGEMENT ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewToShow = App.DOMElements[viewId];
    if(viewToShow) viewToShow.classList.add('active');
}

function showDashboard() {
    App.currentProjectJobNo = null;
    App.currentInvoiceIndex = null;
    showView('dashboard-view');
    renderDashboard();
}
function showProjectView() {
    showView('project-view');
}

function generateScrumProgressBarHtml(scrumData) {
    if (!scrumData || !scrumData.tasks || scrumData.tasks.length === 0) {
        return '';
    }
    const totalTasks = scrumData.tasks.length;
    const completedTasksByDept = scrumData.tasks.reduce((acc, task) => {
        if (task.status === 'Done') {
            const dept = task.department || 'Default';
            if (!acc[dept]) acc[dept] = 0;
            acc[dept]++;
        }
        return acc;
    }, {});

    let segmentsHtml = '';
    let totalDone = 0;
    const departments = Object.keys(completedTasksByDept).sort(); 

    for (const dept of departments) {
        const doneCount = completedTasksByDept[dept];
        totalDone += doneCount;
        const percentage = (doneCount / totalTasks) * 100;
        const color = DEPARTMENT_COLORS[dept] || DEPARTMENT_COLORS['Default'];
        segmentsHtml += `<div class="scrum-progress-segment" style="width: ${percentage}%; background-color: ${color};" title="${dept}: ${doneCount} tasks"></div>`;
    }
    
    const overallProgress = totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0;
    const overallTitle = `Overall Scrum Progress: ${totalDone}/${totalTasks} tasks completed (${overallProgress.toFixed(1)}%).`;
    return `<div class="scrum-progress-bar" title="${overallTitle}">${segmentsHtml}</div>`;
}

// --- DASHBOARD FUNCTIONS ---
async function renderDashboard() {
    const allProjects = await DB.getAllProjects();
    const allSiteData = await DB.getAllSiteData();
    const siteDataMap = new Map(allSiteData.map(data => [data.jobNo, data]));

    await updateDashboardSummary(allProjects);

    const tbody = App.DOMElements['project-list-body'];
    tbody.innerHTML = '';
    if (allProjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No projects found. Use "Import Master" to add projects.</td></tr>';
        return;
    }

    const searchTerm = App.DOMElements['search-box'].value.toLowerCase().trim();
    const searchWords = searchTerm.split(' ').filter(word => word.length > 0);

    const filteredProjects = allProjects.filter(p => {
        if (searchWords.length === 0) return true;
        const projectDataToSearch = [p.clientName, p.plotNo, p.jobNo, p.projectType, p.area, ...(p.invoices || []).map(inv => inv.no)].filter(Boolean).join(' ').toLowerCase();
        return searchWords.every(word => projectDataToSearch.includes(word));
    });

    for (const p of filteredProjects.sort((a, b) => b.jobNo.localeCompare(a.jobNo))) {
        const row = tbody.insertRow();
        row.dataset.jobNo = p.jobNo;
        const siteData = siteDataMap.get(p.jobNo) || {};
        const siteStatus = siteData.status || 'N/A';
        const progress = siteData.progress || 0;
        const officeStatusClass = (p.projectStatus || 'pending').toLowerCase().replace(/ /g, '-');
        const siteStatusClass = siteStatus.toLowerCase().replace(/ /g, '-');
        
        const scrumData = await DB.getScrumData(p.jobNo);
        const scrumProgressHtml = generateScrumProgressBarHtml(scrumData);

        const statusHtml = `<div>Office: <span class="status-${officeStatusClass}">${p.projectStatus || 'Pending'}</span></div> <div style="margin-top:4px;">Site: <span class="status-${siteStatusClass}">${siteStatus}</span></div> <div class="progress-bar-container" style="height:14px; margin-top:4px;"><div class="progress-bar" style="width:${progress}%; height:14px; font-size:0.7em;">${progress}%</div></div>${scrumProgressHtml}`;
        
        const masterFiles = await DB.getFiles(p.jobNo, 'master');
        const affectionPlanFile = masterFiles.find(f => f.subCategory === 'affection_plan');
        const docHtml = affectionPlanFile ? `<a href="#" class="file-link" data-file-id="${affectionPlanFile.id}">Affection Plan</a>` : `<span class="file-link not-available">Affection Plan</span>`;
        
        const invoicesToDisplay = App.showAllInvoices ? (p.invoices || []) : (p.invoices || []).filter(inv => inv.status === 'Raised' || inv.status === 'Pending');
        const invoiceDetailsHtml = invoicesToDisplay.length > 0 ? invoicesToDisplay.map(inv => `<div class="invoice-row status-${(inv.status || '').toLowerCase()}"><span><b>${inv.no}</b></span><span>${inv.date}</span><span style="font-weight:bold; text-align:right;">${App.formatCurrency(parseFloat(inv.total || 0))}</span><span>(${inv.status})</span></div>`).join('') : (App.showAllInvoices ? 'No invoices' : 'No pending invoices');
        
        let actionsHtml = `<button class="edit-btn">View/Edit</button>`;
        if (p.projectStatus === 'Under Supervision') {
            actionsHtml += `<button class="bill-monthly-btn secondary-button" data-job-no="${p.jobNo}">+ Monthly Inv</button>`;
        }

        row.innerHTML = `<td>${p.jobNo}</td><td>${p.clientName}<br><small>${p.clientMobile||''}</small></td><td>${p.plotNo}<br><small><b>${p.projectType || 'N/A'}</b> / ${p.agreementDate||''}</small></td><td>${statusHtml}</td><td>${docHtml}</td><td><div class="invoice-container">${invoiceDetailsHtml}</div></td><td>${actionsHtml}</td>`;
    }
}


async function updateDashboardSummary(projects) {
    let totalPendingAmount = 0, pendingInvoiceCount = 0, totalOnHoldAmount = 0, lastPaidInvoice = null;
    projects.forEach(p => {
        (p.invoices || []).forEach(inv => {
            if (inv.status === 'Paid' && inv.paymentDetails) {
                 if (!lastPaidInvoice || new Date(inv.paymentDetails.date) > new Date(lastPaidInvoice.paymentDetails.date)) {
                    lastPaidInvoice = inv;
                }
            } else if (inv.status === 'Raised' || inv.status === 'Pending') {
                pendingInvoiceCount++;
                totalPendingAmount += parseFloat(inv.total || 0);
            } else if (inv.status === 'On Hold') {
                totalOnHoldAmount += parseFloat(inv.total || 0);
            }
        });
    });

    App.DOMElements['pending-invoices-count'].textContent = pendingInvoiceCount;
    App.DOMElements['pending-invoices-amount'].textContent = ` ${App.formatCurrency(totalPendingAmount)}`;
    App.DOMElements['last-paid-amount'].textContent = lastPaidInvoice ? ` ${App.formatCurrency(lastPaidInvoice.paymentDetails.amountPaid)}` : 'N/A';
    App.DOMElements['on-hold-amount'].textContent = ` ${App.formatCurrency(totalOnHoldAmount)}`;
    
    const allMasterFiles = await DB.getAllFiles('master');
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const expiringDocs = allMasterFiles.filter(file => {
        if (!file.expiryDate) return false;
        const expiry = new Date(file.expiryDate);
        return expiry >= now && expiry <= thirtyDaysFromNow;
    });
    App.DOMElements['expiring-documents-count'].textContent = expiringDocs.length;
}

async function showPendingInvoicesModal() {
    const allProjects = await DB.getAllProjects();
    const pendingInvoices = allProjects.flatMap(p => 
        (p.invoices || [])
        .filter(inv => inv.status === 'Raised' || inv.status === 'Pending')
        .map(inv => ({...inv, jobNo: p.jobNo, clientName: p.clientName, projectDescription: p.projectDescription}))
    );

    const listEl = App.DOMElements['pending-invoice-list'];
    if (pendingInvoices.length === 0) {
        listEl.innerHTML = '<p>No pending invoices found.</p>';
    } else {
        let tableHtml = `<table class="output-table"><thead><tr><th>Inv No.</th><th>Project</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>`;
        pendingInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
        tableHtml += pendingInvoices.map(inv => `<tr>
                <td>${inv.no}</td><td>${inv.projectDescription || inv.jobNo}</td><td>${inv.clientName}</td>
                <td>${App.formatDate(inv.date)}</td><td style="text-align:right;">${App.formatCurrency(inv.total)}</td>
                <td><span class="status-${inv.status.toLowerCase()}">${inv.status}</span></td>
            </tr>`).join('');
        tableHtml += '</tbody></table>';
        listEl.innerHTML = tableHtml;
    }
    App.DOMElements['pending-invoice-modal'].style.display = 'flex';
}

async function showExpiringDocumentsModal() {
    const allFiles = await DB.getAllFiles();
    const allProjects = await DB.getAllProjects();
    const projectMap = new Map(allProjects.map(p => [p.jobNo, p]));
    
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiringDocs = allFiles.filter(file => {
        if (!file.expiryDate) return false;
        const expiry = new Date(file.expiryDate);
        return expiry >= now && expiry <= thirtyDaysFromNow;
    });

    const listEl = App.DOMElements['expiring-documents-list'];
    if (expiringDocs.length === 0) {
        listEl.innerHTML = '<p>No documents are expiring in the next 30 days.</p>';
    } else {
        let tableHtml = `<table class="output-table"><thead><tr><th>Document</th><th>Project</th><th>Job No</th><th>Expiry Date</th><th>Days Left</th></tr></thead><tbody>`;
        expiringDocs.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        tableHtml += expiringDocs.map(doc => {
            const expiry = new Date(doc.expiryDate);
            const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
            const daysLeftClass = daysLeft <= 7 ? 'danger' : (daysLeft <= 15 ? 'warning' : '');
            const project = projectMap.get(doc.jobNo);
            return `<tr>
                <td>${doc.name}</td><td>${project?.projectDescription || doc.jobNo}</td><td>${doc.jobNo}</td>
                <td>${App.formatDate(doc.expiryDate)}</td><td class="${daysLeftClass}">${daysLeft}</td>
            </tr>`;
        }).join('');
        tableHtml += '</tbody></table>';
        listEl.innerHTML = tableHtml;
    }
    App.DOMElements['expiring-documents-modal'].style.display = 'flex';
}

// --- MODIFICATION START: Functions for All Projects Report Modal & Quick Billing ---
async function showAllProjectsReportModal() {
    const allProjects = await DB.getAllProjects();
    const projectListContainer = App.DOMElements['all-projects-report-project-list'];
    projectListContainer.innerHTML = '';
    allProjects
        .sort((a, b) => b.jobNo.localeCompare(a.jobNo))
        .forEach(p => {
            projectListContainer.innerHTML += `
                <label><input type="checkbox" name="reportProject" value="${p.jobNo}"> ${p.jobNo} - ${p.projectDescription || p.clientName}</label>
            `;
        });
    App.DOMElements['all-projects-report-modal'].style.display = 'flex';
}

async function generateAndShowMultiReport() {
    const previewContainer = App.DOMElements['all-projects-report-preview-container'];
    previewContainer.innerHTML = '<h3>Generating Combined Report... Please Wait</h3>';

    const selectedProjectIds = Array.from(document.querySelectorAll('input[name="reportProject"]:checked')).map(cb => cb.value);
    const selectedSections = Array.from(document.querySelectorAll('input[name="multiReportSection"]:checked')).map(cb => cb.value);

    if (selectedProjectIds.length === 0) {
        previewContainer.innerHTML = '<p>Please select at least one project.</p>';
        return;
    }

    let combinedHtml = '';
    const allStaff = await DB.getAllHRData();

    for (const jobNo of selectedProjectIds) {
        const project = await DB.getProject(jobNo);
        const siteData = await DB.getSiteData(jobNo);
        const scrumData = await DB.getScrumData(jobNo);
        const feeDistribution = App.ProjectTabs.Fees.getFeeDistribution(project);

        const reportData = { project, siteData, scrumData, allStaff, feeDistribution, selectedSections };
        
        // Generate report for one project and add it to the combined HTML
        // We remove the outer 'document-preview' wrapper to avoid nesting issues.
        let singleReportHtml = PROJECT_DOCUMENT_TEMPLATES.projectReport(reportData);
        singleReportHtml = singleReportHtml
            .replace('<div class="document-preview a4">', `<div class="report-section" style="page-break-after: always;">`)
            .replace(/<\/div>$/, '</div>'); // replace last div
        
        combinedHtml += singleReportHtml;
    }

    previewContainer.innerHTML = combinedHtml;
    App.DOMElements['download-multi-report-pdf-btn'].style.display = 'block';
}

async function handleQuickBillMonthly(jobNo) {
    if (!confirm(`This will raise a new monthly supervision invoice for project ${jobNo}. Continue?`)) {
        return;
    }
    
    const project = await DB.getProject(jobNo);
    if (!project) {
        alert("Error: Project not found.");
        return;
    }
    
    // Fee distribution calculation
    const totalConsultancyFee = (project.remunerationType === 'lumpSum') ? (project.lumpSumFee || 0) : ((project.builtUpArea || 0) * (project.constructionCostRate || 0) * ((project.consultancyFeePercentage || 0) / 100));
    const designFeeSplit = project.designFeeSplit || 60;
    const supervisionFeePortion = totalConsultancyFee * ((100 - designFeeSplit) / 100);
    const monthlySupervisionFee = supervisionFeePortion / (project.constructionDuration || 1);

    // Determine the next month to bill
    const allInvoiceItems = (project.invoices || []).flatMap(inv => inv.items || []);
    const billedRegularMonths = allInvoiceItems.filter(item => item.type === 'supervision' && (item.supervisionType === 'regular' || !item.supervisionType)).length;
    const billedExtendedMonths = allInvoiceItems.filter(item => item.type === 'supervision' && item.supervisionType === 'extended').length;

    let newItem;
    if (billedRegularMonths < project.constructionDuration) {
        const nextMonthNumber = billedRegularMonths + 1;
        newItem = {
            type: 'supervision', supervisionType: 'regular',
            description: `${nextMonthNumber}st payment on Monthly Supervision fees (Month ${nextMonthNumber} of ${project.constructionDuration})`,
            amount: monthlySupervisionFee
        };
    } else {
        const nextExtendedMonthNumber = billedExtendedMonths + 1;
        newItem = {
            type: 'supervision', supervisionType: 'extended',
            description: `Extended Supervision Fee - Month ${nextExtendedMonthNumber}`,
            amount: project.extendedSupervisionFee
        };
    }
    
    // Create and save the new invoice
    const lastInvNo = (project.invoices || []).reduce((max, inv) => {
        const num = parseInt(inv.no.split('-').pop(), 10);
        return !isNaN(num) ? Math.max(max, num) : max;
    }, 0);
    const newInvoiceNo = `UA-${project.jobNo.split('/').pop()}-${String(lastInvNo + 1).padStart(2, '0')}`;
    
    const subtotal = newItem.amount;
    const vat = subtotal * ((project.vatRate || 5) / 100);
    const total = subtotal + vat;

    const newInvoice = {
        no: newInvoiceNo,
        date: new Date().toISOString().split('T')[0],
        type: 'Tax Invoice',
        status: 'Raised',
        items: [newItem],
        subtotal, vat, total
    };
    
    if (!project.invoices) project.invoices = [];
    project.invoices.push(newInvoice);
    await DB.putProject(project);

    alert(`Invoice ${newInvoiceNo} for ${App.formatCurrency(total)} has been raised successfully.`);
    Bulletin.log('Invoice Raised', `Quick-billed invoice <strong>${newInvoiceNo}</strong> for project <strong>${jobNo}</strong>.`);
    
    await renderDashboard();
}
// --- MODIFICATION END ---

// --- DATA I/O ---
async function handleProjectFileImport(event) {
    const file = event.target.files[0]; if (!file) return;
    const xmlString = await file.text();
    const parsedProjects = loadProjectsFromXmlString(xmlString);
    if (parsedProjects?.length) {
        if (confirm(`This will import/update ${parsedProjects.length} projects. Continue?`)) {
            for (const p of parsedProjects) await DB.processProjectImport(p);
            await renderDashboard();
            alert(`Imported ${parsedProjects.length} projects.`);
            Bulletin.log('Master File Import', `Imported <strong>${parsedProjects.length}</strong> projects.`);
        }
    } else { alert('Could not parse XML file.'); }
    event.target.value = '';
}

async function handleSiteUpdateImport(event) {
    const file = event.target.files[0]; if (!file) return;
    const xmlString = await file.text();
    const parsedUpdates = loadProjectsFromXmlString(xmlString);
    if (parsedUpdates?.length) {
        if (confirm(`This will import site updates for ${parsedUpdates.length} projects. Continue?`)) {
            for (const update of parsedUpdates) await DB.processSiteUpdateImport(update);
            await renderDashboard();
            alert(`Imported site updates for ${parsedUpdates.length} projects.`);
            Bulletin.log('Site Data Import', `Imported updates for <strong>${parsedUpdates.length}</strong> projects.`);
        }
    } else { alert('Could not parse site update XML file.'); }
    event.target.value = '';
}
// Located in app.js

async function handleFileExport() {
    // --- UX Improvement: Provide feedback and prevent double-clicks ---
    const exportButton = document.getElementById('save-to-file-btn');
    if (!exportButton) return;
    
    const originalButtonText = exportButton.textContent;
    exportButton.disabled = true;
    exportButton.textContent = 'Exporting...';

    try {
        // --- Performance Improvement: Fetch all data in minimal queries ---
        const allProjects = await DB.getAllProjects();
        if (allProjects.length === 0) {
            alert("No projects to export.");
            return;
        }
        
        // Fetch ALL files in a single query
        const allFiles = await DB.getAllFiles();

        const allScrumData = await DB.getAllScrumData();
        // --- Performance Improvement: Group files in memory instead of repeated DB calls ---
        const filesByJobNo = allFiles.reduce((acc, file) => {
                if (!acc.has(file.jobNo)) acc.set(file.jobNo, []);
            acc.get(file.jobNo).push(file);
            return acc;
        }, new Map());

        const scrumByJobNo = allScrumData.reduce((acc, scrum) => {
            acc.set(scrum.jobNo, scrum.tasks);
            return acc;
        }, new Map());

        // --- Data Integrity & Bug Fix: Create clean export data without mutating originals ---
        const projectsForExport = allProjects.map(project => {
            // Create a clean copy of the project to avoid mutating the original object
            const projectData = { ...project };
            
            const projectFiles = filesByJobNo.get(project.jobNo);
            
            // BUG FIX: Attach ALL documents, not just 'master'
            if (projectFiles && projectFiles.length > 0) {
                // Map the files to the desired export format
                projectData.documents = projectFiles.map(f => ({
                    name: f.name,
                    category: f.category,
                    subCategory: f.subCategory,
                    expiryDate: f.expiryDate,
                    fileType: f.fileType,
                    dataUrl: f.dataUrl // Renamed for clarity in export
                }));
            } else {
                projectData.documents = []; // Ensure the documents property always exists
            }
            
            // This is a good place to remove any temporary or runtime properties if needed
            // delete projectData.someTemporaryKey;
 const projectScrumTasks = scrumByJobNo.get(project.jobNo);
            if (projectScrumTasks) {
                projectData.scrumTasks = projectScrumTasks;
            }
            return projectData;
        });

        // Use the robust XML handler to generate the string
        const xmlString = saveProjectsToXmlString(projectsForExport);
        
        // Standard download logic
        const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `UrbanAxis_MasterProjects_${new Date().toISOString().split('T')[0]}.xml`;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

    } catch (error) {
        console.error("Error during file export:", error);
        alert("An error occurred during export. Please check the console for details.");
    } finally {
        // --- UX Improvement: Restore the button state ---
        exportButton.disabled = false;
        exportButton.textContent = originalButtonText;
    }
}
async function handleFileExportx() {
    const projectsToExp = await DB.getAllProjects();
    if (projectsToExp.length === 0) { alert("No projects to export."); return; }
    for (const project of projectsToExp) {
        const masterFiles = await DB.getFiles(project.jobNo, 'master');
        if (masterFiles.length > 0) {
            project.masterDocuments = masterFiles.map(f => ({
                name: f.name, category: f.category, subCategory: f.subCategory,
                expiryDate: f.expiryDate, type: f.fileType, data: f.dataUrl
            }));
        }
    }
    const xmlString = saveProjectsToXmlString(projectsToExp);
    const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `UrbanAxis_MasterProjects_${new Date().toISOString().split('T')[0]}.xml`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// --- PROJECT EDITOR ---
async function handleEditProject(jobNo) {
    App.currentProjectJobNo = jobNo;
    App.currentInvoiceIndex = null;
    const project = await DB.getProject(jobNo);
    if (project) {
        Object.values(App.ProjectTabs).forEach(tabModule => tabModule.populateTabData?.(project));
        App.DOMElements['project-view-title'].textContent = `Editing Project: ${jobNo}`;
        showProjectView();
        App.ProjectTabs.Invoicing.renderInvoicingTab(project);
        App.ProjectTabs.PaymentCert.renderTab(project);
        App.ProjectTabs.Documents.renderAllGalleries(jobNo);
        App.ProjectTabs.Tools.populateTabData(project);
        refreshCurrentPreview();
    }
}

async function handleNewProject() {
    const allProjects = await DB.getAllProjects();
    const nextId = allProjects.length > 0 ? Math.max(...(allProjects.map(p => parseInt(p.jobNo.split('/').pop(), 10) || 0))) + 1 : 1;
    const jobNo = `RRC/${new Date().getFullYear()}/${String(nextId).padStart(3, '0')}`;
    const todayStr = new Date().toISOString().split('T')[0];
    
    let newProject = { 
        jobNo, agreementDate: todayStr, scope: {}, notes: {}, invoices: [], 
        remunerationType: 'percentage', vatRate: 5, designFeeSplit: 60, supervisionBillingMethod: 'monthly', 
        feeMilestones: (CONTENT.FEE_MILESTONES || []).map(m => ({ id: m.id, text: m.text, percentage: m.defaultPercentage })),
        scheduleTasks: []
    };
   
    const scrumTasks = (window.DESIGN_SCRUM_TEMPLATE || []).map(task => ({
        ...task, status: 'Up Next', assigneeId: null, dueDate: null, startDate: null,
        completedDate: null, dateAdded: todayStr, plannedDuration: task.duration
    }));
    await DB.putScrumData({ jobNo: jobNo, tasks: scrumTasks });
    
    newProject.scheduleTasks = UrbanAxisSchedule.calculateDynamicSchedule(newProject, CONTENT.VILLA_SCHEDULE_TEMPLATE, []);

    App.currentProjectJobNo = jobNo;
    App.currentInvoiceIndex = null;

    Object.values(App.ProjectTabs).forEach(tabModule => tabModule.populateTabData?.(newProject));
    App.ProjectTabs.Invoicing.renderInvoicingTab(newProject);
    
    App.DOMElements['project-view-title'].textContent = `Creating New Project: ${jobNo}`;
    showView('project-view');
    App.DOMElements['documents-tab'].querySelectorAll('.gallery-grid').forEach(grid => { grid.innerHTML = '<p>Please save the project before uploading documents.</p>'; });
    Bulletin.log('New Project Created', `Project <strong>${jobNo}</strong> has been created.`);
    refreshCurrentPreview();
} 

async function saveCurrentProject() {
    if (!App.currentProjectJobNo) return;
    let uiData = {};
    Object.values(App.ProjectTabs).forEach(tabModule => {
        if (tabModule.getTabData) {
            Object.assign(uiData, tabModule.getTabData());
        }
    });
    const existingProject = await DB.getProject(App.currentProjectJobNo) || {};
    
    if (uiData.projectStatus === 'Under Supervision' && !existingProject.supervisionStartDate) {
        uiData.supervisionStartDate = new Date().toISOString().split('T')[0];
        Bulletin.log('Supervision Started', `Supervision phase for project <strong>${App.currentProjectJobNo}</strong> recorded.`);
    }

    if (existingProject.projectStatus !== uiData.projectStatus) {
        Bulletin.log('Project Status Changed', `Status for project <strong>${App.currentProjectJobNo}</strong> changed to <strong>${uiData.projectStatus}</strong>.`);
    }
    const projectToSave = { ...existingProject, ...uiData, jobNo: App.currentProjectJobNo };
    await DB.putProject(projectToSave);
    
    alert(`Project ${App.currentProjectJobNo} saved successfully.`);

    // MODIFICATION: Re-populate UI with the newly saved data
    const savedProject = await DB.getProject(App.currentProjectJobNo);
    Object.values(App.ProjectTabs).forEach(tabModule => tabModule.populateTabData?.(savedProject));
    App.ProjectTabs.Invoicing.renderInvoicingTab(savedProject);
    
    await renderDashboard();
}


// --- PREVIEW HANDLING ---
function refreshCurrentPreview() {
    const activeTab = App.DOMElements.previewTabs?.querySelector('.tab-button.active');
    if (activeTab) updateActivePreview(activeTab.dataset.tab);
}
App.refreshCurrentPreview = refreshCurrentPreview;

async function updateActivePreview(tabId) {
    if (typeof PROJECT_DOCUMENT_TEMPLATES === 'undefined' || typeof PROJECT_LETTER_TEMPLATES === 'undefined') {
        console.error("Template objects not found."); return;
    }
    if (!App.currentProjectJobNo) return;

    const project = await DB.getProject(App.currentProjectJobNo);
    if (!project) return;
    
    let uiData = {};
    Object.values(App.ProjectTabs).forEach(tabModule => {
        if (tabModule.getTabData) Object.assign(uiData, tabModule.getTabData());
    });

    const fullData = { ...project, ...uiData, masterFiles: await DB.getFiles(App.currentProjectJobNo, 'master') };
    const feeDistribution = App.ProjectTabs.Fees.getFeeDistribution(fullData);

    const renderMap = {
        'brief-proposal': () => PROJECT_DOCUMENT_TEMPLATES.briefProposal(fullData, feeDistribution),
        'full-agreement': () => PROJECT_DOCUMENT_TEMPLATES.fullAgreement(fullData, feeDistribution),
        'assignment-order': () => PROJECT_DOCUMENT_TEMPLATES.assignmentOrder(fullData),
        'proforma': () => App.ProjectTabs.Invoicing.renderInvoiceDocuments(fullData.invoices?.[App.currentInvoiceIndex]),
        'tax-invoice': () => App.ProjectTabs.Invoicing.renderInvoiceDocuments(fullData.invoices?.[App.currentInvoiceIndex]),
        'receipt': () => App.ProjectTabs.Invoicing.renderInvoiceDocuments(fullData.invoices?.[App.currentInvoiceIndex]),
        'tender-package': () => PROJECT_DOCUMENT_TEMPLATES.tenderPackage(fullData),
        'vendor-list': () => PROJECT_DOCUMENT_TEMPLATES.vendorList(fullData),
        'payment-certificate': () => App.ProjectTabs.PaymentCert.renderPreview(null),
        'villa-schedule': () => App.ProjectTabs.Schedule.renderPreview(fullData),
        'project-letter': () => App.ProjectTabs.Letters.renderPreview(fullData),
        'project-report': () => App.ProjectTabs.Tools.renderPreview()
    };

    const renderFunc = renderMap[tabId];
    if (renderFunc) {
        const content = await renderFunc();
        if (content !== undefined) {
            App.DOMElements[`${tabId}-preview`].innerHTML = content;
        }
    }
}

// --- DESIGN STUDIO ---
async function showDesignStudio() {
    showView('design-view');
    await renderDesignSummary(); 
    await App.refreshDesignStudioSelector(); // 
    const projects = await DB.getAllProjects();
    const designProjects = projects.filter(p => !(p.scopeOfWorkTypes?.['Modification'] || p.scopeOfWorkTypes?.['AOR Service']));
    const selector = App.DOMElements['design-project-selector'];
    selector.innerHTML = '<option value="">-- All Projects (Cumulative View) --</option>';
    designProjects.forEach(p => {
        selector.innerHTML += `<option value="${p.jobNo}">${p.jobNo} - ${p.projectDescription}</option>`;
    });
    const boardButton = App.DOMElements['design-view'].querySelector('[data-view="board"]');
    if (boardButton) handleDesignViewSwitch({ target: boardButton });
}

async function renderDesignSummary() {
    const allScrumData = await DB.getAllScrumData();
    if (!allScrumData) return;
    let running = 0, dueToday = 0, overdue = 0, planned = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    allScrumData.forEach(project => {
        project.tasks.forEach(task => {
            if (task.status === 'Done') return;
            if (task.status === 'Up Next' || task.status === 'To Do') planned++;
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            if (dueDate && dueDate < today) overdue++;
            else if (dueDate && dueDate.getTime() === today.getTime()) dueToday++;
            else if (task.status === 'In Progress') running++;
        });
    });
    App.DOMElements['summary-running'].textContent = running;
    App.DOMElements['summary-due-today'].textContent = dueToday;
    App.DOMElements['summary-overdue'].textContent = overdue;
    App.DOMElements['summary-planned'].textContent = planned;
}

async function handleDesignProjectSelect() {
    const activeTabButton = App.DOMElements['design-view'].querySelector('.tabs .tab-button.active');
    handleDesignViewSwitch({ target: activeTabButton });
}

async function handleDesignViewSwitch(event) {
    const button = event.target;
    if (!button) return;
    const view = button.dataset.view;
    App.DOMElements['design-summary-panel']?.addEventListener('click', (e) => {
            const summaryBox = e.target.closest('.summary-box');
            if (!summaryBox) return;

            const targetView = summaryBox.dataset.viewTarget;
            const targetButton = App.DOMElements['design-view'].querySelector(`.tabs .tab-button[data-view="${targetView}"]`);
            if (targetButton) {
                targetButton.click();
            }
        });
    document.querySelectorAll('#design-view .tabs .tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    document.querySelectorAll('.design-view-content').forEach(el => el.style.display = 'none');
    
    const jobNo = App.DOMElements['design-project-selector'].value;
    const deptFilterGroup = App.DOMElements['department-filter-group'];
    const staffFilterGroup = App.DOMElements['staff-filter-group'];
    const addCustomTaskBtn = App.DOMElements['add-custom-task-btn'];
    const addDefaultTasksBtn = App.DOMElements['add-default-tasks-btn'];
    const equalizeTasksBtn = App.DOMElements['equalize-tasks-btn'];
    const progressContainer = App.DOMElements['design-scrum-progress-container'];

    const isBoardView = view === 'board';
    App.DOMElements['design-project-selector'].style.display = isBoardView ? 'block' : 'none';
    
    const showProjectSpecificControls = isBoardView && jobNo;
    addCustomTaskBtn.style.display = showProjectSpecificControls ? 'inline-block' : 'none';
    addDefaultTasksBtn.style.display = showProjectSpecificControls ? 'inline-block' : 'none';
    equalizeTasksBtn.style.display = showProjectSpecificControls ? 'inline-block' : 'none';
    
    deptFilterGroup.style.display = isBoardView ? 'flex' : 'none';
    staffFilterGroup.style.display = isBoardView ? 'flex' : 'none';
    progressContainer.style.display = 'none'; // Hide by default
    
    if (view === 'board') {
        App.DOMElements['scrum-board-container'].style.display = 'grid';
        const staffList = await DB.getAllHRData();
        
        if (jobNo) {
            const scrumData = await DB.getScrumData(jobNo);
            if (scrumData) {
                const progressBarHtml = generateScrumProgressBarHtml(scrumData);
                progressContainer.innerHTML = `<h4>Project Scrum Progress</h4>${progressBarHtml}`;
                progressContainer.style.display = 'block';

                ScrumBoard.render(scrumData, staffList, handleTaskStatusUpdate, showTaskModal, DEPARTMENT_COLORS);
                populateDepartmentFilter(scrumData.tasks);
                populateStaffFilter(scrumData.tasks, staffList);
            } else {
                App.DOMElements['scrum-board-container'].innerHTML = '<p style="text-align:center; padding-top: 50px; color: #888;">No scrum board found for this project. You can add tasks to create one.</p>';
            }
        } else {
            const allScrumData = await DB.getAllScrumData();
            const cumulativeTasks = allScrumData.flatMap(projectScrum => 
                projectScrum.tasks.map(task => ({ ...task, jobNo: projectScrum.jobNo }))
            );
            ScrumBoard.render({ tasks: cumulativeTasks }, staffList, handleTaskStatusUpdate, showTaskModal, DEPARTMENT_COLORS);
            populateDepartmentFilter(cumulativeTasks);
            populateStaffFilter(cumulativeTasks, staffList);
        }
        applyScrumBoardFilters();

    } else {
        const allScrum = await DB.getAllScrumData();
        const allStaff = await DB.getAllHRData();
        const allProjects = await DB.getAllProjects();
        if (view === 'calendar') {
            App.DOMElements['design-calendar-container'].style.display = 'flex'; // Changed to flex for consistency
            DesignCalendar.render(allScrum, allStaff, allProjects);
        } else if (view === 'agenda') {
            App.DOMElements['design-agenda-container'].style.display = 'block';
            DesignCalendar.renderAgenda(allScrum, allStaff, allProjects);
        } else if (view === 'assignee') {
            App.DOMElements['design-assignee-container'].style.display = 'block';
            ScrumBoard.renderByAssignee(allScrum, allStaff, showTaskModal);
        }
    }
}

function populateDepartmentFilter(tasks) {
    const filterSelect = App.DOMElements['department-filter'];
    const departments = [...new Set(tasks.map(t => t.department || 'Default'))];
    filterSelect.innerHTML = '<option value="">All Departments</option>';
    departments.sort().forEach(dept => {
        filterSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
    });
}

function applyScrumBoardFilters() {
    const selectedDept = App.DOMElements['department-filter'].value;
    const selectedStaffId = App.DOMElements['staff-filter'].value;
    
    const cards = document.querySelectorAll('#scrum-board-container .scrum-card');
    cards.forEach(card => {
        const cardDept = card.dataset.department;
        const cardAssigneeId = card.dataset.assigneeId;

        const deptMatch = !selectedDept || cardDept === selectedDept;
        const staffMatch = !selectedStaffId || cardAssigneeId === selectedStaffId;

        if (deptMatch && staffMatch) {
            card.classList.remove('filtered-out');
        } else {
            card.classList.add('filtered-out');
        }
    });
}

function populateStaffFilter(tasks, allStaff) {
    const filterSelect = App.DOMElements['staff-filter'];
    const staffMap = new Map(allStaff.map(s => [s.id, s.name]));
    const assignedIds = [...new Set(tasks.map(t => t.assigneeId).filter(id => id != null))];
    filterSelect.innerHTML = '<option value="">All Assignees</option>';
    assignedIds.forEach(id => {
        
        if (staffMap.has(id)) {
            filterSelect.innerHTML += `<option value="${id}">${staffMap.get(id)}</option>`;
        }
    });
    if (tasks.some(t => !t.assigneeId)) {
        filterSelect.innerHTML += `<option value="unassigned">Unassigned</option>`;
    }
}

async function showTaskModal(taskId, jobNo) {
    const scrumData = await DB.getScrumData(jobNo);
    const task = scrumData.tasks.find(t => t.id == taskId);
    if (!task) return;
    App.DOMElements['task-modal-id'].value = taskId;
    App.DOMElements['task-modal-jobno'].value = jobNo;
    App.DOMElements['task-modal-title'].textContent = `Edit Task: ${task.name}`;
    const staffList = await DB.getAllHRData();
    const assigneeSelect = App.DOMElements['task-modal-assignee'];
    assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
    staffList.forEach(s => assigneeSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`);
    const departmentSelect = App.DOMElements['task-modal-department'];
    departmentSelect.innerHTML = '';
    for (const dept in DEPARTMENT_COLORS) departmentSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
    assigneeSelect.value = task.assigneeId || '';
    departmentSelect.value = task.department || 'Default';
    App.DOMElements['task-modal-planned-duration'].value = task.plannedDuration || task.duration || 1;
    App.DOMElements['task-modal-duedate'].value = task.dueDate || '';
    App.DOMElements['task-modal-status'].value = task.status || 'To Do';
    App.DOMElements['task-modal'].style.display = 'flex';
}

async function handleTaskSave() {
    const taskId = parseInt(App.DOMElements['task-modal-id'].value);
    const jobNo = App.DOMElements['task-modal-jobno'].value;
    const scrumData = await DB.getScrumData(jobNo);
    const task = scrumData.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Enforce fixed_time
    const templateTask = DESIGN_SCRUM_TEMPLATE.find(t => t.id === task.id);
    const minDuration = templateTask ? templateTask.fixed_time : 1;
    let plannedDuration = parseInt(App.DOMElements['task-modal-planned-duration'].value) || 1;
    if (plannedDuration < minDuration) {
        alert(`Duration cannot be less than the fixed minimum of ${minDuration} days for this task.`);
        plannedDuration = minDuration;
        App.DOMElements['task-modal-planned-duration'].value = plannedDuration;
    }

    if(task.status !== App.DOMElements['task-modal-status'].value) Bulletin.log('Scrum Task Update', `Task "<strong>${task.name}</strong>" for <strong>${jobNo}</strong> moved to <strong>${App.DOMElements['task-modal-status'].value}</strong>.`);
    if (task.assigneeId !== (parseInt(App.DOMElements['task-modal-assignee'].value) || null)) {
        const staffList = await DB.getAllHRData();
        const newAssignee = staffList.find(s => s.id === parseInt(App.DOMElements['task-modal-assignee'].value))?.name || 'Unassigned';
        Bulletin.log('Task Reassigned', `Task "<strong>${task.name}</strong>" for <strong>${jobNo}</strong> assigned to <strong>${newAssignee}</strong>.`);
    }
    task.assigneeId = parseInt(App.DOMElements['task-modal-assignee'].value) || null;
    task.department = App.DOMElements['task-modal-department'].value;
    task.plannedDuration = plannedDuration;
    task.dueDate = App.DOMElements['task-modal-duedate'].value;
    task.status = App.DOMElements['task-modal-status'].value;
    await DB.putScrumData(scrumData);
    App.DOMElements['task-modal'].style.display = 'none';
    const activeTab = App.DOMElements['design-view'].querySelector('.tabs .active');
    handleDesignViewSwitch({target: activeTab});
    renderDashboard();
}

async function handleDeleteTask() {
    const taskId = parseInt(App.DOMElements['task-modal-id'].value);
    const jobNo = App.DOMElements['task-modal-jobno'].value;
    
    const password = prompt("To delete this task, please enter the admin password:");
    if (password !== 'delete123') {
        if (password !== null) alert("Incorrect password.");
        return;
    }

    const scrumData = await DB.getScrumData(jobNo);
    const taskToDelete = scrumData.tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    scrumData.tasks = scrumData.tasks.filter(t => t.id !== taskId);
    await DB.putScrumData(scrumData);
    
    Bulletin.log('Task Deleted', `Task "<strong>${taskToDelete.name}</strong>" was deleted from project <strong>${jobNo}</strong>.`);
    
    App.DOMElements['task-modal'].style.display = 'none';
    const activeTab = App.DOMElements['design-view'].querySelector('.tabs .active');
    handleDesignViewSwitch({ target: activeTab });
    renderDashboard();
}

async function handleTaskStatusUpdate(taskId, newStatus, jobNo) {
    if (!jobNo) return;
    
    const scrumData = await DB.getScrumData(jobNo);
    if (!scrumData) return;

    const task = scrumData.tasks.find(t => t.id == taskId);
    if (task && task.status !== newStatus) {
        const oldStatus = task.status;
        task.status = newStatus;
        const today = new Date().toISOString().split('T')[0];
        if (newStatus === 'In Progress' && !task.startDate) task.startDate = today;
        if (newStatus === 'Done') task.completedDate = today;
        if (oldStatus === 'Done' && newStatus !== 'Done') task.completedDate = null;
        await DB.putScrumData(scrumData);
        Bulletin.log('Scrum Task Update', `Task "<strong>${task.name}</strong>" for <strong>${jobNo}</strong> moved to <strong>${newStatus}</strong>.`);
        renderDashboard();
    }
}

async function showAddTaskModal() {
    App.DOMElements['add-task-name'].value = '';
    App.DOMElements['add-task-planned-duration'].value = 1;
    App.DOMElements['add-task-duedate'].value = '';
    App.DOMElements['add-task-to-similar'].checked = false;
    const staffList = await DB.getAllHRData();
    const assigneeSelect = App.DOMElements['add-task-assignee'];
    assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
    staffList.forEach(s => assigneeSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`);
    const departmentSelect = App.DOMElements['add-task-department'];
    departmentSelect.innerHTML = '';
    for (const dept in DEPARTMENT_COLORS) departmentSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
    App.DOMElements['add-task-modal'].style.display = 'flex';
}

async function handleAddTaskSave() {
    const jobNo = App.DOMElements['design-project-selector'].value;
    if (!jobNo) return;
    const taskName = App.DOMElements['add-task-name'].value;
    if (!taskName) { alert('Task Name is required.'); return; }
    const currentProject = await DB.getProject(jobNo);
    let scrumData = await DB.getScrumData(jobNo);
    if (!scrumData) {
        scrumData = { jobNo, tasks: [] };
    }
    const maxId = scrumData.tasks.reduce((max, task) => Math.max(max, task.id), 999);
    const newTask = {
        id: maxId + 1, name: taskName, status: 'Up Next',
        department: App.DOMElements['add-task-department'].value,
        assigneeId: parseInt(App.DOMElements['add-task-assignee'].value) || null,
        dueDate: App.DOMElements['add-task-duedate'].value || null,
        plannedDuration: parseInt(App.DOMElements['add-task-planned-duration'].value) || 1,
        startDate: null, completedDate: null,
        dateAdded: new Date().toISOString().split('T')[0]
    };
    scrumData.tasks.push(newTask);
    await DB.putScrumData(scrumData);
    if (App.DOMElements['add-task-to-similar'].checked) {
        const allProjects = await DB.getAllProjects();
        const similarProjects = allProjects.filter(p => p.projectType === currentProject.projectType && p.jobNo !== jobNo);
        for (const project of similarProjects) {
            let otherScrumData = await DB.getScrumData(project.jobNo);
            if (!otherScrumData) {
                 otherScrumData = { jobNo: project.jobNo, tasks: [] };
            }  
            const maxOtherId = otherScrumData.tasks.reduce((max, task) => Math.max(max, task.id), 999);
                otherScrumData.tasks.push({ ...newTask, id: maxOtherId + 1 });
                await DB.putScrumData(otherScrumData);
        }
        App.Bulletin.log('Bulk Task Add', `Custom task "<strong>${newTask.name}</strong>" added to <strong>${similarProjects.length + 1}</strong> projects of type <strong>${currentProject.projectType}</strong>.`);
    }
    App.DOMElements['add-task-modal'].style.display = 'none';
    const activeTab = App.DOMElements['design-view'].querySelector('.tabs .active');
    handleDesignViewSwitch({ target: activeTab });
    renderDashboard();
}

async function handleEqualizeTasks() {
    if (!confirm("This will automatically reschedule all 'Up Next', 'To Do', and 'In Progress' tasks sequentially for each assignee, skipping weekends and public holidays. Are you sure?")) return;

    const jobNo = App.DOMElements['design-project-selector'].value;
    const scrumData = await DB.getScrumData(jobNo);
    if (!scrumData) return;
    
    const currentYear = new Date().getFullYear();
    const holidays = await DB.getHolidays('AE', currentYear);
    const holidaySet = new Set(holidays.map(h => h.date));

    const tasksByAssignee = scrumData.tasks.reduce((acc, task) => {
        if (task.status !== 'Done') {
            const assigneeId = task.assigneeId || 'unassigned';
            if (!acc[assigneeId]) acc[assigneeId] = [];
            acc[assigneeId].push(task);
        }
        return acc;
    }, {});
    
    const addWorkDays = (date, days) => {
        let d = new Date(date);
        let added = 0;
        while (added < days) {
            d.setDate(d.getDate() + 1);
            const dayOfWeek = d.getDay();
            const dateStr = d.toISOString().split('T')[0];
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) { // Skip Sun, Sat, and holidays
                added++;
            }
        }
        return d;
    };
    
    let tasksUpdatedCount = 0;
    for (const assigneeId in tasksByAssignee) {
        const tasks = tasksByAssignee[assigneeId];
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        
        const sortedTasks = [];
        const visited = new Set();
        function visit(task) {
            if (!task || visited.has(task.id)) return;
            visited.add(task.id);
            (task.dependencies || []).forEach(depId => {
                const depTask = taskMap.get(depId);
                if(depTask) visit(depTask);
            });
            sortedTasks.push(task);
        }
        tasks.forEach(visit);

        let lastDueDate = new Date(); // Start from today
        sortedTasks.forEach(task => {
            const duration = task.plannedDuration || 1;
            const newDueDate = addWorkDays(lastDueDate, duration);
            task.dueDate = newDueDate.toISOString().split('T')[0];
            lastDueDate = newDueDate;
            tasksUpdatedCount++;
        });
    }

    await DB.putScrumData(scrumData);
    alert(`${tasksUpdatedCount} tasks have been rescheduled.`);
    Bulletin.log('Tasks Equalized', `Tasks for project <strong>${jobNo}</strong> have been rescheduled.`);
    const activeTab = App.DOMElements['design-view'].querySelector('.tabs .active');
    handleDesignViewSwitch({ target: activeTab }); // Refresh view
}

// --- UI SETUP & EVENT LISTENERS ---
function populateControlTabs() {
    Object.values(App.ProjectTabs).forEach(module => module.init?.());
}

function handleTabSwitch(event) {
    if (!event.target.matches('.tab-button')) return;
    const button = event.target;
    const tabsContainer = button.parentElement;
    tabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    const isControlTab = tabsContainer.classList.contains('control-tabs');
    const contentSelector = isControlTab ? '.tab-content' : '.preview-tab-content';
    const parentContainer = button.closest('.controls') || button.closest('.preview-area');
    parentContainer.querySelectorAll(contentSelector).forEach(panel => panel.classList.remove('active'));
    const panelIdToShow = isControlTab ? `${button.dataset.tab}-tab` : `${button.dataset.tab}-preview`;
    document.getElementById(panelIdToShow)?.classList.add('active');
    if (tabsContainer.classList.contains('preview-tabs')) {
        updateActivePreview(button.dataset.tab);
    }
}

async function handleGeneratePdf() {
    if (!App.currentProjectJobNo) return;
    const activePreviewTab = App.DOMElements.previewTabs.querySelector('.tab-button.active');
    if (!activePreviewTab) { alert('Could not determine active preview tab.'); return; }
    const previewId = activePreviewTab.dataset.tab + "-preview";
    const project = await DB.getProject(App.currentProjectJobNo);
    const previewElement = document.getElementById(previewId);
    const invoiceNo = previewElement ? previewElement.dataset.invoiceNo : null;
    const fileName = `${project.jobNo.replace(/\//g, '-')}_${activePreviewTab.dataset.tab}`;
    PDFGenerator.generate({
        previewId,
        projectJobNo: App.currentProjectJobNo,
        pageSize: App.DOMElements['page-size-selector'].value,
        fileName,
        watermarkText: invoiceNo
    });
}

function initResizer() {
    const resizer = App.DOMElements.resizer; 
    if(!resizer) return;
    const container = resizer.parentElement; 
    const leftPanel = container.querySelector('.controls');
    let isResizing = false, startX, startWidth;
    resizer.addEventListener('mousedown', (e) => { e.preventDefault(); isResizing = true; startX = e.clientX; startWidth = leftPanel.offsetWidth; document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', stopResize); });
    function handleMouseMove(e) { if (!isResizing) return; const newWidth = startWidth + (e.clientX - startX); if (newWidth > 300 && newWidth < (container.offsetWidth - 300)) leftPanel.style.width = newWidth + 'px'; }
    function stopResize() { isResizing = false; document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', stopResize); }
}

function setupEventListeners() {
    App.DOMElements['design-studio-btn']?.addEventListener('click', showDesignStudio);
    App.DOMElements['back-to-dashboard-btn']?.addEventListener('click', showDashboard);
    App.DOMElements['back-to-dashboard-btn-from-design']?.addEventListener('click', showDashboard);
    App.DOMElements['load-from-file-btn']?.addEventListener('click', () => App.DOMElements['xml-file-input']?.click());
    App.DOMElements['xml-file-input']?.addEventListener('change', handleProjectFileImport);
    App.DOMElements['load-site-update-btn']?.addEventListener('click', () => App.DOMElements['site-update-file-input']?.click());
    App.DOMElements['site-update-file-input']?.addEventListener('change', handleSiteUpdateImport);
    App.DOMElements['save-to-file-btn']?.addEventListener('click', handleFileExport);
    App.DOMElements['new-project-btn']?.addEventListener('click', handleNewProject);
    App.DOMElements['save-project-btn']?.addEventListener('click', saveCurrentProject);
    App.DOMElements.controlTabs?.addEventListener('click', handleTabSwitch);
    App.DOMElements.previewTabs?.addEventListener('click', handleTabSwitch);
    App.DOMElements['generate-pdf-btn']?.addEventListener('click', handleGeneratePdf);
    App.DOMElements['search-box']?.addEventListener('input', renderDashboard);
    App.DOMElements['toggle-invoices-btn']?.addEventListener('click', () => {
        App.showAllInvoices = !App.showAllInvoices;
        App.DOMElements['toggle-invoices-btn'].textContent = App.showAllInvoices ? 'Show Pending Invoices' : 'Show All Invoices';
        renderDashboard();
    });
    App.DOMElements['project-list-body']?.addEventListener('click', async (e) => {
        const row = e.target.closest('tr');
        if (!row?.dataset?.jobNo && !e.target.matches('.bill-monthly-btn')) return;
        
        if (e.target.matches('.edit-btn')) handleEditProject(row.dataset.jobNo);
        else if (e.target.matches('.file-link:not(.not-available)')) {
            e.preventDefault();
            const fileId = parseInt(e.target.dataset.fileId, 10);
            const file = await DB.getFileById(fileId);
            if (file) App.ProjectTabs.Documents.showFilePreviewModal(file);
        } else if (e.target.matches('.bill-monthly-btn')) {
            e.preventDefault();
            const jobNo = e.target.dataset.jobNo;
            handleQuickBillMonthly(jobNo);
        }
    });
    App.DOMElements['dash-cal-prev-btn']?.addEventListener('click', () => DashboardCalendar.changeMonth(-1));
    App.DOMElements['dash-cal-next-btn']?.addEventListener('click', () => DashboardCalendar.changeMonth(1));
    App.DOMElements['pending-invoices-summary']?.addEventListener('click', showPendingInvoicesModal);
    App.DOMElements['expiring-documents-summary']?.addEventListener('click', showExpiringDocumentsModal);
    App.DOMElements['pending-modal-close-btn']?.addEventListener('click', () => App.DOMElements['pending-invoice-modal'].style.display = 'none');
    App.DOMElements['expiring-modal-close-btn']?.addEventListener('click', () => App.DOMElements['expiring-documents-modal'].style.display = 'none');
    App.DOMElements['site-files-modal-close-btn']?.addEventListener('click', () => App.DOMElements['site-files-modal'].style.display = 'none');
    
    const filePreviewModal = App.DOMElements['file-preview-modal'];
    filePreviewModal?.addEventListener('click', (e) => {
        if (e.target === filePreviewModal) {
            filePreviewModal.style.display = 'none';
        }
    });
    App.DOMElements['file-modal-close']?.addEventListener('click', () => filePreviewModal.style.display = 'none');

    App.DOMElements['design-view']?.querySelector('.tabs')?.addEventListener('click', handleDesignViewSwitch);
    App.DOMElements['design-project-selector']?.addEventListener('change', handleDesignViewSwitch);
    
    
    App.DOMElements['department-filter']?.addEventListener('change', applyScrumBoardFilters);
    App.DOMElements['staff-filter']?.addEventListener('change', applyScrumBoardFilters);
    App.DOMElements['design-project-selector']?.addEventListener('change', handleDesignProjectSelect);
    App.DOMElements['add-custom-task-btn']?.addEventListener('click', showAddTaskModal);
    App.DOMElements['add-task-modal-close-btn']?.addEventListener('click', () => App.DOMElements['add-task-modal'].style.display = 'none');
    App.DOMElements['save-new-task-btn']?.addEventListener('click', handleAddTaskSave);
    
    App.DOMElements['task-modal-close-btn']?.addEventListener('click', () => App.DOMElements['task-modal'].style.display = 'none');
    App.DOMElements['save-task-btn']?.addEventListener('click', handleTaskSave);
    App.DOMElements['delete-task-btn']?.addEventListener('click', handleDeleteTask);
    App.DOMElements['equalize-tasks-btn']?.addEventListener('click', handleEqualizeTasks);
    
    App.DOMElements['design-summary-panel']?.addEventListener('click', (e) => {
        const summaryBox = e.target.closest('.summary-box');
        if (!summaryBox) return;
        const targetButton = App.DOMElements['design-view'].querySelector(`.tabs .tab-button[data-view="${summaryBox.dataset.viewTarget}"]`);
        if (targetButton) targetButton.click();
    });
    App.DOMElements['payment-modal-close-btn']?.addEventListener('click', () => App.DOMElements['record-payment-modal'].style.display = 'none');
    
    // Listeners for All Projects Report Modal
    App.DOMElements['generate-all-projects-report-btn']?.addEventListener('click', showAllProjectsReportModal);
    App.DOMElements['all-projects-report-modal-close-btn']?.addEventListener('click', () => App.DOMElements['all-projects-report-modal'].style.display = 'none');
    App.DOMElements['all-projects-report-select-all-btn']?.addEventListener('click', () => {
        App.DOMElements['all-projects-report-project-list'].querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    });
    App.DOMElements['generate-multi-report-btn']?.addEventListener('click', generateAndShowMultiReport);
    App.DOMElements['download-multi-report-pdf-btn']?.addEventListener('click', () => {
        PDFGenerator.generate({
            previewId: 'all-projects-report-preview-container',
            projectJobNo: 'All_Projects_Report',
            pageSize: 'A4_portrait',
            fileName: 'All_Projects_Status_Report'
        });
    });
}

function cacheDOMElements() {
    const ids = [
        'app-container', 'dashboard-view', 'project-view', 'resizer','design-view',
        'design-studio-btn', 'back-to-dashboard-btn-from-design', 'design-project-selector', 'scrum-board-container', 'design-calendar-container', 'design-view', 'design-agenda-container', 'design-assignee-container', 'department-filter-group', 'department-filter', 'staff-filter-group', 'staff-filter',
        'design-scrum-progress-container',
        'add-default-tasks-btn', 'add-custom-task-btn', 'equalize-tasks-btn', 'add-task-modal', 'add-task-modal-close-btn', 'add-task-modal-title', 'add-task-name', 'add-task-planned-duration', 'add-task-department', 'add-task-assignee', 'add-task-duedate', 'add-task-to-similar', 'save-new-task-btn',
        'vendor-master-search', 'vendor-search-results-body', 'project-vendor-list-body',            
        'design-summary-panel', 'summary-running', 'summary-due-today', 'summary-overdue', 'summary-planned',
        'task-modal', 'task-modal-close-btn', 'task-modal-title', 'task-modal-id', 'task-modal-jobno', 'task-modal-assignee', 'task-modal-planned-duration', 'task-modal-duedate', 'task-modal-status', 'save-task-btn', 'delete-task-btn', 'task-modal-department',
        'new-project-btn', 'search-box', 'project-list-body', 'load-from-file-btn', 'save-to-file-btn', 'xml-file-input', 'load-site-update-btn', 'site-update-file-input', 'toggle-invoices-btn',
        'pending-invoices-summary', 'pending-invoices-count', 'pending-invoices-amount', 'last-paid-amount', 'on-hold-amount', 'expiring-documents-summary', 'expiring-documents-count',
        'back-to-dashboard-btn', 'save-project-btn', 'project-view-title', 'page-size-selector', 'generate-pdf-btn',
        'main-tab', 'scope-tab', 'fees-tab', 'invoicing-tab', 'swimming-pool-tab', // MODIFICATION: Add new tab ID
        'documents-tab', 'tender-tab', 'vendors-tab', 'payment-cert-tab', 'schedule-tab', 'tools-tab', 'project-letters-tab',
        'brief-proposal-preview', 'full-agreement-preview', 'assignment-order-preview', 'tax-invoice-preview', 'tender-package-preview', 'vendor-list-preview', 'payment-certificate-preview', 'villa-schedule-preview', 'project-letter-preview', 'proforma-preview', 'receipt-preview',
        'project-letter-type', 'project-letter-authority', 'project-letter-dynamic-fields', 'generate-project-letter-btn',
        'jobNo', 'agreementDate', 'projectStatus', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn', 'projectDescription', 'plotNo', 'area',
        'authority', 'otherAuthority', 'otherAuthorityContainer', 'projectType', 'builtUpArea', 'scope-selection-container', 'vatRate', 'lump-sum-group', 'lumpSumFee', 'percentage-group', 'constructionCostRate',
        'total-construction-cost-display', 'consultancyFeePercentage', 'designFeeSplit', 'supervisionFeeSplitDisplay', 'financial-summary-container', 'fee-milestone-group',
        'designDuration', 'constructionDuration', 'extendedSupervisionFee', 'notes-group', 'invoice-history-body', 'newInvoiceNo', 'milestone-billing-body',
        'supervision-billing-monthly-container', 
        'current-invoice-items-body', 'raise-invoice-btn',
        'payment-cert-no', 'generate-new-cert-btn', 'cert-history-body', 
        'pending-invoice-modal', 'pending-modal-close-btn', 'pending-invoice-list', 'expiring-documents-modal', 'expiring-modal-close-btn', 'expiring-documents-list',
        'site-files-modal', 'site-files-modal-close-btn', 'site-files-modal-title', 'site-photos-gallery', 'site-docs-gallery',
        'file-preview-modal', 'file-modal-close', 'file-preview-container',
        'bulletin-list', 'dash-cal-prev-btn', 'dash-cal-next-btn', 'dash-cal-month-year', 'dash-cal-body',
        'record-payment-modal', 'payment-modal-close-btn', 'payment-modal-inv-no', 'payment-modal-jobno', 'payment-modal-inv-index',
        'payment-method', 'payment-amount', 'payment-date', 'cheque-details-group', 'payment-cheque-no', 'payment-cheque-date',
        'payment-cheque-bank', 'save-payment-btn',
        'project-report-preview', 'toggle-report-options-btn', 'report-options-container', 'generate-report-preview-btn',
        'generate-all-projects-report-btn', 'all-projects-report-modal', 'all-projects-report-modal-close-btn', 'all-projects-report-project-list',
        'all-projects-report-select-all-btn', 'generate-multi-report-btn', 'all-projects-report-preview-container', 'download-multi-report-pdf-btn'
    ];
    ids.forEach(id => { 
        const el = document.getElementById(id);
        if (el) App.DOMElements[id] = el;
    });
    App.DOMElements.controlTabs = App.DOMElements['project-view']?.querySelector('.control-tabs');
    App.DOMElements.previewTabs = App.DOMElements['project-view']?.querySelector('.preview-tabs');
}

main();

});