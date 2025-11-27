
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONFIG ---
  let currentProjectJobNo = null;
    let DOMElements = {};
    let showAllInvoices = false;
    let staffList = [];
    let officeExpenses = [];
    let currentEditingStaffId = null;
    let expenseChart = null;
    let analyticsChart = null;
    
    const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(Math.round(num || 0));
    
     // Helper function to format dates
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-CA') : '';
    
    const readFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    };

    // --- INITIALIZATION ---
    async function main() {
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
            await DB.init();
            cacheDOMElements();
            populateControlTabs();
             populateDesignStudio(); // Creates design studio content and re-caches
            initResizer();
            populateStaticControls();
         
            setupEventListeners();
            await renderDashboard();
        } catch (error) {
            console.error("Fatal Error initializing application:", error);
            document.body.innerHTML = `<div style='padding:40px; text-align:center; color:red;'><h2>Application Failed to Start</h2><p>Could not initialize the database. Please try clearing your browser's cache and site data for this page and try again.</p><p><i>Error: ${error.message}</i></p></div>`;
        }
    }

 // --- ============================ ---
    // --- CORE & NAVIGATION FUNCTIONS ---
    // --- ============================ ---

    function showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const viewToShow = DOMElements[viewId];
        if(viewToShow) {
            viewToShow.classList.add('active');
        }
    }

    function showDashboard() {
        currentProjectJobNo = null;
        showView('dashboard-view');
        renderDashboard();
    }
      
    function showProjectView() {
        showView('project-view');
    }
    // --- ========================= ---
    // --- DESIGN STUDIO FUNCTIONS ---
    // --- ========================= ---

