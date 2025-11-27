
// Global App object to hold shared state, DOM elements, and helper functions
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
otherInputEl.parentElement.style.display = 'none';
} else {
selectEl.value = 'Other';
otherInputEl.value = value || otherValue || '';
otherInputEl.parentElement.style.display = 'block';
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
        populateControlTabs(); // Populates tab containers
        initResizer();
        setupEventListeners();
        await renderDashboard();
        await DashboardCalendar.render();
        await Bulletin.render();
        setInterval(checkForUpdates, 5 * 60 * 1000); // Check every 5 minutes
    } catch (error) {
        console.error("Fatal Error initializing application:", error);
        document.body.innerHTML = `<div style='padding:40px; text-align:center; color:red;'><h2>Application Failed to Start</h2><p>Could not initialize the database. Please try clearing your browser's cache and site data for this page and try again.</p><p><i>Error: ${error.message}</i></p></div>`;
    }
}

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

        const statusHtml = `<div>Office: <span class="status-${officeStatusClass}">${p.projectStatus || 'Pending'}</span></div> <div style="margin-top:4px;">Site: <span class="status-${siteStatusClass}">${siteStatus}</span></div> <div class="progress-bar-container" style="height:14px; margin-top:4px;"><div class="progress-bar" style="width:${progress}%; height:14px; font-size:0.7em;">${progress}%</div></div>`;
        const masterFiles = await DB.getFiles(p.jobNo, 'master');
        const affectionPlanFile = masterFiles.find(f => f.subCategory === 'affection_plan');
        const docHtml = affectionPlanFile ? `<a href="#" class="file-link" data-file-id="${affectionPlanFile.id}">Affection Plan</a>` : `<span class="file-link not-available">Affection Plan</span>`;
        
        const invoicesToDisplay = App.showAllInvoices ? (p.invoices || []) : (p.invoices || []).filter(inv => inv.status === 'Raised' || inv.status === 'Pending');
        const invoiceDetailsHtml = invoicesToDisplay.length > 0 ? invoicesToDisplay.map(inv => `<div class="invoice-row status-${(inv.status || '').toLowerCase()}"><span><b>${inv.no}</b></span><span>${inv.date}</span><span style="font-weight:bold; text-align:right;">${App.formatCurrency(parseFloat(inv.amount || 0))}</span><span>(${inv.status})</span></div>`).join('') : (App.showAllInvoices ? 'No invoices' : 'No pending invoices');

        row.innerHTML = `<td>${p.jobNo}</td><td>${p.clientName}<br><small>${p.clientMobile||''}</small></td><td>${p.plotNo}<br><small><b>${p.projectType || 'N/A'}</b> / ${p.agreementDate||''}</small></td><td>${statusHtml}</td><td>${docHtml}</td><td><div class="invoice-container">${invoiceDetailsHtml}</div></td><td><button class="edit-btn">View/Edit</button></td>`;
    }
}

async function updateDashboardSummary(projects) {
    let totalPendingAmount = 0, pendingInvoiceCount = 0, totalOnHoldAmount = 0, lastPaidInvoice = null;
    projects.forEach(p => {
        (p.invoices || []).forEach(inv => {
            const amount = parseFloat(inv.amount || 0);
            if (inv.status === 'Raised' || inv.status === 'Pending') {
                pendingInvoiceCount++;
                totalPendingAmount += amount;
            } else if (inv.status === 'Paid' && inv.date) {
                if (!lastPaidInvoice || new Date(inv.date) > new Date(lastPaidInvoice.date)) lastPaidInvoice = inv;
            } else if (inv.status === 'On Hold') {
                totalOnHoldAmount += amount;
            }
        });
    });

    App.DOMElements['pending-invoices-count'].textContent = pendingInvoiceCount;
    App.DOMElements['pending-invoices-amount'].textContent = `AED ${App.formatCurrency(totalPendingAmount)}`;
    App.DOMElements['last-paid-amount'].textContent = lastPaidInvoice ? `AED ${App.formatCurrency(lastPaidInvoice.amount)}` : 'N/A';
    App.DOMElements['on-hold-amount'].textContent = `AED ${App.formatCurrency(totalOnHoldAmount)}`;
    
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
                <td>${App.formatDate(inv.date)}</td><td style="text-align:right;">${App.formatCurrency(inv.amount)}</td>
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

async function handleFileExport() {
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
        // Populate data for all tabs
        Object.values(App.ProjectTabs).forEach(tabModule => tabModule.populateTabData?.(project));

        App.DOMElements['project-view-title'].textContent = `Editing Project: ${jobNo}`;
        showProjectView();
        
        // Initial render for tabs that need it
        App.ProjectTabs.Invoicing.renderInvoicingTab(project);
        App.ProjectTabs.PaymentCert.renderTab(project);
        App.ProjectTabs.Documents.renderAllGalleries(jobNo);

        refreshCurrentPreview();
    }
}

