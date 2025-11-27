App.ProjectTabs.Fees = (() => {

function init() {
    const container = document.getElementById('fees-tab');
    if (!container) return;
    container.innerHTML = `
        <h3>Financials</h3>
        <div class="input-group"><label for="vatRate">VAT Rate (%)</label><input type="number" id="vatRate" value="5" step="0.1"></div><hr>
        <h3>Fee Calculation</h3>
        <div class="input-group"><label>Remuneration Type</label><div id="remuneration-type-selector"><label><input type="radio" name="remunerationType" value="lumpSum"> Lumpsum</label><label><input type="radio" name="remunerationType" value="percentage" checked> Percentage</label></div></div>
        <div id="lump-sum-group" class="input-group" style="display: none;"><label>Lumpsum Fee (AED)</label><input type="number" id="lumpSumFee" value="122500"></div>
        <div id="percentage-group">
            <div class="input-group"><label for="constructionCostRate">Cost/sq ft (AED)</label><input type="number" id="constructionCostRate" value="350"></div>
            <div class="input-group"><label>Est. Construction Cost</label><strong id="total-construction-cost-display">...</strong></div>
            <div class="input-group"><label for="consultancyFeePercentage">Fee (%)</label><input type="number" id="consultancyFeePercentage" value="3.5" step="0.1"></div>
        </div>
        <h3>Fee Split</h3>
        <div class="input-group-grid">
            <div class="input-group"><label for="designFeeSplit">Design Fee (%)</label><input type="number" id="designFeeSplit" value="60" step="1"></div>
            <div class="input-group"><label>Supervision Fee (%)</label><strong id="supervisionFeeSplitDisplay">40%</strong></div>
        </div>
        <div id="financial-summary-container" class="financial-summary"></div><hr>
        <div class="milestone-header">
            <h3>Design Fee Milestones (Editable)</h3>
            <span id="milestone-total-percentage" class="cumulative-total"></span>
        </div>
        <div id="fee-milestone-group"></div>
        <button id="add-milestone-btn" class="secondary-button" style="width: 100%; margin-top: 10px;">+ Add Milestone</button>
        <hr>
        <h3>Supervision Fee</h3>
        <div class="input-group"><label>Billing Method</label><div id="supervision-billing-method-selector"><label><input type="radio" name="supervisionBillingMethod" value="monthly" checked> Monthly</label><label><input type="radio" name="supervisionBillingMethod" value="progress"> Progress</label></div></div>
        <h3>Timeline</h3>
        <div class="input-group-grid">
            <div class="input-group"><label>Design (Months)</label><input type="number" id="designDuration" value="4"></div>
            <div class="input-group"><label>Construction (Months)</label><input type="number" id="constructionDuration" value="14"></div>
        </div>
        <div class="input-group"><label>Extended Fee (AED/month)</label><input type="number" id="extendedSupervisionFee" value="7500"></div>
        <h4>Notes & Exclusions</h4>
        <div class="checkbox-group" id="notes-group"></div>
    `;
    
    Object.assign(App.DOMElements, {
        vatRate: document.getElementById('vatRate'),
        lumpSumFee: document.getElementById('lumpSumFee'),
        constructionCostRate: document.getElementById('constructionCostRate'),
        consultancyFeePercentage: document.getElementById('consultancyFeePercentage'),
        designFeeSplit: document.getElementById('designFeeSplit'),
        designDuration: document.getElementById('designDuration'),
        constructionDuration: document.getElementById('constructionDuration'),
        extendedSupervisionFee: document.getElementById('extendedSupervisionFee'),
        feeMilestoneGroup: document.getElementById('fee-milestone-group'),
        financialSummaryContainer: document.getElementById('financial-summary-container'),
        totalConstructionCostDisplay: document.getElementById('total-construction-cost-display'),
        supervisionFeeSplitDisplay: document.getElementById('supervisionFeeSplitDisplay'),
        lumpSumGroup: document.getElementById('lump-sum-group'),
        percentageGroup: document.getElementById('percentage-group'),
        notesGroup: document.getElementById('notes-group'),
        addMilestoneBtn: document.getElementById('add-milestone-btn')
    });

    const notesContainer = App.DOMElements.notesGroup;
    CONTENT.NOTES.forEach(item => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" id="${item.id}"><span>${item.text}</span>`;
        notesContainer.appendChild(label);
    });
    
    setupEventListeners();
}

function setupEventListeners() {
    const container = document.getElementById('fees-tab');
    container.addEventListener('input', (e) => {
        if (e.target.name === 'remunerationType') updateRemunerationView();
        if (e.target.id === 'designFeeSplit') App.DOMElements.supervisionFeeSplitDisplay.textContent = `${100 - (parseFloat(e.target.value) || 0)}%`;
        if (e.target.classList.contains('milestone-percentage-input')) updateCumulativePercentages();
        if(['builtUpArea', 'vatRate', 'lumpSumFee', 'constructionCostRate', 'consultancyFeePercentage', 'designFeeSplit'].includes(e.target.id)) {
            updateFinancialSummary();
        }
    });

    App.DOMElements.addMilestoneBtn.addEventListener('click', () => {
        const newMilestone = { id: `custom_${Date.now()}`, text: 'New Milestone', percentage: 0 };
        renderMilestoneRow(newMilestone);
        updateCumulativePercentages();
    });

    App.DOMElements.feeMilestoneGroup.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-milestone-btn')) {
            e.target.closest('.milestone-percent-group').remove();
            updateCumulativePercentages();
            updateFinancialSummary();
        }
    });

    App.DOMElements.builtUpArea?.addEventListener('input', updateFinancialSummary);
}

