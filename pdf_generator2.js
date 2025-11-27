/**
 * @module PDFGenerator
 * A self-contained module for creating all PDF documents for the Urban Axis application.
 * It handles pagination, headers, footers, and watermarks automatically.
 * Depends on: jspdf.umd.min.js and logo_base64.js
 */
const PDFGenerator = (() => {

    /**
     * The primary PDF generation function.
     * @param {object} options - Configuration object for the PDF.
     * @param {string} options.previewId - The ID of the HTML element to render (if not using tempContent).
     * @param {string} options.tempContent - A string of HTML to render directly into a temporary element.
     * @param {string} options.projectJobNo - The job number for naming the file.
     * @param {string} options.pageSize - The page size ('a4' or 'letter').
     */
    const generate = async ({ previewId, tempContent, projectJobNo, pageSize }) => {
        const { jsPDF } = window.jspdf;
        let sourceElement;
        let isTemp = false;

        // Determine the source of the HTML content
        if (tempContent) {
            isTemp = true;
            sourceElement = document.createElement('div');
            sourceElement.className = `document-preview ${pageSize}`;
            sourceElement.innerHTML = tempContent;
            document.body.appendChild(sourceElement);
        } else {
            sourceElement = document.getElementById(previewId);
        }

        if (!sourceElement) {
            console.error(`PDF generation error: Source element could not be found or created.`);
            alert(`Could not find content to generate PDF.`);
            return;
        }

        alert('Generating PDF... This may take a moment.');

        // 1. Define PDF document and constants
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: pageSize });
        const PAGE_WIDTH = doc.internal.pageSize.getWidth();
        const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
        const TOP_MARGIN = 30;
        const BOTTOM_MARGIN = 20;
        // const TOP_MARGIN = 0;
        // const BOTTOM_MARGIN = 0;
        const CONTENT_WIDTH = PAGE_WIDTH - 20;
        const logoImgWidth = PAGE_WIDTH - 20;
                const logoImgHeight = logoImgWidth * 1; 
 // --- NEW: Define Graphics States for opacity ---
            const watermarkGState = new doc.GState({ opacity: 0.5 }); // Low opacity for watermark
            const normalGState = new doc.GState({ opacity: 1.0 });   // Normal opacity for everything else
        // 2. Helper function to add elements to every page
        const addHeaderFooterWatermark = () => {
            const pageCount = doc.internal.getNumberOfPages();

            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                // --- WATERMARK ---
                 doc.setGState(watermarkGState); // Apply the transparent state
                // doc.setFont('helvetica', 'bold');
                // doc.setFontSize(80);
                // doc.setTextColor(230, 230, 230);
                // doc.text('Urban Axis', PAGE_WIDTH / 2, PAGE_HEIGHT / 2, { angle: -45, align: 'center' });
                
                
                doc.addImage(LOGO_svgBASE64, 'PNG', 20, 80, logoImgWidth, logoImgHeight);

                doc.setTextColor(0, 0, 0);

                // --- HEADER (USING GLOBAL LOGO_BASE64 CONSTANT) ---
                doc.setGState(normalGState);
                const headerImgWidth = PAGE_WIDTH - 20;
                
                const headerImgHeight = headerImgWidth * (15.72 / 183.17); 
                doc.addImage(LOGO_BASE64, 'PNG', 10, 8, headerImgWidth, headerImgHeight);

                // Page Number
                doc.setFontSize(9);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - 25, 28);
                doc.setTextColor(0, 0, 0);

                // --- FOOTER ---
                doc.setLineWidth(0.2);
                doc.line(10, PAGE_HEIGHT - BOTTOM_MARGIN, PAGE_WIDTH - 10, PAGE_HEIGHT - BOTTOM_MARGIN);
                doc.setFontSize(8);
                const footerText1 = "P.O. Box: 281, DUBAI (U.A.E) TEL.: 04-3493435, E-mail: UrbanAxis@emirates.net.ae";
                const footerText2 = "Website: www.UrbanAxis.ae";
                doc.text(footerText1, PAGE_WIDTH / 2, PAGE_HEIGHT - 15, { align: 'center' });
                doc.text(footerText2, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
            }
        };

        // 3. Use the .html() method to render content
        await doc.html(sourceElement, {
            callback: function (doc) {
                addHeaderFooterWatermark();
                
                if (isTemp) {
                    document.body.removeChild(sourceElement);
                }

                // 4. Save the document
                const fileName = `${(projectJobNo || 'document').replace(/[\\/]/g, '-')}_${previewId || 'preview'}.pdf`;
                doc.save(fileName);
            },
            margin: [TOP_MARGIN, 10, BOTTOM_MARGIN, 10],
            autoPaging: 'text',
            width: CONTENT_WIDTH,
            windowWidth: sourceElement.scrollWidth
        });
    };

    // Expose the public generate function
    return {
        generate: generate
    };

})();