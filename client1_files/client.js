
// --- START OF client.js (Updated with 3D Progress Concept) ---

document.addEventListener('DOMContentLoaded', async () => {
    // --- CONSTANTS ---
    const VILLA_SCHEDULE_TEMPLATE = [
        // ... (Schedule remains the same) ...
        { id: 1, name: 'MOBILIZATION', startOffset: 0, duration: 62, dependencies: [] },
        { id: 2, name: 'SHORING WORKS', startOffset: 31, duration: 19, dependencies: [1] },
        { id: 3, name: 'EXCAVATION WORK', startOffset: 51, duration: 27, dependencies: [2] },
        { id: 4, name: 'COMPACTION & PCC', startOffset: 62, duration: 31, dependencies: [3] },
        { id: 5, name: 'WATER-PROOFING', startOffset: 71, duration: 130, dependencies: [4] },
        { id: 6, name: 'SUB-STRUCTURE', startOffset: 109, duration: 140, dependencies: [5] },
        { id: 8, name: 'FIRST FLOOR SLAB', startOffset: 213, duration: 45, dependencies: [6] },
        { id: 18, name: 'BLOCK WORK', startOffset: 204, duration: 189, dependencies: [8] },
        { id: 9, name: 'ROOF SLAB WORKS', startOffset: 259, duration: 46, dependencies: [18] },
        { id: 10, name: 'UPPER ROOF SLAB', startOffset: 342, duration: 23, dependencies: [9] },
        { id: 7, name: 'B/WALL WORKS', startOffset: 385, duration: 74, dependencies: [10] },
        { id: 11, name: 'STEEL STAIRCASE', startOffset: 339, duration: 18, dependencies: [10] },
        { id: 12, name: 'PLUMBING/DRAINAGE', startOffset: 111, duration: 453, dependencies: [6] },
        { id: 13, name: 'WATER TANK', startOffset: 461, duration: 19, dependencies: [10] },
        { id: 14, name: 'ELECTRICAL WORKS', startOffset: 62, duration: 483, dependencies: [6] },
        { id: 17, name: 'FIRE FIGHTING', startOffset: 181, duration: 401, dependencies: [6] },
        { id: 19, name: 'PLASTERING', startOffset: 262, duration: 117, dependencies: [9, 18] },
        { id: 23, name: 'ALUMINIUM WORK', startOffset: 339, duration: 207, dependencies: [19] },
        { id: 22, name: 'EXTERNAL FINISHES', startOffset: 375, duration: 113, dependencies: [19, 7] },
        { id: 20, name: 'GYPSUM CEILING', startOffset: 364, duration: 137, dependencies: [19] },
        { id: 16, name: 'AC WORK', startOffset: 405, duration: 138, dependencies: [20] },
        { id: 21, name: 'INTERNAL FINISHES', startOffset: 410, duration: 127, dependencies: [20] },
        { id: 15, name: 'INTERCOM/CCTV', startOffset: 492, duration: 27, dependencies: [21] },
        { id: 24, name: 'LIFT WORK', startOffset: 436, duration: 142, dependencies: [10] },
        { id: 25, name: 'JOINERY WORK', startOffset: 426, duration: 65, dependencies: [21] },
        { id: 26, name: 'SWIMMING POOL', startOffset: 461, duration: 54, dependencies: [10] },
        { id: 27, name: 'LANDSCAPE WORK', startOffset: 466, duration: 111, dependencies: [22, 26] },
        { id: 28, name: 'MAIN GATE WORK', startOffset: 507, duration: 61, dependencies: [7, 22] },
        { id: 29, name: 'SNAGGING', startOffset: 565, duration: 7, dependencies: [21, 22, 23, 24, 25, 27, 28] },
        { id: 30, name: 'AUTHORITY INSPECTION', startOffset: 572, duration: 5, dependencies: [29] },
    ];

    // MAPPING SCHEDULE TASKS (ID) TO VISUAL 3D COMPONENTS (Placeholder: Key/Color)
    const VISUAL_MODEL_MAP = {
        1: { component: 'SITE_MOBILIZATION', color: '#FFD700' }, // Gold for early site prep
        3: { component: 'EXCAVATION_TRENCHES', color: '#8B4513' }, // Brown for earthwork
        6: { component: 'SUBSTRUCTURE_BASE', color: '#A9A9A9' }, // Dark Gray for concrete base
        8: { component: 'SLAB_G1', color: '#B0C4DE' }, // LightSteelBlue for slab
        18: { component: 'BLOCKWORK_LEVEL1', color: '#FFFFFF' }, // White/Light for blockwork
        9: { component: 'SLAB_ROOF', color: '#ADD8E6' }, // Light Blue for roof slab
        19: { component: 'PLASTERING_INT', color: '#F0F8FF' }, // AliceBlue for internal plaster
        21: { component: 'INTERNAL_FINISHES', color: '#E6E6FA' }, // Lavender for interior fitout
        22: { component: 'EXTERNAL_CLADDING', color: '#D2B48C' }, // Tan for external finish
        29: { component: 'SNAGGING_ELEMENT', color: '#FF6347' } // Tomato for snagging elements
        // Add mapping for all relevant tasks
    };

    const SITE_FORM_TEMPLATES = {
        // ... (Existing templates remain) ...
        printableMinutesOfMeeting: (momData, projectData) => { /* ... */ },
        previewMinutesOfMeeting: (momData, projectData) => { /* ... */ }
    };

    // --- STATE ---
    let currentJobNo = null;
    let calendarDate = new Date();

     // --- DOM CACHE ---
    const DOMElements = {
        loadDataBtn: document.getElementById('load-data-btn'),
        saveDataBtn: document.getElementById('save-data-btn'),
        importLeaveBtn: document.getElementById('import-leave-btn'),
        projectFileInput: document.getElementById('project-file-input'),
        leaveFileInput: document.getElementById('leave-file-input'),
        projectListBody: document.getElementById('project-list-body'),
        detailsView: document.getElementById('project-details-view'),
        detailsProjectName: document.getElementById('details-project-name'),
        detailsProjectInfo: document.getElementById('details-project-info'),
        backToGlobalBtn: document.getElementById('back-to-global-btn'),
        controlTabsContainer: document.getElementById('control-tabs-container'),
        siteStatusSelect: document.getElementById('site-status-select'),
        photoUploadInput: document.getElementById('photo-upload-input'),
        photoGallery: document.getElementById('photo-gallery'),
        docUploadInput: document.getElementById('doc-upload-input'),
        siteDocGallery: document.getElementById('site-doc-gallery'),
        projectDocsGallery: document.getElementById('project-docs-gallery'),
        tenderDocsGallery: document.getElementById('tender-docs-gallery'),
        vendorListsGallery: document.getElementById('vendor-lists-gallery'),
        docNameInput: document.getElementById('doc-name-input'),
        formModal: document.getElementById('form-modal'),
        formModalCloseBtn: document.getElementById('form-modal-close-btn'),
        formModalTitle: document.getElementById('form-modal-title'),
        formModalBody: document.getElementById('form-modal-body'),
        formModalFooter: document.getElementById('form-modal-footer'),
        formsTab: document.getElementById('forms-tab'),
        saveFormPdfBtn: document.getElementById('save-form-pdf-btn'),
        boqTableBody: document.getElementById('boq-table-body'),
        boqTotalValue: document.getElementById('boq-total-value'),
        boqWorkDoneValue: document.getElementById('boq-work-done-value'),
        boqProgressBar: document.getElementById('boq-progress-bar'),
        boqProgressPercentage: document.getElementById('boq-progress-percentage'),
        generatePaymentCertBtn: document.getElementById('generate-payment-cert-btn'),
        addBoqItemBtn: document.getElementById('add-boq-item-btn'),
        newMomBtn: document.getElementById('new-mom-btn'),
        momList: document.getElementById('mom-list'),
        momModal: document.getElementById('mom-modal'),
        momModalCloseBtn: document.getElementById('mom-modal-close-btn'),
        momModalTitle: document.getElementById('mom-modal-title'),
        momEditIndex: document.getElementById('mom-edit-index'),
        momRef: document.getElementById('mom-ref'),
        momDate: document.getElementById('mom-date'),
        momLocation: document.getElementById('mom-location'),
        momAttendeesTbody: document.getElementById('mom-attendees-tbody'),
        addAttendeeBtn: document.getElementById('add-attendee-btn'),
        momStatusSummary: document.getElementById('mom-status-summary'),
        momActionsTbody: document.getElementById('mom-actions-tbody'),
        addActionBtn: document.getElementById('add-action-btn'),
        momNextMeeting: document.getElementById('mom-next-meeting'),
        momNextMeetingNotes: document.getElementById('mom-next-meeting-notes'),
        saveMomDataBtn: document.getElementById('save-mom-data-btn'),
        deleteMomBtn: document.getElementById('delete-mom-btn'),
        calendarGridBody: document.getElementById('calendar-grid-body'),
        monthYearDisplay: document.getElementById('month-year-display'),
        prevMonthBtn: document.getElementById('prev-month-btn'),
        nextMonthBtn: document.getElementById('next-month-btn'),
        resourceCalculatorBody: document.getElementById('resource-calculator-body'),
        resourceDayRate: document.getElementById('resource-day-rate'),
        generateProjectReportBtn: document.getElementById('generate-project-report-btn'),
        holidayCountrySelect: document.getElementById('holiday-country-select'),
        loadHolidaysBtn: document.getElementById('load-holidays-btn'),
        vendorSearchInput: document.getElementById('vendor-search-input'),
        vendorSearchResults: document.getElementById('vendor-search-results'),
        momPreviewModal: document.getElementById('mom-preview-modal'),
        momPreviewModalCloseBtn: document.getElementById('mom-preview-modal-close-btn'),
        momPreviewModalTitle: document.getElementById('mom-preview-modal-title'),
        momPreviewModalBody: document.getElementById('mom-preview-modal-body'),
        momPreviewModalFooter: document.getElementById('mom-preview-modal-footer'),
        
        // NEW ELEMENTS ADDED (Referencing the HTML setup)
        newMaterialSubmittalBtn: document.getElementById('new-material-submittal-btn'),
        materialApprovalList: document.getElementById('material-approval-list'),
        addSubcontractorBtn: document.getElementById('add-subcontractor-btn'),
        subcontractorList: document.getElementById('subcontractor-list'),
        longLeadTableBody: document.getElementById('long-lead-table-body'),
        newRfiBtn: document.getElementById('new-rfi-btn'),
        rfiLogList: document.getElementById('rfi-log-list'),
        nocTracker: document.getElementById('noc-tracker'),
        bulletinSubject: document.getElementById('bulletin-subject'),
        bulletinDetails: document.getElementById('bulletin-details'),
        bulletinAssignedTo: document.getElementById('bulletin-assigned-to'),
        postBulletinBtn: document.getElementById('post-bulletin-btn'),
        bulletinFeed: document.getElementById('bulletin-feed'),
        downloadProjectZipBtn: document.getElementById('download-project-zip-btn'),
        
        // NEW ELEMENTS FOR NEW TABS
        snagListBody: document.getElementById('snag-list-body'),
        paymentSummary: document.getElementById('payment-summary'),
        directoryList: document.getElementById('directory-list'),
        visualProgressContainer: document.getElementById('visual-progress-container'),
        inventoryListBody: document.getElementById('inventory-list-body'),
        budgetTableBody: document.getElementById('budget-table-body'),
    };
    // --- INITIALIZATION ---
    async function main() {
        try {
            await DB.init();
            setupEventListeners();
            await populateHolidayCountries();
            await renderProjectList();
            showGlobalView();
        } catch (error) {
            console.error("Fatal Error initializing Site App:", error);
            document.body.innerHTML = `<div style='padding:20px; text-align:center; color:red;'><h2>Application Failed to Start</h2><p>Could not initialize the database. Please clear your cache and try again.</p><p><i>Error: ${error.message}</i></p></div>`;
        }
    }
    
    // --- HELPER & UTILITY FUNCTIONS ---
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    function getProjectColor(jobNo) {
        const colors = ['#e6194B', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9'];
        let hash = 0;
        for (let i = 0; i < jobNo.length; i++) {
            hash = jobNo.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash % colors.length)];
    }
    
    // --- UI VIEW & STATE MANAGEMENT ---
    function showGlobalView() {
        currentJobNo = null;
        DOMElements.detailsProjectName.textContent = "All Projects Calendar";
        DOMElements.detailsProjectInfo.textContent = "Showing a combined view of all project events.";
        DOMElements.backToGlobalBtn.style.display = 'none';
        document.querySelectorAll('#project-list-body tr').forEach(r => r.classList.remove('selected'));
        toggleTabsForView(false);
        renderCalendar();
    }

    function toggleTabsForView(isProjectView) {
        // UPDATED: Included all new tabs
        const tabsToToggle = ['status', 'project-docs', 'tender-docs', 'vendor-lists', 'materials', 'subcontractors', 'long-lead', 'rfi', 'project-uploads', 'bulletin', 'site-docs', 'boq', 'schedule', 'tools', 'forms', 'snaglist', 'payment', 'directory', 'visuals', 'inventory', 'budget'];
        DOMElements.controlTabsContainer.querySelectorAll('.tab-button').forEach(btn => {
            if (tabsToToggle.includes(btn.dataset.tab)) {
                btn.style.display = isProjectView ? 'inline-block' : 'none';
            }
        });
        if (isProjectView) {
            DOMElements.controlTabsContainer.querySelector('[data-tab="status"]').click();
        } else {
            DOMElements.controlTabsContainer.querySelector('[data-tab="calendar"]').click();
        }
    }

    // --- DATA HANDLING & CORE LOGIC ---
    async function handleProjectFileImport(event) { const file = event.target.files[0]; if (!file) return; const xmlString = await file.text(); const parsedProjects = loadProjectsFromXmlString(xmlString); if (parsedProjects && Array.isArray(parsedProjects)) { if (confirm(`This will import/update ${parsedProjects.length} projects. Continue?`)) { for (const project of parsedProjects) { await DB.processProjectImport(project); } await renderProjectList(); alert(`Loaded ${parsedProjects.length} projects.`); } } else { alert('Could not parse project file.'); } event.target.value = ''; }
    async function saveSiteDataToXml() { const allSiteData = await DB.getAllSiteData(); if (allSiteData.length === 0) { alert("No site data to save."); return; } const dataToExport = []; for (const siteData of allSiteData) { const siteFiles = await DB.getFiles(siteData.jobNo, 'site'); const filesBase64 = siteFiles.map(f => ({ name: f.name, type: f.type, fileType: f.fileType, data: f.dataUrl })); dataToExport.push({ ...siteData, siteFiles: filesBase64 }); } const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<site_updates>\n${dataToExport.map(d => `  <update>${objectToXml(d)}</update>\n`).join('')}</site_updates>`; const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `SiteUpdates_${new Date().toISOString().split('T')[0]}.xml`; a.click(); URL.revokeObjectURL(a.href); alert("Site update file has been saved."); }
    async function updateStatus() { if (!currentJobNo) return; let siteData = await DB.getSiteData(currentJobNo) || { jobNo: currentJobNo, mom: [], statusLog: [] }; const newStatus = DOMElements.siteStatusSelect.value; if (siteData.status !== newStatus) { siteData.status = newStatus; siteData.statusLog = siteData.statusLog || []; siteData.statusLog.push({ date: new Date().toISOString(), status: newStatus }); await DB.putSiteData(siteData); await renderProjectList(); await renderCalendar(); } }
    async function handleFileUpload(event, type) { if (!currentJobNo) return; for (const file of event.target.files) { const dataUrl = await readFileAsDataURL(file); const fileObject = { jobNo: currentJobNo, source: 'site', type: type, name: (type === 'document' && DOMElements.docNameInput.value) ? `${DOMElements.docNameInput.value} (${file.name})` : file.name, fileType: file.type, dataUrl, timestamp: new Date().toISOString() }; if (type === 'photo') { fileObject.uploadStatus = DOMElements.siteStatusSelect.value; } await DB.addFile(fileObject); } const galleryEl = type === 'photo' ? DOMElements.photoGallery : DOMElements.siteDocGallery; await renderFileGallery(galleryEl, 'site', type, true); if (type === 'document') DOMElements.docNameInput.value = ''; event.target.value = ''; }
    async function deleteFile(id, type, galleryEl) { if (!currentJobNo) return; if (confirm(`Are you sure you want to delete this ${type}?`)) { await DB.deleteFile(id); await renderFileGallery(galleryEl, 'site', type, true); } }

    // --- RENDERING FUNCTIONS ---
    async function renderProjectList() {
        const tbody = DOMElements.projectListBody;
        const allProjects = await DB.getAllProjects();
        const allSiteData = await DB.getAllSiteData();
        const siteDataMap = allSiteData.reduce((acc, u) => ({ ...acc, [u.jobNo]: u }), {});
        tbody.innerHTML = allProjects.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No projects loaded.</td></tr>' : '';
        allProjects.forEach(p => {
            let siteData = siteDataMap[p.jobNo] || { status: 'Pending Start', progress: 0 };
            const progress = siteData.progress || 0;
            const statusText = siteData.status || 'Pending Start';
            const statusClass = statusText.toLowerCase().replace(/ /g, '-');
            const row = tbody.insertRow();
            row.dataset.jobNo = p.jobNo;
            row.innerHTML = `<td>${p.jobNo}</td><td>${p.projectDescription}<br><small>${p.clientName}</small></td><td>${p.plotNo}</td><td><span class="status-${statusClass}">${statusText}</span><div class="progress-bar-container" style="height:14px; margin-top:4px;"><div class="progress-bar" style="width:${progress}%; height:14px; font-size:0.7em;">${progress}%</div></div></td>`;
        });
    }

    async function handleProjectSelect(event) {
        const row = event.target.closest('tr');
        if (!row || !row.dataset.jobNo) return;
        document.querySelectorAll('#project-list-body tr').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        currentJobNo = row.dataset.jobNo;
        const project = await DB.getProject(currentJobNo);
        let siteData = await DB.getSiteData(currentJobNo);
        if (!siteData) {
            const boqTemplate = (window.FINANCIAL_DATA && window.FINANCIAL_DATA.boq) ? JSON.parse(JSON.stringify(FINANCIAL_DATA.boq)) : [];
            siteData = { jobNo: currentJobNo, status: 'Pending Start', progress: 0, boq: boqTemplate, mom: [], paymentCertificates: [], statusLog: [], scheduleOverrides: [], snagList: [], directory: [], inventory: [], budget: [], visualProgress: [], guarantees: [] };
            await DB.putSiteData(siteData);
        }
        DOMElements.detailsProjectName.textContent = project.projectDescription;
        DOMElements.detailsProjectInfo.textContent = `Job: ${project.jobNo} | Plot: ${project.plotNo}`;
        DOMElements.backToGlobalBtn.style.display = 'block';
        DOMElements.siteStatusSelect.value = siteData.status;
        
        // Render all file galleries
        await renderFileGallery(DOMElements.photoGallery, 'site', 'photo', true);
        await renderFileGallery(DOMElements.siteDocGallery, 'site', 'document', true);
        await renderMasterDocsByCategory(['client_details', 'noc_copies', 'letters', 'other_uploads'], DOMElements.projectDocsGallery);
        await renderMasterDocsByCategory(['tender_documents'], DOMElements.tenderDocsGallery);
        await renderMasterDocsByCategory(['vendor_lists'], DOMElements.vendorListsGallery);
        
        await renderBoq();
        await renderMomList();
        await renderGanttChart();
        calendarDate = new Date();
        await renderCalendar();
        await renderResourceCalculator();
        
        // --- RENDER NEW TAB CONTENT ---
        await renderMaterialList();
        await renderSubcontractorList();
        await renderLongLeadItems();
        await renderRfiLog();
        await renderNocTracker();
        await renderBulletinFeed();
        await renderMomTaskFollowup(); 
        await renderSnagList(); // NEW
        await renderPaymentSummary(); // NEW
        await renderDirectory(); // NEW
        await renderVisualProgress(); // NEW
        await renderInventory(); // NEW
        await renderBudgetSheet(); // NEW
        
        toggleTabsForView(true);
    }
    function handleTabClick(e) { if (e.target.matches('.tab-button')) { document.querySelectorAll('#control-tabs-container .tab-button').forEach(btn => btn.classList.remove('active')); e.target.classList.add('active'); document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active')); 
        const tabId = `${e.target.dataset.tab}-tab`;
        const targetContent = document.getElementById(tabId);
        if(targetContent) targetContent.classList.add('active');
        
        // Specific actions on tab switch for complex tabs
        if (e.target.dataset.tab === 'calendar') renderCalendar();
        if (e.target.dataset.tab === 'schedule') renderGanttChart();
    } }
    
    async function renderFileGallery(galleryEl, source, type, isDeletable) {
        galleryEl.innerHTML = '';
        if (!currentJobNo || source !== 'site') return;
    
        let files = (await DB.getFiles(currentJobNo, 'site')).filter(f => !type || f.type === type);
        if (files.length === 0) {
            galleryEl.innerHTML = `<p style="color:#888; font-style:italic;">No files found.</p>`;
            return;
        }
        if (type === 'photo') {
            const groupedPhotos = files.reduce((acc, file) => {
                const status = file.uploadStatus || 'General';
                if (!acc[status]) acc[status] = [];
                acc[status].push(file);
                return acc;
            }, {});
            const statusOrder = ['Mobilization', 'Shoring & Excavation', 'Sub-Structure', 'Super-Structure', 'Blockwork & Plastering', 'Finishing', 'Handover', 'Completed', 'On Hold', 'General'];
            statusOrder.forEach(status => {
                if (groupedPhotos[status]) {
                    const groupContainer = document.createElement('div');
                    groupContainer.innerHTML = `<h4 style="grid-column: 1 / -1; margin-bottom: 5px;">${status}</h4>`;
                    galleryEl.appendChild(groupContainer);
                    groupedPhotos[status].forEach(file => createThumbnail(file, isDeletable, type, galleryEl));
                }
            });
        } else {
            files.forEach(file => createThumbnail(file, isDeletable, type, galleryEl));
        }
    }

    async function renderMasterDocsByCategory(categoryKeys, galleryEl) {
        galleryEl.innerHTML = '';
        if (!currentJobNo) return;
    
        const allMasterFiles = await DB.getFiles(currentJobNo, 'master');
        const filesToShow = allMasterFiles.filter(f => categoryKeys.includes(f.category));
    
        if (filesToShow.length === 0) {
            galleryEl.innerHTML = `<p style="color:#888; font-style:italic;">No documents found for this category.</p>`;
            return;
        }
        
        filesToShow.forEach(file => createThumbnail(file, false, 'document', galleryEl)); // isDeletable is always false for master docs
    }

    function createThumbnail(file, isDeletable, type, galleryEl) { const thumbContainer = document.createElement('div'); thumbContainer.className = `thumbnail-container ${isDeletable ? '' : 'read-only'}`; if (isDeletable) { const deleteBtn = document.createElement('div'); deleteBtn.className = 'thumbnail-delete-btn'; deleteBtn.innerHTML = '×'; deleteBtn.onclick = (e) => { e.stopPropagation(); deleteFile(file.id, type, galleryEl); }; thumbContainer.appendChild(deleteBtn); } let thumbnail; if (file.fileType.startsWith('image/')) { thumbnail = Object.assign(document.createElement('img'), { src: file.dataUrl, className: 'thumbnail' }); } else if (file.fileType === 'application/pdf') { thumbnail = document.createElement('canvas'); thumbnail.className = 'thumbnail'; PDFGenerator.renderPdfThumbnail(thumbnail, file.dataUrl); } else { thumbnail = Object.assign(document.createElement('div'), { className: 'thumbnail file-icon', textContent: file.name.split('.').pop().toUpperCase().substring(0, 4) || 'FILE', title: file.name }); } thumbContainer.appendChild(thumbnail); galleryEl.appendChild(thumbContainer); }
    
    // --- CALENDAR LOGIC ---
    async function renderCalendar() {
        DOMElements.monthYearDisplay.textContent = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const grid = DOMElements.calendarGridBody;
        grid.innerHTML = '';
        const allEvents = {};

        const addEvent = (date, type, text, color = null, momIndex = null, jobNo = null) => {
            const dateKey = new Date(date).toDateString();
            if (!allEvents[dateKey]) allEvents[dateKey] = [];
            if (!allEvents[dateKey].some(e => e.type === type && e.text === text && e.jobNo === jobNo)) {
                allEvents[dateKey].push({ type, text, color, momIndex, jobNo });
            }
        };
        
        const allHolidays = await DB.getAllHolidays();
        allHolidays.forEach(holiday => addEvent(holiday.date, 'holiday', holiday.name));
        const allStaffLeaves = await DB.getAll('staffLeaves');
        allStaffLeaves.forEach(leave => {
            let currentDate = new Date(leave.startDate + 'T00:00:00'); // Ensure correct date parsing
            const endDate = new Date(leave.endDate + 'T00:00:00');
            // Loop through each day of the leave period
            while (currentDate <= endDate) {
                addEvent(currentDate, 'leave', `On Leave: ${leave.staffName}`);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });
        if (currentJobNo) {
            const project = await DB.getProject(currentJobNo);
            const siteData = await DB.getSiteData(currentJobNo);
            (siteData.statusLog || []).forEach(log => addEvent(log.date, 'status', `Status: ${log.status}`));
            (siteData.mom || []).forEach((mom, index) => addEvent(mom.date, 'mom', `MoM: Ref ${mom.ref || 'N/A'}`, null, index, currentJobNo));
            if (project.projectType === 'Villa') {
                const dynamicSchedule = await getProjectSchedule(project, siteData);
                dynamicSchedule.forEach(task => {
                    for (let d = new Date(task.start + 'T00:00:00'); d <= new Date(task.end + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
                        addEvent(d, 'gantt-task', task.name);
                    }
                });
            }
        } else {
            const allProjects = await DB.getAllProjects();
            const allSiteData = await DB.getAllSiteData();
            for (const project of allProjects) {
                 const siteData = allSiteData.find(d => d.jobNo === project.jobNo) || {};
                const color = getProjectColor(project.jobNo);
                (siteData.statusLog || []).forEach(log => addEvent(log.date, 'status', `${project.jobNo}: ${log.status}`, color));
                (siteData.mom || []).forEach((mom, index) => addEvent(mom.date, 'mom', `${project.jobNo}: MoM ${mom.ref || 'N/A'}`, color, index, project.jobNo));
                if (project.projectType === 'Villa') {
                    const dynamicSchedule = await getProjectSchedule(project, siteData);
                    dynamicSchedule.forEach(task => {
                         for (let d = new Date(task.start + 'T00:00:00'); d <= new Date(task.end + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
                            addEvent(d, 'gantt-task', `${project.jobNo}: ${task.name}`, color);
                        }
                    });
                }
            }
        }

        const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
        const startDayOfWeek = new Date(year, month, 1).getDay();
        const currentDay = new Date(year, month, 1 - startDayOfWeek);
        for (let i = 0; i < 42; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            const dayKey = currentDay.toDateString();
            if (currentDay.getMonth() !== month) dayCell.classList.add('other-month');
            dayCell.innerHTML = `<div class="day-number">${currentDay.getDate()}</div><div class="day-events"></div>`;
            const eventsContainer = dayCell.querySelector('.day-events');
            if (allEvents[dayKey]) {
                allEvents[dayKey].sort((a,b) => a.type === 'holiday' ? -1 : 1).forEach(event => {
                    const eventEl = document.createElement('span');
                    eventEl.className = `${event.type.includes('gantt') ? 'event-bar' : 'event-dot'} ${event.type}`;
                    eventEl.textContent = event.text;
                    eventEl.title = event.text;
                    if (event.color) eventEl.style.backgroundColor = event.color;
                    if (event.type === 'mom' && event.momIndex !== null) {
                        eventEl.dataset.momIndex = event.momIndex;
                        eventEl.dataset.jobNo = event.jobNo;
                        eventEl.classList.add('clickable-event');
                    }
                    eventsContainer.appendChild(eventEl);
                });
            }
            grid.appendChild(dayCell);
            currentDay.setDate(currentDay.getDate() + 1);
        }
    }
    async function handleLeaveImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const text = await file.text();
        try {
            const leaveData = JSON.parse(text);
            if (!Array.isArray(leaveData)) throw new Error("Invalid JSON format. Expected an array.");

            if (confirm(`This will import ${leaveData.length} leave records, replacing any existing ones. Continue?`)) {
                await DB.clear('staffLeaves'); 
                const transaction = db.transaction('staffLeaves', 'readwrite');
                const store = transaction.objectStore('staffLeaves');
                leaveData.forEach(record => store.add(record));
                await new Promise((resolve, reject) => {
                    transaction.oncomplete = resolve;
                    transaction.onerror = reject;
                });

                alert("Staff leave data imported successfully.");
                await renderCalendar();
            }
        } catch (error) {
            alert("Failed to import leave data. Please ensure the file is a valid JSON export from the HR app.");
            console.error("Leave import error:", error);
        }
        event.target.value = '';
    }
    function changeMonth(offset) { calendarDate.setMonth(calendarDate.getMonth() + offset); renderCalendar(); }
    
    // --- HOLIDAY LOGIC ---
    async function populateHolidayCountries() {
        try {
            const response = await fetch('https://date.nager.at/api/v3/AvailableCountries');
            if (!response.ok) throw new Error('Failed to fetch countries');
            const countries = await response.json();
            const select = DOMElements.holidayCountrySelect;
            select.innerHTML = countries.map(c => `<option value="${c.countryCode}">${c.name}</option>`).join('');
            select.value = 'AE';
        } catch (error) {
            console.error('Could not load holiday countries:', error);
            DOMElements.holidayCountrySelect.innerHTML = '<option value="AE">United Arab Emirates</option><option value="US">United States</option>';
        }
    }

    async function handleLoadHolidays() {
        const countryCode = DOMElements.holidayCountrySelect.value;
        const startYear = new Date().getFullYear();
        const yearsToFetch = Array.from({ length: 10 }, (_, i) => startYear + i);
        
        alert(`Loading holidays for ${countryCode} for the next 10 years. This may take a moment...`);
        
        try {
            const existingHolidays = await DB.getAllHolidays();
            for (const year of yearsToFetch) {
                const alreadyExists = existingHolidays.some(h => h.countryCode === countryCode && h.year === year);
                if (alreadyExists) {
                    console.log(`Holidays for ${countryCode}/${year} already in DB. Skipping.`);
                    continue;
                }
                
                const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
                if (response.ok) {
                    const holidays = await response.json();
                    if (holidays && holidays.length > 0) {
                        await DB.addHolidays(holidays, countryCode, year);
                    }
                } else {
                    console.warn(`Could not fetch holidays for ${year}: ${response.statusText}`);
                }
            }
            alert("Holidays loaded successfully!");
            await renderCalendar();
        } catch (error) {
            console.error("Error loading holidays:", error);
            alert("An error occurred while loading holidays. Please check the console.");
        }
    }

    // --- MoM LOGIC ---
    function openMomModal(momIndex = null) { const isNew = momIndex === null; DOMElements.momModalTitle.textContent = isNew ? "Create New MoM" : "Edit MoM"; DOMElements.momEditIndex.value = isNew ? '' : momIndex; DOMElements.deleteMomBtn.style.display = isNew ? 'none' : 'inline-block'; DOMElements.momRef.value = ''; DOMElements.momDate.value = new Date().toISOString().split('T')[0]; DOMElements.momLocation.value = 'Site Office'; DOMElements.momAttendeesTbody.innerHTML = ''; DOMElements.momStatusSummary.value = ''; DOMElements.momActionsTbody.innerHTML = ''; DOMElements.momNextMeeting.value = ''; DOMElements.momNextMeetingNotes.value = '(To be confirmed a day before)'; if (!isNew) { DB.getSiteData(currentJobNo).then(siteData => { const mom = siteData.mom[momIndex]; DOMElements.momRef.value = mom.ref || ''; DOMElements.momDate.value = mom.date || ''; DOMElements.momLocation.value = mom.location || ''; DOMElements.momStatusSummary.value = mom.summary || ''; DOMElements.momNextMeeting.value = mom.nextMeeting || ''; DOMElements.momNextMeetingNotes.value = mom.nextMeetingNotes || ''; (mom.attendees || []).forEach(p => addAttendeeRow(p.name, p.position, p.company)); (mom.actions || []).forEach(a => addActionRow(a.desc, a.by, a.date, a.status)); }); } DOMElements.momModal.style.display = 'flex'; }
    
    async function renderMomPreview(jobNo, momIndex) {
        if (jobNo === null || momIndex === null) return;
        const project = await DB.getProject(jobNo);
        const siteData = await DB.getSiteData(jobNo);
        const momData = siteData.mom[momIndex];
        if (!project || !momData) return;
        
        const html = SITE_FORM_TEMPLATES.previewMinutesOfMeeting(momData, project);
        DOMElements.momPreviewModalBody.innerHTML = html;
        DOMElements.momPreviewModalTitle.textContent = `Preview: MoM Ref ${momData.ref || 'N/A'}`;
        
        DOMElements.momPreviewModalFooter.innerHTML = `
            <button id="edit-this-mom-btn" class="secondary-button" data-job-no="${jobNo}" data-index="${momIndex}">Edit this MoM</button>
            <button id="copy-mom-btn" class="secondary-button" data-job-no="${jobNo}" data-index="${momIndex}" style="margin-left:10px;">Copy to New MoM</button>
            <button id="print-mom-btn" class="primary-button" data-job-no="${jobNo}" data-index="${momIndex}" style="float:right;">Print Full Form</button>
        `;
        DOMElements.momPreviewModal.style.display = 'flex';
    }

    async function saveMomData() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); siteData.mom = siteData.mom || []; const momIndex = DOMElements.momEditIndex.value; const attendees = Array.from(DOMElements.momAttendeesTbody.rows).map(row => ({ name: row.cells[0].querySelector('input').value, position: row.cells[1].querySelector('input').value, company: row.cells[2].querySelector('input').value })); const actions = Array.from(DOMElements.momActionsTbody.rows).map(row => ({ desc: row.cells[0].querySelector('input').value, by: row.cells[1].querySelector('input').value, date: row.cells[2].querySelector('input').value, status: row.cells[3].querySelector('input').value })); const momData = { ref: DOMElements.momRef.value, date: DOMElements.momDate.value, location: DOMElements.momLocation.value, attendees, summary: DOMElements.momStatusSummary.value, actions, nextMeeting: DOMElements.momNextMeeting.value, nextMeetingNotes: DOMElements.momNextMeetingNotes.value }; if (momIndex === '') { siteData.mom.push(momData); } else { siteData.mom[parseInt(momIndex)] = momData; } await DB.putSiteData(siteData); DOMElements.momModal.style.display = 'none'; await renderMomList(); await renderCalendar(); }
    async function deleteMomData() { if (!confirm("Are you sure you want to delete this MoM?")) return; const momIndex = parseInt(DOMElements.momEditIndex.value); if (!isNaN(momIndex)) { const siteData = await DB.getSiteData(currentJobNo); siteData.mom.splice(momIndex, 1); await DB.putSiteData(siteData); DOMElements.momModal.style.display = 'none'; await renderMomList(); await renderCalendar(); } }
    function addAttendeeRow(name = '', position = '', company = '') { const row = DOMElements.momAttendeesTbody.insertRow(); row.innerHTML = `<td><input type="text" value="${name}"></td><td><input type="text" value="${position}"></td><td><input type="text" value="${company}"></td><td><button class="small-button danger-button" onclick="this.closest('tr').remove()">✕</button></td>`; }
    function addActionRow(desc = '', by = '', date = '', status = '') { const row = DOMElements.momActionsTbody.insertRow(); row.innerHTML = `<td><input type="text" value="${desc}"></td><td><input type="text" value="${by}"></td><td><input type="date" value="${date}"></td><td><input type="text" value="${status}"></td><td><button class="small-button danger-button" onclick="this.closest('tr').remove()">✕</button></td>`; }
    
    async function renderMomList() {
        DOMElements.momList.innerHTML = '';
        if (!currentJobNo) return;
        let siteData = await DB.getSiteData(currentJobNo);
        if (!siteData.mom || siteData.mom.length === 0) {
            DOMElements.momList.innerHTML = '<p>No MoM recorded.</p>';
        } else {
            let html = '<ul class="mom-history-list">';
            siteData.mom.sort((a, b) => new Date(b.date) - new Date(a.date));
            siteData.mom.forEach((mom, index) => {
                html += `
                    <li class="mom-list-item">
                        <span class="mom-list-info">
                            <strong>${new Date(mom.date).toLocaleDateString()} (Ref: ${mom.ref || 'N/A'})</strong>
                            <br>
                            <small>${(mom.summary || '').substring(0, 80)}...</small>
                        </span>
                        <button class="secondary-button small-button preview-mom-btn" data-index="${index}">View</button>
                    </li>`;
            });
            html += '</ul>';
            DOMElements.momList.innerHTML = html;
        }
    }

    // --- GANTT, BOQ, Tools, Forms ---
    async function handleGanttUpdate(update) {
        if (!currentJobNo) return;
        try {
            const siteData = await DB.getSiteData(currentJobNo);
            siteData.scheduleOverrides = siteData.scheduleOverrides || [];
            
            let override = siteData.scheduleOverrides.find(o => o.id === update.id);
            if (override) {
                override.start = update.start;
                override.end = update.end;
            } else {
                siteData.scheduleOverrides.push({ id: update.id, start: update.start, end: update.end });
            }
            
            await DB.putSiteData(siteData);
            
            await renderGanttChart();
            await renderCalendar();
            await renderVisualProgress(); // Update visual progress
        } catch (error) {
            console.error("Failed to update schedule override:", error);
            alert("Error saving schedule changes.");
        }
    }
    
    async function renderGanttChart() {
        if (!currentJobNo || !window.UrbanAxisSchedule) return;
        const project = await DB.getProject(currentJobNo);
        const siteData = await DB.getSiteData(currentJobNo);
        const finalSchedule = await getProjectSchedule(project, siteData);
        UrbanAxisSchedule.render(project, finalSchedule, handleGanttUpdate);
    }

    async function getProjectSchedule(projectData, siteData) {
        const projectStartDate = new Date(projectData.agreementDate);
        const constructionMonths = parseFloat(projectData.constructionDuration) || 14;
        const scaleFactor = (constructionMonths * 30.4) / 577;

        let schedule = VILLA_SCHEDULE_TEMPLATE.map(task => {
            const newStartOffset = Math.round(task.startOffset * scaleFactor);
            const newDuration = Math.max(1, Math.round(task.duration * scaleFactor));
            const startDate = new Date(projectStartDate);
            startDate.setDate(startDate.getDate() + newStartOffset);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + newDuration - 1);
            return { ...task, start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0], duration: newDuration };
        });

        const overrides = siteData.scheduleOverrides || [];
        if (overrides.length > 0) {
            schedule.forEach(task => {
                const override = overrides.find(o => o.id === task.id);
                if (override) {
                    task.start = override.start;
                    task.end = override.end;
                    const newStart = new Date(override.start + 'T00:00:00');
                    const newEnd = new Date(override.end + 'T00:00:00');
                    task.duration = Math.round((newEnd - newStart) / (1000 * 60 * 60 * 24)) + 1;
                }
            });
        }
        return schedule;
    }

    async function renderBoq() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); const boq = siteData.boq || []; const tbody = DOMElements.boqTableBody; tbody.innerHTML = ''; boq.forEach((item, index) => { const amount = (item.qty || 0) * (item.rate || 0); const totalDonePerc = (item.prev_perc || 0) + (item.curr_perc || 0); const workDoneValue = amount * (totalDonePerc / 100); const row = tbody.insertRow(); row.dataset.index = index; row.innerHTML = ` <td contenteditable="true" data-field="id">${item.id || ''}</td> <td contenteditable="true" data-field="description">${item.description}</td> <td contenteditable="true" data-field="unit">${item.unit}</td> <td contenteditable="true" data-field="qty" class="editable-cell">${item.qty || 0}</td> <td contenteditable="true" data-field="rate" class="editable-cell">${(item.rate || 0).toFixed(2)}</td> <td class="boq-amount" contenteditable="false">${amount.toFixed(2)}</td> <td contenteditable="false">${item.prev_perc || 0}%</td> <td contenteditable="true" data-field="curr_perc" class="editable-cell">${item.curr_perc || 0}</td> <td class="boq-total-perc" contenteditable="false">${totalDonePerc.toFixed(0)}%</td> <td class="boq-work-done-value" contenteditable="false">${workDoneValue.toFixed(2)}</td> <td><button class="delete-boq-item-btn small-button danger-button">✕</button></td> `; }); await updateBoqTotals(); }
    async function handleBoqChange(e) { const target = e.target; const row = target.closest('tr'); if (!row) return; const index = parseInt(row.dataset.index); const siteData = await DB.getSiteData(currentJobNo); const item = siteData.boq[index]; if (!item) return; if (target.matches('.delete-boq-item-btn')) { if (confirm(`Are you sure you want to delete item: ${item.description}?`)) { siteData.boq.splice(index, 1); await DB.putSiteData(siteData); await renderBoq(); } return; } if (target.hasAttribute('contenteditable')) { const field = target.dataset.field; let value = target.textContent; if (['qty', 'rate', 'curr_perc'].includes(field)) { let numValue = parseFloat(value) || 0; if (field === 'curr_perc') { const prevPerc = item.prev_perc || 0; if (numValue < 0) numValue = 0; if (numValue > (100 - prevPerc)) numValue = 100 - prevPerc; target.textContent = numValue; } item[field] = numValue; } else { item[field] = value; } const amount = (item.qty || 0) * (item.rate || 0); const totalDonePerc = (item.prev_perc || 0) + (item.curr_perc || 0); const workDoneValue = amount * (totalDonePerc / 100); item.amount = amount; row.querySelector('.boq-amount').textContent = amount.toFixed(2); row.querySelector('.boq-total-perc').textContent = `${totalDonePerc.toFixed(0)}%`; row.querySelector('.boq-work-done-value').textContent = workDoneValue.toFixed(2); await DB.putSiteData(siteData); await updateBoqTotals(); } }
    async function handleAddBoqItem() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); siteData.boq.push({ id: "V.O.", description: "New Variation Item", unit: "", qty: 0, rate: 0, amount: 0, prev_perc: 0, curr_perc: 0 }); await DB.putSiteData(siteData); await renderBoq(); }
    async function updateBoqTotals() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); if (!siteData || !siteData.boq) return; const boq = siteData.boq; const totalValue = boq.reduce((sum, item) => sum + (item.amount || 0), 0); const totalWorkDoneValue = boq.reduce((sum, item) => { const totalPerc = (item.prev_perc || 0) + (item.curr_perc || 0); return sum + ((item.amount || 0) * (totalPerc / 100)); }, 0); const overallProgress = totalValue > 0 ? Math.round((totalWorkDoneValue / totalValue) * 100) : 0; DOMElements.boqTotalValue.textContent = `${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2})} AED`; DOMElements.boqWorkDoneValue.textContent = `${totalWorkDoneValue.toLocaleString('en-US', {minimumFractionDigits: 2})} AED`; DOMElements.boqProgressPercentage.textContent = `${overallProgress}%`; DOMElements.boqProgressBar.style.width = `${overallProgress}%`; DOMElements.boqProgressBar.textContent = `${overallProgress}%`; if (siteData.progress !== overallProgress) { siteData.progress = overallProgress; await DB.putSiteData(siteData); await renderProjectList(); } }
    async function renderResourceCalculator() {
        const tbody = DOMElements.resourceCalculatorBody;
        tbody.innerHTML = '';
        if (!currentJobNo) return;
        const project = await DB.getProject(currentJobNo);
        const siteData = await DB.getSiteData(currentJobNo);
        const schedule = await getProjectSchedule(project, siteData);
        
        schedule.forEach(task => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${task.name}</td>
                <td style="text-align: right;">${task.duration}</td>
                <td><input type="number" class="man-days-input" value="0"></td>
                <td class="task-cost" style="text-align: right;">0.00</td>`;
        });
        tbody.innerHTML += `<tr class="resource-total-row"><td colspan="2">Total Estimated Labor Cost</td><td id="total-man-days" style="text-align: right;">0</td><td id="total-resource-cost" style="text-align: right;">0.00</td></tr>`;
        updateResourceTotals();
    }
    function updateResourceTotals() {
        const dayRate = parseFloat(DOMElements.resourceDayRate.value) || 0;
        let totalManDays = 0;
        let totalCost = 0;
        DOMElements.resourceCalculatorBody.querySelectorAll('tr:not(.resource-total-row)').forEach(row => {
            const manDays = parseFloat(row.querySelector('.man-days-input').value) || 0;
            const taskCost = manDays * dayRate;
            row.querySelector('.task-cost').textContent = taskCost.toFixed(2);
            totalManDays += manDays;
            totalCost += taskCost;
        });
        document.getElementById('total-man-days').textContent = totalManDays;
        document.getElementById('total-resource-cost').textContent = totalCost.toFixed(2);
    }
    
    async function handleGeneratePaymentCertificate() {
        if (!currentJobNo) return;
        try {
            const response = await fetch(`forms/payment_certificate.html`);
            if (!response.ok) throw new Error(`Form not found: payment_certificate.html`);
            let html = await response.text();
            
            const project = await DB.getProject(currentJobNo);
            const siteData = await DB.getSiteData(currentJobNo);
            
            html = html.replace(/{{PROJECT_NAME}}/g, project.projectDescription || 'N/A')
                       .replace(/{{CLIENT_NAME}}/g, project.clientName || 'N/A')
                       .replace(/{{PLOT_NO}}/g, project.plotNo || 'N/A')
                       .replace(/{{DATE}}/g, new Date().toLocaleDateString('en-GB'));

            const totalValue = siteData.boq.reduce((sum, item) => sum + (item.amount || 0), 0);
            const workDoneValue = siteData.boq.reduce((sum, item) => sum + ((item.amount || 0) * (((item.prev_perc||0) + (item.curr_perc||0))/100)), 0);
            const totalProgress = totalValue > 0 ? (workDoneValue / totalValue * 100) : 0;
            const retention = workDoneValue * 0.10;
            const advanceDeduction = workDoneValue * 0.10;
            const previouslyCertified = (siteData.paymentCertificates || []).reduce((sum, cert) => sum + cert.totalForInvoice, 0);
            const totalForInvoice = workDoneValue - retention - advanceDeduction - previouslyCertified;
            const vat = totalForInvoice > 0 ? totalForInvoice * 0.05 : 0;
            const roundOff = Math.ceil(totalForInvoice + vat) - (totalForInvoice + vat);
            const netPayable = totalForInvoice + vat + roundOff;

            html = html.replace('{{TOTAL_CONTRACT_VALUE}}', totalValue.toLocaleString('en-US', {minimumFractionDigits: 2}))
                       .replace('{{WORK_DONE_VALUE}}', workDoneValue.toLocaleString('en-US', {minimumFractionDigits: 2}))
                       .replace('{{WORK_DONE_PERCENTAGE}}', totalProgress.toFixed(0))
                       .replace('{{RETENTION}}', `(${retention.toLocaleString('en-US', {minimumFractionDigits: 2})})`)
                       .replace('{{ADVANCE_DEDUCTION}}', `(${advanceDeduction.toLocaleString('en-US', {minimumFractionDigits: 2})})`)
                       .replace('{{PREVIOUSLY_CERTIFIED}}', `-${previouslyCertified.toLocaleString('en-US', {minimumFractionDigits: 2})}`)
                       .replace('{{TOTAL_FOR_INVOICE}}', totalForInvoice.toLocaleString('en-US', {minimumFractionDigits: 2}))
                       .replace('{{VAT_5_PERCENT}}', vat.toLocaleString('en-US', {minimumFractionDigits: 2}))
                       .replace('{{ROUND_OFF}}', roundOff.toFixed(2))
                       .replace('{{NET_PAYABLE}}', netPayable.toLocaleString('en-US', {minimumFractionDigits: 2}));

            DOMElements.formModalTitle.textContent = `Payment Certificate No. ${(siteData.paymentCertificates || []).length + 1}`;
            DOMElements.formModalBody.innerHTML = html;
            DOMElements.formModalFooter.innerHTML = `<button class="secondary-button" onclick="window.print()">Print Form</button><button id="save-form-pdf-btn">Save as PDF</button>`;
            DOMElements.formModal.style.display = 'flex';
        } catch (error) {
            alert(error.message);
            console.error(error);
        }
    }
    async function handleFormButtonClick(e) { 
        if(!currentJobNo) { alert("Please select a project first."); return; } 
        if (!e.target.matches('.form-btn')) return; 
        const formType = e.target.dataset.form; 
        const formTitle = e.target.textContent;
        
        if (formType === 'mom') {
            openMomModal(null);
            return;
        }

        try { 
            const response = await fetch(`forms/${formType}.html`); 
            if (!response.ok) throw new Error(`Form not found: forms/${formType}.html. Please create this file.`); 
            let html = await response.text(); 
            const project = await DB.getProject(currentJobNo); 
            DOMElements.formModalTitle.textContent = formTitle; 
            if (project) { html = html.replace(/{{PROJECT_NAME}}/g, project.projectDescription || 'N/A').replace(/{{CLIENT_NAME}}/g, project.clientName || 'N/A').replace(/{{PLOT_NO}}/g, project.plotNo || 'N/A').replace(/{{DATE}}/g, new Date().toLocaleDateString('en-GB')); } 
            DOMElements.formModalBody.innerHTML = html; DOMElements.formModal.style.display = 'flex'; 
        } catch(error) { 
            alert(error.message); console.error(error); 
        } 
    }

    async function handleSaveFormAsPdf() { if (!currentJobNo || !PDFGenerator) { alert("PDF generation failed."); return; } await PDFGenerator.generate({ previewId: 'form-modal-body', projectJobNo: currentJobNo }); }
    
    function handleVendorSearch() {
        const searchTerm = DOMElements.vendorSearchInput.value.toLowerCase().trim();
        if (searchTerm.length < 3) {
            DOMElements.vendorSearchResults.innerHTML = '<p style="color:#888;">Please enter at least 3 characters.</p>';
            return;
        }
    
        const results = [];
        for (const category in VENDOR_LIST) {
            VENDOR_LIST[category].forEach(entry => {
                const itemMatch = entry.item.toLowerCase().includes(searchTerm);
                const manufacturerMatch = entry.manufacturers.some(m => m.toLowerCase().includes(searchTerm));
                if (itemMatch || manufacturerMatch) {
                    results.push({ ...entry, category });
                }
            });
        }
        renderVendorSearchResults(results);
    }
    
    function renderVendorSearchResults(results) {
        const container = DOMElements.vendorSearchResults;
        if (results.length === 0) {
            container.innerHTML = '<p>No matching items found.</p>';
            return;
        }
    
        let html = '<table class="output-table" style="font-size: 0.9em;"><thead><tr><th>Category</th><th>Item</th><th>Approved Manufacturers / Suppliers</th></tr></thead><tbody>';
        results.forEach(result => {
            const manufacturersList = result.manufacturers.map(m => `<li>${m}</li>`).join('');
            html += `
                <tr>
                    <td>${result.category}</td>
                    <td>${result.item}</td>
                    <td><ul style="margin:0; padding-left: 15px;">${manufacturersList}</ul></td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    function calculateCriticalPath(schedule) {
        const tasks = JSON.parse(JSON.stringify(schedule));
        const taskMap = new Map(tasks.map(task => [task.id, task]));

        tasks.forEach(task => {
            task.es = 0; task.ef = 0; task.ls = Infinity; task.lf = Infinity;
            task.successors = [];
            task.dependencies = task.dependencies || [];
        });

        tasks.forEach(task => {
            task.dependencies.forEach(depId => {
                const predecessor = taskMap.get(depId);
                if (predecessor) { predecessor.successors.push(task.id); }
            });
        });

        let changed = true;
        while(changed) {
            changed = false;
            tasks.forEach(task => {
                const maxEF = task.dependencies.reduce((max, depId) => Math.max(max, taskMap.get(depId)?.ef || 0), 0);
                const newES = maxEF;
                const newEF = newES + task.duration;
                if (task.es !== newES || task.ef !== newEF) {
                    task.es = newES; task.ef = newEF;
                    changed = true;
                }
            });
        }

        const projectDuration = Math.max(...tasks.map(t => t.ef));
        tasks.forEach(task => {
            if (task.successors.length === 0) {
                task.lf = projectDuration;
                task.ls = task.lf - task.duration;
            }
        });
        
        changed = true;
        while(changed) {
            changed = false;
            for(let i = tasks.length - 1; i >= 0; i--) {
                const task = tasks[i];
                const minLS = task.successors.reduce((min, succId) => Math.min(min, taskMap.get(succId)?.ls || projectDuration), projectDuration);
                const newLF = minLS;
                const newLS = newLF - task.duration;
                if (task.lf !== newLF || task.ls !== newLS) {
                    task.lf = newLF; task.ls = newLS;
                    changed = true;
                }
            }
        }

        tasks.forEach(task => {
            task.slack = task.ls - task.es;
            task.isCritical = task.slack <= 1; 
        });

        return tasks;
    }
    async function generateReportHtml(project, siteData, analyzedSchedule) {
        const today = new Date();
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(today.getDate() + 14);

        const prevWorkDoneValue = (siteData.boq || []).reduce((sum, item) => {
            const itemAmount = (item.qty || 0) * (item.rate || 0);
            return sum + (itemAmount * ((item.prev_perc || 0) / 100));
        }, 0);

        const nextTwoWeeksTasks = analyzedSchedule.filter(task => {
            const taskStart = new Date(task.start);
            const taskEnd = new Date(task.end);
            return (taskEnd >= today && taskStart <= twoWeeksFromNow);
        }).sort((a,b) => new Date(a.start) - new Date(b.start));

        const criticalTasksList = analyzedSchedule.filter(t => t.isCritical).map(t => `<li>${t.name} (Duration: ${t.duration} days)</li>`).join('');

        const nextTasksHtml = nextTwoWeeksTasks.length > 0 ? nextTwoWeeksTasks.map(task => `
            <tr style="${task.isCritical ? 'background-color: #ffdddd;' : ''}">
                <td>${task.name}</td>
                <td>${task.start}</td>
                <td>${task.end}</td>
                <td>${task.isCritical ? '<strong>Yes</strong>' : 'No'}</td>
            </tr>
        `).join('') : '<tr><td colspan="4">No tasks scheduled in the next 14 days.</td></tr>';

        return `
            <div class="document-preview a4" style="font-family: sans-serif; font-size: 10pt;">
                <style>
                    .report-table { width: 100%; border-collapse: collapse; margin-top: 15px; } .report-table th, .report-table td { border: 1px solid #ccc; padding: 6px; text-align: left; } .report-table th { background-color: #f2f2f2; } h1, h2, h3 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; } .report-header { text-align: center; margin-bottom: 30px; } .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;} .info-grid p { margin: 0; padding: 5px; border: 1px solid #eee; }
                </style>
                <div class="report-header"> <h1>Project Status Report</h1> <p>Report Date: ${today.toLocaleDateString('en-GB')}</p> </div>
                <h3>Project Information</h3>
                <div class="info-grid"> <p><strong>Project:</strong> ${project.projectDescription || 'N/A'}</p> <p><strong>Job No:</strong> ${project.jobNo || 'N/A'}</p> <p><strong>Client:</strong> ${project.clientName || 'N/A'}</p> <p><strong>Plot No:</strong> ${project.plotNo || 'N/A'}</p> </div>
                <h2>1. Work Done Summary</h2>
                <p><strong>Total Value of Previously Certified Work:</strong> ${prevWorkDoneValue.toLocaleString('en-US', {minimumFractionDigits: 2})} AED</p>
                <p><strong>Total Value of Work Done to Date:</strong> ${DOMElements.boqWorkDoneValue.textContent}</p>
                <p><strong>Current Overall Progress:</strong> ${siteData.progress || 0}%</p>
                <h2>2. Current Site Status</h2>
                <p>The current reported status of the site is: <strong>${siteData.status || 'Not specified'}</strong>.</p>
                ${(siteData.mom && siteData.mom.length > 0) ? `<p><strong>Latest MoM Summary:</strong> ${(siteData.mom.sort((a,b) => new Date(b.date) - new Date(a.date))[0].summary || 'N/A')}</p>` : ''}
                <h2>3. Planned Work (Next 14 Days)</h2>
                <p>The following tasks are planned to be active within the next 14 days. <span style="background-color: #ffdddd; padding: 2px 4px; border: 1px solid #f00;">Highlighted tasks</span> are on the critical path.</p>
                <table class="report-table"> <thead><tr><th>Task Name</th><th>Start Date</th><th>End Date</th><th>On Critical Path?</th></tr></thead> <tbody>${nextTasksHtml}</tbody> </table>
                <h2>4. Critical Path Analysis</h2>
                <p>The critical path represents the sequence of tasks that determines the total project duration. Any delay in a critical task will directly impact the project completion date. The analysis is based on the current dynamic schedule.</p>
                <p><strong>Identified Critical Tasks for Project Completion:</strong></p>
                <ul style="column-count: 2;">${criticalTasksList}</ul>
            </div>
        `;
    }
    async function handleGenerateProjectReport() {
        if (!currentJobNo) { alert("Please select a project to generate a report."); return; }
        try {
            const project = await DB.getProject(currentJobNo);
            const siteData = await DB.getSiteData(currentJobNo);
            if (project.projectType !== 'Villa') { alert("Project reports with critical path analysis are currently only available for 'Villa' type projects."); return; }
            const dynamicSchedule = await getProjectSchedule(project, siteData);
            const analyzedSchedule = calculateCriticalPath(dynamicSchedule);
            const reportHtml = await generateReportHtml(project, siteData, analyzedSchedule);
            await PDFGenerator.generate({ tempContent: reportHtml, projectJobNo: currentJobNo, fileName: `${project.jobNo}_Project_Status_Report_${new Date().toISOString().split('T')[0]}` });
        } catch (error) {
            console.error("Error generating project report:", error);
            alert("An error occurred while generating the report. Please check the console for details.");
        }
    }
    
    async function handleCopyMom(button) {
        const jobNo = button.dataset.jobNo;
        const momIndex = parseInt(button.dataset.index, 10);

        if (jobNo && !isNaN(momIndex)) {
            const siteData = await DB.getSiteData(jobNo);
            const momToCopy = siteData.mom[momIndex];
            if (!momToCopy) {
                alert('Could not find MoM to copy.');
                return;
            }

            DOMElements.momPreviewModal.style.display = 'none';
            openMomModal(null); // Open editor for a new MoM

            setTimeout(() => {
                DOMElements.momRef.value = ''; 
                DOMElements.momDate.value = new Date().toISOString().split('T')[0]; 
                DOMElements.momLocation.value = momToCopy.location || 'Site Office';
                DOMElements.momStatusSummary.value = momToCopy.summary || '';
                DOMElements.momNextMeeting.value = ''; 
                DOMElements.momNextMeetingNotes.value = momToCopy.nextMeetingNotes || '(To be confirmed a day before)';

                DOMElements.momAttendeesTbody.innerHTML = '';
                (momToCopy.attendees || []).forEach(p => addAttendeeRow(p.name, p.position, p.company));
                
                DOMElements.momActionsTbody.innerHTML = '';
                (momToCopy.actions || []).forEach(a => addActionRow(a.desc, a.by, a.date, a.status));
                
                alert('MoM has been copied. Please review, update, and save as a new meeting.');
            }, 100);
        }
    }

    // --- NEW TAB LOGIC IMPLEMENTATION ---

    // 1. Material List
    async function renderMaterialList() {
        DOMElements.materialApprovalList.innerHTML = '<p>Material list rendering placeholder. (Add Material Submittal Modal/List here)</p>';
        if (!currentJobNo) return;
    }
    function openMaterialModal(materialId) { /* Logic to open modal for new/edit material */ alert('Material Submittal Modal Placeholder'); }
    
    // 2. Subcontractors
    async function renderSubcontractorList() {
        DOMElements.subcontractorList.innerHTML = '<p>Subcontractor list rendering placeholder. (Add Subcontractor Modal/List here)</p>';
        if (!currentJobNo) return;
    }
    function handleAddSubcontractor() { /* Logic to open modal for new/edit sub */ alert('Subcontractor Modal Placeholder'); }

    // 3. Long Lead Items
    async function renderLongLeadItems() {
        DOMElements.longLeadTableBody.innerHTML = '<tr><td colspan="10">Long lead item tracking coming soon. (Implement detailed table rendering)</td></tr>';
        if (!currentJobNo) return;
    }
    
    // 4. MoM Task Follow-up (Links MoM actions to a centralized list)
    async function renderMomTaskFollowup() {
        const followUpDiv = document.getElementById('mom-list');
        if (!currentJobNo) {
             followUpDiv.innerHTML = '<p>No MoM recorded.</p>'; // Fallback if project is not selected
             return;
        }
        
        const siteData = await DB.getSiteData(currentJobNo);
        let html = '<h5 style="margin-top: 10px;">Action Item Follow-up (for this Project)</h5>';
        let tasksFound = false;
        
        (siteData.mom || []).forEach(mom => {
            (mom.actions || []).forEach((action, actionIndex) => {
                if (action.by && action.status && action.desc) {
                    tasksFound = true;
                    html += `
                        <div class="mom-list-item" style="background: #fff;">
                            <span class="mom-list-info">
                                <strong>Action: ${action.desc}</strong>
                                <br><small>Due: ${action.date || 'N/A'} | Status: ${action.status} | MoM Ref: ${mom.ref || 'N/A'}</small>
                            </span>
                            <button class="secondary-button small-button preview-mom-btn" data-index="${siteData.mom.indexOf(mom)}" data-job-no="${currentJobNo}">View MoM</button>
                        </div>
                    `;
                }
            });
        });
        
        if (!tasksFound) {
            followUpDiv.innerHTML = '<p>No open or tracked action items found in MoMs for this project.</p>';
        } else {
            followUpDiv.innerHTML = html;
        }
    }

    // 5. RFI Tracking
    async function renderRfiLog() {
        DOMElements.rfiLogList.innerHTML = '<p>RFI log rendering placeholder. (List RFI No., Status, Approvers)</p>';
        if (!currentJobNo) return;
    }
    function openRfiModal(rfiId) { /* Logic to open modal for RFI data entry/tracking */ alert('RFI Tracking Modal Placeholder'); }

    // 6. Project Uploads / NOC Tracking
    async function renderNocTracker() {
        DOMElements.nocTracker.innerHTML = '<table class="mom-table"><thead><tr><th>NOC Type</th><th>Required By</th><th>Status</th><th>Date Submitted</th><th>Date Approved</th></tr></thead><tbody><tr><td colspan="5">NOC tracking table placeholder.</td></tr></tbody></table>';
        if (!currentJobNo) return;
    }

    // 7. Bulletin/Task Assignment
    async function renderBulletinFeed() {
        DOMElements.bulletinFeed.innerHTML = '<p>Loading bulletins...</p>';
        if (!currentJobNo) return;
        const bulletins = await DB.getBulletinItems(); 
        
        let html = '<ul style="list-style:none; padding:0;">';
        bulletins.filter(b => b.jobNo === currentJobNo).forEach(b => {
             html += `
                <li style="border-bottom: 1px solid #eee; padding: 8px 0;">
                    <strong>${b.subject}</strong> (From: ${b.author || 'System'})
                    <br><small>${b.details.substring(0, 100)}...</small>
                    ${b.assignedTo ? `<span style="float:right; background:#fff3cd; padding:2px 5px; border-radius:3px;">To: ${b.assignedTo}</span>` : ''}
                </li>`;
        });
        html += '</ul>';
        DOMElements.bulletinFeed.innerHTML = html || '<p>No bulletins posted for this project.</p>';
    }
    async function handlePostBulletin() {
        if (!currentJobNo) { alert("Select a project before posting a bulletin."); return; }
        const subject = DOMElements.bulletinSubject.value.trim();
        const details = DOMElements.bulletinDetails.value.trim();
        const assignedTo = DOMElements.bulletinAssignedTo.value.trim();
        
        if (!subject || !details) { alert("Subject and Details are required."); return; }

        await DB.addBulletinItem({
            jobNo: currentJobNo,
            timestamp: new Date().toISOString(),
            author: 'Site Engineer', 
            subject: subject,
            details: details,
            assignedTo: assignedTo || 'Project Team',
        });

        DOMElements.bulletinSubject.value = '';
        DOMElements.bulletinDetails.value = '';
        DOMElements.bulletinAssignedTo.value = '';
        await renderBulletinFeed();
        alert('Bulletin posted successfully.');
    }

    // 8. Snag List (NEW)
    async function renderSnagList() {
        DOMElements.snagListBody.innerHTML = '<tr><td colspan="6">Loading Snag List...</td></tr>';
        if (!currentJobNo) return;
        const siteData = await DB.getSiteData(currentJobNo);
        const snags = siteData.snagList || [];
        
        DOMElements.snagListBody.innerHTML = snags.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No snags recorded for this project.</td></tr>' : '';

        snags.forEach((snag, index) => {
            const row = DOMElements.snagListBody.insertRow();
            row.innerHTML = `
                <td>${index + 1}</td>
                <td contenteditable="true" data-field="location">${snag.location || ''}</td>
                <td contenteditable="true" data-field="description">${snag.description || ''}</td>
                <td contenteditable="true" data-field="responsible">${snag.responsible || ''}</td>
                <td contenteditable="true" data-field="status">${snag.status || 'Open'}</td>
                <td><button class="delete-snag-btn small-button danger-button">✕</button></td>
            `;
            row.dataset.index = index;
        });
        await updateSnagTotals(snags.length);
    }
    async function updateSnagTotals(count) {
         document.getElementById('snag-count').textContent = count;
    }
    async function handleSnagListChange(e) {
        const target = e.target;
        const row = target.closest('tr');
        if (!row || !row.dataset.index) return;
        const index = parseInt(row.dataset.index);
        const siteData = await DB.getSiteData(currentJobNo);
        siteData.snagList = siteData.snagList || [];

        if (target.matches('.delete-snag-btn')) {
            if (confirm('Delete this snag item?')) {
                siteData.snagList.splice(index, 1);
            }
        } else if (target.hasAttribute('contenteditable')) {
            const field = target.dataset.field;
            siteData.snagList[index][field] = target.textContent;
        }
        await DB.putSiteData(siteData);
        await renderSnagList();
    }
    function addSnagRow() {
         // Placeholder function to add a blank row to the DOM and DB if needed
         alert('Add Snag Modal/Inline Entry Placeholder');
    }
    
    // 9. Building Visual Progress (IMPROVEMENT: Grayscale to Color Logic)
    async function renderVisualProgress() {
        const container = DOMElements.visualProgressContainer;
        container.innerHTML = `<canvas id="visual-model-canvas" style="width: 100%; height: 100%; border: 1px solid #ccc;"></canvas>`;

        if (!currentJobNo) {
            container.innerHTML = '<p>Please select a project to load the 3D visual progress.</p>';
            return;
        }

        const siteData = await DB.getSiteData(currentJobNo);
        const schedule = await getProjectSchedule(await DB.getProject(currentJobNo), siteData);
        const finishedTasks = schedule.filter(task => {
            // Simple heuristic: If task end date is before today, consider it finished for visual update
            return new Date(task.end) < new Date();
        });

        // --- Conceptual Rendering using 2D Canvas as 3D Placeholder ---
        const canvas = document.getElementById('visual-model-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.clientWidth;
        const H = canvas.clientHeight;
        canvas.width = W;
        canvas.height = H;

        ctx.fillStyle = '#E0E0E0'; // Overall Grayscale background (the unbuilt model)
        ctx.fillRect(0, 0, W, H);

        // Function to get progress percentage for a task ID
        const getTaskProgress = (taskId) => {
            const task = schedule.find(t => t.id === taskId);
            if (!task) return 0;
            const startDate = new Date(task.start);
            const endDate = new Date(task.end);
            const today = new Date();
            
            if (today < startDate) return 0;
            if (today > endDate) return 100;
            
            const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
            const daysPassed = (today - startDate) / (1000 * 60 * 60 * 24);
            return Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));
        };
        
        // Simple Layer Rendering based on task IDs in VISUAL_MODEL_MAP
        let cumulativeProgress = 0;
        const totalMappableItems = Object.keys(VISUAL_MODEL_MAP).length;

        Object.entries(VISUAL_MODEL_MAP).forEach(([taskIdStr, config], index) => {
            const taskId = parseInt(taskIdStr);
            const progress = getTaskProgress(taskId);
            
            // Calculate position based on index (simulating different building blocks)
            const xOffset = (index % 3) * (W / 3) + 50;
            const yOffset = Math.floor(index / 3) * (H / 5) + 50;
            const blockW = W / 4 - 50;
            const blockH = H / 5 - 50;

            const isComplete = progress === 100;
            const color = isComplete ? config.color : '#CCCCCC'; // Gray if not complete, Color if complete

            // 1. Draw the base structure (Grayscale layer - always drawn first)
            ctx.fillStyle = '#CCCCCC'; 
            ctx.fillRect(xOffset, yOffset, blockW, blockH);

            // 2. Draw the progress overlay (Color layer)
            if (progress > 0) {
                ctx.fillStyle = config.color;
                // If fully colored, show 100% fill (or use a complex gradient/shader concept here)
                // For 2D simulation, we'll just show the color block based on BOQ progress if available, or just 100% if finished.
                if (isComplete) {
                     ctx.fillRect(xOffset, yOffset, blockW, blockH);
                } else {
                    // Simulate progress bar fill effect within the block horizontally
                    const filledW = blockW * (progress / 100);
                    ctx.fillRect(xOffset, yOffset, filledW, blockH);
                }
            }

            // 3. Draw the outline/label
            ctx.strokeStyle = isComplete ? config.color : '#333333';
            ctx.lineWidth = 2;
            ctx.strokeRect(xOffset, yOffset, blockW, blockH);

            // 4. Draw progress text
            ctx.fillStyle = isComplete ? '#000000' : '#333333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${config.component}: ${progress}%`, xOffset + blockW / 2, yOffset + blockH + 15);

            if (isComplete) cumulativeProgress++;
        });

        // Update overall progress bar based on how many mapped items are done
        const overallVisualProgress = Math.round((cumulativeProgress / totalMappableItems) * 100);
        if (siteData.progress !== overallVisualProgress) {
             siteData.progress = overallVisualProgress;
             DB.putSiteData(siteData);
             renderProjectList(); // Update main list progress
        }

        // In a real 3D viewer (Three.js), you would call: 
        // 3DViewer.updateModelColor('COMPONENT_ID', progress);
    }
    
    // 10. Guarantees / Inventory
    async function renderInventory() {
        DOMElements.inventoryListBody.innerHTML = '<tr><td colspan="7">Product Guarantees, Warranties, and Material Usage Log coming soon.</td></tr>';
        if (!currentJobNo) return;
    }
    function handleAddInventoryItem() { alert("Add Inventory Item Placeholder"); }
    
    // 6. Payment Tracking (Contractor, Supplier, Consultant)
    async function renderPaymentSummary() {
        DOMElements.paymentSummary.innerHTML = `
            <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                <div class="card" style="flex:1; background:#d4edda; color:#155724; padding:15px; border-radius: 5px;"><strong>Total Contract Value:</strong> ${((await DB.getSiteData(currentJobNo)).boq || []).reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2})} AED</div>
                <div class="card" style="flex:1; background:#d1ecf1; color:#0c5460; padding:15px; border-radius: 5px;"><strong>Certified to Date (PC):</strong> <span id="paid-to-date">0.00</span> AED</div>
            </div>
            <table class="mom-table">
                <thead><tr><th>Payment Type</th><th>Total Value</th><th>Paid Status</th><th>Pending Amount</th></tr></thead>
                <tbody id="payment-breakdown-body">
                    <tr><td>Consultant Payments (Invoiced by Contractor)</td><td id="val-consultant">0.00</td><td id="paid-consultant">0.00</td><td id="pend-consultant">0.00</td></tr>
                    <tr><td>Supplier/Subcontractor Payments (Paid by Contractor)</td><td id="val-supplier">0.00</td><td id="paid-supplier">0.00</td><td id="pend-supplier">0.00</td></tr>
                </tbody>
            </table>
        `;
        if (!currentJobNo) return;
        const siteData = await DB.getSiteData(currentJobNo);
        const totalCertified = siteData.boq.reduce((sum, item) => sum + ((item.amount || 0) * (((item.prev_perc||0) + (item.curr_perc||0))/100)), 0);
        
        document.getElementById('paid-to-date').textContent = totalCertified.toLocaleString('en-US', {minimumFractionDigits: 2});
        
        // Placeholder logic: Assuming 80% of certified work is paid by consultant, and contractor has paid 90% of that amount to suppliers.
        const consultantPayment = totalCertified * 0.95; 
        const supplierPayment = consultantPayment * 0.90;

        document.getElementById('val-consultant').textContent = consultantPayment.toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('paid-consultant').textContent = (consultantPayment * 0.98).toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('pend-consultant').textContent = (consultantPayment * 0.02).toLocaleString('en-US', {minimumFractionDigits: 2});
        
        document.getElementById('val-supplier').textContent = supplierPayment.toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('paid-supplier').textContent = (supplierPayment * 0.99).toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('pend-supplier').textContent = (supplierPayment * 0.01).toLocaleString('en-US', {minimumFractionDigits: 2});
    }
    
    // 7. Directory
    async function renderDirectory() {
        DOMElements.directoryList.innerHTML = 'Loading Directory...';
        if (!currentJobNo) return;
        const project = await DB.getProject(currentJobNo);
        
        let html = '<table class="mom-table directory-table"><thead><tr><th>Role</th><th>Company</th><th>Contact Name</th><th>Phone</th></tr></thead><tbody>';
        
        // Main Contractor / Consultant
        html += `<tr><td>Main Contractor</td><td>${project.contractor || 'TBD'}</td><td>N/A</td><td>N/A</td></tr>`;
        html += `<tr><td>Project Manager (Consultant)</td><td>Urban Axis</td><td>Mr. Ahmed K.</td><td>+971 50 XXX XXXX</td></tr>`;
        
        // Subcontractors (Placeholder)
        const siteData = await DB.getSiteData(currentJobNo);
        (siteData.subcontractors || []).forEach(sub => {
             html += `<tr><td>Subcontractor: ${sub.trade || 'N/A'}</td><td>${sub.company || 'N/A'}</td><td>${sub.contact || 'N/A'}</td><td>${sub.phone || 'N/A'}</td></tr>`;
        });

        html += '</tbody></table>';
        DOMElements.directoryList.innerHTML = html;
    }
    function handleAddSubcontractor() { /* Logic to open modal for new/edit sub */ alert('Subcontractor Modal Placeholder'); }
    
    // 13. Contracts/Agreements (Simple Document Link Placeholder)
    async function renderContracts() {
        const contractsDiv = document.getElementById('contract-log-content');
        if (!currentJobNo) return contractsDiv.innerHTML = '<p>No contracts logged.</p>';
        
        // Assume contracts are stored as master documents tagged 'contract'
        const allMasterFiles = await DB.getFiles(currentJobNo, 'master');
        const contracts = allMasterFiles.filter(f => f.category === 'contract');
        
        contractsDiv.innerHTML = contracts.map(c => `
            <div class="thumbnail-container read-only">
                <div class="thumbnail file-icon" title="${c.name}">CONTRACT</div>
                <p style="font-size: 0.8em; margin-top: 5px;">${c.name}</p>
            </div>
        `).join('');
    }

    // 12. Budget / Burn Rate Chart
    async function renderBudgetSheet() {
        DOMElements.budgetTableBody.innerHTML = '<tr><td colspan="5">Budget sheet content placeholder.</td></tr>';
        if (!currentJobNo) return;
    }
    
    // --- OVERRIDE EVENT HANDLING ---
    async function handleEventClick(e) {
        let target = e.target;

        // --- Buttons inside the main printable form modal ---
        if (target.matches('#save-form-pdf-btn')) { handleSaveFormAsPdf(); return; }

        // --- Snag List Interaction ---
        if (target.closest('#snag-list-body')) { handleSnagListChange(e); return; }

        // --- Buttons inside the dedicated MoM PREVIEW modal ---
        if (target.closest('#mom-preview-modal-footer')) {
            const button = target.closest('button');
            if (!button) return;

            const jobNo = button.dataset.jobNo;
            const momIndex = parseInt(button.dataset.index, 10);

            if (button.id === 'edit-this-mom-btn') {
                DOMElements.momPreviewModal.style.display = 'none';
                if (momIndex !== null && jobNo) {
                    currentJobNo = jobNo; // Ensure context is correct
                    openMomModal(momIndex);
                }
            } else if (button.id === 'copy-mom-btn') {
                handleCopyMom(button);
            } else if (button.id === 'print-mom-btn') {
                const project = await DB.getProject(jobNo);
                const siteData = await DB.getSiteData(jobNo);
                const momData = siteData.mom[momIndex];
                const html = SITE_FORM_TEMPLATES.printableMinutesOfMeeting(momData, project);
                DOMElements.formModalBody.innerHTML = html;
                DOMElements.formModalTitle.textContent = `Printable: MoM Ref ${momData.ref || 'N/A'}`;
                DOMElements.formModal.style.display = 'flex';
            }
            return;
        }

        // --- Clicks on the MoM list or Calendar to OPEN the preview modal ---
        if (target.matches('.preview-mom-btn, .event-dot.mom')) {
            e.preventDefault();
            const momIndex = target.dataset.index || target.dataset.momIndex;
            const jobNoForMom = target.dataset.jobNo || currentJobNo;
            
            if (jobNoForMom !== null && momIndex !== null) {
                const index = parseInt(momIndex, 10);
                if (!isNaN(index)) {
                    renderMomPreview(jobNoForMom, index);
                }
            }
        }
    }
    
    // --- OVERRIDE SETUP LISTENER ---
    function setupEventListeners() {
        DOMElements.loadDataBtn.addEventListener('click', () => DOMElements.projectFileInput.click());
        DOMElements.importLeaveBtn.addEventListener('click', () => DOMElements.leaveFileInput.click());
        DOMElements.projectFileInput.addEventListener('change', handleProjectFileImport);
        DOMElements.leaveFileInput.addEventListener('change', handleLeaveImport);

        DOMElements.saveDataBtn.addEventListener('click', saveSiteDataToXml);
        DOMElements.projectListBody.addEventListener('click', handleProjectSelect);
        DOMElements.siteStatusSelect.addEventListener('change', updateStatus);
        DOMElements.backToGlobalBtn.addEventListener('click', showGlobalView);
        DOMElements.photoUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'photo'));
        DOMElements.docUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'document'));
        DOMElements.controlTabsContainer.addEventListener('click', handleTabClick);
        DOMElements.formsTab.addEventListener('click', handleFormButtonClick);
        DOMElements.generatePaymentCertBtn.addEventListener('click', handleGeneratePaymentCertificate);
        
        if (DOMElements.generateProjectReportBtn) {
            DOMElements.generateProjectReportBtn.addEventListener('click', handleGenerateProjectReport);
        }

        if (DOMElements.vendorSearchInput) {
            DOMElements.vendorSearchInput.addEventListener('input', handleVendorSearch);
        }
        
        const boqTab = document.getElementById('boq-tab');
        boqTab.addEventListener('blur', handleBoqChange, true);
        boqTab.addEventListener('click', (e) => { 
            handleBoqChange(e);
            if (e.target.matches('#add-boq-item-btn')) handleAddBoqItem(); 
        });
        
        DOMElements.momList.addEventListener('click', handleEventClick);
        DOMElements.calendarGridBody.addEventListener('click', handleEventClick); 
        DOMElements.formModal.addEventListener('click', handleEventClick);
        DOMElements.momPreviewModal.addEventListener('click', handleEventClick);

        DOMElements.newMomBtn.addEventListener('click', () => openMomModal(null));
        DOMElements.momModalCloseBtn.addEventListener('click', () => DOMElements.momModal.style.display = 'none');
        DOMElements.momPreviewModalCloseBtn.addEventListener('click', () => DOMElements.momPreviewModal.style.display = 'none');
        DOMElements.saveMomDataBtn.addEventListener('click', saveMomData);
        DOMElements.deleteMomBtn.addEventListener('click', deleteMomData);
        DOMElements.addAttendeeBtn.addEventListener('click', () => addAttendeeRow());
        DOMElements.addActionBtn.addEventListener('click', () => addActionRow());
        
        DOMElements.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
        DOMElements.nextMonthBtn.addEventListener('click', () => changeMonth(1));
        DOMElements.resourceDayRate.addEventListener('input', updateResourceTotals);
        DOMElements.resourceCalculatorBody.addEventListener('input', e => { if (e.target.matches('.man-days-input')) { updateResourceTotals(); } });
        
        DOMElements.formModalCloseBtn.addEventListener('click', () => DOMElements.formModal.style.display = 'none');
        
        DOMElements.loadHolidaysBtn.addEventListener('click', handleLoadHolidays);
        
        // NEW LISTENERS
        if (DOMElements.newMaterialSubmittalBtn) DOMElements.newMaterialSubmittalBtn.addEventListener('click', () => openMaterialModal(null));
        if (DOMElements.addSubcontractorBtn) DOMElements.addSubcontractorBtn.addEventListener('click', handleAddSubcontractor);
        if (DOMElements.newRfiBtn) DOMElements.newRfiBtn.addEventListener('click', () => openRfiModal(null));
        if (DOMElements.postBulletinBtn) DOMElements.postBulletinBtn.addEventListener('click', handlePostBulletin);
        if (DOMElements.downloadProjectZipBtn) DOMElements.downloadProjectZipBtn.addEventListener('click', handleDownloadProjectFilesZip);
        
        // Add listeners for content interaction (e.g., saving/deleting in modals)
        document.getElementById('mom-modal').addEventListener('click', (e) => { if(e.target.id === 'save-mom-data-btn') saveMomData(); });
        
        // Listeners for new tabs initialized here (if they need global listeners)
        if (DOMElements.snagListBody) DOMElements.snagListBody.addEventListener('input', handleSnagListChange);
    }

    // --- START ---
    main();
});
