

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONFIG ---
    let currentProjectJobNo = null;
    let DOMElements = {};
    let showAllInvoices = false;
    let lastScrumCheck = new Date(); // For periodic checks
    let currentInvoiceIndex = null; // Track selected invoice for preview
    
     // --- BULLETIN MODULE ---
    const Bulletin = (() => {
        async function log(title, body) {
            const newItem = {
                title,
                body,
                timestamp: new Date()
            };
            await DB.addBulletinItem(newItem);
            await render();
        }

        async function render() {
            const items = await DB.getBulletinItems(20); // Get latest 20 items
            const container = DOMElements['bulletin-list'];
            if (!container) return;

            if (items.length === 0) {
                container.innerHTML = '<p style="color: #888; text-align: center; padding-top: 20px;">No recent activity.</p>';
                return;
            }

            container.innerHTML = items.map(item => `
                <div class="bulletin-item">
                    <div class="bulletin-item-header">
                        <span class="bulletin-item-title">${item.title}</span>
                        <span class="bulletin-item-time">${new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div class="bulletin-item-body">${item.body}</div>
                </div>
            `).join('');
        }

        return { log, render };
    })();
    
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

            DOMElements['dash-cal-month-year'].textContent = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

            const gridBody = DOMElements['dash-cal-body'];
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
                
                if (currentDay.getMonth() !== month) {
                    dayCell.classList.add('other-month');
                }
                
                if (currentDay.getTime() === today.getTime()) {
                    dayCell.classList.add('today');
                }

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
    
    const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(Math.round(num || 0));
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
            initResizer();
            populateStaticControls();
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

    function showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const viewToShow = DOMElements[viewId];
        if(viewToShow) viewToShow.classList.add('active');
    }

    function showDashboard() {
        currentProjectJobNo = null;
        currentInvoiceIndex = null;
        showView('dashboard-view');
        renderDashboard();
    }
    
    function showProjectView() {
        showView('project-view');
    }

    async function showDesignStudio() {
        showView('design-view');
        // MODIFICATION: Call the summary panel renderer
        await renderDesignSummary(); 
        const projects = await DB.getAllProjects();
        const designProjects = projects.filter(p => !['Modification', 'AOR Service'].includes(p.scopeOfWorkType));
        
        const selector = DOMElements['design-project-selector'];
        selector.innerHTML = '<option value="">-- Select a Project --</option>';
        designProjects.forEach(p => {
            selector.innerHTML += `<option value="${p.jobNo}">${p.jobNo} - ${p.projectDescription}</option>`;
        });

        const boardButton = DOMElements['design-view'].querySelector('[data-view="board"]');
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
    async function handleDesignProjectSelect() {
        const activeTabButton = DOMElements['design-view'].querySelector('.tabs .tab-button.active');
        handleDesignViewSwitch({ target: activeTabButton }); // Re-render the current view for the selected project
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
    
    // --- (The rest of the file is the same as the previous full version) ---
    // ... all other functions from handleScheduleUpdate to the end ...
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

    // --- DESIGN STUDIO ---
    async function showDesignStudio() {
        showView('design-view');
        const projects = await DB.getAllProjects();
        const designProjects = projects.filter(p => !['Modification', 'AOR Service'].includes(p.scopeOfWorkType));
        
        const selector = DOMElements['design-project-selector'];
        selector.innerHTML = '<option value="">-- Select a Design Project --</option>';
        designProjects.forEach(p => {
            selector.innerHTML += `<option value="${p.jobNo}">${p.jobNo} - ${p.projectDescription}</option>`;
        });

        // Default to Scrum Board view when first opening Design Studio
        const boardButton = DOMElements['design-view'].querySelector('[data-view="board"]');
        if (boardButton) {
            handleDesignViewSwitch({ target: boardButton });
        }
    }
async function handleScheduleUpdate(updatedTask) {
        if (!currentProjectJobNo) return;
        const project = await DB.getProject(currentProjectJobNo);
        if (!project) return;

        project.scheduleTasks = project.scheduleTasks || [];
        
        const taskIndex = project.scheduleTasks.findIndex(t => t.id === updatedTask.id);
        if (taskIndex > -1) {
            project.scheduleTasks[taskIndex] = { ...project.scheduleTasks[taskIndex], ...updatedTask };
        } else {
            project.scheduleTasks.push(updatedTask);
        }

        await DB.putProject(project);
        Bulletin.log('Schedule Updated', `Construction schedule for <strong>${currentProjectJobNo}</strong> was modified.`);
        updateActivePreview('villa-schedule');
    }

    async function saveCurrentProject() {
        if (!currentProjectJobNo) return;
        const uiData = getFormDataFromUI();
        const existingProject = await DB.getProject(currentProjectJobNo) || {};
        
        if (existingProject.projectStatus !== uiData.projectStatus) {
            Bulletin.log('Project Status Changed', `Status for project <strong>${currentProjectJobNo}</strong> changed to <strong>${uiData.projectStatus}</strong>.`);
        }

        const projectToSave = { 
            ...existingProject, 
            ...uiData, 
            jobNo: currentProjectJobNo 
        };

        await DB.putProject(projectToSave);
        alert(`Project ${currentProjectJobNo} saved successfully.`);
        await renderDashboard();
    }

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

    async function renderDashboard() {
        const allProjects = await DB.getAllProjects();
        const allSiteData = await DB.getAllSiteData();
        const siteDataMap = new Map(allSiteData.map(data => [data.jobNo, data]));

        await updateDashboardSummary(allProjects);

        const tbody = DOMElements['project-list-body'];
        tbody.innerHTML = '';
        if (allProjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No projects found. Use "Import Master" to add projects.</td></tr>';
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
            const siteData = siteDataMap.get(p.jobNo) || {};
            const siteStatus = siteData.status || 'N/A';
            const progress = siteData.progress || 0;
            const officeStatusClass = (p.projectStatus || 'pending').toLowerCase().replace(/ /g, '-');
            const siteStatusClass = siteStatus.toLowerCase().replace(/ /g, '-');

            const statusHtml = `<div>Office: <span class="status-${officeStatusClass}">${p.projectStatus || 'Pending'}</span></div> <div style="margin-top:4px;">Site: <span class="status-${siteStatusClass}">${siteStatus}</span></div> <div class="progress-bar-container" style="height:14px; margin-top:4px;"><div class="progress-bar" style="width:${progress}%; height:14px; font-size:0.7em;">${progress}%</div></div>`;
            const masterFiles = await DB.getFiles(p.jobNo, 'master');
            const affectionPlanFile = masterFiles.find(f => f.subCategory === 'affection_plan');
            const docHtml = affectionPlanFile ? `<a href="#" class="file-link" data-file-id="${affectionPlanFile.id}">Affection Plan</a>` : `<span class="file-link not-available">Affection Plan</span>`;
            
            const invoicesToDisplay = showAllInvoices ? (p.invoices || []) : (p.invoices || []).filter(inv => inv.status === 'Raised' || inv.status === 'Pending');
            const invoiceDetailsHtml = invoicesToDisplay.length > 0 ? invoicesToDisplay.map(inv => `<div class="invoice-row status-${(inv.status || '').toLowerCase()}"><span><b>${inv.no}</b></span><span>${inv.date}</span><span style="font-weight:bold; text-align:right;">${formatCurrency(parseFloat(inv.amount || 0))}</span><span>(${inv.status})</span></div>`).join('') : (showAllInvoices ? 'No invoices' : 'No pending invoices');

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

        DOMElements['pending-invoices-count'].textContent = pendingInvoiceCount;
        DOMElements['pending-invoices-amount'].textContent = `AED ${formatCurrency(totalPendingAmount)}`;
        DOMElements['last-paid-amount'].textContent = lastPaidInvoice ? `AED ${formatCurrency(lastPaidInvoice.amount)}` : 'N/A';
        DOMElements['on-hold-amount'].textContent = `AED ${formatCurrency(totalOnHoldAmount)}`;
        
        const allMasterFiles = await DB.getAllFiles('master');
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        const expiringDocs = allMasterFiles.filter(file => {
            if (!file.expiryDate) return false;
            const expiry = new Date(file.expiryDate);
            return expiry >= now && expiry <= thirtyDaysFromNow;
        });
        DOMElements['expiring-documents-count'].textContent = expiringDocs.length;
    }

    async function showPendingInvoicesModal() {
        const allProjects = await DB.getAllProjects();
        const pendingInvoices = allProjects.flatMap(p => 
            (p.invoices || [])
            .filter(inv => inv.status === 'Raised' || inv.status === 'Pending')
            .map(inv => ({...inv, jobNo: p.jobNo, clientName: p.clientName, projectDescription: p.projectDescription}))
        );

        const listEl = DOMElements['pending-invoice-list'];
        if (pendingInvoices.length === 0) {
            listEl.innerHTML = '<p>No pending invoices found.</p>';
        } else {
            let tableHtml = `<table class="output-table"><thead><tr><th>Inv No.</th><th>Project</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>`;
            pendingInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
            tableHtml += pendingInvoices.map(inv => `<tr>
                    <td>${inv.no}</td><td>${inv.projectDescription || inv.jobNo}</td><td>${inv.clientName}</td>
                    <td>${formatDate(inv.date)}</td><td style="text-align:right;">${formatCurrency(inv.amount)}</td>
                    <td><span class="status-${inv.status.toLowerCase()}">${inv.status}</span></td>
                </tr>`).join('');
            tableHtml += '</tbody></table>';
            listEl.innerHTML = tableHtml;
        }
        DOMElements['pending-invoice-modal'].style.display = 'flex';
    }

    async function showExpiringDocumentsModal() {
        const allFiles = await DB.getAllFiles(); // This might be slow; consider a more targeted query if performance degrades.
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

        const listEl = DOMElements['expiring-documents-list'];
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
                    <td>${formatDate(doc.expiryDate)}</td><td class="${daysLeftClass}">${daysLeft}</td>
                </tr>`;
            }).join('');
            tableHtml += '</tbody></table>';
            listEl.innerHTML = tableHtml;
        }
        DOMElements['expiring-documents-modal'].style.display = 'flex';
    }
    async function handleDesignProjectSelect() {
        const jobNo = DOMElements['design-project-selector'].value;
        const activeTabButton = DOMElements['design-view'].querySelector('.tabs .tab-button.active');
        handleDesignViewSwitch({ target: activeTabButton }); // Re-render the current view for the selected project
    }
   function showFilePreviewModal(file) {
        const container = DOMElements['file-preview-container'];
        container.innerHTML = '';
        let previewElement;

        if (file.fileType.startsWith('image/')) {
            previewElement = Object.assign(document.createElement('img'), { src: file.dataUrl });
        } else if (file.fileType === 'application/pdf') {
            previewElement = Object.assign(document.createElement('iframe'), { src: file.dataUrl, style: 'width: 80vw; height: 90vh; border: none;' });
        } else {
            previewElement = document.createElement('div');
            previewElement.style.padding = '40px';
            previewElement.innerHTML = `<h4>Preview not available.</h4><p><strong>File:</strong> ${file.name}</p><a href="${file.dataUrl}" download="${file.name}" class="primary-button">Download</a>`;
        }

        container.appendChild(previewElement);
        DOMElements['file-preview-modal'].style.display = 'flex';
    }
    
    function refreshCurrentPreview() {
        const activeTab = DOMElements.previewTabs?.querySelector('.tab-button.active');
        if (activeTab) updateActivePreview(activeTab.dataset.tab);
    }

    async function updateActivePreview(tabId) {
        // PREVIEW BUG FIX: Check if templates are loaded.
        if (typeof PROJECT_DOCUMENT_TEMPLATES === 'undefined' || typeof PROJECT_LETTER_TEMPLATES === 'undefined') {
            console.error("Template objects not found. Make sure project_document_formats.js and letter_formats.js are loaded correctly and do not have syntax errors.");
            return;
        }
        if (!currentProjectJobNo) return;

        const project = await DB.getProject(currentProjectJobNo);
        if (!project) return;
        
        const uiData = getFormDataFromUI();
        const fullData = { ...project, ...uiData, masterFiles: await DB.getFiles(currentProjectJobNo, 'master') };
        const feeDistribution = getFeeDistribution(fullData);

        const renderMap = {
            'brief-proposal': () => PROJECT_DOCUMENT_TEMPLATES.briefProposal(fullData, feeDistribution),
            'full-agreement': () => PROJECT_DOCUMENT_TEMPLATES.fullAgreement(fullData, feeDistribution),
            'assignment-order': () => PROJECT_DOCUMENT_TEMPLATES.assignmentOrder(fullData),
            'proforma': () => renderInvoiceDocuments(fullData.invoices?.[currentInvoiceIndex ?? fullData.invoices.length - 1]),
            'tax-invoice': () => renderInvoiceDocuments(fullData.invoices?.[currentInvoiceIndex ?? fullData.invoices.length - 1]),
            'receipt': () => renderInvoiceDocuments(fullData.invoices?.[currentInvoiceIndex ?? fullData.invoices.length - 1]),
            'tender-package': () => PROJECT_DOCUMENT_TEMPLATES.tenderPackage(fullData),
            'vendor-list': () => PROJECT_DOCUMENT_TEMPLATES.vendorList(fullData),
            'payment-certificate': () => renderPaymentCertificatePreview(null),
            'villa-schedule': () => {
                const scheduleData = UrbanAxisSchedule.calculateDynamicSchedule(fullData, CONTENT.VILLA_SCHEDULE_TEMPLATE, fullData.scheduleTasks);
                UrbanAxisSchedule.render(fullData, scheduleData, handleScheduleUpdate);
            },
            'project-letter': async () => {
                DOMElements['project-letter-preview'].innerHTML = await getProjectLetterHtmlPreview(project);
            }
        };

        const renderFunc = renderMap[tabId];
        if (renderFunc) {
            const content = await renderFunc();
            // For functions that render directly to DOM, content will be undefined.
            if (content !== undefined) {
                DOMElements[`${tabId}-preview`].innerHTML = content;
            }
        }
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
    
    async function handleEditProject(jobNo) {
        currentProjectJobNo = jobNo;
        currentInvoiceIndex = null; // Reset invoice selection
        const project = await DB.getProject(jobNo);
        if (project) {
            populateFormWithData(project);
            DOMElements['project-view-title'].textContent = `Editing Project: ${jobNo}`;
            showProjectView();
            await renderPaymentCertTab(project);
            
            DOMElements['project-view'].querySelectorAll('.document-category').forEach(container => {
                const category = container.querySelector('.upload-btn').dataset.category;
                renderMasterFileGallery(container, jobNo, category);
            });
        }
    }
    
    // ... (the rest of your app.js file remains largely the same)
    // I will only include the changed functions below for brevity
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
        if (!activePreviewTab) { alert('Could not determine active preview tab.'); return; }

        const previewId = activePreviewTab.dataset.tab + "-preview";
        const project = await DB.getProject(currentProjectJobNo);
        const previewElement = document.getElementById(previewId);
        const invoiceNo = previewElement ? previewElement.dataset.invoiceNo : null;
        const fileName = `${project.jobNo.replace(/\//g, '-')}_${activePreviewTab.dataset.tab}`;

        PDFGenerator.generate({
            previewId,
            projectJobNo: currentProjectJobNo,
            pageSize: DOMElements['page-size-selector'].value,
            fileName,
            watermarkText: invoiceNo
        });
    }

    async function handleNewProject() {
        const allProjects = await DB.getAllProjects();
        const nextId = allProjects.length > 0 ? Math.max(...allProjects.map(p => parseInt(p.jobNo.split('/').pop(), 10) || 0)) + 1 : 1;
        const jobNo = `RRC/${new Date().getFullYear()}/${String(nextId).padStart(3, '0')}`;
        const todayStr = new Date().toISOString().split('T')[0];
        
        let newProject = { 
            jobNo, 
            agreementDate: todayStr, 
            scope: {}, notes: {}, invoices: [], 
            remunerationType: 'percentage', vatRate: 5, designFeeSplit: 60, supervisionBillingMethod: 'monthly', 
            feeMilestonePercentages: {}, scheduleTasks: []
        };
       // MODIFICATION: Add dateAdded to new scrum tasks
        const scrumTasks = DESIGN_SCRUM_TEMPLATE.map(task => ({
            ...task,
            status: 'Up Next',
            assigneeId: null,
            dueDate: null,
            startDate: null,
            completedDate: null,
            dateAdded: todayStr // Set creation date
        }));
        await DB.putScrumData({ jobNo, tasks: scrumTasks });
        
        
        CONTENT.FEE_MILESTONES.forEach(item => newProject.feeMilestonePercentages[item.id] = item.defaultPercentage);
        
        newProject.scheduleTasks = UrbanAxisSchedule.calculateDynamicSchedule(newProject, CONTENT.VILLA_SCHEDULE_TEMPLATE, []);

        currentProjectJobNo = jobNo;
        currentInvoiceIndex = null;
        populateFormWithData(newProject);
        DOMElements['project-view-title'].textContent = `Creating New Project: ${jobNo}`;
        showProjectView();
        DOMElements['documents-tab'].querySelectorAll('.gallery-grid').forEach(grid => { grid.innerHTML = '<p>Please save the project before uploading documents.</p>'; });
        Bulletin.log('New Project Created', `Project <strong>${jobNo}</strong> has been created.`);
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
    async function renderInvoiceDocuments(invoiceData) {
        if (typeof PROJECT_DOCUMENT_TEMPLATES === 'undefined') return;
        const project = await DB.getProject(currentProjectJobNo);
        if (!project) return;
    
        const proformaEl = DOMElements['proforma-preview'];
        const taxInvoiceEl = DOMElements['tax-invoice-preview'];
        const receiptEl = DOMElements['receipt-preview'];
    
        if (!invoiceData) {
            const placeholder = `<div style="padding: 20px; text-align: center;">Select an invoice from the history to view its preview.</div>`;
            [proformaEl, taxInvoiceEl, receiptEl].forEach(el => {
                el.innerHTML = placeholder;
                delete el.dataset.invoiceNo;
            });
            return;
        }
    
        proformaEl.innerHTML = PROJECT_DOCUMENT_TEMPLATES.genericInvoice(invoiceData, project, project.invoices, 'PROFORMA INVOICE', false);
        taxInvoiceEl.innerHTML = PROJECT_DOCUMENT_TEMPLATES.genericInvoice(invoiceData, project, project.invoices, 'TAX INVOICE', true);
        receiptEl.innerHTML = PROJECT_DOCUMENT_TEMPLATES.receipt(invoiceData, project);
    
        [proformaEl, taxInvoiceEl, receiptEl].forEach(el => el.dataset.invoiceNo = invoiceData.no);
    }
    
    function updateSupervisionBillingView() {
        const method = document.querySelector('input[name="supervisionBillingMethod"]:checked')?.value;
        if(DOMElements['supervision-billing-monthly-container']) DOMElements['supervision-billing-monthly-container'].style.display = method === 'monthly' ? 'block' : 'none';
        if(DOMElements['supervision-billing-progress-container']) DOMElements['supervision-billing-progress-container'].style.display = method === 'progress' ? 'block' : 'none';
        if(DOMElements['prorata-percentage-group']) DOMElements['prorata-percentage-group'].style.display = method === 'progress' ? 'block' : 'none';
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
    
    async function renderPaymentCertificatePreview(certData) {
        if (!certData) {
             DOMElements['payment-certificate-preview'].innerHTML = `<div style="padding: 20px; text-align: center;">Generate or select a certificate to view its preview.</div>`;
             return;
        }
        const project = await DB.getProject(currentProjectJobNo);
        DOMElements['payment-certificate-preview'].innerHTML = PROJECT_DOCUMENT_TEMPLATES.paymentCertificate(certData, project);
    }
    function renderMasterVendorSearch(searchTerm = '') {
        const tbody = DOMElements['vendor-search-results-body'];
        if (!tbody || typeof VENDOR_LIST === 'undefined') return;

        tbody.innerHTML = '';
        const lowerCaseSearchTerm = searchTerm.trim().toLowerCase();
        if (lowerCaseSearchTerm.length < 2) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Type 2 or more characters to search...</td></tr>';
            return;
        }

        let htmlContent = '';
        let resultsFound = false;

        for (const category in VENDOR_LIST) {
            VENDOR_LIST[category].forEach(item => {
                item.manufacturers.forEach(manufacturer => {
                    const itemDescriptionMatches = item.item.toLowerCase().includes(lowerCaseSearchTerm);
                    const manufacturerMatches = manufacturer.toLowerCase().includes(lowerCaseSearchTerm);

                    if (itemDescriptionMatches || manufacturerMatches) {
                        resultsFound = true;
                        htmlContent += `
                            <tr>
                                <td>${category}</td>
                                <td>${item.item}</td>
                                <td>${manufacturer}</td>
                                <td>
                                    <button class="add-vendor-btn secondary-button small-btn" 
                                        data-category="${category}" 
                                        data-item="${item.item}" 
                                        data-manufacturer="${manufacturer}">+ Add</button>
                                </td>
                            </tr>
                        `;
                    }
                });
            });
        }

        if (!resultsFound) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No vendors found matching your search.</td></tr>';
        } else {
            tbody.innerHTML = htmlContent;
        }
    }

    function renderProjectVendorList(selectedVendors = []) {
        const tbody = DOMElements['project-vendor-list-body'];
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (selectedVendors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No vendors selected for this project yet.</td></tr>';
            return;
        }

        selectedVendors.forEach((vendor, index) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${vendor.category}</td>
                <td>${vendor.item}</td>
                <td>${vendor.manufacturer}</td>
                <td><button class="remove-vendor-btn danger-button small-btn" data-index="${index}">Remove</button></td>
            `;
        });
    }

    function handleVendorTabActions(e) {
        if (e.target.matches('.add-vendor-btn')) {
            const button = e.target;
            const newVendor = {
                category: button.dataset.category,
                item: button.dataset.item,
                manufacturer: button.dataset.manufacturer
            };
            
            const currentVendors = getSelectedVendorsFromUI();
            currentVendors.push(newVendor);
            renderProjectVendorList(currentVendors); // Re-render the project list

        } else if (e.target.matches('.remove-vendor-btn')) {
            e.target.closest('tr').remove();
            // Re-render to update indices if needed, though simple removal is often enough
            const currentVendors = getSelectedVendorsFromUI();
            renderProjectVendorList(currentVendors);
        }
    }

    function getSelectedVendorsFromUI() {
        const vendors = [];
        const rows = DOMElements['project-vendor-list-body'].querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 4) { // Ensure it's a data row, not a placeholder
                vendors.push({
                    category: cells[0].textContent,
                    item: cells[1].textContent,
                    manufacturer: cells[2].textContent,
                });
            }
        });
        return vendors;
    }
    function getFormDataFromUI() {
        const data = { scope: {}, notes: {}, feeMilestonePercentages: {} };
        const stringFields = ['jobNo', 'agreementDate', 'projectStatus', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn', 'projectDescription', 'plotNo', 'area', 'scopeOfWorkType', 'projectType', 'designDuration', 'constructionDuration'];
        const floatFields = ['builtUpArea', 'vatRate', 'lumpSumFee', 'constructionCostRate', 'consultancyFeePercentage', 'designFeeSplit', 'extendedSupervisionFee'];
        stringFields.forEach(id => data[id] = DOMElements[id]?.value);
        floatFields.forEach(id => data[id] = parseFloat(DOMElements[id]?.value) || 0);
        data.otherAuthority = DOMElements.authority?.value === 'Other' ? DOMElements.otherAuthority.value : '';
        data.otherScopeType = DOMElements.scopeOfWorkType?.value === 'Other' ? DOMElements.otherScopeType.value : '';
        data.remunerationType = document.querySelector('input[name="remunerationType"]:checked')?.value;
        data.supervisionBillingMethod = document.querySelector('input[name="supervisionBillingMethod"]:checked')?.value;
        for (const section in CONTENT.SCOPE_DEFINITIONS) { 
            if (!/^[0-9\.]+$/.test(section)) continue; 
            data.scope[section] = {}; 
            CONTENT.SCOPE_DEFINITIONS[section].forEach(item => { 
                const cb = document.getElementById(`scope-${item.id}`);
                if(cb) data.scope[section][item.id] = cb.checked; 
            }); 
        }
        CONTENT.NOTES.forEach(item => { const cb = document.getElementById(item.id); if(cb) data.notes[item.id] = cb.checked; });
        CONTENT.FEE_MILESTONES.forEach(item => { const input = document.getElementById(`fee-perc-${item.id}`); if(input) data.feeMilestonePercentages[item.id] = parseFloat(input.value) || 0; });
        // MODIFICATION: Add logic to read selected vendors from the UI
        data.selectedVendors = getSelectedVendorsFromUI();
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
renderProjectVendorList(project.selectedVendors || []);
        updateRemunerationView();
        renderInvoicingTab(project);
 updateCumulativePercentages();
        const activePreviewTab = DOMElements.previewTabs.querySelector('.tab-button.active');
        if (activePreviewTab) {
            updateActivePreview(activePreviewTab.dataset.tab);
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
   // ... (rest of functions remain the same)

    function setupEventListeners() {
        // ... all previous listeners
          // MODIFICATION: Add new listeners for the vendor tab
        DOMElements['vendor-master-search']?.addEventListener('input', (e) => renderMasterVendorSearch(e.target.value));
        DOMElements['vendors-tab']?.addEventListener('click', handleVendorTabActions);
        // --- MODIFICATION START: Update/add listeners for new filtering ---
        DOMElements['department-filter']?.addEventListener('change', applyScrumBoardFilters);
        DOMElements['staff-filter']?.addEventListener('change', applyScrumBoardFilters);
       DOMElements['design-project-selector']?.addEventListener('change', handleDesignProjectSelect);

        // --- Invoice History Click ---
        DOMElements['invoicing-tab']?.addEventListener('click', async (e) => {
            if (e.target.matches('.view-invoice-link')) {
                e.preventDefault();
                const row = e.target.closest('tr');
                if (!row) return;
                
                currentInvoiceIndex = parseInt(row.dataset.invoiceIndex);
                const project = await DB.getProject(currentProjectJobNo);
                const invoiceData = project.invoices[currentInvoiceIndex];

                if (invoiceData) {
                    renderInvoiceDocuments(invoiceData);
                    DOMElements.previewTabs.querySelector('[data-tab="proforma"]').click();
                }
            }
        });

        // Main Navigation
        DOMElements['design-studio-btn']?.addEventListener('click', showDesignStudio);
        DOMElements['back-to-dashboard-btn']?.addEventListener('click', showDashboard);
        DOMElements['back-to-dashboard-btn-from-design']?.addEventListener('click', showDashboard);

        // Dashboard Controls
        DOMElements['load-from-file-btn']?.addEventListener('click', () => DOMElements['xml-file-input']?.click());
        DOMElements['xml-file-input']?.addEventListener('change', handleProjectFileImport);
        DOMElements['load-site-update-btn']?.addEventListener('click', () => DOMElements['site-update-file-input']?.click());
        DOMElements['site-update-file-input']?.addEventListener('change', handleSiteUpdateImport);
        DOMElements['save-to-file-btn']?.addEventListener('click', handleFileExport);
        DOMElements['new-project-btn']?.addEventListener('click', handleNewProject);
        DOMElements['search-box']?.addEventListener('input', renderDashboard);
        DOMElements['toggle-invoices-btn']?.addEventListener('click', () => {
            showAllInvoices = !showAllInvoices;
            DOMElements['toggle-invoices-btn'].textContent = showAllInvoices ? 'Show Pending Invoices' : 'Show All Invoices';
            renderDashboard();
        });
    DOMElements['fee-milestone-group']?.addEventListener('input', (e) => {
            if (e.target.matches('.milestone-percentage-input')) {
                updateCumulativePercentages();
            }
        });
        // Project List Event Delegation
        DOMElements['project-list-body']?.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            if (!row?.dataset?.jobNo) return;
            if (e.target.matches('.edit-btn')) handleEditProject(row.dataset.jobNo);
            else if (e.target.matches('.file-link:not(.not-available)')) {
                e.preventDefault();
                const fileId = parseInt(e.target.dataset.fileId, 10);
                const file = await DB.getFileById(fileId);
                if (file) showFilePreviewModal(file);
            }
        });
        
        // Modal & Summary Clicks
        DOMElements['pending-invoices-summary']?.addEventListener('click', showPendingInvoicesModal);
        DOMElements['expiring-documents-summary']?.addEventListener('click', showExpiringDocumentsModal);
        DOMElements['pending-modal-close-btn']?.addEventListener('click', () => DOMElements['pending-invoice-modal'].style.display = 'none');
        DOMElements['expiring-modal-close-btn']?.addEventListener('click', () => DOMElements['expiring-documents-modal'].style.display = 'none');
         DOMElements['site-files-modal-close-btn']?.addEventListener('click', () => DOMElements['site-files-modal'].style.display = 'none');
        DOMElements['file-modal-close']?.addEventListener('click', () => DOMElements['file-preview-modal'].style.display = 'none');

        // Project Editor View
        DOMElements['save-project-btn']?.addEventListener('click', saveCurrentProject);
        DOMElements.controlTabs?.addEventListener('click', handleTabSwitch);
        DOMElements.previewTabs?.addEventListener('click', handleTabSwitch);
        DOMElements['generate-pdf-btn']?.addEventListener('click', handleGeneratePdf);
        DOMElements['documents-tab']?.addEventListener('click', handleMasterDocumentUpload);
        DOMElements['tender-tab']?.addEventListener('click', handleMasterDocumentUpload);
        DOMElements['vendors-tab']?.addEventListener('click', handleMasterDocumentUpload);
        DOMElements['payment-cert-tab']?.addEventListener('click', handlePaymentCertActions);
         // --- MODIFICATION START: Event listeners for new Letter functionality ---
        DOMElements['project-letter-type']?.addEventListener('change', updateProjectLetterUI);
        DOMElements['project-letters-tab']?.addEventListener('click', (e) => {
            if (e.target.matches('#generate-project-letter-btn')) {
                renderProjectLetterPreview();
            }
        });
        
        // Dashboard Calendar
        DOMElements['dash-cal-prev-btn']?.addEventListener('click', () => DashboardCalendar.changeMonth(-1));
        DOMElements['dash-cal-next-btn']?.addEventListener('click', () => DashboardCalendar.changeMonth(1));
  // Tools Tab Listeners
        DOMElements['calculateResourcesBtn']?.addEventListener('click', predictResources);
        DOMElements['generateQrCodeBtn']?.addEventListener('click', generateQRCode);
        // Design Studio
        DOMElements['design-view']?.querySelector('.tabs')?.addEventListener('click', handleDesignViewSwitch);
        DOMElements['task-modal-close-btn']?.addEventListener('click', () => DOMElements['task-modal'].style.display = 'none');
        DOMElements['save-task-btn']?.addEventListener('click', handleTaskSave);
          // MODIFICATION: Add listeners for the new "Add Task" modal
        DOMElements['add-task-btn']?.addEventListener('click', showAddTaskModal);
        DOMElements['add-task-modal-close-btn']?.addEventListener('click', () => DOMElements['add-task-modal'].style.display = 'none');
        DOMElements['save-new-task-btn']?.addEventListener('click', handleAddTaskSave);
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
    // --- ============================ ---
    // --- UI POPULATION & RENDERING ---
    // --- ============================ ---

    /**
     * NEW FUNCTION: Calculates and updates the cumulative percentage display for fee milestones.
     */
    function updateCumulativePercentages() {
        const milestoneContainer = DOMElements['fee-milestone-group'];
        const totalDisplay = document.getElementById('milestone-total-percentage'); // Using getElementById as it's a new element
        if (!milestoneContainer || !totalDisplay) return;

        let cumulativeTotal = 0;
        const milestoneInputs = milestoneContainer.querySelectorAll('.milestone-percentage-input');

        milestoneInputs.forEach(input => {
            cumulativeTotal += parseFloat(input.value) || 0;
        });

        totalDisplay.textContent = `Total: ${cumulativeTotal.toFixed(1)}%`;

        // Add visual feedback for the total
        if (cumulativeTotal === 100) {
            totalDisplay.className = 'cumulative-total valid';
        } else {
            totalDisplay.className = 'cumulative-total invalid';
        }
    }
    // The rest of the functions (populateStaticControls, getFormDataFromUI, etc.) are included here unchanged...
    // For brevity, I'm omitting the exact code as it's identical to the previous full version.
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
        // const feeContainer = DOMElements['fee-milestone-group']; feeContainer.innerHTML = '';
        // CONTENT.FEE_MILESTONES.forEach(item => {
            // const div = document.createElement('div'); div.className = 'milestone-percent-group'; div.innerHTML = `<span style="flex-grow:1;">${item.text}</span><input type="number" class="milestone-percentage-input" id="fee-perc-${item.id}" value="${item.defaultPercentage}" step="0.1" min="0"><span>%</span>`; feeContainer.appendChild(div);
        // });
        
               const feeContainer = DOMElements['fee-milestone-group']; 
        feeContainer.innerHTML = '';
        // --- MODIFICATION START: Add cumulative percentage span ---
        CONTENT.FEE_MILESTONES.forEach(item => {
            const div = document.createElement('div'); div.className = 'milestone-percent-group'; 
            div.innerHTML = `
                <span class="milestone-label">${item.text}</span>
                <input type="number" class="milestone-percentage-input" id="fee-perc-${item.id}" value="${item.defaultPercentage}" step="0.1" min="0">
                <span>%</span>`; 
            feeContainer.appendChild(div);
        });
        // --- MODIFICATION END ---
        const notesContainer = DOMElements['notes-group']; notesContainer.innerHTML = '';
        CONTENT.NOTES.forEach(item => { const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" id="${item.id}"><span>${item.text}</span>`; notesContainer.appendChild(label); });
    }

    function populateControlTabs() {
        if(!DOMElements['main-tab']) return;

        DOMElements['main-tab'].innerHTML = `<h3>Project Info</h3><div class="input-group-grid"><div class="input-group"><label for="jobNo">Project ID / Job No.</label><input type="text" id="jobNo"></div><div class="input-group"><label for="agreementDate">Agreement Date</label><input type="date" id="agreementDate"></div></div><div class="input-group"><label for="projectStatus">Project Status</label><select id="projectStatus"><option>Pending</option><option>In Progress</option><option>Under Supervision</option><option>On Hold</option><option>Completed</option></select></div><h3>Client Details</h3><div class="input-group"><label for="clientName">Client's Name</label><input type="text" id="clientName"></div><div class="input-group-grid"><div class="input-group"><label for="clientMobile">Mobile No.</label><input type="text" id="clientMobile"></div><div class="input-group"><label for="clientEmail">Email Address</label><input type="email" id="clientEmail"></div></div><div class="input-group-grid"><div class="input-group"><label for="clientPOBox">Client P.O. Box</label><input type="text" id="clientPOBox"></div><div class="input-group"><label for="clientTrn">Client TRN</label><input type="text" id="clientTrn"></div></div><h3>Project Details</h3><div class="input-group"><label for="scopeOfWorkType">Scope of Work Type</label><select id="scopeOfWorkType"><option value="">-- Select --</option><option>New Construction</option><option>Modification</option><option>AOR Service</option><option>Extension</option><option>Interior Design</option><option>Other</option></select><div id="otherScopeTypeContainer" class="other-input-container"><input type="text" id="otherScopeType" placeholder="Specify Scope"></div></div><div class="input-group"><label for="authority">Authority</label><select id="authority"><option value="">-- Select --</option><option>DM</option><option>DDA</option><option>Trakhees</option><option>Dubai South</option><option>DCCM</option><option>JAFZA</option><option>Other</option></select><div id="otherAuthorityContainer" class="other-input-container"><input type="text" id="otherAuthority" placeholder="Specify Authority"></div></div><div class="input-group"><label for="projectType">Project Type</label><select id="projectType"><option value="">-- Select --</option><option>Residential Building</option><option>Commercial Building</option><option>Villa</option><option>Warehouse</option><option>Other</option></select></div><div class="input-group"><label for="projectDescription">Project Description</label><textarea id="projectDescription" rows="2"></textarea></div><div class="input-group-grid"><div class="input-group"><label for="plotNo">Plot No.</label><input type="text" id="plotNo"></div><div class="input-group"><label for="area">Area</label><input type="text" id="area"></div></div><div class="input-group"><label for="builtUpArea">Built-up Area (sq ft)</label><input type="number" id="builtUpArea" value="10000"></div>`;
        DOMElements['scope-tab'].innerHTML = `<h3>Scope of Work Selection</h3><div id="scope-selection-container"></div>`;
        DOMElements['fees-tab'].innerHTML = `<h3>Financials</h3><div class="input-group"><label for="vatRate">VAT Rate (%)</label><input type="number" id="vatRate" value="5" step="0.1"></div><hr><h3>Fee Calculation</h3><div class="input-group"><label>Remuneration Type</label><div id="remuneration-type-selector"><label><input type="radio" name="remunerationType" value="lumpSum"> Lumpsum</label><label><input type="radio" name="remunerationType" value="percentage" checked> Percentage</label></div></div><div id="lump-sum-group" class="input-group" style="display: none;"><label>Lumpsum Fee (AED)</label><input type="number" id="lumpSumFee" value="122500"></div><div id="percentage-group"><div class="input-group"><label for="constructionCostRate">Cost/sq ft (AED)</label><input type="number" id="constructionCostRate" value="350"></div><div class="input-group"><label>Est. Construction Cost</label><strong id="total-construction-cost-display">...</strong></div><div class="input-group"><label for="consultancyFeePercentage">Fee (%)</label><input type="number" id="consultancyFeePercentage" value="3.5" step="0.1"></div></div><h3>Fee Split</h3><div class="input-group-grid"><div class="input-group"><label for="designFeeSplit">Design Fee (%)</label><input type="number" id="designFeeSplit" value="60" step="1"></div><div class="input-group"><label>Supervision Fee (%)</label><strong id="supervisionFeeSplitDisplay">40%</strong></div></div><div id="financial-summary-container" class="financial-summary"></div><hr>
        
          <div class="milestone-header">
            <h3>Design Fee Milestones</h3>
            <span id="milestone-total-percentage" class="cumulative-total"></span>
        </div>
        <div id="fee-milestone-group"></div>
        <hr><h3>Supervision Fee</h3><div class="input-group"><label>Billing Method</label><div id="supervision-billing-method-selector"><label><input type="radio" name="supervisionBillingMethod" value="monthly" checked> Monthly</label><label><input type="radio" name="supervisionBillingMethod" value="progress"> Progress</label></div></div><div id="prorata-percentage-group" class="input-group" style="display:none;"><label for="prorataPercentage">Prorata (%)</label><input type="number" id="prorataPercentage" value="10" step="1"></div><h3>Timeline</h3><div class="input-group-grid"><div class="input-group"><label>Design (Months)</label><input type="number" id="designDuration" value="4"></div><div class="input-group"><label>Construction (Months)</label><input type="number" id="constructionDuration" value="14"></div></div><div class="input-group"><label>Extended Fee (AED/month)</label><input type="number" id="extendedSupervisionFee" value="7500"></div><h4>Notes & Exclusions</h4><div class="checkbox-group" id="notes-group"></div>`;
        
        
        
        
        // <h3>Design Fee Milestones</h3>
        // <div id="fee-milestone-group"></div><hr><h3>Supervision Fee</h3><div class="input-group"><label>Billing Method</label><div id="supervision-billing-method-selector"><label><input type="radio" name="supervisionBillingMethod" value="monthly" checked> Monthly</label><label><input type="radio" name="supervisionBillingMethod" value="progress"> Progress</label></div></div><div id="prorata-percentage-group" class="input-group" style="display:none;"><label for="prorataPercentage">Prorata (%)</label><input type="number" id="prorataPercentage" value="10" step="1"></div><h3>Timeline</h3><div class="input-group-grid"><div class="input-group"><label>Design (Months)</label><input type="number" id="designDuration" value="4"></div><div class="input-group"><label>Construction (Months)</label><input type="number" id="constructionDuration" value="14"></div></div><div class="input-group"><label>Extended Fee (AED/month)</label><input type="number" id="extendedSupervisionFee" value="7500"></div><h4>Notes & Exclusions</h4><div class="checkbox-group" id="notes-group"></div>`;
        DOMElements['invoicing-tab'].innerHTML = `<h3>Invoice History</h3><table class="output-table"><thead><tr><th>Inv No.</th><th>Date</th><th>Amount</th><th>Status</th><th>Payment Details</th><th>Cheque Details</th></tr></thead><tbody id="invoice-history-body"></tbody></table><hr><h3>Raise New Invoice</h3><div class="input-group"><label for="newInvoiceNo">New Invoice Number</label><input type="text" id="newInvoiceNo"></div><div id="milestone-billing-container"><h4>Design Milestones</h4><table class="output-table"><thead><tr><th>Bill</th><th>Milestone</th><th>Amount</th><th>Status</th></tr></thead><tbody id="milestone-billing-body"></tbody></table></div><div id="supervision-billing-monthly-container"><h4>Supervision Fee (Monthly)</h4><div id="supervision-monthly-info"></div><button id="bill-next-month-btn" class="secondary-button">+ Add Next Month</button></div><div id="supervision-billing-progress-container" style="display:none;"><h4>Supervision Fee (Progress)</h4><div id="supervision-progress-info"></div><div class="input-group"><label for="projectProgressInput">New Total Progress (%)</label><input type="number" id="projectProgressInput" min="0" max="100" step="0.1"></div><button id="bill-by-progress-btn" class="secondary-button">+ Add Progress Bill</button></div><div id="supervision-billing-extended-container"><h4>Extended Supervision</h4><div id="extended-supervision-info"></div><button id="bill-extended-month-btn" class="secondary-button">+ Add Extended Month</button></div><div id="current-invoice-items-container" style="margin-top:20px;"><h4>Items for this Invoice</h4><table class="output-table"><thead><tr><th>Description</th><th>Amount (AED)</th><th>Action</th></tr></thead><tbody id="current-invoice-items-body"></tbody></table></div><hr><button id="raise-invoice-btn" style="width:100%; padding: 12px; font-size: 16px;">Raise Invoice from Selected Items</button>`;
        
        const mainDocCats = { client_details: { title: 'Client Details', types: ['Passport', 'Emirates_ID', 'Affection_Plan', 'Title_Deed', 'SPS', 'Oqood', 'DCR'] }, noc_copies: { title: 'NOC Copies', types: ['RTA', 'DEWA_Electrical', 'DEWA_Water', 'Du', 'Etisalat', 'Developer_NOC', 'Building_Permit', 'Other_NOC'] }, letters: { title: 'Project Letters', types: ['Incoming_Letter', 'Outgoing_Letter', 'Site_Memo'] }, other_uploads: { title: 'Other Uploads', types: ['Miscellaneous'] } };
        const tenderDocCats = { tender_documents: { title: 'Tender Documents', types: ['Tender_Drawings', 'BOQ', 'Specifications', 'Contract_Conditions', 'Addenda', 'Tender_Analysis'] } };
        const vendorDocCats = { vendor_lists: { title: 'Vendor & Subcontractor Lists', types: ['Approved_Vendor_List', 'Subcontractor_Prequalification', 'Supplier_Quotes'] } };

        const createDocCategoryHTML = (catConfig) => {
            let html = '';
            for (const catKey in catConfig) {
                const category = catConfig[catKey];
                let optionsHtml = category.types.map(type => `<option value="${type.toLowerCase()}">${type.replace(/_/g, ' ')}</option>`).join('');
                html += `<div class="document-category" id="doc-cat-${catKey}"><h4>${category.title}</h4><div class="upload-area"><select class="doc-type-select">${optionsHtml}</select><input type="file" class="doc-file-input" accept=".jpg,.jpeg,.png,.pdf" multiple><input type="date" class="expiry-date-input" title="Set document expiry date"><button type="button" class="upload-btn" data-category="${catKey}">Upload</button></div><div class="gallery-grid"><p>Please save the project first.</p></div></div>`;
            }
            return html;
        };

        DOMElements['documents-tab'].innerHTML = `<h3>Project Documents Management</h3>${createDocCategoryHTML(mainDocCats)}`;
        DOMElements['tender-tab'].innerHTML = `<h3>Tender Management</h3>${createDocCategoryHTML(tenderDocCats)}`;
        DOMElements['vendors-tab'].innerHTML = `
            <h3>Selected Vendors for this Project</h3>
            <p>Add vendors from the master list below. This list will be saved with the project and used for the printable Vendor List document.</p>
            <table class="output-table">
                <thead><tr><th>Category</th><th>Item</th><th>Manufacturer</th><th>Action</th></tr></thead>
                <tbody id="project-vendor-list-body"></tbody>
            </table>
            <hr>
            <h3>Add Vendors from Master List</h3>
            <div class="input-group" style="margin-bottom: 10px;">
                <input type="text" id="vendor-master-search" placeholder="Search Master List by Item, Manufacturer, etc...">
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                <table class="output-table">
                    <thead><tr><th>Category</th><th>Item</th><th>Manufacturer</th><th>Action</th></tr></thead>
                    <tbody id="vendor-search-results-body"></tbody>
                </table>
            </div>
        `;

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
        
        cacheDOMElements(); 
         // Attach listener here now that the element exists
        DOMElements['project-letter-type']?.addEventListener('change', updateProjectLetterUI);
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