function renderMilestoneRow(milestone) {
    const group = App.DOMElements.feeMilestoneGroup;
    const div = document.createElement('div');
    div.className = 'milestone-percent-group';
    div.dataset.id = milestone.id;
    div.innerHTML = `
        <input type="text" class="milestone-label-input" value="${milestone.text}">
        <input type="number" class="milestone-percentage-input" value="${milestone.percentage}" step="0.1" min="0">
        <span>%</span>
        <button class="delete-milestone-btn" title="Delete Milestone">×</button>
    `;
    group.appendChild(div);
}

function renderMilestones(milestones = []) {
    App.DOMElements.feeMilestoneGroup.innerHTML = '';
    milestones.forEach(renderMilestoneRow);
    updateCumulativePercentages();
}

function populateTabData(project) {
    const floatFields = ['vatRate', 'lumpSumFee', 'constructionCostRate', 'consultancyFeePercentage', 'designFeeSplit', 'designDuration', 'constructionDuration', 'extendedSupervisionFee'];
    floatFields.forEach(id => { if (App.DOMElements[id]) App.DOMElements[id].value = project[id] || 0; });
    
    document.querySelector(`input[name="remunerationType"][value="${project.remunerationType || 'percentage'}"]`).checked = true;
    document.querySelector(`input[name="supervisionBillingMethod"][value="${project.supervisionBillingMethod || 'monthly'}"]`).checked = true;

    CONTENT.NOTES.forEach(item => { 
        const cb = document.getElementById(item.id); 
        if (cb) cb.checked = project.notes?.[item.id] || false; 
    });
    
    const milestones = (project.feeMilestones && project.feeMilestones.length > 0)
        ? project.feeMilestones
        : CONTENT.FEE_MILESTONES.map(m => ({ id: m.id, text: m.text, percentage: m.defaultPercentage }));
    
    renderMilestones(milestones);
    updateRemunerationView();
}

function getTabData() {
    const data = { notes: {}, feeMilestones: [] };
    const floatFields = ['vatRate', 'lumpSumFee', 'constructionCostRate', 'consultancyFeePercentage', 'designFeeSplit', 'designDuration', 'constructionDuration', 'extendedSupervisionFee'];
    floatFields.forEach(id => data[id] = parseFloat(App.DOMElements[id]?.value) || 0);
    
    data.remunerationType = document.querySelector('input[name="remunerationType"]:checked')?.value;
    data.supervisionBillingMethod = document.querySelector('input[name="supervisionBillingMethod"]:checked')?.value;
    
    CONTENT.NOTES.forEach(item => { const cb = document.getElementById(item.id); if(cb) data.notes[item.id] = cb.checked; });
    
    App.DOMElements.feeMilestoneGroup.querySelectorAll('.milestone-percent-group').forEach(row => {
        data.feeMilestones.push({
            id: row.dataset.id,
            text: row.querySelector('.milestone-label-input').value.trim(),
            percentage: parseFloat(row.querySelector('.milestone-percentage-input').value) || 0
        });
    });
    
    return data;
}

