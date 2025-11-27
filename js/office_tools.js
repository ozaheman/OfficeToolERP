
document.addEventListener('DOMContentLoaded', async () => {
    let DOMElements = {};
    let burnoutChartInstance = null;
    let revenuePieChartInstance = null;
    const formatCurrency = (num) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(num || 0);

    async function main() {
        try {
            await DB.init();
            cacheDOMElements();
            setupEventListeners();
            await renderFinancialProjections();
            await renderBOQ();
             await initializeAnalyticsCharts();
            await initializeCharts();
        } catch (e) {
            console.error("Error initializing Office Tools:", e);
            document.body.innerHTML = `<div style='padding:40px; text-align:center; color:red;'><h2>Application Failed to Start</h2><p>Could not connect to the database.</p></div>`;
        }
    }

    function cacheDOMElements() {
        DOMElements = {
            tabsContainer: document.querySelector('.tabs'),
            initialCostsBody: document.getElementById('initial-costs-body'),
            overheadsBody: document.getElementById('overheads-body'),
            financialSummaryBody: document.getElementById('financial-summary-body'),
            boqBody: document.getElementById('boq-body'),
            boqSearch: document.getElementById('boq-search'),
            burnoutProjectSelect: document.getElementById('burnout-project-select'),
            burnoutChartCanvas: document.getElementById('burnoutChart'),
            revenuePieChartCanvas: document.getElementById('revenuePieChart'),
            burnoutPlaceholder: document.getElementById('burnout-placeholder'),
            revenuePlaceholder: document.getElementById('revenue-placeholder'),
        };
    }

    function setupEventListeners() {
        DOMElements.tabsContainer.addEventListener('click', handleTabSwitch);
        DOMElements.burnoutProjectSelect.addEventListener('change', handleBurnoutProjectSelect);
        DOMElements.boqSearch.addEventListener('input', () => renderBOQ(DOMElements.boqSearch.value));
        // DOMElements.boqSearch.addEventListener('keyup', () => renderBOQ(DOMElements.boqSearch.value));
    }

    function handleTabSwitch(e) {
        if (!e.target.matches('.tab-button')) return;
        DOMElements.tabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${e.target.dataset.tab}-tab`).classList.add('active');
    }

    async function renderFinancialProjections() {
        const initialCosts = (await DB.getFinancialTemplate('INITIAL_COSTS'))?.data || [];
        const overheads = (await DB.getFinancialTemplate('YEARLY_OVERHEADS'))?.data || [];
        const summary = (await DB.getFinancialTemplate('FINANCIAL_SUMMARY'))?.data || [];
DOMElements.initialCostsBody.innerHTML = ''; // Clear previous content
        let initialTotal = 0;
        initialCosts.forEach(cost => { initialTotal += cost.amount; DOMElements.initialCostsBody.insertRow().innerHTML = `<td>${cost.item}</td><td style="text-align:right;">${formatCurrency(cost.amount)}</td>`; });
        const iTotalRow = DOMElements.initialCostsBody.insertRow();
        iTotalRow.className = 'total-row'; iTotalRow.innerHTML = `<td>Total Initial Costs</td><td style="text-align:right;">${formatCurrency(initialTotal)}</td>`;
DOMElements.overheadsBody.innerHTML = ''; // Clear previous content
        let yearlyTotal = 0;
       overheads.forEach(cost => { yearlyTotal += cost.amount; DOMElements.overheadsBody.insertRow().innerHTML = `<td>${cost.item}</td><td style="text-align:right;">${formatCurrency(cost.amount)}</td><td style="text-align:right;">${formatCurrency(cost.amount / 12)}</td>`; });
        const oTotalRow = DOMElements.overheadsBody.insertRow();
        oTotalRow.className = 'total-row'; oTotalRow.innerHTML = `<td>Total Yearly Overheads</td><td style="text-align:right;">${formatCurrency(yearlyTotal)}</td><td style="text-align:right;">${formatCurrency(yearlyTotal / 12)}</td>`;

        DOMElements.financialSummaryBody.innerHTML = summary.map(item => `<div class="summary-item ${item.isBold ? 'is-bold' : ''} ${item.isCost ? 'is-cost' : ''}"><span>${item.category}</span><span class="amount">${formatCurrency(item.amount)}</span></div>`).join('');
    }

async function renderBOQ(searchTerm = '') {
        // FIX: Use the new DB method
        const boqData = (await DB.getFinancialTemplate('VILLA_BOQ'))?.data || [];
        const tbody = DOMElements.boqBody;
        tbody.innerHTML = '';
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        boqData.filter(item => item.item.toLowerCase().includes(lowerCaseSearchTerm) || item.category.toLowerCase().includes(lowerCaseSearchTerm))
        .forEach(item => {
            const row = tbody.insertRow();
            if (item.isTotal) {
                row.className = 'total-row'; row.innerHTML = `<td colspan="6"><b>${item.totalLabel}</b></td><td style="text-align:right;"><b>${formatCurrency(item.grandTotal)}</b></td>`;
            } else {
                row.innerHTML = `<td>${item.id}</td><td>${item.category}</td><td>${item.item}</td><td>${item.unit||''}</td><td>${item.quantity||''}</td>
                                 <td style="text-align:right;">${item.rate ? formatCurrency(item.rate) : ''}</td><td style="text-align:right;">${formatCurrency(item.total)}</td>`;
            }
        });
    }
    
    async function initializeAnalyticsCharts() {
        const allProjects = await DB.getAllProjects();
        if (allProjects.length === 0) {
            DOMElements.burnoutProjectSelect.innerHTML = '<option>No projects in database</option>';
             DOMElements.revenuePlaceholder.style.display = 'flex';
            DOMElements.revenuePieChartCanvas.style.display = 'none';
            return;
        }
        const select = DOMElements.burnoutProjectSelect;
        select.innerHTML = '<option value="">-- Select a Project --</option>';
        allProjects.forEach(p => { select.add(new Option(`${p.jobNo} - ${p.projectDescription || ''}`, p.jobNo)); });
        select.disabled = false;
        
        await renderRevenuePieChart(allProjects);
        if (select.options.length > 1) { select.selectedIndex = 1; handleBurnoutProjectSelect({ target: select }); }
    }
        
    async function initializeCharts() {
        const allProjects = await DB.getAllProjects();
        if (allProjects.length === 0) {
            DOMElements.burnoutProjectSelect.innerHTML = '<option>No projects in database</option>';
            return;
        }
        
        const select = DOMElements.burnoutProjectSelect;
        select.innerHTML = '<option value="">-- Select a Project --</option>';
        allProjects.forEach(p => { select.add(new Option(`${p.jobNo} - ${p.projectDescription || ''}`, p.jobNo)); });
        select.disabled = false;
        
        // THIS IS THE FIX: Pass the fetched projects to the chart function
        await renderRevenuePieChart(allProjects);
        if (select.options.length > 1) { select.selectedIndex = 1; handleBurnoutProjectSelect({ target: select }); }
    }

    async function handleBurnoutProjectSelect(e) {
        const jobNo = e.target.value;
        if (!jobNo) { 
            DOMElements.burnoutPlaceholder.style.display = 'flex';
            DOMElements.burnoutChartCanvas.style.display = 'none';
            if (burnoutChartInstance) burnoutChartInstance.destroy();
            return;
        }
        const project = await DB.getProject(jobNo);
        renderBurnoutChart(project);
    }
    
    function renderBurnoutChartxx(project) {
        // ... this function remains unchanged ...
        if (!project) return;
        DOMElements.burnoutPlaceholder.style.display = 'none';
        DOMElements.burnoutChartCanvas.style.display = 'block';

        const totalFee = calculateTotalFee(project);
        const startDate = new Date(project.agreementDate);
        const plannedData = [{ x: startDate, y: 0 }];
        let cumulativePercentage = 0;
        let daysOffset = 0;
        const designMonths = parseFloat(project.designDuration) || 4;
        const milestones = (project.feeMilestonePercentages && Object.keys(project.feeMilestonePercentages).filter(k => project.feeMilestonePercentages[k] > 0)) || [];
        const milestoneInterval = (designMonths * 30.4) / (milestones.length || 1);
        
        // Use CONTENT from constants.js if it exists, otherwise provide a fallback.
        const feeMilestones = window.CONTENT?.FEE_MILESTONES || [];
        feeMilestones.forEach(milestone => {
             const percentage = parseFloat(project.feeMilestonePercentages?.[milestone.id]);
             if (percentage > 0) {
                 cumulativePercentage += percentage;
                 daysOffset += milestoneInterval;
                 const milestoneDate = new Date(startDate);
                 milestoneDate.setDate(startDate.getDate() + Math.round(daysOffset));
                 plannedData.push({ x: milestoneDate, y: (totalFee * (cumulativePercentage / 100)) });
             }
        });

        const actualData = [{ x: startDate, y: 0 }];
        let cumulativePaid = 0;
        (project.invoices || []).filter(inv => inv.status === 'Paid' && inv.chequeDate).sort((a,b) => new Date(a.chequeDate) - new Date(b.chequeDate)).forEach(inv => {
            cumulativePaid += parseFloat(inv.amount);
            actualData.push({ x: new Date(inv.chequeDate), y: cumulativePaid });
        });

        if (burnoutChartInstance) burnoutChartInstance.destroy();

        const ctx = DOMElements.burnoutChartCanvas.getContext('2d');
        burnoutChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    { label: 'Planned Fee Collection', data: plannedData, borderColor: 'rgba(0, 123, 255, 0.8)', tension: 0.1, fill: false },
                    { label: 'Actual Fee Collected', data: actualData, borderColor: 'rgba(40, 167, 69, 0.8)', backgroundColor: 'rgba(40, 167, 69, 0.2)', stepped: true, fill: true }
                ]
            },
            options: {
                responsive: true,
                scales: { x: { type: 'time', time: { unit: 'month' }, title: { display: true, text: 'Date' } }, y: { title: { display: true, text: 'Cumulative Amount (AED)' }, beginAtZero: true } },
                plugins: { title: { display: true, text: `Financial Burnout for ${project.jobNo}` } }
            }
        });
    }
     function renderBurnoutChart(project) {
        if (!project) return;
        DOMElements.burnoutPlaceholder.style.display = 'none';
        DOMElements.burnoutChartCanvas.style.display = 'block';

        const totalFee = calculateTotalFee(project);
        const startDate = new Date(project.agreementDate);
        const plannedData = [{ x: startDate, y: 0 }];
        let cumulativePercentage = 0;
        const designMonths = parseFloat(project.designDuration) || 4;
        const feeMilestones = window.CONTENT?.FEE_MILESTONES || [];
        const milestones = feeMilestones.filter(m => project.feeMilestonePercentages?.[m.id] > 0);
        const milestoneIntervalDays = (designMonths * 30.4) / (milestones.length || 1);
        
        milestones.forEach((milestone, index) => {
             const percentage = parseFloat(project.feeMilestonePercentages[milestone.id]);
             cumulativePercentage += percentage;
             const milestoneDate = new Date(startDate);
             milestoneDate.setDate(startDate.getDate() + Math.round((index + 1) * milestoneIntervalDays));
             plannedData.push({ x: milestoneDate, y: (totalFee * (cumulativePercentage / 100)) });
        });

        const actualData = [{ x: startDate, y: 0 }];
        let cumulativePaid = 0;
        (project.invoices || []).filter(inv => inv.status === 'Paid' && inv.chequeDate).sort((a,b) => new Date(a.chequeDate) - new Date(b.chequeDate)).forEach(inv => {
            cumulativePaid += parseFloat(inv.amount);
            actualData.push({ x: new Date(inv.chequeDate), y: cumulativePaid });
        });

        if (burnoutChartInstance) burnoutChartInstance.destroy();
          const ctx = DOMElements.burnoutChartCanvas.getContext('2d');
        burnoutChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    { label: 'Planned Fee Collection', data: plannedData, borderColor: 'rgba(0, 123, 255, 0.8)', tension: 0.1, fill: false },
                    { label: 'Actual Fee Collected', data: actualData, borderColor: 'rgba(40, 167, 69, 0.8)', backgroundColor: 'rgba(40, 167, 69, 0.2)', stepped: true, fill: true }
                ]
            },
            options: {
                responsive: true,
                scales: { x: { type: 'time', time: { unit: 'month' }, title: { display: true, text: 'Date' } }, y: { title: { display: true, text: 'Cumulative Amount (AED)' }, beginAtZero: true } },
                plugins: { title: { display: true, text: `Financial Burnout for ${project.jobNo}` } }
            }
        });
    }
    
    function renderRevenuePieChart(projects) { // <-- FIX: It now accepts projects as a parameter
        if(!projects || projects.length === 0) return;
        DOMElements.revenuePlaceholder.style.display = 'none';
        DOMElements.revenuePieChartCanvas.style.display = 'block';

        const revenueByType = projects.reduce((acc, p) => {
            const type = p.projectType || 'Uncategorized';
            const fee = calculateTotalFee(p);
            acc[type] = (acc[type] || 0) + fee;
            return acc;
        }, {});

        if(revenuePieChartInstance) revenuePieChartInstance.destroy();
        
        const ctx = DOMElements.revenuePieChartCanvas.getContext('2d');
        revenuePieChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(revenueByType),
                datasets: [{
                    label: 'Total Revenue (AED)',
                    data: Object.values(revenueByType),
                    backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545', '#17a2b8', '#6c757d'],
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Total Revenue by Project Type' } } }
        });
    }

    function calculateTotalFee(project) {
        if (!project) return 0;
        if (project.remunerationType === 'lumpSum') return parseFloat(project.lumpSumFee) || 0;
        const area = parseFloat(project.builtUpArea) || 0;
        const costRate = parseFloat(project.constructionCostRate) || 0;
        const feePercentage = parseFloat(project.consultancyFeePercentage) || 0;
        return (area * costRate) * (feePercentage / 100);
    }

    main();
});
