class Sidebar {
    constructor(comicsDB, viewer) {
        this.db = comicsDB;
        this.viewer = viewer;
        this.sidebar = document.getElementById('sidebar');
        this.dropZone = document.getElementById('dropZone');
        this.thumbnailsContainer = document.getElementById('thumbnailsContainer');
        this.isRunning = false;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.initializeDropZone();
        this.initializeSettings();
        this.initializeSidebarToggle();
        this.initializeClearAll();
        this.loadExistingImages();
    }

    initializeDropZone() {
        // Add click handler for file selection
        this.dropZone.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*';
            
            input.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files).filter(file => 
                    file.type.startsWith('image/'));
                
                for (const file of files) {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        await this.db.addImage(e.target.result);
                        await this.loadExistingImages();
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            input.click();
        });

        // Existing drag and drop handlers
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('drag-over');
        });

        this.dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('image/'));

            for (const file of files) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    await this.db.addImage(e.target.result);
                    await this.loadExistingImages();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    initializeSettings() {
        document.getElementById('scrollDirection').addEventListener('change', (e) => {
            this.viewer.setScrollDirection(e.target.value);
        });

        document.getElementById('spacing').addEventListener('input', (e) => {
            this.viewer.setSpacing(e.target.value);
        });

        const startButton = document.getElementById('startButton');
        startButton.addEventListener('click', () => {
            if (this.isRunning) {
                this.stopViewer();
            } else {
                this.startViewer();
            }
        });
    }

    async startViewer() {
        if (this.isRunning) return;

        const countdown = document.getElementById('countdown');
        countdown.style.display = 'block';
        
        for (let i = 3; i > 0; i--) {
            countdown.textContent = i;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        countdown.style.display = 'none';
        this.isRunning = true;
        
        const startButton = document.getElementById('startButton');
        startButton.innerHTML = '<i class="fas fa-stop"></i> Parar';
        startButton.classList.add('active');
        
        const speed = document.getElementById('scrollSpeed').value;
        this.viewer.startAutoScroll(speed);
        
        this.disableControls(true);
    }

    stopViewer() {
        this.isRunning = false;
        const startButton = document.getElementById('startButton');
        startButton.innerHTML = '<i class="fas fa-play"></i> Iniciar';
        startButton.classList.remove('active');
        
        this.viewer.stopAutoScroll();
        this.disableControls(false);
    }

    disableControls(disabled) {
        const controls = [
            'scrollDirection',
            'spacing',
            'scrollSpeed',
            'dropZone'
        ];
        
        controls.forEach(id => {
            document.getElementById(id).disabled = disabled;
        });
    }

    initializeSidebarToggle() {
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.sidebar.classList.toggle('collapsed');
            this.viewer.viewer.classList.toggle('full-width');
        });
    }

    initializeClearAll() {
        document.getElementById('clearAll').addEventListener('click', async () => {
            if (confirm('Deseja remover todas as imagens?')) {
                await this.db.clearAll();
                await this.loadExistingImages();
            }
        });
    }

    async loadExistingImages() {
        const images = await this.db.getAllImages();
        await this.viewer.displayImages(images);
        this.updateThumbnails(images);
    }

    updateThumbnails(images) {
        this.thumbnailsContainer.innerHTML = '';
        images.forEach(image => {
            const thumbnail = this.createThumbnail(image);
            this.thumbnailsContainer.appendChild(thumbnail);
        });
    }

    createThumbnail(image) {
        const div = document.createElement('div');
        div.className = 'thumbnail';
        
        const img = document.createElement('img');
        img.src = image.data;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = async () => {
            await this.db.removeImage(image.id);
            await this.loadExistingImages();
        };
        
        div.appendChild(img);
        div.appendChild(removeBtn);
        return div;
    }
}