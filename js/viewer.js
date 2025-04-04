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
        
        // Adicionar estilos CSS para PDFs
        this.addPdfStyles();
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
        const txts = contentItems.filter(item => item.type === 'txt');
    
        // Display images first
        for (const image of images) {
            await this.displayImage(image);
        }
    
        // Then display PDFs
        for (const pdf of pdfs) {
            await this.displayPdf(pdf);
        }
    
        // Then display EPUBs
        for (const epub of epubs) {
            await this.displayEpub(epub);
        }
        
        // Finally display TXT files
        for (const txt of txts) {
            await this.displayTxt(txt);
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
            
            // Armazenar a URL do PDF para recarregamento posterior
            pdfContainer.dataset.pdfUrl = pdfItem.data;
            
            // Load the PDF document
            const loadingTask = pdfjsLib.getDocument(pdfItem.data);
            const pdfDoc = await loadingTask.promise;
            
            // Armazenar o número de páginas
            pdfContainer.dataset.numPages = pdfDoc.numPages;
            
            // Create canvas elements for each page
            const numPages = pdfDoc.numPages;
            for (let i = 1; i <= numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: this.zoomLevel });
                
                const canvasContainer = document.createElement('div');
                canvasContainer.className = 'pdf-page';
                canvasContainer.dataset.pageNum = i;
                
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
    
    async displayTxt(txtItem) {
        try {
            // Create container for this TXT file
            const txtContainer = document.createElement('div');
            txtContainer.className = 'txt-container';
            txtContainer.dataset.id = txtItem.id;
            txtContainer.dataset.type = 'txt';
            txtContainer.style.width = `${100 * this.zoomLevel}%`;
            
            // Create content element with proper styling
            const txtContent = document.createElement('div');
            txtContent.className = 'txt-content';
            txtContent.style.padding = '20px';
            txtContent.style.backgroundColor = '#fff';
            txtContent.style.color = '#333';
            txtContent.style.fontFamily = 'Arial, sans-serif';
            txtContent.style.lineHeight = '1.6';
            txtContent.style.whiteSpace = 'pre-wrap';
            txtContent.style.overflow = 'auto';
            txtContent.style.maxHeight = '80vh';
            txtContent.style.border = '1px solid #ddd';
            txtContent.style.borderRadius = '5px';
            txtContent.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
            
            // Decode the base64 content if needed
            let textContent = '';
            if (txtItem.data.startsWith('data:')) {
                // Handle data URL format
                const base64Content = txtItem.data.split(',')[1];
                textContent = atob(base64Content);
            } else {
                // Handle plain text
                textContent = txtItem.data;
            }
            
            // Set the text content
            txtContent.textContent = textContent;
            
            // Add data attributes for narration
            txtContent.dataset.narrationText = textContent;
            
            // Append content to container
            txtContainer.appendChild(txtContent);
            
            // Append container to main container
            this.container.appendChild(txtContainer);
            
        } catch (error) {
            console.error('Error rendering TXT:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = `Failed to load TXT: ${error.message}`;
            this.container.appendChild(errorDiv);
        }
    }

    zoom(delta) {
        const oldZoomLevel = this.zoomLevel;
        this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel + delta));
        
        // Se o zoom não mudou, não faça nada
        if (oldZoomLevel === this.zoomLevel) return;
        
        // Save current scroll position relative to content
        let relativeScrollPosition;
        
        if (this.container.classList.contains('horizontal')) {
            // For horizontal mode, calculate relative position based on scrollLeft
            const totalWidth = this.viewer.scrollWidth;
            relativeScrollPosition = this.viewer.scrollLeft / totalWidth;
            
            // Modo horizontal - tratamento específico
            this.container.querySelectorAll('img[data-type="image"]').forEach(img => {
                img.style.maxHeight = `${80 * this.zoomLevel}vh`;
                img.style.height = 'auto';
                img.style.width = 'auto';
                img.style.alignSelf = 'center'; // Keep images centered vertically
            });
            
            this.container.querySelectorAll('.epub-container, .txt-container').forEach(container => {
                container.style.maxHeight = `${80 * this.zoomLevel}vh`;
                container.style.height = 'auto';
                container.style.width = 'auto';
                container.style.alignSelf = 'center'; // Keep containers centered vertically
            });
            
            // Ensure container is properly set for vertical centering
            this.container.style.alignItems = 'center';
            this.container.style.minHeight = '100%';
            
            // Recarregar PDFs com novo zoom
            this.container.querySelectorAll('.pdf-container').forEach(container => {
                container.style.maxHeight = `${80 * this.zoomLevel}vh`;
                container.style.height = 'auto';
                container.style.width = 'auto';
                container.style.alignSelf = 'center'; // Keep PDFs centered vertically
                this.reloadPdfWithZoom(container, this.zoomLevel);
            });
        } else {
            // For vertical mode, calculate relative position based on scrollTop
            const totalHeight = this.viewer.scrollHeight;
            relativeScrollPosition = this.viewer.scrollTop / totalHeight;
            
            // Modo vertical - mantém o comportamento original
            this.container.querySelectorAll('img[data-type="image"]').forEach(img => {
                img.style.width = `${100 * this.zoomLevel}%`;
                img.style.maxWidth = `${100 * this.zoomLevel}%`;
            });
            
            this.container.querySelectorAll('.epub-container, .txt-container').forEach(container => {
                container.style.width = `${100 * this.zoomLevel}%`;
            });
            
            // Recarregar PDFs com novo zoom
            this.container.querySelectorAll('.pdf-container').forEach(container => {
                this.reloadPdfWithZoom(container, this.zoomLevel);
            });
        }
        
        // After DOM updates, restore the relative scroll position
        setTimeout(() => {
            if (this.container.classList.contains('horizontal')) {
                const newTotalWidth = this.viewer.scrollWidth;
                this.viewer.scrollLeft = relativeScrollPosition * newTotalWidth;
            } else {
                const newTotalHeight = this.viewer.scrollHeight;
                this.viewer.scrollTop = relativeScrollPosition * newTotalHeight;
            }
        }, 50);
    }

    // Novo método para recarregar PDF com zoom atualizado
    async reloadPdfWithZoom(pdfContainer, zoomLevel) {
        try {
            // Obter a URL do PDF e o número da página atual
            const pdfUrl = pdfContainer.dataset.pdfUrl;
            if (!pdfUrl) return;
            
            // Salvar a posição de rolagem atual
            const scrollTop = this.viewer.scrollTop;
            const scrollLeft = this.viewer.scrollLeft;
            
            // Limpar o container
            pdfContainer.innerHTML = '';
            
            // Atualizar a largura do container
            if (this.container.classList.contains('horizontal')) {
                pdfContainer.style.maxHeight = `${80 * zoomLevel}vh`;
                pdfContainer.style.height = 'auto';
                pdfContainer.style.width = 'auto';
            } else {
                pdfContainer.style.width = `${100 * zoomLevel}%`;
            }
            
            // Carregar o PDF
            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            const pdfDoc = await loadingTask.promise;
            
            // Renderizar cada página com o novo zoom
            const numPages = parseInt(pdfContainer.dataset.numPages) || pdfDoc.numPages;
            for (let i = 1; i <= numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: zoomLevel });
                
                const canvasContainer = document.createElement('div');
                canvasContainer.className = 'pdf-page';
                canvasContainer.dataset.pageNum = i;
                
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
            
            // Restaurar a posição de rolagem
            setTimeout(() => {
                this.viewer.scrollTop = scrollTop;
                this.viewer.scrollLeft = scrollLeft;
            }, 50);
            
        } catch (error) {
            console.error('Error reloading PDF with zoom:', error);
        }
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
                // Add fullscreen-active class to body
                document.body.classList.add('fullscreen-active');
                // Enable auto-hide controls when entering fullscreen
                this.enableAutoHideControls();
            }).catch(err => {
                console.error('Erro ao entrar em tela cheia:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                // Remove fullscreen-active class from body
                document.body.classList.remove('fullscreen-active');
                // Disable auto-hide controls when exiting fullscreen
                this.disableAutoHideControls();
            }).catch(err => {
                console.error('Erro ao sair da tela cheia:', err);
            });
        }
    }

    enableAutoHideControls() {
        // Store references to elements
        this.header = document.querySelector('header');
        this.floatingControls = document.querySelector('.floating-controls');
        this.viewer = document.getElementById('viewer');
        
        // Add visible class initially
        if (this.header) this.header.classList.add('visible');
        if (this.floatingControls) this.floatingControls.classList.add('visible');
        
        // Set up mouse movement tracking
        this.mouseTimeout = null;
        
        // Define the mousemove handler
        this.mouseMoveHandler = () => {
            // Show controls
            if (this.header) this.header.classList.add('visible');
            if (this.floatingControls) this.floatingControls.classList.add('visible');
            if (this.viewer) this.viewer.classList.remove('expanded');
            
            // Clear any existing timeout
            if (this.mouseTimeout) {
                clearTimeout(this.mouseTimeout);
            }
            
            // Set timeout to hide controls after 2 seconds
            this.mouseTimeout = setTimeout(() => {
                if (this.header) this.header.classList.remove('visible');
                if (this.floatingControls) this.floatingControls.classList.remove('visible');
                if (this.viewer) this.viewer.classList.add('expanded');
            }, 2000);
        };
        
        // Add event listener
        document.addEventListener('mousemove', this.mouseMoveHandler);
        
        // Initial timeout to hide controls
        this.mouseTimeout = setTimeout(() => {
            if (this.header) this.header.classList.remove('visible');
            if (this.floatingControls) this.floatingControls.classList.remove('visible');
            if (this.viewer) this.viewer.classList.add('expanded');
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
        if (this.viewer) {
            this.viewer.classList.remove('expanded');
        }
    }

    setScrollDirection(direction) {
        this.container.className = `images-container ${direction}`;
        
        // Aplicar estilos específicos para o modo horizontal
        if (direction === 'horizontal') {
            this.container.style.alignItems = 'center';
            this.container.querySelectorAll('img[data-type="image"]').forEach(img => {
                img.style.maxHeight = `${80 * this.zoomLevel}vh`;
                img.style.height = 'auto';
                img.style.width = 'auto';
            });
            
            this.container.querySelectorAll('.pdf-container, .epub-container, .txt-container').forEach(container => {
                container.style.maxHeight = `${80 * this.zoomLevel}vh`;
                container.style.height = 'auto';
                container.style.width = 'auto';
            });
        } else {
            // Restaurar estilos para o modo vertical
            this.container.querySelectorAll('img[data-type="image"]').forEach(img => {
                img.style.maxHeight = '';
                img.style.height = '';
                img.style.width = `${100 * this.zoomLevel}%`;
                img.style.maxWidth = `${100 * this.zoomLevel}%`;
            });
            
            this.container.querySelectorAll('.pdf-container, .epub-container, .txt-container').forEach(container => {
                container.style.maxHeight = '';
                container.style.height = '';
                container.style.width = `${100 * this.zoomLevel}%`;
            });
        }
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

    addPdfStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .pdf-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
            }
            .pdf-page {
                margin-bottom: 2px;
                display: flex;
                justify-content: center;
            }
            .pdf-page canvas {
                max-width: 100%;
                height: auto;
            }
            
            /* Adjust header height to be 2/3 of current size */
            :root {
                --header-height: 40px;
            }
            
            /* Only apply these styles when in fullscreen mode */
            body.fullscreen-active #viewer {
                transition: height 0.3s ease, top 0.3s ease;
                height: calc(100vh - var(--header-height));
                top: var(--header-height);
            }
            
            body.fullscreen-active #viewer.expanded {
                height: 100vh;
                top: 0;
            }
            
            /* Header styles */
            body.fullscreen-active header {
                transition: transform 0.3s ease;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                height: var(--header-height);
            }
            
            body.fullscreen-active header.visible {
                transform: translateY(0);
            }
            
            body.fullscreen-active header:not(.visible) {
                transform: translateY(-100%);
            }
        `;
        document.head.appendChild(style);
    }
}