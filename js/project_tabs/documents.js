
App.ProjectTabs.Documents = (() => {


function init() {
    const createDocCategoryHTML = (catConfig) => {
        let html = '';
        for (const catKey in catConfig) {
            const category = catConfig[catKey];
            let optionsHtml = category.types.map(type => `<option value="${type.toLowerCase()}">${type.replace(/_/g, ' ')}</option>`).join('');
            html += `
                <div class="document-category" id="doc-cat-${catKey}">
                    <h4>${category.title}</h4>
                    <div class="upload-area">
                        <select class="doc-type-select">${optionsHtml}</select>
                        <input type="file" class="doc-file-input" accept=".jpg,.jpeg,.png,.pdf" multiple>
                        <input type="date" class="expiry-date-input" title="Set document expiry date">
                        <button type="button" class="upload-btn" data-category="${catKey}">Upload</button>
                    </div>
                    <div class="gallery-grid"><p>Please save the project first.</p></div>
                </div>`;
        }
        return html;
    };

    const mainDocCats = { client_details: { title: 'Client Details', types: ['Passport', 'Emirates_ID', 'Affection_Plan', 'Title_Deed', 'SPS', 'Oqood', 'DCR'] }, noc_copies: { title: 'NOC Copies', types: ['RTA', 'DEWA_Electrical', 'DEWA_Water', 'Du', 'Etisalat', 'Developer_NOC', 'Building_Permit', 'Other_NOC'] }, letters: { title: 'Project Letters', types: ['Incoming_Letter', 'Outgoing_Letter', 'Site_Memo'] }, other_uploads: { title: 'Other Uploads', types: ['Miscellaneous'] } };
    const tenderDocCats = { tender_documents: { title: 'Tender Documents', types: ['Tender_Drawings', 'BOQ', 'Specifications', 'Contract_Conditions', 'Addenda', 'Tender_Analysis'] } };
    
    const docContainer = document.getElementById('documents-tab');
    if(docContainer) docContainer.innerHTML = `<h3>Project Documents Management</h3>${createDocCategoryHTML(mainDocCats)}`;
    
    const tenderContainer = document.getElementById('tender-tab');
    if(tenderContainer) tenderContainer.innerHTML = `<h3>Tender Management</h3>${createDocCategoryHTML(tenderDocCats)}`;

    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('documents-tab')?.addEventListener('click', handleMasterDocumentUpload);
    document.getElementById('tender-tab')?.addEventListener('click', handleMasterDocumentUpload);
}

async function handleMasterDocumentUpload(event) {
    if (!event.target.matches('.upload-btn')) return;
    if (!App.currentProjectJobNo) { alert("Please save the project before uploading documents."); return; }
    const container = event.target.closest('.document-category');
    const fileInput = container.querySelector('.doc-file-input');
    const subCategorySelect = container.querySelector('.doc-type-select');
    const expiryInput = container.querySelector('.expiry-date-input');
    const category = event.target.dataset.category;
    const files = fileInput.files;
    if (files.length === 0) { alert("Please select a file to upload."); return; }
    for (const file of files) {
        const dataUrl = await App.readFileAsDataURL(file);
        await DB.addFile({
            jobNo: App.currentProjectJobNo, source: 'master', category: category,
            subCategory: subCategorySelect.value, name: file.name, fileType: file.type,
            dataUrl: dataUrl, expiryDate: expiryInput.value || null
        });
    }
    alert(`${files.length} file(s) uploaded successfully.`);
    fileInput.value = '';
    if(expiryInput) expiryInput.value = '';
    renderMasterFileGallery(container, App.currentProjectJobNo, category);
}

async function renderMasterFileGallery(containerEl, jobNo, category) {
    const galleryGrid = containerEl.querySelector('.gallery-grid');
    galleryGrid.innerHTML = '<p>Loading files...</p>';
    const files = await DB.getFilesByCategory(jobNo, 'master', category);
    
    if (files.length === 0) {
        galleryGrid.innerHTML = '<p>No documents uploaded in this category.</p>'; return;
    }
    galleryGrid.innerHTML = '';
    files.forEach(file => {
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'thumbnail-container';
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'thumbnail-delete-btn';
        deleteBtn.innerHTML = '×';
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
            thumbnail = document.createElement('canvas'); thumbnail.className = 'thumbnail pdf-thumbnail';
            PDFGenerator.renderPdfThumbnail(thumbnail, file.dataUrl);
        } else {
            thumbnail = Object.assign(document.createElement('div'), { className: 'file-icon', textContent: file.fileType.split('/')[1]?.toUpperCase() || 'FILE' });
        }
        thumbnail.onclick = () => showFilePreviewModal(file);
        const caption = document.createElement('div');
        caption.className = 'thumbnail-caption';
        caption.textContent = file.name;
        thumbContainer.append(deleteBtn, thumbnail, caption);
        galleryGrid.appendChild(thumbContainer);
    });
}

function renderAllGalleries(jobNo) {
    document.getElementById('project-view').querySelectorAll('.document-category').forEach(container => {
        const uploadBtn = container.querySelector('.upload-btn');
        if (uploadBtn) {
            const category = uploadBtn.dataset.category;
            renderMasterFileGallery(container, jobNo, category);
        }
    });
}

function showFilePreviewModal(file) {
    const container = App.DOMElements['file-preview-container'];
    container.innerHTML = '';
    let previewElement;
    if (file.fileType.startsWith('image/')) {
        previewElement = Object.assign(document.createElement('img'), { src: file.dataUrl });
    } else if (file.fileType === 'application/pdf') {
        previewElement = Object.assign(document.createElement('iframe'), { src: file.dataUrl, style: 'width: 80vw; height: 90vh; border: none;' });
    } else {
        previewElement = Object.assign(document.createElement('div'), {
            style: 'padding: 40px;',
            innerHTML: `<h4>Preview not available.</h4><p><strong>File:</strong> ${file.name}</p><a href="${file.dataUrl}" download="${file.name}" class="primary-button">Download</a>`
        });
    }
    container.appendChild(previewElement);
    App.DOMElements['file-preview-modal'].style.display = 'flex';
}

return { init, renderAllGalleries, showFilePreviewModal };

})();
