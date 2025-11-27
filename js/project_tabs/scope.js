App.ProjectTabs.Scope = (() => {

function init() {
    const container = document.getElementById('scope-tab');
    if (!container) return;

    // Build the dynamic UI for the scope tab
    container.innerHTML = `
        <div class="scope-controls">
            <label>View Mode:</label>
            <button id="scope-view-brief" class="secondary-button active">Brief</button>
            <button id="scope-view-detailed" class="secondary-button">Detailed</button>
            <label style="margin-left: 20px;">Supervision Visits:</label>
            <input type="number" id="scope-supervision-visits" value="4" style="width: 60px;">
            <label style="margin-left: 10px;">Extra Fee (AED):</label>
            <input type="number" id="scope-additional-fee" value="1000" style="width: 80px;">
        </div>
        <div id="scope-selection-container"></div>
        
        <div class="document-category">
            <h4>Brief Proposal Terms & Conditions</h4>
            <p>Select which terms to include in the Brief Proposal document.</p>
            <div id="brief-terms-container" class="checkbox-group"></div>
        </div>
    `;
    
    const scopeContainer = document.getElementById('scope-selection-container');
    // MODIFICATION: Add new section titles
    const sectionTitles = { '1': '1. Study and Design Stage', '2': '2. Preliminary Design Stage', '3': '3. Final Stage', '7': '7. Interior Design Stage', '4': '4. Tender Documents Stage', '5': '5. Supervision Works', '6': "6. Consultant's Duties", '12': '12. BIM Services', '13': '13. BIM - Level of Detail (LOD)', '14': '14. Structural Review & Assessment', '8': '8. Principles of Calculation', '9': "9. The Owner's Obligations", '10': '10. Amendments', '11': '11. Extension of Completion' };
    
    for (const sectionId in sectionTitles) {
        if (!CONTENT.SCOPE_DEFINITIONS[sectionId]) continue;

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'scope-section document-category';
        
        const sectionHeader = document.createElement('h4');
        sectionHeader.textContent = sectionTitles[sectionId];
        sectionDiv.appendChild(sectionHeader);

        const groupDiv = document.createElement('div');
        groupDiv.className = 'scope-item-group';

        CONTENT.SCOPE_DEFINITIONS[sectionId].forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'scope-item';
            
            itemDiv.innerHTML = `
                <div class="scope-item-header">
                    <label>
                        <input type="checkbox" id="scope-${item.id}" data-section-id="${sectionId}" data-item-id="${item.id}">
                        <strong class="brief">${getFormattedText(item.brief)}</strong>
                        <div class="detailed">${getFormattedText(item.detailed)}</div>
                    </label>
                </div>
            `;
            
            if (item.id === '3.2' && CONTENT.SCOPE_DEFINITIONS['3.2']) {
                const subGroupDiv = document.createElement('div');
                subGroupDiv.className = 'checkbox-group nested-group';
                CONTENT.SCOPE_DEFINITIONS['3.2'].forEach(subItem => {
                    subGroupDiv.innerHTML += `<label><input type="checkbox" id="scope-${subItem.id}" data-section-id="3.2" data-item-id="${subItem.id}"><span>${subItem.brief}</span></label>`;
                });
                itemDiv.appendChild(subGroupDiv);
            }
              // MODIFICATION: Add support for new structural review sub-items
            if (item.id === '14.1' && CONTENT.SCOPE_DEFINITIONS['14.1']) {
                const subGroupDiv = document.createElement('div');
                subGroupDiv.className = 'checkbox-group nested-group';
                CONTENT.SCOPE_DEFINITIONS['14.1'].forEach(subItem => {
                    subGroupDiv.innerHTML += `<label><input type="checkbox" id="scope-${subItem.id}" data-section-id="14.1" data-item-id="${subItem.id}"><span>${subItem.brief}</span></label>`;
                });
                itemDiv.appendChild(subGroupDiv);
            }
            groupDiv.appendChild(itemDiv);
        });

        sectionDiv.appendChild(groupDiv);
        
        sectionDiv.innerHTML += `
            <div class="input-group" style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px;">
                <label for="additional-scope-${sectionId}">Additional Scope for this Section:</label>
                <textarea id="additional-scope-${sectionId}" rows="2" placeholder="Enter any custom scope items..."></textarea>
            </div>
        `;

        scopeContainer.appendChild(sectionDiv);
    }

    const briefTermsContainer = document.getElementById('brief-terms-container');
    if (CONTENT.BRIEF_PROPOSAL_TERMS) {
        CONTENT.BRIEF_PROPOSAL_TERMS.forEach(term => {
            briefTermsContainer.innerHTML += `<label><input type="checkbox" name="briefTerm" value="${term.id}"> ${term.text}</label>`;
        });
    }
    
    setupEventListeners();
    toggleViewMode('brief'); // Set initial view
}
//... rest of the file is unchanged

