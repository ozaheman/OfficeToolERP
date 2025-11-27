// ===================================================================================
// MODULE 3: MAIN APPLICATION LOGIC
// ===================================================================================
document.addEventListener('DOMContentLoaded', () => {
    let allProjects = [];
    let currentProjectJobNo = null;
    let isDataDirty = false;
    let pendingInvoicesList = [];
    let showAllInvoices = false;
    const DOMElements = {};

    function main() {
        cacheDOMElements();
        populateControlTabs();
        initResizer();
        populateStaticControls();
        setupEventListeners();
        initializeAppState();
    }
    function getTotalFee() {
        const selectedType = document.querySelector('input[name="remunerationType"]:checked').value;
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

    // --- HTML RENDERERS FOR PREVIEWS AND PDF CONTENT ---
    const getLetterheadHeaderHTML = (dateStr) => `<div class="doc-header"><div class="company-name"><div class="arabic-name">شاولا للهندسة المعمارية والاستشارية</div><h1>Chawla</h1><h2>Architectural & Consulting Engineers</h2></div></div><p style="text-align:right;">${dateStr}</p>`;
    const getLetterheadFooterHTML = () => `<div class="preview-footer">P.O. Box: 281, DUBAI (U.A.E) TEL.: 04-3493435, FAX: 04-3492030, E-mail: chawla@emirates.net.ae<br>Website: www.chawladxb.ae</div>`;
    const getBankDetailsHTML = () => `<div class="bank-details"><b>Bank Account Details for Payment:</b><br>Account Name: ${CONTENT.BANK_DETAILS.name}<br>Bank Name: ${CONTENT.BANK_DETAILS.bank}<br>Account No: ${CONTENT.BANK_DETAILS.ac}<br>IBAN: ${CONTENT.BANK_DETAILS.iban}<br>Swift Code: ${CONTENT.BANK_DETAILS.swift}</div>`;

    function renderAssignmentOrder(data, forPdf = false) {
        const dateStr = new Date(data.agreementDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const location = data.area || 'Dubai, UAE';
        
        const contentHtml = `<h3 style="text-align:center;">ASSIGNMENT ORDER</h3>
                 <p>I, the undersigned <b>${data.clientName.toUpperCase()}</b>, Owner of Plot No. <b>${data.plotNo}</b>, ${location}, do hereby, appoint M/s. CHAWLA ARCHITECTURAL & CONSULTING ENGINEERS, Post Box No. 281, Dubai, for the required technical studies and the construction of the ${data.projectDescription} on the above mentioned plot, including the preparation of initial designs, and provisional costs of the project.</p>
                 <p>I hereby further authorize the above mentioned Consultants to sign in my name & on my behalf before all Government department all applications / documents necessary for obtaining any data for conducting such studies and obtaining licenses.</p>
                 <br><br><br>
                 <table style="width:100%;">
                     <tr><td style="width:30%;"><b>Name & Signature:</b></td><td>_________________________<br>${data.clientName.toUpperCase()}</td></tr>
                     <tr><td><br><b>Signature of the Consultant:</b></td><td><br>_________________________<br>For CHAWLA ARCHITECTURAL & CONSULTING ENGINEERS</td></tr>
                     <tr><td><br><b>Witness:</b></td><td><br>_________________________<br>Project Architect</td></tr>
                 </table>`;

        if (forPdf) return { contentHtml, dateStr };
        return getLetterheadHeaderHTML(dateStr) + contentHtml + getLetterheadFooterHTML();
    }

    function renderBriefProposal(data, forPdf = false) {
        const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const projectTitle = `${data.scopeOfWorkType === 'Other' ? data.otherScopeType : data.scopeOfWorkType} of ${data.projectDescription} on Plot No. ${data.plotNo}, ${data.area || 'Dubai, UAE'}.`;

        let contentHtml = `<table style="width:100%; margin-bottom: 20px;">
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
                 CONTENT.SCOPE_DEFINITIONS[sectionId].forEach(item => {
                    if (data.scope[sectionId][item.id]) itemsHtml += `<li>${item.brief}</li>`;
                });
            }
            if (itemsHtml) contentHtml += `<li><b>${summary.textContent}</b><ul>${itemsHtml}</ul></li>`;
        });
        contentHtml += `</ol><h3>Time Span:</h3><ul>
                    <li>Design & Approval: ${data.designDuration} Months from the signing of the Contract Date.</li>
                    <li>Construction: ${data.constructionDuration} months</li>
                 </ul>`;
        const feeDistribution = getFeeDistribution(data);
        contentHtml += `<h3>Fee Proposal:</h3>`;
        if (data.remunerationType === 'percentage') {
            const constructionCost = (data.builtUpArea || 0) * (data.constructionCostRate || 0);
            contentHtml += `<p>The total consultancy fee for the above mentioned services will be <b>${data.consultancy