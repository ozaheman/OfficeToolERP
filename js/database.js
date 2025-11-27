/**
 * @module DB
 * A self-contained module for all IndexedDB operations, refactored for clarity and modern practices.
 */
const DB = (() => {
    let db;
    const DB_NAME = 'UrbanAxisUnifiedDB';
    const DB_VERSION = 7; // Increment version for any schema changes

    const STORES = {
        PROJECTS: 'projects',
        SITE_DATA: 'siteData',
        FILES: 'files',
        HR_DATA: 'hrData',
        OFFICE_EXPENSES: 'officeExpenses',
        FINANCIAL_TEMPLATES: 'financialTemplates',
        HOLIDAYS: 'holidays',
        STAFF_LEAVES: 'staffLeaves', // MODIFICATION:
        DESIGN_SCRUM: 'designScrum',
        BULLETIN: 'bulletin'
    };

    /**
     * Initializes the database connection and creates/updates the object stores.
     */
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

                const createStore = (name, options, indices = []) => {
                    if (!db.objectStoreNames.contains(name)) {
                        const store = db.createObjectStore(name, options);
                        indices.forEach(index => {
                            store.createIndex(index.name, index.keyPath, { unique: index.unique });
                        });
                    }
                };

                createStore(STORES.PROJECTS, { keyPath: 'jobNo' });
                createStore(STORES.SITE_DATA, { keyPath: 'jobNo' });
                createStore(STORES.FILES, { keyPath: 'id', autoIncrement: true }, [
                    { name: 'jobNo_source', keyPath: ['jobNo', 'source'], unique: false },
                    { name: 'jobNo_subCategory', keyPath: ['jobNo', 'subCategory'], unique: false }
                ]);
                createStore(STORES.HR_DATA, { keyPath: 'id', autoIncrement: true });
                createStore(STORES.STAFF_LEAVES, { keyPath: 'id', autoIncrement: true });
                createStore(STORES.OFFICE_EXPENSES, { keyPath: 'id', autoIncrement: true });
                createStore(STORES.FINANCIAL_TEMPLATES, { keyPath: 'id' });
                createStore(STORES.HOLIDAYS, { keyPath: 'id', autoIncrement: true }, [
                    { name: 'by_country_year', keyPath: ['countryCode', 'year'], unique: false }
                ]);
                createStore(STORES.DESIGN_SCRUM, { keyPath: 'jobNo' });
                createStore(STORES.BULLETIN, { keyPath: 'id', autoIncrement: true });
            };

            request.onsuccess = async (event) => {
                db = event.target.result;
                console.log("Database initialized successfully.");
                if (typeof FINANCIAL_DATA !== 'undefined') {
                    await seedFinancialTemplates();
                }
                resolve();
            };
        });
    }

    /**
     * Seeds financial templates if they don't exist in the database.
     */
    async function seedFinancialTemplates() {
        const tx = db.transaction(STORES.FINANCIAL_TEMPLATES, 'readonly');
        const store = tx.objectStore(STORES.FINANCIAL_TEMPLATES);
        const countReq = store.count();

        const count = await new Promise(resolve => {
            countReq.onsuccess = () => resolve(countReq.result);
        });

        if (count === 0) {
            console.log("Seeding financial templates...");
            const writeTx = db.transaction(STORES.FINANCIAL_TEMPLATES, 'readwrite');
            const writeStore = writeTx.objectStore(STORES.FINANCIAL_TEMPLATES);
            for (const key in FINANCIAL_DATA) {
                writeStore.put({ id: key, data: FINANCIAL_DATA[key] });
            }
            return new Promise(resolve => writeTx.oncomplete = resolve);
        }
    }

    /**
     * Generic function to perform a single database request.
     * @param {string} storeName - The name of the object store.
     * @param {IDBTransactionMode} mode - 'readonly' or 'readwrite'.
     * @param {(store: IDBObjectStore) => IDBRequest} action - A function that takes a store and returns a request.
     */
    function makeRequest(storeName, mode, action) {
        return new Promise((resolve, reject) => {
            if (!db) return reject("Database not initialized.");
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            const request = action(store);
            
            request.onerror = (event) => reject(`Request error on ${storeName}: ${event.target.error.name}`);
            request.onsuccess = (event) => resolve(event.target.result);
        });
    }

    // --- Public API ---
    const publicAPI = {
        init,
        
        // --- Generic CRUD Methods ---
        get: (storeName, key) => makeRequest(storeName, 'readonly', store => store.get(key)),
        getAll: (storeName) => makeRequest(storeName, 'readonly', store => store.getAll()),
        put: (storeName, data) => makeRequest(storeName, 'readwrite', store => store.put(data)),
        add: (storeName, data) => makeRequest(storeName, 'readwrite', store => store.add(data)),
        delete: (storeName, key) => makeRequest(storeName, 'readwrite', store => store.delete(key)),
        clear: (storeName) => makeRequest(storeName, 'readwrite', store => store.clear()),

        // --- Project Methods ---
        getProject: (jobNo) => publicAPI.get(STORES.PROJECTS, jobNo),
        getAllProjects: () => publicAPI.getAll(STORES.PROJECTS),
        putProject: (projectData) => publicAPI.put(STORES.PROJECTS, projectData),
        
        // --- Site Data Methods ---
        getSiteData: (jobNo) => publicAPI.get(STORES.SITE_DATA, jobNo),
        getAllSiteData: () => publicAPI.getAll(STORES.SITE_DATA),
        putSiteData: (data) => publicAPI.put(STORES.SITE_DATA, data),

        // --- HR & Expense Methods ---
        getAllHRData: () => publicAPI.getAll(STORES.HR_DATA),
        addHRData: (data) => publicAPI.add(STORES.HR_DATA, data),
        putHRData: (data) => publicAPI.put(STORES.HR_DATA, data),
        deleteHRData: (id) => publicAPI.delete(STORES.HR_DATA, id),
        getOfficeExpenses: () => publicAPI.getAll(STORES.OFFICE_EXPENSES),
        addOfficeExpense: (data) => publicAPI.add(STORES.OFFICE_EXPENSES, data),

        // --- Financial Template Methods ---
        getFinancialTemplate: (id) => publicAPI.get(STORES.FINANCIAL_TEMPLATES, id),
        
        // --- Scrum Methods ---
        getScrumData: (jobNo) => publicAPI.get(STORES.DESIGN_SCRUM, jobNo),
        getAllScrumData: () => publicAPI.getAll(STORES.DESIGN_SCRUM),
        putScrumData: (data) => publicAPI.put(STORES.DESIGN_SCRUM, data),

        // --- Bulletin Methods ---
        addBulletinItem: (item) => publicAPI.add(STORES.BULLETIN, item),
        getBulletinItems: (limit = 50) => {
            return makeRequest(STORES.BULLETIN, 'readonly', store => store.getAll()).then(items => {
                return items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
            });
        },
        
        // --- Holiday Methods ---
        getHolidays: (countryCode, year) => {
            return makeRequest(STORES.HOLIDAYS, 'readonly', store => store.index('by_country_year').getAll([countryCode, year]));
        },
        addHolidays: (holidays, countryCode, year) => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORES.HOLIDAYS, 'readwrite');
                const store = transaction.objectStore(STORES.HOLIDAYS);
                holidays.forEach(h => store.add({ ...h, countryCode, year }));
                transaction.oncomplete = resolve;
                transaction.onerror = reject;
            });
        },
        getAllHolidays: () => publicAPI.getAll(STORES.HOLIDAYS),

        // --- Unified File Methods ---
        addFile: (fileData) => publicAPI.add(STORES.FILES, fileData),
        deleteFile: (id) => publicAPI.delete(STORES.FILES, id),
        getFileById: (id) => publicAPI.get(STORES.FILES, id),
        getFiles: (jobNo, source) => {
             return makeRequest(STORES.FILES, 'readonly', store => store.index('jobNo_source').getAll([jobNo, source]));
        },
        getFilesByCategory: (jobNo, source, category) => {
            return makeRequest(STORES.FILES, 'readonly', store => store.index('jobNo_source').getAll([jobNo, source]))
                .then(files => files.filter(file => file.category === category));
        },
        getFileBySubCategory: (jobNo, subCategory) => {
            return makeRequest(STORES.FILES, 'readonly', store => store.index('jobNo_subCategory').get([jobNo, subCategory]));
        },
        getAllFiles: () => publicAPI.getAll(STORES.FILES),

        clearFilesBySource: async (jobNo, source) => {
            const files = await publicAPI.getFiles(jobNo, source);
            if (files.length === 0) return;
            const transaction = db.transaction(STORES.FILES, 'readwrite');
            const store = transaction.objectStore(STORES.FILES);
            files.forEach(file => store.delete(file.id));
            return new Promise(resolve => transaction.oncomplete = resolve);
        },

        // --- Full System Operations ---
        clearAllData: () => Promise.all(Object.values(STORES).map(storeName => publicAPI.clear(storeName))),

        // --- Data Processing Helpers ---
        // MODIFICATION START: Updated to handle imported scrum tasks
        processProjectImport: async (project) => {
            const { masterDocuments, scrumTasks, ...projectData } = project;
            await publicAPI.putProject(projectData);

            if (masterDocuments?.length) {
                await publicAPI.clearFilesBySource(project.jobNo, 'master');
                const transaction = db.transaction(STORES.FILES, 'readwrite');
                const store = transaction.objectStore(STORES.FILES);
                for (const doc of masterDocuments) {
                    store.add({
                        jobNo: project.jobNo, source: 'master',
                        category: doc.category, subCategory: doc.subCategory, name: doc.name,
                        fileType: doc.type || doc.fileType, dataUrl: doc.data || doc.dataUrl,
                        expiryDate: doc.expiryDate || null,
                    });
                }
            }
            
            const existingSiteData = await publicAPI.getSiteData(project.jobNo);
            if (!existingSiteData) {
                const boqTemplateReq = await publicAPI.getFinancialTemplate('boq');
                const boqTemplate = boqTemplateReq ? boqTemplateReq.data : [];
                await publicAPI.putSiteData({
                    jobNo: project.jobNo, status: 'Pending Start', progress: 0,
                    boq: JSON.parse(JSON.stringify(boqTemplate)), // Deep copy
                    mom: [], paymentCertificates: [], scheduleOverrides: []
                });
            }
       
            if (scrumTasks) { // Check if scrumTasks array exists in the import file
                await publicAPI.putScrumData({ jobNo: project.jobNo, tasks: scrumTasks });
            } else {
                // Fallback for older imports: create default board only if one doesn't exist.
                const existingScrumData = await publicAPI.getScrumData(project.jobNo);
                if (!existingScrumData) {
                    const defaultScrumTasks = DESIGN_SCRUM_TEMPLATE.map(task => ({
                        ...task, status: 'Up Next', assigneeId: null, dueDate: null, startDate: null,
                        completedDate: null, dateAdded: new Date().toISOString().split('T')[0]
                    }));
                    await publicAPI.putScrumData({ jobNo: project.jobNo, tasks: defaultScrumTasks });
                }
            }
        },
        // MODIFICATION END
        processSiteUpdateImport: async (update) => {
            const { siteFiles, ...siteData } = update;
            await publicAPI.putSiteData(siteData);

            if (siteFiles?.length) {
                await publicAPI.clearFilesBySource(update.jobNo, 'site');
                const transaction = db.transaction(STORES.FILES, 'readwrite');
                const store = transaction.objectStore(STORES.FILES);
                for (const file of siteFiles) {
                    store.add({
                        jobNo: update.jobNo, source: 'site', type: file.type, name: file.name,
                        fileType: file.fileType, dataUrl: file.data
                    });
                }
            }
        }
    };

    return publicAPI;
})();