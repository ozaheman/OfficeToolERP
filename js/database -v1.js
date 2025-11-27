
const DB = (() => {
    let db;
    const DB_NAME = 'UrbanAxisDB';
    const DB_VERSION = 2; // Incremented version to ensure schema update

    const STORES = {
        PROJECTS: 'projects',
        FILES: 'files',
        FINANCIALS: 'financials',
        SITE_UPDATES: 'siteUpdates'
    };

    function init() {
        return new Promise((resolve, reject) => {
            console.log(`Opening database ${DB_NAME} version ${DB_VERSION}...`);
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("Database error:", event.target.error);
                reject(event.target.error);
            };

            request.onupgradeneeded = (event) => {
                console.log("Database upgrade needed.");
                db = event.target.result;
                if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
                    db.createObjectStore(STORES.PROJECTS, { keyPath: 'jobNo' });
                    console.log(`Object store '${STORES.PROJECTS}' created.`);
                }
                if (!db.objectStoreNames.contains(STORES.FILES)) {
                    const fileStore = db.createObjectStore(STORES.FILES, { keyPath: 'id', autoIncrement: true });
                    fileStore.createIndex('jobNo', 'jobNo', { unique: false });
                    fileStore.createIndex('jobNo_subCategory', ['jobNo', 'subCategory'], { unique: false });
                    console.log(`Object store '${STORES.FILES}' created.`);
                }
                if (!db.objectStoreNames.contains(STORES.FINANCIALS)) {
                    db.createObjectStore(STORES.FINANCIALS, { keyPath: 'id' });
                     console.log(`Object store '${STORES.FINANCIALS}' created.`);
                }
                if (!db.objectStoreNames.contains(STORES.SITE_UPDATES)) {
                    db.createObjectStore(STORES.SITE_UPDATES, { keyPath: 'jobNo' });
                    console.log(`Object store '${STORES.SITE_UPDATES}' created.`);
                }
            };

            request.onsuccess = async (event) => {
                db = event.target.result;
                console.log("Database initialized successfully.");
                try {
                    await seedFinancialData();
                    resolve();
                } catch (seedError) {
                    console.error("Error during data seeding:", seedError);
                    reject(seedError);
                }
            };
        });
    }

    async function seedFinancialData() {
        if (typeof FINANCIAL_DATA === 'undefined') {
            console.warn("financial_data.js not loaded. Cannot seed financial data.");
            return;
        }
        const tx = db.transaction(STORES.FINANCIALS, 'readwrite');
        const store = tx.objectStore(STORES.FINANCIALS);
        const countReq = store.count('INITIAL_COSTS');
        
        return new Promise((resolve) => {
            countReq.onsuccess = async () => {
                if (countReq.result === 0) {
                    console.log("Seeding financial data into the database...");
                    const putPromises = Object.keys(FINANCIAL_DATA).map(key => {
                        return new Promise((pResolve, pReject) => {
                           const req = tx.objectStore(STORES.FINANCIALS).put({ id: key, data: FINANCIAL_DATA[key] });
                           req.onsuccess = pResolve;
                           req.onerror = () => pReject(req.error);
                        });
                    });
                    await Promise.all(putPromises);
                    console.log("Financial data seeding complete.");
                }
                resolve();
            };
            tx.oncomplete = resolve;
            tx.onerror = () => resolve(); // Resolve even if tx fails, to not block app start
        });
    }

    function makeRequest(storeName, mode, action, data) {
        return new Promise((resolve, reject) => {
            if (!db) return reject("Database not initialized.");
            
            const transaction = db.transaction(storeName, mode);
            transaction.onerror = (event) => reject(`Transaction error on ${storeName}: ${event.target.error}`);

            const store = transaction.objectStore(storeName);
            const request = store[action](data);
            
            request.onerror = (event) => reject(`Request error on ${storeName}: ${event.target.error}`);
            request.onsuccess = (event) => resolve(event.target.result);
        });
    }

    // --- Public API ---
    return {
        init,
        getProject: (jobNo) => makeRequest(STORES.PROJECTS, 'readonly', 'get', jobNo),
        getAllProjects: () => makeRequest(STORES.PROJECTS, 'readonly', 'getAll'),
        putProject: (projectData) => makeRequest(STORES.PROJECTS, 'readwrite', 'put', projectData),

        getFinancialData: (id) => makeRequest(STORES.FINANCIALS, 'readonly', 'get', id),

        addFile: (fileData) => makeRequest(STORES.FILES, 'readwrite', 'add', fileData),
        deleteFile: (id) => makeRequest(STORES.FILES, 'readwrite', 'delete', id),
        getFilesByJobNo: (jobNo) => {
            return new Promise((resolve, reject) => {
                if (!db) return reject("Database not initialized.");
                const store = db.transaction(STORES.FILES).objectStore(STORES.FILES);
                const index = store.index('jobNo');
                const request = index.getAll(jobNo);
                request.onsuccess = (e) => resolve(e.target.result || []);
                request.onerror = (e) => reject(e.target.error);
            });
        },
        getFileBySubCategory: (jobNo, subCategory) => {
             return new Promise((resolve, reject) => {
                if (!db) return reject("Database not initialized.");
                const store = db.transaction(STORES.FILES).objectStore(STORES.FILES);
                const index = store.index('jobNo_subCategory');
                const request = index.get([jobNo, subCategory]);
                request.onsuccess = (e) => resolve(e.target.result || null);
                request.onerror = (e) => reject(e.target.error);
            });
        },

        getSiteUpdate: (jobNo) => makeRequest(STORES.SITE_UPDATES, 'readonly', 'get', jobNo),
        getAllSiteUpdates: () => makeRequest(STORES.SITE_UPDATES, 'readonly', 'getAll'),
        putSiteUpdate: (updateData) => makeRequest(STORES.SITE_UPDATES, 'readwrite', 'put', updateData)
    };
})();