function getFormattedText(templateString = '') {
    const visits = document.getElementById('scope-supervision-visits')?.value || '4';
    const fee = document.getElementById('scope-additional-fee')?.value || '1000';
    const area = App.DOMElements.area?.value.toLowerCase() || 'dubai';
    
    let authoritySet = CONTENT.AREA_AUTHORITY_NAMES.default;
    for (const key in CONTENT.AREA_AUTHORITY_NAMES) {
        if (area.includes(key)) {
            authoritySet = CONTENT.AREA_AUTHORITY_NAMES[key];
            break;
        }
    }

    return templateString
        .replace(/{supervisionVisits}/g, visits)
        .replace(/{additionalSupervisionFee}/g, fee)
        .replace(/{main_authority_short}/g, authoritySet.main_authority_short)
        .replace(/{main_authority_long}/g, authoritySet.main_authority_long)
        .replace(/{civil_defense}/g, authoritySet.civil_defense)
        .replace(/{electricity_water}/g, authoritySet.electricity_water);
}

function refreshDynamicTexts() {
    document.querySelectorAll('.scope-item .brief, .scope-item .detailed').forEach(el => {
        const checkbox = el.closest('label').querySelector('input[type="checkbox"]');
        if (!checkbox) return;
        
        const sectionId = checkbox.dataset.sectionId;
        const itemId = checkbox.dataset.itemId;
        const definition = CONTENT.SCOPE_DEFINITIONS[sectionId]?.find(i => i.id === itemId);
        
        if (definition) {
            if (el.classList.contains('brief')) {
                el.innerHTML = getFormattedText(definition.brief);
            } else {
                el.innerHTML = getFormattedText(definition.detailed);
            }
        }
    });
}

function toggleViewMode(mode) {
    document.getElementById('scope-view-brief').classList.toggle('active', mode === 'brief');
    document.getElementById('scope-view-detailed').classList.toggle('active', mode === 'detailed');
    document.querySelectorAll('.scope-item .brief').forEach(el => el.style.display = (mode === 'brief') ? 'inline' : 'none');
    document.querySelectorAll('.scope-item .detailed').forEach(el => el.style.display = (mode === 'detailed') ? 'block' : 'none');
}

function setupEventListeners() {
    const container = document.getElementById('scope-tab');

    document.getElementById('scope-view-brief').addEventListener('click', () => toggleViewMode('brief'));
    document.getElementById('scope-view-detailed').addEventListener('click', () => toggleViewMode('detailed'));

    document.getElementById('scope-supervision-visits').addEventListener('input', refreshDynamicTexts);
    document.getElementById('scope-additional-fee').addEventListener('input', refreshDynamicTexts);

    container.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) {
            const itemDiv = e.target.closest('.scope-item');
            if (itemDiv) {
                itemDiv.classList.toggle('selected', e.target.checked);
            }
        }
    });
}

function populateTabData(project) {
    document.querySelectorAll('#scope-selection-container input[type="checkbox"]').forEach(cb => {
        const sectionId = cb.dataset.sectionId;
        const itemId = cb.dataset.itemId;
        cb.checked = project.scope?.[sectionId]?.[itemId] || false;
        
        const itemDiv = cb.closest('.scope-item');
        if (itemDiv) itemDiv.classList.toggle('selected', cb.checked);
    });

    for (const sectionId in (project.scope || {})) {
        if (project.scope[sectionId]?.additional) {
            const textarea = document.getElementById(`additional-scope-${sectionId}`);
            if (textarea) textarea.value = project.scope[sectionId].additional;
        }
    }
    
    document.getElementById('scope-supervision-visits').value = project.scope?.supervisionVisits || 4;
    document.getElementById('scope-additional-fee').value = project.scope?.additionalSupervisionFee || 1000;
    
    // MODIFICATION: Populate the brief terms checkboxes
    const briefTerms = project.briefTerms || {};
    document.querySelectorAll('input[name="briefTerm"]').forEach(cb => {
        cb.checked = briefTerms[cb.value] !== undefined ? briefTerms[cb.value] : true; // Default to checked if not defined
    });
    
    refreshDynamicTexts();
}

function getTabData() {
    const data = { scope: {}, briefTerms: {} };
    
    document.querySelectorAll('#scope-selection-container input[type="checkbox"]').forEach(cb => {
        const sectionId = cb.dataset.sectionId;
        if (!data.scope[sectionId]) data.scope[sectionId] = {};
        data.scope[sectionId][cb.dataset.itemId] = cb.checked;
    });

    document.querySelectorAll('#scope-selection-container textarea').forEach(textarea => {
        const sectionId = textarea.id.replace('additional-scope-', '');
        if (textarea.value.trim()) {
            if (!data.scope[sectionId]) data.scope[sectionId] = {};
            data.scope[sectionId].additional = textarea.value.trim();
        }
    });
    
    data.scope.supervisionVisits = document.getElementById('scope-supervision-visits').value;
    data.scope.additionalSupervisionFee = document.getElementById('scope-additional-fee').value;

    // MODIFICATION: Get data from brief terms checkboxes
    document.querySelectorAll('input[name="briefTerm"]').forEach(cb => {
        data.briefTerms[cb.value] = cb.checked;
    });

    return data;
}

// MODIFICATION: New function to sync scope sections from Main tab
function syncScopeSections(activeSectionIds) {
    document.querySelectorAll('#scope-selection-container .scope-item input[type="checkbox"]').forEach(cb => {
        const sectionId = cb.dataset.sectionId;
        const shouldBeChecked = activeSectionIds.has(sectionId);
        cb.checked = shouldBeChecked;
        
        const itemDiv = cb.closest('.scope-item');
        if (itemDiv) itemDiv.classList.toggle('selected', cb.checked);
    });
}

return { init, populateTabData, getTabData, syncScopeSections, refreshDynamicTexts };

})();