async function handleNewProject() {
    const allProjects = await DB.getAllProjects();
    const nextId = allProjects.length > 0 ? Math.max(...allProjects.map(p => parseInt(p.jobNo.split('/').pop(), 10) || 0)) + 1 : 1;
    const jobNo = `RRC/${new Date().getFullYear()}/${String(nextId).padStart(3, '0')}`;
    const todayStr = new Date().toISOString().split('T')[0];
    
    let newProject = { 
        jobNo, agreementDate: todayStr, scope: {}, notes: {}, invoices: [], 
        remunerationType: 'percentage', vatRate: 5, designFeeSplit: 60, supervisionBillingMethod: 'monthly', 
        feeMilestonePercentages: {}, scheduleTasks: []
    };
   
    const scrumTasks = DESIGN_SCRUM_TEMPLATE.map(task => ({
        ...task, status: 'Up Next', assigneeId: null, dueDate: null, startDate: null,
        completedDate: null, dateAdded: todayStr
    }));
    await DB.putScrumData({ jobNo, tasks: scrumTasks });
    
    CONTENT.FEE_MILESTONES.forEach(item => newProject.feeMilestonePercentages[item.id] = item.defaultPercentage);
    newProject.scheduleTasks = UrbanAxisSchedule.calculateDynamicSchedule(newProject, CONTENT.VILLA_SCHEDULE_TEMPLATE, []);

    App.currentProjectJobNo = jobNo;
    App.currentInvoiceIndex = null;

    // Populate form with default data
    Object.values(App.ProjectTabs).forEach(tabModule => tabModule.populateTabData?.(newProject));
    App.ProjectTabs.Invoicing.renderInvoicingTab(newProject);
    
    App.DOMElements['project-view-title'].textContent = `Creating New Project: ${jobNo}`;
    showProjectView();
    App.DOMElements['documents-tab'].querySelectorAll('.gallery-grid').forEach(grid => { grid.innerHTML = '<p>Please save the project before uploading documents.</p>'; });
    Bulletin.log('New Project Created', `Project <strong>${jobNo}</strong> has been created.`);
    refreshCurrentPreview();
} 

