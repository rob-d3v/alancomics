class ComicsViewer {
    constructor() {
        this.container = document.getElementById('imagesContainer');
        this.viewer = document.getElementById('viewer');
        this.zoomLevel = 1;
        this.isScrolling = false;
        this.scrollInterval = null;
        this.initControls();
    }

    initControls() {
        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(0.1));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(-0.1));
        document.getElementById('backToTop').addEventListener('click', () => this.scrollToTop());
        document.getElementById('fullscreen').addEventListener('click', () => this.toggleFullscreen());
    }

    zoom(delta) {
        this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel + delta));
        this.container.querySelectorAll('img').forEach(img => {
            // Apply zoom only to the image itself, not affecting the container
            img.style.width = `${100 * this.zoomLevel}%`;
            img.style.maxWidth = `${100 * this.zoomLevel}%`;
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
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
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
        const scrollStep = speed * 2;

        this.scrollInterval = setInterval(() => {
            if (this.container.classList.contains('horizontal')) {
                if (this.viewer.scrollLeft >= this.viewer.scrollWidth - this.viewer.clientWidth) {
                    this.stopAutoScroll();
                    document.dispatchEvent(new CustomEvent('autoScrollComplete'));
                    return;
                }
                this.viewer.scrollLeft += scrollStep;
            } else {
                if (this.viewer.scrollTop >= this.viewer.scrollHeight - this.viewer.clientHeight) {
                    this.stopAutoScroll();
                    document.dispatchEvent(new CustomEvent('autoScrollComplete'));
                    return;
                }
                this.viewer.scrollTop += scrollStep;
            }
        }, 50);
    }

    stopAutoScroll() {
        this.isScrolling = false;
        clearInterval(this.scrollInterval);
    }

    async displayImages(images) {
        this.container.innerHTML = '';
        
        if (!images || images.length === 0) {
            return;
        }

        images.forEach(image => {
            const imgElement = document.createElement('img');
            imgElement.src = image.data;
            imgElement.dataset.id = image.id;
            imgElement.style.width = `${100 * this.zoomLevel}%`;
            imgElement.style.maxWidth = `${100 * this.zoomLevel}%`;
            imgElement.style.display = 'block'; // Ensure image is visible
            imgElement.onerror = () => {
                console.error('Failed to load image:', image.id);
                imgElement.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
            };
            this.container.appendChild(imgElement);
        });

        // Force layout recalculation
        this.container.style.display = 'none';
        this.container.offsetHeight; // Force reflow
        this.container.style.display = '';
    }
}