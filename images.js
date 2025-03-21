// Melhorias de performance para o carregamento de imagens
function enhanceImageLoading() {
    // Melhorar a função processFiles para otimizar o carregamento de imagens
    const processFilesOriginal = window.processFiles;
    
    window.processFiles = function(files) {
        if (files.length === 0) {
            return;
        }
        
        // Mostrar indicador de carregamento
        const loadingIndicator = document.getElementById('loading');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }
        
        // Contadores para acompanhar o progresso
        let processedCount = 0;
        const totalFiles = files.length;
        
        // Processar os arquivos em lotes para evitar bloqueio do navegador
        function processFileBatch(startIndex, batchSize) {
            const endIndex = Math.min(startIndex + batchSize, totalFiles);
            
            // Processar um lote de arquivos
            for (let i = startIndex; i < endIndex; i++) {
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    
                    reader.onload = function (e) {
                        const imageData = {
                            name: file.name,
                            type: file.type,
                            data: e.target.result,
                            date: new Date().toISOString()
                        };
                        
                        saveImageToDB(imageData);
                        processedCount++;
                        
                        // Atualizar o indicador de progresso, se existir
                        updateLoadingProgress(processedCount, totalFiles);
                        
                        // Verificar se todos os arquivos foram processados
                        if (processedCount >= totalFiles) {
                            if (loadingIndicator) {
                                // Esconder o indicador após um pequeno atraso para garantir que a UI foi atualizada
                                setTimeout(() => {
                                    loadingIndicator.style.display = 'none';
                                }, 500);
                            }
                        }
                    };
                    
                    reader.onerror = function (e) {
                        console.error(`Erro ao ler arquivo ${file.name}:`, e);
                        processedCount++;
                        
                        // Atualizar o indicador de progresso mesmo em caso de erro
                        updateLoadingProgress(processedCount, totalFiles);
                        
                        // Verificar se todos os arquivos foram processados
                        if (processedCount >= totalFiles && loadingIndicator) {
                            setTimeout(() => {
                                loadingIndicator.style.display = 'none';
                            }, 500);
                        }
                    };
                    
                    reader.readAsDataURL(file);
                } else {
                    // Arquivos não-imagem são contados, mas ignorados
                    processedCount++;
                }
            }
            
            // Se ainda houver arquivos a processar, agendar o próximo lote com um timeout
            if (endIndex < totalFiles) {
                setTimeout(() => {
                    processFileBatch(endIndex, batchSize);
                }, 100); // Pequeno atraso para permitir que a UI responda
            }
        }
        
        // Iniciar o processamento em lotes (5 arquivos por vez)
        processFileBatch(0, 5);
    };

    // Função para atualizar o indicador de progresso
    function updateLoadingProgress(current, total) {
        const loadingIndicator = document.getElementById('loading');
        if (!loadingIndicator) return;
        
        // Verificar se já existe um elemento de texto no indicador
        let progressText = loadingIndicator.querySelector('.progress-text');
        
        if (!progressText) {
            // Criar elemento de texto para o progresso
            progressText = document.createElement('div');
            progressText.className = 'progress-text';
            loadingIndicator.appendChild(progressText);
        }
        
        // Calcular a porcentagem de progresso
        const percentage = Math.round((current / total) * 100);
        progressText.textContent = `Carregando imagens: ${percentage}% (${current}/${total})`;
    }
    
    // Melhorar a função renderImages para carregar imagens de forma mais eficiente
    const renderImagesOriginal = window.renderImages;
    
    window.renderImages = function() {
        const imageContainer = document.getElementById('imageContainer');
        const viewer = document.getElementById('viewer');
        
        if (!imageContainer || !viewer) {
            return;
        }
        
        imageContainer.innerHTML = '';
        stopScrolling();
        
        if (images.length === 0) {
            const noImages = document.createElement('div');
            noImages.className = 'no-images';
            noImages.textContent = 'Nenhuma imagem carregada. Adicione imagens usando o painel à esquerda.';
            imageContainer.appendChild(noImages);
            return;
        }
        
        viewer.classList.remove('vertical-scroll', 'horizontal-scroll');
        viewer.classList.add(isVertical ? 'vertical-scroll' : 'horizontal-scroll');
        
        if (isVertical) {
            imageContainer.style.width = 'fit-content';
            imageContainer.style.maxWidth = '100%';
            imageContainer.style.height = 'auto';
            imageContainer.style.display = 'flex';
            imageContainer.style.flexDirection = 'column';
            imageContainer.style.alignItems = 'center';
        } else {
            imageContainer.style.width = 'auto';
            imageContainer.style.height = 'fit-content';
            imageContainer.style.maxHeight = '100%';
            imageContainer.style.display = 'flex';
            imageContainer.style.flexDirection = 'row';
            imageContainer.style.alignItems = 'center';
        }
        
        // Mostrar indicador de carregamento
        const loadingIndicator = document.getElementById('loading');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
            updateLoadingProgress(0, images.length);
        }
        
        // Renderizar apenas as primeiras imagens visíveis, depois carregar as restantes
        const initialBatchSize = 5; // Número de imagens a carregar inicialmente
        let loadedCount = 0;
        
        // Criar placeholders para todas as imagens
        images.forEach((image, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.dataset.index = index;
            
            // Aplicar espaçamento
            if (index > 0) {
                if (isVertical) {
                    imageItem.style.marginTop = `${imageSpacing}px`;
                } else {
                    imageItem.style.marginLeft = `${imageSpacing}px`;
                }
            }
            
            // Criar um placeholder até que a imagem seja carregada
            const placeholder = document.createElement('div');
            placeholder.className = 'image-placeholder';
            placeholder.style.width = '300px';
            placeholder.style.height = '300px';
            placeholder.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
            placeholder.style.display = 'flex';
            placeholder.style.justifyContent = 'center';
            placeholder.style.alignItems = 'center';
            
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            placeholder.appendChild(spinner);
            
            imageItem.appendChild(placeholder);
            imageContainer.appendChild(imageItem);
        });
        
        // Função para carregar as imagens em lotes
        function loadImageBatch(startIndex, batchSize) {
            const endIndex = Math.min(startIndex + batchSize, images.length);
            
            for (let i = startIndex; i < endIndex; i++) {
                const imageData = images[i];
                const imageItem = imageContainer.querySelector(`.image-item[data-index="${i}"]`);
                
                if (!imageItem) continue;
                
                // Substituir o placeholder pela imagem real
                const img = document.createElement('img');
                img.src = imageData.data;
                img.alt = imageData.name;
                img.loading = "lazy";
                
                img.onload = function() {
                    // Remover o placeholder e adicionar a imagem
                    while (imageItem.firstChild) {
                        imageItem.removeChild(imageItem.firstChild);
                    }
                    
                    imageItem.appendChild(img);
                    loadedCount++;
                    
                    // Atualizar o indicador de progresso
                    if (loadingIndicator) {
                        updateLoadingProgress(loadedCount, images.length);
                    }
                    
                    // Verificar se todas as imagens foram carregadas
                    if (loadedCount >= images.length) {
                        // Esconder o indicador de carregamento
                        if (loadingIndicator) {
                            loadingIndicator.style.display = 'none';
                        }
                        
                        // Ajustar o layout final
                        adjustImageContainer();
                        centerImages();
                    }
                };
                
                img.onerror = function() {
                    console.error(`Erro ao carregar imagem: ${imageData.name}`);
                    loadedCount++;
                    
                    // Mostrar mensagem de erro no placeholder
                    while (imageItem.firstChild) {
                        imageItem.removeChild(imageItem.firstChild);
                    }
                    
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Erro ao carregar imagem';
                    errorMsg.style.color = 'red';
                    errorMsg.style.padding = '20px';
                    imageItem.appendChild(errorMsg);
                    
                    // Atualizar o indicador de progresso mesmo em caso de erro
                    if (loadingIndicator) {
                        updateLoadingProgress(loadedCount, images.length);
                    }
                    
                    // Verificar se todas as imagens foram carregadas
                    if (loadedCount >= images.length && loadingIndicator) {
                        loadingIndicator.style.display = 'none';
                    }
                };
            }
            
            // Se ainda houver imagens para carregar, agendar o próximo lote
            if (endIndex < images.length) {
                setTimeout(() => {
                    loadImageBatch(endIndex, batchSize);
                }, 100); // Pequeno atraso para permitir que a UI responda
            }
        }
        
        // Iniciar o carregamento com o primeiro lote
        loadImageBatch(0, initialBatchSize);
        
        resetScrollPosition();
        updateNavigationButtons();
    };
    
    // Melhorar a função loadImagesFromDB para otimizar o carregamento inicial
    const loadImagesFromDBOriginal = window.loadImagesFromDB;
    
    window.loadImagesFromDB = function() {
        try {
            if (!db) {
                console.error("Banco de dados não inicializado");
                return;
            }
            
            // Mostrar indicador de carregamento
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'flex';
                loadingIndicator.querySelector('.spinner').textContent = 'Carregando banco de dados...';
            }
            
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = function(event) {
                // Armazenar os dados do banco de dados
                const dbImages = event.target.result;
                
                // Processar os dados em um worker para não bloquear a UI
                const workerCode = `
                    self.onmessage = function(e) {
                        const images = e.data;
                        // Simplesmente retornar os dados, o processamento pesado já está no IndexedDB
                        self.postMessage(images);
                    };
                `;
                
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const worker = new Worker(URL.createObjectURL(blob));
                
                worker.onmessage = function(e) {
                    images = e.data;
                    
                    // Atualizar a UI
                    updateImageCounter();
                    renderThumbnails();
                    renderImages();
                    
                    // Esconder o indicador de carregamento
                    if (loadingIndicator) {
                        loadingIndicator.style.display = 'none';
                    }
                };
                
                worker.onerror = function(e) {
                    console.error("Erro no worker:", e);
                    
                    // Em caso de erro, continuar de forma síncrona
                    images = dbImages;
                    updateImageCounter();
                    renderThumbnails();
                    renderImages();
                    
                    if (loadingIndicator) {
                        loadingIndicator.style.display = 'none';
                    }
                };
                
                // Enviar os dados para o worker
                worker.postMessage(dbImages);
            };
            
            request.onerror = function(event) {
                console.error("Erro ao carregar imagens do banco de dados:", event);
                
                images = [];
                updateImageCounter();
                renderThumbnails();
                renderImages();
                
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
            };
        } catch (error) {
            console.error("Exceção ao carregar imagens:", error);
            
            images = [];
            updateImageCounter();
            renderThumbnails();
            renderImages();
            
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        }
    };
}

