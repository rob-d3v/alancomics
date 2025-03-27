class ComicsViewer {
    constructor() {
        this.container = document.getElementById('imagesContainer');
        this.viewer = document.getElementById('viewer');
        this.zoomLevel = 1;
        this.isScrolling = false;
        this.scrollInterval = null;
        this.currentPdfDoc = null;
        this.currentEpubBook = null;
        this.initControls();
        this.loadRequiredLibraries();
    }

    async loadRequiredLibraries() {
        // Load PDF.js library
        if (!window.pdfjsLib) {
            const pdfScript = document.createElement('script');
            pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
            document.head.appendChild(pdfScript);
            await new Promise(resolve => pdfScript.onload = resolve);
            
            // Set worker source
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        }
        
        // Load ePub.js library
        if (!window.ePub) {
            const epubScript = document.createElement('script');
            epubScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/epub.js/0.3.88/epub.min.js';
            document.head.appendChild(epubScript);
            await new Promise(resolve => epubScript.onload = resolve);
        }
    }

    initControls() {
        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(0.1));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(-0.1));
        document.getElementById('backToTop').addEventListener('click', () => this.scrollToTop());
        document.getElementById('fullscreen').addEventListener('click', () => this.toggleFullscreen());
    }

    // Make sure this method exists and is properly renamed
    async displayContent(contentItems) {
        this.container.innerHTML = '';
        
        if (!contentItems || contentItems.length === 0) {
            return;
        }
    
        // Group content by type for better rendering
        const images = contentItems.filter(item => item.type === 'image');
        const pdfs = contentItems.filter(item => item.type === 'pdf');
        const epubs = contentItems.filter(item => item.type === 'epub');
    
        // Display images first
        for (const image of images) {
            await this.displayImage(image);
        }
    
        // Then display PDFs
        for (const pdf of pdfs) {
            await this.displayPdf(pdf);
        }
    
        // Finally display EPUBs
        for (const epub of epubs) {
            await this.displayEpub(epub);
        }
    
        // Force layout recalculation
        this.container.style.display = 'none';
        this.container.offsetHeight; // Force reflow
        this.container.style.display = '';
    }
    
    async displayImage(image) {
        const imgElement = document.createElement('img');
        imgElement.src = image.data;
        imgElement.dataset.id = image.id;
        imgElement.dataset.type = 'image';
        imgElement.style.width = `${100 * this.zoomLevel}%`;
        imgElement.style.maxWidth = `${100 * this.zoomLevel}%`;
        imgElement.style.display = 'block'; // Ensure image is visible
        imgElement.onerror = () => {
            console.error('Failed to load image:', image.id);
            imgElement.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
        };
        this.container.appendChild(imgElement);
    }
    
    async displayPdf(pdfItem) {
        try {
            // Create container for this PDF
            const pdfContainer = document.createElement('div');
            pdfContainer.className = 'pdf-container';
            pdfContainer.dataset.id = pdfItem.id;
            pdfContainer.dataset.type = 'pdf';
            pdfContainer.style.width = `${100 * this.zoomLevel}%`;
            
            // Remove the title div that was here
            
            // Load the PDF document
            const loadingTask = pdfjsLib.getDocument(pdfItem.data);
            const pdfDoc = await loadingTask.promise;
            
            // Create canvas elements for each page
            const numPages = pdfDoc.numPages;
            for (let i = 1; i <= numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: this.zoomLevel });
                
                const canvasContainer = document.createElement('div');
                canvasContainer.className = 'pdf-page';
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                await page.render(renderContext).promise;
                canvasContainer.appendChild(canvas);
                pdfContainer.appendChild(canvasContainer);
            }
            
            this.container.appendChild(pdfContainer);
        } catch (error) {
            console.error('Error rendering PDF:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = `Failed to load PDF: ${error.message}`;
            this.container.appendChild(errorDiv);
        }
    }
    
    async displayEpub(epubItem) {
        try {
            // Create container for this EPUB
            const epubContainer = document.createElement('div');
            epubContainer.className = 'epub-container';
            epubContainer.dataset.id = epubItem.id;
            epubContainer.dataset.type = 'epub';
            epubContainer.style.width = `${100 * this.zoomLevel}%`;
            
            // Remove the title div that was here
            
            // Create a unique ID for this EPUB viewer
            const epubViewerId = `epub-viewer-${epubItem.id}`;
            const epubViewer = document.createElement('div');
            epubViewer.id = epubViewerId;
            epubViewer.className = 'epub-viewer';
            epubContainer.appendChild(epubViewer);
            
            this.container.appendChild(epubContainer);
            
            // Initialize EPUB.js book
            const book = ePub(epubItem.data);
            const rendition = book.renderTo(epubViewerId, {
                width: '100%',
                height: '600px',
                spread: 'none'
            });
            
            // Display the book
            await book.ready;
            rendition.display();
            
            // Add navigation controls
            const navDiv = document.createElement('div');
            navDiv.className = 'epub-navigation';
            
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '← Previous';
            prevBtn.onclick = () => rendition.prev();
            
            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Next →';
            nextBtn.onclick = () => rendition.next();
            
            navDiv.appendChild(prevBtn);
            navDiv.appendChild(nextBtn);
            epubContainer.appendChild(navDiv);
            
        } catch (error) {
            console.error('Error rendering EPUB:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = `Failed to load EPUB: ${error.message}`;
            this.container.appendChild(errorDiv);
        }
    }

    zoom(delta) {
        this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel + delta));
        
        // Apply zoom to all content types
        this.container.querySelectorAll('img[data-type="image"]').forEach(img => {
            img.style.width = `${100 * this.zoomLevel}%`;
            img.style.maxWidth = `${100 * this.zoomLevel}%`;
        });
        
        this.container.querySelectorAll('.pdf-container, .epub-container').forEach(container => {
            container.style.width = `${100 * this.zoomLevel}%`;
        });
    }

    scrollToTop() {
        if (this.container.classList.contains('horizontal')) {
            this.viewer.scrollLeft = 0;
        } else {
            this.viewer.scrollTop = 0;
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                // Enable auto-hide controls when entering fullscreen
                this.enableAutoHideControls();
            });
        } else {
            document.exitFullscreen().then(() => {
                // Disable auto-hide controls when exiting fullscreen
                this.disableAutoHideControls();
            });
        }
    }

    enableAutoHideControls() {
        // Store references to elements
        this.header = document.querySelector('header');
        this.floatingControls = document.querySelector('.floating-controls');
        
        // Add visible class initially
        this.header.classList.add('visible');
        this.floatingControls.classList.add('visible');
        
        // Set up mouse movement tracking
        this.mouseTimeout = null;
        
        // Define the mousemove handler
        this.mouseMoveHandler = () => {
            // Show controls
            this.header.classList.add('visible');
            this.floatingControls.classList.add('visible');
            
            // Clear any existing timeout
            if (this.mouseTimeout) {
                clearTimeout(this.mouseTimeout);
            }
            
            // Set timeout to hide controls after 2 seconds
            this.mouseTimeout = setTimeout(() => {
                this.header.classList.remove('visible');
                this.floatingControls.classList.remove('visible');
            }, 2000);
        };
        
        // Add event listener
        document.addEventListener('mousemove', this.mouseMoveHandler);
        
        // Initial timeout to hide controls
        this.mouseTimeout = setTimeout(() => {
            this.header.classList.remove('visible');
            this.floatingControls.classList.remove('visible');
        }, 2000);
    }

    disableAutoHideControls() {
        // Remove event listener
        if (this.mouseMoveHandler) {
            document.removeEventListener('mousemove', this.mouseMoveHandler);
        }
        
        // Clear any existing timeout
        if (this.mouseTimeout) {
            clearTimeout(this.mouseTimeout);
            this.mouseTimeout = null;
        }
        
        // Ensure controls are visible
        if (this.header) {
            this.header.classList.add('visible');
        }
        if (this.floatingControls) {
            this.floatingControls.classList.add('visible');
        }
    }

    setScrollDirection(direction) {
        this.container.className = `images-container ${direction}`;
    }

    setSpacing(spacing) {
        this.container.style.setProperty('--image-spacing', `${spacing}px`);
    }

    startAutoScroll(speed) {
        if (this.isScrolling) return;
        
        this.isScrolling = true;
        
        // New approach for handling all speeds
        // We'll use a fixed interval and accumulate fractional pixels
        const interval = 50; // Fixed interval (ms)
        let pixelAccumulator = 0;
        
        console.log(`Starting auto-scroll with speed: ${speed}`);
        
        this.scrollInterval = setInterval(() => {
            // Add the speed to our accumulator
            pixelAccumulator += speed;
            
            // Only scroll when we have at least 1 pixel to move
            if (pixelAccumulator >= 1) {
                // Get the integer part of pixels to move
                const pixelsToMove = Math.floor(pixelAccumulator);
                // Keep the fractional part for next time
                pixelAccumulator -= pixelsToMove;
                
                if (this.container.classList.contains('horizontal')) {
                    if (this.viewer.scrollLeft >= this.viewer.scrollWidth - this.viewer.clientWidth) {
                        this.stopAutoScroll();
                        document.dispatchEvent(new CustomEvent('autoScrollComplete'));
                        return;
                    }
                    this.viewer.scrollLeft += pixelsToMove;
                } else {
                    if (this.viewer.scrollTop >= this.viewer.scrollHeight - this.viewer.clientHeight) {
                        this.stopAutoScroll();
                        document.dispatchEvent(new CustomEvent('autoScrollComplete'));
                        return;
                    }
                    this.viewer.scrollTop += pixelsToMove;
                }
            }
        }, interval);
    }

    stopAutoScroll() {
        this.isScrolling = false;
        clearInterval(this.scrollInterval);
        console.log('Auto-scroll stopped');
    }
}