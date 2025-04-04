class Sidebar {
    constructor(comicsDB, viewer) {
        this.db = comicsDB;
        this.viewer = viewer;
        this.sidebar = document.getElementById('sidebar');
        this.dropZone = document.getElementById('dropZone');
        this.thumbnailsContainer = document.getElementById('thumbnailsContainer');
        this.isRunning = false;
        
        // Add auto-scroll complete listener
        document.addEventListener('autoScrollComplete', () => {
            this.stopViewer();
        });
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.initializeDropZone();
        this.initializeSettings();
        this.initializeSidebarToggle();
        this.initializeClearAll();
        this.loadExistingImages(); // Keep this name consistent
    }

    initializeDropZone() {
        this.dropZone.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,application/pdf,application/epub+zip,text/plain,.txt';
            
            input.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                
                // Process files in sequence to maintain order
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    await this.processFile(file);
                }
                await this.loadExistingImages(); // Change to match the method name
            });
            
            input.click();
        });

        // Update drop handler to maintain order as well
        this.dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            
            // Process files in sequence to maintain order
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                await this.processFile(file);
            }
            await this.loadExistingImages(); // Change to match the method name
        });

        // Keep existing dragover and dragleave handlers
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('drag-over');
        });
    }

    async processFile(file) {
        const fileType = file.type;
        const fileName = file.name;
        
        if (fileType.startsWith('image/')) {
            const imageData = await this.readFileAsDataURL(file);
            await this.db.addContent(imageData, 'image', fileName);
        } 
        else if (fileType === 'application/pdf') {
            const pdfData = await this.readFileAsDataURL(file);
            await this.db.addContent(pdfData, 'pdf', fileName);
        }
        else if (fileType === 'application/epub+zip') {
            const epubData = await this.readFileAsDataURL(file);
            await this.db.addContent(epubData, 'epub', fileName);
        }
        else if (fileType === 'text/plain' || fileName.toLowerCase().endsWith('.txt')) {
            const txtData = await this.readFileAsDataURL(file);
            await this.db.addContent(txtData, 'txt', fileName);
        }
    }

    initializeSettings() {
        document.getElementById('scrollDirection').addEventListener('change', (e) => {
            this.viewer.setScrollDirection(e.target.value);
        });

        document.getElementById('spacing').addEventListener('input', (e) => {
            this.viewer.setSpacing(e.target.value);
        });

        // Melhorar o controle de velocidade de rolagem
        const speedSlider = document.getElementById('scrollSpeed');
        const speedValue = document.getElementById('speedValue');
        
        // Configurar o slider para valores menores
        speedSlider.min = "0.1";  // Velocidade mínima muito mais lenta
        speedSlider.max = "10";
        speedSlider.step = "0.1";  // Permitir incrementos menores
        speedSlider.value = "1";   // Valor padrão moderado
        
        // Atualizar o valor exibido quando o slider mudar
        speedSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            speedValue.textContent = value.toFixed(1);
        });
        
        // Inicializar o valor exibido
        speedValue.textContent = parseFloat(speedSlider.value).toFixed(1);

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
        
        for (let i = 5; i > 0; i--) {
            countdown.textContent = i;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        countdown.style.display = 'none';
        this.isRunning = true;
        
        const startButton = document.getElementById('startButton');
        startButton.innerHTML = '<i class="fas fa-stop"></i> Parar';
        startButton.classList.add('active');
        
        // Usar o valor exato do slider para a velocidade
        const speed = parseFloat(document.getElementById('scrollSpeed').value);
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
        const sidebarToggle = document.getElementById('sidebarToggle');
        const floatingControls = document.querySelector('.floating-controls');
        const header = document.querySelector('header');
        const viewer = document.getElementById('viewer');
        let mouseTimeout = null;
        let isAutoHideEnabled = false;
        
        // Função para ocultar elementos após 2 segundos
        const setupAutoHide = () => {
            if (isAutoHideEnabled) {
                // Limpar qualquer timeout existente
                if (mouseTimeout) {
                    clearTimeout(mouseTimeout);
                }
                
                // Mostrar elementos
                sidebarToggle.classList.add('visible');
                floatingControls.classList.add('visible');
                header.classList.add('visible');
                viewer.classList.remove('header-hidden');
                
                // Configurar timeout para ocultar após 2 segundos
                mouseTimeout = setTimeout(() => {
                    sidebarToggle.classList.remove('visible');
                    floatingControls.classList.remove('visible');
                    header.classList.remove('visible');
                    viewer.classList.add('header-hidden');
                }, 2000);
            }
        };
        
        // Alternar entre sidebar colapsada e expandida
        sidebarToggle.addEventListener('click', () => {
            this.sidebar.classList.toggle('collapsed');
            this.viewer.viewer.classList.toggle('full-width');
            
            // Ativar/desativar auto-hide quando a sidebar estiver colapsada
            isAutoHideEnabled = this.sidebar.classList.contains('collapsed');
            
            if (isAutoHideEnabled) {
                // Adicionar listener de movimento do mouse
                document.addEventListener('mousemove', setupAutoHide);
                // Iniciar o timeout inicial
                setupAutoHide();
            } else {
                // Remover listener e garantir que os elementos estejam visíveis
                document.removeEventListener('mousemove', setupAutoHide);
                if (mouseTimeout) {
                    clearTimeout(mouseTimeout);
                }
                sidebarToggle.classList.add('visible');
                floatingControls.classList.add('visible');
                header.classList.add('visible');
                viewer.classList.remove('header-hidden');
            }
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
        const images = await this.db.getAllContent(); // Change to use the new method name
        console.log('Loading content:', images.length); // Debug log
        await this.viewer.displayContent(images); // Change to use the new method name
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
        
        // Aqui está o erro - você está usando 'item' em vez de 'image'
        if (image.type === 'image') {
            img.src = image.data;
        } else if (image.type === 'pdf') {
            img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIj48cGF0aCBmaWxsPSIjZmY1NzIyIiBkPSJNMTgxLjkgMjU2LjFjLTUtMTYtNC45LTMyLjctLjEtNDguNiA3LjQtMjUuOCAyMy43LTQyLjMgNDcuOS00Mi4zIDI0LjYgMCA0MC4zIDE2LjkgNDcuOCA0Mi4yIDQuMS0xMy42IDQuMy0yNy4yIDEuOS00MC44SDEzMi4xYy0xMy4zIDAtMjQuMiAxMC45LTI0LjIgMjQuMnYxMzkuNmMwIDEzLjMgMTAuOSAyNC4yIDI0LjIgMjQuMmgxNzAuNGMxMy4zIDAgMjQuMi0xMC45IDI0LjItMjQuMlYyNTZIMTgxLjl6TTIwNy4yIDMwNGMtMTQuOC0xNi0zMS41LTI4LjgtNDkuNS0zNi44IDEzLjMtMTIuMyAyNC4yLTI3LjggMzEuNi00NS44IDguNyAyMC44IDIwLjcgMzcuMSAzNC45IDQ4LjQtMTQuMS0xLjQtMTIuNy0xLjktMTctNS44ek0zMzYgMTI4SDQ4Yy0yNi41IDAtNDggMjEuNS00OCA0OHYyNTZjMCAyNi41IDIxLjUgNDggNDggNDhoMjg4YzI2LjUgMCA0OC0yMS41IDQ4LTQ4VjE3NmMwLTI2LjUtMjEuNS00OC00OC00OHptMCAzMDRINDhWMTc2aDI4OHYyNTZ6Ii8+PC9zdmc+';
        } else if (image.type === 'epub') {
            img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NDggNTEyIj48cGF0aCBmaWxsPSIjMDA5Njg4IiBkPSJNNDQ4IDE2MFYzMjBDNDQ4IDM1Ny4zIDQxOC4zIDM4NyAzODEgMzg3SDEyMEw2OCA0MzlWMzg3SDY3QzI5LjcgMzg3IDAgMzU3LjMgMCAzMjBWMTYwQzAgMTIyLjcgMjkuNyA5MyA2NyA5M0gzODFDNDE4LjMgOTMgNDQ4IDEyMi43IDQ0OCAxNjB6TTEyOCAyMTZjMC04LjgtNy4yLTE2LTE2LTE2SDgwYy04LjggMC0xNiA3LjItMTYgMTZ2NjRjMCA4LjggNy4yIDE2IDE2IDE2aDMyYzguOCAwIDE2LTcuMiAxNi0xNnYtNjR6TTI1NiAyMTZjMC04LjgtNy4yLTE2LTE2LTE2aC0zMmMtOC44IDAtMTYgNy4yLTE2IDE2djY0YzAgOC44IDcuMiAxNiAxNiAxNmgzMmM4LjggMCAxNi03LjIgMTYtMTZ2LTY0ek0zODQgMjE2YzAtOC44LTcuMi0xNi0xNi0xNmgtMzJjLTguOCAwLTE2IDcuMi0xNiAxNnY2NGMwIDguOCA3LjIgMTYgMTYgMTZoMzJjOC44IDAgMTYtNy4yIDE2LTE2di02NHoiLz48L3N2Zz4=';
        } else {
            // Default icon for unknown types
            img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIj48cGF0aCBmaWxsPSIjOWU5ZTllIiBkPSJNMzY5LjkgOTcuOUwyODYgMTRDMjc3IDUgMjY0LjggLS4xIDI1Mi4xLS4xSDQ4QzIxLjUgMCA0IDIxLjUgNCA0OHY0MTZjMCAyNi41IDIxLjUgNDggNDggNDhoMjg4YzI2LjUgMCA0OC0yMS41IDQ4LTQ4VjEzMS45YzAtMTIuNy01LjEtMjUtMTQuMS0zNHpNMzMyLjEgMTI4SDI1NlY1MS45bDc2LjEgNzYuMXpNNDggNDY0VjQ4aDE2MHY5NmMwIDEzLjMgMTAuNyAyNCAyNCAyNGg5NnYyOTZINDh6Ii8+PC9zdmc+';
        }
        
        // Add file name as title
        div.title = image.name || '';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = async () => {
            await this.db.removeContent(image.id);
            await this.loadExistingImages();
        };
        
        div.appendChild(img);
        div.appendChild(removeBtn);
        return div;
    }

    // Add helper method to read file
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.error);
            reader.readAsDataURL(file);
        });
    }
}