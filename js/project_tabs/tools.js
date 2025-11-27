App.ProjectTabs.Tools = (() => {

function init() {
    const container = document.getElementById('tools-tab');
    if (!container) return;
    container.innerHTML = `
        <div class="document-category">
            <h4>Scrum Task Scheduler</h4>
            <p>Calculates and sets due dates for all default design tasks based on the project's start date and design duration.</p>
            <button id="scheduleScrumTasksBtn" class="primary-button" style="width:100%;">Add & Schedule Default Tasks</button>
            <div id="scrumScheduleOutput" style="margin-top:10px; font-size:0.9em;"></div>
        </div>
        <div class="document-category">
            <h4>Resource Prediction</h4>
            <p>Calculate the estimated resources required for this project type based on historical data.</p>
            <button id="calculateResourcesBtn">Calculate Resources</button>
            <div id="resourcePredictionOutput" style="margin-top: 15px; font-family: monospace;"></div>
        </div>
        <div class="document-category">
            <h4>Project Report Generator</h4>
            <p>Generate a comprehensive report for the current project. Select the sections to include below.</p>
            <button id="toggle-report-options-btn" class="secondary-button">Configure Report Sections</button>
            <div id="report-options-container" style="display: none; margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 6px;">
                <h4>Include in Report:</h4>
                <div class="checkbox-group">
                    <label><input type="checkbox" name="reportSection" value="clientDetails" checked> Client Details</label>
                    <label><input type="checkbox" name="reportSection" value="projectInfo" checked> Project Info (Type, Location, Area)</label>
                    <label><input type="checkbox" name="reportSection" value="financials" checked> Financial Summary (Cost, Fees, Invoices)</label>
                    <label><input type="checkbox" name="reportSection" value="schedule" checked> Project Schedule & Site Status</label>
                    <label><input type="checkbox" name="reportSection" value="scrumAnalysis" checked> Design Task Analysis (by Department)</label>
                </div>
                <button id="generate-report-preview-btn" class="primary-button" style="width: 100%; margin-top: 15px;">Generate Report Preview</button>
            </div>
        </div>
        <div class="document-category">
            <h4>QR Code Generator</h4>
            <p>Generate a QR code for this project's information.</p>
            <button id="generateQrCodeBtn" class="secondary-button">Generate Project QR Code</button>
            <div id="qr-code" style="margin-top: 10px; width: 128px; height: 128px; border: 1px solid #ccc; padding: 5px;"></div>
        </div>
        <div class="document-category">
            <h4>Download Documents</h4>
            <p>Package all uploaded project documents into a single ZIP file.</p>
            <button id="downloadAllDocsBtn" disabled>Download All as ZIP</button>
            <small id="download-doc-count" style="margin-left: 10px; color: #666;"></small>
        </div>
    `;
    
    Object.assign(App.DOMElements, {
        scheduleScrumTasksBtn: document.getElementById('scheduleScrumTasksBtn'),
        scrumScheduleOutput: document.getElementById('scrumScheduleOutput'),
        calculateResourcesBtn: document.getElementById('calculateResourcesBtn'),
        resourcePredictionOutput: document.getElementById('resourcePredictionOutput'),
        generateQrCodeBtn: document.getElementById('generateQrCodeBtn'),
        qrCode: document.getElementById('qr-code'),
        downloadAllDocsBtn: document.getElementById('downloadAllDocsBtn'),
        downloadDocCount: document.getElementById('download-doc-count'),
        toggleReportOptionsBtn: document.getElementById('toggle-report-options-btn'),
        reportOptionsContainer: document.getElementById('report-options-container'),
        generateReportPreviewBtn: document.getElementById('generate-report-preview-btn')
    });
    
    setupEventListeners();
}

function setupEventListeners() {
    App.DOMElements.scheduleScrumTasksBtn?.addEventListener('click', scheduleScrumTasks);
    App.DOMElements.calculateResourcesBtn?.addEventListener('click', predictResources);
    App.DOMElements.generateQrCodeBtn?.addEventListener('click', generateQRCode);
    App.DOMElements.downloadAllDocsBtn?.addEventListener('click', handleDownloadAllDocs);
    App.DOMElements.toggleReportOptionsBtn?.addEventListener('click', () => {
        const container = App.DOMElements.reportOptionsContainer;
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    });
    App.DOMElements.generateReportPreviewBtn?.addEventListener('click', () => {
        const reportTabButton = document.querySelector('.preview-tabs .tab-button[data-tab="project-report"]');
        reportTabButton?.click();
    });
}

async function populateTabData(project) {
    if (App.currentProjectJobNo) {
        const masterFiles = await DB.getFiles(App.currentProjectJobNo, 'master');
        const siteFiles = await DB.getFiles(App.currentProjectJobNo, 'site');
        const fileCount = masterFiles.length + siteFiles.length;
        App.DOMElements.downloadDocCount.textContent = `(${fileCount} files found)`;
        App.DOMElements.downloadAllDocsBtn.disabled = fileCount === 0;
    } else {
        App.DOMElements.downloadDocCount.textContent = '(Save project to enable)';
        App.DOMElements.downloadAllDocsBtn.disabled = true;
    }
     // Clear previous outputs when loading a new project
    App.DOMElements.resourcePredictionOutput.innerHTML = '';
    App.DOMElements.qrCode.innerHTML = '';
    App.DOMElements.scrumScheduleOutput.innerHTML = '';
}


async function scheduleScrumTasks() {
    if (!App.currentProjectJobNo) {
        alert("Please save the project first.");
        return;
    }

    const project = await DB.getProject(App.currentProjectJobNo);
    const designMonths = project.designDuration;
    const startDate = new Date(project.agreementDate + 'T00:00:00');

    if (!designMonths || designMonths <= 0 || isNaN(startDate.getTime())) {
        alert("Please set a valid Agreement Date (in Main tab) and Design Duration (in Fees tab) greater than 0.");
        return;
    }

    if (!confirm(`This will add any missing default tasks and overwrite existing due dates for all default scrum tasks for project ${App.currentProjectJobNo}. Custom tasks will not be affected. Do you want to continue?`)) {
        return;
    }

    const outputDiv = App.DOMElements.scrumScheduleOutput;
    outputDiv.innerHTML = "Processing and scheduling tasks...";

    try {
        let scrumData = await DB.getScrumData(App.currentProjectJobNo);
        if (!scrumData) {
            scrumData = { jobNo: App.currentProjectJobNo, tasks: [] };
        }

        const totalWorkDays = designMonths * 22; // Approximate work days in a month (excluding weekends)
        const defaultTasksTemplate = DESIGN_SCRUM_TEMPLATE || [];
        const totalDurationUnits = defaultTasksTemplate.reduce((sum, task) => sum + task.duration, 0);
        
        if (totalDurationUnits === 0) {
            outputDiv.innerHTML = "<p style='color:red;'>Error: No task durations defined in the template.</p>";
            return;
        }

        let currentDayOffset = 0;
        let scheduledCount = 0;
        let addedCount = 0;

        defaultTasksTemplate.forEach(templateTask => {
            const taskWorkDays = (templateTask.duration / totalDurationUnits) * totalWorkDays;
            currentDayOffset += taskWorkDays;
            
            let dueDate = new Date(startDate);
            let addedDays = 0;
            while (addedDays < Math.round(currentDayOffset)) {
                dueDate.setDate(dueDate.getDate() + 1);
                if (dueDate.getDay() !== 6 && dueDate.getDay() !== 0) {
                    addedDays++;
                }
            }
            const calculatedDueDate = dueDate.toISOString().split('T')[0];

            let existingTask = scrumData.tasks.find(t => t.id === templateTask.id);

            if (existingTask) {
                existingTask.dueDate = calculatedDueDate;
                // Also update the planned duration in case template changed
                existingTask.plannedDuration = templateTask.duration;
            } else {
                const newTask = {
                    ...templateTask,
                    status: 'Up Next',
                    assigneeId: null,
                    dueDate: calculatedDueDate,
                    startDate: null,
                    completedDate: null,
                    plannedDuration: templateTask.duration,
                    dateAdded: new Date().toISOString().split('T')[0]
                };
                scrumData.tasks.push(newTask);
                addedCount++;
            }
            scheduledCount++;
        });

        await DB.putScrumData(scrumData);
        
        outputDiv.innerHTML = `<p style='color:green;'>Successfully scheduled ${scheduledCount} default tasks. Added ${addedCount} new tasks. All tasks are scheduled over ${designMonths} months.</p>`;
        App.Bulletin.log('Scrum Tasks Scheduled', `Default design tasks for project <strong>${App.currentProjectJobNo}</strong> have been scheduled.`);
        
        // MODIFICATION: Refresh the design studio selector to include this project
        if (typeof App.refreshDesignStudioSelector === 'function') {
            await App.refreshDesignStudioSelector();
        }

    } catch (error) {
        console.error("Error scheduling scrum tasks:", error);
        outputDiv.innerHTML = "<p style='color:red;'>An error occurred during scheduling. Check the console.</p>";
    }
}

async function predictResources() {
    const outputDiv = App.DOMElements.resourcePredictionOutput;
    outputDiv.innerHTML = 'Calculating...';

    const project = await DB.getProject(App.currentProjectJobNo);
    const scrumData = await DB.getScrumData(App.currentProjectJobNo);
    const allStaff = await DB.getAllHRData();

    if (!project || !scrumData || !scrumData.tasks || scrumData.tasks.length === 0) {
        outputDiv.innerHTML = 'No scrum tasks found for this project. Please add tasks first.';
        return;
    }

    // 1. Calculate Project Overhead Cost based on actual task timeline
    const taskDates = scrumData.tasks.map(t => new Date(t.dueDate)).filter(d => !isNaN(d.getTime()));
    if (taskDates.length === 0) {
        outputDiv.innerHTML = 'Cannot calculate cost. No tasks have due dates set.';
        return;
    }
    const minDate = new Date(Math.min.apply(null, taskDates));
    const maxDate = new Date(Math.max.apply(null, taskDates));
    
    // Calculate total months spanned by the tasks, rounding up
    const totalDaysSpanned = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    const projectDurationMonths = Math.max(1, Math.ceil(totalDaysSpanned / 30)); 

    const totalYearlyExpense = (typeof YEARLY_FIXED_EXPENSES !== 'undefined') ? YEARLY_FIXED_EXPENSES.reduce((sum, item) => sum + item.amount, 0) : 0;
    const totalMonthlyExpense = (typeof MONTHLY_OFFICE_EXPENSES !== 'undefined') ? MONTHLY_OFFICE_EXPENSES.reduce((sum, item) => sum + item.amount, 0) : 0;
    const monthlyOverhead = (totalYearlyExpense / 12) + totalMonthlyExpense;
    const projectOverheadCost = monthlyOverhead * projectDurationMonths;


    // 2. Calculate Direct Labor costs and man-days per department
    const staffSalaryMap = new Map(allStaff.map(s => [s.id, s.grossSalary]));
    const directCostsByDept = {};
    let totalDirectLaborCost = 0;
    let totalDays = 0;

    for (const task of scrumData.tasks) {
        const department = task.department || 'Default';
        const duration = task.plannedDuration || 1;
        
        let salary = 0;
        if (task.assigneeId && staffSalaryMap.has(task.assigneeId)) {
            salary = staffSalaryMap.get(task.assigneeId);
        } else {
            salary = DEFAULT_DEPARTMENT_SALARIES[department] || DEFAULT_DEPARTMENT_SALARIES['Default'];
        }
        
        const dailyRate = salary / 22; // Assuming 22 working days per month
        const taskCost = dailyRate * duration;
        
        if (!directCostsByDept[department]) {
            directCostsByDept[department] = { totalCost: 0, totalDays: 0 };
        }
        directCostsByDept[department].totalCost += taskCost;
        directCostsByDept[department].totalDays += duration;
        
        totalDirectLaborCost += taskCost;
        totalDays += duration;
    }

    // 3. Allocate overhead and build the results table
    let tableHtml = `<table class="output-table"><tr><th>Department</th><th>Est. Man-Days</th><th>Est. Total Cost (AED)</th></tr>`;
    for (const dept in directCostsByDept) {
        const directCost = directCostsByDept[dept].totalCost;
        const days = directCostsByDept[dept].totalDays;
        
        const workShare = totalDays > 0 ? (days / totalDays) : 0;
        const overheadShare = projectOverheadCost * workShare;
        const totalDeptCost = directCost + overheadShare;

        tableHtml += `<tr>
            <td>${dept}</td>
            <td>${days.toFixed(1)}</td>
            <td title="Direct Labor: ${App.formatCurrency(directCost)} | Allocated Overhead: ${App.formatCurrency(overheadShare)}">${App.formatCurrency(totalDeptCost)}</td>
        </tr>`;
    }

    const grandTotalCost = totalDirectLaborCost + projectOverheadCost;
    tableHtml += `<tfoot><tr><td><b>Total</b></td><td><b>${totalDays.toFixed(1)}</b></td><td><b>${App.formatCurrency(grandTotalCost)}</b></td></tr></tfoot></table>`;
    
    // 4. Build the final summary HTML
    const totalFee = App.ProjectTabs.Fees.getFeeDistribution(project).totalConsultancyFee;
    const profit = totalFee - grandTotalCost;
    const profitPercentage = totalFee > 0 ? ((profit / totalFee) * 100).toFixed(1) : 0;
    
    outputDiv.innerHTML = `
        <div class="financial-summary"><h4>Cost vs. Fee Summary (Estimated over ${projectDurationMonths} months)</h4>
            <div class="summary-line"><span>Total Consultancy Fee (A)</span><span>${App.formatCurrency(totalFee)}</span></div>
            <div class="summary-line"><span>Total Estimated Project Cost (B)</span><span>${App.formatCurrency(grandTotalCost)}</span></div>
            <div style="padding-left: 15px; font-size: 0.9em; color: #555;">
                <div class="summary-line"><span>- Direct Labor Cost</span><span>${App.formatCurrency(totalDirectLaborCost)}</span></div>
                <div class="summary-line"><span>- Project Overhead Cost</span><span>${App.formatCurrency(projectOverheadCost)}</span></div>
            </div>
            <div class="summary-line" style="border-top: 1px solid #ccc; margin-top: 4px; padding-top: 4px;">
                <span><strong>Estimated Margin (A-B)</strong></span>
                <span><strong style="color: ${profit < 0 ? '#dc3545' : 'green'};">${App.formatCurrency(profit)} (${profitPercentage}%)</strong></span>
            </div>
        </div>${tableHtml}`;
}


async function generateQRCode() {
    const project = await DB.getProject(App.currentProjectJobNo);
    if (!project) {
        alert("Please save the project first.");
        return;
    }
    const feeData = App.ProjectTabs.Fees.getFeeDistribution(project).totalConsultancyFee;
    const qrData = `Client:${project.clientName},Plot:${project.plotNo},Fee:${Math.round(feeData)}`;
    
    const qrContainer = App.DOMElements.qrCode;
    qrContainer.innerHTML = "";
     try {
        new QRCode(qrContainer, { text: qrData, width: 128, height: 128 });
    } catch (error) {
        console.error("QR Code generation failed:", error);
        qrContainer.innerHTML = "Data too long for QR Code.";
    }
}

async function handleDownloadAllDocs() {
    if (!App.currentProjectJobNo) return;
    
    const btn = App.DOMElements.downloadAllDocsBtn;
    btn.disabled = true;
    btn.textContent = 'Preparing ZIP...';
    
    try {
        const masterFiles = await DB.getFiles(App.currentProjectJobNo, 'master');
        const siteFiles = await DB.getFiles(App.currentProjectJobNo, 'site');
        const allFiles = [...masterFiles, ...siteFiles];
        
        if (allFiles.length === 0) {
            alert('No documents have been uploaded for this project.');
            return;
        }

        const zip = new JSZip();

        for (const file of allFiles) {
            const base64Data = file.dataUrl.substring(file.dataUrl.indexOf(',') + 1);
            zip.file(file.name, base64Data, { base64: true });
        }

        const content = await zip.generateAsync({ type: "blob" });
        
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `Project_${App.currentProjectJobNo.replace(/\//g, '-')}_Documents.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("Error generating ZIP file:", error);
        alert("An error occurred while creating the ZIP file. Please check the console for details.");
    } finally {
        btn.disabled = false;
        btn.textContent = 'Download All as ZIP';
        populateTabData(); // Refresh file count
    }
}

async function renderPreview() {
    const container = App.DOMElements['project-report-preview'];
    container.innerHTML = '<h3>Generating Report... Please Wait</h3>';

    if (!App.currentProjectJobNo) {
        container.innerHTML = '<p>Please save the project first.</p>';
        return;
    }

    const selectedSections = Array.from(document.querySelectorAll('input[name="reportSection"]:checked')).map(cb => cb.value);

    // Gather all data
    const project = await DB.getProject(App.currentProjectJobNo);
    const siteData = await DB.getSiteData(App.currentProjectJobNo);
    const scrumData = await DB.getScrumData(App.currentProjectJobNo);
    const allStaff = await DB.getAllHRData();
    
    // Combine DB data with current UI data for accuracy
    const fullProjectData = {
        ...project,
        ...App.ProjectTabs.Main.getTabData(),
        ...App.ProjectTabs.Fees.getTabData()
    };
    const feeDistribution = App.ProjectTabs.Fees.getFeeDistribution(fullProjectData);

    // Pass all collected data to the template generator
    const reportHtml = PROJECT_DOCUMENT_TEMPLATES.projectReport({
        project: fullProjectData,
        siteData,
        scrumData,
        allStaff,
        feeDistribution,
        selectedSections
    });

    container.innerHTML = reportHtml;
}


return { init, populateTabData, renderPreview };

})();