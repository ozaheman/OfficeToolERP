



App.ProjectTabs.Invoicing = (() => {
    let currentInvoice = null;

    function init() {
        const container = document.getElementById('invoicing-tab');
        if (!container) return;

        container.innerHTML = `
            <h3>Invoice History</h3>
            <table class="data-table">
                <thead><tr><th>No.</th><th>Date / Status</th><th>Amount</th><th>Payment Details</th><th>Actions</th></tr></thead>
                <tbody id="invoice-history-body"></tbody>
            </table>
            <hr>
            <h3>Create New Invoice</h3>
            <div class="input-group">
                <label for="newInvoiceNo">Next Invoice No.</label>
                <input type="text" id="newInvoiceNo" placeholder="e.g., UA-INV-101">
            </div>
            
            <h4>Billable Design Milestones</h4>
            <table class="data-table">
                <thead><tr><th>Milestone</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                <tbody id="milestone-billing-body"></tbody>
            </table>

            <h4>Supervision Billing</h4>
            <div id="supervision-billing-monthly-container" class="document-category" style="background-color: #f8f9fa;">
                <!-- Content generated dynamically by renderInvoicingTab -->
            </div>
            
            <hr style="margin-top:20px;">
            <h4>Current Invoice Items</h4>
            <table class="data-table">
                <thead><tr><th>Description</th><th>Amount</th><th>Action</th></tr></thead>
                <tbody id="current-invoice-items-body"></tbody>
            </table>
            <button id="add-manual-item-btn" class="secondary-button" style="margin-top:10px;">+ Add Manual Item</button>
            <hr>
            <button id="raise-invoice-btn" class="primary-button" style="width:100%;" disabled>Raise Invoice</button>
        `;

        Object.assign(App.DOMElements, {
            invoiceHistoryBody: document.getElementById('invoice-history-body'),
            newInvoiceNo: document.getElementById('newInvoiceNo'),
            milestoneBillingBody: document.getElementById('milestone-billing-body'),
            supervisionBillingMonthlyContainer: document.getElementById('supervision-billing-monthly-container'),
            currentInvoiceItemsBody: document.getElementById('current-invoice-items-body'),
            addManualItemBtn: document.getElementById('add-manual-item-btn'),
            raiseInvoiceBtn: document.getElementById('raise-invoice-btn'),
        });

        setupEventListeners();
        resetCurrentInvoice();
    }

    function setupEventListeners() {
        App.DOMElements.milestoneBillingBody.addEventListener('click', e => {
            if (e.target.matches('.bill-milestone-btn')) {
                const row = e.target.closest('tr');
                const milestone = {
                    id: row.dataset.id,
                    text: row.dataset.text,
                    amount: parseFloat(row.dataset.amount)
                };
                addMilestoneToInvoice(milestone);
            }
        });

        // Use event delegation for the dynamic button
        App.DOMElements.supervisionBillingMonthlyContainer.addEventListener('click', e => {
            if (e.target.matches('#bill-next-month-btn')) {
                billNextSupervisionMonth();
            }
        });
        
        App.DOMElements.addManualItemBtn.addEventListener('click', addManualItemToInvoice);
        App.DOMElements.raiseInvoiceBtn.addEventListener('click', raiseInvoice);

        App.DOMElements.currentInvoiceItemsBody.addEventListener('click', e => {
            if (e.target.matches('.delete-item-btn')) {
                const index = parseInt(e.target.closest('tr').dataset.index, 10);
                currentInvoice.items.splice(index, 1);
                renderInvoicingTab();
            }
        });
        
        App.DOMElements.invoiceHistoryBody.addEventListener('click', e => {
             if (e.target.matches('.view-invoice-link')) {
                e.preventDefault();
                App.currentInvoiceIndex = parseInt(e.target.closest('tr').dataset.index, 10);
                const activePreview = App.DOMElements.previewTabs.querySelector('.active').dataset.tab;
                if (!['proforma', 'tax-invoice', 'receipt'].includes(activePreview)) {
                    App.DOMElements.previewTabs.querySelector('[data-tab="proforma"]').click();
                } else {
                    App.refreshCurrentPreview();
                }
            } else if (e.target.matches('.record-payment-btn')) {
                const index = parseInt(e.target.closest('tr').dataset.index, 10);
                showPaymentModal(App.currentProjectJobNo, index);
            }
        });
        
        App.DOMElements['payment-method']?.addEventListener('change', (e) => {
            App.DOMElements['cheque-details-group'].style.display = e.target.value === 'Cheque' ? 'block' : 'none';
        });

        App.DOMElements['save-payment-btn']?.addEventListener('click', handleSavePayment);
    }

    function resetCurrentInvoice() {
        currentInvoice = {
            no: '', date: new Date().toISOString().split('T')[0], type: 'Tax Invoice', status: 'Draft',
            items: [], subtotal: 0, vat: 0, total: 0
        };
    }

    async function renderInvoicingTab(project) {
        if (!App.currentProjectJobNo) return;
        const projectData = project || await DB.getProject(App.currentProjectJobNo);
        if (!projectData) return;
        
        const fullData = { ...projectData, ...App.ProjectTabs.Main.getTabData(), ...App.ProjectTabs.Fees.getTabData() };
        
        // Render Invoice History
        const historyBody = App.DOMElements.invoiceHistoryBody;
        historyBody.innerHTML = (fullData.invoices || []).map((inv, index) => {
            let paymentHtml = `<button class="record-payment-btn secondary-button">Record Payment</button>`;
            if (inv.status === 'Paid' && inv.paymentDetails) {
                const pd = inv.paymentDetails;
                paymentHtml = `<div class="payment-details">
                    <b>Method:</b> ${pd.method}<br>
                    <b>Amount:</b> ${App.formatCurrency(pd.amountPaid)}<br>
                    <b>Date:</b> ${App.formatDate(pd.date)}
                    ${pd.method === 'Cheque' ? `<br><b>Cheque:</b> ${pd.chequeNo}` : ''}
                </div>`;
            } else if (inv.status !== 'Raised' && inv.status !== 'Pending') {
                paymentHtml = 'N/A';
            }
            return `
            <tr data-index="${index}">
                <td><a href="#" class="view-invoice-link">${inv.no}</a></td>
                <td>${App.formatDate(inv.date)}<br><span class="status-${(inv.status || '').toLowerCase()}">${inv.status}</span></td>
                <td style="text-align:right;">${App.formatCurrency(inv.total)}</td>
                <td>${paymentHtml}</td>
                <td><button class="view-invoice-link secondary-button">Preview</button></td>
            </tr>`;
        }).join('');

        // Set next invoice number
        const lastInvNo = (fullData.invoices || []).reduce((max, inv) => {
            if (inv && typeof inv.no === 'string') {
                const num = parseInt(inv.no.split('-').pop(), 10);
                if (!isNaN(num)) return Math.max(max, num);
            }
            return max;
        }, 0);
        App.DOMElements.newInvoiceNo.value = `UA-${fullData.jobNo.split('/').pop()}-${String(lastInvNo + 1).padStart(2, '0')}`;

        // Render Billable Milestones
        const distribution = App.ProjectTabs.Fees.getFeeDistribution(fullData);
        const billedMilestoneIds = new Set((fullData.invoices || []).flatMap(inv => inv.items || []).filter(item => item.milestoneId).map(item => item.milestoneId));
        
        const currentInvoiceMilestoneIds = new Set(currentInvoice.items.filter(item => item.milestoneId).map(item => item.milestoneId));

        App.DOMElements.milestoneBillingBody.innerHTML = distribution.fees.map(milestone => {
            const isBilled = billedMilestoneIds.has(milestone.id);
            const isInCurrent = currentInvoiceMilestoneIds.has(milestone.id);
            const status = isBilled ? 'Billed' : (isInCurrent ? 'In Current' : 'Pending');
            return `<tr data-id="${milestone.id}" data-text="${milestone.text}" data-amount="${milestone.amount}">
                    <td>${milestone.text} (${milestone.percentage}%)</td>
                    <td style="text-align:right;">${App.formatCurrency(milestone.amount)}</td>
                    <td><span class="status-${status.toLowerCase().replace(' ','-')}">${status}</span></td>
                    <td><button class="bill-milestone-btn" ${isBilled || isInCurrent ? 'disabled' : ''}>+ Bill</button></td>
                </tr>`;
        }).join('');

        // Render Supervision Billing conditionally
        renderSupervisionBilling(fullData, distribution);

        // Render Current Invoice Items
        currentInvoice.subtotal = currentInvoice.items.reduce((sum, item) => sum + item.amount, 0);
        currentInvoice.vat = currentInvoice.subtotal * (fullData.vatRate / 100);
        currentInvoice.total = currentInvoice.subtotal + currentInvoice.vat;

        App.DOMElements.currentInvoiceItemsBody.innerHTML = currentInvoice.items.map((item, index) => `
            <tr data-index="${index}">
                <td>${item.description}</td>
                <td style="text-align:right;">${App.formatCurrency(item.amount)}</td>
                <td><button class="delete-item-btn danger-button">Delete</button></td>
            </tr>`).join('') + `
            <tr><td colspan="3" style="border-top: 1px solid #ccc;"></td></tr>
            <tr><td><strong>Subtotal</strong></td><td style="text-align:right;"><strong>${App.formatCurrency(currentInvoice.subtotal)}</strong></td><td></td></tr>
            <tr><td><strong>VAT (${fullData.vatRate}%)</strong></td><td style="text-align:right;"><strong>${App.formatCurrency(currentInvoice.vat)}</strong></td><td></td></tr>
            <tr><td><h3>Total</h3></td><td style="text-align:right;"><h3>${App.formatCurrency(currentInvoice.total)}</h3></td><td></td></tr>`;

        App.DOMElements.raiseInvoiceBtn.disabled = currentInvoice.items.length === 0;
    }

    function renderSupervisionBilling(fullData, distribution) {
        const container = App.DOMElements.supervisionBillingMonthlyContainer;

        if (fullData.projectStatus === 'Under Supervision' && fullData.supervisionStartDate) {
            const allInvoiceItems = (fullData.invoices || []).flatMap(inv => inv.items || []);
            const currentInvoiceItems = currentInvoice.items;
    
            const billedRegularMonths = allInvoiceItems.filter(item => item.type === 'supervision' && (item.supervisionType === 'regular' || !item.supervisionType)).length;
            const billedExtendedMonths = allInvoiceItems.filter(item => item.type === 'supervision' && item.supervisionType === 'extended').length;
            
            const currentInvoiceRegularMonths = currentInvoiceItems.filter(item => item.type === 'supervision' && item.supervisionType === 'regular').length;
    
            const totalBilledMonths = billedRegularMonths + billedExtendedMonths + currentInvoiceRegularMonths;
    
            const startDate = new Date(fullData.supervisionStartDate);
            const today = new Date();
            const monthsPassed = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
            
            const isDue = monthsPassed >= totalBilledMonths;
            const constructionDuration = fullData.constructionDuration || 1;
    
            let statusText = `Supervision started on: <strong>${App.formatDate(fullData.supervisionStartDate)}</strong>.`;
            statusText += `<br>Billed ${billedRegularMonths} of ${constructionDuration} regular months. Billed ${billedExtendedMonths} extended months.`;
            
            let buttonText = 'Bill Next Month';
    
            if ((billedRegularMonths + currentInvoiceRegularMonths) < constructionDuration) {
                const nextMonth = billedRegularMonths + currentInvoiceRegularMonths + 1;
                buttonText = `+ Bill Regular Month ${nextMonth} (${App.formatCurrency(distribution.monthlySupervisionFee)})`;
            } else {
                 const nextMonth = billedExtendedMonths + currentInvoice.items.filter(item => item.supervisionType === 'extended').length + 1;
                buttonText = `+ Bill Extended Month ${nextMonth} (${App.formatCurrency(fullData.extendedSupervisionFee)})`;
            }
            
            buttonText += isDue ? ' (Due Now)' : ' (Advance Billing)';
    
            container.innerHTML = `<p>${statusText}</p><button id="bill-next-month-btn" class="secondary-button" style="width:100%">${buttonText}</button>`;
        } else {
            container.innerHTML = `<p style="text-align:center; color: #666;">Set the project status to 'Under Supervision' and save the project to enable monthly billing.</p>`;
        }
    }

    function addMilestoneToInvoice(milestone) {
        currentInvoice.items.push({ type: 'milestone', milestoneId: milestone.id, description: `Design Fee: ${milestone.text}`, amount: milestone.amount });
        renderInvoicingTab();
    }

    async function billNextSupervisionMonth() {
        const fullData = { ...await DB.getProject(App.currentProjectJobNo), ...App.ProjectTabs.Main.getTabData(), ...App.ProjectTabs.Fees.getTabData() };
        const distribution = App.ProjectTabs.Fees.getFeeDistribution(fullData);

        const allInvoiceItems = (fullData.invoices || []).flatMap(inv => inv.items || []);
        const billedRegularMonths = allInvoiceItems.filter(item => item.type === 'supervision' && (item.supervisionType === 'regular' || !item.supervisionType)).length;
        const billedExtendedMonths = allInvoiceItems.filter(item => item.type === 'supervision' && item.supervisionType === 'extended').length;

        const currentInvoiceRegularMonths = currentInvoice.items.filter(item => item.type === 'supervision' && item.supervisionType === 'regular').length;

        let itemToAdd;
        if ((billedRegularMonths + currentInvoiceRegularMonths) < fullData.constructionDuration) {
            const nextMonthNumber = billedRegularMonths + currentInvoiceRegularMonths + 1;
            itemToAdd = {
                type: 'supervision',
                supervisionType: 'regular',
                description: `${nextMonthNumber}st payment on Monthly Supervision fees (Month ${nextMonthNumber} of ${fullData.constructionDuration})`,
                amount: distribution.monthlySupervisionFee
            };
        } else {
            const currentInvoiceExtendedMonths = currentInvoice.items.filter(item => item.type === 'supervision' && item.supervisionType === 'extended').length;
            const nextExtendedMonthNumber = billedExtendedMonths + currentInvoiceExtendedMonths + 1;
            itemToAdd = {
                type: 'supervision',
                supervisionType: 'extended',
                description: `Extended Supervision Fee - Month ${nextExtendedMonthNumber}`,
                amount: fullData.extendedSupervisionFee
            };
        }

        currentInvoice.items.push(itemToAdd);
        renderInvoicingTab();
    }
    
    function addManualItemToInvoice() {
        const description = prompt("Enter item description:");
        if (!description) return;
        const amount = parseFloat(prompt("Enter amount (AED):"));
        if (isNaN(amount) || amount <= 0) { alert("Invalid amount."); return; }
        currentInvoice.items.push({ type: 'manual', description, amount });
        renderInvoicingTab();
    }

    async function raiseInvoice() {
        if (currentInvoice.items.length === 0) { alert("Cannot raise an empty invoice."); return; }
        const invNo = App.DOMElements.newInvoiceNo.value.trim();
        if (!invNo) { alert("Invoice number is required."); return; }
        
        const project = await DB.getProject(App.currentProjectJobNo);
        if (!project.invoices) project.invoices = [];
        
        if (project.invoices.some(inv => inv.no === invNo)) {
            alert(`Error: An invoice with the number ${invNo} already exists for this project.`);
            return;
        }

        currentInvoice.no = invNo;
        currentInvoice.status = 'Raised';
        
        project.invoices.push(JSON.parse(JSON.stringify(currentInvoice)));
        await DB.putProject(project);
        App.currentInvoiceIndex = project.invoices.length - 1;
        
        alert(`Invoice ${currentInvoice.no} has been raised.`);
        App.Bulletin.log('Invoice Raised', `Invoice <strong>${currentInvoice.no}</strong> for project <strong>${project.jobNo}</strong> was raised.`);
        
        resetCurrentInvoice();
        renderInvoicingTab(project);
        App.DOMElements.previewTabs.querySelector('[data-tab="proforma"]').click();
    }
    
    async function showPaymentModal(jobNo, invIndex) {
        const project = await DB.getProject(jobNo);
        const invoice = project.invoices[invIndex];
        if (!invoice) return;

        App.DOMElements['payment-modal-jobno'].value = jobNo;
        App.DOMElements['payment-modal-inv-index'].value = invIndex;
        App.DOMElements['payment-modal-inv-no'].textContent = invoice.no;
        
        // Default the payment amount to the total of *this* invoice, not the cumulative balance.
        const invoiceTotal = typeof invoice.total === 'number' ? invoice.total : 0;
        App.DOMElements['payment-amount'].value = invoiceTotal.toFixed(2);
        
        App.DOMElements['payment-date'].value = new Date().toISOString().split('T')[0];
        App.DOMElements['payment-method'].value = 'Bank Transfer';
        App.DOMElements['cheque-details-group'].style.display = 'none';
        ['payment-cheque-no', 'payment-cheque-date', 'payment-cheque-bank'].forEach(id => App.DOMElements[id].value = '');
        
        App.DOMElements['record-payment-modal'].style.display = 'flex';
    }

    async function handleSavePayment() {
        const jobNo = App.DOMElements['payment-modal-jobno'].value;
        const invIndex = parseInt(App.DOMElements['payment-modal-inv-index'].value, 10);
        const amountPaid = parseFloat(App.DOMElements['payment-amount'].value);

        if (isNaN(amountPaid) || amountPaid <= 0) {
            alert('Please enter a valid amount paid.');
            return;
        }

        const project = await DB.getProject(jobNo);
        const invoice = project.invoices[invIndex];
        
        invoice.status = 'Paid';
        invoice.paymentDetails = {
            method: App.DOMElements['payment-method'].value,
            amountPaid: amountPaid,
            date: App.DOMElements['payment-date'].value,
        };
        if (invoice.paymentDetails.method === 'Cheque') {
            invoice.paymentDetails.chequeNo = App.DOMElements['payment-cheque-no'].value;
            invoice.paymentDetails.chequeDate = App.DOMElements['payment-cheque-date'].value;
            invoice.paymentDetails.bank = App.DOMElements['payment-cheque-bank'].value;
        }

        await DB.putProject(project);
        App.DOMElements['record-payment-modal'].style.display = 'none';
        await renderInvoicingTab(project);
        await renderDashboard(); // This function in app.js calls updateDashboardSummary
        Bulletin.log('Payment Recorded', `Payment of <strong>${App.formatCurrency(amountPaid)}</strong> recorded for invoice <strong>${invoice.no}</strong>.`);
    }

    function renderInvoiceDocuments(invoice) {
        if (!invoice) return '<h3>No invoice selected or created yet.</h3>';
        
        const activePreviewTab = App.DOMElements.previewTabs.querySelector('.active')?.dataset.tab;
        
        // This needs to be asynchronous to get the full project data
        (async () => {
            const project = await DB.getProject(App.currentProjectJobNo);
            const fullData = { ...project, ...App.ProjectTabs.Main.getTabData(), ...App.ProjectTabs.Fees.getTabData() };
            const feeDistribution = App.ProjectTabs.Fees.getFeeDistribution(fullData);
            let content = '';

            switch(activePreviewTab) {
                case 'proforma':
                    content = PROJECT_DOCUMENT_TEMPLATES.proforma(fullData, invoice, feeDistribution);
                    break;
                case 'tax-invoice':
                    content = PROJECT_DOCUMENT_TEMPLATES.taxInvoice(fullData, invoice, feeDistribution);
                    break;
                case 'receipt':
                    content = PROJECT_DOCUMENT_TEMPLATES.receipt(fullData, invoice);
                    break;
                default:
                    content = PROJECT_DOCUMENT_TEMPLATES.proforma(fullData, invoice, feeDistribution);
            }
            App.DOMElements[`${activePreviewTab}-preview`].innerHTML = content;
        })();

        // Return a placeholder while the async operation runs
        return '<h3>Generating preview...</h3>';
    }

    return { init, renderInvoicingTab, renderInvoiceDocuments };
})();