async function saveCurrentProject() {
    if (!App.currentProjectJobNo) return;

    let uiData = {};
    // Aggregate data from all tabs
    Object.values(App.ProjectTabs).forEach(tabModule => {
        if (tabModule.getTabData) {
            Object.assign(uiData, tabModule.getTabData());
        }
    });

    const existingProject = await DB.getProject(App.currentProjectJobNo) || {};
    
    if (existingProject.projectStatus !== uiData.projectStatus) {
        Bulletin.log('Project Status Changed', `Status for project <strong>${App.currentProjectJobNo}</strong> changed to <strong>${uiData.projectStatus}</strong>.`);
    }

    const projectToSave = { ...existingProject, ...uiData, jobNo: App.currentProjectJobNo };

    await DB.putProject(projectToSave);
    alert(`Project ${App.currentProjectJobNo} saved successfully.`);
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
    
    // Aggregate data from UI to get the most current state for the preview
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
        'proforma': () => App.ProjectTabs.Invoicing.renderInvoiceDocuments(fullData.invoices?.[App.currentInvoiceIndex ?? fullData.invoices.length - 1]),
        'tax-invoice': () => App.ProjectTabs.Invoicing.renderInvoiceDocuments(fullData.invoices?.[App.currentInvoiceIndex ?? fullData.invoices.length - 1]),
        'receipt': () => App.ProjectTabs.Invoicing.renderInvoiceDocuments(fullData.invoices?.[App.currentInvoiceIndex ?? fullData.invoices.length - 1]),
        'tender-package': () => PROJECT_DOCUMENT_TEMPLATES.tenderPackage(fullData),
        'vendor-list': () => PROJECT_DOCUMENT_TEMPLATES.vendorList(fullData),
        'payment-certificate': () => App.ProjectTabs.PaymentCert.renderPreview(null),
        'villa-schedule': () => App.ProjectTabs.Schedule.renderPreview(fullData),
        'project-letter': () => App.ProjectTabs.Letters.renderPreview(fullData)
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
// (Design Studio functions remain here as they are a separate major view)
async function showDesignStudio() {
    showView('design-view');
    await renderDesignSummary(); 
    const projects = await DB.getAllProjects();
    const designProjects = projects.filter(p => !['Modification', 'AOR Service'].includes(p.scopeOfWorkType));
    const selector = App.DOMElements['design-project-selector'];
    selector.innerHTML = '<option value="">-- Select a Project --</option>';
    designProjects.forEach(p => {
        selector.innerHTML += `<option value="${p.jobNo}">${p.jobNo} - ${p.projectDescription}</option>`;
    });
    const boardButton = App.DOMElements['design-view'].querySelector('[data-view="board"]');
    if (boardButton) handleDesignViewSwitch({ target: boardButton });
}

// --- MODIFICATION START: New function to render the summary panel with prioritized logic ---
    async function renderDesignSummary() {
        const allScrumData = await DB.getAllScrumData();
        if (!allScrumData) return;

        let running = 0;
        let dueToday = 0;
        let overdue = 0;
        let planned = 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        allScrumData.forEach(project => {
            project.tasks.forEach(task => {
                if (task.status === 'Done') return;

                // Always count planned tasks independently
                if (task.status === 'Up Next' || task.status === 'To Do') {
                    planned++;
                }

                // Prioritized counting for urgent tasks
                const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                if (dueDate && dueDate < today) {
                    overdue++;
                } else if (dueDate && dueDate.getTime() === today.getTime()) {
                    dueToday++;
                } else if (task.status === 'In Progress') {
                    running++;
                }
            });
        });

        DOMElements['summary-running'].textContent = running;
        DOMElements['summary-due-today'].textContent = dueToday;
        DOMElements['summary-overdue'].textContent = overdue;
        DOMElements['summary-planned'].textContent = planned;
    }

 async function handleDesignViewSwitch(event) {
        const button = event.target;
        if (!button) return;
        const view = button.dataset.view;
       DOMElements['design-summary-panel']?.addEventListener('click', (e) => {
            const summaryBox = e.target.closest('.summary-box');
            if (!summaryBox) return;

            const targetView = summaryBox.dataset.viewTarget;
            const targetButton = DOMElements['design-view'].querySelector(`.tabs .tab-button[data-view="${targetView}"]`);
            if (targetButton) {
                targetButton.click();
            }
        });
        document.querySelectorAll('#design-view .tabs .tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        document.querySelectorAll('.design-view-content').forEach(el => el.style.display = 'none');
        
        const jobNo = DOMElements['design-project-selector'].value;
        const deptFilterGroup = DOMElements['department-filter-group'];
// --- MODIFICATION START ---
        const staffFilterGroup = DOMElements['staff-filter-group'];
         const addTaskBtn = DOMElements['add-task-btn'];
        // Show/hide project selector and department filter based on view
        // MODIFICATION

        // Show/hide project selector and filters based on view
        const isBoardView = view === 'board';
        DOMElements['design-project-selector'].style.display = isBoardView ? 'block' : 'none';
        
        const showFiltersAndButton = isBoardView && jobNo;
        deptFilterGroup.style.display = showFiltersAndButton ? 'flex' : 'none';
        staffFilterGroup.style.display = showFiltersAndButton ? 'flex' : 'none';
        addTaskBtn.style.display = showFiltersAndButton ? 'inline-block' : 'none'; // MODIFICATION
        // --- MODIFICATION END ---
        
        if (view === 'board') {
            DOMElements['scrum-board-container'].style.display = 'grid';
            if (jobNo) {
                const scrumData = await DB.getScrumData(jobNo);
                const staffList = await DB.getAllHRData();
                if (scrumData) {
                    ScrumBoard.render(scrumData, staffList, handleTaskStatusUpdate, showTaskModal, DEPARTMENT_COLORS);
                    populateDepartmentFilter(scrumData.tasks);
                     populateStaffFilter(scrumData.tasks, staffList);
                    applyScrumBoardFilters(); // Apply default filters on render
                    // --- MODIFICATION END ---
                }
            } else {
                 DOMElements['scrum-board-container'].innerHTML = '<p style="text-align:center; padding-top: 50px; color: #888;">Please select a project to view its design board.</p>';
            }
        } else {
            // Data needed for cross-project views
            const allScrum = await DB.getAllScrumData();
            const allStaff = await DB.getAllHRData();
            const allProjects = await DB.getAllProjects();
            
            if (view === 'calendar') {
                DOMElements['design-calendar-container'].style.display = 'block';
                DesignCalendar.render(allScrum, allStaff, allProjects);
            } else if (view === 'agenda') {
                DOMElements['design-agenda-container'].style.display = 'block';
                DesignCalendar.renderAgenda(allScrum, allStaff, allProjects);
            } else if (view === 'assignee') {
                DOMElements['design-assignee-container'].style.display = 'block';
                ScrumBoard.renderByAssignee(allScrum, allStaff, showTaskModal);
            }
        }
       
    }
function populateDepartmentFilter(tasks) {
        const filterSelect = DOMElements['department-filter'];
        const departments = [...new Set(tasks.map(t => t.department || 'Default'))];
        filterSelect.innerHTML = '<option value="">All Departments</option>';
        departments.sort().forEach(dept => {
            filterSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
        });
    }
/**
     * NEW: Combined filter function for both department and staff.
     */
    function applyScrumBoardFilters() {
        const selectedDept = DOMElements['department-filter'].value;
        const selectedStaffId = DOMElements['staff-filter'].value;
        
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
    // --- MODIFICATION END ---
    function handleDepartmentFilter() {
        const selectedDept = DOMElements['department-filter'].value;
        const cards = document.querySelectorAll('#scrum-board-container .scrum-card');
        cards.forEach(card => {
            if (!selectedDept || card.dataset.department === selectedDept) {
                card.classList.remove('filtered-out');
            } else {
                card.classList.add('filtered-out');
            }
        });
    }
// --- MODIFICATION START: New function to populate staff filter ---
    function populateStaffFilter(tasks, allStaff) {
        const filterSelect = DOMElements['staff-filter'];
        const staffMap = new Map(allStaff.map(s => [s.id, s.name]));
        const assignedIds = [...new Set(tasks.map(t => t.assigneeId).filter(id => id != null))];

        filterSelect.innerHTML = '<option value="">All Assignees</option>';
        
        // Add assigned staff
        assignedIds.forEach(id => {
            const name = staffMap.get(id);
            if (name) {
                filterSelect.innerHTML += `<option value="${id}">${name}</option>`;
            }
        });

        // Check if there are unassigned tasks and add the option if so
        if (tasks.some(t => !t.assigneeId)) {
            filterSelect.innerHTML += `<option value="unassigned">Unassigned</option>`;
        }
    }
   async function showTaskModal(taskId, jobNo) {
        const scrumData = await DB.getScrumData(jobNo);
        const task = scrumData.tasks.find(t => t.id == taskId);
        if (!task) return;

        DOMElements['task-modal-id'].value = taskId;
        DOMElements['task-modal-jobno'].value = jobNo;
        DOMElements['task-modal-title'].textContent = `Edit Task: ${task.name}`;
        
        const staffList = await DB.getAllHRData();
        const assigneeSelect = DOMElements['task-modal-assignee'];
        assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
        staffList.forEach(s => {
            assigneeSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });

        const departmentSelect = DOMElements['task-modal-department'];
        departmentSelect.innerHTML = '';
        for (const dept in DEPARTMENT_COLORS) {
            departmentSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
        }

        assigneeSelect.value = task.assigneeId || '';
        departmentSelect.value = task.department || 'Default';
        DOMElements['task-modal-duedate'].value = task.dueDate || '';
        DOMElements['task-modal-status'].value = task.status || 'To Do';

        DOMElements['task-modal'].style.display = 'flex';
    }

   async function handleTaskSave() {
        const taskId = parseInt(DOMElements['task-modal-id'].value);
        const jobNo = DOMElements['task-modal-jobno'].value;
        
        const scrumData = await DB.getScrumData(jobNo);
        const task = scrumData.tasks.find(t => t.id === taskId);
        if (!task) return;

        if(task.status !== DOMElements['task-modal-status'].value) {
            Bulletin.log('Scrum Task Update', `Task "<strong>${task.name}</strong>" for project <strong>${jobNo}</strong> moved to <strong>${DOMElements['task-modal-status'].value}</strong>.`);
        }
        if (task.assigneeId !== (parseInt(DOMElements['task-modal-assignee'].value) || null)) {
            const staffList = await DB.getAllHRData();
            const newAssignee = staffList.find(s => s.id === parseInt(DOMElements['task-modal-assignee'].value))?.name || 'Unassigned';
            Bulletin.log('Task Reassigned', `Task "<strong>${task.name}</strong>" for project <strong>${jobNo}</strong> assigned to <strong>${newAssignee}</strong>.`);
        }
        
        task.assigneeId = parseInt(DOMElements['task-modal-assignee'].value) || null;
        task.department = DOMElements['task-modal-department'].value;
        task.dueDate = DOMElements['task-modal-duedate'].value;
        task.status = DOMElements['task-modal-status'].value;
        
        await DB.putScrumData(scrumData);
        DOMElements['task-modal'].style.display = 'none';

        const activeTab = DOMElements['design-view'].querySelector('.tabs .active');
        handleDesignViewSwitch({target: activeTab});
    }

 // MODIFICATION: This function now tracks start and end dates
    async function handleTaskStatusUpdate(taskId, newStatus) {
        const jobNo = DOMElements['design-project-selector'].value;
        if (!jobNo) return;
        const scrumData = await DB.getScrumData(jobNo);
        const task = scrumData.tasks.find(t => t.id == taskId);
        if (task && task.status !== newStatus) {
            const oldStatus = task.status;
            task.status = newStatus;

            const today = new Date().toISOString().split('T')[0];

            // If task moves into progress for the first time, set start date
            if (newStatus === 'In Progress' && !task.startDate) {
                task.startDate = today;
            }
            // If task is completed, set the completion date
            if (newStatus === 'Done') {
                task.completedDate = today;
            }
            // If task is moved out of 'Done', clear completion date
            if (oldStatus === 'Done' && newStatus !== 'Done') {
                task.completedDate = null;
            }

            await DB.putScrumData(scrumData);
            Bulletin.log('Scrum Task Update', `Task "<strong>${task.name}</strong>" for project <strong>${jobNo}</strong> moved to <strong>${newStatus}</strong>.`);
        }
    }
// MODIFICATION: New functions for adding custom tasks
    async function showAddTaskModal() {
        DOMElements['add-task-name'].value = '';
        DOMElements['add-task-planned-duration'].value = 1;
        DOMElements['add-task-duedate'].value = '';
        DOMElements['add-task-to-similar'].checked = false;

        const staffList = await DB.getAllHRData();
        const assigneeSelect = DOMElements['add-task-assignee'];
        assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
        staffList.forEach(s => {
            assigneeSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });

        const departmentSelect = DOMElements['add-task-department'];
        departmentSelect.innerHTML = '';
        for (const dept in DEPARTMENT_COLORS) {
            departmentSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
        }
        
        DOMElements['add-task-modal'].style.display = 'flex';
    }

    async function handleAddTaskSave() {
        const jobNo = DOMElements['design-project-selector'].value;
        if (!jobNo) return;

        const taskName = DOMElements['add-task-name'].value;
        if (!taskName) {
            alert('Task Name is required.');
            return;
        }

        const currentProject = await DB.getProject(jobNo);
        const scrumData = await DB.getScrumData(jobNo);
        
        // Find the highest ID to generate a new unique one (start from 1000 for custom tasks)
        const maxId = scrumData.tasks.reduce((max, task) => Math.max(max, task.id), 999);
    const newTask = {
            id: maxId + 1,
            name: taskName,
            status: 'Up Next',
            department: DOMElements['add-task-department'].value,
            assigneeId: parseInt(DOMElements['add-task-assignee'].value) || null,
            dueDate: DOMElements['add-task-duedate'].value || null,
            plannedDuration: parseInt(DOMElements['add-task-planned-duration'].value) || 1,
            startDate: null,
            completedDate: null,
            dateAdded: new Date().toISOString().split('T')[0] // MODIFICATION: Add creation date
        };

        scrumData.tasks.push(newTask);
        await DB.putScrumData(scrumData);

        // Handle adding to similar projects
        if (DOMElements['add-task-to-similar'].checked) {
            const allProjects = await DB.getAllProjects();
            const similarProjects = allProjects.filter(p => p.projectType === currentProject.projectType && p.jobNo !== jobNo);
            
            for (const project of similarProjects) {
                const otherScrumData = await DB.getScrumData(project.jobNo);
                if (otherScrumData) {
                    const maxOtherId = otherScrumData.tasks.reduce((max, task) => Math.max(max, task.id), 999);
                    otherScrumData.tasks.push({ ...newTask, id: maxOtherId + 1 });
                    await DB.putScrumData(otherScrumData);
                }
            }
            Bulletin.log('Bulk Task Add', `Custom task "<strong>${newTask.name}</strong>" added to <strong>${similarProjects.length + 1}</strong> projects of type <strong>${currentProject.projectType}</strong>.`);
        }

        DOMElements['add-task-modal'].style.display = 'none';
        // Re-render the current view
        const activeTab = DOMElements['design-view'].querySelector('.tabs .active');
        handleDesignViewSwitch({ target: activeTab });
    }
// ... (All other Design Studio helper functions: handleDesignProjectSelect, populate filters, show modals, etc. remain here)
// Minor change: onUpdateCallback in handleTaskStatusUpdate calls Bulletin.log directly now.

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
        if(!DOMElements.resizer) return;
        const resizer = DOMElements.resizer; 
        const container = resizer.parentElement; 
        const leftPanel = container.querySelector('.controls');
        let isResizing = false, startX, startWidth;
        resizer.addEventListener('mousedown', (e) => { e.preventDefault(); isResizing = true; startX = e.clientX; startWidth = leftPanel.offsetWidth; container.classList.add('is-resizing'); document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', stopResize); });
        function handleMouseMove(e) { if (!isResizing) return; const newWidth = startWidth + (e.clientX - startX); if (newWidth > 300 && newWidth < (container.offsetWidth - 300)) { leftPanel.style.width = newWidth + 'px'; } }
        function stopResize() { isResizing = false; container.classList.remove('is-resizing'); document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', stopResize); 
		}
    } 

function setupEventListeners() {
    // --- Main Navigation & Global Controls ---
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

    // --- Dashboard ---
    App.DOMElements['search-box']?.addEventListener('input', renderDashboard);
    App.DOMElements['toggle-invoices-btn']?.addEventListener('click', () => {
        App.showAllInvoices = !App.showAllInvoices;
        App.DOMElements['toggle-invoices-btn'].textContent = App.showAllInvoices ? 'Show Pending Invoices' : 'Show All Invoices';
        renderDashboard();
    });
    App.DOMElements['project-list-body']?.addEventListener('click', async (e) => {
        const row = e.target.closest('tr');
        if (!row?.dataset?.jobNo) return;
        if (e.target.matches('.edit-btn')) handleEditProject(row.dataset.jobNo);
        else if (e.target.matches('.file-link:not(.not-available)')) {
            e.preventDefault();
            const fileId = parseInt(e.target.dataset.fileId, 10);
            const file = await DB.getFileById(fileId);
            if (file) App.ProjectTabs.Documents.showFilePreviewModal(file);
        }
    });
    App.DOMElements['dash-cal-prev-btn']?.addEventListener('click', () => DashboardCalendar.changeMonth(-1));
    App.DOMElements['dash-cal-next-btn']?.addEventListener('click', () => DashboardCalendar.changeMonth(1));

    // --- Modals ---
    App.DOMElements['pending-invoices-summary']?.addEventListener('click', showPendingInvoicesModal);
    App.DOMElements['expiring-documents-summary']?.addEventListener('click', showExpiringDocumentsModal);
    App.DOMElements['pending-modal-close-btn']?.addEventListener('click', () => App.DOMElements['pending-invoice-modal'].style.display = 'none');
    App.DOMElements['expiring-modal-close-btn']?.addEventListener('click', () => App.DOMElements['expiring-documents-modal'].style.display = 'none');
    App.DOMElements['site-files-modal-close-btn']?.addEventListener('click', () => App.DOMElements['site-files-modal'].style.display = 'none');
    App.DOMElements['file-modal-close']?.addEventListener('click', () => App.DOMElements['file-preview-modal'].style.display = 'none');

    // --- Design Studio ---
    // (Listeners for Design Studio remain here)
}

function cacheDOMElements() {
        const ids = [
            'app-container', 'dashboard-view', 'project-view', 'resizer',
            'design-studio-btn', 'back-to-dashboard-btn-from-design', 'design-project-selector', 'scrum-board-container', 'design-calendar-container', 'design-view', 'design-agenda-container', 'design-assignee-container', 'department-filter-group', 'department-filter',
            'staff-filter-group', 'staff-filter',
            // --- MODIFICATION END ---
            // MODIFICATION: Add new IDs for the custom task modal
            'add-task-btn', 'add-task-modal', 'add-task-modal-close-btn', 'add-task-modal-title',
            'add-task-name', 'add-task-planned-duration', 'add-task-department', 'add-task-assignee',
            'add-task-duedate', 'add-task-to-similar', 'save-new-task-btn',
            'new-project-btn',
 // MODIFICATION: Add new IDs for vendor management
            'vendor-master-search', 'vendor-search-results-body', 'project-vendor-list-body',            
            // MODIFICATION: Add summary panel IDs
            'design-summary-panel', 'summary-running', 'summary-due-today', 'summary-overdue', 'summary-planned',
            'new-project-btn', 'search-box', 'project-list-body', 'load-from-file-btn', 'save-to-file-btn', 
            'xml-file-input', 'load-site-update-btn', 'site-update-file-input', 'toggle-invoices-btn',
            'pending-invoices-summary', 'pending-invoices-count', 'pending-invoices-amount', 'last-paid-amount', 'on-hold-amount', 'expiring-documents-summary', 'expiring-documents-count',
            'back-to-dashboard-btn', 'save-project-btn', 'project-view-title', 'page-size-selector', 'generate-pdf-btn',
            'main-tab', 'scope-tab', 'fees-tab', 'invoicing-tab', 'documents-tab', 'tender-tab', 'vendors-tab', 'payment-cert-tab', 'schedule-tab', 'tools-tab', 'project-letters-tab',
            'brief-proposal-preview', 'full-agreement-preview', 'assignment-order-preview', 'tax-invoice-preview', 'tender-package-preview', 'vendor-list-preview', 'payment-certificate-preview', 'villa-schedule-preview', 'project-letter-preview', 'proforma-preview', 'receipt-preview',
            'project-letter-type', 'project-letter-authority', 'project-letter-dynamic-fields', 'generate-project-letter-btn',
            'jobNo', 'agreementDate', 'projectStatus', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn', 'projectDescription', 'plotNo', 'area', 'scopeOfWorkType', 'otherScopeType', 'otherScopeTypeContainer',
            'authority', 'otherAuthority', 'otherAuthorityContainer', 'projectType', 'builtUpArea', 'scope-selection-container', 'vatRate', 'lump-sum-group', 'lumpSumFee', 'percentage-group', 'constructionCostRate',
            'total-construction-cost-display', 'consultancyFeePercentage', 'designFeeSplit', 'supervisionFeeSplitDisplay', 'financial-summary-container', 'fee-milestone-group',
            'designDuration', 'constructionDuration', 'extendedSupervisionFee', 'notes-group', 'invoice-history-body', 'newInvoiceNo', 'milestone-billing-body',
            'supervision-billing-monthly-container', 'supervision-monthly-info', 'bill-next-month-btn', 'supervision-billing-progress-container', 'supervision-progress-info', 'projectProgressInput', 'bill-by-progress-btn',
            'supervision-billing-extended-container', 'extended-supervision-info', 'bill-extended-month-btn', 'current-invoice-items-body', 'raise-invoice-btn',
            'payment-cert-no', 'generate-new-cert-btn', 'cert-history-body', 'calculateResourcesBtn','resourcePredictionOutput', 'generateQrCodeBtn','qr-code',
            'pending-invoice-modal', 'pending-modal-close-btn', 'pending-invoice-list', 'expiring-documents-modal', 'expiring-modal-close-btn', 'expiring-documents-list',
            'site-files-modal', 'site-files-modal-close-btn', 'site-files-modal-title', 'site-photos-gallery', 'site-docs-gallery',
            'file-preview-modal', 'file-modal-close', 'file-preview-container',
            'task-modal', 'task-modal-close-btn', 'task-modal-title', 'task-modal-id', 'task-modal-jobno', 'task-modal-assignee', 'task-modal-duedate', 'task-modal-status', 'save-task-btn', 'task-modal-department', 
            'bulletin-list', 'dash-cal-prev-btn', 'dash-cal-next-btn', 'dash-cal-month-year', 'dash-cal-body'
        ];
        ids.forEach(id => { 
            const el = document.getElementById(id);
            if (el) DOMElements[id] = el;
        });
        DOMElements.controlTabs = DOMElements['project-view']?.querySelector('.control-tabs');
        DOMElements.previewTabs = DOMElements['project-view']?.querySelector('.preview-tabs');
    }

main();

});