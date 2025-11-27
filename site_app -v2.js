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
        DOMElements.projectFileInput = document.getElementById('project-file-input');
        DOMElements.reloadDataBtn = document.getElementById('reload-data-btn');
        DOMElements.downloadZipBtn = document.getElementById('download-zip-btn');
    }

    function setupEventListeners() {
        // Hide the save button as it's not implemented for sharing yet
        DOMElements.saveDataBtn.style.display = 'none';

        // Wire up the load button to the hidden file input
        DOMElements.loadDataBtn.addEventListener('click', () => DOMElements.projectFileInput.click());
        DOMElements.projectFileInput.addEventListener('change', handleProjectFileImport);

        DOMElements.reloadDataBtn.addEventListener('click', renderProjectList);
        DOMElements.projectListBody.addEventListener('click', handleProjectSelect);
        DOMElements.siteStatusSelect.addEventListener('change', updateSiteStatus);
        DOMElements.photoUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'photos'));
        DOMElements.docUploadInput.addEventListener('change', (e) => handleFileUpload(e, 'documents'));
        
        // Add listener for the new ZIP download button
        DOMElements.downloadZipBtn.addEventListener('click', handleDownloadProjectAsZip);
    }

    async function handleDownloadProjectAsZip() {
        if (!currentJobNo) {
            alert("Please select a project first.");
            return;
        }

        if (typeof JSZip === 'undefined') {
            alert("Error: JSZip library is not loaded. Cannot create ZIP file.");
            return;
        }
        
        alert('Preparing ZIP file... This may take a moment for projects with many photos.');

        try {
            const project = await DB.getProject(currentJobNo);
            const siteUpdate = await DB.getSiteUpdate(currentJobNo);
            const zip = new JSZip();

            // 1. Add project info file
            let infoText = `PROJECT INFORMATION\n\n`;
            infoText += `Job No: ${project.jobNo}\n`;
            infoText += `Project: ${project.projectDescription}\n`;
            infoText += `Client: ${project.clientName}\n`;
            infoText += `Plot No: ${project.plotNo}\n\n`;
            infoText += `SITE STATUS\n`;
            infoText += `Last Updated Status: ${siteUpdate?.status || 'N/A'}\n`;
            zip.file("project_info.txt", infoText);

            // 2. Add photos to a 'photos' folder
            if (siteUpdate?.photos?.length > 0) {
                const photosFolder = zip.folder("photos");
                for (const photo of siteUpdate.photos) {
                    const base64Data = photo.dataUrl.split(',')[1];
                    photosFolder.file(photo.name, base64Data, { base64: true });
                }
            }

            // 3. Add documents to a 'documents' folder
            if (siteUpdate?.documents?.length > 0) {
                const docsFolder = zip.folder("documents");
                for (const doc of siteUpdate.documents) {
                    const base64Data = doc.dataUrl.split(',')[1];
                    docsFolder.file(doc.name, base64Data, { base64: true });
                }
            }

            // 4. Generate the ZIP and trigger download
            const content = await zip.generateAsync({ type: "blob" });
            const a = document.createElement('a');
            const safeFileName = `Site-Update_${project.jobNo.replace(/[\\/]/g, '-')}.zip`;
            a.href = URL.createObjectURL(content);
            a.download = safeFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);

        } catch (error) {
            console.error("Error creating ZIP file:", error);
            alert(`Failed to create ZIP file. See console for details. Error: ${error.message}`);
        }
    }


    async function handleProjectFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const xmlString = e.target.result;
                const parsedProjects = loadProjectsFromXmlString(xmlString); // From xml_handler.js

                if (!parsedProjects || parsedProjects.length === 0) {
                    alert('Could not parse the project file or the file is empty.');
                    return;
                }

                if (confirm(`This will import/update ${parsedProjects.length} projects from the file. Continue?`)) {
                    const importPromises = parsedProjects.map(p => DB.putProject(p));
                    await Promise.all(importPromises);

                    alert(`${parsedProjects.length} projects were successfully loaded!`);
                    await renderProjectList(); // Refresh the view with new data
                }
            } catch (error) {
                console.error("Error importing project file:", error);
                alert(`An error occurred during import: ${error.message}`);
            } finally {
                // Reset file input to allow re-uploading the same file if needed
                DOMElements.projectFileInput.value = '';
            }
        };
        reader.readAsText(file);
    }

    async function renderProjectList() {
        const tbody = DOMElements.projectListBody;
        const allProjects = await DB.getAllProjects();
        const allUpdates = await DB.getAllSiteUpdates();
        const updateMap = allUpdates.reduce((acc, u) => ({...acc, [u.jobNo]: u }), {});

        tbody.innerHTML = '';
        if (allProjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No projects found. Use "Load Project File" to begin.</td></tr>';
            return;
        }

        allProjects.forEach(p => {
            const siteStatus = updateMap[p.jobNo]?.status || 'Pending Start';
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