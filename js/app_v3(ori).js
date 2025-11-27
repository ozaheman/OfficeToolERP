
// ===================================================================================
// MODULE 3: MAIN APPLICATION LOGIC
// ===================================================================================
document.addEventListener('DOMContentLoaded', () => {
    let allProjects = [];
    let currentProjectJobNo = null;
    let isDataDirty = false;
    let pendingInvoicesList = [];
    let expiringDocumentsList = [];
    let showAllInvoices = false;
    const DOMElements = {};

    async function main() {
        cacheDOMElements();
        populateControlTabs(); 
        initResizer();
        populateStaticControls();
        setupEventListeners();
        try {
            await FileManager.init();
            initializeAppState();
        } catch (error) {
            console.error("Failed to initialize File Manager:", error);
            alert("Error: Could not start the file storage system. Some features will be unavailable.");
        }
    }

    const getLetterheadHeaderHtml = () => `<div class="preview-header-image"><img src="${LOGO_BASE64}" alt="Company Letterhead"></div>`;
    const getCommonHeader = (dateStr) => `<p style="text-align:right; padding: 0 10mm;">${dateStr}</p>`;
    const getCommonFooter = () => `<div class="preview-footer">P.O. Box: 281, DUBAI (U.A.E) TEL.: 04-3493435, FAX: 04-3492030, E-mail: UrbanAxis@emirates.net.ae<br>Website: www.UrbanAxis.ae</div>`;
    const getBankDetails = () => `<div class="bank-details">
        <b>Bank Account Details for Payment:</b><br>
        Account Name: ${CONTENT.BANK_DETAILS.name}<br>
        Bank Name: ${CONTENT.BANK_DETAILS.bank}<br>
        Account No: ${CONTENT.BANK_DETAILS.ac}<br>
        IBAN: ${CONTENT.BANK_DETAILS.iban}<br>
        Swift Code: ${CONTENT.BANK_DETAILS.swift}
    </div>`;

    function getTotalFee() {
        const selectedType = document.querySelector('input[name="remunerationType"]:checked')?.value;
        if (selectedType === 'lumpSum') {
            return parseFloat(DOMElements.lumpSumFee.value) || 0;
        } else {
            const area = parseFloat(DOMElements.builtUpArea.value) || 0;
            const costRate = parseFloat(DOMElements.constructionCostRate.value) || 0;
            const feePercentage = parseFloat(DOMElements.consultancyFeePercentage.value) || 0;
            const constructionCost = area * costRate;
            return constructionCost * (feePercentage / 100);
        }
    }

    function numberToWords(num) {
        num = Math.round(num);
        const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        if ((num = num.toString()).length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return '';
        var str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str.charAt(0).toUpperCase() + str.slice(1).trim();
    }
    
    function renderBriefProposal(data) {
        const projectTitle = `${data.scopeOfWorkType === 'Other' ? data.otherScopeType : data.scopeOfWorkType} of ${data.projectDescription} on Plot No. ${data.plotNo}, ${data.area || 'Dubai, UAE'}.`;
        let html = getLetterheadHeaderHtml() + getCommonHeader(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));

        html += `<table style="width:100%; margin-bottom: 20px;">
                <tr><td style="width:80px;"><b>Owner:</b></td><td>${data.clientName}</td></tr>
                <tr><td><b>Subject:</b></td><td><b>Scope Of Work And Fee Proposal</b></td></tr>
                <tr><td><b>Project:</b></td><td>${projectTitle}</td></tr>
            </table>
            <p>Dear Sir,</p>
            <p>Reference to the above mentioned project our <b>SCOPE OF WORK</b> and <b>FEE Proposal</b> is as follows:</p>
            <h3>SCOPE OF WORK (SUMMARY):</h3><ol type="A">`;
        document.querySelectorAll('#scope-selection-container details > summary').forEach(summary => {
            const sectionId = summary.dataset.sectionId;
            let itemsHtml = '';
            if (data.scope && data.scope[sectionId]) {
                CONTENT.SCOPE_DEFINITIONS[sectionId]?.forEach(item => {
                    if (data.scope[sectionId][item.id]) itemsHtml += `<li>${item.brief}</li>`;
                });
            }
            if (itemsHtml) html += `<li><b>${summary.textContent}</b><ul>${itemsHtml}</ul></li>`;
        });
        html += `</ol><h3>Time Span:</h3><ul>
                    <li>Design & Approval: ${data.designDuration} Months from the signing of the Contract Date.</li>
                    <li>Construction: ${data.constructionDuration} months</li>
                 </ul>`;
        const feeDistribution = getFeeDistribution();
        html += `<h3>Fee Proposal:</h3>`;
        if (data.remunerationType === 'percentage') {
            const constructionCost = (data.builtUpArea || 0) * (data.constructionCostRate || 0);
            html += `<p>The total consultancy fee for the above mentioned services will be <b>${data.consultancyFeePercentage}%</b> of the total construction cost. Based on an estimated construction cost of <b>AED ${formatCurrency(constructionCost)}</b>, the estimated consultancy fee is <b>AED ${formatCurrency(feeDistribution.totalConsultancyFee)}/- + VAT</b>.</p>`;
        } else {
            html += `<p>The total consultancy fee for the above mentioned services will be a Lump sum of <b>AED ${formatCurrency(feeDistribution.totalConsultancyFee)}/- + VAT</b>.</p>`;
        }
        html += `<p>This fee is split into <b>Design Fee of AED ${formatCurrency(feeDistribution.designFeePortion)}</b> and <b>Supervision Fee of AED ${formatCurrency(feeDistribution.supervisionFeePortion)}</b>.</p>`;

        html += `<h4>Payment terms:</h4><h5>Design Stage</h5><table style="width:100%;">`;
        feeDistribution.fees.forEach(fee => {
            html += `<tr><td style="padding-right: 20px;">${fee.text} (${fee.percentage}%)</td><td style="text-align:right;">AED ${formatCurrency(fee.amount)}/-</td></tr>`;
        });
        html += `</table><h5>Supervision Stage</h5><p>To be paid monthly over ${data.constructionDuration} months at a rate of <b>AED ${formatCurrency(feeDistribution.monthlySupervisionFee)}/month</b>.</p>` + getCommonFooter();
        return html;
    }

    function renderFullAgreement(data) {
        const dateStr = new Date(data.agreementDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const projectTitle = `${data.scopeOfWorkType === 'Other' ? data.otherScopeType : data.scopeOfWorkType} of ${data.projectDescription} on Plot No. ${data.plotNo}, ${data.area || 'Dubai, UAE'}.`;

        let html = getLetterheadHeaderHtml() + getCommonHeader(dateStr);
        
        html += `<h3 style="text-align:center;">AGREEMENT FOR THE PROVISION OF CONSULTANCY ENGINEERING SERVICES</h3>
                 <p>This agreement is made and entered into, on <b>${dateStr}</b> by and between:</p>
                 <p><b>${data.clientName.toUpperCase()}</b>, P.O. Box No. <b>${data.clientPOBox}</b>, Dubai, United Arab Emirates (herein after referred to as the "Client" or first party).</p>
                 <p>AND</p><p><b>M/S. Urban Axis ARCHITECTURAL & CONSULTING ENGINEERS</b>, of Post Box 281, Dubai, United Arab Emirates (hereinafter referred to as the "CONSULTANT" or the Second party).</p>
                 <div class="page-break" style="page-break-after: always;"></div>` + getLetterheadHeaderHtml() + getCommonHeader(dateStr) +
            `<h4>The two parties agree as follows:</h4><p>Whereas the first party is desirous to have constructed, completed and maintained ${projectTitle} (hereinafter referred to as the "Project") and has assigned the provision of Consultancy Engineering Services thereof to the second party who accepted the assignment subject to the terms and conditions of this Contract Agreement.</p>`;
        
        const sectionTitles = { '1': 'STUDY AND DESIGN', '2': 'THE PRELIMINARY DESIGN STAGE', '3': 'FINAL STAGE', '4': 'TENDER DOCUMENTS PREPARATION STAGE', '5': 'SUPERVISION WORKS', '6': "CONSULTANT'S DUTIES & RESPONSIBILITIES", '8': 'THE PRINCIPLES OF CALCULATION', '9': "THE OWNER'S OBLIGATIONS", '10': 'AMENDMENTS', '11': 'EXTENSION OF COMPLETION PERIOD & SUPERVISION OF CONSULTANT\'S SERVICES' };
        
        for (const section of ['1', '2', '3', '4', '5', '6']) {
            let sectionHtml = '';
            if (data.scope && data.scope[section]) {
                CONTENT.SCOPE_DEFINITIONS[section]?.forEach(item => {
                    if (data.scope[section][item.id]) {
                        if (item.id === '3.2') {
                            let nestedList = '';
                            if (data.scope['3.2']) {
                                CONTENT.SCOPE_DEFINITIONS['3.2']?.forEach(nestedItem => {
                                    if (data.scope['3.2'][nestedItem.id]) nestedList += `<li>${nestedItem.detailed}</li>`;
                                });
                            }
                            sectionHtml += `<li>${item.detailed.replace('</ol>', nestedList + '</ol>')}</li>`;
                        } else {
                            sectionHtml += `<li>${item.detailed}</li>`;
                        }
                    }
                });
            }
            if (sectionHtml) html += `<h4>${sectionTitles[section]}</h4><ol type="1" style="list-style-type: none; padding-left: 0;">${sectionHtml}</ol>`;
        }

        html += `<h4>7. REMUNERATION</h4>`;
        const feeDistribution = getFeeDistribution();

        let remunerationText = '';
        if (data.remunerationType === 'percentage') {
            const constructionCost = (data.builtUpArea || 0) * (data.constructionCostRate || 0);
            remunerationText = `<p>The Consultants' total remuneration for provision of their services shall be <b>${data.consultancyFeePercentage}%</b> of the final certified construction cost. For the purpose of initial payments, this is based on an estimated construction cost of <b>AED ${formatCurrency(constructionCost)}</b>, resulting in an estimated total consultancy fee of <b>AED ${formatCurrency(feeDistribution.totalConsultancyFee)}/- excluding VAT</b>.</p>`;
        } else {
            remunerationText = `<p>The Consultants' total remuneration for provision of their services shall be a total <b>Lumpsum of AED ${formatCurrency(feeDistribution.totalConsultancyFee)}/- excluding VAT</b>.</p>`;
        }
        remunerationText += `<p>This total fee is composed of a <b>Design Fee of AED ${formatCurrency(feeDistribution.designFeePortion)}</b> and a <b>Supervision Fee of AED ${formatCurrency(feeDistribution.supervisionFeePortion)}</b>. The due payments shall be made in installments as follows:</p>`

        html += remunerationText;
        html += `<h5>A. Design Fee Payments</h5><ul style="list-style-type: none; padding-left: 0;">`;
        feeDistribution.fees.forEach(fee => {
            html += `<li><b>Payment for ${fee.text} (${fee.percentage}%): AED ${formatCurrency(fee.amount)}/- + VAT</b></li>`;
        });
        html += `</ul><h5>B. Supervision Fee Payments</h5>`;
        html += `<p>The supervision fee of AED ${formatCurrency(feeDistribution.supervisionFeePortion)} shall be paid in monthly installments of <b>AED ${formatCurrency(feeDistribution.monthlySupervisionFee)}</b> over the ${data.constructionDuration}-month construction period.</p>`;

        let notesHtml = '';
        if (data.notes) {
            CONTENT.NOTES.forEach(item => {
                if (data.notes[item.id]) notesHtml += `<li>${item.text}</li>`;
            });
        }
        if (notesHtml) html += `<p><b>Note:</b></p><ol>${notesHtml}</ol>`;
        for (const section of ['8', '9', '10', '11']) {
            let sectionHtml = '';
            if (data.scope && data.scope[section]) {
                CONTENT.SCOPE_DEFINITIONS[section]?.forEach(item => {
                    if (data.scope[section][item.id]) sectionHtml += `<li>${item.detailed}</li>`;
                });
            }
            if (sectionHtml) html += `<h4>${sectionTitles[section]}</h4><ol type="1" style="list-style-type: none; padding-left: 0;">${sectionHtml}</ol>`;
        }
        html += `<h4>12. OWNERSHIP OF DOCUMENTS</h4><p>All technical specifications and other contract documents shall remain the sole property of the Consultant...</p>
                 <h4>13. TERMINATION OF THE CONTRACT AGREEMENT</h4><p>The Owner shall have right to terminate this Contract agreement vide a written notice... On the other hand, the Consultant may terminate this contract agreement vide a written notice to the Owner if the Consultant's due payments were delayed...</p>
                 <h4>14. SETTLEMENT OF DISPUTES</h4><p>All disputes and differences arising the two parties be settled amicably... Both parties shall authorize the Society of Engineers, U.A.E. to appoint a sole arbitrator...</p>
                 <div class="signature-block">
                     <div><b>FIRST PARTY:</b><br><br><br>_________________________<br>${data.clientName.toUpperCase()}</div>
                     <div><b>SECOND PARTY:</b><br><br><br>_________________________<br>M/s. Urban Axis ARCHITECTURAL & CONSULTING ENGINEERS</div>
                 </div>` + getCommonFooter();
        return html;
    }

    function renderAssignmentOrder(data) {
        const location = data.area || 'Dubai, UAE';
        let html = getLetterheadHeaderHtml() + getCommonHeader(new Date(data.agreementDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
        html += `<h3 style="text-align:center;">ASSIGNMENT ORDER</h3>
                 <p>I, the undersigned <b>${data.clientName.toUpperCase()}</b>, Owner of Plot No. <b>${data.plotNo}</b>, ${location}, do hereby, appoint M/s. Urban Axis ARCHITECTURAL & CONSULTING ENGINEERS, Post Box No. 281, Dubai, for the required technical studies and the construction of the ${data.projectDescription} on the above mentioned plot, including the preparation of initial designs, and provisional costs of the project.</p>
                 <p>I hereby further authorize the above mentioned Consultants to sign in my name & on my behalf before all Government department all applications / documents necessary for obtaining any data for conducting such studies and obtaining licenses.</p>
                 <br><br><br>
                 <table style="width:100%;">
                     <tr><td style="width:30%;"><b>Name & Signature:</b></td><td>_________________________<br>${data.clientName.toUpperCase()}</td></tr>
                     <tr><td><br><b>Signature of the Consultant:</b></td><td><br>_________________________<br>For Urban Axis ARCHITECTURAL & CONSULTING ENGINEERS</td></tr>
                     <tr><td><br><b>Witness:</b></td><td><br>_________________________<br>Project Architect</td></tr>
                 </table>` + getCommonFooter();
        return html;
    }

    function renderInvoiceDocuments(invoiceData) {
        const projectData = getFormDataFromUI();
        const project = allProjects.find(p => p.jobNo === currentProjectJobNo);
        const allInvoices = (project && project.invoices) ? project.invoices : [];

        DOMElements['proforma-preview'].innerHTML = renderGenericInvoice(invoiceData, projectData, allInvoices, 'PROFORMA INVOICE', false);
        DOMElements['tax-invoice-preview'].innerHTML = renderGenericInvoice(invoiceData, projectData, allInvoices, 'TAX INVOICE', true);
        DOMElements['receipt-preview'].innerHTML = renderReceipt(invoiceData, projectData);
    }

    function renderGenericInvoice(invoiceData, projectData, allInvoices, title, includeBankDetails) {
        if (!invoiceData) {
            return `<div style="padding: 20px; text-align: center;">Select an invoice to view its preview.</div>`;
        }
        const invDate = new Date(invoiceData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        let html = getLetterheadHeaderHtml() + getCommonHeader(invDate);

        const projectTitle = `${projectData.scopeOfWorkType === 'Other' ? projectData.otherScopeType : projectData.scopeOfWorkType} of ${projectData.projectDescription} on Plot No. ${projectData.plotNo}, ${projectData.area || 'Dubai, UAE'}.`;
        const invNumber = invoiceData.no;
        
        const invSubtotal = parseFloat(invoiceData.amount || 0);
        const vatRate = projectData.vatRate || 0;

        let amountReceivedSoFar = 0;
        allInvoices.forEach(inv => {
            if (inv.status === 'Paid' && new Date(inv.date) < new Date(invoiceData.date)) {
                amountReceivedSoFar += parseFloat(inv.amount || 0) * (1 + (projectData.vatRate / 100));
            }
        });

        let itemsHtml = (invoiceData.items && Array.isArray(invoiceData.items)) 
            ? invoiceData.items.map(item => `<tr><td>${item.text}</td><td style="text-align:right;">${formatCurrency(item.amount)}</td></tr>`).join('')
            : '';

        const vatAmount = invSubtotal * (vatRate / 100);
        const totalAmountOfThisInvoice = invSubtotal + vatAmount;

        html += `<h2 style="text-align:center;">${title}</h2>
                 <table style="width:100%; border-collapse: collapse; margin-bottom:30px;">
                     <tr>
                         <td style="width:50%; vertical-align:top;"><b>Bill To:</b><br>${projectData.clientName}<br>P.O. Box: ${projectData.clientPOBox}<br>TRN: ${projectData.clientTrn || 'N/A'}</td>
                         <td style="width:50%; vertical-align:top; text-align:right;"><b>Invoice #:</b> ${invNumber}<br><b>Date:</b> ${invDate}<br><b>Our TRN:</b> ${CONTENT.VAT_TRN}</td>
                     </tr>
                 </table>
                 <p><b>Project:</b> ${projectTitle}</p>
                 <table class="output-table">
                     <thead><tr><th>Description</th><th>Amount (AED)</th></tr></thead>
                     <tbody>${itemsHtml}</tbody>
                     <tfoot>
                        <tr><td style="text-align:right;"><b>Subtotal</b></td><td style="text-align:right;"><b>${formatCurrency(invSubtotal)}</b></td></tr>
                        <tr><td>LESS amount received so far</td><td style="text-align:right;">(${formatCurrency(amountReceivedSoFar)})</td></tr>
                        <tr><td>ADD ${vatRate}% VAT</td><td style="text-align:right;">${formatCurrency(vatAmount)}</td></tr>
                        <tr><td style="text-align:right; font-weight:bold;">Total Amount Due</td><td style="text-align:right; font-weight:bold;">AED ${formatCurrency(totalAmountOfThisInvoice - amountReceivedSoFar)}</td></tr>
                     </tfoot>
                 </table>
                 <br><p><b>Amount in Words:</b> ${numberToWords(totalAmountOfThisInvoice - amountReceivedSoFar)} Dirhams Only.</p>`;

        if (includeBankDetails) {
            html += getBankDetails();
        }

        html += getCommonFooter();
        return html;
    }

    function renderReceipt(invoiceData, projectData) {
        if (!invoiceData) {
            return `<div style="padding: 20px; text-align: center;">Select an invoice to view its receipt.</div>`;
        }

        const invAmount = parseFloat(invoiceData.amount || 0);
        const vatRate = projectData.vatRate || 0;
        const totalAmount = invAmount * (1 + vatRate / 100);
        const receiptDate = invoiceData.chequeDate ? new Date(invoiceData.chequeDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        
        let html = getLetterheadHeaderHtml() + getCommonHeader(receiptDate);

        let paymentDetailsHtml = `against our Invoice No. <b>${invoiceData.no}</b>.`;
        if (invoiceData.chequeNo) {
            paymentDetailsHtml = `by Cheque No. <b>${invoiceData.chequeNo}</b> dated ${receiptDate} against our Invoice No. <b>${invoiceData.no}</b>.`
        }

        html += `<h2 style="text-align:center;">RECEIPT VOUCHER</h2>
                 <p style="margin-top: 40px;">Received with thanks from <b>M/s. ${projectData.clientName}</b></p>
                 <p>the sum of <b>AED ${formatCurrency(totalAmount)}/-</b></p>
                 <p>(in words: <b>${numberToWords(totalAmount)} Dirhams Only</b>)</p>
                 <p>${paymentDetailsHtml}</p>
                 <div style="margin-top: 80px;">
                    <p style="border-top: 1px solid #333; width: 250px; display: inline-block; padding-top: 5px;">For: Urban Axis ARCHITECTURAL & CONSULTING ENGINEERS</p>
                 </div>
                 <p style="margin-top: 20px;"><em>This is a computer-generated receipt and does not require a signature.</em></p>`

        html += getBankDetails();
        html += getCommonFooter();

        return html;
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

    function setSelectOrOther(selectEl, otherInputEl, value, otherValue) {
        if (!selectEl || !otherInputEl) return;
        const optionExists = Array.from(selectEl.options).some(opt => opt.value === value);
        if (optionExists) {
            selectEl.value = value;
            otherInputEl.value = '';
        } else {
            selectEl.value = 'Other';
            otherInputEl.value = value || otherValue || '';
        }
    }

    function setupOtherFieldToggle(selectId, otherContainerId) {
        const selectEl = DOMElements[selectId];
        const containerEl = DOMElements[otherContainerId];
        if (selectEl && containerEl) {
            selectEl.addEventListener('change', () => { containerEl.style.display = selectEl.value === 'Other' ? 'block' : 'none'; });
        }
    }

    function showPendingInvoiceModal() {
        const listEl = DOMElements['pending-invoice-list'];
        if (pendingInvoicesList.length === 0) {
            listEl.innerHTML = '<p>No pending invoices found.</p>';
        } else {
            let tableHtml = '<table class="output-table"><thead><tr><th>Job No</th><th>Client</th><th>Invoice No</th><th>Date</th><th>Amount (AED)</th></tr></thead><tbody>';
            pendingInvoicesList.forEach(inv => {
                tableHtml += `<tr><td>${inv.jobNo}</td><td>${inv.clientName}</td><td>${inv.no}</td><td>${inv.date}</td><td style="text-align:right;">${formatCurrency(parseFloat(inv.amount || 0))}</td></tr>`;
            });
            tableHtml += '</tbody></table>';
            listEl.innerHTML = tableHtml;
        }
        DOMElements['pending-invoice-modal'].style.display = 'flex';
    }

    function showExpiringDocumentsModal() {
        const listEl = DOMElements['expiring-documents-list'];
        if (expiringDocumentsList.length === 0) {
            listEl.innerHTML = '<p>No documents are expiring in the next 30 days.</p>';
        } else {
            let tableHtml = '<table class="output-table"><thead><tr><th>Project Name</th><th>Job No</th><th>Document Name</th><th>Category</th><th>Expiry Date</th></tr></thead><tbody>';
            expiringDocumentsList.forEach(doc => {
                 const expiryDate = new Date(doc.expiryDate).toLocaleDateString('en-CA');
                 tableHtml += `<tr><td>${doc.projectName}</td><td>${doc.jobNo}</td><td>${doc.name}</td><td>${doc.subCategory.replace(/_/g, ' ')}</td><td>${expiryDate}</td></tr>`;
            });
            tableHtml += '</tbody></table>';
            listEl.innerHTML = tableHtml;
        }
        DOMElements['expiring-documents-modal'].style.display = 'flex';
    }

    function handleInvoiceTableEvents(e) {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;

        const invoiceIndex = parseInt(row.dataset.invoiceIndex, 10);
        const projectIndex = allProjects.findIndex(p => p.jobNo === currentProjectJobNo);
        if (projectIndex === -1 || isNaN(invoiceIndex)) return;

        const project = allProjects[projectIndex];
        const invoice = project.invoices[invoiceIndex];

        if (target.matches('.view-invoice-link')) {
            e.preventDefault();
            renderInvoiceDocuments(invoice);
            DOMElements.previewTabs.querySelector(`[data-tab="tax-invoice"]`).click();
        } else if (target.matches('.invoice-status-dropdown')) {
            invoice.status = target.value;
            isDataDirty = true;
            renderDashboard();
            renderInvoicingTab(project);
        } else if (target.matches('.invoice-details-input, .cheque-no-input, .cheque-date-input')) {
            invoice.paymentDetails = row.querySelector('.invoice-details-input').value;
            invoice.chequeNo = row.querySelector('.cheque-no-input').value;
            invoice.chequeDate = row.querySelector('.cheque-date-input').value;
            isDataDirty = true;
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
        if(item.newProgress) newRow.dataset.newProgress = item.newProgress;
        newRow.innerHTML = `
            <td><input type="text" class="editable-desc" value="${item.text}" style="width:100%;"></td>
            <td><input type="number" class="editable-amt" value="${item.amount}" style="width:100%; text-align:right;"></td>
            <td><button type="button" class="remove-btn">X</button></td>`;
        return true;
    }

    function addExtendedSupervisionItem() {
        const project = allProjects.find(p => p.jobNo === currentProjectJobNo);
        if (!project) return;
        const extendedMonthsBilled = project.billedExtendedSupervisionMonths || 0;
        const nextExtendedMonth = extendedMonthsBilled + 1;
        const fee = parseFloat(DOMElements.extendedSupervisionFee.value) || 0;
        addInvoiceItemToTable({ id: `ext-month-${nextExtendedMonth}`, type: 'supervision-extended', text: `Extended Supervision Fee - Month ${nextExtendedMonth}`, amount: fee });
    }

    function addProgressSupervisionItem() {
        const project = allProjects.find(p => p.jobNo === currentProjectJobNo);
        if (!project) return;
        const feeDistribution = getFeeDistribution();
        const lastProgress = project.lastBilledProgress || 0;
        const currentProgress = parseFloat(DOMElements.projectProgressInput.value);
        if (isNaN(currentProgress) || currentProgress <= lastProgress || currentProgress > 100) {
            alert(`Please enter a valid progress percentage greater than the last billed progress of ${lastProgress}%.`);
            return;
        }
        const progressDiff = currentProgress - lastProgress;
        const amount = feeDistribution.supervisionFeePortion * (progressDiff / 100);
        const success = addInvoiceItemToTable({ id: `progress-${currentProgress}`, type: 'supervision-progress', text: `Supervision Fee for Project Progress (${lastProgress}% to ${currentProgress}%)`, amount: amount, newProgress: currentProgress });
        if(success) DOMElements.projectProgressInput.value = '';
    }

    function addMonthlySupervisionItem() {
        const project = allProjects.find(p => p.jobNo === currentProjectJobNo);
        if (!project) return;
        const feeDistribution = getFeeDistribution();
        const billedMonths = project.billedSupervisionMonths || 0;
        addInvoiceItemToTable({ id: `month-${billedMonths + 1}`, type: 'supervision-monthly', text: `Supervision Fee for Month ${billedMonths + 1}`, amount: feeDistribution.monthlySupervisionFee });
    }

    function generateProrataProformaPDF() {
        const projectData = getFormDataFromUI();
        const feeDistribution = getFeeDistribution(projectData);
        const prorataPercentage = parseFloat(DOMElements.prorataPercentage.value);
        if (isNaN(prorataPercentage) || prorataPercentage <= 0 || prorataPercentage > 100) {
            alert("Please enter a valid Prorata Percentage (1-100).");
            return;
        }
        const invSubtotal = feeDistribution.totalConsultancyFee * (prorataPercentage / 100);
        const vatRate = projectData.vatRate || 0;
        const vatAmount = invSubtotal * (vatRate / 100);
        const totalAmountDue = invSubtotal + vatAmount;
        const proformaData = { no: `PROFORMA-${projectData.jobNo.split('/')[2]}-${prorataPercentage}p`, date: new Date().toLocaleDateString('en-CA'), amount: invSubtotal, items: [{ text: `Consultancy Fee for Project Progress (${prorataPercentage}%)`, amount: invSubtotal }] };
        const projectTitle = `${projectData.scopeOfWorkType === 'Other' ? projectData.otherScopeType : projectData.scopeOfWorkType} of ${projectData.projectDescription} on Plot No. ${projectData.plotNo}, ${projectData.area || 'Dubai, UAE'}.`;
        const invDate = new Date(proformaData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        
        let html = getLetterheadHeaderHtml() + getCommonHeader(invDate);
        html += `<h2 style="text-align:center;">PROFORMA INVOICE</h2>
                 <table style="width:100%; border-collapse: collapse; margin-bottom:30px;">
                     <tr>
                         <td style="width:50%; vertical-align:top;"><b>Bill To:</b><br>${projectData.clientName}<br>P.O. Box: ${projectData.clientPOBox}<br>TRN: ${projectData.clientTrn || 'N/A'}</td>
                         <td style="width:50%; vertical-align:top; text-align:right;"><b>Invoice #:</b> ${proformaData.no}<br><b>Date:</b> ${invDate}<br><b>Our TRN:</b> ${CONTENT.VAT_TRN}</td>
                     </tr>
                 </table>
                 <p><b>Project:</b> ${projectTitle}</p>
                 <table class="output-table">
                     <thead><tr><th>Description</th><th>Amount (AED)</th></tr></thead>
                     <tbody><tr><td>${proformaData.items[0].text}</td><td style="text-align:right;">${formatCurrency(proformaData.items[0].amount)}</td></tr></tbody>
                     <tfoot>
                        <tr><td style="text-align:right;"><b>Subtotal</b></td><td style="text-align:right;"><b>${formatCurrency(invSubtotal)}</b></td></tr>
                        <tr><td>ADD ${vatRate}% VAT</td><td style="text-align:right;">${formatCurrency(vatAmount)}</td></tr>
                        <tr><td style="text-align:right; font-weight:bold;">Total Amount Due</td><td style="text-align:right; font-weight:bold;">AED ${formatCurrency(totalAmountDue)}</td></tr>
                     </tfoot>
                 </table>
                 <br><p><b>Amount in Words:</b> ${numberToWords(totalAmountDue)} Dirhams Only.</p>` + getBankDetails() + getCommonFooter();

        PDFGenerator.generate({ tempContent: html, projectJobNo: currentProjectJobNo, pageSize: DOMElements['page-size-selector'].value });
    }

    function updateSupervisionBillingView() {
        const method = document.querySelector('input[name="supervisionBillingMethod"]:checked')?.value;
        DOMElements['supervision-billing-monthly-container'].style.display = method === 'monthly' ? 'block' : 'none';
        DOMElements['supervision-billing-progress-container'].style.display = method === 'progress' ? 'block' : 'none';
        DOMElements['prorata-percentage-group'].style.display = method === 'progress' ? 'block' : 'none';
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
            const project = allProjects.find(p => p.jobNo === currentProjectJobNo);
            if (project) renderInvoicingTab(project);
        }
    }

    function updateRemunerationView() {
        const selectedType = document.querySelector('input[name="remunerationType"]:checked')?.value;
        DOMElements['lump-sum-group'].style.display = (selectedType === 'lumpSum') ? 'block' : 'none';
        DOMElements['percentage-group'].style.display = (selectedType === 'percentage') ? 'block' : 'none';
        updateFinancialSummary();
        renderAllPreviews();
    }

    function handleRaiseInvoice() {
        const invNo = DOMElements.newInvoiceNo.value;
        if (!invNo) { alert("Please enter an Invoice Number."); return; }
        const projectIndex = allProjects.findIndex(p => p.jobNo === currentProjectJobNo);
        if (projectIndex === -1) return;
        const project = allProjects[projectIndex];
        const currentItemsRows = DOMElements['current-invoice-items-body'].querySelectorAll('tr');
        if (currentItemsRows.length === 0) { alert("Please add at least one item to the invoice before raising."); return; }

        let totalInvoiceAmount = 0, newBilledMonths = project.billedSupervisionMonths || 0, newBilledExtendedMonths = project.billedExtendedSupervisionMonths || 0, newLastBilledProgress = project.lastBilledProgress || 0;
        const invoiceItems = Array.from(currentItemsRows).map(row => {
            const item = { type: row.dataset.itemType, id: row.dataset.itemId, text: row.querySelector('input.editable-desc').value, amount: parseFloat(row.querySelector('input.editable-amt').value) };
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
        isDataDirty = true;
        renderInvoicingTab(project);
        alert(`Invoice ${invNo} for AED ${formatCurrency(totalInvoiceAmount)} raised successfully.`);
        renderDashboard();
    }

    function predictResources() {
        const totalFee = getTotalFee();
        const builtUpArea = parseFloat(DOMElements.builtUpArea.value) || 0;
        const designMonths = parseFloat(DOMElements.designDuration.value) || 0;
        const constrMonths = parseFloat(DOMElements.constructionDuration.value) || 0;
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
            </div><p>Based on Built-up Area: ${formatCurrency(builtUpArea)} sq ft</p>${tableHtml}`;
    }

    function generateQRCode() {
        const data = getFormDataFromUI();
        const fee = getTotalFee();
        const qrData = `Client: ${data.clientName}, Plot: ${data.plotNo}, Fee: AED ${formatCurrency(fee)}`;
        DOMElements['qr-code'].innerHTML = "";
        new QRCode(DOMElements['qr-code'], { text: qrData, width: 128, height: 128 });
    }

    async function renderDashboard() {
        const tbody = DOMElements['project-list-body'];
        const searchTerm = DOMElements['search-box'].value.toLowerCase();
        const timeFilter = DOMElements['time-filter'].value;
        tbody.innerHTML = '<tr><td colspan="7">Loading projects...</td></tr>';

        let totalPendingAmount = 0, pendingInvoiceCount = 0, totalOnHoldAmount = 0, lastPaidInvoice = null;
        pendingInvoicesList = [];

        allProjects.forEach(p => {
            (Array.isArray(p.invoices) ? p.invoices : []).forEach(inv => {
                const amount = parseFloat(inv.amount || 0);
                if (inv.status === 'Raised' || inv.status === 'Pending') { pendingInvoiceCount++; totalPendingAmount += amount; pendingInvoicesList.push({ ...inv, clientName: p.clientName, jobNo: p.jobNo }); }
                else if (inv.status === 'Paid') { if (!lastPaidInvoice || new Date(inv.date) > new Date(lastPaidInvoice.date)) lastPaidInvoice = inv; }
                else if (inv.status === 'On Hold') { totalOnHoldAmount += amount; }
            });
        });

        DOMElements['pending-invoices-count'].textContent = pendingInvoiceCount;
        DOMElements['pending-invoices-amount'].textContent = `AED ${formatCurrency(totalPendingAmount)}`;
        DOMElements['last-paid-amount'].textContent = lastPaidInvoice ? `AED ${formatCurrency(lastPaidInvoice.amount)}` : 'N/A';
        DOMElements['on-hold-amount'].textContent = `AED ${formatCurrency(totalOnHoldAmount)}`;
        
        // Update expiring documents count
        expiringDocumentsList = await FileManager.getExpiringDocuments();
        DOMElements['expiring-documents-count'].textContent = expiringDocumentsList.length;


        const filteredProjects = allProjects.filter(p => {
            if (!p || !p.jobNo) return false;
            let timeMatch = true;
            if (timeFilter !== 'all') { const pastDate = new Date(); pastDate.setMonth(new Date().getMonth() - parseInt(timeFilter)); timeMatch = new Date(p.agreementDate) >= pastDate; }
            const searchMatch = !searchTerm || ['clientName', 'plotNo', 'jobNo'].some(key => p[key]?.toLowerCase().includes(searchTerm)) || p.invoices?.some(inv => inv.no?.toLowerCase().includes(searchTerm));
            return timeMatch && searchMatch;
        });

        tbody.innerHTML = '';
        const projectPromises = filteredProjects.sort((a, b) => (new Date(b.agreementDate) - new Date(a.agreementDate))).map(async p => {
            const affectionPlanFile = await FileManager.getFileBySubCategory(p.jobNo, 'affection_plan');
            const row = document.createElement('tr');
            row.dataset.jobNo = p.jobNo;
            const statusClass = (p.projectStatus || 'pending').toLowerCase().replace(/ /g, '-');
            const invoicesToDisplay = showAllInvoices ? (p.invoices || []) : (p.invoices || []).filter(inv => inv.status === 'Raised' || inv.status === 'Pending');
            const invoiceDetailsHtml = invoicesToDisplay.length > 0 ? invoicesToDisplay.map(inv => `<div class="invoice-row"><span><b>${inv.no}</b></span><span>${inv.date}</span><span style="font-weight:bold; text-align:right;">${formatCurrency(parseFloat(inv.amount || 0))}</span><span>(${inv.status})</span></div>`).join('') : 'No relevant invoices.';
            let actionsHtml = `<button class="edit-btn">View/Edit</button>`;
            if (p.projectStatus === 'Under Supervision' && p.supervisionBillingMethod === 'monthly' && (p.billedSupervisionMonths || 0) < parseFloat(p.constructionDuration)) {
                actionsHtml += `<div class="invoice-reminder"><span>Inv. Due: Month ${ (p.billedSupervisionMonths || 0) + 1}</span><button class="raise-dashboard-invoice-btn" data-job-no="${p.jobNo}">Raise</button></div>`;
            }
            const docHtml = affectionPlanFile ? `<a class="affection-plan-link" data-job-no="${p.jobNo}">Affection Plan</a>` : `<span class="affection-plan-link not-available">Affection Plan</span>`;
            row.innerHTML = `<td>${p.jobNo || 'N/A'}</td><td>${p.clientName || 'N/A'}<br><small>${p.clientMobile || ''}</small></td><td>${p.plotNo || 'N/A'}<br><small>${p.agreementDate ? new Date(p.agreementDate).toLocaleDateString('en-CA') : 'N/A'}</small></td><td class="status-${statusClass}">${p.projectStatus || 'Pending'}</td><td>${docHtml}</td><td>${invoiceDetailsHtml}</td><td>${actionsHtml}</td>`;
            return row;
        });
        (await Promise.all(projectPromises)).forEach(row => tbody.appendChild(row));
    }

    function cacheDOMElements() {
        const ids = [ 'app-container', 'dashboard-view', 'project-view', 'new-project-btn', 'back-to-dashboard-btn', 'save-project-btn', 'search-box', 'time-filter', 'project-list-body', 'project-view-title', 'jobNo', 'agreementDate', 'projectStatus', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'projectDescription', 'plotNo', 'area', 'scopeOfWorkType', 'otherScopeType', 'otherScopeTypeContainer', 'authority', 'otherAuthority', 'otherAuthorityContainer', 'projectType', 'scope-selection-container', 'notes-group', 'lumpSumFee', 'fee-milestone-group', 'designDuration', 'constructionDuration', 'extendedSupervisionFee', 'invoice-history-body', 'newInvoiceNo', 'raise-invoice-btn', 'page-size-selector', 'brief-proposal-preview', 'full-agreement-preview', 'assignment-order-preview', 'proforma-preview', 'tax-invoice-preview', 'receipt-preview', 'generateBriefPdfBtn', 'generateAgreementPdfBtn', 'generateAssignmentPdfBtn', 'generateProformaPdfBtn', 'generateTaxInvoicePdfBtn', 'generateReceiptPdfBtn', 'generateQrCodeBtn', 'qr-code', 'builtUpArea', 'calculateResourcesBtn', 'resourcePredictionOutput', 'resizer', 'load-from-file-btn', 'save-to-file-btn', 'xml-file-input', 'pending-invoices-summary', 'pending-invoices-count', 'pending-invoices-amount', 'pending-invoice-modal', 'pending-modal-close-btn', 'pending-invoice-list', 'expiring-documents-summary', 'expiring-documents-count', 'expiring-documents-modal', 'expiring-modal-close-btn', 'expiring-documents-list', 'remuneration-type-selector', 'lump-sum-group', 'percentage-group', 'constructionCostRate', 'consultancyFeePercentage', 'total-construction-cost-display', 'last-paid-amount', 'on-hold-amount', 'toggle-invoices-btn', 'vatRate', 'clientTrn', 'financial-summary-container', 'milestone-billing-container', 'milestone-billing-body', 'designFeeSplit', 'supervisionFeeSplitDisplay', 'supervision-billing-method-selector', 'supervision-billing-monthly-container', 'supervision-monthly-info', 'bill-next-month-btn', 'supervision-billing-progress-container', 'supervision-progress-info', 'projectProgressInput', 'bill-by-progress-btn', 'supervision-billing-extended-container', 'extended-supervision-info', 'bill-extended-month-btn', 'current-invoice-items-container', 'current-invoice-items-body', 'schedule-tab', 'villa-schedule-preview', 'prorata-percentage-group', 'prorataPercentage', 'generate-prorata-proforma-btn', 'main-tab', 'scope-tab', 'fees-tab', 'invoicing-tab', 'documents-tab', 'tools-tab' ];
        ids.forEach(id => { DOMElements[id] = document.getElementById(id); if (!DOMElements[id]) console.warn(`Element with ID '${id}' not found.`); });
        DOMElements.controlTabs = document.querySelector('.control-tabs');
        DOMElements.previewTabs = document.querySelector('.preview-tabs');
        // --- In cacheDOMElements() ---
DOMElements.siteFilesModal = document.getElementById('site-files-modal');
DOMElements.siteFilesModalCloseBtn = document.getElementById('site-files-modal-close-btn');
DOMElements.siteFilesModalTitle = document.getElementById('site-files-modal-title');
DOMElements.sitePhotosGallery = document.getElementById('site-photos-gallery');
DOMElements.siteDocsGallery = document.getElementById('site-docs-gallery');
DOMElements.siteUpdateFileInput = document.getElementById('site-update-file-input'); // Make sure this is cached
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

    function populateControlTabs() {
        DOMElements['main-tab'].innerHTML = `
            <h3>Project Info</h3>
            <div class="input-group-grid"><div class="input-group"><label for="jobNo">Project ID / Job No.</label><input type="text" id="jobNo"></div><div class="input-group"><label for="agreementDate">Agreement Date</label><input type="date" id="agreementDate"></div></div>
            <div class="input-group"><label for="projectStatus">Project Status</label><select id="projectStatus"><option>Pending</option><option>In Progress</option><option>Under Supervision</option><option>On Hold</option><option>Completed</option></select></div>
            <h3>Client Details</h3>
            <div class="input-group"><label for="clientName">Client's Name</label><input type="text" id="clientName"></div>
            <div class="input-group-grid"><div class="input-group"><label for="clientMobile">Mobile No.</label><input type="text" id="clientMobile"></div><div class="input-group"><label for="clientEmail">Email Address</label><input type="email" id="clientEmail"></div></div>
            <div class="input-group-grid"><div class="input-group"><label for="clientPOBox">Client P.O. Box</label><input type="text" id="clientPOBox"></div><div class="input-group"><label for="clientTrn">Client TRN</label><input type="text" id="clientTrn"></div></div>
            <h3>Project Details</h3>
            <div class="input-group"><label for="scopeOfWorkType">Scope of Work Type</label><select id="scopeOfWorkType"><option value="">-- Select --</option><option>New Construction</option><option>Modification</option><option>AOR Service</option><option>Extension</option><option>Interior Design</option><option>Other</option></select><div id="otherScopeTypeContainer" class="other-input-container"><input type="text" id="otherScopeType" placeholder="Specify Scope"></div></div>
            <div class="input-group"><label for="authority">Authority</label><select id="authority"><option value="">-- Select --</option><option>DM</option><option>DDA</option><option>Trakhees</option><option>Dubai South</option><option>DCCM</option><option>JAFZA</option><option>Other</option></select><div id="otherAuthorityContainer" class="other-input-container"><input type="text" id="otherAuthority" placeholder="Specify Authority"></div></div>
            <div class="input-group"><label for="projectType">Project Type</label><select id="projectType"><option value="">-- Select --</option><option>Residential Building</option><option>Commercial Building</option><option>Villa</option><option>Warehouse</option><option>Other</option></select></div>
            <div class="input-group"><label for="projectDescription">Project Description</label><textarea id="projectDescription" rows="2"></textarea></div>
            <div class="input-group-grid"><div class="input-group"><label for="plotNo">Plot No.</label><input type="text" id="plotNo"></div><div class="input-group"><label for="area">Area</label><input type="text" id="area"></div></div>
            <div class="input-group"><label for="builtUpArea">Built-up Area (sq ft)</label><input type="number" id="builtUpArea" value="10000"></div>`;
        DOMElements['scope-tab'].innerHTML = `<h3>Scope of Work Selection</h3><div id="scope-selection-container"></div>`;
        DOMElements['fees-tab'].innerHTML = `
            <h3>Financials</h3><div class="input-group"><label for="vatRate">VAT Rate (%)</label><input type="number" id="vatRate" value="5" step="0.1"></div><hr><h3>Fee Calculation</h3>
            <div class="input-group"><label>Remuneration Type</label><div id="remuneration-type-selector"><label><input type="radio" name="remunerationType" value="lumpSum"> Lumpsum</label><label><input type="radio" name="remunerationType" value="percentage" checked> Percentage</label></div></div>
            <div id="lump-sum-group" class="input-group" style="display: none;"><label>Lumpsum Fee (AED)</label><input type="number" id="lumpSumFee" value="122500"></div>
            <div id="percentage-group"><div class="input-group"><label for="constructionCostRate">Cost/sq ft (AED)</label><input type="number" id="constructionCostRate" value="350"></div><div class="input-group"><label>Est. Construction Cost</label><strong id="total-construction-cost-display">...</strong></div><div class="input-group"><label for="consultancyFeePercentage">Fee (%)</label><input type="number" id="consultancyFeePercentage" value="3.5" step="0.1"></div></div>
            <h3>Fee Split</h3><div class="input-group-grid"><div class="input-group"><label for="designFeeSplit">Design Fee (%)</label><input type="number" id="designFeeSplit" value="60" step="1"></div><div class="input-group"><label>Supervision Fee (%)</label><strong id="supervisionFeeSplitDisplay">40%</strong></div></div>
            <div id="financial-summary-container" class="financial-summary"></div><hr><h3>Design Fee Milestones</h3><div id="fee-milestone-group"></div><hr><h3>Supervision Fee</h3>
            <div class="input-group"><label>Billing Method</label><div id="supervision-billing-method-selector"><label><input type="radio" name="supervisionBillingMethod" value="monthly" checked> Monthly</label><label><input type="radio" name="supervisionBillingMethod" value="progress"> Progress</label></div></div>
            <div id="prorata-percentage-group" class="input-group" style="display:none;"><label for="prorataPercentage">Prorata (%)</label><input type="number" id="prorataPercentage" value="10" step="1"></div>
            <h3>Timeline</h3><div class="input-group-grid"><div class="input-group"><label>Design (Months)</label><input type="number" id="designDuration" value="4"></div><div class="input-group"><label>Construction (Months)</label><input type="number" id="constructionDuration" value="14"></div></div>
            <div class="input-group"><label>Extended Fee (AED/month)</label><input type="number" id="extendedSupervisionFee" value="7500"></div><h4>Notes & Exclusions</h4><div class="checkbox-group" id="notes-group"></div>`;
        DOMElements['invoicing-tab'].innerHTML = `
            <h3>Invoice History</h3><table class="output-table"><thead><tr><th>Inv No.</th><th>Date</th><th>Amount</th><th>Status</th><th>Payment Details</th><th>Cheque Details</th></tr></thead><tbody id="invoice-history-body"></tbody></table><hr>
            <h3>Raise New Invoice</h3><div class="input-group"><label for="newInvoiceNo">New Invoice Number</label><input type="text" id="newInvoiceNo"></div>
            <div id="milestone-billing-container"><h4>Design Milestones</h4><table class="output-table"><thead><tr><th>Bill</th><th>Milestone</th><th>Amount</th><th>Status</th></tr></thead><tbody id="milestone-billing-body"></tbody></table></div>
            <div id="supervision-billing-monthly-container"><h4>Supervision Fee (Monthly)</h4><div id="supervision-monthly-info"></div><button id="bill-next-month-btn" class="secondary-button">+ Add Next Month</button></div>
            <div id="supervision-billing-progress-container" style="display:none;"><h4>Supervision Fee (Progress)</h4><div id="supervision-progress-info"></div><div class="input-group"><label for="projectProgressInput">New Total Progress (%)</label><input type="number" id="projectProgressInput" min="0" max="100" step="0.1"></div><button id="bill-by-progress-btn" class="secondary-button">+ Add Progress Bill</button><button id="generate-prorata-proforma-btn" class="secondary-button">Prorata Proforma PDF</button></div>
            <div id="supervision-billing-extended-container"><h4>Extended Supervision</h4><div id="extended-supervision-info"></div><button id="bill-extended-month-btn" class="secondary-button">+ Add Extended Month</button></div>
            <div id="current-invoice-items-container" style="margin-top:20px;"><h4>Items for this Invoice</h4><table class="output-table"><thead><tr><th>Description</th><th>Amount (AED)</th><th>Action</th></tr></thead><tbody id="current-invoice-items-body"></tbody></table></div>
            <hr><button id="raise-invoice-btn" style="width:100%; padding: 12px; font-size: 16px;">Raise Invoice from Selected Items</button>`;
        const docCats = { client_details: { title: 'Client Details', types: ['Passport', 'Emirates_ID', 'Affection_Plan', 'Title_Deed', 'SPS', 'Oqood', 'DCR'] }, noc_copies: { title: 'NOC Copies', types: ['RTA', 'DEWA_Electrical', 'DEWA_Water', 'Du', 'Etisalat', 'Developer_NOC', 'Building_Permit', 'Other_NOC'] }, letters: { title: 'Project Letters', types: ['Incoming_Letter', 'Outgoing_Letter', 'Site_Memo'] }, other_uploads: { title: 'Other Uploads', types: ['Miscellaneous'] } };
        let documentsHtml = '<h3>Project Documents Management</h3><button id="download-all-zip-btn" class="secondary-button">Download All as ZIP</button>';
        for (const catKey in docCats) {
            const category = docCats[catKey];
            let optionsHtml = category.types.map(type => `<option value="${type.toLowerCase()}">${type.replace(/_/g, ' ')}</option>`).join('');
            documentsHtml += `<div class="document-category" id="doc-cat-${catKey}"><h4>${category.title}</h4><div class="upload-area"><select class="doc-type-select">${optionsHtml}</select><input type="file" class="doc-file-input" accept=".jpg,.jpeg,.png,.pdf" multiple><input type="date" class="expiry-date-input" title="Set document expiry date"><button type="button" class="upload-btn" data-category="${catKey}">Upload</button></div><div class="gallery-grid"><p>Please save the project first.</p></div></div>`;
        }
        DOMElements['documents-tab'].innerHTML = documentsHtml;
        DOMElements['schedule-tab'].innerHTML = `<h3>Project Schedule</h3><p>Gantt Chart and scheduling features can be integrated here.</p><div id="gantt_chart_container"></div>`;
        DOMElements['tools-tab'].innerHTML = `<h3>Resource Calculator</h3><button id="calculateResourcesBtn">Calculate Resources</button><div id="resourcePredictionOutput"></div><hr><h3>QR Code Generator</h3><button id="generateQrCodeBtn" class="secondary-button">Generate Project QR Code</button><div id="qr-code"></div>`;
        cacheDOMElements(); // Re-cache newly created elements
    }

    function initResizer() {
        const resizer = DOMElements.resizer; const container = resizer.parentElement; const leftPanel = container.querySelector('.controls');
        let isResizing = false, startX, startWidth;
        resizer.addEventListener('mousedown', (e) => { e.preventDefault(); isResizing = true; startX = e.clientX; startWidth = leftPanel.offsetWidth; container.classList.add('is-resizing'); document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', stopResize); });
        function handleMouseMove(e) { if (!isResizing) return; const newWidth = startWidth + (e.clientX - startX); if (newWidth > 300 && newWidth < (container.offsetWidth - 300)) { leftPanel.style.width = newWidth + 'px'; } }
        function stopResize() { isResizing = false; container.classList.remove('is-resizing'); document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', stopResize); }
    }

    function setupEventListeners() {
        DOMElements['load-from-file-btn'].addEventListener('click', () => DOMElements['xml-file-input'].click());
        DOMElements['xml-file-input'].addEventListener('change', handleFileSelect);
        DOMElements['save-to-file-btn'].addEventListener('click', downloadProjectsFile);
        DOMElements['new-project-btn'].addEventListener('click', handleNewProject);
        DOMElements['back-to-dashboard-btn'].addEventListener('click', showDashboard);
        DOMElements['save-project-btn'].addEventListener('click', saveCurrentProjectToMemory);
        
        DOMElements['project-list-body'].addEventListener('click', async (e) => {
            if (e.target.closest('.raise-dashboard-invoice-btn')) { 
                handleDashboardInvoiceRaise(e.target.dataset.jobNo); 
                return; 
            }
            const row = e.target.closest('tr');
            if (e.target.closest('.edit-btn')) { 
                if (row?.dataset.jobNo) handleEditProject(row.dataset.jobNo);
            } else if (e.target.matches('.affection-plan-link') && !e.target.matches('.not-available')) {
                e.preventDefault();
                const file = await FileManager.getFileBySubCategory(e.target.dataset.jobNo, 'affection_plan');
                if (file) {
                    FileManager.showPreview(file);
                } else {
                    alert('Affection plan not found.');
                }
            } else if (row?.dataset.jobNo) { 
                handleEditProject(row.dataset.jobNo); 
            }
        });

        DOMElements['search-box'].addEventListener('input', renderDashboard);
        DOMElements['time-filter'].addEventListener('change', renderDashboard);
        document.querySelector('.controls').addEventListener('input', renderAllPreviews);
        DOMElements.controlTabs.addEventListener('click', (e) => switchTab(e, '.tab-content', '-tab'));
        DOMElements.previewTabs.addEventListener('click', (e) => switchTab(e, '.preview-tab-content', '-preview'));
        DOMElements['page-size-selector'].addEventListener('change', (e) => { 
            document.querySelectorAll('.document-preview').forEach(el => { 
                el.className = 'document-preview preview-tab-content active'; // Reset classes
                el.classList.add(e.target.value); 
            }); 
        });
        
        const pdfButtonMapping = {
            generateBriefPdfBtn: 'brief-proposal-preview',
            generateAgreementPdfBtn: 'full-agreement-preview',
            generateAssignmentPdfBtn: 'assignment-order-preview',
            generateProformaPdfBtn: 'proforma-preview',
            generateTaxInvoicePdfBtn: 'tax-invoice-preview',
            generateReceiptPdfBtn: 'receipt-preview'
        };

        for (const [buttonId, previewId] of Object.entries(pdfButtonMapping)) {
            if (DOMElements[buttonId]) {
                DOMElements[buttonId].addEventListener('click', () => PDFGenerator.generate({
                    previewId: previewId,
                    projectJobNo: currentProjectJobNo,
                    pageSize: DOMElements['page-size-selector'].value
                }));
            }
        }

        DOMElements.generateQrCodeBtn.addEventListener('click', generateQRCode);
        DOMElements.calculateResourcesBtn.addEventListener('click', predictResources);
        DOMElements['raise-invoice-btn'].addEventListener('click', handleRaiseInvoice);
        DOMElements['remuneration-type-selector'].addEventListener('change', updateRemunerationView);
        ['lumpSumFee', 'builtUpArea', 'constructionCostRate', 'consultancyFeePercentage', 'designFeeSplit', 'constructionDuration'].forEach(id => DOMElements[id]?.addEventListener('input', updateFinancialSummary));
        DOMElements['fee-milestone-group']?.addEventListener('input', updateFinancialSummary);
        DOMElements['designFeeSplit']?.addEventListener('input', e => { DOMElements['supervisionFeeSplitDisplay'].textContent = `${100 - (parseFloat(e.target.value) || 0)}%`; });
        DOMElements['supervision-billing-method-selector']?.addEventListener('change', updateSupervisionBillingView);
        DOMElements['generate-prorata-proforma-btn']?.addEventListener('click', generateProrataProformaPDF);
        DOMElements['milestone-billing-body']?.addEventListener('click', (e) => { if (e.target.type === 'checkbox') addOrRemoveInvoiceItemFromCheckbox(e.target); });
        DOMElements['bill-next-month-btn']?.addEventListener('click', addMonthlySupervisionItem);
        DOMElements['bill-by-progress-btn']?.addEventListener('click', addProgressSupervisionItem);
        DOMElements['bill-extended-month-btn']?.addEventListener('click', addExtendedSupervisionItem);
        DOMElements['current-invoice-items-body']?.addEventListener('click', (e) => { if (e.target.classList.contains('remove-btn')) { const row = e.target.closest('tr'); const checkbox = document.getElementById(row.dataset.checkboxId); if (checkbox) checkbox.checked = false; row.remove(); } });
        DOMElements['invoice-history-body']?.addEventListener('change', handleInvoiceTableEvents); 
        DOMElements['invoice-history-body']?.addEventListener('input', handleInvoiceTableEvents); 
        DOMElements['invoice-history-body']?.addEventListener('click', handleInvoiceTableEvents);
        
        DOMElements['pending-invoices-summary'].addEventListener('click', showPendingInvoiceModal);
        DOMElements['pending-modal-close-btn'].addEventListener('click', () => DOMElements['pending-invoice-modal'].style.display = 'none');
        DOMElements['project-list-body'].addEventListener('click', async (e) => {
    if (e.target.closest('.view-site-files-btn')) {
        const jobNo = e.target.dataset.jobNo;
        showSiteFilesModal(jobNo);
        return;
    }});
    DOMElements.siteFilesModalCloseBtn.addEventListener('click', () => {
    DOMElements.siteFilesModal.style.display = 'none';
});
        window.addEventListener('click', (e) => { if (e.target == DOMElements['pending-invoice-modal']) DOMElements['pending-invoice-modal'].style.display = 'none'; });

        DOMElements['expiring-documents-summary'].addEventListener('click', showExpiringDocumentsModal);
        DOMElements['expiring-modal-close-btn'].addEventListener('click', () => DOMElements['expiring-documents-modal'].style.display = 'none');
        window.addEventListener('click', (e) => { if (e.target == DOMElements['expiring-documents-modal']) DOMElements['expiring-documents-modal'].style.display = 'none'; });

        DOMElements['toggle-invoices-btn'].addEventListener('click', () => { showAllInvoices = !showAllInvoices; DOMElements['toggle-invoices-btn'].textContent = showAllInvoices ? 'Show Pending' : 'Show All'; renderDashboard(); });
        setupOtherFieldToggle('scopeOfWorkType', 'otherScopeTypeContainer'); 
        setupOtherFieldToggle('authority', 'otherAuthorityContainer');
        window.onbeforeunload = (e) => { if (isDataDirty) { const msg = 'You have unsaved changes.'; (e || window.event).returnValue = msg; return msg; } };
        DOMElements.projectType?.addEventListener('change', handleProjectTypeChange);
        // Add the file input handler (if you haven't already from previous steps)
// DOMElements.loadSiteUpdatesBtn.addEventListener('click', () => DOMElements.siteUpdateFileInput.click());
// DOMElements.siteUpdateFileInput.addEventListener('change', handleSiteUpdateFileSelect);
        DOMElements['documents-tab'].addEventListener('click', async (e) => {
            if (e.target.matches('.upload-btn')) {
                e.preventDefault();
                const container = e.target.closest('.document-category');
                const fileInput = container.querySelector('.doc-file-input');
                const expiryInput = container.querySelector('.expiry-date-input');
                const subCategorySelect = container.querySelector('.doc-type-select');
                const category = e.target.dataset.category;
                const projectName = DOMElements.projectDescription.value || 'Untitled Project';

                if (!currentProjectJobNo) { alert("Please save the project first."); return; }
                if (fileInput.files.length === 0) { alert("Please select a file."); return; }
                
                e.target.textContent = 'Uploading...'; e.target.disabled = true;
                for (const file of fileInput.files) {
                    await FileManager.saveFile(currentProjectJobNo, category, subCategorySelect.value, file, expiryInput.value, projectName)
                        .catch(err => alert(`Error uploading ${file.name}: ${err}`));
                }
                e.target.textContent = 'Upload'; e.target.disabled = false;
                fileInput.value = '';
                expiryInput.value = '';
                FileManager.renderGallery(container, currentProjectJobNo, category);
                if (subCategorySelect.value === 'affection_plan') renderDashboard();
                renderDashboard(); // Re-render dashboard to update expiring docs count
            } else if (e.target.matches('#download-all-zip-btn')) {
                e.preventDefault();
                downloadProjectFilesAsZip();
            }
        });
    }
    
    async function downloadProjectFilesAsZip() {
        if (!currentProjectJobNo) {
            alert("Please save a project before downloading files.");
            return;
        }
        if (typeof JSZip === 'undefined') {
            alert("Could not create ZIP file. JSZip library is missing.");
            return;
        }

        const btn = document.getElementById('download-all-zip-btn');
        btn.textContent = 'Zipping...';
        btn.disabled = true;

        try {
            const files = await FileManager.getAllFilesForJob(currentProjectJobNo);
            if (files.length === 0) {
                alert("No documents found for this project.");
                return;
            }

            const zip = new JSZip();
            files.forEach(file => {
                const folder = zip.folder(file.category);
                const base64Data = file.dataUrl.substring(file.dataUrl.indexOf(',') + 1);
                folder.file(file.name, base64Data, { base64: true });
            });
            
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `${currentProjectJobNo.replace(/\//g, '-')}_documents.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("Error creating ZIP file:", error);
            alert("An error occurred while creating the ZIP file.");
        } finally {
            btn.textContent = 'Download All as ZIP';
            btn.disabled = false;
        }
    }
function showSiteFilesModal(jobNo) {
    const siteUpdate = allSiteData[jobNo];
    const project = allProjects.find(p => p.jobNo === jobNo);

    if (!siteUpdate || !project) {
        alert("No site data found for this project.");
        return;
    }

    DOMElements.siteFilesModalTitle.textContent = `Site Files for: ${project.projectDescription}`;

    const renderGallery = (galleryEl, files) => {
        galleryEl.innerHTML = '';
        if (!files || files.length === 0) {
            galleryEl.innerHTML = '<p>No files uploaded.</p>';
            return;
        }
        files.forEach(file => {
            const thumbContainer = document.createElement('div');
            thumbContainer.className = 'thumbnail-container';

            let thumbnail;
            if (file.type.startsWith('image/')) {
                thumbnail = document.createElement('img');
                thumbnail.src = file.dataUrl;
                thumbnail.className = 'thumbnail';
            } else { // Generic icon for other documents
                thumbnail = document.createElement('div');
                thumbnail.className = 'file-icon';
                thumbnail.textContent = file.name.split('.').pop().toUpperCase() || 'DOC';
            }

            // Create a link to download the file
            const link = document.createElement('a');
            link.href = file.dataUrl;
            link.download = file.name;
            link.appendChild(thumbnail);

            const caption = document.createElement('div');
            caption.className = 'thumbnail-caption';
            caption.textContent = file.name;

            thumbContainer.append(link, caption);
            galleryEl.appendChild(thumbContainer);
        });
    };

    renderGallery(DOMElements.sitePhotosGallery, siteUpdate.photos);
    renderGallery(DOMElements.siteDocsGallery, siteUpdate.documents);

    DOMElements.siteFilesModal.style.display = 'flex';
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
            newRow.innerHTML = `<td>${text}</td><td>${formatCurrency(amount)}</td><td><button type="button" class="remove-btn">X</button></td>`;
        } else {
            const itemToRemove = DOMElements['current-invoice-items-body'].querySelector(`tr[data-item-id="${itemId}"][data-item-type="${itemType}"]`);
            if (itemToRemove) itemToRemove.remove();
        }
    }

    function initializeAppState() {
        allProjects = [{ jobNo: `RRC/2025/001`, agreementDate: new Date().toISOString().split('T')[0], projectStatus: 'In Progress', clientName: 'Grovy Real Estate', clientMobile: '0501234567', clientEmail: 'contact@grovy.com', clientPOBox: '12345', clientTrn: '100123456700003', projectDescription: 'Proposed 2B+G+13+Roof building', plotNo: '6488704', area: 'DLRC, Dubai', authority: 'DDA', scopeOfWorkType: 'New Construction', projectType: 'Residential Building', builtUpArea: 10000, remunerationType: 'percentage', constructionCostRate: 350, consultancyFeePercentage: 3.5, designFeeSplit: 60, supervisionBillingMethod: 'monthly', designDuration: 4, constructionDuration: 14, extendedSupervisionFee: 7500, invoices: [], scope: {}, notes: {}, feeMilestonePercentages: {}, lastBilledProgress: 0, billedSupervisionMonths: 0, billedExtendedSupervisionMonths: 0, vatRate: 5, }];
        renderDashboard();
        
        const xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200 && this.responseText) {
                    const parsed = loadProjectsFromXmlString(this.responseText);
                    if (parsed) { allProjects = parsed; renderDashboard(); console.log("Auto-loaded 'UrbanAxisProjects.xml'"); }
                } else if (this.status != 404) { console.warn(`Could not find 'UrbanAxisProjects.xml' (Status: ${this.status})`); }
            }
        };
        xhttp.open("GET", "UrbanAxisProjects.xml", true);
        xhttp.send();
    }

    function handleFileSelect(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => { 
            const parsed = loadProjectsFromXmlString(e.target.result); 
            if (parsed) { 
                allProjects = parsed; 
                renderDashboard(); 
                alert(`Loaded ${allProjects.length} projects.`); 
                isDataDirty = false; 
            } else { 
                alert(`Could not parse XML.`); 
            } 
        };
        reader.readAsText(file);
        DOMElements['xml-file-input'].value = '';
    }

    function downloadProjectsFile() {
        if (isDataDirty) saveCurrentProjectToMemory();
        const xmlString = saveProjectsToXmlString(allProjects);
        const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8' });
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(blob); 
        a.download = 'UrbanAxisProjects.xml';
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a);
        isDataDirty = false;
    }

    function saveCurrentProjectToMemory() {
        if (!currentProjectJobNo) return;
        const data = getFormDataFromUI();
        const index = allProjects.findIndex(p => p.jobNo === currentProjectJobNo);
        if (index > -1) {
            const project = allProjects[index];
            data.invoices = project.invoices || []; 
            data.lastBilledProgress = project.lastBilledProgress || 0; 
            data.billedSupervisionMonths = project.billedSupervisionMonths || 0; 
            data.billedExtendedSupervisionMonths = project.billedExtendedSupervisionMonths || 0;
            allProjects[index] = data;
        } else { 
            allProjects.push(data); 
        }
        isDataDirty = true; 
        alert(`Project ${currentProjectJobNo} saved.`); 
        renderDashboard();
    }

    function getFormDataFromUI() {
        const data = { scope: {}, notes: {}, feeMilestonePercentages: {} };
        const stringFields = ['jobNo', 'agreementDate', 'projectStatus', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn', 'projectDescription', 'plotNo', 'area', 'authority', 'scopeOfWorkType', 'projectType', 'designDuration', 'constructionDuration'];
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

    function populateFormWithData(project) {
        currentProjectJobNo = project.jobNo;
        const stringFields = ['jobNo', 'agreementDate', 'projectStatus', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn', 'projectDescription', 'plotNo', 'area', 'projectType', 'designDuration', 'constructionDuration'];
        const floatFields = ['builtUpArea', 'vatRate', 'lumpSumFee', 'constructionCostRate', 'consultancyFeePercentage', 'designFeeSplit', 'extendedSupervisionFee'];
        stringFields.forEach(id => { if (DOMElements[id]) DOMElements[id].value = project[id] || ''; });
        floatFields.forEach(id => { if (DOMElements[id]) DOMElements[id].value = project[id] || 0; });
        setSelectOrOther(DOMElements.authority, DOMElements.otherAuthority, project.authority, project.otherAuthority);
        setSelectOrOther(DOMElements.scopeOfWorkType, DOMElements.otherScopeType, project.scopeOfWorkType, project.otherScopeType);
        DOMElements.otherAuthorityContainer.style.display = DOMElements.authority.value === 'Other' ? 'block' : 'none';
        DOMElements.otherScopeTypeContainer.style.display = DOMElements.scopeOfWorkType.value === 'Other' ? 'block' : 'none';
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
        renderAllPreviews(); 
        renderInvoicingTab(project); 
        handleProjectTypeChange(); 
        updateSupervisionBillingView();
    }

    function switchTab(e, contentClass, suffix) {
        if (e.target.matches('.tab-button')) {
            const tabId = e.target.dataset.tab; 
            const parent = e.target.parentElement;
            parent.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            const grandParent = parent.closest('.controls, .preview-area');
            grandParent.querySelectorAll(contentClass).forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabId}${suffix}`)?.classList.add('active');
            if (tabId === 'invoicing') { 
                const project = allProjects.find(p => p.jobNo === currentProjectJobNo); 
                if (project) renderInvoicingTab(project); 
            }
            if (tabId === 'villa-schedule') { 
                handleProjectTypeChange(); 
            }
        }
    }

    function showDashboard() {
        if (isDataDirty) saveCurrentProjectToMemory();
        currentProjectJobNo = null; 
        renderDashboard();
        DOMElements['dashboard-view'].classList.add('active');
        DOMElements['project-view'].classList.remove('active');
    }

    function showProjectView() {
        DOMElements['dashboard-view'].classList.remove('active');
        DOMElements['project-view'].classList.add('active');
        if (currentProjectJobNo) {
            DOMElements['documents-tab'].querySelectorAll('.document-category').forEach(container => {
                const category = container.querySelector('.upload-btn').dataset.category;
                FileManager.renderGallery(container, currentProjectJobNo, category);
            });
        }
    }

    function handleNewProject() {
        const jobNo = `RRC/${new Date().getFullYear()}/${String(allProjects.length + 1).padStart(3, '0')}`;
        const newProject = { jobNo, agreementDate: new Date().toISOString().split('T')[0], scope: {}, notes: {}, invoices: [], remunerationType: 'percentage', vatRate: 5, designFeeSplit: 60, supervisionBillingMethod: 'monthly', lastBilledProgress: 0, billedSupervisionMonths: 0, billedExtendedSupervisionMonths: 0, feeMilestonePercentages: {} };
        for (const section in CONTENT.SCOPE_DEFINITIONS) { 
            if (/^[0-9\.]+$/.test(section)) { 
                newProject.scope[section] = {}; 
                CONTENT.SCOPE_DEFINITIONS[section].forEach(item => newProject.scope[section][item.id] = true); 
            } 
        }
        CONTENT.NOTES.forEach(item => newProject.notes[item.id] = true);
        
        allProjects.push(newProject);
        isDataDirty = true;

        populateFormWithData(newProject);
        DOMElements['project-view-title'].textContent = `Creating New Project: ${jobNo}`;
        showProjectView();
        DOMElements['documents-tab'].querySelectorAll('.gallery-grid').forEach(grid => { grid.innerHTML = '<p>Please save the project before uploading documents.</p>'; });
    }

    function handleEditProject(jobNo) {
        const project = allProjects.find(p => p.jobNo === jobNo);
        if (project) { 
            populateFormWithData(project); 
            DOMElements['project-view-title'].textContent = `Editing Project: ${jobNo}`; 
            showProjectView(); 
        }
    }

    function renderAllPreviews() {
        if (!currentProjectJobNo) return;
        const data = getFormDataFromUI();
        const project = allProjects.find(p => p.jobNo === currentProjectJobNo);
        if (!project) return;
        const fullData = { ...data, invoices: project.invoices };
        DOMElements['brief-proposal-preview'].innerHTML = renderBriefProposal(fullData);
        DOMElements['full-agreement-preview'].innerHTML = renderFullAgreement(fullData);
        DOMElements['assignment-order-preview'].innerHTML = renderAssignmentOrder(fullData);
        renderInvoiceDocuments(fullData.invoices?.[fullData.invoices.length - 1]);
        if (data.projectType === 'Villa') { 
            if(window.UrbanAxisSchedule) {
                UrbanAxisSchedule.render(fullData); 
            }
        }
    }

    function handleProjectTypeChange() {
        const projectType = DOMElements.projectType.value;
        let scheduleTabButton = DOMElements.previewTabs.querySelector('[data-tab="villa-schedule"]');
        if (projectType === 'Villa') {
            if (!scheduleTabButton) {
                const newTabButton = document.createElement('button');
                newTabButton.className = 'tab-button'; 
                newTabButton.dataset.tab = 'villa-schedule'; 
                newTabButton.textContent = 'Villa Schedule';
                DOMElements.previewTabs.appendChild(newTabButton);
            }
            if(window.UrbanAxisSchedule) {
                UrbanAxisSchedule.render(getFormDataFromUI());
            }
        } else {
            if (scheduleTabButton) {
                scheduleTabButton.remove();
                DOMElements['villa-schedule-preview'].classList.remove('active');
                if (!DOMElements.previewTabs.querySelector('.active')) { 
                    DOMElements.previewTabs.querySelector('[data-tab="brief-proposal"]')?.click(); 
                }
            }
        }
    }

    const formatCurrency = (num) => new Intl.NumberFormat('en-US').format(Math.round(num || 0));

    main();
});
