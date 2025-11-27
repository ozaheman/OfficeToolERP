
document.addEventListener('DOMContentLoaded', () => {

    // --- STATE & CONFIG ---
    let projects = [];
    let burnoutChartInstance = null;
    let revenuePieChartInstance = null;
    const formatCurrency = (num) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(num || 0);

    // --- DOM CACHE (Declared but not assigned) ---
    let DOMElements = {};
    
    // --- INITIALIZATION ---
    function init() {
        // Assign DOM elements AFTER the DOM is loaded
        DOMElements = {
            tabsContainer: document.querySelector('.tabs'),
            // Projections
            initialCostsBody: document.getElementById('initial-costs-body'),
            overheadsBody: document.getElementById('overheads-body'),
            financialSummaryBody: document.getElementById('financial-summary-body'),
            // BOQ
            boqBody: document.getElementById('boq-body'),
            boqSearch: document.getElementById('boq-search'),
            // Analytics
            loadProjectFileBtn: document.getElementById('load-project-file-btn'),
            projectFileInput: document.getElementById('project-file-input'),
            burnoutProjectSelect: document.getElementById('burnout-project-select'),
            burnoutChartCanvas: document.getElementById('burnoutChart'),
            revenuePieChartCanvas: document.getElementById('revenuePieChart'),
            burnoutPlaceholder: document.getElementById('burnout-placeholder'),
            revenuePlaceholder: document.getElementById('revenue-placeholder'),
        };

        setupEventListeners();
        renderFinancialProjections();
        renderBOQ();
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Now this will work because DOMElements are properly assigned
        DOMElements.tabsContainer.addEventListener('click', handleTabSwitch);
        DOMElements.loadProjectFileBtn.addEventListener('click', () => DOMElements.projectFileInput.click());
        DOMElements.projectFileInput.addEventListener('change', handleProjectFileSelect);
        DOMElements.burnoutProjectSelect.addEventListener('change', handleBurnoutProjectSelect);
        DOMElements.boqSearch.addEventListener('keyup', () => renderBOQ(DOMElements.boqSearch.value));
    }

    function handleTabSwitch(e) {
        if (!e.target.matches('.tab-button')) return;
        
        DOMElements.tabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${e.target.dataset.tab}-tab`).classList.add('active');
    }
    
    // --- UI RENDERING ---
    
    function renderFinancialProjections() {
        // Initial Costs
        let initialTotal = 0;
        FINANCIAL_DATA.INITIAL_COSTS.forEach(cost => {
            initialTotal += cost.amount;
            const row = DOMElements.initialCostsBody.insertRow();
            row.innerHTML = `<td>${cost.item}</td><td style="text-align:right;">${formatCurrency(cost.amount)}</td>`;
        });
        const initialTotalRow = DOMElements.initialCostsBody.insertRow();
        initialTotalRow.className = 'total-row';
        initialTotalRow.innerHTML = `<td>Total Initial Costs</td><td style="text-align:right;">${formatCurrency(initialTotal)}</td>`;

        // Yearly Overheads
        let yearlyTotal = 0;
        FINANCIAL_DATA.YEARLY_OVERHEADS.forEach(cost => {
            yearlyTotal += cost.amount;
            const row = DOMElements.overheadsBody.insertRow();
            row.innerHTML = `<td>${cost.item}</td><td style="text-align:right;">${formatCurrency(cost.amount)}</td><td style="text-align:right;">${formatCurrency(cost.amount / 12)}</td>`;
        });
        const overheadsTotalRow = DOMElements.overheadsBody.insertRow();
        overheadsTotalRow.className = 'total-row';
        overheadsTotalRow.innerHTML = `<td>Total Yearly Overheads</td><td style="text-align:right;">${formatCurrency(yearlyTotal)}</td><td style="text-align:right;">${formatCurrency(yearlyTotal / 12)}</td>`;

        // Summary
        let summaryHtml = '';
        FINANCIAL_DATA.FINANCIAL_SUMMARY.forEach(item => {
            let classes = "summary-item";
            if(item.isCost) classes += " is-cost";
            if(item.isBold) classes += " is-bold";
            summaryHtml += `<div class="${classes}"><span>${item.category}</span><span class="amount">${formatCurrency(item.amount)}</span></div>`;
        });
        DOMElements.financialSummaryBody.innerHTML = summaryHtml;
    }

    function renderBOQ(searchTerm = '') {
        const tbody = DOMElements.boqBody;
        tbody.innerHTML = '';
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const filteredBOQ = FINANCIAL_DATA.VILLA_BOQ.filter(item => 
            item.item.toLowerCase().includes(lowerCaseSearchTerm) ||
            item.category.toLowerCase().includes(lowerCaseSearchTerm)
        );

        filteredBOQ.forEach(item => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.category}</td>
                <td>${item.item} ${item.note ? `<br><small style="color:#888;">(${item.note})</small>` : ''}</td>
                <td>${item.unit || ''}</td>
                <td>${item.quantity || ''}</td>
                <td style="text-align:right;">${item.rate ? formatCurrency(item.rate) : ''}</td>
                <td style="text-align:right;">${formatCurrency(item.total)}</td>
            `;
            if (item.isTotal) {
                row.className = 'total-row';
                row.innerHTML = `<td colspan="6"><b>${item.totalLabel}</b></td><td style="text-align:right;"><b>${formatCurrency(item.grandTotal)}</b></td>`;
            }
        });
    }

    // --- ANALYTICS & CHART LOGIC ---

    function handleProjectFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const parsed = loadProjectsFromXmlString(e.target.result);
            if (parsed) {
                projects = parsed;
                alert(`Successfully loaded ${projects.length} projects for analysis.`);
                initializeCharts();
            } else {
                alert('Could not parse project file.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
    
    function initializeCharts() {
        populateProjectDropdown();
        renderRevenuePieChart();
        // Trigger select change to render burnout chart for first project if available
        if(DOMElements.burnoutProjectSelect.options.length > 1) {
            DOMElements.burnoutProjectSelect.selectedIndex = 1;
            DOMElements.burnoutProjectSelect.dispatchEvent(new Event('change'));
        }
    }

    function populateProjectDropdown() {
        const select = DOMElements.burnoutProjectSelect;
        select.innerHTML = '<option value="">-- Select a Project --</option>';
        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.jobNo;
            option.textContent = `${p.jobNo} - ${p.projectDescription}`;
            select.appendChild(option);
        });
        select.disabled = false;
    }

    function handleBurnoutProjectSelect(e) {
        const jobNo = e.target.value;
        if (!jobNo) {
            DOMElements.burnoutPlaceholder.style.display = 'flex';
            DOMElements.burnoutChartCanvas.style.display = 'none';
            if (burnoutChartInstance) burnoutChartInstance.destroy();
            return;
        }
        const project = projects.find(p => p.jobNo === jobNo);
        renderBurnoutChart(project);
    }
    
    function renderBurnoutChart(project) {
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

        CONTENT.FEE_MILESTONES.forEach(milestone => {
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
    
    function renderRevenuePieChart() {
        if(projects.length === 0) return;
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
        if (project.remunerationType === 'lumpSum') return parseFloat(project.lumpSumFee) || 0;
        const area = parseFloat(project.builtUpArea) || 0;
        const costRate = parseFloat(project.constructionCostRate) || 0;
        const feePercentage = parseFloat(project.consultancyFeePercentage) || 0;
        return (area * costRate) * (feePercentage / 100);
    }
    
    // Start the application
    init();

});
