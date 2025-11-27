
document.addEventListener('DOMContentLoaded', async () => {
    let currentJobNo = null;
    let DOMElements = {};

    async function main() {
        try {
            await DB.init();
            cacheDOMElements();
            setupEventListeners();
            await renderProjectList();
        } catch (error) {
            console.error("Error initializing Site App:", error);
            document.body.innerHTML = `<div style='padding:40px; text-align:center; color:red;'><h2>Application Failed to Start</h2><p>Could not connect to the database.</p></div>`;
        }
    }

    function cacheDOMElements() {
        DOMElements.projectListBody = document.getElementById('project-list-body');
        DOMElements.detailsView = document.getElementById('project-details-view');
        DOMElements.detailsProjectName = document.getElementById('details-project-name');
        DOMElements.detailsProjectInfo = document.getElementById('details-project-info');
        DOMElements.siteStatusSelect = document.getElementById('site-status-select');
        DOMElements.photoUploadInput = document.getElementById('photo-upload-input');
        DOMElements.photoGallery = document.getElementById('photo-gallery');
        DOMElements.docUploadInput = document.getElementById('doc-upload-input');
        DOMElements.docGallery = document.getElementById('doc-gallery');
        DOMElements.docNameInput = document.getElementById('doc-name-input');
        DOMElements.loadDataBtn = document.getElementById('load-data-btn');
        DOMElements.saveDataBtn = document.getElementById('save-data-btn');
    }

    function setupEventListeners() {
        // Remove file load/save buttons as they are no longer needed
        DOMElements.loadDataBtn.style.display = 'none';
        DOMElements.saveDataBtn.style.display = 'none';

        DOMElements.projectListBody.addEventListener('click', handleProjectSelect);
        DOMElements.siteStatusSelect.addEventListener('change', updateSiteStatus);
        DOMElements.photoUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'photos'));
        DOMElements.docUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'documents'));
        // ... all other UI event listeners
    }

    async function renderProjectList() {
        const tbody = DOMElements.projectListBody;
        const allProjects = await DB.getAllProjects();
        const allUpdates = await DB.getAllSiteUpdates();
        const updateMap = allUpdates.reduce((acc, u) => ({...acc, [u.jobNo]: u }), {});

        tbody.innerHTML = '';
        if (allProjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No projects found. Please sync with the main office app first.</td></tr>';
            return;
        }

        allProjects.forEach(p => {
            const siteStatus = updateMap[p.jobNo]?.status || 'Not Started';
            const row = tbody.insertRow();
            row.dataset.jobNo = p.jobNo;
            row.innerHTML = `<td>${p.jobNo}</td><td>${p.projectDescription}<br><small>${p.clientName}</small></td><td>${p.plotNo}</td>
                             <td><span class="status-${siteStatus.toLowerCase().replace(/ /g, '-')}">${siteStatus}</span></td>`;
        });
    }

    async function handleProjectSelect(event) {
        const row = event.target.closest('tr');
        if (!row || !row.dataset.jobNo) return;
        currentJobNo = row.dataset.jobNo;
        
        document.querySelectorAll('#project-list-body tr').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');

        const project = await DB.getProject(currentJobNo);
        const siteUpdate = await DB.getSiteUpdate(currentJobNo) || { jobNo: currentJobNo, status: 'Pending Start', photos: [], documents: [] };

        DOMElements.detailsProjectName.textContent = project.projectDescription;
        DOMElements.detailsProjectInfo.textContent = `Job: ${project.jobNo} | Plot: ${project.plotNo}`;
        DOMElements.siteStatusSelect.value = siteUpdate.status;
        
        renderGallery('photos', siteUpdate.photos);
        renderGallery('documents', siteUpdate.documents);
        
        DOMElements.detailsView.style.display = 'block';
    }

    async function updateSiteStatus() {
        if (!currentJobNo) return;
        const siteUpdate = await DB.getSiteUpdate(currentJobNo) || { jobNo: currentJobNo, photos: [], documents: [] };
        siteUpdate.status = DOMElements.siteStatusSelect.value;
        await DB.putSiteUpdate(siteUpdate);
        await renderProjectList();
        console.log(`Status for ${currentJobNo} updated to ${siteUpdate.status}`);
    }

    async function handleFileUpload(event, type) {
        if (!currentJobNo) return;
        const siteUpdate = await DB.getSiteUpdate(currentJobNo) || { jobNo: currentJobNo, status: 'Pending Start', photos: [], documents: [] };
        
        for (const file of event.target.files) {
            const dataUrl = await readFileAsDataURL(file);
            const fileObject = { name: file.name, type: file.type, dataUrl: dataUrl, timestamp: Date.now() };
            if(type === 'documents' && DOMElements.docNameInput.value) fileObject.name = `${DOMElements.docNameInput.value} (${file.name})`;
            siteUpdate[type].push(fileObject);
        }
        
        await DB.putSiteUpdate(siteUpdate);
        renderGallery(type, siteUpdate[type]);
        if(type === 'documents') DOMElements.docNameInput.value = '';
        event.target.value = '';
    }

    function renderGallery(type, files) {
        const galleryEl = type === 'photos' ? DOMElements.photoGallery : DOMElements.docGallery;
        galleryEl.innerHTML = '';
        (files || []).forEach((file, index) => {
            const thumbContainer = document.createElement('div');
            thumbContainer.className = 'thumbnail-container';
            // Delete button would need to be implemented here, calling DB.putSiteUpdate after splicing the array
            let thumbnail = document.createElement('img');
            thumbnail.src = file.dataUrl;
            thumbnail.className = 'thumbnail';
            thumbContainer.append(thumbnail);
            galleryEl.appendChild(thumbContainer);
        });
    }
    
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    main();
});
