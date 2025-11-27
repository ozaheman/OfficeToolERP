// ===================================================================================
// MODULE: FILE MANAGER (Handles IndexedDB storage for project documents)
// ===================================================================================
const FileManager = (() => {
    let db;
    const DB_NAME = 'UrbanAxisFileStorage';
    const STORE_NAME = 'projectFiles';

    // Configure PDF.js worker location
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

    function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);

            request.onerror = (event) => {
                console.error("Database error: ", event.target.errorCode);
                reject("Database error");
            };

            request.onupgradeneeded = (event) => {
                const store = event.target.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('jobNo', 'jobNo', { unique: false });
                store.createIndex('jobNo_category', ['jobNo', 'category'], { unique: false });
                store.createIndex('jobNo_subCategory', ['jobNo', 'subCategory'], { unique: false });
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log("File storage database initialized successfully.");
                resolve();
            };
        });
    }

    function saveFile(jobNo, category, subCategory, file, expiryDate, projectName) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const fileData = {
                    jobNo: jobNo,
                    category: category,
                    subCategory: subCategory,
                    name: file.name,
                    type: file.type,
                    dataUrl: reader.result,
                    expiryDate: expiryDate || null, // Ensure expiryDate is stored
                    projectName: projectName || 'N/A', // Store project name
                    uploadDate: new Date().toISOString() // Store upload date
                };

                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.add(fileData);

                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject("Error saving file: " + event.target.errorCode);
            };
            reader.onerror = (error) => reject("Error reading file: " + error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Placeholder for Google Drive integration.
     */
    function saveFileToGoogleDrive(jobNo, category, subCategory, file, expiryDate, projectName) {
        return new Promise((resolve, reject) => {
            // This is where you would implement the Google Drive API calls.
            alert('Google Drive upload is a placeholder. Implement API calls here.');
            reject('Google Drive upload not implemented.');
        });
    }

    function getFiles(jobNo, category) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('jobNo_category');
            const request = index.getAll([jobNo, category]);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject("Error fetching files: " + event.target.errorCode);
        });
    }

    function getAllFilesForJob(jobNo) {
        return new Promise((resolve, reject) => {
            if (!db) return reject("Database not initialized.");
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('jobNo');
            const request = index.getAll(jobNo);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject("Error fetching all files for job: " + event.target.errorCode);
        });
    }
    
    function getFileBySubCategory(jobNo, subCategory) {
        return new Promise((resolve, reject) => {
            if (!db) {
                return reject("Database not initialized.");
            }
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('jobNo_subCategory');
            const request = index.get([jobNo, subCategory]);
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (event) => reject("Error fetching file: " + event.target.errorCode);
        });
    }
    
    function deleteFile(id) {
        return new Promise((resolve, reject) => {
             if (!confirm('Are you sure you want to delete this file permanently?')) {
                reject('Deletion cancelled.');
                return;
            }
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject("Error deleting file: " + event.target.errorCode);
        });
    }
    
    function getExpiringDocuments() {
        return new Promise((resolve, reject) => {
            if (!db) {
                return reject("Database not initialized.");
            }
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const allFiles = request.result || [];
                const expiringSoon = [];
                const now = new Date();
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(now.getDate() + 30);

                allFiles.forEach(file => {
                    if (file.expiryDate) {
                        const expiry = new Date(file.expiryDate);
                        if (expiry >= now && expiry <= thirtyDaysFromNow) {
                            expiringSoon.push(file);
                        }
                    }
                });
                resolve(expiringSoon);
            };
            request.onerror = (event) => reject("Error fetching all files: " + event.target.errorCode);
        });
    }

    function renderGallery(containerEl, jobNo, category) {
        const galleryGrid = containerEl.querySelector('.gallery-grid');
        galleryGrid.innerHTML = '<p>Loading files...</p>';
        
        getFiles(jobNo, category).then(files => {
            if (files.length === 0) {
                galleryGrid.innerHTML = '<p>No documents uploaded in this category.</p>';
                return;
            }
            
            galleryGrid.innerHTML = ''; // Clear loading message
            files.forEach(file => {
                const thumbContainer = document.createElement('div');
                thumbContainer.className = 'thumbnail-container';

                const deleteBtn = document.createElement('div');
                deleteBtn.className = 'thumbnail-delete-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = 'Delete this file';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteFile(file.id).then(() => {
                        console.log(`File ${file.id} deleted.`);
                        renderGallery(containerEl, jobNo, category); // Refresh the gallery
                    }).catch(err => {
                        if (err !== 'Deletion cancelled.') {
                            console.error(err);
                        }
                    });
                };

                let thumbnail;
                if (file.type.startsWith('image/')) {
                    thumbnail = document.createElement('img');
                    thumbnail.src = file.dataUrl;
                    thumbnail.className = 'thumbnail';
                    thumbnail.alt = `Preview of ${file.name}`;
                } else if (file.type === 'application/pdf') {
                    thumbnail = document.createElement('canvas');
                    thumbnail.className = 'pdf-thumbnail';
                    _renderPdfThumbnail(thumbnail, file);
                } else {
                    thumbnail = document.createElement('div');
                    thumbnail.className = 'file-icon';
                    thumbnail.textContent = file.name.split('.').pop().toUpperCase();
                }
                thumbnail.onclick = () => showPreview(file);

                const caption = document.createElement('div');
                caption.className = 'thumbnail-caption';
                caption.textContent = file.subCategory.replace(/_/g, ' '); // Show formatted subcategory
                
                thumbContainer.append(deleteBtn, thumbnail, caption);
                galleryGrid.appendChild(thumbContainer);
            });
        }).catch(error => {
            galleryGrid.innerHTML = '<p>Error loading files.</p>';
            console.error(error);
        });
    }

    function _renderPdfThumbnail(canvas, file) {
        try {
            const base64Data = atob(file.dataUrl.substring(file.dataUrl.indexOf(',') + 1));
            pdfjsLib.getDocument({ data: base64Data }).promise.then(pdf => {
                return pdf.getPage(1);
            }).then(page => {
                const viewport = page.getViewport({ scale: 1 });
                const scale = canvas.width / viewport.width;
                const scaledViewport = page.getViewport({ scale: scale });
                const context = canvas.getContext('2d');
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;
                page.render({ canvasContext: context, viewport: scaledViewport });
            }).catch(err => { 
                console.error('Error rendering PDF thumbnail:', err); 
                const fallbackIcon = document.createElement('div');
                fallbackIcon.className = 'file-icon';
                fallbackIcon.textContent = 'PDF';
                canvas.replaceWith(fallbackIcon);
            });
        } catch(e) {
             console.error('Error decoding base64 data for PDF thumbnail:', e);
        }
    }
    
    function showPreview(file) {
        const modal = document.getElementById('file-preview-modal');
        const container = document.getElementById('file-preview-container');
        const closeBtn = document.getElementById('file-modal-close');
        
        container.innerHTML = '';
        
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = file.dataUrl;
            img.alt = `Full preview of ${file.name}`;
            container.appendChild(img);
        } else if (file.type === 'application/pdf') {
            container.innerHTML = '<p style="color:white;">Loading PDF...</p>';
            try {
                const base64Data = atob(file.dataUrl.substring(file.dataUrl.indexOf(',') + 1));
                pdfjsLib.getDocument({ data: base64Data }).promise.then(pdf => {
                    container.innerHTML = ''; // Clear loading
                    const renderPromises = [];
                    for (let i = 1; i <= pdf.numPages; i++) {
                       renderPromises.push(
                           pdf.getPage(i).then(page => {
                                const canvas = document.createElement('canvas');
                                const context = canvas.getContext('2d');
                                const viewport = page.getViewport({ scale: 2.0 });
                                canvas.height = viewport.height;
                                canvas.width = viewport.width;
                                page.render({ canvasContext: context, viewport: viewport });
                                return { pageNum: i, canvas: canvas };
                            })
                       );
                    }
                    Promise.all(renderPromises).then(pages => {
                        pages.sort((a, b) => a.pageNum - b.pageNum).forEach(p => container.appendChild(p.canvas));
                    });
                }).catch(err => {
                    container.innerHTML = '<p style="color:white;">Sorry, there was an error displaying the PDF.</p>';
                    console.error('PDF rendering error:', err);
                });
            } catch(e) {
                container.innerHTML = '<p style="color:white;">Sorry, there was an error decoding the PDF data.</p>';
                console.error('Base64 decode error:', e);
            }
        }
        
        modal.style.display = 'block';
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            container.innerHTML = ''; 
        };
        modal.onclick = (e) => {
            if (e.target === modal) {
                 modal.style.display = 'none';
                 container.innerHTML = '';
            }
        }
    }
    
    return {
        init,
        saveFile,
        saveFileToGoogleDrive,
        getFiles,
        deleteFile,
        renderGallery,
        showPreview,
        getFileBySubCategory,
        getExpiringDocuments,
        getAllFilesForJob
    };
})();