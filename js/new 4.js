document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONFIG ---
    let currentProjectJobNo = null;
    let DOMElements = {};
    let showAllInvoices = false;
	let staffList = [];
	let officeExpenses = [];
	let expenseChart = null;
    let analyticsChart = null;
    let currentEditingStaffId = null;
    const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(Math.round(num || 0));
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const toCamelCase = (str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
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
            cacheDOMElements(); // Cache once initially
            populateControlTabs();
            initResizer();
            populateStaticControls();
            await loadHRModuleContent(); // Load ALL HR & Office HTML content
            setupEventListeners();
            await renderDashboard();
        } catch (error) {
            console.error("Fatal Error initializing application:", error);
            document.body.innerHTML = `<div style='padding:40px; text-align:center; color:red;'><h2>Application Failed to Start</h2><p>Could not initialize the database. Please try clearing your browser's cache and site data for this page and try again.</p><p><i>Error: ${error.message}</i></p></div>`;
        }
    }

    // --- ============================ ---
    // --- CORE & PROJECT FUNCTIONS ---
    // --- ============================ ---

    function showDashboard() {
        currentProjectJobNo = null;
        DOMElements.dashboardView.classList.add('active');
        DOMElements.projectView.classList.remove('active');
		DOMElements.officeView.classList.remove('active');
        renderDashboard();
    }

    function showProjectView() {
        DOMElements.dashboardView.classList.remove('active');
        DOMElements.projectView.classList.add('active');
		DOMElements.officeView.classList.remove('active');
    }
    
    function showOfficeView() {
        DOMElements.dashboardView.classList.remove('active');
        DOMElements.projectView.classList.remove('active');
        DOMElements.officeView.classList.add('active');
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
    
    async function renderDashboard() {
        const allProjects = await DB.getAllProjects();
        const allSiteData = await DB.getAllSiteData();
        const siteDataMap = allSiteData.reduce((acc, data) => ({...acc, [data.jobNo]: data }), {});
        
        await updateDashboardSummary(allProjects);

        const tbody = DOMElements.projectListBody;
        tbody.innerHTML = '';
        if (allProjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No projects in database. Use "Import from File" to add projects.</td></tr>';
            return;
        }

        const searchTerm = DOMElements.searchBox.value.toLowerCase().trim();
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
        let totalPendingAmount = 0, pendingInvoiceCount = 0, totalOnHoldAmount = 0, lastPaidInvoice = null;
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

        DOMElements.pendingInvoicesCount.textContent = pendingInvoiceCount;
        DOMElements.pendingInvoicesAmount.textContent = `AED ${formatCurrency(totalPendingAmount)}`;
        DOMElements.lastPaidAmount.textContent = lastPaidInvoice ? `AED ${formatCurrency(lastPaidInvoice.amount)}` : 'N/A';
        DOMElements.onHoldAmount.textContent = `AED ${formatCurrency(totalOnHoldAmount)}`;
        const allMasterFiles = (await DB.getAllFiles()).filter(f => f.source === 'master');
        
        const expiringDocs = allMasterFiles.filter(file => {
            if (!file.expiryDate) return false;
            const expiry = new Date(file.expiryDate);
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);
            return expiry >= now && expiry <= thirtyDaysFromNow;
        });

        DOMElements.expiringDocumentsCount.textContent = expiringDocs.length;
    }

    async function showPendingInvoicesModal() {
        const allProjects = await DB.getAllProjects();
        const pendingInvoices = [];
        allProjects.forEach(p => {
            (p.invoices || []).forEach(inv => {
                if (inv.status === 'Raised' || inv.status === 'Pending') {
                    pendingInvoices.push({ ...inv, jobNo: p.jobNo, clientName: p.clientName, projectDescription: p.projectDescription });
                }
            });
        });
        const listEl = DOMElements.pendingInvoiceList;
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
        DOMElements.pendingInvoiceModal.style.display = 'flex';
    }

    async function showExpiringDocumentsModal() {
        const allProjects = await DB.getAllProjects();
        const allFiles = [];
        for (const project of allProjects) {
            const masterFiles = await DB.getFiles(project.jobNo, 'master');
            masterFiles.forEach(f => allFiles.push({ ...f, projectName: project.projectDescription || project.jobNo }));
        }
        
        const expiringDocs = allFiles.filter(file => {
            if (!file.expiryDate) return false;
            const expiry = new Date(file.expiryDate);
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);
            return expiry >= now && expiry <= thirtyDaysFromNow;
        });

        const listEl = DOMElements.expiringDocumentsList;
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
        DOMElements.expiringDocumentsModal.style.display = 'flex';
    }
    
    // ... (The rest of your Project Management functions remain here)
    
    // --- =============================== ---
    // --- HR & OFFICE MGMT. FUNCTIONS ---
    // --- =============================== ---

    async function loadHRModuleContent() {
        // This function dynamically creates the complete HTML for all HR view tabs.
        
        // Analytics Tab
        DOMElements.analyticsTab.innerHTML = `<div class="tool-card"><h3>Business Intelligence Overview</h3><div class="dashboard-summary-container" id="analytics-summary-container" style="justify-content: space-around;"></div><div style="height:400px; margin-top:30px;"><canvas id="analyticsChart"></canvas></div></div>`;

        // Staff List & Salaries
        DOMElements.staffListTab.innerHTML = `<div class="tool-card"><h3><span>Staff & Salary Overview</span><button id="add-staff-btn" class="primary-button">+ Add Staff</button></h3><div class="table-container"><table class="output-table"><thead><tr><th>Name</th><th>Role</th><th>Join Date</th><th style="text-align:right;">Gross Salary</th><th style="text-align:right;">Est. Gratuity</th><th>Actions</th></tr></thead><tbody id="staff-list-body"></tbody></table></div></div>`;

        // HR Letter Generation
        DOMElements.hrLetterGenerationTab.innerHTML = `<div class="hr-layout"><div class="form-card"><h3>Generate HR Letter</h3><div class="input-group"><label for="hr-letter-type-select">Type of Letter</label><select id="hr-letter-type-select"><option value="">-- Select --</option><option value="salary_certificate">Salary Certificate</option><option value="appreciation">Appreciation</option><option value="warning">Warning</option></select></div><div class="input-group"><label for="letter-staff-select">Select Staff</label><select id="letter-staff-select"></select></div><div id="dynamic-letter-fields"></div><button id="generate-hr-letter-preview-btn" class="primary-button" style="width:100%; margin-top: 20px;">Generate Preview</button></div><div class="tool-card"><h3><span>Letter Preview</span><button id="download-hr-letter-pdf-btn" class="secondary-button" style="display:none;">Download PDF</button></h3><div id="hr-letter-preview" class="letter-preview"><p style="text-align:center;color:#888;">Select a letter type to generate a preview.</p></div></div></div>`;

        // Reminders
        DOMElements.remindersTab.innerHTML = `<div class="tool-card"><h3>Upcoming Expirations & Due Dates (Next 60 Days)</h3><div id="reminder-list"></div></div>`;

        // Offer Letters
        DOMElements.offerLettersTab.innerHTML = `<div class="hr-layout"><div class="form-card"><h3>Create Offer Letter</h3><div class="input-group"><label>Candidate Name</label><input type="text" id="candidateName"></div><div class="input-group"><label>Position Offered</label><input type="text" id="candidateRole"></div><div class="input-group"><label>Offered Gross Salary</label><input type="number" id="offeredSalary"></div><div class="input-group"><label>Intended Join Date</label><input type="date" id="joinDate"></div><button id="generate-offer-letter-btn" class="primary-button" style="width:100%; margin-top: 20px;">Generate Preview</button></div><div class="tool-card"><h3>Offer Letter Preview</h3><div id="offer-letter-preview" class="letter-preview"></div></div></div>`;

        // Annual Leaves
        DOMElements.leaveManagementTab.innerHTML = `<div class="tool-card"><h3>Log New Leave</h3><div class="input-group-grid" style="grid-template-columns: 2fr 1fr 1fr 1fr auto; align-items:flex-end; gap:15px;"><div class="input-group"><label>Staff Member</label><select id="leaveStaffSelect"></select></div><div class="input-group"><label>Leave Type</label><select id="leaveType"><option>Annual</option><option>Sick</option><option>Unpaid</option><option>Emergency</option></select></div><div class="input-group"><label>Start Date</label><input type="date" id="leaveStartDate"></div><div class="input-group"><label>End Date</label><input type="date" id="leaveEndDate"></div><button id="add-leave-btn" class="primary-button">Log Leave</button></div></div><div class="tool-card"><h3>Leave History</h3><table class="output-table"><thead><tr><th>Staff</th><th>Type</th><th>Start Date</th><th>End Date</th><th>Days</th><th>Balance Left</th></tr></thead><tbody id="leave-log-body"></tbody></table></div>`;

        // Office Expense Log
        DOMElements.expenseLogTab.innerHTML = `<div class="hr-layout" style="grid-template-columns: 1fr 1.5fr;"><div class="tool-card"><h3 style="margin-bottom: 15px;">Log New Expense</h3><div class="form-card"><div class="input-group"><label>Date</label><input type="date" id="expenseDate"></div><div class="input-group"><label>Category</label><select id="expenseCategory"><option>Office Supplies</option><option>Utilities</option><option>Marketing</option><option>Transportation</option><option>Miscellaneous</option></select></div><div class="input-group"><label>Description</label><input type="text" id="expenseDescription"></div><div class="input-group"><label>Amount</label><input type="number" id="expenseAmount"></div><button id="add-expense-btn" class="primary-button" style="width:100%;margin-top:10px;">Add Expense</button></div></div><div class="tool-card"><h3>Expense History</h3><div id="expense-filter-container" class="tabs" style="margin-bottom:15px;"><button class="secondary-button active" data-period="1">Last Month</button><button class="secondary-button" data-period="3">Last 3 Months</button><button class="secondary-button" data-period="6">Last 6 Months</button></div><div style="height:250px; margin-bottom:20px;"><canvas id="expenseChart"></canvas></div><table class="output-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th style="text-align:right;">Amount</th></tr></thead><tbody id="expense-log-body"></tbody></table></div></div>`;
        
        // Annual Expenses
        DOMElements.annualExpensesTab.innerHTML = `<div class="tool-card"><h3>Add New Annual Expense</h3><div class="input-group-grid" style="grid-template-columns: 2fr 1fr 1fr auto; align-items:flex-end; gap:15px;"><div class="input-group"><label>Expense Item (e.g., Trade License)</label><input type="text" id="annualExpenseItem"></div><div class="input-group"><label>Amount (AED)</label><input type="number" id="annualExpenseAmount"></div><div class="input-group"><label>Next Due Date</label><input type="date" id="annualExpenseDueDate"></div><button id="add-annual-expense-btn" class="primary-button">Add Annual Expense</button></div></div><div class="tool-card"><h3>Tracked Annual Expenses</h3><table class="output-table"><thead><tr><th>Item</th><th style="text-align:right;">Amount</th><th>Next Due Date</th><th>Action</th></tr></thead><tbody id="annual-expense-body"></tbody></table></div>`;

        // Staff Increments
        DOMElements.incrementsTab.innerHTML = `<div class="tool-card"><h3>Record New Increment</h3><div class="input-group-grid" style="grid-template-columns: 2fr 1fr 1fr auto; align-items:flex-end; gap:15px;"><div class="input-group"><label>Staff Member</label><select id="incrementStaffSelect"></select></div><div class="input-group"><label>Increment Amount (AED)</label><input type="number" id="incrementAmount"></div><div class="input-group"><label>Effective Date</label><input type="date" id="incrementDate"></div><button id="add-increment-btn" class="primary-button">Record Increment</button></div></div><div class="tool-card"><h3>Increment History</h3><table class="output-table"><thead><tr><th>Staff</th><th>Date</th><th style="text-align:right;">Old Salary</th><th style="text-align:right;">Increment</th><th style="text-align:right;">New Salary</th></tr></thead><tbody id="increment-log-body"></tbody></table></div>`;

        // Staff Modal Body
        DOMElements.staffModalBody.innerHTML = `<div class="hr-layout"><div class="form-card"><img id="staff-photo-preview" src="placeholder.jpg" alt="Staff Photo" class="staff-photo-preview"/><div class="input-group"><label>Update Photo</label><input type="file" id="staff-photo-upload" accept="image/*"></div><div class="input-group"><label>Update Passport</label><input type="file" id="staff-passport-upload" accept="image/*,application/pdf"><a id="staff-passport-link" href="#" target="_blank" style="display:none;">View Current</a></div></div><div><div class="input-group-grid" style="grid-template-columns:1fr 1fr;"><div class="input-group"><label>Name</label><input type="text" id="modal-staff-name"></div><div class="input-group"><label>Role</label><input type="text" id="modal-staff-role"></div><div class="input-group"><label>Email</label><input type="email" id="modal-staff-email"></div><div class="input-group"><label>Date of Birth</label><input type="date" id="modal-staff-dob"></div><div class="input-group"><label>Phone No.</label><input type="text" id="modal-staff-phone"></div><div class="input-group"><label>Emirates ID</label><input type="text" id="modal-staff-eid"></div><div class="input-group"><label>Join Date</label><input type="date" id="modal-staff-join-date"></div><div class="input-group"><label>Gross Salary</label><input type="number" id="modal-staff-salary"><span id="modal-basic-salary" class="basic-salary-display"></span></div></div><div class="input-group"><label>Address</label><textarea id="modal-staff-address" rows="2"></textarea></div><div class="input-group-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;"><div class="input-group"><label>Visa Expiry</label><input type="date" id="modal-visa-expiry"></div><div class="input-group"><label>S.O.E. Expiry</label><input type="date" id="modal-soe-expiry"></div><div class="input-group"><label>License Expiry</label><input type="date" id="modal-license-expiry"></div><div class="input-group"><label>Health Card Expiry</label><input type="date" id="modal-health-expiry"></div></div></div></div><hr><h4>Staff Loans</h4><div class="input-group-grid" style="grid-template-columns:1fr 1fr 2fr auto;align-items:flex-end;"><div class="input-group"><label>Loan Amount</label><input type="number" id="modal-loan-amount"></div><div class="input-group"><label>Date</label><input type="date" id="modal-loan-date"></div><div class="input-group"><label>Description</label><input type="text" id="modal-loan-description"></div><button id="add-loan-btn" class="secondary-button">Add Loan</button></div><table class="output-table"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody id="modal-loan-history"></tbody></table><div style="text-align:right; margin-top:20px;"><button id="delete-staff-btn" class="danger-button" style="display:none;float:left;">Delete Staff Member</button><button id="save-staff-details-btn" class="primary-button">Save Changes</button></div>`;

        // Re-cache all elements, including the ones just created.
        cacheDOMElements();
    }
	
	 async function refreshHRDataAndRender() {
        staffList = await DB.getAllHRData() || [];
        officeExpenses = await DB.getOfficeExpenses() || [];
        
        if (staffList.length === 0 && (await DB.getAllHRData()).length === 0) { 
            console.log("HR_DATA store is empty. Seeding initial staff data...");
            const initialStaff = [{ name: 'Faisal M.', role: 'Architect', joinDate: '2022-01-15', grossSalary: 13000, leaveBalance: 30, loans: [] }, { name: 'Adnan K.', role: 'Architect', joinDate: '2022-02-01', grossSalary: 13000, leaveBalance: 30, loans: [] }];
            for (const staff of initialStaff) { await DB.addHRData(staff); }
            staffList = await DB.getAllHRData();
        }

        renderStaffList();
        renderReminders();
        populateHRSelects();
        renderLeaveLog();
        renderIncrementLog();
        renderAnnualExpenseList();
        renderExpenseLog(1); 
        renderAnalyticsTab(); // Render the new analytics tab
    }
    
    // ... (All other HR functions from the previous version go here, unchanged) ...
    
    // --- ============================ ---
    // --- BUSINESS ANALYTICS FUNCTIONS ---
    // --- ============================ ---
    async function renderAnalyticsTab() {
        // ... (This function remains the same)
    }

    // --- ========================== ---
    // --- INITIALIZATION & LISTENERS ---
    // --- ========================== ---

    function setupEventListeners() {
        // --- Main Navigation & Dashboard Controls ---
        DOMElements.officeManagementBtn?.addEventListener('click', showOfficeView);
        DOMElements.backToMainDashboardBtn?.addEventListener('click', showDashboard);
        DOMElements.loadFromFileBtn?.addEventListener('click', () => DOMElements.xmlFileInput?.click());
        DOMElements.xmlFileInput?.addEventListener('change', handleProjectFileImport);
        DOMElements.loadSiteUpdateBtn?.addEventListener('click', () => DOMElements.siteUpdateFileInput?.click());
        DOMElements.siteUpdateFileInput?.addEventListener('change', handleSiteUpdateImport);
        DOMElements.saveToFileBtn?.addEventListener('click', handleFileExport);
        DOMElements.newProjectBtn?.addEventListener('click', handleNewProject);
        DOMElements.searchBox?.addEventListener('input', renderDashboard);

        DOMElements.toggleInvoicesBtn?.addEventListener('click', () => {
            showAllInvoices = !showAllInvoices;
            const btn = DOMElements.toggleInvoicesBtn;
            if (btn) btn.textContent = showAllInvoices ? 'Show Pending Invoices' : 'Show All Invoices';
            renderDashboard();
        });

        // --- Event Delegation for Project List ---
        DOMElements.projectListBody?.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row?.dataset?.jobNo) return;
            if (e.target.matches('.edit-btn')) handleEditProject(row.dataset.jobNo);
            if (e.target.matches('.view-site-files-btn')) showSiteFilesModal(row.dataset.jobNo);
        });

        // --- Modals and Summaries ---
        DOMElements.pendingInvoicesSummary?.addEventListener('click', showPendingInvoicesModal);
        DOMElements.expiringDocumentsSummary?.addEventListener('click', showExpiringDocumentsModal);
        DOMElements.pendingModalCloseBtn?.addEventListener('click', () => DOMElements.pendingInvoiceModal.style.display = 'none');
        DOMElements.expiringModalCloseBtn?.addEventListener('click', () => DOMElements.expiringDocumentsModal.style.display = 'none');
        DOMElements.siteFilesModalCloseBtn?.addEventListener('click', () => DOMElements.siteFilesModal.style.display = 'none');
        
        // --- Project Editor View ---
        DOMElements.backToDashboardBtn?.addEventListener('click', showDashboard);
        DOMElements.saveProjectBtn?.addEventListener('click', saveCurrentProject);
        DOMElements.controlTabs?.addEventListener('click', handleTabSwitch);
        DOMElements.previewTabs?.addEventListener('click', handleTabSwitch);
        DOMElements.generatePdfBtn?.addEventListener('click', handleGeneratePdf);
        DOMElements.documentsTab?.addEventListener('click', handleMasterDocumentUpload);
        DOMElements.paymentCertTab?.addEventListener('click', handlePaymentCertActions);
        
        // ... (Event listeners for project fees, invoicing, tools) ...

        // --- HR & Office Management View (Event Delegation on Parent View)---
        // --- FIX #2: Correctly access DOMElements.officeView ---
        const officeView = DOMElements.officeView; 
        if (officeView) {
            officeView.addEventListener('click', (e) => {
                if (e.target.matches('#back-to-main-dashboard-btn')) showDashboard();
                if (e.target.matches('.tab-button') && e.target.closest('#hr-tabs')) handleHRTabSwitch(e);
                if (e.target.matches('#add-staff-btn')) showStaffDetailsModal();
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

        // --- HR Staff Modal (Event Delegation on Modal Parent) ---
        const staffModal = DOMElements.staffDetailsModal;
        if (staffModal) {
            staffModal.addEventListener('click', (e) => {
                if (e.target.matches('#save-staff-details-btn')) handleStaffDetailsSave();
                if (e.target.matches('#delete-staff-btn')) handleDeleteStaff();
                if (e.target.matches('.loan-status-btn')) handleLoanActions(e);
                if (e.target.matches('#add-loan-btn')) handleAddLoan();
                if (e.target.matches('#staff-details-modal-close-btn')) staffModal.style.display = 'none';
            });
        }
    }

    function cacheDOMElements() {
        const ids = [
            'app-container', 'dashboard-view', 'project-view', 'office-view', 'resizer',
            'new-project-btn', 'search-box', 'project-list-body', 'load-from-file-btn', 'save-to-file-btn', 
            'xml-file-input', 'load-site-update-btn', 'site-update-file-input', 'toggle-invoices-btn',
            'pending-invoices-summary', 'pending-invoices-count', 'pending-invoices-amount', 'last-paid-amount', 'on-hold-amount',
            'expiring-documents-summary', 'expiring-documents-count',
            'back-to-dashboard-btn', 'save-project-btn', 'project-view-title', 'page-size-selector', 'generate-pdf-btn',
            'main-tab', 'scope-tab', 'fees-tab', 'invoicing-tab', 'documents-tab', 'payment-cert-tab', 'tools-tab', 'project-letters-tab',
            'brief-proposal-preview', 'full-agreement-preview', 'assignment-order-preview', 'tax-invoice-preview', 
            'payment-certificate-preview', 'project-letter-preview', 'proforma-preview', 'receipt-preview',
            'hr-tabs', 'analytics-tab', 'analytics-summary-container', 'analyticsChart',
            'staff-list-tab', 'hr-letter-generation-tab', 'reminders-tab', 'offer-letters-tab',
            'leave-management-tab', 'expense-log-tab', 'annual-expenses-tab', 'increments-tab',
            'jobNo', 'agreementDate', 'projectStatus', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn',
            'projectDescription', 'plotNo', 'area', 'scopeOfWorkType', 'otherScopeType', 'otherScopeTypeContainer',
            'authority', 'otherAuthority', 'otherAuthorityContainer', 'projectType', 'builtUpArea',
            'scope-selection-container', 'vatRate', 'remuneration-type-selector', 'lump-sum-group', 'lumpSumFee', 'percentage-group', 'constructionCostRate',
            'total-construction-cost-display', 'consultancyFeePercentage', 'designFeeSplit', 'supervisionFeeSplitDisplay',
            'financial-summary-container', 'fee-milestone-group', 'supervision-billing-method-selector', 'prorata-percentage-group',
            'prorataPercentage', 'designDuration', 'constructionDuration', 'extendedSupervisionFee', 'notes-group',
            'invoice-history-body', 'newInvoiceNo', 'milestone-billing-container', 'milestone-billing-body',
            'supervision-billing-monthly-container', 'supervision-monthly-info', 'bill-next-month-btn',
            'supervision-billing-progress-container', 'supervision-progress-info', 'projectProgressInput', 'bill-by-progress-btn',
            'supervision-billing-extended-container', 'extended-supervision-info', 'bill-extended-month-btn',
            'current-invoice-items-container', 'current-invoice-items-body', 'raise-invoice-btn',
            'payment-cert-no', 'generate-new-cert-btn', 'cert-history-body', 'calculateResourcesBtn', 'resourcePredictionOutput', 'generateQrCodeBtn', 'qr-code',
            'add-staff-btn', 'staff-list-body', 'hr-letter-type-select', 'letter-staff-select', 'dynamic-letter-fields', 'generate-hr-letter-preview-btn',
            'hr-letter-preview', 'download-hr-letter-pdf-btn', 'reminder-list', 'candidateName', 'candidateRole', 'offeredSalary', 'joinDate', 'generate-offer-letter-btn', 'offer-letter-preview',
            'leaveStaffSelect', 'leaveType', 'leaveStartDate', 'leaveEndDate', 'add-leave-btn', 'leave-log-body', 'expenseDate', 'expenseCategory', 'expenseDescription', 'expenseAmount', 'add-expense-btn', 
            'expense-filter-container', 'expenseChart', 'expense-log-body', 'annualExpenseItem', 'annualExpenseAmount', 'annualExpenseDueDate', 'add-annual-expense-btn', 'annual-expense-body',
            'incrementStaffSelect', 'incrementAmount', 'incrementDate', 'add-increment-btn', 'increment-log-body',
            'pending-invoice-modal', 'pending-modal-close-btn', 'pending-invoice-list', 'expiring-documents-modal', 'expiring-modal-close-btn', 'expiring-documents-list',
            'site-files-modal', 'site-files-modal-close-btn', 'site-files-modal-title', 'site-photos-gallery', 'site-docs-gallery',
            'file-preview-modal', 'file-modal-close', 'file-preview-container', 'staff-details-modal', 'staff-details-modal-close-btn', 'staff-modal-title', 'staff-modal-body',
            'staff-photo-preview', 'staff-photo-upload', 'staff-passport-upload', 'staff-passport-link',
            'modal-staff-name', 'modal-staff-role', 'modal-staff-email', 'modal-staff-dob', 'modal-staff-phone',
            'modal-staff-eid', 'modal-staff-join-date', 'modal-staff-salary', 'modal-basic-salary', 'modal-staff-address',
            'modal-visa-expiry', 'modal-soe-expiry', 'modal-license-expiry', 'modal-health-expiry',
            'modal-loan-amount', 'modal-loan-date', 'modal-loan-description', 'add-loan-btn', 'modal-loan-history',
            'delete-staff-btn', 'save-staff-details-btn'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) DOMElements[toCamelCase(id)] = el;
        });
        DOMElements.controlTabs = document.querySelector('.control-tabs');
        DOMElements.previewTabs = document.querySelector('.preview-tabs');
    }

    function populateStaticControls() {
        const scopeContainer = DOMElements.scopeSelectionContainer;
        if (!scopeContainer) return;
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
        const feeContainer = DOMElements.feeMilestoneGroup; 
        if (!feeContainer) return;
        feeContainer.innerHTML = '';
        CONTENT.FEE_MILESTONES.forEach(item => {
            const div = document.createElement('div'); div.className = 'milestone-percent-group'; div.innerHTML = `<span style="flex-grow:1;">${item.text}</span><input type="number" class="milestone-percentage-input" id="fee-perc-${item.id}" value="${item.defaultPercentage}" step="0.1" min="0"><span>%</span>`; feeContainer.appendChild(div);
        });
        const notesContainer = DOMElements.notesGroup; 
        if (!notesContainer) return;
        notesContainer.innerHTML = '';
        CONTENT.NOTES.forEach(item => { const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" id="${item.id}"><span>${item.text}</span>`; notesContainer.appendChild(label); });
    }
    
    // --- FIX #1: Corrected handleTabSwitch function ---
    function handleTabSwitch(event) {
        if (!event.target.matches('.tab-button')) return;
        
        const button = event.target;
        const tabsContainer = button.parentElement;
        const tabId = button.dataset.tab;

        tabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const isControlTab = tabsContainer.classList.contains('control-tabs');
        const contentSelector = isControlTab ? '.tab-content' : '.preview-tab-content';
        const parentContainer = isControlTab ? DOMElements.projectView.querySelector('.controls') : DOMElements.projectView.querySelector('.preview-area');

        parentContainer.querySelectorAll(contentSelector).forEach(panel => panel.classList.remove('active'));
        
        const panelIdToShow = isControlTab ? `${tabId}-tab` : tabId;
        const activePanel = document.getElementById(panelIdToShow);
        
        if (activePanel) {
            activePanel.classList.add('active');
        }
    }

    function initResizer() {
        if(!DOMElements.resizer) return;
        const resizer = DOMElements.resizer; const container = resizer.parentElement; const leftPanel = container.querySelector('.controls');
        let isResizing = false, startX, startWidth;
        resizer.addEventListener('mousedown', (e) => { e.preventDefault(); isResizing = true; startX = e.clientX; startWidth = leftPanel.offsetWidth; container.classList.add('is-resizing'); document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', stopResize); });
        function handleMouseMove(e) { if (!isResizing) return; const newWidth = startWidth + (e.clientX - startX); if (newWidth > 300 && newWidth < (container.offsetWidth - 300)) { leftPanel.style.width = newWidth + 'px'; } }
        function stopResize() { isResizing = false; container.classList.remove('is-resizing'); document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', stopResize); 
		}
    }
    
    main();
});