async function showDesignStudio() {
        showView('design-view');
        const projects = await DB.getAllProjects();
        const designProjects = projects.filter(p => !['Modification', 'AOR Service'].includes(p.scopeOfWorkType));
        
        const selector = DOMElements['design-project-selector'];
        selector.innerHTML = '<option value="">-- Select a Design Project --</option>';
        designProjects.forEach(p => {
            selector.innerHTML += `<option value="${p.jobNo}">${p.jobNo} - ${p.projectDescription}</option>`;
        });

        // Initially show calendar view by finding the button now that it exists
        const calendarButton = DOMElements.designView.querySelector('[data-view="calendar"]');
        if (calendarButton) {
            handleDesignViewSwitch({ target: calendarButton });
        }
    }

      async function handleDesignProjectSelect() {
        const jobNo = DOMElements['design-project-selector'].value;
        if (!jobNo) {
            DOMElements['scrum-board-container'].innerHTML = '<p style="text-align:center; padding-top: 50px; color: #888;">Please select a project to view its design board.</p>';
            return;
        }

        let scrumData = await DB.getScrumData(jobNo);
        const project = await DB.getProject(jobNo);

        if (!scrumData) {
            let currentDate = new Date(project.agreementDate);
            const tasks = DESIGN_SCRUM_TEMPLATE.map(taskTemplate => {
                const dependencies = taskTemplate.dependencies || [];
                if (dependencies.length > 0) {
                     currentDate.setDate(currentDate.getDate() + 1); 
                }
                const dueDate = new Date(currentDate);
                dueDate.setDate(dueDate.getDate() + taskTemplate.duration);
                currentDate = new Date(dueDate);

                return {
                    id: taskTemplate.id,
                    name: taskTemplate.name,
                    status: 'To Do',
                    assigneeId: null,
                    dueDate: dueDate.toISOString().split('T')[0]
                };
            });
            scrumData = { jobNo, tasks };
            await DB.putScrumData(scrumData);
        }
        
        const staffList = await DB.getAllHRData();
        ScrumBoard.render(scrumData, staffList, handleTaskStatusUpdate, showTaskModal);
    }
    
  async function handleDesignViewSwitch(event) {
        const button = event.target;
        const view = button.dataset.view;

        document.querySelectorAll('#design-view .tabs .tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        document.querySelectorAll('.design-view-content').forEach(el => el.style.display = 'none');
        
        if (view === 'board') {
            DOMElements['scrum-board-container'].style.display = 'grid';
            handleDesignProjectSelect();
        } else if (view === 'calendar') {
            DOMElements['design-calendar-container'].style.display = 'block';
            const allScrum = await DB.getAllScrumData();
            const allStaff = await DB.getAllHRData();
            const allProjects = await DB.getAllProjects();
            DesignCalendar.render(allScrum, allStaff, allProjects);
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

        assigneeSelect.value = task.assigneeId || '';
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

        task.assigneeId = parseInt(DOMElements['task-modal-assignee'].value) || null;
        task.dueDate = DOMElements['task-modal-duedate'].value;
        task.status = DOMElements['task-modal-status'].value;
        
        await DB.putScrumData(scrumData);
        DOMElements['task-modal'].style.display = 'none';

        const activeTab = DOMElements.designView.querySelector('.tabs .active');
        handleDesignViewSwitch({target: activeTab});
    }

    async function handleTaskStatusUpdate(taskId, newStatus) {
        const jobNo = DOMElements['design-project-selector'].value;
        const scrumData = await DB.getScrumData(jobNo);
        const task = scrumData.tasks.find(t => t.id == taskId);
        if (task) {
            task.status = newStatus;
            await DB.putScrumData(scrumData);
        }
    }

    // function showProjectView() {
        // DOMElements['dashboard-view'].classList.remove('active');
        // DOMElements['project-view'].classList.add('active');
       
    // }

    function showOfficeView() {
        DOMElements['dashboard-view'].classList.remove('active');
        DOMElements['project-view'].classList.remove('active');
        DOMElements['office-view'].classList.add('active');
        refreshHRDataAndRender();
    }

    async function saveCurrentProject() {
        if (!currentProjectJobNo) return;
        const uiData = getFormDataFromUI();
        const existingProject = await DB.getProject(currentProjectJobNo) || {};

        uiData.invoices = existingProject.invoices || [];
        uiData.billedSupervisionMonths = existingProject.billedSupervisionMonths || 0;
        uiData.lastBilledProgress = existingProject.lastBilledProgress || 0;
        uiData.billedExtendedSupervisionMonths = existingProject.billedExtendedSupervisionMonths || 0;

        const projectToSave = { ...existingProject, ...uiData, jobNo: currentProjectJobNo };

        await DB.putProject(projectToSave);
        alert(`Project ${currentProjectJobNo} saved successfully.`);
        await renderDashboard();
    }

    async function handleProjectFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const xmlString = await file.text();
        const parsedProjects = loadProjectsFromXmlString(xmlString);
        if (parsedProjects && Array.isArray(parsedProjects)) {
            if (confirm(`This will import ${parsedProjects.length} projects from the master file. Continue?`)) {
                for (const p of parsedProjects) {
                    await DB.processProjectImport(p);
                }
                await renderDashboard();
                alert(`Imported and saved ${parsedProjects.length} projects.`);
            }
        } else {
            alert('Could not parse XML file.');
        }
        event.target.value = '';
    }

    async function handleSiteUpdateImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const xmlString = await file.text();
        const parsedUpdates = loadProjectsFromXmlString(xmlString);
        if (parsedUpdates && Array.isArray(parsedUpdates)) {
            if (confirm(`This will import site updates for ${parsedUpdates.length} projects. This will overwrite site status, progress, BOQ, and site files. Continue?`)) {
                for (const update of parsedUpdates) {
                    await DB.processSiteUpdateImport(update);
                }
                await renderDashboard();
                alert(`Imported site updates for ${parsedUpdates.length} projects.`);
            }
        } else {
            alert('Could not parse site update XML file.');
        }
        event.target.value = '';
    }

    async function handleFileExport() {
        const projectsToExp = await DB.getAllProjects();
        if (projectsToExp.length === 0) {
            alert("No projects to export.");
            return;
        }

        for (const project of projectsToExp) {
            const masterFiles = await DB.getFiles(project.jobNo, 'master');
            if (masterFiles.length > 0) {
                project.masterDocuments = masterFiles.map(f => ({
                    name: f.name,
                    category: f.category,
                    subCategory: f.subCategory,
                    expiryDate: f.expiryDate,
                    type: f.fileType,
                    data: f.dataUrl
                }));
            }
        }

        const xmlString = saveProjectsToXmlString(projectsToExp);
        const blob = new Blob([xmlString], {
            type: 'application/xml;charset=utf-8'
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `UrbanAxis_MasterProjects_${new Date().toISOString().split('T')[0]}.xml`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    async function renderDashboard() {
        const allProjects = await DB.getAllProjects();
        const allSiteData = await DB.getAllSiteData();
        const siteDataMap = allSiteData.reduce((acc, data) => ({ ...acc,
            [data.jobNo]: data
        }), {});

        await updateDashboardSummary(allProjects);

        const tbody = DOMElements['project-list-body'];
        tbody.innerHTML = '';
        if (allProjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No projects in database. Use "Import from File" to add projects.</td></tr>';
            return;
        }

        const searchTerm = DOMElements['search-box'].value.toLowerCase().trim();
        const searchWords = searchTerm.split(' ').filter(word => word.length > 0);

        const filteredProjects = allProjects.filter(p => {
            if (searchWords.length === 0) return true;
            const projectDataToSearch = [p.clientName, p.plotNo, p.jobNo, p.projectType, p.area, ...(p.invoices || []).map(inv => inv.no)].filter(Boolean).join(' ').toLowerCase();
            return searchWords.every(word => projectDataToSearch.includes(word));
        });

        for (const p of filteredProjects.sort((a, b) => b.jobNo.localeCompare(a.jobNo))) {
            const row = tbody.insertRow();
            row.dataset.jobNo = p.jobNo;

            const siteData = siteDataMap[p.jobNo];
            const siteStatus = siteData ? siteData.status : 'N/A';
            const progress = siteData ? siteData.progress || 0 : 0;
            const officeStatusClass = (p.projectStatus || 'pending').toLowerCase().replace(/ /g, '-');
            const siteStatusClass = siteStatus.toLowerCase().replace(/ /g, '-');

            const statusHtml = `
                <div>Office: <span class="status-${officeStatusClass}">${p.projectStatus || 'Pending'}</span></div>
                <div style="margin-top:4px;">Site: <span class="status-${siteStatusClass}">${siteStatus}</span></div>
                <div class="progress-bar-container" style="height:14px; margin-top:4px;"><div class="progress-bar" style="width:${progress}%; height:14px; font-size:0.7em;">${progress}%</div></div>
            `;

            const siteFiles = await DB.getFiles(p.jobNo, 'site');
            let actionsHtml = `<button class="edit-btn">View/Edit</button>`;
            if (siteFiles.length > 0) {
                actionsHtml += `<button class="view-site-files-btn secondary-button" data-job-no="${p.jobNo}">Site Files (${siteFiles.length})</button>`;
            }

            const masterFiles = await DB.getFiles(p.jobNo, 'master');
            const affectionPlanFile = masterFiles.find(f => f.subCategory === 'affection_plan');
            const docHtml = affectionPlanFile ? `<a href="#" class="file-link" data-file-id="${affectionPlanFile.id}">Affection Plan</a>` : `<span class="file-link not-available">Affection Plan</span>`;

            const invoicesToDisplay = showAllInvoices ? (p.invoices || []) : (p.invoices || []).filter(inv => inv.status === 'Raised' || inv.status === 'Pending');
            const invoiceDetailsHtml = invoicesToDisplay.length > 0 ? invoicesToDisplay.map(inv => `<div class="invoice-row status-${(inv.status || '').toLowerCase()}"><span><b>${inv.no}</b></span><span>${inv.date}</span><span style="font-weight:bold; text-align:right;">${formatCurrency(parseFloat(inv.amount || 0))}</span><span>(${inv.status})</span></div>`).join('') : (showAllInvoices ? 'No invoices' : 'No pending invoices');

            row.innerHTML = `
                <td>${p.jobNo}</td><td>${p.clientName}<br><small>${p.clientMobile||''}</small></td><td>${p.plotNo}<br><small>${p.agreementDate||''}</small></td>
                <td>${statusHtml}</td><td>${docHtml}</td><td><div class="invoice-container">${invoiceDetailsHtml}</div></td><td>${actionsHtml}</td>`;
        }
    }

    async function updateDashboardSummary(projects) {
        let totalPendingAmount = 0,
            pendingInvoiceCount = 0,
            totalOnHoldAmount = 0,
            lastPaidInvoice = null;
        projects.forEach(p => {
            (p.invoices || []).forEach(inv => {
                const amount = parseFloat(inv.amount || 0);
                if (inv.status === 'Raised' || inv.status === 'Pending') {
                    pendingInvoiceCount++;
                    totalPendingAmount += amount;
                } else if (inv.status === 'Paid' && inv.date) {
                    if (!lastPaidInvoice || new Date(inv.date) > new Date(lastPaidInvoice.date)) {
                        lastPaidInvoice = inv;
                    }
                } else if (inv.status === 'On Hold') {
                    totalOnHoldAmount += amount;
                }
            });
        });

        DOMElements['pending-invoices-count'].textContent = pendingInvoiceCount;
        DOMElements['pending-invoices-amount'].textContent = `AED ${formatCurrency(totalPendingAmount)}`;
        DOMElements['last-paid-amount'].textContent = lastPaidInvoice ? `AED ${formatCurrency(lastPaidInvoice.amount)}` : 'N/A';
        DOMElements['on-hold-amount'].textContent = `AED ${formatCurrency(totalOnHoldAmount)}`;
        const allMasterFiles = (await DB.getAllFiles()).filter(f => f.source === 'master');

        const expiringDocs = allMasterFiles.filter(file => {
            if (!file.expiryDate) return false;
            const expiry = new Date(file.expiryDate);
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);
            return expiry >= now && expiry <= thirtyDaysFromNow;
        });

        DOMElements['expiring-documents-count'].textContent = expiringDocs.length;
    }

    async function showPendingInvoicesModal() {
        const allProjects = await DB.getAllProjects();
        const pendingInvoices = [];
        allProjects.forEach(p => {
            (p.invoices || []).forEach(inv => {
                if (inv.status === 'Raised' || inv.status === 'Pending') {
                    pendingInvoices.push({ ...inv,
                        jobNo: p.jobNo,
                        clientName: p.clientName,
                        projectDescription: p.projectDescription
                    });
                }
            });
        });
        const listEl = DOMElements['pending-invoice-list'];
        if (pendingInvoices.length === 0) {
            listEl.innerHTML = '<p>No pending invoices found.</p>';
        } else {
            let tableHtml = `<table class="output-table"><thead><tr><th>Inv No.</th><th>Project</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>`;
            pendingInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
            for (const inv of pendingInvoices) {
                tableHtml += `<tr>
                    <td>${inv.no}</td>
                    <td>${inv.projectDescription || inv.jobNo}</td>
                    <td>${inv.clientName}</td>
                    <td>${new Date(inv.date).toLocaleDateString('en-CA')}</td>
                    <td style="text-align:right;">${formatCurrency(inv.amount)}</td>
                    <td><span class="status-${inv.status.toLowerCase()}">${inv.status}</span></td>
                </tr>`;
            }
            tableHtml += '</tbody></table>';
            listEl.innerHTML = tableHtml;
        }
        DOMElements['pending-invoice-modal'].style.display = 'flex';
    }

    async function showExpiringDocumentsModal() {
        const allProjects = await DB.getAllProjects();
        const allFiles = [];
        for (const project of allProjects) {
            const masterFiles = await DB.getFiles(project.jobNo, 'master');
            masterFiles.forEach(f => allFiles.push({ ...f,
                projectName: project.projectDescription || project.jobNo
            }));
        }

        const expiringDocs = allFiles.filter(file => {
            if (!file.expiryDate) return false;
            const expiry = new Date(file.expiryDate);
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);
            return expiry >= now && expiry <= thirtyDaysFromNow;
        });

        const listEl = DOMElements['expiring-documents-list'];
        if (expiringDocs.length === 0) {
            listEl.innerHTML = '<p>No documents are expiring in the next 30 days.</p>';
        } else {
            let tableHtml = `<table class="output-table"><thead><tr><th>Document</th><th>Sub-Category</th><th>Project</th><th>Job No</th><th>Expiry Date</th><th>Days Left</th></tr></thead><tbody>`;
            expiringDocs.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
            const now = new Date();
            for (const doc of expiringDocs) {
                const expiry = new Date(doc.expiryDate);
                const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                const daysLeftClass = daysLeft <= 7 ? 'danger' : (daysLeft <= 15 ? 'warning' : '');
                tableHtml += `<tr>
                    <td>${doc.name}</td>
                    <td>${(doc.subCategory || '').replace(/_/g, ' ')}</td>
                    <td>${doc.projectName}</td>
                    <td>${doc.jobNo}</td>
                    <td>${new Date(doc.expiryDate).toLocaleDateString('en-CA')}</td>
                    <td class="${daysLeftClass}">${daysLeft}</td>
                </tr>`;
            }
            tableHtml += '</tbody></table>';
            listEl.innerHTML = tableHtml;
        }
        DOMElements['expiring-documents-modal'].style.display = 'flex';
    }

    // --- =============================== ---
    // --- HR & OFFICE MGMT. FUNCTIONS ---
    // --- =============================== ---
    
    // ** MODIFIED **
    async function loadHRModuleContent() {
        DOMElements['analytics-tab'].innerHTML = `<div class="tool-card"><h3>Business Intelligence Overview</h3><div class="dashboard-summary-container" id="analytics-summary-container" style="justify-content: space-around;"></div><div style="height:400px; margin-top:30px;"><canvas id="analyticsChart"></canvas></div></div>`;
        DOMElements['staff-list-tab'].innerHTML = `<div class="tool-card"><h3><span>Staff & Salary Overview</span><button id="add-staff-btn" class="primary-button">+ Add Staff</button></h3><div class="table-container"><table class="output-table"><thead><tr><th>Name</th><th>Role</th><th>Join Date</th><th style="text-align:right;">Gross Salary</th><th style="text-align:right;">Est. Gratuity</th><th>Actions</th></tr></thead><tbody id="staff-list-body"></tbody></table></div></div>`;
        DOMElements['hr-letter-generation-tab'].innerHTML = `<div class="hr-layout"><div class="form-card"><h3>Generate HR Letter</h3><div class="input-group"><label for="hr-letter-type-select">Type of Letter</label><select id="hr-letter-type-select"><option value="">-- Select --</option><option value="salary_certificate">Salary Certificate</option><option value="appreciation">Appreciation</option><option value="warning">Warning</option></select></div><div class="input-group"><label for="letter-staff-select">Select Staff</label><select id="letter-staff-select"></select></div><div id="dynamic-letter-fields"></div><button id="generate-hr-letter-preview-btn" class="primary-button" style="width:100%; margin-top: 20px;">Generate Preview</button></div><div class="tool-card"><h3><span>Letter Preview</span><button id="download-hr-letter-pdf-btn" class="secondary-button" style="display:none;">Download PDF</button></h3><div id="hr-letter-preview" class="letter-preview"><p style="text-align:center;color:#888;">Select a letter type to generate a preview.</p></div></div></div>`;
        DOMElements['reminders-tab'].innerHTML = `<div class="tool-card"><h3>Upcoming Expirations & Due Dates (Next 60 Days)</h3><div id="reminder-list"></div></div>`;
        DOMElements['offer-letters-tab'].innerHTML = `<div class="hr-layout"><div class="form-card"><h3>Create Offer Letter</h3><div class="input-group"><label>Candidate Name</label><input type="text" id="candidateName"></div><div class="input-group"><label>Position Offered</label><input type="text" id="candidateRole"></div><div class="input-group"><label>Offered Gross Salary</label><input type="number" id="offeredSalary"></div><div class="input-group"><label>Intended Join Date</label><input type="date" id="joinDate"></div><button id="generate-offer-letter-btn" class="primary-button" style="width:100%; margin-top: 20px;">Generate Preview</button></div><div class="tool-card"><h3>Offer Letter Preview</h3><div id="offer-letter-preview" class="letter-preview"></div></div></div>`;
        DOMElements['leave-management-tab'].innerHTML = `<div class="tool-card"><h3>Log New Leave</h3><div class="input-group-grid" style="grid-template-columns: 2fr 1fr 1fr 1fr auto; align-items:flex-end; gap:15px;"><div class="input-group"><label>Staff Member</label><select id="leaveStaffSelect"></select></div><div class="input-group"><label>Leave Type</label><select id="leaveType"><option>Annual</option><option>Sick</option><option>Unpaid</option><option>Emergency</option></select></div><div class="input-group"><label>Start Date</label><input type="date" id="leaveStartDate"></div><div class="input-group"><label>End Date</label><input type="date" id="leaveEndDate"></div><button id="add-leave-btn" class="primary-button">Log Leave</button></div></div><div class="tool-card"><h3>Leave History</h3><table class="output-table"><thead><tr><th>Staff</th><th>Type</th><th>Start Date</th><th>End Date</th><th>Days</th><th>Balance Left</th></tr></thead><tbody id="leave-log-body"></tbody></table></div>`;
        DOMElements['expense-log-tab'].innerHTML = `<div class="hr-layout" style="grid-template-columns: 1fr 1.5fr;"><div class="tool-card"><h3 style="margin-bottom: 15px;">Log New Expense</h3><div class="form-card"><div class="input-group"><label>Date</label><input type="date" id="expenseDate"></div><div class="input-group"><label>Category</label><select id="expenseCategory"><option>Office Supplies</option><option>Utilities</option><option>Marketing</option><option>Transportation</option><option>Miscellaneous</option></select></div><div class="input-group"><label>Description</label><input type="text" id="expenseDescription"></div><div class="input-group"><label>Amount</label><input type="number" id="expenseAmount"></div><button id="add-expense-btn" class="primary-button" style="width:100%;margin-top:10px;">Add Expense</button></div></div><div class="tool-card"><h3>Expense History</h3><div id="expense-filter-container" class="tabs" style="margin-bottom:15px;"><button class="secondary-button active" data-period="1">Last Month</button><button class="secondary-button" data-period="3">Last 3 Months</button><button class="secondary-button" data-period="6">Last 6 Months</button></div><div style="height:250px; margin-bottom:20px;"><canvas id="expenseChart"></canvas></div><table class="output-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th style="text-align:right;">Amount</th></tr></thead><tbody id="expense-log-body"></tbody></table></div></div>`;
        DOMElements['annual-expenses-tab'].innerHTML = `<div class="tool-card"><h3>Add New Annual Expense</h3><div class="input-group-grid" style="grid-template-columns: 2fr 1fr 1fr auto; align-items:flex-end; gap:15px;"><div class="input-group"><label>Expense Item (e.g., Trade License)</label><input type="text" id="annualExpenseItem"></div><div class="input-group"><label>Amount (AED)</label><input type="number" id="annualExpenseAmount"></div><div class="input-group"><label>Next Due Date</label><input type="date" id="annualExpenseDueDate"></div><button id="add-annual-expense-btn" class="primary-button">Add Annual Expense</button></div></div><div class="tool-card"><h3>Tracked Annual Expenses</h3><table class="output-table"><thead><tr><th>Item</th><th style="text-align:right;">Amount</th><th>Next Due Date</th><th>Action</th></tr></thead><tbody id="annual-expense-body"></tbody></table></div>`;
        DOMElements['increments-tab'].innerHTML = `<div class="tool-card"><h3>Record New Increment</h3><div class="input-group-grid" style="grid-template-columns: 2fr 1fr 1fr auto; align-items:flex-end; gap:15px;"><div class="input-group"><label>Staff Member</label><select id="incrementStaffSelect"></select></div><div class="input-group"><label>Increment Amount (AED)</label><input type="number" id="incrementAmount"></div><div class="input-group"><label>Effective Date</label><input type="date" id="incrementDate"></div><button id="add-increment-btn" class="primary-button">Record Increment</button></div></div><div class="tool-card"><h3>Increment History</h3><table class="output-table"><thead><tr><th>Staff</th><th>Date</th><th style="text-align:right;">Old Salary</th><th style="text-align:right;">Increment</th><th style="text-align:right;">New Salary</th></tr></thead><tbody id="increment-log-body"></tbody></table></div>`;
        DOMElements['staff-modal-body'].innerHTML = `<div class="hr-layout"><div class="form-card"><img id="staff-photo-preview" src="placeholder.jpg" alt="Staff Photo" class="staff-photo-preview"/><div class="input-group"><label>Update Photo</label><input type="file" id="staff-photo-upload" accept="image/*"></div><div class="input-group"><label>Update Passport</label><input type="file" id="staff-passport-upload" accept="image/*,application/pdf"><a id="staff-passport-link" href="#" target="_blank" style="display:none;">View Current</a></div></div><div><div class="input-group-grid" style="grid-template-columns:1fr 1fr;"><div class="input-group"><label>Name</label><input type="text" id="modal-staff-name"></div><div class="input-group"><label>Role</label><input type="text" id="modal-staff-role"></div><div class="input-group"><label>Email</label><input type="email" id="modal-staff-email"></div><div class="input-group"><label>Date of Birth</label><input type="date" id="modal-staff-dob"></div><div class="input-group"><label>Phone No.</label><input type="text" id="modal-staff-phone"></div><div class="input-group"><label>Emirates ID</label><input type="text" id="modal-staff-eid"></div><div class="input-group"><label>Join Date</label><input type="date" id="modal-staff-join-date"></div><div class="input-group"><label>Gross Salary</label><input type="number" id="modal-staff-salary"><span id="modal-basic-salary" class="basic-salary-display"></span></div></div><div class="input-group"><label>Address</label><textarea id="modal-staff-address" rows="2"></textarea></div><div class="input-group-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;"><div class="input-group"><label>Visa Expiry</label><input type="date" id="modal-visa-expiry"></div><div class="input-group"><label>S.O.E. Expiry</label><input type="date" id="modal-soe-expiry"></div><div class="input-group"><label>License Expiry</label><input type="date" id="modal-license-expiry"></div><div class="input-group"><label>Health Card Expiry</label><input type="date" id="modal-health-expiry"></div></div></div></div><hr><h4>Staff Loans</h4><div class="input-group-grid" style="grid-template-columns:1fr 1fr 2fr auto;align-items:flex-end;"><div class="input-group"><label>Loan Amount</label><input type="number" id="modal-loan-amount"></div><div class="input-group"><label>Date</label><input type="date" id="modal-loan-date"></div><div class="input-group"><label>Description</label><input type="text" id="modal-loan-description"></div><button id="add-loan-btn" class="secondary-button">Add Loan</button></div><table class="output-table"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody id="modal-loan-history"></tbody></table><div style="text-align:right; margin-top:20px;"><button id="delete-staff-btn" class="danger-button" style="display:none;float:left;">Delete Staff Member</button><button id="save-staff-details-btn" class="primary-button">Save Changes</button></div>`;
        
        // Re-cache all elements, including the ones just created.
        cacheDOMElements();
        
        // Attach event listeners for the newly created HR elements
        const officeView = DOMElements['office-view'];
        if (officeView) {
            officeView.addEventListener('click', (e) => {
                if (e.target.matches('#back-to-main-dashboard-btn')) showDashboard();
                if (e.target.matches('.tab-button') && e.target.closest('#hr-tabs')) handleHRTabSwitch(e);
                if (e.target.matches('#add-staff-btn')) showStaffDetailsModal(null);
                if (e.target.matches('.details-btn') && e.target.closest('#staff-list-body')) showStaffDetailsModal(parseInt(e.target.dataset.id));
                if (e.target.matches('#generate-hr-letter-preview-btn')) renderHRLetterPreview();
                if (e.target.matches('#download-hr-letter-pdf-btn')) downloadHRLetterAsPDF();
                if (e.target.matches('#generate-offer-letter-btn')) renderOfferLetterPreview();
                if (e.target.matches('#add-leave-btn')) handleAddLeave();
                if (e.target.matches('#add-expense-btn')) handleAddExpense();
                if (e.target.matches('#add-annual-expense-btn')) handleAddAnnualExpense();
                if (e.target.matches('#add-increment-btn')) handleAddIncrement();
                if (e.target.matches('#expense-filter-container .secondary-button')) handleExpenseFilter(e);
            });
        }
    }

    async function refreshHRDataAndRender() {
        staffList = await DB.getAllHRData() || [];
        officeExpenses = await DB.getOfficeExpenses() || [];

        if (staffList.length === 0 && (await DB.getAllHRData()).length === 0) {
            console.log("HR_DATA store is empty. Seeding initial staff data...");
            const initialStaff = [{
                name: 'Faisal M.',
                role: 'Architect',
                joinDate: '2022-01-15',
                grossSalary: 13000,
                leaveBalance: 30,
                loans: []
            }, {
                name: 'Adnan K.',
                role: 'Architect',
                joinDate: '2022-02-01',
                grossSalary: 13000,
                leaveBalance: 30,
                loans: []
            }];
            for (const staff of initialStaff) {
                await DB.addHRData(staff);
            }
            staffList = await DB.getAllHRData();
        }

        renderStaffList();
        renderReminders();
        populateHRSelects();
        renderLeaveLog();
        renderIncrementLog();
        renderAnnualExpenseList();
        renderExpenseLog(1);
        renderAnalyticsTab();
    }

    function renderStaffList() {
        const tbody = DOMElements.staffListBody;
        if (!tbody) return;
        tbody.innerHTML = '';
        staffList.sort((a, b) => a.name.localeCompare(b.name)).forEach(staff => {
            const basicSalary = (staff.grossSalary || 0) * 0.60;
            const yearsOfService = staff.joinDate ? (new Date() - new Date(staff.joinDate)) / (1000 * 60 * 60 * 24 * 365.25) : 0;
            const gratuity = calculateGratuity(basicSalary, yearsOfService);
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${staff.name}</td>
                <td>${staff.role}</td>
                <td>${formatDate(staff.joinDate)}</td>
                <td style="text-align:right;">${formatCurrency(staff.grossSalary)}</td>
                <td style="text-align:right;">${formatCurrency(gratuity)}</td>
                <td><button class="secondary-button details-btn" data-id="${staff.id}">Details</button></td>
            `;
        });
    }

    function showStaffDetailsModal(staffId) {
        currentEditingStaffId = staffId;
        const staff = staffId ? staffList.find(s => s.id === staffId) : {};

        DOMElements.staffModalTitle.textContent = staffId ? `Edit Details for ${staff.name}` : "Add New Staff Member";
        DOMElements.modalStaffName.value = staff.name || '';
        DOMElements.modalStaffRole.value = staff.role || '';
        DOMElements.modalStaffEmail.value = staff.email || '';
        DOMElements.modalStaffDob.value = staff.dob || '';
        DOMElements.modalStaffPhone.value = staff.phoneNo || '';
        DOMElements.modalStaffEid.value = staff.emiratesId || '';
        DOMElements.modalStaffAddress.value = staff.address || '';
        DOMElements.modalStaffJoinDate.value = staff.joinDate || new Date().toISOString().split('T')[0];
        const grossSalary = staff.grossSalary || 0;
        DOMElements.modalStaffSalary.value = grossSalary;
        DOMElements.modalBasicSalary.textContent = `Basic: ${formatCurrency(grossSalary * 0.60)}`;

        DOMElements.modalVisaExpiry.value = staff.visaExpiry || '';
        DOMElements.modalSoeExpiry.value = staff.soeExpiry || '';
        DOMElements.modalLicenseExpiry.value = staff.licenseExpiry || '';
        DOMElements.modalHealthExpiry.value = staff.healthCardExpiry || '';

        DOMElements.staffPhotoPreview.src = staff.photoUrl || 'placeholder.jpg';
        DOMElements.staffPassportLink.style.display = staff.passportCopyUrl ? 'inline-block' : 'none';
        if (staff.passportCopyUrl) DOMElements.staffPassportLink.href = staff.passportCopyUrl;

        DOMElements.deleteStaffBtn.style.display = staffId ? 'inline-block' : 'none';

        renderLoanHistory(staff);
        DOMElements.staffDetailsModal.style.display = 'flex';
    }

    async function handleStaffDetailsSave() {
        const isNew = currentEditingStaffId === null;
        let staff = isNew ? {} : staffList.find(s => s.id === currentEditingStaffId);

        staff.name = DOMElements.modalStaffName.value;
        staff.role = DOMElements.modalStaffRole.value;
        staff.email = DOMElements.modalStaffEmail.value;
        staff.dob = DOMElements.modalStaffDob.value;
        staff.phoneNo = DOMElements.modalStaffPhone.value;
        staff.emiratesId = DOMElements.modalStaffEid.value;
        staff.address = DOMElements.modalStaffAddress.value;
        staff.joinDate = DOMElements.modalStaffJoinDate.value;
        staff.grossSalary = parseFloat(DOMElements.modalStaffSalary.value) || 0;
        staff.visaExpiry = DOMElements.modalVisaExpiry.value;
        staff.soeExpiry = DOMElements.modalSoeExpiry.value;
        staff.licenseExpiry = DOMElements.modalLicenseExpiry.value;
        staff.healthCardExpiry = DOMElements.modalHealthExpiry.value;

        if (isNew) {
            staff.leaveBalance = 30;
            staff.increments = [];
            staff.leaves = [];
            staff.loans = [];
        }

        const photoFile = DOMElements.staffPhotoUpload.files[0];
        if (photoFile) staff.photoUrl = await readFileAsDataURL(photoFile);

        const passportFile = DOMElements.staffPassportUpload.files[0];
        if (passportFile) staff.passportCopyUrl = await readFileAsDataURL(passportFile);

        if (isNew) {
            await DB.addHRData(staff);
            alert('Staff member added successfully.');
        } else {
            await DB.putHRData(staff);
            alert('Staff details updated successfully.');
        }
        currentEditingStaffId = null;
        DOMElements.staffDetailsModal.style.display = 'none';
        await refreshHRDataAndRender();
    }

    async function handleDeleteStaff() {
        if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) return;

        await DB.deleteHRData(currentEditingStaffId);
        alert('Staff member deleted.');

        DOMElements.staffDetailsModal.style.display = 'none';
        await refreshHRDataAndRender();
    }

    async function handleAddLoan() {
        const staff = staffList.find(s => s.id === currentEditingStaffId);
        if (!staff) return;

        const amount = parseFloat(DOMElements.modalLoanAmount.value);
        const date = DOMElements.modalLoanDate.value;
        const description = DOMElements.modalLoanDescription.value;

        if (isNaN(amount) || !date || !description) {
            alert('Please fill all loan fields.');
            return;
        }

        if (!staff.loans) staff.loans = [];
        staff.loans.push({
            date,
            description,
            amount,
            status: 'Outstanding'
        });

        await DB.putHRData(staff);
        renderLoanHistory(staff);
        DOMElements.modalLoanAmount.value = '';
        DOMElements.modalLoanDescription.value = '';
    }

    async function handleLoanActions(e) {
        if (!e.target.matches('.loan-status-btn')) return;

        const staff = staffList.find(s => s.id === currentEditingStaffId);
        if (!staff) return;

        const loanIndex = parseInt(e.target.dataset.index);
        staff.loans[loanIndex].status = 'Paid';

        await DB.putHRData(staff);
        renderLoanHistory(staff);
    }

    function renderLoanHistory(staff) {
        const tbody = DOMElements.modalLoanHistory;
        tbody.innerHTML = '';
        if (!staff.loans || staff.loans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No loan history.</td></tr>';
            return;
        }
        staff.loans.forEach((loan, index) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${formatDate(loan.date)}</td>
                <td>${loan.description}</td>
                <td>${formatCurrency(loan.amount)}</td>
                <td>${loan.status}</td>
                <td>${loan.status === 'Outstanding' ? `<button class="secondary-button loan-status-btn" data-index="${index}">Mark as Paid</button>` : 'Paid'}</td>
            `;
        });
    }

    function renderReminders() {
        const container = DOMElements.reminderList;
        if (!container) return;
        container.innerHTML = '<ul>';
        const now = new Date();
        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(now.getDate() + 60);
        let remindersFound = false;

        staffList.forEach(staff => {
            const checks = {
                'Visa': staff.visaExpiry,
                'S.O.E. Card': staff.soeExpiry,
                'License': staff.licenseExpiry,
                'Health Card': staff.healthCardExpiry
            };
            for (const itemType in checks) {
                const expiryDateStr = checks[itemType];
                if (expiryDateStr) {
                    const expiryDate = new Date(expiryDateStr);
                    if (expiryDate >= now && expiryDate <= sixtyDaysFromNow) {
                        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                        container.innerHTML += `<li class="${daysLeft <= 15 ? 'danger' : 'warning'}">${staff.name}'s ${itemType} will expire in ${daysLeft} days (on ${formatDate(expiryDateStr)}).</li>`;
                        remindersFound = true;
                    }
                }
            }
        });

        if (!remindersFound) {
            container.innerHTML = '<p>No upcoming reminders in the next 60 days.</p>';
        } else {
            container.innerHTML += '</ul>';
        }
    }

    function renderOfferLetterPreview() {
        const name = DOMElements.candidateName.value;
        const role = DOMElements.candidateRole.value;
        const salary = parseFloat(DOMElements.offeredSalary.value);
        const joinDate = formatDate(DOMElements.joinDate.value);
        const basic = salary * 0.60;
        const allowance = salary * 0.40;

        DOMElements.offerLetterPreview.innerHTML = `
            <p>Date: ${formatDate(new Date())}</p>
            <p><b>Mr. ${name}</b></p>
            <br>
            <h3 style="text-align:center; text-decoration: underline;">OFFER OF EMPLOYMENT</h3>
            <p>Dear Mr. ${name},</p>
            <p>Further to your recent interview, we are pleased to offer you the position of <b>${role}</b> with Urban Axis Architectural & Consulting Engineers.</p>
            
            <p>Your employment will be governed by the following terms and conditions:</p>
            <ol>
                <li><b>Position:</b> ${role}</li>
                <li><b>Prospective Date of Joining:</b> ${joinDate}</li>
                <li><b>Remuneration:</b> Your consolidated monthly salary will be as follows:
                    <ul>
                        <li>Basic Salary: ${formatCurrency(basic)}</li>
                        <li>Allowances (Housing, Transport, etc.): ${formatCurrency(allowance)}</li>
                        <li><b>Total Gross Salary: ${formatCurrency(salary)}</b></li>
                    </ul>
                </li>
                <li><b>Annual Leave:</b> You will be entitled to 30 calendar days of paid leave upon completion of one year of service.</li>
                <li><b>Medical Insurance:</b> You will be covered under the company's group medical insurance policy.</li>
                <li><b>Probation Period:</b> You will be on a probation period of six (6) months from your date of joining.</li>
            </ol>
            <p>This offer is subject to the successful attestation of your documents and obtaining a UAE employment visa.</p>
            <p>We look forward to you joining our team.</p>
            <br><br>
            <p>Sincerely,</p>
            <p><b>For: Urban Axis Architectural & Consulting Engineers</b></p>
            <br><br><br>
            <p>Accepted and Agreed:</p>
            <p>_________________________</p>
            <p>${name}</p>
        `;
    }

    async function handleAddLeave() {
        const staffId = parseInt(DOMElements.leaveStaffSelect.value);
        const startDate = new Date(DOMElements.leaveStartDate.value);
        const endDate = new Date(DOMElements.leaveEndDate.value);
        if (endDate < startDate) {
            alert('End date cannot be before start date.');
            return;
        }
        const days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) return;

        if (!staff.leaves) staff.leaves = [];
        staff.leaves.push({
            type: DOMElements.leaveType.value,
            startDate: DOMElements.leaveStartDate.value,
            endDate: DOMElements.leaveEndDate.value,
            days
        });

        if (DOMElements.leaveType.value === 'Annual') {
            staff.leaveBalance = (staff.leaveBalance || 30) - days;
        }

        await DB.putHRData(staff);
        alert(`Leave for ${staff.name} logged successfully.`);
        await refreshHRDataAndRender();
    }

    function renderLeaveLog() {
        const tbody = DOMElements.leaveLogBody;
        if (!tbody) return;
        tbody.innerHTML = '';
        staffList.forEach(staff => {
            if (staff.leaves && staff.leaves.length > 0) {
                staff.leaves.slice().sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).forEach(leave => {
                    const row = tbody.insertRow();
                    row.innerHTML = `
                        <td>${staff.name}</td>
                        <td>${leave.type}</td>
                        <td>${formatDate(leave.startDate)}</td>
                        <td>${formatDate(leave.endDate)}</td>
                        <td>${leave.days}</td>
                        <td>${staff.leaveBalance} days</td>
                    `;
                });
            }
        });
        if (tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No leave records found.</td></tr>';
        }
    }

    function handleExpenseFilter(e) {
        if (!e.target.matches('.secondary-button')) return;
        DOMElements.expenseFilterContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        const period = parseInt(e.target.dataset.period);
        renderExpenseLog(period);
    }

    async function handleAddExpense() {
        const newExpense = {
            date: DOMElements.expenseDate.value,
            category: DOMElements.expenseCategory.value,
            description: DOMElements.expenseDescription.value,
            amount: parseFloat(DOMElements.expenseAmount.value),
            frequency: 'one-time'
        };
        if (!newExpense.date || !newExpense.description || isNaN(newExpense.amount)) {
            alert('Please fill all fields for the expense.');
            return;
        }
        await DB.addOfficeExpense(newExpense);

        alert('Expense logged successfully.');
        DOMElements.expenseDescription.value = '';
        DOMElements.expenseAmount.value = '';

        await refreshHRDataAndRender();
        const activeFilter = DOMElements.expenseFilterContainer.querySelector('.active');
        const period = activeFilter ? parseInt(activeFilter.dataset.period) : 1;
        renderExpenseLog(period);
    }

    async function handleAddAnnualExpense() {
        const newExpense = {
            date: DOMElements.annualExpenseDueDate.value,
            category: 'Annual',
            description: DOMElements.annualExpenseItem.value,
            amount: parseFloat(DOMElements.annualExpenseAmount.value),
            frequency: 'annual'
        };
        if (!newExpense.date || !newExpense.description || isNaN(newExpense.amount)) {
            alert('Please fill all fields for the annual expense.');
            return;
        }
        await DB.addOfficeExpense(newExpense);
        alert('Annual expense added successfully.');
        DOMElements.annualExpenseItem.value = '';
        DOMElements.annualExpenseAmount.value = '';
        await refreshHRDataAndRender();
    }

    function renderExpenseLog(periodInMonths) {
        const tbody = DOMElements.expenseLogBody;
        if (!tbody) return;
        tbody.innerHTML = '';
        const filterDate = new Date();
        filterDate.setMonth(filterDate.getMonth() - periodInMonths);

        const filteredExpenses = officeExpenses.filter(exp => exp.frequency !== 'annual' && new Date(exp.date) >= filterDate);
        let total = 0;

        filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => {
            total += exp.amount;
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${formatDate(exp.date)}</td>
                <td>${exp.category}</td>
                <td>${exp.description}</td>
                <td style="text-align:right;">${formatCurrency(exp.amount)}</td>
            `;
        });

        const totalRow = tbody.insertRow();
        totalRow.className = 'total-row';
        totalRow.innerHTML = `<td colspan="3"><b>Total for Period</b></td><td style="text-align:right;"><b>${formatCurrency(total)}</b></td>`;

        renderExpenseDonutChart(filteredExpenses);
    }

    function renderAnnualExpenseList() {
        const tbody = DOMElements.annualExpenseBody;
        if (!tbody) return;
        tbody.innerHTML = '';
        const annualExpenses = officeExpenses.filter(e => e.frequency === 'annual');

        annualExpenses.sort((a, b) => a.description.localeCompare(b.description)).forEach(exp => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${exp.description}</td>
                <td style="text-align:right;">${formatCurrency(exp.amount)}</td>
                <td>${formatDate(exp.date)}</td>
                <td><button class="danger-button small-btn" data-id="${exp.id}">Delete</button></td>
            `;
        });
    }

    function renderExpenseDonutChart(data) {
        const ctx = DOMElements.expenseChart?.getContext('2d');
        if (!ctx) return;
        const groupedData = data.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + item.amount;
            return acc;
        }, {});

        const labels = Object.keys(groupedData);
        const values = Object.values(groupedData);

        if (expenseChart) expenseChart.destroy();

        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Expense by Category',
                    data: values,
                    backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796', '#5a5c69'],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Expense Breakdown'
                    }
                }
            }
        });
    }

    async function handleAddIncrement() {
        const staffId = parseInt(DOMElements.incrementStaffSelect.value);
        const amount = parseFloat(DOMElements.incrementAmount.value);
        const date = DOMElements.incrementDate.value;
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid increment amount.');
            return;
        }
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) return;

        const oldSalary = staff.grossSalary;
        const newSalary = oldSalary + amount;

        if (!staff.increments) staff.increments = [];
        staff.increments.push({
            date,
            oldSalary,
            amount,
            newSalary
        });
        staff.grossSalary = newSalary;

        await DB.putHRData(staff);
        alert(`Increment for ${staff.name} recorded. New salary is ${formatCurrency(newSalary)}.`);
        await refreshHRDataAndRender();
    }

    function renderIncrementLog() {
        const tbody = DOMElements.incrementLogBody;
        if (!tbody) return;
        tbody.innerHTML = '';
        staffList.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(staff => {
            if (staff.increments && staff.increments.length > 0) {
                staff.increments.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(inc => {
                    const row = tbody.insertRow();
                    row.innerHTML = `
                        <td>${staff.name}</td>
                        <td>${formatDate(inc.date)}</td>
                        <td style="text-align:right;">${formatCurrency(inc.oldSalary)}</td>
                        <td style="text-align:right;">${formatCurrency(inc.amount)}</td>
                        <td style="text-align:right;">${formatCurrency(inc.newSalary)}</td>
                    `;
                });
            }
        });
        if (tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No increment records found.</td></tr>';
        }
    }

    function calculateGratuity(basicSalary, yearsOfService) {
        if (yearsOfService < 1) return 0;
        let gratuityDays = 0;
        if (yearsOfService <= 5) {
            gratuityDays = 21 * yearsOfService;
        } else {
            gratuityDays = (21 * 5) + (30 * (yearsOfService - 5));
        }
        return (basicSalary / 30) * gratuityDays;
    }

    function populateHRSelects() {
        const staffSelects = [DOMElements.letterStaffSelect, DOMElements.leaveStaffSelect, DOMElements.incrementStaffSelect];
        staffSelects.forEach(select => {
            if (!select) return;
            select.innerHTML = '<option value="">-- Select Staff --</option>';
            staffList.forEach(staff => {
                select.innerHTML += `<option value="${staff.id}">${staff.name}</option>`;
            });
        });
    }

    function renderHRLetterPreview() {
        const staffId = parseInt(DOMElements.letterStaffSelect.value);
        const letterType = DOMElements.hrLetterTypeSelect.value;
        const staff = staffList.find(s => s.id === staffId);

        if (!staff || !letterType || !HR_LETTER_TEMPLATES[letterType]) {
            DOMElements.hrLetterPreview.innerHTML = '<p style="text-align:center;color:#888;">Please select a staff member and a valid letter type.</p>';
            DOMElements.downloadHrLetterPdfBtn.style.display = 'none';
            return;
        }

        DOMElements.hrLetterPreview.innerHTML = HR_LETTER_TEMPLATES[letterType]({
            staff,
            details: {}
        });
        DOMElements.downloadHrLetterPdfBtn.style.display = 'inline-block';
    }

    function downloadHRLetterAsPDF() {
        const staffId = parseInt(DOMElements.letterStaffSelect.value);
        const letterType = DOMElements.hrLetterTypeSelect.value;
        const staff = staffList.find(s => s.id === staffId);
        if (!staff || !letterType) return;

        const fileName = `${staff.name.replace(/ /g, '_')}_${letterType}_${new Date().toISOString().split('T')[0]}`;

        PDFGenerator.generate({
            previewId: 'hr-letter-preview',
            pageSize: 'a4',
            fileName: fileName
        });
    }

    function handleHRTabSwitch(event) {
        if (!event.target.matches('.tab-button')) return;
        const button = event.target;
        const tabId = button.dataset.tab;

        DOMElements.hrTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const officeViewContainer = DOMElements.officeView;
        officeViewContainer.querySelectorAll('.tab-content').forEach(panel => panel.classList.remove('active'));

        const activePanel = document.getElementById(`${tabId}-tab`);
        if (activePanel) {
            activePanel.classList.add('active');
        }
        if (tabId === 'analytics') {
            renderAnalyticsTab();
        }
    }

    // --- ============================ ---
    // --- BUSINESS ANALYTICS FUNCTIONS ---
    // --- ============================ ---

    async function renderAnalyticsTab() {
        const allProjects = await DB.getAllProjects();
        const allExpenses = await DB.getOfficeExpenses();
        const allStaff = await DB.getAllHRData();
        const monthlyData = {};
        const monthLabels = [];
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth();
            const key = `${year}-${String(month + 1).padStart(2, '0')}`;
            monthLabels.push(date.toLocaleString('default', {
                month: 'short',
                year: 'numeric'
            }));
            monthlyData[key] = {
                revenue: 0,
                expenses: 0,
                salaries: 0,
                net: 0
            };
        }

        allProjects.forEach(p => {
            (p.invoices || []).forEach(inv => {
                if (inv.status === 'Paid' && inv.date) {
                    const invDate = new Date(inv.date);
                    const key = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
                    if (monthlyData[key]) {
                        monthlyData[key].revenue += parseFloat(inv.amount || 0);
                    }
                }
            });
        });

        const totalMonthlySalary = allStaff.reduce((sum, staff) => sum + (staff.grossSalary || 0), 0);
        Object.keys(monthlyData).forEach(key => {
            monthlyData[key].salaries = totalMonthlySalary;
        });

        allExpenses.forEach(exp => {
            const expDate = new Date(exp.date);
            const key = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyData[key]) {
                if (exp.frequency === 'annual') {
                    monthlyData[key].expenses += (parseFloat(exp.amount || 0) / 12);
                } else {
                    monthlyData[key].expenses += parseFloat(exp.amount || 0);
                }
            }
        });

        let totalRevenue = 0,
            totalCosts = 0;
        const revenueValues = [],
            costValues = [],
            netValues = [];

        Object.keys(monthlyData).forEach(key => {
            const month = monthlyData[key];
            const totalMonthCost = month.expenses + month.salaries;
            month.net = month.revenue - totalMonthCost;
            totalRevenue += month.revenue;
            totalCosts += totalMonthCost;
            revenueValues.push(month.revenue);
            costValues.push(totalMonthCost);
            netValues.push(month.net);
        });
        const netProfit = totalRevenue - totalCosts;

        DOMElements['analytics-summary-container'].innerHTML = `
            <div class="summary-item"><div class="label">Total Revenue (12 Mo)</div><div class="value">${formatCurrency(totalRevenue)}</div></div>
            <div class="summary-item"><div class="label">Total Costs (12 Mo)</div><div class="value">${formatCurrency(totalCosts)}</div></div>
            <div class="summary-item" style="background-color: ${netProfit < 0 ? '#ffebee' : '#e8f5e9'};"><div class="label">Net Profit (12 Mo)</div><div class="value" style="color: ${netProfit < 0 ? '#c62828' : '#2e7d32'};">${formatCurrency(netProfit)}</div></div>`;

        const ctx = DOMElements.analyticsChart?.getContext('2d');
        if (!ctx) return;
        if (analyticsChart) analyticsChart.destroy();

        analyticsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Revenue',
                    data: revenueValues,
                    backgroundColor: '#4CAF50'
                }, {
                    label: 'Total Costs',
                    data: costValues,
                    backgroundColor: '#F44336'
                }, {
                    label: 'Net Profit',
                    data: netValues,
                    backgroundColor: '#2196F3',
                    type: 'line',
                    borderColor: '#2196F3',
                    fill: false,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Revenue vs. Costs (Last 12 Months)'
                    }
                }
            }
        });
    }

    // --- ======================================== ---
    // --- UI HELPERS, RENDERERS, AND DATA GETTERS ---
    // --- ======================================== ---
    
    // ** NEW ** A single function to refresh the current preview pane
    function refreshCurrentPreview() {
        const activeTab = DOMElements.previewTabs.querySelector('.tab-button.active');
        if (activeTab) {
            updateActivePreview(activeTab.dataset.tab);
        }
    }

    // ** MODIFIED ** Now triggers on-demand preview rendering
    async function updateActivePreview(tabId) {
        if (!currentProjectJobNo) return;

        const project = await DB.getProject(currentProjectJobNo);
        if (!project) return;
        
        const uiData = getFormDataFromUI();
        const fullData = { ...project, ...uiData };
        const feeDistribution = getFeeDistribution(fullData);

        switch(tabId) {
            case 'brief-proposal':
                DOMElements['brief-proposal-preview'].innerHTML = PROJECT_DOCUMENT_TEMPLATES.briefProposal(fullData, feeDistribution);
                break;
            case 'full-agreement':
                DOMElements['full-agreement-preview'].innerHTML = PROJECT_DOCUMENT_TEMPLATES.fullAgreement(fullData, feeDistribution);
                break;
            case 'assignment-order':
                DOMElements['assignment-order-preview'].innerHTML = PROJECT_DOCUMENT_TEMPLATES.assignmentOrder(fullData);
                break;
            case 'proforma':
            case 'tax-invoice':
            case 'receipt':
                renderInvoiceDocuments(fullData.invoices?.[fullData.invoices.length - 1]);
                break;
            case 'payment-certificate':
                renderPaymentCertificatePreview(null);
                break;
            case 'villa-schedule': // NEW CASE
                UrbanAxisSchedule.render(fullData);
                break;
            case 'project-letter': 
                renderProjectLetterPreview();
                break;
        }
    }

    // ** MODIFIED ** Now triggers on-demand preview rendering
    function handleTabSwitch(event) {
        if (!event.target.matches('.tab-button')) return;
        
        const button = event.target;
        const tabsContainer = button.parentElement;
        const tabId = button.dataset.tab;

        tabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const isControlTab = tabsContainer.classList.contains('control-tabs');
        const contentSelector = isControlTab ? '.tab-content' : '.preview-tab-content';
        const parentContainer = isControlTab ? DOMElements['project-view'].querySelector('.controls') : DOMElements['project-view'].querySelector('.preview-area');

        parentContainer.querySelectorAll(contentSelector).forEach(panel => panel.classList.remove('active'));
        
        const panelIdToShow = isControlTab ? `${tabId}-tab` : `${tabId}-preview`;
        const activePanel = document.getElementById(panelIdToShow);
        
        if (activePanel) {
            activePanel.classList.add('active');
        }

        if (tabsContainer.classList.contains('preview-tabs')) {
            updateActivePreview(tabId);
        }
    }
      // ** NEW/MODIFIED ** Functions to manage the Project Letters UI and rendering
    function updateProjectLetterUI() {
        const letterType = DOMElements['project-letter-type'].value;
        const dynamicFieldsContainer = DOMElements['project-letter-dynamic-fields'];
        
        if (letterType === 'scopeOfWork') {
            dynamicFieldsContainer.innerHTML = `
                <div class="input-group">
                    <label for="letter-scope-items">Scope of Work Items (one per line)</label>
                    <textarea id="letter-scope-items" rows="5" placeholder="1. Extension of ground floors\n2. Extension of first floor"></textarea>
                </div>`;
        } else {
            dynamicFieldsContainer.innerHTML = '';
        }
    }

    async function renderProjectLetterPreview() {
        const project = await DB.getProject(currentProjectJobNo);
        if (!project) return;

        const uiData = getFormDataFromUI();
        const projectData = { ...project, ...uiData };
        
        const letterType = DOMElements['project-letter-type'].value;
        const authorityKey = DOMElements['project-letter-authority'].value;

        if (!letterType || !authorityKey) {
            DOMElements['project-letter-preview'].innerHTML = '<p style="text-align:center;">Please select a letter type and an authority.</p>';
            return;
        }

        let details = { authority: authorityKey };
        if (letterType === 'scopeOfWork') {
            const scopeItemsTextarea = document.getElementById('letter-scope-items');
            details.scopeItems = scopeItemsTextarea ? scopeItemsTextarea.value.split('\n').filter(line => line.trim() !== '') : [];
        }

        const templateFunction = PROJECT_LETTER_TEMPLATES[letterType];
        if (templateFunction) {
            DOMElements['project-letter-preview'].innerHTML = templateFunction({ projectData, details });
        } else {
            DOMElements['project-letter-preview'].innerHTML = '<p style="text-align:center;">Template not found.</p>';
        }
        
        // Switch to the preview tab to show the result
        DOMElements.previewTabs.querySelector('[data-tab="project-letter"]').click();
    }
    async function handlePaymentCertActions(e) {
        if (!currentProjectJobNo) return;
        
        if (e.target.matches('#generate-new-cert-btn')) {
            const certNo = DOMElements['payment-cert-no'].value;
            if (!certNo) {
                alert('Please provide a Certificate Number.');
                return;
            }
            await generateAndSavePaymentCertificate(certNo);
        } else if (e.target.matches('.view-cert-btn')) {
            const index = e.target.dataset.index;
            const siteData = await DB.getSiteData(currentProjectJobNo);
            const certData = siteData?.paymentCertificates?.[index];
            if (certData) {
                await renderPaymentCertificatePreview(certData);
                DOMElements.previewTabs.querySelector(`[data-tab="payment-certificate"]`).click();
            }
        }
    }
    
    async function handleMasterDocumentUpload(event) {
        if (!event.target.matches('.upload-btn')) return;
        if (!currentProjectJobNo) {
            alert("Please save the project before uploading documents.");
            return;
        }

        const container = event.target.closest('.document-category');
        const fileInput = container.querySelector('.doc-file-input');
        const subCategorySelect = container.querySelector('.doc-type-select');
        const expiryInput = container.querySelector('.expiry-date-input');
        const category = event.target.dataset.category;
        const files = fileInput.files;

        if (files.length === 0) { alert("Please select a file to upload."); return; }

        for (const file of files) {
            const dataUrl = await readFileAsDataURL(file);
            await DB.addFile({
                jobNo: currentProjectJobNo,
                source: 'master',
                category: category,
                subCategory: subCategorySelect.value,
                name: file.name,
                fileType: file.type,
                dataUrl: dataUrl,
                expiryDate: expiryInput.value || null
            });
        }
        
        alert(`${files.length} file(s) uploaded successfully.`);
        fileInput.value = '';
        if(expiryInput) expiryInput.value = '';
        renderMasterFileGallery(container, currentProjectJobNo, category);
    }
    
    async function renderMasterFileGallery(containerEl, jobNo, category) {
        const galleryGrid = containerEl.querySelector('.gallery-grid');
        galleryGrid.innerHTML = '<p>Loading files...</p>';
        const allMasterFiles = await DB.getFiles(jobNo, 'master');
        const files = allMasterFiles.filter(f => f.category === category);
        
        if (files.length === 0) {
            galleryGrid.innerHTML = '<p>No documents uploaded in this category.</p>';
            return;
        }
        
        galleryGrid.innerHTML = '';
        files.forEach(file => {
            const thumbContainer = document.createElement('div');
            thumbContainer.className = 'thumbnail-container';

            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'thumbnail-delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete this file';
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this file?')) {
                    await DB.deleteFile(file.id);
                    renderMasterFileGallery(containerEl, jobNo, category);
                }
            };

            let thumbnail;
            if (file.fileType.startsWith('image/')) {
                thumbnail = Object.assign(document.createElement('img'), { src: file.dataUrl, className: 'thumbnail' });
            } else if (file.fileType === 'application/pdf') {
                thumbnail = document.createElement('canvas');
                thumbnail.className = 'thumbnail pdf-thumbnail';
                PDFGenerator.renderPdfThumbnail(thumbnail, file.dataUrl);
            } else {
                thumbnail = Object.assign(document.createElement('div'), { className: 'file-icon', textContent: file.fileType.split('/')[1]?.toUpperCase() || 'FILE' });
            }
            
            const caption = document.createElement('div');
            caption.className = 'thumbnail-caption';
            caption.textContent = file.name;
            
            thumbContainer.append(deleteBtn, thumbnail, caption);
            galleryGrid.appendChild(thumbContainer);
        });
    }
    
    async function handleGeneratePdf() {
        if (!currentProjectJobNo) return;
        
        const activePreviewTab = DOMElements.previewTabs.querySelector('.tab-button.active');
        if (!activePreviewTab) {
            alert('Could not determine active preview tab.');
            return;
        }

        const previewId = activePreviewTab.dataset.tab + "-preview";
        const project = await DB.getProject(currentProjectJobNo);
        const fileName = `${project.jobNo.replace(/\//g, '-')}_${activePreviewTab.dataset.tab}`;

        PDFGenerator.generate({
            previewId: previewId,
            projectJobNo: currentProjectJobNo,
            pageSize: DOMElements['page-size-selector'].value,
            fileName: fileName
        });
    }

   async function handleNewProject() {
        const allProjects = await DB.getAllProjects();
        const nextId = allProjects.length > 0 ? Math.max(...allProjects.map(p => parseInt(p.jobNo.split('/').pop(), 10) || 0)) + 1 : 1;
        const jobNo = `RRC/${new Date().getFullYear()}/${String(nextId).padStart(3, '0')}`;
        
        const newProject = { jobNo, agreementDate: new Date().toISOString().split('T')[0], scope: {}, notes: {}, invoices: [], remunerationType: 'percentage', vatRate: 5, designFeeSplit: 60, supervisionBillingMethod: 'monthly', feeMilestonePercentages: {} };
        CONTENT.FEE_MILESTONES.forEach(item => newProject.feeMilestonePercentages[item.id] = item.defaultPercentage);
        
        currentProjectJobNo = jobNo;
        populateFormWithData(newProject);
        DOMElements['project-view-title'].textContent = `Creating New Project: ${jobNo}`;
        showProjectView();
        DOMElements['documents-tab'].querySelectorAll('.gallery-grid').forEach(grid => { grid.innerHTML = '<p>Please save the project before uploading documents.</p>'; });
    } 
    
    async function renderPaymentCertTab(project) {
        if (!project) return;
        const siteData = await DB.getSiteData(project.jobNo) || { paymentCertificates: [] };
        const certs = siteData.paymentCertificates || [];

        DOMElements['payment-cert-no'].value = `PC-${String(certs.length + 1).padStart(2, '0')}`;

        const tbody = DOMElements['cert-history-body'];
        tbody.innerHTML = '';
        if (certs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No certificates issued yet.</td></tr>';
        } else {
            certs.forEach((cert, index) => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${cert.certNo}</td>
                    <td>${new Date(cert.date).toLocaleDateString('en-CA')}</td>
                    <td>${formatCurrency(cert.netPayable)}</td>
                    <td><button class="view-cert-btn secondary-button" data-index="${index}">View</button></td>
                `;
            });
        }
    }

    async function generateAndSavePaymentCertificate(certNo) {
        const project = await DB.getProject(currentProjectJobNo);
        const siteData = await DB.getSiteData(currentProjectJobNo);
    
        if (!siteData || !siteData.boq || siteData.boq.length === 0) {
            alert("Cannot generate certificate. No BOQ data found from site engineer.");
            return;
        }
    
        const totalValue = siteData.boq.reduce((sum, item) => sum + (item.amount || 0), 0);
        const workDoneValue = siteData.boq.reduce((sum, item) => sum + ((item.amount || 0) * (((item.prev_perc || 0) + (item.curr_perc || 0)) / 100)), 0);
        const totalProgress = totalValue > 0 ? (workDoneValue / totalValue) * 100 : 0;
        const retention = workDoneValue * 0.10;
        const advanceDeduction = workDoneValue * 0.10;
        const previouslyCertified = (siteData.paymentCertificates || []).reduce((sum, cert) => sum + cert.totalForInvoice, 0);
        const totalForInvoice = workDoneValue - retention - advanceDeduction - previouslyCertified;
        const vat = totalForInvoice > 0 ? totalForInvoice * 0.05 : 0;
        const roundOff = Math.ceil(totalForInvoice + vat) - (totalForInvoice + vat);
        const netPayable = totalForInvoice + vat + roundOff;
    
        const newCertData = {
            certNo, date: new Date().toISOString(), totalContractValue: totalValue,
            workDoneValue, workDonePercentage: totalProgress.toFixed(0), retention,
            advanceDeduction, previouslyCertified, totalForInvoice, vat, roundOff, netPayable
        };
    
        siteData.paymentCertificates = siteData.paymentCertificates || [];
        siteData.paymentCertificates.push(newCertData);
        await DB.putSiteData(siteData);
        
        await renderPaymentCertTab(project);
        await renderPaymentCertificatePreview(newCertData);
        DOMElements.previewTabs.querySelector(`[data-tab="payment-certificate"]`).click();
        alert(`Payment Certificate ${certNo} has been generated and saved.`);
    }

    // ** MODIFIED ** Now shows placeholder text if no invoice is selected
    async function renderInvoiceDocuments(invoiceData) {
        const project = await DB.getProject(currentProjectJobNo);
        if (!project) return;
        const allInvoices = project.invoices || [];

        if (!invoiceData) {
            const placeholder = `<div style="padding: 20px; text-align: center;">Select an invoice from the history to view its preview.</div>`;
            DOMElements['proforma-preview'].innerHTML = placeholder;
            DOMElements['tax-invoice-preview'].innerHTML = placeholder;
            DOMElements['receipt-preview'].innerHTML = placeholder;
            return;
        }

        DOMElements['proforma-preview'].innerHTML = PROJECT_DOCUMENT_TEMPLATES.genericInvoice(invoiceData, project, allInvoices, 'PROFORMA INVOICE', false);
        DOMElements['tax-invoice-preview'].innerHTML = PROJECT_DOCUMENT_TEMPLATES.genericInvoice(invoiceData, project, allInvoices, 'TAX INVOICE', true);
        DOMElements['receipt-preview'].innerHTML = PROJECT_DOCUMENT_TEMPLATES.receipt(invoiceData, project);
    }
    
    function updateSupervisionBillingView() {
        const method = document.querySelector('input[name="supervisionBillingMethod"]:checked')?.value;
        DOMElements['supervision-billing-monthly-container'].style.display = method === 'monthly' ? 'block' : 'none';
        DOMElements['supervision-billing-progress-container'].style.display = method === 'progress' ? 'block' : 'none';
        DOMElements['prorata-percentage-group'].style.display = method === 'progress' ? 'block' : 'none';
    }
    
    function renderInvoicingTab(project) {
        if (!project) return;
        DOMElements['current-invoice-items-body'].innerHTML = '';
        const feeDistribution = getFeeDistribution(project);

        const milestoneTbody = DOMElements['milestone-billing-body'];
        milestoneTbody.innerHTML = '';
        const billedMilestoneIds = new Set();
        (project.invoices || []).forEach(inv => (inv.items || []).forEach(item => { if (item.type === 'milestone') billedMilestoneIds.add(item.id); }));

        feeDistribution.fees.forEach(milestone => {
            const row = milestoneTbody.insertRow();
            const isBilled = billedMilestoneIds.has(milestone.id);
            row.innerHTML = `
                <td><input type="checkbox" id="cb-${milestone.id}" data-item-id="${milestone.id}" data-item-type="milestone" ${isBilled ? 'disabled' : ''}></td>
                <td>${milestone.text} (${milestone.percentage}%)</td>
                <td>${formatCurrency(milestone.amount)}</td>
                <td><span class="status-${isBilled ? 'completed' : 'pending'}">${isBilled ? 'Billed' : 'Available'}</span></td>
            `;
        });

        updateSupervisionBillingView();
        const lastProgress = project.lastBilledProgress || 0;
        const billedExtendedMonths = project.billedExtendedSupervisionMonths || 0;
        const totalSupervisionFee = feeDistribution.supervisionFeePortion;
        const billedAmount = totalSupervisionFee * (lastProgress / 100);
        const remainingAmount = totalSupervisionFee - billedAmount;

        DOMElements['supervision-progress-info'].innerHTML = `
            <div class="progress-summary-line"><span>Total Supervision Fee:</span> <b>AED ${formatCurrency(totalSupervisionFee)}</b></div>
            <div class="progress-summary-line"><span>Billed Progress (${lastProgress}%):</span> <b>AED ${formatCurrency(billedAmount)}</b></div>
            <div class="progress-summary-line" style="border-top: 1px solid #ddd; margin-top: 4px; padding-top: 4px;"><span>Remaining Fee:</span> <b>AED ${formatCurrency(remainingAmount)}</b></div>`;
        DOMElements.projectProgressInput.min = lastProgress + 0.1;
        DOMElements['extended-supervision-info'].innerHTML = `<b>${billedExtendedMonths}</b> extended months billed.`;

        const invoiceTbody = DOMElements['invoice-history-body'];
        invoiceTbody.innerHTML = '';
        (project.invoices || []).forEach((inv, index) => {
            const row = invoiceTbody.insertRow();
            row.dataset.invoiceIndex = index;
            row.innerHTML = `<td><a href="#" class="view-invoice-link">${inv.no}</a></td><td>${inv.date}</td><td>${formatCurrency(inv.amount)}</td><td></td><td></td><td></td>`;
            const statusSelect = document.createElement('select');
            statusSelect.className = 'invoice-status-dropdown';
            ['Raised', 'Paid', 'On Hold', 'Pending'].forEach(s => {
                const option = document.createElement('option');
                option.value = s; option.textContent = s; if (inv.status === s) option.selected = true;
                statusSelect.appendChild(option);
            });
            row.cells[3].appendChild(statusSelect);
            const detailsInput = document.createElement('input');
            detailsInput.type = 'text'; detailsInput.className = 'invoice-details-input'; detailsInput.value = inv.paymentDetails || ''; detailsInput.placeholder = 'e.g., Bank Transfer';
            row.cells[4].appendChild(detailsInput);
            const chequeNoInput = document.createElement('input');
            chequeNoInput.type = 'text'; chequeNoInput.className = 'cheque-details-input cheque-no-input'; chequeNoInput.style.marginBottom = '2px'; chequeNoInput.value = inv.chequeNo || ''; chequeNoInput.placeholder = 'Cheque No.';
            const chequeDateInput = document.createElement('input');
            chequeDateInput.type = 'date'; chequeDateInput.className = 'cheque-details-input cheque-date-input'; chequeDateInput.value = inv.chequeDate || '';
            row.cells[5].append(chequeNoInput, chequeDateInput);
        });

        DOMElements.newInvoiceNo.value = `INV-${project.jobNo.split('/')[2]}-${String((project.invoices || []).length + 1).padStart(3, '0')}`;
    }
    
    // ** MODIFIED ** Now shows a placeholder if no data is provided
    async function renderPaymentCertificatePreview(certData) {
        if (!certData) {
             DOMElements['payment-certificate-preview'].innerHTML = `<div style="padding: 20px; text-align: center;">Generate or select a certificate to view its preview.</div>`;
             return;
        }
        const project = await DB.getProject(currentProjectJobNo);
        DOMElements['payment-certificate-preview'].innerHTML = PROJECT_DOCUMENT_TEMPLATES.paymentCertificate(certData, project);
    }

    function getFormDataFromUI() {
        const data = { scope: {}, notes: {}, feeMilestonePercentages: {} };
        const stringFields = ['jobNo', 'agreementDate', 'projectStatus', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn', 'projectDescription', 'plotNo', 'area', 'scopeOfWorkType', 'projectType', 'designDuration', 'constructionDuration'];
        const floatFields = ['builtUpArea', 'vatRate', 'lumpSumFee', 'constructionCostRate', 'consultancyFeePercentage', 'designFeeSplit', 'extendedSupervisionFee'];
        stringFields.forEach(id => data[id] = DOMElements[id]?.value);
        floatFields.forEach(id => data[id] = parseFloat(DOMElements[id]?.value) || 0);
        data.otherAuthority = DOMElements.authority.value === 'Other' ? DOMElements.otherAuthority.value : '';
        data.otherScopeType = DOMElements.scopeOfWorkType.value === 'Other' ? DOMElements.otherScopeType.value : '';
        data.remunerationType = document.querySelector('input[name="remunerationType"]:checked').value;
        data.supervisionBillingMethod = document.querySelector('input[name="supervisionBillingMethod"]:checked').value;
        for (const section in CONTENT.SCOPE_DEFINITIONS) { 
            if (!/^[0-9\.]+$/.test(section)) continue; 
            data.scope[section] = {}; 
            CONTENT.SCOPE_DEFINITIONS[section].forEach(item => { 
                data.scope[section][item.id] = document.getElementById(`scope-${item.id}`)?.checked || false; 
            }); 
        }
        CONTENT.NOTES.forEach(item => { data.notes[item.id] = document.getElementById(item.id)?.checked || false; });
        CONTENT.FEE_MILESTONES.forEach(item => { data.feeMilestonePercentages[item.id] = parseFloat(document.getElementById(`fee-perc-${item.id}`)?.value) || 0; });
        return data;
    }
    
    function getFeeDistribution(projectData) {
        const data = projectData || getFormDataFromUI();
        const totalConsultancyFee = (data.remunerationType === 'lumpSum') ?
            (parseFloat(data.lumpSumFee) || 0) :
            ((parseFloat(data.builtUpArea) || 0) * (parseFloat(data.constructionCostRate) || 0) * ((parseFloat(data.consultancyFeePercentage) || 0) / 100));
        const designFeeSplit = parseFloat(data.designFeeSplit) || 0;
        const designFeePortion = totalConsultancyFee * (designFeeSplit / 100);
        const supervisionFeePortion = totalConsultancyFee * ((100 - designFeeSplit) / 100);
        const constructionMonths = parseFloat(data.constructionDuration) || 1;
        const monthlySupervisionFee = supervisionFeePortion / constructionMonths;
        const feeBreakdown = [];
        CONTENT.FEE_MILESTONES.forEach(item => {
            const percentage = data.feeMilestonePercentages?.[item.id] !== undefined ? data.feeMilestonePercentages[item.id] : item.defaultPercentage;
            if (percentage > 0) {
                feeBreakdown.push({ id: item.id, text: item.text, percentage: percentage, amount: designFeePortion * (percentage / 100) });
            }
        });
        return { totalConsultancyFee, designFeePortion, supervisionFeePortion, monthlySupervisionFee, fees: feeBreakdown };
    }
    
    // ** MODIFIED ** Now calls refreshCurrentPreview
    function updateFinancialSummary() {
        const area = parseFloat(DOMElements.builtUpArea.value) || 0;
        const costRate = parseFloat(DOMElements.constructionCostRate.value) || 0;
        DOMElements['total-construction-cost-display'].textContent = `AED ${formatCurrency(area * costRate)}`;
        const distribution = getFeeDistribution();
        DOMElements['financial-summary-container'].innerHTML = `
            <div class="summary-line"><span>Total Consultancy Fee</span><span>AED ${formatCurrency(distribution.totalConsultancyFee)}</span></div>
            <div class="summary-line"><span>- Design Fee Portion</span><span>AED ${formatCurrency(distribution.designFeePortion)}</span></div>
            <div class="summary-line"><span>- Supervision Fee Portion</span><span>AED ${formatCurrency(distribution.supervisionFeePortion)}</span></div>
            <div class="summary-line" style="font-size: 9pt; color: #666; padding-top: 5px;"><span>(Monthly Supervision Rate)</span><span>(AED ${formatCurrency(distribution.monthlySupervisionFee)}/month)</span></div>`;
        if (currentProjectJobNo) {
             DB.getProject(currentProjectJobNo).then(project => {
                if (project) renderInvoicingTab(project);
            });
        }
        refreshCurrentPreview();
    }

    // ** MODIFIED ** Now calls updateFinancialSummary which handles the preview refresh
    function updateRemunerationView() {
        const selectedType = document.querySelector('input[name="remunerationType"]:checked')?.value;
        DOMElements['lump-sum-group'].style.display = (selectedType === 'lumpSum') ? 'block' : 'none';
        DOMElements['percentage-group'].style.display = (selectedType === 'percentage') ? 'block' : 'none';
        updateFinancialSummary();
    }

    function setSelectOrOther(selectEl, otherInputEl, value, otherValue) {
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
    
    // ** MODIFIED ** Now triggers the initial render of the active preview tab
    function populateFormWithData(project) {
        const stringFields = ['jobNo', 'agreementDate', 'projectStatus', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn', 'projectDescription', 'plotNo', 'area', 'projectType', 'designDuration', 'constructionDuration'];
        const floatFields = ['builtUpArea', 'vatRate', 'lumpSumFee', 'constructionCostRate', 'consultancyFeePercentage', 'designFeeSplit', 'extendedSupervisionFee'];
        stringFields.forEach(id => { if (DOMElements[id]) DOMElements[id].value = project[id] || ''; });
        floatFields.forEach(id => { if (DOMElements[id]) DOMElements[id].value = project[id] || 0; });
        
        setSelectOrOther(DOMElements.authority, DOMElements.otherAuthority, project.authority, project.otherAuthority);
        setSelectOrOther(DOMElements.scopeOfWorkType, DOMElements.otherScopeType, project.scopeOfWorkType, project.otherScopeType);
        
        document.querySelector(`input[name="remunerationType"][value="${project.remunerationType || 'percentage'}"]`).checked = true;
        document.querySelector(`input[name="supervisionBillingMethod"][value="${project.supervisionBillingMethod || 'monthly'}"]`).checked = true;

        for (const section in CONTENT.SCOPE_DEFINITIONS) { 
            if (!/^[0-9\.]+$/.test(section)) continue; 
            CONTENT.SCOPE_DEFINITIONS[section].forEach(item => { 
                const cb = document.getElementById(`scope-${item.id}`); 
                if (cb) cb.checked = project.scope?.[section]?.[item.id] || false; 
            }); 
        }
        CONTENT.NOTES.forEach(item => { 
            const cb = document.getElementById(item.id); 
            if (cb) cb.checked = project.notes?.[item.id] || false; 
        });
        CONTENT.FEE_MILESTONES.forEach(item => { 
            const input = document.getElementById(`fee-perc-${item.id}`); 
            if (input) input.value = project.feeMilestonePercentages?.[item.id] ?? item.defaultPercentage; 
        });

        updateRemunerationView();
        renderInvoicingTab(project);

        const activePreviewTab = DOMElements.previewTabs.querySelector('.tab-button.active');
        if (activePreviewTab) {
            updateActivePreview(activePreviewTab.dataset.tab);
        }
    }
    
    async function handleEditProject(jobNo) {
        currentProjectJobNo = jobNo;
        const project = await DB.getProject(jobNo);
        if (project) {
            populateFormWithData(project);
            DOMElements['project-view-title'].textContent = `Editing Project: ${jobNo}`;
            showProjectView();
            await renderPaymentCertTab(project);
            DOMElements['documents-tab'].querySelectorAll('.document-category').forEach(container => {
                const category = container.querySelector('.upload-btn').dataset.category;
                renderMasterFileGallery(container, jobNo, category);
            });
        }
    }

    function predictResources() {
        const totalFee = getFeeDistribution().totalConsultancyFee;
        const designMonths = parseFloat(DOMElements.designDuration?.value) || 0;
        const constrMonths = parseFloat(DOMElements.constructionDuration?.value) || 0;
        const salaries = { architect: 20000, draftsman: 8000, structural: 18000, mep: 16000, siteEng: 12000 };
        const manMonths = { architect: designMonths * 0.5, draftsman: designMonths * 1.0, structural: designMonths * 0.3, mep: designMonths * 0.3, siteEng: constrMonths * 0.7 };
        let totalCost = 0;
        let tableHtml = `<table class="output-table"><tr><th>Role</th><th>Est. Man-Months</th><th>Est. Salary Cost (AED)</th></tr>`;
        for (const role in manMonths) { const cost = manMonths[role] * salaries[role]; totalCost += cost; tableHtml += `<tr><td>${role.charAt(0).toUpperCase() + role.slice(1)}</td><td>${manMonths[role].toFixed(1)}</td><td>${formatCurrency(cost)}</td></tr>`; }
        tableHtml += `<tfoot><tr><td colspan="2"><b>Total Estimated Resource Cost</b></td><td><b>${formatCurrency(totalCost)}</b></td></tr></tfoot></table>`;
        const profit = totalFee - totalCost;
        const profitPercentage = totalFee > 0 ? ((profit / totalFee) * 100).toFixed(1) : 0;
        DOMElements.resourcePredictionOutput.innerHTML = `
            <div class="financial-summary"><h4>Resource Cost vs. Fee Summary</h4>
                <div class="summary-line"><span>Total Consultancy Fee (A)</span><span>AED ${formatCurrency(totalFee)}</span></div>
                <div class="summary-line"><span>Total Estimated Resource Cost (B)</span><span>AED ${formatCurrency(totalCost)}</span></div>
                <div class="summary-line" style="border-top: 1px solid #ccc; margin-top: 4px; padding-top: 4px;"><span><strong>Estimated Margin (A-B)</strong></span><span><strong>AED ${formatCurrency(profit)} (${profitPercentage}%)</strong></span></div>
            </div>${tableHtml}`;
    }

    function generateQRCode() {
        const data = getFormDataFromUI();
        const fee = getFeeDistribution(data).totalConsultancyFee;
        const qrData = `Client: ${data.clientName}, Plot: ${data.plotNo}, Fee: AED ${formatCurrency(fee)}`;
        DOMElements['qr-code'].innerHTML = "";
        new QRCode(DOMElements['qr-code'], { text: qrData, width: 128, height: 128 });
    }

    // --- [Start] Invoicing Helper Functions ---
    async function handleInvoiceTableEvents(e) {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;

        const invoiceIndex = parseInt(row.dataset.invoiceIndex, 10);
        const project = await DB.getProject(currentProjectJobNo);
        if (!project || isNaN(invoiceIndex)) return;

        const invoice = project.invoices[invoiceIndex];
        if(!invoice) return;

        if (target.matches('.view-invoice-link')) {
            e.preventDefault();
            renderInvoiceDocuments(invoice);
            DOMElements.previewTabs.querySelector(`[data-tab="tax-invoice"]`).click();
        } else if (target.matches('.invoice-status-dropdown')) {
            invoice.status = target.value;
            await DB.putProject(project);
            await renderDashboard();
            renderInvoicingTab(project);
        } else if (target.matches('.invoice-details-input, .cheque-no-input, .cheque-date-input')) {
            invoice.paymentDetails = row.querySelector('.invoice-details-input').value;
            invoice.chequeNo = row.querySelector('.cheque-no-input').value;
            invoice.chequeDate = row.querySelector('.cheque-date-input').value;
            await DB.putProject(project);
            renderInvoiceDocuments(invoice);
        }
    }
    
    function addInvoiceItemToTable(item) {
        const existingRow = DOMElements['current-invoice-items-body'].querySelector(`tr[data-item-id="${item.id}"][data-item-type="${item.type}"]`);
        if (existingRow) {
            alert("This item has already been added to the current invoice.");
            return false;
        }
        const newRow = DOMElements['current-invoice-items-body'].insertRow();
        newRow.dataset.itemId = item.id;
        newRow.dataset.itemType = item.type;
        newRow.dataset.amount = item.amount;
        if (item.newProgress) newRow.dataset.newProgress = item.newProgress;
        newRow.innerHTML = `
            <td><input type="text" class="editable-desc" value="${item.text}" style="width:100%;"></td>
            <td><input type="number" class="editable-amt" value="${item.amount}" style="width:100%; text-align:right;"></td>
            <td><button type="button" class="remove-btn">X</button></td>`;
        return true;
    }
    async function addExtendedSupervisionItem() {
        const project = await DB.getProject(currentProjectJobNo);
        if (!project) return;
        const extendedMonthsBilled = project.billedExtendedSupervisionMonths || 0;
        const nextExtendedMonth = extendedMonthsBilled + 1;
        const fee = parseFloat(DOMElements.extendedSupervisionFee.value) || 0;
        addInvoiceItemToTable({ id: `ext-month-${nextExtendedMonth}`, type: 'supervision-extended', text: `Extended Supervision Fee - Month ${nextExtendedMonth}`, amount: fee });
    }

    async function addProgressSupervisionItem() {
        const project = await DB.getProject(currentProjectJobNo);
        if (!project) return;
        const feeDistribution = getFeeDistribution(project);
        const lastProgress = project.lastBilledProgress || 0;
        const currentProgress = parseFloat(DOMElements.projectProgressInput.value);
        if (isNaN(currentProgress) || currentProgress <= lastProgress || currentProgress > 100) {
            alert(`Please enter a valid progress percentage greater than the last billed progress of ${lastProgress}%.`);
            return;
        }
        const progressDiff = currentProgress - lastProgress;
        const amount = feeDistribution.supervisionFeePortion * (progressDiff / 100);
        const success = addInvoiceItemToTable({ id: `progress-${currentProgress}`, type: 'supervision-progress', text: `Supervision Fee for Project Progress (${lastProgress}% to ${currentProgress}%)`, amount: amount, newProgress: currentProgress });
        if (success) DOMElements.projectProgressInput.value = '';
    }

    async function addMonthlySupervisionItem() {
        const project = await DB.getProject(currentProjectJobNo);
        if (!project) return;
        const feeDistribution = getFeeDistribution(project);
        const billedMonths = project.billedSupervisionMonths || 0;
        addInvoiceItemToTable({ id: `month-${billedMonths + 1}`, type: 'supervision-monthly', text: `Supervision Fee for Month ${billedMonths + 1}`, amount: feeDistribution.monthlySupervisionFee });
    }

    function addOrRemoveInvoiceItemFromCheckbox(checkbox) {
        const row = checkbox.closest('tr');
        const itemId = checkbox.dataset.itemId;
        const itemType = checkbox.dataset.itemType;
        const text = row.cells[1].textContent;
        const amount = parseFloat(row.cells[2].textContent.replace(/[^0-9.-]+/g, ""));
        
        if (checkbox.checked) {
            const newRow = DOMElements['current-invoice-items-body'].insertRow();
            newRow.dataset.itemId = itemId;
            newRow.dataset.itemType = itemType;
            newRow.dataset.amount = amount;
            newRow.dataset.checkboxId = checkbox.id;
            newRow.innerHTML = `
                <td><input type="text" class="editable-desc" value="${text.trim()}" style="width:100%;"></td>
                <td><input type="number" class="editable-amt" value="${amount}" style="width:100%; text-align:right;"></td>
                <td><button type="button" class="remove-btn">X</button></td>`;
        } else {
            const itemToRemove = DOMElements['current-invoice-items-body'].querySelector(`tr[data-item-id="${itemId}"][data-item-type="${itemType}"]`);
            if (itemToRemove) itemToRemove.remove();
        }
    }

    async function handleRaiseInvoice() {
        const invNo = DOMElements.newInvoiceNo.value;
        if (!invNo) { alert("Please enter an Invoice Number."); return; }
        const project = await DB.getProject(currentProjectJobNo);
        if(!project) return;
        
        const currentItemsRows = DOMElements['current-invoice-items-body'].querySelectorAll('tr');
        if (currentItemsRows.length === 0) { alert("Please add at least one item to the invoice before raising."); return; }

        let totalInvoiceAmount = 0, newBilledMonths = project.billedSupervisionMonths || 0, newBilledExtendedMonths = project.billedExtendedSupervisionMonths || 0, newLastBilledProgress = project.lastBilledProgress || 0;
        const invoiceItems = Array.from(currentItemsRows).map(row => {
            const item = { type: row.dataset.itemType, id: row.dataset.itemId, text: row.querySelector('.editable-desc').value, amount: parseFloat(row.querySelector('.editable-amt').value) };
            totalInvoiceAmount += item.amount;
            if (item.type === 'supervision-monthly') newBilledMonths++;
            else if (item.type === 'supervision-progress') newLastBilledProgress = parseFloat(row.dataset.newProgress);
            else if (item.type === 'supervision-extended') newBilledExtendedMonths++;
            return item;
        });

        if (!Array.isArray(project.invoices)) project.invoices = [];
        project.invoices.push({ no: invNo, date: new Date().toLocaleDateString('en-CA'), amount: totalInvoiceAmount, status: 'Raised', paymentDetails: '', chequeNo: '', chequeDate: '', items: invoiceItems });
        project.billedSupervisionMonths = newBilledMonths;
        project.lastBilledProgress = newLastBilledProgress;
        project.billedExtendedSupervisionMonths = newBilledExtendedMonths;

        await DB.putProject(project);
        alert(`Invoice ${invNo} for AED ${formatCurrency(totalInvoiceAmount)} raised successfully.`);
        await renderDashboard();
        renderInvoicingTab(project);
    }
    // --- [End] Invoicing Helper Functions ---

    // --- ========================== ---
    // --- INITIALIZATION & LISTENERS ---
    // --- ========================== ---
   // --- ========================== ---
    // --- INITIALIZATION & LISTENERS ---
    // --- ========================== ---
    
    function setupEventListeners() {
        // --- Main Navigation & Dashboard Controls ---
        DOMElements['design-studio-btn']?.addEventListener('click', showDesignStudio);
        DOMElements['back-to-dashboard-btn-from-design']?.addEventListener('click', showDashboard);
        DOMElements['load-from-file-btn']?.addEventListener('click', () => DOMElements['xml-file-input']?.click());
        DOMElements['xml-file-input']?.addEventListener('change', handleProjectFileImport);
        // ... (rest of the listeners are unchanged) ...
         DOMElements['load-site-update-btn']?.addEventListener('click', () => DOMElements['site-update-file-input']?.click());
        DOMElements['site-update-file-input']?.addEventListener('change', handleSiteUpdateImport);
        DOMElements['save-to-file-btn']?.addEventListener('click', handleFileExport);
        DOMElements['new-project-btn']?.addEventListener('click', handleNewProject);
        DOMElements['search-box']?.addEventListener('input', renderDashboard);
        DOMElements['toggle-invoices-btn']?.addEventListener('click', () => {
            showAllInvoices = !showAllInvoices;
            const btn = DOMElements['toggle-invoices-btn'];
            if (btn) btn.textContent = showAllInvoices ? 'Show Pending Invoices' : 'Show All Invoices';
            renderDashboard();
        });
        DOMElements['project-list-body']?.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row?.dataset?.jobNo) return;
            if (e.target.matches('.edit-btn')) handleEditProject(row.dataset.jobNo);
            if (e.target.matches('.view-site-files-btn')) showSiteFilesModal(row.dataset.jobNo);
        });
        DOMElements['pending-invoices-summary']?.addEventListener('click', showPendingInvoicesModal);
        DOMElements['expiring-documents-summary']?.addEventListener('click', showExpiringDocumentsModal);
        DOMElements['pending-modal-close-btn']?.addEventListener('click', () => DOMElements['pending-invoice-modal'].style.display = 'none');
        DOMElements['expiring-modal-close-btn']?.addEventListener('click', () => DOMElements['expiring-documents-modal'].style.display = 'none');
        DOMElements['site-files-modal-close-btn']?.addEventListener('click', () => DOMElements['site-files-modal'].style.display = 'none');
        DOMElements['back-to-dashboard-btn']?.addEventListener('click', showDashboard);
        DOMElements['save-project-btn']?.addEventListener('click', saveCurrentProject);
        DOMElements.controlTabs?.addEventListener('click', handleTabSwitch);
        DOMElements.previewTabs?.addEventListener('click', handleTabSwitch);
        DOMElements['generate-pdf-btn']?.addEventListener('click', handleGeneratePdf);
        DOMElements['documents-tab']?.addEventListener('click', handleMasterDocumentUpload);
        DOMElements['payment-cert-tab']?.addEventListener('click', handlePaymentCertActions);
        
        // --- Design Studio Listeners ---
        const designView = DOMElements.designView;
        if (designView) {
            designView.querySelector('.tabs')?.addEventListener('click', handleDesignViewSwitch);
            DOMElements['design-project-selector'].addEventListener('change', () => {
                // Trigger view update based on the currently active tab
                const activeTab = designView.querySelector('.tabs .active');
                handleDesignViewSwitch({ target: activeTab });
            });
        }
        DOMElements['task-modal-close-btn']?.addEventListener('click', () => DOMElements['task-modal'].style.display = 'none');
        DOMElements['save-task-btn']?.addEventListener('click', handleTaskSave);
        
        // --- Project Editor Listeners ---
        const projectLettersTab = DOMElements['project-letters-tab'];
        if(projectLettersTab) {
            projectLettersTab.addEventListener('change', (e) => {
                if (e.target.id === 'project-letter-type') updateProjectLetterUI();
            });
            projectLettersTab.addEventListener('click', (e) => {
                if (e.target.id === 'generate-project-letter-btn') renderProjectLetterPreview();
            });
        }
    }

    function cacheDOMElements() {
        const ids = [
            'app-container', 'dashboard-view', 'project-view', 'office-view', 'resizer',
            'office-management-btn', 'back-to-main-dashboard-btn', 'new-project-btn', 'search-box', 'project-list-body', 'load-from-file-btn', 'save-to-file-btn', 
            'xml-file-input', 'load-site-update-btn', 'site-update-file-input', 'toggle-invoices-btn',
            'pending-invoices-summary', 'pending-invoices-count', 'pending-invoices-amount', 'last-paid-amount', 'on-hold-amount', 'expiring-documents-summary', 'expiring-documents-count',
            'back-to-dashboard-btn', 'save-project-btn', 'project-view-title', 'page-size-selector', 'generate-pdf-btn',
            'main-tab', 'scope-tab', 'fees-tab', 'invoicing-tab', 'documents-tab', 'payment-cert-tab', 'schedule-tab', 'tools-tab', 'project-letters-tab',
            'brief-proposal-preview', 'full-agreement-preview', 'assignment-order-preview', 'tax-invoice-preview', 'payment-certificate-preview', 'villa-schedule-preview', 'project-letter-preview', 'proforma-preview', 'receipt-preview',
            'project-letter-type', 'project-letter-authority', 'project-letter-dynamic-fields', 'generate-project-letter-btn',
            'jobNo', 'agreementDate', 'projectStatus', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn', 'projectDescription', 'plotNo', 'area', 'scopeOfWorkType', 'otherScopeType', 'otherScopeTypeContainer',
            'authority', 'otherAuthority', 'otherAuthorityContainer', 'projectType', 'builtUpArea', 'scope-selection-container', 'vatRate', 'remuneration-type-selector', 'lump-sum-group', 'lumpSumFee', 'percentage-group', 'constructionCostRate',
            'total-construction-cost-display', 'consultancyFeePercentage', 'designFeeSplit', 'supervisionFeeSplitDisplay', 'financial-summary-container', 'fee-milestone-group', 'supervision-billing-method-selector', 'prorata-percentage-group',
            'prorataPercentage', 'designDuration', 'constructionDuration', 'extendedSupervisionFee', 'notes-group', 'invoice-history-body', 'newInvoiceNo', 'milestone-billing-container', 'milestone-billing-body',
            'supervision-billing-monthly-container', 'supervision-monthly-info', 'bill-next-month-btn', 'supervision-billing-progress-container', 'supervision-progress-info', 'projectProgressInput', 'bill-by-progress-btn',
            'supervision-billing-extended-container', 'extended-supervision-info', 'bill-extended-month-btn', 'current-invoice-items-container', 'current-invoice-items-body', 'raise-invoice-btn',
            'payment-cert-no', 'generate-new-cert-btn', 'cert-history-body', 'calculateResourcesBtn', 'resourcePredictionOutput', 'generateQrCodeBtn', 'qr-code',
            'pending-invoice-modal', 'pending-modal-close-btn', 'pending-invoice-list', 'expiring-documents-modal', 'expiring-modal-close-btn', 'expiring-documents-list',
            'site-files-modal', 'site-files-modal-close-btn', 'site-files-modal-title', 'site-photos-gallery', 'site-docs-gallery',
            'file-preview-modal', 'file-modal-close', 'file-preview-container',
            // New Design Studio elements
            'design-view', 'design-studio-btn', 'back-to-dashboard-btn-from-design', 'design-project-selector', 'scrum-board-container', 'design-calendar-container',
            'task-modal', 'task-modal-close-btn', 'task-modal-title', 'task-modal-id', 'task-modal-jobno', 'task-modal-assignee', 'task-modal-duedate', 'task-modal-status', 'save-task-btn'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) DOMElements[id] = el;
        });
        DOMElements.controlTabs = document.querySelector('.control-tabs');
        DOMElements.previewTabs = document.querySelector('.preview-tabs');
    }

    function populateStaticControls() {
        const scopeContainer = DOMElements['scope-selection-container'];
        scopeContainer.innerHTML = '';
        const sectionTitles = { '1': '1. Study and Design Stage', '2': '2. Preliminary Design Stage', '3': '3. Final Stage', '4': '4. Tender Documents Stage', '5': '5. Supervision Works', '6': "6. Consultant's Duties", '8': '8. Principles of Calculation', '9': "9. The Owner's Obligations", '10': '10. Amendments', '11': '11. Extension of Completion' };
        for (const section in sectionTitles) {
            const details = document.createElement('details'); details.open = ['1', '2', '3'].includes(section);
            const summary = document.createElement('summary'); summary.dataset.sectionId = section; summary.textContent = sectionTitles[section]; details.appendChild(summary);
            const groupDiv = document.createElement('div'); groupDiv.className = 'checkbox-group';
            CONTENT.SCOPE_DEFINITIONS[section]?.forEach(item => {
                const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" id="scope-${item.id}" data-section="${section}"><span>${item.detailed.split('</b>')[0]}</b></span>`; groupDiv.appendChild(label);
                if (item.id === '3.2' && CONTENT.SCOPE_DEFINITIONS['3.2']) {
                    const subGroupDiv = document.createElement('div'); subGroupDiv.className = 'checkbox-group nested-group';
                    CONTENT.SCOPE_DEFINITIONS['3.2'].forEach(subItem => { const subLabel = document.createElement('label'); subLabel.innerHTML = `<input type="checkbox" id="scope-${subItem.id}" data-section="3.2"><span>${subItem.detailed.split('</b>')[0]}</b></span>`; subGroupDiv.appendChild(subLabel); });
                    groupDiv.appendChild(subGroupDiv);
                }
            });
            details.appendChild(groupDiv); scopeContainer.appendChild(details);
        }
        const feeContainer = DOMElements['fee-milestone-group']; feeContainer.innerHTML = '';
        CONTENT.FEE_MILESTONES.forEach(item => {
            const div = document.createElement('div'); div.className = 'milestone-percent-group'; div.innerHTML = `<span style="flex-grow:1;">${item.text}</span><input type="number" class="milestone-percentage-input" id="fee-perc-${item.id}" value="${item.defaultPercentage}" step="0.1" min="0"><span>%</span>`; feeContainer.appendChild(div);
        });
        const notesContainer = DOMElements['notes-group']; notesContainer.innerHTML = '';
        CONTENT.NOTES.forEach(item => { const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" id="${item.id}"><span>${item.text}</span>`; notesContainer.appendChild(label); });
    }
    
   // --- FIX IS HERE ---
    function populateControlTabs() {
        if(!DOMElements['main-tab']) return; // Guard clause

        DOMElements['main-tab'].innerHTML = `<h3>Project Info</h3><div class="input-group-grid"><div class="input-group"><label for="jobNo">Project ID / Job No.</label><input type="text" id="jobNo"></div><div class="input-group"><label for="agreementDate">Agreement Date</label><input type="date" id="agreementDate"></div></div><div class="input-group"><label for="projectStatus">Project Status</label><select id="projectStatus"><option>Pending</option><option>In Progress</option><option>Under Supervision</option><option>On Hold</option><option>Completed</option></select></div><h3>Client Details</h3><div class="input-group"><label for="clientName">Client's Name</label><input type="text" id="clientName"></div><div class="input-group-grid"><div class="input-group"><label for="clientMobile">Mobile No.</label><input type="text" id="clientMobile"></div><div class="input-group"><label for="clientEmail">Email Address</label><input type="email" id="clientEmail"></div></div><div class="input-group-grid"><div class="input-group"><label for="clientPOBox">Client P.O. Box</label><input type="text" id="clientPOBox"></div><div class="input-group"><label for="clientTrn">Client TRN</label><input type="text" id="clientTrn"></div></div><h3>Project Details</h3><div class="input-group"><label for="scopeOfWorkType">Scope of Work Type</label><select id="scopeOfWorkType"><option value="">-- Select --</option><option>New Construction</option><option>Modification</option><option>AOR Service</option><option>Extension</option><option>Interior Design</option><option>Other</option></select><div id="otherScopeTypeContainer" class="other-input-container"><input type="text" id="otherScopeType" placeholder="Specify Scope"></div></div><div class="input-group"><label for="authority">Authority</label><select id="authority"><option value="">-- Select --</option><option>DM</option><option>DDA</option><option>Trakhees</option><option>Dubai South</option><option>DCCM</option><option>JAFZA</option><option>Other</option></select><div id="otherAuthorityContainer" class="other-input-container"><input type="text" id="otherAuthority" placeholder="Specify Authority"></div></div><div class="input-group"><label for="projectType">Project Type</label><select id="projectType"><option value="">-- Select --</option><option>Residential Building</option><option>Commercial Building</option><option>Villa</option><option>Warehouse</option><option>Other</option></select></div><div class="input-group"><label for="projectDescription">Project Description</label><textarea id="projectDescription" rows="2"></textarea></div><div class="input-group-grid"><div class="input-group"><label for="plotNo">Plot No.</label><input type="text" id="plotNo"></div><div class="input-group"><label for="area">Area</label><input type="text" id="area"></div></div><div class="input-group"><label for="builtUpArea">Built-up Area (sq ft)</label><input type="number" id="builtUpArea" value="10000"></div>`;
        DOMElements['scope-tab'].innerHTML = `<h3>Scope of Work Selection</h3><div id="scope-selection-container"></div>`;
        DOMElements['fees-tab'].innerHTML = `<h3>Financials</h3><div class="input-group"><label for="vatRate">VAT Rate (%)</label><input type="number" id="vatRate" value="5" step="0.1"></div><hr><h3>Fee Calculation</h3><div class="input-group"><label>Remuneration Type</label><div id="remuneration-type-selector"><label><input type="radio" name="remunerationType" value="lumpSum"> Lumpsum</label><label><input type="radio" name="remunerationType" value="percentage" checked> Percentage</label></div></div><div id="lump-sum-group" class="input-group" style="display: none;"><label>Lumpsum Fee (AED)</label><input type="number" id="lumpSumFee" value="122500"></div><div id="percentage-group"><div class="input-group"><label for="constructionCostRate">Cost/sq ft (AED)</label><input type="number" id="constructionCostRate" value="350"></div><div class="input-group"><label>Est. Construction Cost</label><strong id="total-construction-cost-display">...</strong></div><div class="input-group"><label for="consultancyFeePercentage">Fee (%)</label><input type="number" id="consultancyFeePercentage" value="3.5" step="0.1"></div></div><h3>Fee Split</h3><div class="input-group-grid"><div class="input-group"><label for="designFeeSplit">Design Fee (%)</label><input type="number" id="designFeeSplit" value="60" step="1"></div><div class="input-group"><label>Supervision Fee (%)</label><strong id="supervisionFeeSplitDisplay">40%</strong></div></div><div id="financial-summary-container" class="financial-summary"></div><hr><h3>Design Fee Milestones</h3><div id="fee-milestone-group"></div><hr><h3>Supervision Fee</h3><div class="input-group"><label>Billing Method</label><div id="supervision-billing-method-selector"><label><input type="radio" name="supervisionBillingMethod" value="monthly" checked> Monthly</label><label><input type="radio" name="supervisionBillingMethod" value="progress"> Progress</label></div></div><div id="prorata-percentage-group" class="input-group" style="display:none;"><label for="prorataPercentage">Prorata (%)</label><input type="number" id="prorataPercentage" value="10" step="1"></div><h3>Timeline</h3><div class="input-group-grid"><div class="input-group"><label>Design (Months)</label><input type="number" id="designDuration" value="4"></div><div class="input-group"><label>Construction (Months)</label><input type="number" id="constructionDuration" value="14"></div></div><div class="input-group"><label>Extended Fee (AED/month)</label><input type="number" id="extendedSupervisionFee" value="7500"></div><h4>Notes & Exclusions</h4><div class="checkbox-group" id="notes-group"></div>`;
        DOMElements['invoicing-tab'].innerHTML = `<h3>Invoice History</h3><table class="output-table"><thead><tr><th>Inv No.</th><th>Date</th><th>Amount</th><th>Status</th><th>Payment Details</th><th>Cheque Details</th></tr></thead><tbody id="invoice-history-body"></tbody></table><hr><h3>Raise New Invoice</h3><div class="input-group"><label for="newInvoiceNo">New Invoice Number</label><input type="text" id="newInvoiceNo"></div><div id="milestone-billing-container"><h4>Design Milestones</h4><table class="output-table"><thead><tr><th>Bill</th><th>Milestone</th><th>Amount</th><th>Status</th></tr></thead><tbody id="milestone-billing-body"></tbody></table></div><div id="supervision-billing-monthly-container"><h4>Supervision Fee (Monthly)</h4><div id="supervision-monthly-info"></div><button id="bill-next-month-btn" class="secondary-button">+ Add Next Month</button></div><div id="supervision-billing-progress-container" style="display:none;"><h4>Supervision Fee (Progress)</h4><div id="supervision-progress-info"></div><div class="input-group"><label for="projectProgressInput">New Total Progress (%)</label><input type="number" id="projectProgressInput" min="0" max="100" step="0.1"></div><button id="bill-by-progress-btn" class="secondary-button">+ Add Progress Bill</button></div><div id="supervision-billing-extended-container"><h4>Extended Supervision</h4><div id="extended-supervision-info"></div><button id="bill-extended-month-btn" class="secondary-button">+ Add Extended Month</button></div><div id="current-invoice-items-container" style="margin-top:20px;"><h4>Items for this Invoice</h4><table class="output-table"><thead><tr><th>Description</th><th>Amount (AED)</th><th>Action</th></tr></thead><tbody id="current-invoice-items-body"></tbody></table></div><hr><button id="raise-invoice-btn" style="width:100%; padding: 12px; font-size: 16px;">Raise Invoice from Selected Items</button>`;
        const docCats = { client_details: { title: 'Client Details', types: ['Passport', 'Emirates_ID', 'Affection_Plan', 'Title_Deed', 'SPS', 'Oqood', 'DCR'] }, noc_copies: { title: 'NOC Copies', types: ['RTA', 'DEWA_Electrical', 'DEWA_Water', 'Du', 'Etisalat', 'Developer_NOC', 'Building_Permit', 'Other_NOC'] }, letters: { title: 'Project Letters', types: ['Incoming_Letter', 'Outgoing_Letter', 'Site_Memo'] }, other_uploads: { title: 'Other Uploads', types: ['Miscellaneous'] } };
        let documentsHtml = '<h3>Project Documents Management</h3>';
        for (const catKey in docCats) {
            const category = docCats[catKey];
            let optionsHtml = category.types.map(type => `<option value="${type.toLowerCase()}">${type.replace(/_/g, ' ')}</option>`).join('');
            documentsHtml += `<div class="document-category" id="doc-cat-${catKey}"><h4>${category.title}</h4><div class="upload-area"><select class="doc-type-select">${optionsHtml}</select><input type="file" class="doc-file-input" accept=".jpg,.jpeg,.png,.pdf" multiple><input type="date" class="expiry-date-input" title="Set document expiry date"><button type="button" class="upload-btn" data-category="${catKey}">Upload</button></div><div class="gallery-grid"><p>Please save the project first.</p></div></div>`;
        }
        DOMElements['documents-tab'].innerHTML = documentsHtml;
        DOMElements['payment-cert-tab'].innerHTML = `<h3>Payment Certificates</h3><p>Generate certificates based on the latest BOQ data from the site engineer.</p><div class="input-group"><label for="payment-cert-no">Next Certificate No.</label><input type="text" id="payment-cert-no"></div><button id="generate-new-cert-btn" class="primary-button" style="width: 100%; margin-bottom: 15px;">Generate New Certificate</button><hr><h4>Certificate History</h4><table class="output-table"><thead><tr><th>Cert. No.</th><th>Date</th><th>Net Payable</th><th>Action</th></tr></thead><tbody id="cert-history-body"></tbody></table>`;
        DOMElements['schedule-tab'].innerHTML = `<h3>Project Schedule</h3><p>A dynamic Gantt chart is generated in the preview area for projects of type "Villa" once the design and construction durations are set.</p>`;
        
        let authorityOptions = Object.keys(CONTENT.AUTHORITY_DETAILS).map(key => `<option value="${key}">${key}</option>`).join('');
        DOMElements['project-letters-tab'].innerHTML = `
            <h3>Generate Project Letter</h3>
            <div class="input-group">
                <label for="project-letter-type">Letter Type</label>
                <select id="project-letter-type">
                    <option value="">-- Select --</option>
                    <option value="scopeOfWork">Scope of Work Letter</option>
                    <option value="consultantAppointment">Consultant Appointment Letter</option>
                </select>
            </div>
            <div class="input-group">
                <label for="project-letter-authority">To Authority</label>
                <select id="project-letter-authority">
                    <option value="">-- Select --</option>
                    ${authorityOptions}
                </select>
            </div>
            <div id="project-letter-dynamic-fields"></div>
            <button id="generate-project-letter-btn" class="primary-button" style="width:100%; margin-top:15px;">Generate Preview</button>
        `;

        DOMElements['tools-tab'].innerHTML = `<h3>Resource Calculator</h3><button id="calculateResourcesBtn">Calculate Resources</button><div id="resourcePredictionOutput"></div><hr><h3>QR Code Generator</h3><button id="generateQrCodeBtn" class="secondary-button">Generate Project QR Code</button><div id="qr-code"></div>`;
        
        // --- THE FIX ---
        // Re-run cacheDOMElements AFTER the innerHTML has been set.
        cacheDOMElements(); // Re-cache elements after they are created
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
    
    main();
});