App.ProjectTabs.PaymentCert = (() => {


function init() {
    const container = document.getElementById('payment-cert-tab');
    if (!container) return;
    container.innerHTML = `
        <h3>Payment Certificates</h3>
        <p>Generate certificates based on the latest BOQ data from the site engineer.</p>
        <div class="input-group"><label for="payment-cert-no">Next Certificate No.</label><input type="text" id="payment-cert-no"></div>
        <button id="generate-new-cert-btn" class="primary-button" style="width: 100%; margin-bottom: 15px;">Generate New Certificate</button><hr>
        <h4>Certificate History</h4>
        <table class="output-table"><thead><tr><th>Cert. No.</th><th>Date</th><th>Net Payable</th><th>Action</th></tr></thead><tbody id="cert-history-body"></tbody></table>
    `;
    Object.assign(App.DOMElements, {
        paymentCertNo: document.getElementById('payment-cert-no'),
        certHistoryBody: document.getElementById('cert-history-body')
    });
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('payment-cert-tab')?.addEventListener('click', handleActions);
}

async function handleActions(e) {
    if (!App.currentProjectJobNo) return;
    if (e.target.matches('#generate-new-cert-btn')) {
        const certNo = App.DOMElements.paymentCertNo.value;
        if (!certNo) { alert('Please provide a Certificate Number.'); return; }
        await generateAndSavePaymentCertificate(certNo);
    } else if (e.target.matches('.view-cert-btn')) {
        const index = e.target.dataset.index;
        const siteData = await DB.getSiteData(App.currentProjectJobNo);
        const certData = siteData?.paymentCertificates?.[index];
        if (certData) {
            await renderPreview(certData);
            App.DOMElements.previewTabs.querySelector(`[data-tab="payment-certificate"]`).click();
        }
    }
}

async function renderTab(project) {
    if (!project) return;
    const siteData = await DB.getSiteData(project.jobNo) || { paymentCertificates: [] };
    const certs = siteData.paymentCertificates || [];
    App.DOMElements.paymentCertNo.value = `PC-${String(certs.length + 1).padStart(2, '0')}`;
    const tbody = App.DOMElements.certHistoryBody;
    tbody.innerHTML = '';
    if (certs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No certificates issued yet.</td></tr>';
    } else {
        certs.forEach((cert, index) => {
            const row = tbody.insertRow();
            row.innerHTML = `<td>${cert.certNo}</td><td>${new Date(cert.date).toLocaleDateString('en-CA')}</td><td>${App.formatCurrency(cert.netPayable)}</td><td><button class="view-cert-btn secondary-button" data-index="${index}">View</button></td>`;
        });
    }
}

async function generateAndSavePaymentCertificate(certNo) {
    const project = await DB.getProject(App.currentProjectJobNo);
    const siteData = await DB.getSiteData(App.currentProjectJobNo);
    if (!siteData || !siteData.boq || siteData.boq.length === 0) {
        alert("Cannot generate certificate. No BOQ data found from site engineer."); return;
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
    await renderTab(project);
    await renderPreview(newCertData);
    App.DOMElements.previewTabs.querySelector(`[data-tab="payment-certificate"]`).click();
    alert(`Payment Certificate ${certNo} has been generated and saved.`);
}

async function renderPreview(certData) {
    const container = App.DOMElements['payment-certificate-preview'];
    if (!certData) {
         container.innerHTML = `<div style="padding: 20px; text-align: center;">Generate or select a certificate to view its preview.</div>`;
         return;
    }
    const project = await DB.getProject(App.currentProjectJobNo);
    container.innerHTML = PROJECT_DOCUMENT_TEMPLATES.paymentCertificate(certData, project);
}
function getCurrentCert() {
    // This function simply returns the current state of the certificate being built.
    return currentCert;
}


return {
    init,
    renderTab,
    renderPreview,
    getCurrentCert // <-- Add this new export
};

// return { init, renderTab, renderPreview };

})();