function getFeeDistribution(projectData) {
    const data = projectData || { ...App.ProjectTabs.Main.getTabData(), ...getTabData() };
    const totalConsultancyFee = (data.remunerationType === 'lumpSum') ? (data.lumpSumFee || 0) : ((data.builtUpArea || 0) * (data.constructionCostRate || 0) * ((data.consultancyFeePercentage || 0) / 100));
    const designFeeSplit = data.designFeeSplit || 0;
    const designFeePortion = totalConsultancyFee * (designFeeSplit / 100);
    const supervisionFeePortion = totalConsultancyFee * ((100 - designFeeSplit) / 100);
    const constructionMonths = data.constructionDuration || 1;
    const monthlySupervisionFee = supervisionFeePortion / constructionMonths;
    
    // FIX: Defensively ensure feeMilestones is a proper array. It might be an array-like object from older data.
    const feeMilestonesArray = Array.isArray(data.feeMilestones) 
        ? data.feeMilestones 
        : (data.feeMilestones && typeof data.feeMilestones === 'object' ? Object.values(data.feeMilestones) : []);

    const feeBreakdown = feeMilestonesArray.map(item => ({
        id: item.id,
        text: item.text,
        percentage: item.percentage,
        amount: designFeePortion * (item.percentage / 100)
    })).filter(item => item.percentage > 0);

    return { totalConsultancyFee, designFeePortion, supervisionFeePortion, monthlySupervisionFee, fees: feeBreakdown };
}

function updateFinancialSummary() {
    const area = parseFloat(App.DOMElements.builtUpArea.value) || 0;
    const costRate = parseFloat(App.DOMElements.constructionCostRate.value) || 0;
    App.DOMElements.totalConstructionCostDisplay.textContent = `AED ${App.formatCurrency(area * costRate)}`;
    const distribution = getFeeDistribution();
    App.DOMElements.financialSummaryContainer.innerHTML = `
        <div class="summary-line"><span>Total Consultancy Fee</span><span>AED ${App.formatCurrency(distribution.totalConsultancyFee)}</span></div>
        <div class="summary-line"><span>- Design Fee Portion</span><span>AED ${App.formatCurrency(distribution.designFeePortion)}</span></div>
        <div class="summary-line"><span>- Supervision Fee Portion</span><span>AED ${App.formatCurrency(distribution.supervisionFeePortion)}</span></div>
        <div class="summary-line" style="font-size: 9pt; color: #666; padding-top: 5px;"><span>(Monthly Supervision Rate)</span><span>(AED ${App.formatCurrency(distribution.monthlySupervisionFee)}/month)</span></div>`;
    
    if (App.ProjectTabs.Invoicing && App.ProjectTabs.Invoicing.renderInvoicingTab) {
        App.ProjectTabs.Invoicing.renderInvoicingTab();
    }
    
    App.refreshCurrentPreview();
}

function updateRemunerationView() {
    const selectedType = document.querySelector('input[name="remunerationType"]:checked')?.value;
    App.DOMElements.lumpSumGroup.style.display = (selectedType === 'lumpSum') ? 'block' : 'none';
    App.DOMElements.percentageGroup.style.display = (selectedType === 'percentage') ? 'block' : 'none';
    updateFinancialSummary();
}

function updateCumulativePercentages() {
    const totalDisplay = document.getElementById('milestone-total-percentage');
    let cumulativeTotal = 0;
    const milestoneInputs = App.DOMElements.feeMilestoneGroup.querySelectorAll('.milestone-percentage-input');
    milestoneInputs.forEach(input => cumulativeTotal += parseFloat(input.value) || 0);
    totalDisplay.textContent = `Total: ${cumulativeTotal.toFixed(1)}%`;
    totalDisplay.className = `cumulative-total ${Math.abs(cumulativeTotal - 100) < 0.01 ? 'valid' : 'invalid'}`;
}

return { init, populateTabData, getTabData, getFeeDistribution };

})();