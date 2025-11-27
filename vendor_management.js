document.addEventListener('DOMContentLoaded', () => {

    const DOMElements = {};

    function main() {
        cacheDOMElements();
        setupEventListeners();
        populateCategoryFilter();
        renderVendorTable(); // Initial render of all vendors
    }

    function cacheDOMElements() {
        // MODIFICATION: Cache new elements
        DOMElements.categoryFilter = document.getElementById('category-filter');
        DOMElements.keywordSearchBox = document.getElementById('keyword-search-box');
        DOMElements.tableBody = document.getElementById('vendor-table-body');
    }

    function setupEventListeners() {
        // MODIFICATION: Add listeners to both filter inputs
        DOMElements.keywordSearchBox.addEventListener('input', renderVendorTable);
        DOMElements.categoryFilter.addEventListener('change', renderVendorTable);
    }

    // NEW FUNCTION: Populates the category dropdown from the VENDOR_LIST data
    function populateCategoryFilter() {
        if (typeof VENDOR_LIST === 'undefined') return;
        
        const categories = Object.keys(VENDOR_LIST).sort();
        const selectElement = DOMElements.categoryFilter;

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            selectElement.appendChild(option);
        });
    }

    // MODIFICATION: Updated to handle multiple filters
    function renderVendorTable() {
        const tbody = DOMElements.tableBody;
        if (!tbody || typeof VENDOR_LIST === 'undefined') {
            console.error('Table body or VENDOR_LIST not found.');
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: red;">Error: Vendor data could not be loaded.</td></tr>';
            return;
        }

        // Get current values from both filters
        const selectedCategory = DOMElements.categoryFilter.value;
        const keyword = DOMElements.keywordSearchBox.value.trim().toLowerCase();

        tbody.innerHTML = '';
        let resultsFound = false;
        let htmlContent = '';

        for (const category in VENDOR_LIST) {
            // 1. Apply Category Filter
            if (selectedCategory && category !== selectedCategory) {
                continue; // Skip this category if it's not the one selected
            }

            const items = VENDOR_LIST[category];

            items.forEach(item => {
                // 2. Apply Keyword Filter
                const itemDescriptionMatches = item.item.toLowerCase().includes(keyword);
                const manufacturerMatches = item.manufacturers.some(m => m.toLowerCase().includes(keyword));

                // Only proceed if there's no keyword, or if the keyword is found
                if (keyword === '' || itemDescriptionMatches || manufacturerMatches) {
                    resultsFound = true;
                    const manufacturersList = item.manufacturers.join('<br>');
                    
                    htmlContent += `
                        <tr>
                            <td>${category}</td>
                            <td>${item.item}</td>
                            <td>${manufacturersList}</td>
                        </tr>
                    `;
                }
            });
        }

        if (!resultsFound) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">No vendors found matching your criteria.</td></tr>';
        } else {
            tbody.innerHTML = htmlContent;
        }
    }

    main();
});