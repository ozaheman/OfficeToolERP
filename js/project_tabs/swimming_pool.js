App.ProjectTabs.SwimmingPool = (() => {

function init() {
    const container = document.getElementById('swimming-pool-tab');
    if (!container) return;
    container.innerHTML = `
        <h3>Swimming Pool Details</h3>
        <div class="input-group-grid">
            <div class="input-group">
                <label for="poolType">Pool Type</label>
                <select id="poolType">
                    <option value="skimmer">Skimmer</option>
                    <option value="overflow">Overflow</option>
                    <option value="infinity">Infinity Edge</option>
                </select>
            </div>
            <div class="input-group">
                <label for="poolShape">Shape</label>
                <input type="text" id="poolShape" value="Rectangular">
            </div>
        </div>
        <div class="input-group-grid">
            <div class="input-group"><label for="poolLength">Length (m)</label><input type="number" id="poolLength" value="8"></div>
            <div class="input-group"><label for="poolWidth">Width (m)</label><input type="number" id="poolWidth" value="4"></div>
            <div class="input-group"><label for="poolDepth">Depth (m)</label><input type="number" id="poolDepth" value="1.5" step="0.1"></div>
        </div>
        <hr>
        <h3>Finishes & Features</h3>
        <div class="input-group">
            <label for="poolFinishMaterial">Finish Material</label>
            <input type="text" id="poolFinishMaterial" placeholder="e.g., Ceramic Tiles, Plaster, PebbleTec">
        </div>
        <div class="input-group">
            <label for="poolCopingMaterial">Coping Material</label>
            <input type="text" id="poolCopingMaterial" placeholder="e.g., Marble, Granite, Travertine">
        </div>
        <div class="input-group">
            <label for="poolLighting">Lighting System</label>
            <input type="text" id="poolLighting" value="LED Underwater Lights">
        </div>
        <hr>
        <h3>MEP Systems</h3>
        <div class="input-group">
            <label for="poolFiltrationSystem">Filtration System</label>
            <input type="text" id="poolFiltrationSystem" value="Sand Filter">
        </div>
        <div class="input-group">
            <label for="poolPumpDetails">Pump Details</label>
            <input type="text" id="poolPumpDetails" placeholder="e.g., 1.5 HP Variable Speed Pump">
        </div>
        <div class="input-group">
            <label for="poolSanitization">Sanitization Method</label>
            <select id="poolSanitization">
                <option value="chlorine">Chlorine</option>
                <option value="saltwater">Saltwater Chlorine Generator</option>
                <option value="ozone">Ozone</option>
            </select>
        </div>
         <div class="input-group">
            <label for="poolHeating">Heating System</label>
            <input type="text" id="poolHeating" value="Electric Heat Pump">
        </div>
    `;

    // Cache elements
    const fields = ['poolType', 'poolShape', 'poolLength', 'poolWidth', 'poolDepth', 'poolFinishMaterial', 'poolCopingMaterial', 'poolLighting', 'poolFiltrationSystem', 'poolPumpDetails', 'poolSanitization', 'poolHeating'];
    fields.forEach(id => {
        App.DOMElements[id] = document.getElementById(id);
    });
}

function populateTabData(project) {
    const data = project.swimmingPool || {};
    const fields = ['poolType', 'poolShape', 'poolLength', 'poolWidth', 'poolDepth', 'poolFinishMaterial', 'poolCopingMaterial', 'poolLighting', 'poolFiltrationSystem', 'poolPumpDetails', 'poolSanitization', 'poolHeating'];
    
    fields.forEach(id => {
        if (App.DOMElements[id]) {
            App.DOMElements[id].value = data[id] || App.DOMElements[id].defaultValue || '';
        }
    });
}

function getTabData() {
    const data = { swimmingPool: {} };
    const fields = ['poolType', 'poolShape', 'poolLength', 'poolWidth', 'poolDepth', 'poolFinishMaterial', 'poolCopingMaterial', 'poolLighting', 'poolFiltrationSystem', 'poolPumpDetails', 'poolSanitization', 'poolHeating'];

    fields.forEach(id => {
        if (App.DOMElements[id]) {
            data.swimmingPool[id] = App.DOMElements[id].value;
        }
    });
    
    return data;
}


return { init, populateTabData, getTabData };

})();