// Função para adicionar estilos CSS para melhorar a UI durante o carregamento
function addLoadingStyles() {
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    
    const css = `
        .loading {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-size: 16px;
        }
        
        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: var(--primary-color, #4a6cf7);
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 20px;
        }
        
        .progress-text {
            margin-top: 15px;
            font-size: 14px;
            color: white;
        }
        
        .image-placeholder {
            background-color: rgba(200, 200, 200, 0.2);
            border-radius: 4px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-width: 100px;
            min-height: 100px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Estilos para minimizar o impacto na performance de renderização */
        .image-item img {
            will-change: transform;
            transform: translateZ(0);
        }
        
        .viewer {
            will-change: transform;
        }
    `;
    
    if (styleElement.styleSheet) {
        styleElement.styleSheet.cssText = css;
    } else {
        styleElement.appendChild(document.createTextNode(css));
    }
    
    document.head.appendChild(styleElement);
}

// Função para aplicar todas as melhorias de performance
function applyPerformanceFixes() {
    // Adicionar estilos de carregamento
    addLoadingStyles();
    
    // Aplicar melhorias de performance no carregamento de imagens
    enhanceImageLoading();
    
    // Adicionar tratamento de erros global para evitar travamentos
    window.addEventListener('error', function(e) {
        console.error("Erro capturado:", e.message, e.filename, e.lineno, e.colno, e.error);
        
        // Esconder o indicador de carregamento em caso de erro
        const loadingIndicator = document.getElementById('loading');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        // Evitar que erros travem completamente a aplicação
        return true;
    });
}