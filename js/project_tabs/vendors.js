App.ProjectTabs.Vendors = (() => {

    function init() {
        const container = document.getElementById('vendors-tab');
        if (!container) return;
        container.innerHTML = `
            <h3>Selected Vendors for this Project</h3>
            <p>Add vendors from the master list below. This list will be saved with the project and used for the printable Vendor List document in the preview panel.</p>
            <table class="output-table">
                <thead><tr><th>Category</th><th>Item</th><th>Manufacturer</th><th>Action</th></tr></thead>
                <tbody id="project-vendor-list-body"></tbody>
            </table>
            <hr>
            
            <h3>Vendor Documents</h3>
            <div class="document-category">
                <h4>Approved Vendor Lists</h4>
                <div class="upload-area" id="upload-area-approved-vendors">
                    <input type="file" class="file-upload-input" data-category="vendor_lists" data-sub-category="approved_vendor_list" multiple>
                    <button class="upload-btn">Upload Approved List(s)</button>
                </div>
                <div id="gallery-approved-vendors" class="gallery-grid"></div>
            </div>
    
            <div class="document-category">
                <h4>Subcontractor Prequalification</h4>
                <div class="upload-area" id="upload-area-subcontractor-prequal">
                    <input type="file" class="file-upload-input" data-category="vendor_lists" data-sub-category="subcontractor_prequalification" multiple>
                    <button class="upload-btn">Upload Prequalification(s)</button>
                </div>
                <div id="gallery-subcontractor-prequal" class="gallery-grid"></div>
            </div>
    
            <div class="document-category">
                <h4>Supplier Quotes</h4>
                <div class="upload-area" id="upload-area-supplier-quotes">
                    <input type="file" class="file-upload-input" data-category="vendor_lists" data-sub-category="supplier_quotes" multiple>
                    <button class="upload-btn">Upload Quote(s)</button>
                </div>
                <div id="gallery-supplier-quotes" class="gallery-grid"></div>
            </div>
            <hr>
    
            <h3>Add Vendors from Master List</h3>
            <div class="input-group" style="margin-bottom: 10px;">
                <input type="text" id="vendor-master-search" placeholder="Search Master List by Item, Manufacturer, etc...">
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                <table class="output-table">
                    <thead><tr><th>Category</th><th>Item</th><th>Manufacturer</th><th>Action</th></tr></thead>
                    <tbody id="vendor-search-results-body"></tbody>
                </table>
            </div>`;
        
        Object.assign(App.DOMElements, {
            projectVendorListBody: document.getElementById('project-vendor-list-body'),
            vendorMasterSearch: document.getElementById('vendor-master-search'),
            vendorSearchResultsBody: document.getElementById('vendor-search-results-body')
        });

        setupEventListeners();
    }

    function setupEventListeners() {
        App.DOMElements.vendorMasterSearch?.addEventListener('input', (e) => renderMasterVendorSearch(e.target.value));
        document.getElementById('vendors-tab')?.addEventListener('click', handleActions);
    }

    function populateTabData(project) {
        // Pass project.selectedVendors directly. The render function will handle making it safe.
        renderProjectVendorList(project.selectedVendors);
        
        // The rendering of document galleries is handled by the main app logic 
        // when a project is loaded, so no explicit call is needed here.
    }

    function getTabData() {
        const vendors = [];
        const rows = App.DOMElements.projectVendorListBody?.querySelectorAll('tr');
        if (rows) {
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                // Ensure it's a data row, not the "No vendors" message row
                if (cells.length === 4) { 
                    vendors.push({ 
                        category: cells[0].textContent, 
                        item: cells[1].textContent, 
                        manufacturer: cells[2].textContent 
                    });
                }
            });
        }
        // The key here MUST match what `populateTabData` expects: `selectedVendors`
        return { selectedVendors: vendors };
    }

    async function handleActions(e) {
        if (e.target.matches('.add-vendor-btn')) {
            const button = e.target;
            const newVendor = { 
                category: button.dataset.category, 
                item: button.dataset.item, 
                manufacturer: button.dataset.manufacturer 
            };
            const project = await DB.getProject(App.currentProjectJobNo);
            
            // Defensively ensure `selectedVendors` is an array before pushing
            const currentVendors = Array.isArray(project.selectedVendors) ? project.selectedVendors : [];
            currentVendors.push(newVendor);
            
            project.selectedVendors = currentVendors;
            await DB.putProject(project);
            
            renderProjectVendorList(currentVendors);
            App.refreshCurrentPreview(); // Refresh preview to update the generated list

        } else if (e.target.matches('.remove-vendor-btn')) {
            const project = await DB.getProject(App.currentProjectJobNo);
            const indexToRemove = parseInt(e.target.dataset.index, 10);
            
            // Defensively check if selectedVendors exists and is an array
            if (Array.isArray(project.selectedVendors) && project.selectedVendors[indexToRemove]) {
                project.selectedVendors.splice(indexToRemove, 1);
                await DB.putProject(project);
                renderProjectVendorList(project.selectedVendors);
                App.refreshCurrentPreview(); // Refresh preview to update the generated list
            }
        }
    }

    /**
     * Renders the list of vendors assigned to the project.
     * This function is now robust against non-array inputs.
     * @param {Array|object|undefined} selectedVendorsInput - The vendors from the project data.
     */
    function renderProjectVendorList(selectedVendorsInput) {
        const tbody = App.DOMElements.projectVendorListBody;
        if (!tbody) return;
        tbody.innerHTML = '';
    
        // --- START OF FIX ---
        // Defensively ensure `selectedVendors` is always an array.
        // This handles cases where the XML import might provide a single object for a single vendor,
        // or where the property is null or undefined.
        const selectedVendors = Array.isArray(selectedVendorsInput)
            ? selectedVendorsInput
            : (selectedVendorsInput ? [selectedVendorsInput] : []);
        // --- END OF FIX ---
    
        if (selectedVendors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No vendors selected for this project yet.</td></tr>';
            return;
        }
    
        selectedVendors.forEach((vendor, index) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${vendor.category || 'N/A'}</td>
                <td>${vendor.item || 'N/A'}</td>
                <td>${vendor.manufacturer || 'N/A'}</td>
                <td><button class="remove-vendor-btn danger-button small-btn" data-index="${index}">Remove</button></td>
            `;
        });
    }

    function renderMasterVendorSearch(searchTerm = '') {
        const tbody = App.DOMElements.vendorSearchResultsBody;
        if (!tbody || typeof VENDOR_LIST === 'undefined') return;
        
        const lowerCaseSearchTerm = searchTerm.trim().toLowerCase();
        
        if (lowerCaseSearchTerm.length < 2) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Type 2 or more characters...</td></tr>'; 
            return;
        }

        let htmlContent = ''; 
        let resultsFound = false;
        
        for (const category in VENDOR_LIST) {
            VENDOR_LIST[category].forEach(item => {
                item.manufacturers.forEach(manufacturer => {
                    const itemMatch = item.item.toLowerCase().includes(lowerCaseSearchTerm);
                    const manufacturerMatch = manufacturer.toLowerCase().includes(lowerCaseSearchTerm);
                    const categoryMatch = category.toLowerCase().includes(lowerCaseSearchTerm);

                    if (itemMatch || manufacturerMatch || categoryMatch) {
                        resultsFound = true;
                        // Use escapeXml or similar if vendor data can contain special characters, for now assuming it's safe.
                        htmlContent += `
                            <tr>
                                <td>${category}</td>
                                <td>${item.item}</td>
                                <td>${manufacturer}</td>
                                <td><button class="add-vendor-btn secondary-button small-btn" data-category="${category}" data-item="${item.item}" data-manufacturer="${manufacturer}">+ Add</button></td>
                            </tr>`;
                    }
                });
            });
        }
        
        tbody.innerHTML = resultsFound ? htmlContent : '<tr><td colspan="4" style="text-align: center;">No vendors found.</td></tr>';
    }

    return { init, populateTabData, getTabData };

})();