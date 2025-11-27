const PROJECT_DOCUMENT_TEMPLATES = (() => {

    // --- Template Helper Functions ---
    const getLetterheadHeaderHtml = () => `<div class="preview-header-image"><img src="${LOGO_BASE64}" alt="Company Letterhead"></div>`;
    const getCommonHeader = (dateStr) => `<p style="text-align:right; padding: 0 10mm;">${dateStr}</p>`;
    const getCommonFooter = () => `<div class="preview-footer">P.O. Box: 281, DUBAI (U.A.E) TEL.: 04-3493435, E-mail: UrbanAxis@emirates.net.ae<br>Website: www.UrbanAxis.ae</div>`;
    const formatCurrency = (num) => new Intl.NumberFormat('en-US').format(Math.round(num || 0));
    
    const numberToWords = (num) => {
        const a = [
            '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
            'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
        ];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        const g = [
            '', 'thousand', 'million', 'billion', 'trillion', 'quadrillion',
            'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion'
        ];

        const floatNum = parseFloat(num || 0).toFixed(2);
        const [wholePart, decimalPart] = floatNum.split('.');

        const convertGroup = (n) => {
            let str = '';
            let hundred = Math.floor(n / 100);
            let rest = n % 100;
            if (hundred > 0) {
                str += a[hundred] + ' hundred';
            }
            if (rest > 0) {
                str += (str ? ' ' : '') + (a[rest] || b[Math.floor(rest / 10)] + (rest % 10 ? '-' + a[rest % 10] : ''));
            }
            return str;
        };

        const numStr = String(wholePart);
        if (numStr === '0') return 'Zero';

        const chunks = [];
        for (let i = numStr.length; i > 0; i -= 3) {
            chunks.push(numStr.substring(Math.max(0, i - 3), i));
        }

        let words = chunks.map((chunk, i) => {
            if (Number(chunk) === 0) return '';
            const groupWord = g[i];
            return convertGroup(Number(chunk)) + (groupWord ? ' ' + groupWord : '');
        }).filter(Boolean).reverse().join(', ');

        let finalStr = `Dirhams ${words.charAt(0).toUpperCase() + words.slice(1)}`;

        if (decimalPart && Number(decimalPart) > 0) {
            finalStr += ` and ${convertGroup(Number(decimalPart))} Fils`;
        }

        return `${finalStr} Only`;
    };
    
    // --- Reusable Invoice Template (MODIFIED TO MATCH PDF) ---
    const _invoiceTemplate = (project, invoice, title, isPaid = false, feeDistribution) => {
        if (!invoice) return `<div class="document-preview a4"><h2 style="text-align:center;">${title.toUpperCase()}</h2><p style="text-align:center; color: #888;">No invoice data available to generate this document.</p></div>`;
        
        const dateStr = new Date(invoice.date).toLocaleDateString('en-GB');
        const constructionCost = (project.builtUpArea || 0) * (project.constructionCostRate || 0);

        // --- New Calculations to match PDF logic ---
        const currentIndex = project.invoices ? project.invoices.findIndex(inv => inv.no === invoice.no) : -1;
        const previousInvoices = (currentIndex >= 0) ? project.invoices.slice(0, currentIndex) : (project.invoices || []);
        
        const cumulativeBilledSoFar = previousInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
        const totalAmountReceivedSoFar = (project.invoices || [])
            .filter(inv => inv.status === 'Paid' && inv.paymentDetails)
            .reduce((sum, inv) => sum + (inv.paymentDetails.amountPaid || 0), 0);

        const cumulativeThisInvoice = cumulativeBilledSoFar + (invoice.subtotal || 0);
        
        const amountOfThisInvoiceNet = cumulativeThisInvoice - totalAmountReceivedSoFar;
        const vatOnThisInvoice = amountOfThisInvoiceNet > 0 ? amountOfThisInvoiceNet * ((project.vatRate || 5) / 100) : 0;
        const totalAmountOfThisInvoice = amountOfThisInvoiceNet + vatOnThisInvoice;


        const clientDetails = `<strong>${project.clientName || 'N/A'}</strong><br>P.O. Box: ${project.clientPOBox || 'N/A'}<br>Email: ${project.clientEmail || 'N/A'}<br>TRN: ${project.clientTrn || 'N/A'}`;
        const invoiceDetails = `<strong>${title} No:</strong> ${invoice.no}<br><strong>Date:</strong> ${dateStr}<br><strong>Project:</strong> ${project.projectDescription || 'N/A'}<br><strong>Plot No:</strong> ${project.plotNo || 'N/A'}`;
        
        const bankDetails = `<div class="bank-details"><b>Bank Account Details for Payment:</b><br>Account Name: ${CONTENT.BANK_DETAILS.name}<br>Bank Name: ${CONTENT.BANK_DETAILS.bank}<br>Account No: ${CONTENT.BANK_DETAILS.ac}<br>IBAN: ${CONTENT.BANK_DETAILS.iban}<br>Swift Code: ${CONTENT.BANK_DETAILS.swift}</div>`;
        
        let paidStamp = isPaid ? `<div style="position: absolute; top: 250px; left: 50%; transform: translate(-50%, -50%) rotate(-20deg); font-size: 80px; font-weight: bold; color: rgba(0, 128, 0, 0.2); border: 10px solid rgba(0, 128, 0, 0.2); padding: 20px; border-radius: 10px; z-index: 1000; pointer-events: none;">PAID</div>` : '';

        return `
            <div class="document-preview a4" data-invoice-no="${invoice.no}">
                ${getLetterheadHeaderHtml()}
                ${paidStamp}
                <h2 style="text-align:center;">${title.toUpperCase()}</h2>
                
                <table class="document-table info-table">
                    <tr>
                        <td style="width:50%;"><strong>To:</strong><br>${clientDetails}</td>
                        <td style="width:50%; vertical-align:top;">${invoiceDetails}</td>
                    </tr>
                </table>

                <!-- Main Content Table -->
                <table class="document-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="width: 30%; text-align:right;">Amount (AED)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Consultancy Fees - Approximate Project Value ${formatCurrency(constructionCost)} @ ${project.consultancyFeePercentage}%</td>
                            <td style="text-align:right;">${formatCurrency(feeDistribution.totalConsultancyFee)}</td>
                        </tr>
                        <tr class="total-row">
                            <td style="text-align:right;"><strong>Total Fees</strong></td>
                            <td style="text-align:right;"><strong>${formatCurrency(feeDistribution.totalConsultancyFee)}</strong></td>
                        </tr>
                        
                        <tr class="spacer-row"><td colspan="2"></td></tr>

                        <!-- Items for this Invoice -->
                        ${(invoice.items || []).map(item => `<tr><td>${item.description}</td><td style="text-align:right;">${formatCurrency(item.amount)}</td></tr>`).join('')}
                    </tbody>

                    <!-- Financial Summary Footer -->
                    <tfoot>
                        <tr>
                            <td style="text-align:right;"><strong>Total</strong></td>
                            <td style="text-align:right;"><strong>${formatCurrency(cumulativeThisInvoice)}</strong></td>
                        </tr>
                        <tr>
                            <td style="text-align:right;">LESS amount received so far</td>
                            <td style="text-align:right;">(${formatCurrency(totalAmountReceivedSoFar)})</td>
                        </tr>
                        <tr class="total-row">
                            <td style="text-align:right;"><strong>Amount of this invoice</strong></td>
                            <td style="text-align:right;"><strong>${formatCurrency(amountOfThisInvoiceNet)}</strong></td>
                        </tr>
                        <tr>
                            <td style="text-align:right;">ADD ${project.vatRate || 5}% VAT TRN ${CONTENT.VAT_TRN}</td>
                            <td style="text-align:right;">${formatCurrency(vatOnThisInvoice)}</td>
                        </tr>
                        <tr class="total-row">
                            <td style="text-align:right;"><strong>Total Amount of this invoice</strong></td>
                            <td style="text-align:right;"><strong>${formatCurrency(totalAmountOfThisInvoice)}</strong></td>
                        </tr>
                    </tfoot>
                </table>

                <p><strong>Amount in Words:</strong> ${numberToWords(totalAmountOfThisInvoice)}</p>
                
                ${!isPaid ? bankDetails : '<p style="text-align:center;"><strong>Thank you for your payment.</strong></p>'}

                <div class="signature-area">
                    <p>For, <strong>URBAN AXIS ARCHITECTURAL & CONSULTING ENGINEERS</strong></p><br><br><br>
                    <p>_________________________</p>
                    <p>Authorized Signatory</p>
                </div>
                ${getCommonFooter()}
            </div>
        `;
    };

    return {
        // --- Invoice Functions ---
        taxInvoice: (project, invoice, feeDistribution) => _invoiceTemplate(project, invoice, 'Tax Invoice', invoice.status === 'Paid', feeDistribution),
        proforma: (project, invoice, feeDistribution) => _invoiceTemplate(project, invoice, 'Proforma Invoice', false, feeDistribution),
        receipt: (project, invoice) => {
            if (!invoice || !invoice.paymentDetails) {
                return `<div class="document-preview a4"><h2 style="text-align:center;">RECEIPT</h2><p style="text-align:center; color: #888;">No payment has been recorded for this invoice yet.</p></div>`;
            }
            const pd = invoice.paymentDetails;
            const paymentDateStr = new Date(pd.date).toLocaleDateString('en-GB');

            return `
                <div class="document-preview a4">
                    ${getLetterheadHeaderHtml()}
                    <h2 style="text-align:center;">PAYMENT RECEIPT</h2>
                    <table class="output-table" style="margin-bottom: 20px;">
                        <tr><th style="width:30%;">Receipt No:</th><td>RCPT-${invoice.no}</td></tr>
                        <tr><th>Date:</th><td>${paymentDateStr}</td></tr>
                        <tr><th>Original Invoice:</th><td>${invoice.no} (${new Date(invoice.date).toLocaleDateString('en-GB')})</td></tr>
                    </table>
                    <p>Received with thanks from:</p>
                    <p style="padding-left: 20px;"><strong>${project.clientName || 'N/A'}</strong></p>
                    <p>The sum of:</p>
                    <p style="padding-left: 20px; font-weight: bold; font-size: 1.1em;">AED ${formatCurrency(pd.amountPaid)}</p>
                    <p style="padding-left: 20px;"><em>(${numberToWords(pd.amountPaid)})</em></p>
                    <p>By ${pd.method}.
                        ${pd.method === 'Cheque' ? ` (Cheque No: ${pd.chequeNo}, Dated: ${new Date(pd.chequeDate).toLocaleDateString('en-GB')}, Bank: ${pd.bank})` : ''}
                    </p>
                    <br>
                    <p>As settlement for professional services rendered for project: <strong>${project.projectDescription}</strong>.</p>
                    
                    <div class="signature-area">
                        <p>For, <strong>URBAN AXIS ARCHITECTURAL & CONSULTING ENGINEERS</strong></p>
                        <br><br><br>
                        <p>_________________________</p>
                        <p>Authorized Signatory</p>
                    </div>
                    ${getCommonFooter()}
                </div>
            `;
        },

        // --- Other Document Functions ---
        briefProposal: (data, feeDistribution) => {
            const scopeOfWork = Object.keys(data.scopeOfWorkTypes || {}).filter(k => data.scopeOfWorkTypes[k]).join(', ');
            const projectTitle = `${scopeOfWork} of ${data.projectDescription} on Plot No. ${data.plotNo}, ${data.area || 'Dubai, UAE'}.`;
            let html = getLetterheadHeaderHtml() + getCommonHeader(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
    
            html += `<table style="width:100%; margin-bottom: 20px;">
                    <tr><td style="width:80px;"><b>Owner:</b></td><td>${data.clientName}</td></tr>
                    <tr><td><b>Subject:</b></td><td><b>Scope Of Work And Fee Proposal</b></td></tr>
                    <tr><td><b>Project:</b></td><td>${projectTitle}</td></tr>
                </table>
                <p>Dear Sir,</p>
                <p>Reference to the above mentioned project our <b>SCOPE OF WORK</b> and <b>FEE Proposal</b> is as follows:</p>
                <h3>SCOPE OF WORK (SUMMARY):</h3><ol type="A">`;
            
            const sectionTitles = { 
                '1': '1. Study and Design Stage', '2': '2. Preliminary Design Stage', '3': '3. Final Stage', '7': '7. Interior Design Stage', '4': '4. Tender Documents Stage', '5': '5. Supervision Works', '6': "6. Consultant's Duties", '12': '12. BIM Services', '13': '13. BIM - Level of Detail (LOD)', '14': '14. Structural Review & Assessment', '8': '8. Principles of Calculation', '9': "9. The Owner's Obligations", '10': '10. Amendments', '11': '11. Extension of Completion' 
            };
            
            for (const sectionId in sectionTitles) {
                if (data.scope && data.scope[sectionId]) {
                    const selectedItems = (CONTENT.SCOPE_DEFINITIONS[sectionId] || [])
                        .filter(item => data.scope[sectionId][item.id]);

                    if (selectedItems.length > 0 || data.scope[sectionId].additional) {
                        let itemsHtml = selectedItems.map(item => `<li>${item.brief}</li>`).join('');
                        
                        if (data.scope[sectionId].additional) {
                            itemsHtml += `<li>${data.scope[sectionId].additional}</li>`;
                        }
                        
                        html += `<li><b>${sectionTitles[sectionId]}</b><ul>${itemsHtml}</ul></li>`;
                    }
                }
            }
            
            html += `</ol><h3>Time Span:</h3><ul>
                        <li>Design & Approval: ${data.designDuration} Months from the signing of the Contract Date.</li>
                        <li>Construction: ${data.constructionDuration} months</li>
                     </ul>`;
    
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
            html += `</table><h5>Supervision Stage</h5><p>To be paid monthly over ${data.constructionDuration} months at a rate of <b>AED ${formatCurrency(feeDistribution.monthlySupervisionFee)}/month</b>.</p>`;

            const includedTerms = (CONTENT.BRIEF_PROPOSAL_TERMS || [])
                .filter(term => data.briefTerms?.[term.id] !== false); 
            
            if (includedTerms.length > 0) {
                html += `<h3>Terms and Conditions:</h3><ul style="font-size: 0.9em; color: #333;">`;
                includedTerms.forEach(term => {
                    const termText = term.text
                        .replace(/{supervisionVisits}/g, data.scope?.supervisionVisits || '4')
                        .replace(/{additionalSupervisionFee}/g, data.scope?.additionalSupervisionFee || '1000');
                    html += `<li>${termText}</li>`;
                });
                html += `</ul>`;
            }

            html += getCommonFooter();
            return html;
        },
    
        fullAgreement: (data, feeDistribution) => {
             const dateStr = new Date(data.agreementDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
             const scopeOfWork = Object.keys(data.scopeOfWorkTypes || {}).filter(k => data.scopeOfWorkTypes[k]).join(', ');
             const projectTitle = `${scopeOfWork} of ${data.projectDescription} on Plot No. ${data.plotNo}, ${data.area || 'Dubai, UAE'}.`;
     
             let html = getLetterheadHeaderHtml() + getCommonHeader(dateStr);
             
             html += `<h3 style="text-align:center;">AGREEMENT FOR THE PROVISION OF CONSULTANCY ENGINEERING SERVICES</h3>
                      <p>This agreement is made and entered into, on <b>${dateStr}</b> by and between:</p>
                      <p><b>${data.clientName.toUpperCase()}</b>, P.O. Box No. <b>${data.clientPOBox}</b>, Dubai, United Arab Emirates (herein after referred to as the "Client" or first party).</p>
                      <p>AND</p><p><b>M/S. URBAN AXIS ARCHITECTURAL & CONSULTING ENGINEERS</b>, of Post Box 281, Dubai, United Arab Emirates (hereinafter referred to as the "CONSULTANT" or the Second party).</p>
                      <div class="page-break" style="page-break-after: always;"></div>` + getLetterheadHeaderHtml() + getCommonHeader(dateStr) +
                 `<h4>The two parties agree as follows:</h4><p>Whereas the first party is desirous to have constructed, completed and maintained ${projectTitle} (hereinafter referred to as the "Project") and has assigned the provision of Consultancy Engineering Services thereof to the second party who accepted the assignment subject to the terms and conditions of this Contract Agreement.</p>`;
             
             const sectionTitles = { 
                '1': 'STUDY AND DESIGN', '2': 'THE PRELIMINARY DESIGN STAGE', '3': 'FINAL STAGE', '7': 'INTERIOR DESIGN', '4': 'TENDER DOCUMENTS PREPARATION STAGE', '5': 'SUPERVISION WORKS', '6': "CONSULTANT'S DUTIES & RESPONSIBILITIES", '12': 'BIM SERVICES', '13': 'BIM - LEVEL OF DETAIL (LOD)', '14': 'STRUCTURAL REVIEW & ASSESSMENT', '8': 'THE PRINCIPLES OF CALCULATION', '9': "THE OWNER'S OBLIGATIONS", '10': 'AMENDMENTS', '11': 'EXTENSION OF COMPLETION PERIOD & SUPERVISION OF CONSULTANT\'S SERVICES' 
            };
             const useBrief = data.scope?.useBrief;

            let mainCounter = 0;
             for (const sectionId in sectionTitles) {
                if (data.scope && data.scope[sectionId]) {
                    const selectedItems = (CONTENT.SCOPE_DEFINITIONS[sectionId] || []).filter(item => data.scope[sectionId][item.id]);

                    if (selectedItems.length > 0 || data.scope[sectionId].additional) {
                        mainCounter++;
                        let itemsHtml = '';
                        selectedItems.forEach((item, itemIndex) => {
                            let textToUse = useBrief ? item.brief : item.detailed;
                            textToUse = textToUse.replace(/<b>\d+\.\d+(\.\w)?\s*/, `<b>${mainCounter}.${itemIndex + 1} `);

                            if (item.id === '3.2') {
                                const selectedSubItems = (CONTENT.SCOPE_DEFINITIONS['3.2'] || []).filter(subItem => data.scope['3.2']?.[subItem.id]);
                                if (selectedSubItems.length > 0) {
                                    let subListHtml = '';
                                    selectedSubItems.forEach((subItem, subIndex) => {
                                        let subListText = useBrief ? subItem.brief : subItem.detailed;
                                        subListText = subListText.replace(/<b>[A-Z]\.\s*/, `<b>${String.fromCharCode(65 + subIndex)}. `)
                                        subListHtml += `<li>${subListText}</li>`;
                                    });
                                    itemsHtml += `<li>${textToUse.replace(/<ol.*<\/ol>/, `<ol type="A">${subListHtml}</ol>`)}</li>`;
                                } else {
                                     itemsHtml += `<li>${textToUse.replace(/<ol.*<\/ol>/, '')}</li>`;
                                }
                            } else if (item.id === '14.1') { // --- MODIFICATION START ---
                                const selectedSubItems = (CONTENT.SCOPE_DEFINITIONS['14.1'] || []).filter(subItem => data.scope['14.1']?.[subItem.id]);
                                if (selectedSubItems.length > 0) {
                                    let subListHtml = '';
                                    selectedSubItems.forEach((subItem, subIndex) => {
                                        let subListText = useBrief ? subItem.brief : subItem.detailed;
                                        subListText = subListText.replace(/<b>[A-Z]\.\s*/, `<b>${String.fromCharCode(65 + subIndex)}. `);
                                        subListHtml += `<li>${subListText}</li>`;
                                    });
                                    itemsHtml += `<li>${textToUse.replace(/<ol.*<\/ol>/, `<ol type="A">${subListHtml}</ol>`)}</li>`;
                                } else {
                                     itemsHtml += `<li>${textToUse.replace(/<ol.*<\/ol>/, '')}</li>`;
                                }
                            } else { // --- MODIFICATION END ---
                                itemsHtml += `<li>${textToUse}</li>`;
                            }
                        });

                        if (data.scope[sectionId].additional) {
                            itemsHtml += `<li><b>${mainCounter}.${selectedItems.length + 1} Additional:</b> ${data.scope[sectionId].additional}</li>`;
                        }

                        html += `<h4>${mainCounter}. ${sectionTitles[sectionId]}</h4><ol type="1" style="list-style-type: none; padding-left: 0;">${itemsHtml}</ol>`;
                    }
                }
            }
     
             html += `<h4>${mainCounter + 1}. REMUNERATION</h4>`;
     
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
             
             html += `<h4>${mainCounter + 2}. OWNERSHIP OF DOCUMENTS</h4><p>All technical specifications and other contract documents shall remain the sole property of the Consultant...</p>
                      <h4>${mainCounter + 3}. TERMINATION OF THE CONTRACT AGREEMENT</h4><p>The Owner shall have right to terminate this Contract agreement vide a written notice... On the other hand, the Consultant may terminate this contract agreement vide a written notice to the Owner if the Consultant's due payments were delayed...</p>
                      <h4>${mainCounter + 4}. SETTLEMENT OF DISPUTES</h4><p>All disputes and differences arising the two parties be settled amicably... Both parties shall authorize the Society of Engineers, U.A.E. to appoint a sole arbitrator...</p>
                      <div class="signature-block">
                          <div><b>FIRST PARTY:</b><br><br><br>_________________________<br>${data.clientName.toUpperCase()}</div>
                          <div><b>SECOND PARTY:</b><br><br><br>_________________________<br>M/s. Urban Axis ARCHITECTURAL & CONSULTING ENGINEERS</div>
                      </div>` + getCommonFooter();
             return html;
        },

        assignmentOrder: (data) => {
             const location = data.area || 'Dubai, UAE';
             const scopeOfWork = Object.keys(data.scopeOfWorkTypes || {}).filter(k => data.scopeOfWorkTypes[k]).join(', ');
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
        },

        tenderPackage: (projectData) => {
            const tenderFiles = (projectData.masterFiles || []).filter(f => f.category === 'tender_documents');
            const getFilesBySubCat = (subCat) => tenderFiles.filter(f => f.subCategory === subCat).map(f => `<li>${f.name}</li>`).join('');
    
            const drawings = getFilesBySubCat('tender_drawings');
            const boq = getFilesBySubCat('boq');
            const specs = getFilesBySubCat('specifications');
    
            return `
                <div class="document-preview a4">
                    ${getLetterheadHeaderHtml()}
                    <h2 style="text-align:center;">Tender Package Summary</h2>
                    <table class="output-table" style="margin-bottom: 20px;">
                        <tr><th style="width:25%;">Project:</th><td>${projectData.projectDescription || 'N/A'}</td></tr>
                        <tr><th>Job No:</th><td>${projectData.jobNo || 'N/A'}</td></tr>
                        <tr><th>Client:</th><td>${projectData.clientName || 'N/A'}</td></tr>
                        <tr><th>Date:</th><td>${new Date().toLocaleDateString('en-GB')}</td></tr>
                    </table>
                    
                    <h3>Included Documents</h3>
                    <h4>Tender Drawings</h4>
                    ${drawings ? `<ul>${drawings}</ul>` : '<p>No tender drawings uploaded.</p>'}
                    
                    <h4>Bill of Quantities (BOQ)</h4>
                    ${boq ? `<ul>${boq}</ul>` : '<p>No BOQ documents uploaded.</p>'}
    
                    <h4>Specifications</h4>
                    ${specs ? `<ul>${specs}</ul>` : '<p>No specification documents uploaded.</p>'}
                    ${getCommonFooter()}
                </div>
            `;
        },
    
        vendorList: (projectData) => {
            const { selectedVendors = [] } = projectData;

            const vendorsByCategory = selectedVendors.reduce((acc, vendor) => {
                if (!acc[vendor.category]) {
                    acc[vendor.category] = [];
                }
                acc[vendor.category].push(vendor);
                return acc;
            }, {});

            let tablesHtml = '';
            for (const category in vendorsByCategory) {
                tablesHtml += `
                    <h4>${category}</h4>
                    <table class="document-table">
                        <thead>
                            <tr>
                                <th style="width: 50%;">Item</th>
                                <th>Manufacturer</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vendorsByCategory[category].map(v => `<tr><td>${v.item}</td><td>${v.manufacturer}</td></tr>`).join('')}
                        </tbody>
                    </table>`;
            }

            return `
                <div class="document-preview a4">
                    ${getLetterheadHeaderHtml()}
                    <h2 style="text-align:center;">Approved Vendor List</h2>
                    <table class="output-table" style="margin-bottom: 20px;">
                        <tr><th style="width:25%;">Project:</th><td>${projectData.projectDescription || 'N/A'}</td></tr>
                        <tr><th>Job No:</th><td>${projectData.jobNo || 'N/A'}</td></tr>
                        <tr><th>Date:</th><td>${new Date().toLocaleDateString('en-GB')}</td></tr>
                    </table>
                    
                    ${tablesHtml.length > 0 ? tablesHtml : '<p style="text-align:center;">No vendors have been selected for this project.</p>'}
                    
                    ${getCommonFooter()}
                </div>
            `;
        },
        
        projectReport: (data) => {
            const { project, siteData, scrumData, allStaff, feeDistribution, selectedSections } = data;
        
            let reportHtml = `
                <div class="document-preview a4">
                    ${getLetterheadHeaderHtml()}
                    <h2 style="text-align:center;">Project Status Report</h2>
                    <p style="text-align:center; font-size: 0.9em; color: #555;">
                        Report Date: ${new Date().toLocaleDateString('en-GB')} | Job No: ${project.jobNo}
                    </p>
            `;
        
            // Section: Client Details
            if (selectedSections.includes('clientDetails')) {
                reportHtml += `
                    <h3>1. Client Details</h3>
                    <table class="output-table">
                        <tr><th style="width:30%;">Client Name:</th><td>${project.clientName || 'N/A'}</td></tr>
                        <tr><th>Contact No:</th><td>${project.clientMobile || 'N/A'}</td></tr>
                        <tr><th>Email:</th><td>${project.clientEmail || 'N/A'}</td></tr>
                        <tr><th>P.O. Box:</th><td>${project.clientPOBox || 'N/A'}</td></tr>
                    </table>
                `;
            }
        
            // Section: Project Info
            if (selectedSections.includes('projectInfo')) {
                reportHtml += `
                    <h3>2. Project Information</h3>
                    <table class="output-table">
                        <tr><th style="width:30%;">Project Description:</th><td>${project.projectDescription || 'N/A'}</td></tr>
                        <tr><th>Project Type:</th><td>${project.projectType || 'N/A'}</td></tr>
                        <tr><th>Location:</th><td>Plot No. ${project.plotNo}, ${project.area || 'N/A'}</td></tr>
                        <tr><th>Built-up Area:</th><td>${project.builtUpArea ? `${project.builtUpArea.toLocaleString()} sq ft` : 'N/A'}</td></tr>
                        <tr><th>Agreed Duration:</th><td>${project.designDuration || 0} months (Design) + ${project.constructionDuration || 0} months (Construction)</td></tr>
                    </table>
                `;
            }
            
            // Section: Financials
            if (selectedSections.includes('financials')) {
                const constructionCost = (project.builtUpArea || 0) * (project.constructionCostRate || 0);
                const invoices = project.invoices || [];
                const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
                const pendingInvoices = invoices.filter(inv => inv.status === 'Raised' || inv.status === 'Pending');
                const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.paymentDetails?.amountPaid || 0), 0);
                const totalPending = pendingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
                
                const billedAmount = invoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
                const futurePayment = feeDistribution.totalConsultancyFee - billedAmount;
        
                reportHtml += `
                    <h3>3. Financial Summary</h3>
                    <table class="output-table">
                        <tr><th style="width:30%;">Est. Construction Cost:</th><td>${formatCurrency(constructionCost)}</td></tr>
                        <tr><th>Total Consultancy Fee:</th><td>${formatCurrency(feeDistribution.totalConsultancyFee)}</td></tr>
                        <tr><th>Amount Paid to Date:</th><td>${formatCurrency(totalPaid)}</td></tr>
                        <tr><th>Pending Invoices:</th><td>${formatCurrency(totalPending)}</td></tr>
                        <tr><th>Future Billings (Est.):</th><td>${formatCurrency(futurePayment)}</td></tr>
                    </table>
                `;
            }
        
            // Section: Schedule & Site Status
            if (selectedSections.includes('schedule')) {
                const siteStatus = siteData?.status || 'N/A';
                const siteProgress = siteData?.progress || 0;
                reportHtml += `
                    <h3>4. Project Schedule & Site Status</h3>
                    <table class="output-table">
                         <tr><th style="width:30%;">Current Site Status:</th><td><span class="status-${siteStatus.toLowerCase().replace(/ /g, '-')}">${siteStatus}</span></td></tr>
                         <tr><th>Site Progress:</th><td><div class="progress-bar-container" style="background-color: #e9ecef; border-radius: .25rem; border: 1px solid #ccc;"><div class="progress-bar" style="height: 20px; width:${siteProgress}%; background-color: #0d6efd; color: white; text-align: center; line-height: 20px; font-size: 0.8em; border-radius: .25rem;">${siteProgress}%</div></div></td></tr>
                    </table>
                `;
            }
        
            // Section: Scrum Analysis
            if (selectedSections.includes('scrumAnalysis')) {
                reportHtml += `<h3>5. Design Task Analysis</h3>`;
                if (scrumData && scrumData.tasks && scrumData.tasks.length > 0) {
                    const staffMap = new Map((allStaff || []).map(s => [s.id, s.name]));
                    const analysis = scrumData.tasks.reduce((acc, task) => {
                        const dept = task.department || 'Default';
                        if (!acc[dept]) acc[dept] = { totalTasks: 0, completed: 0, inProgress: 0, totalPlannedDays: 0, totalActualDays: 0, assignees: new Set() };
                        
                        acc[dept].totalTasks++;
                        acc[dept].totalPlannedDays += (task.plannedDuration || 0);
                        if(task.assigneeId) acc[dept].assignees.add(staffMap.get(task.assigneeId) || 'Unknown');
        
                        if (task.status === 'Done' && task.startDate && task.completedDate) {
                            acc[dept].completed++;
                            // Basic day diff, doesn't account for weekends. For a report, this is often acceptable.
                            const start = new Date(task.startDate);
                            const end = new Date(task.completedDate);
                            const diffTime = Math.abs(end - start);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            acc[dept].totalActualDays += diffDays;
                        } else if (task.status === 'In Progress') {
                            acc[dept].inProgress++;
                        }
                        return acc;
                    }, {});
        
                    reportHtml += `<table class="document-table">
                        <thead><tr><th>Department</th><th>Tasks</th><th>Planned Days</th><th>Actual Days (Completed)</th><th>Assignees</th></tr></thead><tbody>`;
                    for (const dept in analysis) {
                        const data = analysis[dept];
                        const assignees = Array.from(data.assignees).join(', ');
                        reportHtml += `
                            <tr>
                                <td>${dept}</td>
                                <td>${data.completed} / ${data.totalTasks} Done</td>
                                <td>${data.totalPlannedDays.toFixed(1)}</td>
                                <td>${data.totalActualDays > 0 ? data.totalActualDays.toFixed(1) : 'N/A'}</td>
                                <td>${assignees || 'N/A'}</td>
                            </tr>
                        `;
                    }
                    reportHtml += `</tbody></table>`;
                } else {
                    reportHtml += `<p>No design task data available for analysis.</p>`;
                }
            }
        
            reportHtml += `${getCommonFooter()}</div>`;
            return reportHtml;
        }
    };
})();