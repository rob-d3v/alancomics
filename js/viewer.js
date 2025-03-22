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
                this.viewer.scrollLeft += scrollStep;
                if (this.viewer.scrollLeft >= this.viewer.scrollWidth - this.viewer.clientWidth) {
                    this.viewer.scrollLeft = 0;
                }
            } else {
                this.viewer.scrollTop += scrollStep;
                if (this.viewer.scrollTop >= this.viewer.scrollHeight - this.viewer.clientHeight) {
                    this.viewer.scrollTop = 0;
                }
            }
        }, 50);
    }

    stopAutoScroll() {
        this.isScrolling = false;
        clearInterval(this.scrollInterval);
    }

    async displayImages(images) {
        this.container.innerHTML = '';
        for (const image of images) {
            const img = document.createElement('img');
            img.src = image.data;
            img.dataset.id = image.id;
            this.container.appendChild(img);
        }
    }
}