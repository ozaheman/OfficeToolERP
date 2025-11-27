App.ProjectTabs.Main = (() => {

function init() {
    const container = document.getElementById('main-tab');
    if (!container) return;
    container.innerHTML = `
        <h3>Project Info</h3>
        <div class="input-group-grid">
            <div class="input-group"><label for="jobNo">Project ID / Job No.</label><input type="text" id="jobNo"></div>
            <div class="input-group"><label for="agreementDate">Agreement Date</label><input type="date" id="agreementDate"></div>
        </div>
        <div class="input-group"><label for="projectStatus">Project Status</label><select id="projectStatus"><option>Pending</option><option>In Progress</option><option>Under Supervision</option><option>On Hold</option><option>Completed</option></select></div>
        <div class="input-group" id="supervisionStartDateGroup" style="display: none;">
            <label for="supervisionStartDate">Supervision Start Date</label>
            <input type="date" id="supervisionStartDate">
        </div>
        <h3>Client Details</h3>
        <div class="input-group"><label for="clientName">Client's Name</label><input type="text" id="clientName"></div>
        <div class="input-group-grid">
            <div class="input-group"><label for="clientMobile">Mobile No.</label><input type="text" id="clientMobile"></div>
            <div class="input-group"><label for="clientEmail">Email Address</label><input type="email" id="clientEmail"></div>
        </div>
        <div class="input-group-grid">
            <div class="input-group"><label for="clientPOBox">Client P.O. Box</label><input type="text" id="clientPOBox"></div>
            <div class="input-group"><label for="clientTrn">Client TRN</label><input type="text" id="clientTrn"></div>
        </div>
        <h3>Project Details</h3>
        <div class="input-group" id="scope-of-work-container">
            <label>Scope of Work</label>
            <div class="checkbox-group" id="scope-of-work-checkboxes"></div>
            <div id="otherScopeTypeContainer" class="other-input-container" style="display:none; margin-left: 20px;">
                <input type="text" id="otherScopeType" placeholder="Specify Other Scope">
            </div>
        </div>
        <div class="input-group"><label for="authority">Authority</label><select id="authority"><option value="">-- Select --</option><option>DM</option><option>DDA</option><option>Trakhees</option><option>Dubai South</option><option>DCCM</option><option>JAFZA</option><option>Other</option></select><div id="otherAuthorityContainer" class="other-input-container"><input type="text" id="otherAuthority" placeholder="Specify Authority"></div></div>
        <div class="input-group"><label for="projectType">Project Type</label><select id="projectType"><option value="">-- Select --</option><option>Residential Building</option><option>Commercial Building</option><option>Villa</option><option>Warehouse</option><option>Other</option></select></div>
        <div class="input-group"><label for="projectDescription">Project Description</label><textarea id="projectDescription" rows="2"></textarea></div>
        <div class="input-group-grid">
            <div class="input-group"><label for="plotNo">Plot No.</label><input type="text" id="plotNo"></div>
            <div class="input-group"><label for="area">Area</label><input type="text" id="area"></div>
        </div>
        <div class="input-group"><label for="builtUpArea">Built-up Area (sq ft)</label><input type="number" id="builtUpArea" value="10000"></div>
    `;

    // Populate Scope of Work checkboxes
    const scopeCheckboxContainer = document.getElementById('scope-of-work-checkboxes');
    if (CONTENT && CONTENT.SCOPE_OF_WORK_DETAILS) {
        for (const key in CONTENT.SCOPE_OF_WORK_DETAILS) {
            const scope = CONTENT.SCOPE_OF_WORK_DETAILS[key];
            scopeCheckboxContainer.innerHTML += `<label><input type="checkbox" name="scopeOfWorkType" value="${key}"> ${key}</label>`;
        }
    }
    scopeCheckboxContainer.innerHTML += `<label><input type="checkbox" name="scopeOfWorkType" value="Other"> Other</label>`;
    
    // Add event listener for "Other" scope checkbox
    const otherScopeCheckbox = scopeCheckboxContainer.querySelector('input[value="Other"]');
    const otherScopeInputContainer = document.getElementById('otherScopeTypeContainer');
    otherScopeCheckbox.addEventListener('change', () => {
        otherScopeInputContainer.style.display = otherScopeCheckbox.checked ? 'block' : 'none';
    });

    // Cache elements after they are created
    Object.assign(App.DOMElements, {
        jobNo: document.getElementById('jobNo'),
        agreementDate: document.getElementById('agreementDate'),
        projectStatus: document.getElementById('projectStatus'),
        supervisionStartDate: document.getElementById('supervisionStartDate'),
        supervisionStartDateGroup: document.getElementById('supervisionStartDateGroup'),
        clientName: document.getElementById('clientName'),
        clientMobile: document.getElementById('clientMobile'),
        clientEmail: document.getElementById('clientEmail'),
        clientPOBox: document.getElementById('clientPOBox'),
        clientTrn: document.getElementById('clientTrn'),
        otherScopeType: document.getElementById('otherScopeType'),
        authority: document.getElementById('authority'),
        otherAuthority: document.getElementById('otherAuthority'),
        projectType: document.getElementById('projectType'),
        projectDescription: document.getElementById('projectDescription'),
        plotNo: document.getElementById('plotNo'),
        area: document.getElementById('area'),
        builtUpArea: document.getElementById('builtUpArea')
    });
    
    // Add listener to show/hide supervision date
    App.DOMElements.projectStatus.addEventListener('change', (e) => {
        App.DOMElements.supervisionStartDateGroup.style.display = (e.target.value === 'Under Supervision') ? 'block' : 'none';
    });

    // --- MODIFICATION START: Add listeners for new features ---
    scopeCheckboxContainer.addEventListener('change', handleMainScopeChange);
    App.DOMElements.otherScopeType.addEventListener('input', handleMainScopeChange);

    App.DOMElements.area.addEventListener('input', (e) => {
        const areaValue = e.target.value.toLowerCase();
        let matchedAuthority = null;
        for (const key in CONTENT.AUTHORITY_MAPPING) {
            if (areaValue.includes(key)) {
                matchedAuthority = CONTENT.AUTHORITY_MAPPING[key];
                break;
            }
        }
        if (matchedAuthority) {
            App.setSelectOrOther(App.DOMElements.authority, App.DOMElements.otherAuthority, matchedAuthority);
        }
        // Refresh dynamic texts in scope tab
        if (App.ProjectTabs.Scope && App.ProjectTabs.Scope.refreshDynamicTexts) {
            App.ProjectTabs.Scope.refreshDynamicTexts();
        }
    });
    // --- MODIFICATION END ---
}

// --- MODIFICATION START: New handler for scope linking ---
function handleMainScopeChange() {
    if (!App.ProjectTabs.Scope || !App.ProjectTabs.Scope.syncScopeSections) return;
    
    const activeSections = new Set();
    const allMainScopeCheckboxes = document.querySelectorAll('input[name="scopeOfWorkType"]:checked');
    
    allMainScopeCheckboxes.forEach(cb => {
        let scopeKey = cb.value;
        if (scopeKey === 'Other') {
            const otherValue = App.DOMElements.otherScopeType.value.trim();
            // A simple check if the "Other" text matches a key, for consistency
            if (CONTENT.SCOPE_OF_WORK_DETAILS[otherValue]) {
                scopeKey = otherValue;
            }
        }

        const scopeDetails = CONTENT.SCOPE_OF_WORK_DETAILS[scopeKey];
        if (scopeDetails && scopeDetails.scopeSections) {
            scopeDetails.scopeSections.forEach(sectionId => activeSections.add(String(sectionId)));
        }
    });
    
    App.ProjectTabs.Scope.syncScopeSections(activeSections);
}
// --- MODIFICATION END ---

function populateTabData(project) {
    const stringFields = ['jobNo', 'agreementDate', 'projectStatus', 'supervisionStartDate', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn', 'projectDescription', 'plotNo', 'area', 'projectType'];
    stringFields.forEach(id => { if (App.DOMElements[id]) App.DOMElements[id].value = project[id] || ''; });
    if(App.DOMElements.builtUpArea) App.DOMElements.builtUpArea.value = project.builtUpArea || 0;
    
    // Handle Scope of Work checkboxes
    const scopeCheckboxes = document.querySelectorAll('input[name="scopeOfWorkType"]');
    const projectScopes = project.scopeOfWorkTypes || {};
    const definedBriefs = (CONTENT && CONTENT.SCOPE_OF_WORK_DETAILS) 
        ? Object.keys(CONTENT.SCOPE_OF_WORK_DETAILS)
        : [];

    scopeCheckboxes.forEach(cb => {
        cb.checked = projectScopes[cb.value] || false;
    });

    // Handle "Other" scope
    const otherScopeKey = Object.keys(projectScopes).find(key => !definedBriefs.includes(key) && key !== 'Other');
    const otherCheckbox = document.querySelector('input[value="Other"]');
    if (otherScopeKey && projectScopes[otherScopeKey]) {
        otherCheckbox.checked = true;
        App.DOMElements.otherScopeType.value = otherScopeKey;
        document.getElementById('otherScopeTypeContainer').style.display = 'block';
    } else {
        App.DOMElements.otherScopeType.value = '';
        document.getElementById('otherScopeTypeContainer').style.display = otherCheckbox.checked ? 'block' : 'none';
    }

    App.setSelectOrOther(App.DOMElements.authority, App.DOMElements.otherAuthority, project.authority, project.otherAuthority);

    // Show/hide supervision start date based on initial status
    App.DOMElements.supervisionStartDateGroup.style.display = (project.projectStatus === 'Under Supervision') ? 'block' : 'none';

    // MODIFICATION: Trigger scope sync after populating
    handleMainScopeChange();
}

function getTabData() {
    const data = {};
    const stringFields = ['jobNo', 'agreementDate', 'projectStatus', 'supervisionStartDate', 'clientName', 'clientMobile', 'clientEmail', 'clientPOBox', 'clientTrn', 'projectDescription', 'plotNo', 'area', 'projectType'];
    stringFields.forEach(id => data[id] = App.DOMElements[id]?.value);
    data.builtUpArea = parseFloat(App.DOMElements.builtUpArea?.value) || 0;

    // Handle Scope of Work checkboxes
    data.scopeOfWorkTypes = {};
    const scopeCheckboxes = document.querySelectorAll('input[name="scopeOfWorkType"]:checked');
    scopeCheckboxes.forEach(cb => {
        if (cb.value === 'Other') {
            const otherValue = App.DOMElements.otherScopeType.value.trim();
            if (otherValue) {
                data.scopeOfWorkTypes[otherValue] = true;
            }
        } else {
            data.scopeOfWorkTypes[cb.value] = true;
        }
    });

    data.authority = App.DOMElements.authority?.value === 'Other' ? App.DOMElements.otherAuthority.value : App.DOMElements.authority.value;
    
    return data;
}

return { init, populateTabData, getTabData };

})();