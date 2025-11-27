document.addEventListener('DOMContentLoaded', async () => {
    // --- CONSTANTS ---
    const VILLA_SCHEDULE_TEMPLATE = [
        { id: 1, name: 'MOBILIZATION', startOffset: 0, duration: 62 }, { id: 2, name: 'SHORING WORKS', startOffset: 31, duration: 19 }, { id: 3, name: 'EXCAVATION WORK', startOffset: 51, duration: 27 }, { id: 4, name: 'COMPACTION & PCC', startOffset: 62, duration: 31 }, { id: 5, name: 'WATER-PROOFING', startOffset: 71, duration: 130 }, { id: 6, name: 'SUB-STRUCTURE', startOffset: 109, duration: 140 }, { id: 7, name: 'B/WALL WORKS', startOffset: 385, duration: 74 }, { id: 8, name: 'FIRST FLOOR SLAB', startOffset: 213, duration: 45 }, { id: 9, name: 'ROOF SLAB WORKS', startOffset: 259, duration: 46 }, { id: 10, name: 'UPPER ROOF SLAB', startOffset: 342, duration: 23 }, { id: 11, name: 'STEEL STAIRCASE', startOffset: 339, duration: 18 }, { id: 12, name: 'PLUMBING/DRAINAGE', startOffset: 111, duration: 453 }, { id: 13, name: 'WATER TANK', startOffset: 461, duration: 19 }, { id: 14, name: 'ELECTRICAL WORKS', startOffset: 62, duration: 483 }, { id: 15, name: 'INTERCOM/CCTV', startOffset: 492, duration: 27 }, { id: 16, name: 'AC WORK', startOffset: 405, duration: 138 }, { id: 17, name: 'FIRE FIGHTING', startOffset: 181, duration: 401 }, { id: 18, name: 'BLOCK WORK', startOffset: 204, duration: 189 }, { id: 19, name: 'PLASTERING', startOffset: 262, duration: 117 }, { id: 20, name: 'GYPSUM CEILING', startOffset: 364, duration: 137 }, { id: 21, name: 'INTERNAL FINISHES', startOffset: 410, duration: 127 }, { id: 22, name: 'EXTERNAL FINISHES', startOffset: 375, duration: 113 }, { id: 23, name: 'ALUMINIUM WORK', startOffset: 339, duration: 207 }, { id: 24, name: 'LIFT WORK', startOffset: 436, duration: 142 }, { id: 25, name: 'JOINERY WORK', startOffset: 426, duration: 65 }, { id: 26, name: 'SWIMMING POOL', startOffset: 461, duration: 54 }, { id: 27, name: 'LANDSCAPE WORK', startOffset: 466, duration: 111 }, { id: 28, name: 'MAIN GATE WORK', startOffset: 507, duration: 61 }, { id: 29, name: 'SNAGGING', startOffset: 565, duration: 7 }, { id: 30, name: 'AUTHORITY INSPECTION', startOffset: 572, duration: 5 },
    ];

    // --- STATE ---
    let currentJobNo = null;
    let calendarDate = new Date();

    // --- DOM CACHE ---
    const DOMElements = {
        loadDataBtn: document.getElementById('load-data-btn'),
        saveDataBtn: document.getElementById('save-data-btn'),
        projectFileInput: document.getElementById('project-file-input'),
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
        masterDocGallery: document.getElementById('master-doc-gallery'),
        docNameInput: document.getElementById('doc-name-input'),
        formModal: document.getElementById('form-modal'),
        formModalCloseBtn: document.getElementById('form-modal-close-btn'),
        formModalTitle: document.getElementById('form-modal-title'),
        formModalBody: document.getElementById('form-modal-body'),
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
    };

    // --- INITIALIZATION ---
    async function main() {
        try {
            await DB.init();
            setupEventListeners();
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
        const tabsToToggle = ['status', 'docs', 'boq', 'schedule', 'tools', 'forms'];
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

    // --- DATA HANDLING & CORE LOGIC (UNCHANGED) ---
    async function handleProjectFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const xmlString = await file.text();
        const parsedProjects = loadProjectsFromXmlString(xmlString);
        if (parsedProjects && Array.isArray(parsedProjects)) {
            if (confirm(`This will import/update ${parsedProjects.length} projects. Continue?`)) {
                for (const project of parsedProjects) { await DB.processProjectImport(project); }
                await renderProjectList();
                alert(`Loaded ${parsedProjects.length} projects.`);
            }
        } else { alert('Could not parse project file.'); }
        event.target.value = '';
    }
    async function saveSiteDataToXml() {
        const allSiteData = await DB.getAllSiteData();
        if (allSiteData.length === 0) { alert("No site data to save."); return; }
        const dataToExport = [];
        for (const siteData of allSiteData) {
            const siteFiles = await DB.getFiles(siteData.jobNo, 'site');
            const filesBase64 = siteFiles.map(f => ({ name: f.name, type: f.type, fileType: f.fileType, data: f.dataUrl }));
            dataToExport.push({ ...siteData, siteFiles: filesBase64 });
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<site_updates>\n${dataToExport.map(d => `  <update>${objectToXml(d)}</update>\n`).join('')}</site_updates>`;
        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `SiteUpdates_${new Date().toISOString().split('T')[0]}.xml`;
        a.click();
        URL.revokeObjectURL(a.href);
        alert("Site update file has been saved.");
    }
    async function updateStatus() {
        if (!currentJobNo) return;
        let siteData = await DB.getSiteData(currentJobNo) || { jobNo: currentJobNo, mom: [], statusLog: [] };
        const newStatus = DOMElements.siteStatusSelect.value;
        if (siteData.status !== newStatus) {
            siteData.status = newStatus;
            siteData.statusLog = siteData.statusLog || [];
            siteData.statusLog.push({ date: new Date().toISOString(), status: newStatus });
            await DB.putSiteData(siteData);
            await renderProjectList();
            await renderCalendar();
        }
    }
  async function handleFileUpload(event, type) {
        if (!currentJobNo) return;
        for (const file of event.target.files) {
            const dataUrl = await readFileAsDataURL(file);
            const fileObject = {
                jobNo: currentJobNo,
                source: 'site',
                type: type,
                name: (type === 'document' && DOMElements.docNameInput.value) ? `${DOMElements.docNameInput.value} (${file.name})` : file.name,
                fileType: file.type,
                dataUrl,
                timestamp: new Date().toISOString()
            };
            if (type === 'photo') {
                fileObject.uploadStatus = DOMElements.siteStatusSelect.value;
            }
            await DB.addFile(fileObject);
        }
        const galleryEl = type === 'photo' ? DOMElements.photoGallery : DOMElements.siteDocGallery;
        await renderFileGallery(galleryEl, 'site', type, true);
        if (type === 'document') DOMElements.docNameInput.value = '';
        event.target.value = '';
    }
    
    async function deleteFile(id, type, galleryEl) {
        if (!currentJobNo) return;
        if (confirm(`Are you sure you want to delete this ${type}?`)) {
            await DB.deleteFile(id);
            await renderFileGallery(galleryEl, 'site', type, true);
        }
    }

    // --- RENDERING ---
    async function renderProjectList() {
        const tbody = DOMElements.projectListBody;
        const allProjects = await DB.getAllProjects();
        const allSiteData = await DB.getAllSiteData();
        const siteDataMap = allSiteData.reduce((acc, u) => ({...acc, [u.jobNo]: u}), {});
        tbody.innerHTML = allProjects.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No projects loaded. Use "Load Project File".</td></tr>' : '';
        
        allProjects.forEach(p => {
            let siteData = siteDataMap[p.jobNo] || { status: 'Pending Start', progress: 0 };
            const progress = siteData.progress || 0;
            const row = tbody.insertRow();
            row.dataset.jobNo = p.jobNo;
            row.innerHTML = `
                <td>${p.jobNo}</td>
                <td>${p.projectDescription}<br><small>${p.clientName}</small></td>
                <td>${p.plotNo}</td>
                <td>
                    <span class="status-${siteData.status.toLowerCase().replace(/ /g, '-')}">${siteData.status}</span>
                    <div class="progress-bar-container" style="height:14px; margin-top:4px;"><div class="progress-bar" style="width:${progress}%; height:14px; font-size:0.7em;">${progress}%</div></div>
                </td>
            `;
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
            siteData = { jobNo: currentJobNo, status: 'Pending Start', progress: 0, boq: boqTemplate, mom: [], paymentCertificates: [], statusLog: [] };
            await DB.putSiteData(siteData);
        }

        DOMElements.detailsProjectName.textContent = project.projectDescription;
        DOMElements.detailsProjectInfo.textContent = `Job: ${project.jobNo} | Plot: ${project.plotNo}`;
        DOMElements.backToGlobalBtn.style.display = 'block';
        DOMElements.siteStatusSelect.value = siteData.status;
        
        await renderFileGallery(DOMElements.photoGallery, 'site', 'photo', true);
        await renderFileGallery(DOMElements.siteDocGallery, 'site', 'document', true);
        await renderFileGallery(DOMElements.masterDocGallery, 'master', null, false);
        await renderBoq();
        await renderMomList();
        await renderGanttChart();
        calendarDate = new Date();
        await renderCalendar();
        await renderResourceCalculator();
        
        toggleTabsForView(true);
    }
    
    function handleTabClick(e) {
        if (e.target.matches('.tab-button')) {
            document.querySelectorAll('#control-tabs-container .tab-button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`${e.target.dataset.tab}-tab`).classList.add('active');
        }
    }

   async function renderFileGallery(galleryEl, source, type, isDeletable) {
        galleryEl.innerHTML = '';
        if (!currentJobNo) return;
        let files = source === 'master' ? await DB.getFiles(currentJobNo, 'master') : (await DB.getFiles(currentJobNo, 'site')).filter(f => !type || f.type === type);
        if (files.length === 0) { galleryEl.innerHTML = `<p style="color:#888; font-style:italic;">No files found.</p>`; return; }
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

    function createThumbnail(file, isDeletable, type, galleryEl) {
        const thumbContainer = document.createElement('div');
        thumbContainer.className = `thumbnail-container ${isDeletable ? '' : 'read-only'}`;
        if (isDeletable) {
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'thumbnail-delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = (e) => { e.stopPropagation(); deleteFile(file.id, type, galleryEl); };
            thumbContainer.appendChild(deleteBtn);
        }
        let thumbnail;
        if (file.fileType.startsWith('image/')) {
            thumbnail = Object.assign(document.createElement('img'), { src: file.dataUrl, className: 'thumbnail' });
        } else if (file.fileType === 'application/pdf') {
            thumbnail = document.createElement('canvas');
            thumbnail.className = 'thumbnail';
            PDFGenerator.renderPdfThumbnail(thumbnail, file.dataUrl);
        } else {
            thumbnail = Object.assign(document.createElement('div'), { className: 'thumbnail file-icon', textContent: file.name.split('.').pop().toUpperCase().substring(0, 4) || 'FILE', title: file.name });
        }
        thumbContainer.appendChild(thumbnail);
        galleryEl.appendChild(thumbContainer);
    }
    
    // --- CALENDAR LOGIC ---
    async function renderCalendar() {
        DOMElements.monthYearDisplay.textContent = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const grid = DOMElements.calendarGridBody;
        grid.innerHTML = '';
        const allEvents = {};

        // NEW: Event helper now accepts an index for MoMs
        const addEvent = (date, type, text, color = null, momIndex = null) => {
            const dateKey = new Date(date).toDateString();
            if (!allEvents[dateKey]) allEvents[dateKey] = [];
            if (!allEvents[dateKey].some(e => e.type === type && e.text === text)) {
                allEvents[dateKey].push({ type, text, color, momIndex });
            }
        };

        if (currentJobNo) {
            const project = await DB.getProject(currentJobNo);
            const siteData = await DB.getSiteData(currentJobNo);
            (siteData.statusLog || []).forEach(log => addEvent(log.date, 'status', `Status: ${log.status}`));
            (siteData.mom || []).forEach((mom, index) => addEvent(mom.date, 'mom', `MoM: Ref ${mom.ref}`, null, index));
            if (project.projectType === 'Villa') {
                const dynamicSchedule = calculateDynamicSchedule(project);
                dynamicSchedule.forEach(task => {
                    const start = new Date(task.start + 'T00:00:00');
                    const end = new Date(task.end + 'T00:00:00');
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        addEvent(d, 'gantt-task', task.name);
                    }
                });
            }
        } else {
            const allProjects = await DB.getAllProjects();
            const allSiteData = await DB.getAllSiteData();
            const siteDataMap = allSiteData.reduce((acc, data) => ({ ...acc, [data.jobNo]: data }), {});
            for (const project of allProjects) {
                const color = getProjectColor(project.jobNo);
                const siteData = siteDataMap[project.jobNo];
                if (siteData) {
                    (siteData.statusLog || []).forEach(log => addEvent(log.date, 'status', `${project.jobNo}: ${log.status}`, color));
                    (siteData.mom || []).forEach((mom, index) => {
                        // In global view, we can't easily link to the MoM modal, so we just display it.
                        addEvent(mom.date, 'mom', `${project.jobNo}: MoM ${mom.ref}`, color);
                    });
                }
                if (project.projectType === 'Villa') { /* ... unchanged ... */ }
            }
        }

        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const startDayOfWeek = new Date(year, month, 1).getDay();
        const currentDay = new Date(year, month, 1 - startDayOfWeek);

        for (let i = 0; i < 42; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            const dayKey = currentDay.toDateString();
            if (currentDay.getMonth() !== month) dayCell.classList.add('other-month');

            dayCell.innerHTML = `<div class="day-number">${currentDay.getDate()}</div><div class="day-events"></div>`;
            const eventsContainer = dayCell.querySelector('.day-events');
            
            if(allEvents[dayKey]) {
                allEvents[dayKey].forEach(event => {
                    const eventEl = document.createElement('span');
                    eventEl.className = `${event.type.includes('gantt') ? 'event-bar' : 'event-dot'} ${event.type}`;
                    eventEl.textContent = event.text;
                    eventEl.title = event.text;
                    if(event.color) eventEl.style.backgroundColor = event.color;
                    // NEW: Add data attribute and class for clickable MoM events
                    if (event.type === 'mom' && event.momIndex !== null) {
                        eventEl.dataset.momIndex = event.momIndex;
                        eventEl.classList.add('clickable-event');
                    }
                    eventsContainer.appendChild(eventEl);
                });
            }
            grid.appendChild(dayCell);
            currentDay.setDate(currentDay.getDate() + 1);
        }
    }
    
    function changeMonth(offset) {
        calendarDate.setMonth(calendarDate.getMonth() + offset);
        renderCalendar();
    }
    
    // --- ALL OTHER FUNCTIONS (MoM, BOQ, Tools, Forms) ---
    function openMomModal(momIndex = null) {
        const isNew = momIndex === null;
        DOMElements.momModalTitle.textContent = isNew ? "Create New Minutes of Meeting" : "Edit Minutes of Meeting";
        DOMElements.momEditIndex.value = isNew ? '' : momIndex;
        DOMElements.deleteMomBtn.style.display = isNew ? 'none' : 'inline-block';
        DOMElements.momRef.value = ''; DOMElements.momDate.value = new Date().toISOString().split('T')[0]; DOMElements.momLocation.value = 'Site Office'; DOMElements.momAttendeesTbody.innerHTML = ''; DOMElements.momStatusSummary.value = ''; DOMElements.momActionsTbody.innerHTML = ''; DOMElements.momNextMeeting.value = ''; DOMElements.momNextMeetingNotes.value = '(To be confirmed a day before)';
        if (!isNew) {
            DB.getSiteData(currentJobNo).then(siteData => {
                const mom = siteData.mom[momIndex];
                DOMElements.momRef.value = mom.ref || ''; DOMElements.momDate.value = mom.date || ''; DOMElements.momLocation.value = mom.location || ''; DOMElements.momStatusSummary.value = mom.summary || ''; DOMElements.momNextMeeting.value = mom.nextMeeting || ''; DOMElements.momNextMeetingNotes.value = mom.nextMeetingNotes || '';
                (mom.attendees || []).forEach(p => addAttendeeRow(p.name, p.position, p.company));
                (mom.actions || []).forEach(a => addActionRow(a.desc, a.by, a.date, a.status));
            });
        }
        DOMElements.momModal.style.display = 'flex';
    }
    async function saveMomData() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); siteData.mom = siteData.mom || []; const momIndex = DOMElements.momEditIndex.value; const attendees = Array.from(DOMElements.momAttendeesTbody.rows).map(row => ({ name: row.cells[0].querySelector('input').value, position: row.cells[1].querySelector('input').value, company: row.cells[2].querySelector('input').value })); const actions = Array.from(DOMElements.momActionsTbody.rows).map(row => ({ desc: row.cells[0].querySelector('input').value, by: row.cells[1].querySelector('input').value, date: row.cells[2].querySelector('input').value, status: row.cells[3].querySelector('input').value })); const momData = { ref: DOMElements.momRef.value, date: DOMElements.momDate.value, location: DOMElements.momLocation.value, attendees, summary: DOMElements.momStatusSummary.value, actions, nextMeeting: DOMElements.momNextMeeting.value, nextMeetingNotes: DOMElements.momNextMeetingNotes.value }; if (momIndex === '') { siteData.mom.push(momData); } else { siteData.mom[parseInt(momIndex)] = momData; } await DB.putSiteData(siteData); DOMElements.momModal.style.display = 'none'; await renderMomList(); await renderCalendar(); }
    async function deleteMomData() { if (!confirm("Are you sure you want to delete this MoM?")) return; const momIndex = parseInt(DOMElements.momEditIndex.value); if (!isNaN(momIndex)) { const siteData = await DB.getSiteData(currentJobNo); siteData.mom.splice(momIndex, 1); await DB.putSiteData(siteData); DOMElements.momModal.style.display = 'none'; await renderMomList(); await renderCalendar(); } }
    function addAttendeeRow(name = '', position = '', company = '') { const row = DOMElements.momAttendeesTbody.insertRow(); row.innerHTML = `<td><input type="text" value="${name}"></td><td><input type="text" value="${position}"></td><td><input type="text" value="${company}"></td><td><button class="small-button danger-button" onclick="this.closest('tr').remove()">✕</button></td>`; }
    function addActionRow(desc = '', by = '', date = '', status = '') { const row = DOMElements.momActionsTbody.insertRow(); row.innerHTML = `<td><input type="text" value="${desc}"></td><td><input type="text" value="${by}"></td><td><input type="date" value="${date}"></td><td><input type="text" value="${status}"></td><td><button class="small-button danger-button" onclick="this.closest('tr').remove()">✕</button></td>`; }
    async function renderMomList() { DOMElements.momList.innerHTML = ''; if (!currentJobNo) return; let siteData = await DB.getSiteData(currentJobNo); if (!siteData.mom || siteData.mom.length === 0) { DOMElements.momList.innerHTML = '<p>No Minutes of Meeting recorded.</p>'; } else { let html = '<ul class="mom-history-list">'; siteData.mom.sort((a, b) => new Date(b.date) - new Date(a.date)); siteData.mom.forEach((mom, index) => { html += `<li><a href="#" class="edit-mom-link clickable-event" data-index="${index}"><strong>${new Date(mom.date).toLocaleDateString()} (Ref: ${mom.ref || 'N/A'})</strong></a> - ${(mom.summary || '').substring(0, 80)}...</li>`; }); html += '</ul>'; DOMElements.momList.innerHTML = html; } }
   async function renderGanttChart() { if (!currentJobNo || !UrbanAxisSchedule) return; const project = await DB.getProject(currentJobNo); UrbanAxisSchedule.render(project, VILLA_SCHEDULE_TEMPLATE); }
   // --- BOQ & PAYMENT LOGIC (UNCHANGED from previous complete version) ---
    async function renderBoq() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); const boq = siteData.boq || []; const tbody = DOMElements.boqTableBody; tbody.innerHTML = ''; boq.forEach((item, index) => { const amount = (item.qty || 0) * (item.rate || 0); const totalDonePerc = (item.prev_perc || 0) + (item.curr_perc || 0); const workDoneValue = amount * (totalDonePerc / 100); const row = tbody.insertRow(); row.dataset.index = index; row.innerHTML = ` <td contenteditable="true" data-field="id">${item.id || ''}</td> <td contenteditable="true" data-field="description">${item.description}</td> <td contenteditable="true" data-field="unit">${item.unit}</td> <td contenteditable="true" data-field="qty" class="editable-cell">${item.qty || 0}</td> <td contenteditable="true" data-field="rate" class="editable-cell">${(item.rate || 0).toFixed(2)}</td> <td class="boq-amount" contenteditable="false">${amount.toFixed(2)}</td> <td contenteditable="false">${item.prev_perc || 0}%</td> <td contenteditable="true" data-field="curr_perc" class="editable-cell">${item.curr_perc || 0}</td> <td class="boq-total-perc" contenteditable="false">${totalDonePerc.toFixed(0)}%</td> <td class="boq-work-done-value" contenteditable="false">${workDoneValue.toFixed(2)}</td> <td><button class="delete-boq-item-btn small-button danger-button">✕</button></td> `; }); await updateBoqTotals(); }
    async function handleBoqChange(e) { const target = e.target; const row = target.closest('tr'); if (!row) return; const index = parseInt(row.dataset.index); const siteData = await DB.getSiteData(currentJobNo); const item = siteData.boq[index]; if (!item) return; if (target.matches('.delete-boq-item-btn')) { if (confirm(`Are you sure you want to delete item: ${item.description}?`)) { siteData.boq.splice(index, 1); await DB.putSiteData(siteData); await renderBoq(); } return; } if (target.hasAttribute('contenteditable')) { const field = target.dataset.field; let value = target.textContent; if (['qty', 'rate', 'curr_perc'].includes(field)) { let numValue = parseFloat(value) || 0; if (field === 'curr_perc') { const prevPerc = item.prev_perc || 0; if (numValue < 0) numValue = 0; if (numValue > (100 - prevPerc)) numValue = 100 - prevPerc; target.textContent = numValue; } item[field] = numValue; } else { item[field] = value; } const amount = (item.qty || 0) * (item.rate || 0); const totalDonePerc = (item.prev_perc || 0) + (item.curr_perc || 0); const workDoneValue = amount * (totalDonePerc / 100); item.amount = amount; row.querySelector('.boq-amount').textContent = amount.toFixed(2); row.querySelector('.boq-total-perc').textContent = `${totalDonePerc.toFixed(0)}%`; row.querySelector('.boq-work-done-value').textContent = workDoneValue.toFixed(2); await DB.putSiteData(siteData); await updateBoqTotals(); } }
    async function handleAddBoqItem() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); siteData.boq.push({ id: "V.O.", description: "New Variation Item", unit: "", qty: 0, rate: 0, amount: 0, prev_perc: 0, curr_perc: 0 }); await DB.putSiteData(siteData); await renderBoq(); }
    async function updateBoqTotals() { if (!currentJobNo) return; const siteData = await DB.getSiteData(currentJobNo); if (!siteData || !siteData.boq) return; const boq = siteData.boq; const totalValue = boq.reduce((sum, item) => sum + (item.amount || 0), 0); const totalWorkDoneValue = boq.reduce((sum, item) => { const totalPerc = (item.prev_perc || 0) + (item.curr_perc || 0); return sum + ((item.amount || 0) * (totalPerc / 100)); }, 0); const overallProgress = totalValue > 0 ? Math.round((totalWorkDoneValue / totalValue) * 100) : 0; DOMElements.boqTotalValue.textContent = `${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2})} AED`; DOMElements.boqWorkDoneValue.textContent = `${totalWorkDoneValue.toLocaleString('en-US', {minimumFractionDigits: 2})} AED`; DOMElements.boqProgressPercentage.textContent = `${overallProgress}%`; DOMElements.boqProgressBar.style.width = `${overallProgress}%`; DOMElements.boqProgressBar.textContent = `${overallProgress}%`; if (siteData.progress !== overallProgress) { siteData.progress = overallProgress; await DB.putSiteData(siteData); await renderProjectList(); } }
   // --- Tools Logic ---
    async function renderResourceCalculator() {
        const tbody = DOMElements.resourceCalculatorBody;
        tbody.innerHTML = '';
        if (!currentJobNo) return;
        const project = await DB.getProject(currentJobNo);
        const schedule = project.projectType === 'Villa' ? calculateDynamicSchedule(project) : VILLA_SCHEDULE_TEMPLATE;
        
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
    function calculateDynamicSchedule(projectData) { const projectStartDate = new Date(projectData.agreementDate); const constructionMonths = parseFloat(projectData.constructionDuration) || 14; const scaleFactor = (constructionMonths * 30.4) / 577; return VILLA_SCHEDULE_TEMPLATE.map(task => { const newStartOffset = Math.round(task.startOffset * scaleFactor); const newDuration = Math.max(1, Math.round(task.duration * scaleFactor)); const startDate = new Date(projectStartDate); startDate.setDate(startDate.getDate() + newStartOffset); const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + newDuration - 1); return { ...task, start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0], duration: newDuration }; }); }
    async function handleFormButtonClick(e) { if(!currentJobNo) { alert("Please select a project first."); return; } if (!e.target.matches('.form-btn')) return; const formType = e.target.dataset.form; const formTitle = e.target.textContent; try { const response = await fetch(`forms/${formType}.html`); if (!response.ok) throw new Error(`Form not found: forms/${formType}.html. Please create this file.`); let html = await response.text(); const project = await DB.getProject(currentJobNo); DOMElements.formModalTitle.textContent = formTitle; if (project) { html = html.replace(/{{PROJECT_NAME}}/g, project.projectDescription || 'N/A').replace(/{{CLIENT_NAME}}/g, project.clientName || 'N/A').replace(/{{PLOT_NO}}/g, project.plotNo || 'N/A').replace(/{{DATE}}/g, new Date().toLocaleDateString('en-GB')); } DOMElements.formModalBody.innerHTML = html; DOMElements.formModal.style.display = 'flex'; } catch(error) { alert(error.message); console.error(error); } }
    async function handleSaveFormAsPdf() { if (!currentJobNo || !PDFGenerator) { alert("PDF generation failed."); return; } await PDFGenerator.generate({ previewId: 'form-modal-body', projectJobNo: currentJobNo }); }

    // --- NEW: Centralized Click Handler for Events ---
    function handleEventClick(e) {
        let momIndex = null;
        if (e.target.matches('.edit-mom-link')) {
            e.preventDefault();
            momIndex = e.target.dataset.index;
        } else if (e.target.matches('.event-dot.mom')) {
            momIndex = e.target.dataset.momIndex;
        }

        if (momIndex !== null) {
            const index = parseInt(momIndex, 10);
            if (!isNaN(index)) {
                openMomModal(index);
            }
        }
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        DOMElements.loadDataBtn.addEventListener('click', () => document.getElementById('project-file-input').click());
        document.getElementById('project-file-input').addEventListener('change', handleProjectFileImport);
        DOMElements.saveDataBtn.addEventListener('click', saveSiteDataToXml);
        DOMElements.projectListBody.addEventListener('click', handleProjectSelect);
        DOMElements.siteStatusSelect.addEventListener('change', updateStatus);
        DOMElements.backToGlobalBtn.addEventListener('click', showGlobalView);
        DOMElements.photoUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'photo'));
        DOMElements.docUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'document'));
        DOMElements.controlTabsContainer.addEventListener('click', handleTabClick);
        const formsTab = document.getElementById('forms-tab');
        if (formsTab) formsTab.addEventListener('click', handleFormButtonClick);
        const boqTab = document.getElementById('boq-tab');
        boqTab.addEventListener('blur', handleBoqChange, true);
        boqTab.addEventListener('click', handleBoqChange);
        boqTab.addEventListener('click', (e) => { if (e.target.matches('#add-boq-item-btn')) handleAddBoqItem(); });
        
        // NEW: Consolidated event listener on the details view
        DOMElements.detailsView.addEventListener('click', handleEventClick);

        DOMElements.newMomBtn.addEventListener('click', () => openMomModal(null));
        DOMElements.momModalCloseBtn.addEventListener('click', () => DOMElements.momModal.style.display = 'none');
        DOMElements.saveMomDataBtn.addEventListener('click', saveMomData);
        DOMElements.deleteMomBtn.addEventListener('click', deleteMomData);
        DOMElements.addAttendeeBtn.addEventListener('click', () => addAttendeeRow());
        DOMElements.addActionBtn.addEventListener('click', () => addActionRow());
        
        DOMElements.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
        DOMElements.nextMonthBtn.addEventListener('click', () => changeMonth(1));
        DOMElements.resourceDayRate.addEventListener('input', updateResourceTotals);
        DOMElements.resourceCalculatorBody.addEventListener('input', e => { if (e.target.matches('.man-days-input')) { updateResourceTotals(); } });
    }

    // --- START ---
    main();
});