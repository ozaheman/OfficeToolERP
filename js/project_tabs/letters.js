
App.ProjectTabs.Letters = (() => {


function init() {
    const container = document.getElementById('project-letters-tab');
    if (!container) return;
    let authorityOptions = Object.keys(CONTENT.AUTHORITY_DETAILS).map(key => `<option value="${key}">${key}</option>`).join('');
    container.innerHTML = `
        <h3>Generate Project Letter</h3>
        <div class="input-group">
            <label for="project-letter-type">Letter Type</label>
            <select id="project-letter-type"><option value="">-- Select --</option><option value="scopeOfWork">Scope of Work Letter</option><option value="consultantAppointment">Consultant Appointment Letter</option></select>
        </div>
        <div class="input-group">
            <label for="project-letter-authority">To Authority</label>
            <select id="project-letter-authority"><option value="">-- Select --</option>${authorityOptions}</select>
        </div>
        <div id="project-letter-dynamic-fields"></div>
        <button id="generate-project-letter-btn" class="primary-button" style="width:100%; margin-top:15px;">Generate Preview</button>
    `;
    Object.assign(App.DOMElements, {
        projectLetterType: document.getElementById('project-letter-type'),
        projectLetterAuthority: document.getElementById('project-letter-authority'),
        projectLetterDynamicFields: document.getElementById('project-letter-dynamic-fields')
    });
    setupEventListeners();
}

function setupEventListeners() {
    App.DOMElements.projectLetterType?.addEventListener('change', updateProjectLetterUI);
    document.getElementById('project-letters-tab')?.addEventListener('click', (e) => {
        if (e.target.matches('#generate-project-letter-btn')) {
            App.DOMElements.previewTabs.querySelector('[data-tab="project-letter"]').click();
        }
    });
}

function updateProjectLetterUI() {
    const letterType = App.DOMElements.projectLetterType.value;
    const dynamicFieldsContainer = App.DOMElements.projectLetterDynamicFields;
    if (letterType === 'scopeOfWork') {
        dynamicFieldsContainer.innerHTML = `<div class="input-group"><label for="letter-scope-items">Scope of Work Items (one per line)</label><textarea id="letter-scope-items" rows="5" placeholder="1. Extension of ground floors\n2. Extension of first floor"></textarea></div>`;
    } else {
        dynamicFieldsContainer.innerHTML = '';
    }
}

async function renderPreview(projectData) {
    const letterType = App.DOMElements.projectLetterType.value;
    const authorityKey = App.DOMElements.projectLetterAuthority.value;
    if (!letterType || !authorityKey) {
        return '<p style="text-align:center;">Please select a letter type and an authority.</p>';
    }
    let details = { authority: authorityKey };
    if (letterType === 'scopeOfWork') {
        const scopeItemsTextarea = document.getElementById('letter-scope-items');
        details.scopeItems = scopeItemsTextarea ? scopeItemsTextarea.value.split('\n').filter(line => line.trim() !== '') : [];
    }
    const templateFunction = PROJECT_LETTER_TEMPLATES[letterType];
    return templateFunction ? templateFunction({ projectData, details }) : '<p style="text-align:center;">Template not found.</p>';
}

return { init, renderPreview };

})();
