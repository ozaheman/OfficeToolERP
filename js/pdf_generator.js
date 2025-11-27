



/**
 * @module PDFGenerator
 * A self-contained module for creating all PDF documents for the Urban Axis application.
 * It handles pagination, headers, footers, and watermarks automatically.
 * Depends on: jspdf.umd.min.js and logo_base64.js
 */
 
 pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
const PDFGenerator = (() => {

    /**
     * The primary PDF generation function.
     * @param {object} options - Configuration object for the PDF.
     * @param {string} options.previewId - The ID of the HTML element to render.
     * @param {string} options.projectJobNo - The job number for naming the file.
     * @param {string} options.pageSize - The page size ('A4_portrait', 'A4_landscape', etc.).
     * @param {string} [options.fileName] - A custom file name for the PDF.
     * @param {string|string[]} [options.watermarkData] - Optional text (or an array of text) to display as a grid watermark.
     */
    const generate = async ({ previewId, projectJobNo, pageSize = 'a4_portrait', fileName: customFileName, watermarkData }) => {
        if (!previewId) {
            console.error("PDF Generation Error: 'previewId' is missing.");
            alert("Could not generate PDF: No content source was specified.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const sourceElement = document.getElementById(previewId);
        
        let logoElementToHide = null;
        let footerElementToHide = null;

        if (!sourceElement) {
            console.error(`PDF generation error: Source element with ID '${previewId}' could not be found.`);
            alert(`Could not find content to generate PDF. Check console for details.`);
            return;
        }

        alert('Generating PDF... This may take a moment.');
        
        try {
            logoElementToHide = sourceElement.querySelector('.preview-header-image');
            footerElementToHide = sourceElement.querySelector('.preview-footer');
            if (logoElementToHide) logoElementToHide.style.display = 'none';
            if (footerElementToHide) footerElementToHide.style.display = 'none';

            const [format, orientation] = pageSize.toLowerCase().split('_');
            const doc = new jsPDF({ 
                orientation: orientation === 'landscape' ? 'l' : 'p', 
                unit: 'mm', 
                format: format 
            });

            const PAGE_WIDTH = doc.internal.pageSize.getWidth();
            const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
            const TOP_MARGIN = 20;
            const BOTTOM_MARGIN = 20;
            const CONTENT_WIDTH = PAGE_WIDTH - 20;

            const watermarkGState = new doc.GState({ opacity: 0.08 });
            const textWatermarkGState = new doc.GState({ opacity: 0.05 });
            const normalGState = new doc.GState({ opacity: 1.0 });

            const addHeaderFooterWatermark = () => {
                const pageCount = doc.internal.getNumberOfPages();
                
                // --- MODIFICATION START: Prepare watermark array ---
                let watermarkTexts = [];
                if (typeof watermarkData === 'string' && watermarkData) {
                    watermarkTexts = [watermarkData];
                } else if (Array.isArray(watermarkData) && watermarkData.length > 0) {
                    watermarkTexts = watermarkData;
                }
                // --- MODIFICATION END ---

                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);

                    doc.setGState(watermarkGState);
                    const watermarkImgWidth = PAGE_WIDTH - 40;
                    const watermarkImgHeight = watermarkImgWidth * 1;
                    doc.addImage(WM_BASE64, 'PNG', 20, (PAGE_HEIGHT - watermarkImgHeight) / 2, watermarkImgWidth, watermarkImgHeight);
                    doc.setGState(normalGState);
                    
                    // --- MODIFICATION START: Cycle through watermark array ---
                    if (watermarkTexts.length > 0) {
                        doc.saveGraphicsState();
                        doc.setGState(textWatermarkGState);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(32);
                        doc.setTextColor(150, 150, 150);
                        let textIndex = 0;
                        for (let y = 20; y < PAGE_HEIGHT; y += 80) {
                            for (let x = 20; x < PAGE_WIDTH; x += 120) {
                                const currentWatermark = watermarkTexts[textIndex % watermarkTexts.length];
                                doc.text(currentWatermark, x, y, { angle: -45, align: 'center' });
                                textIndex++;
                            }
                        }
                        doc.restoreGraphicsState();
                    }
                    // --- MODIFICATION END ---

                    const headerImgWidth = PAGE_WIDTH - 20;
                    const headerImgHeight = headerImgWidth * (15.72 / 183.17);
                    doc.addImage(LOGO_BASE64, 'PNG', 10, 8, headerImgWidth, headerImgHeight);
                    
                    doc.setFontSize(9);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - 25, PAGE_HEIGHT - 10);
                    doc.setTextColor(0, 0, 0);

                    doc.setLineWidth(0.2);
                    doc.line(10, PAGE_HEIGHT - BOTTOM_MARGIN, PAGE_WIDTH - 10, PAGE_HEIGHT - BOTTOM_MARGIN);
                    doc.setFontSize(8);
                    const footerText1 = "P.O. Box: 281, DUBAI (U.A.E) TEL.: 04-3493435, E-mail: UrbanAxis@emirates.net.ae";
                    const footerText2 = "Website: www.UrbanAxis.ae";
                    doc.text(footerText1, PAGE_WIDTH / 2, PAGE_HEIGHT - 15, { align: 'center' });
                    doc.text(footerText2, PAGE_WIDTH / 2, PAGE_HEIGHT - 12, { align: 'center' });
                }
            };

            await doc.html(sourceElement, {
                callback: function (doc) {
                    addHeaderFooterWatermark();
                    const fileName = customFileName ? `${customFileName}.pdf` : `${(projectJobNo || 'document').replace(/[\\/]/g, '-')}_${previewId || 'preview'}.pdf`;
                    doc.save(fileName);
                },
                margin: [TOP_MARGIN + 15, 10, BOTTOM_MARGIN, 10],
                autoPaging: 'text',
                width: CONTENT_WIDTH,
                windowWidth: sourceElement.scrollWidth
            });

        } finally {
            if (logoElementToHide) logoElementToHide.style.display = 'block';
            if (footerElementToHide) footerElementToHide.style.display = 'block';
        }
    };

    /**
     * Renders the first page of a PDF from a dataUrl onto a canvas element.
     * @param {HTMLCanvasElement} canvas - The canvas to render on.
     * @param {string} dataUrl - The base64 data URL of the PDF.
     */
    const renderPdfThumbnail = (canvas, dataUrl) => {
        try {
            const base64Data = atob(dataUrl.substring(dataUrl.indexOf(',') + 1));
            pdfjsLib.getDocument({ data: base64Data }).promise.then(pdf => pdf.getPage(1))
            .then(page => {
                const desiredWidth = canvas.clientWidth;
                const viewport = page.getViewport({ scale: 1 });
                const scale = desiredWidth / viewport.width;
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
                canvas.parentNode.replaceChild(fallbackIcon, canvas);
            });
        } catch(e) {
             console.error('Error decoding base64 data for PDF thumbnail:', e);
        }
    };

    return {
        generate,
        renderPdfThumbnail
    };

})();