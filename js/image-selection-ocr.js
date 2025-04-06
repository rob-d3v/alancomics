/**
 * ImageSelectionOCR - Permite selecionar áreas retangulares de texto em imagens
 * para extração e narração sequencial com processamento em background
 * 
 * Este módulo implementa uma interface avançada para selecionar regiões de texto em imagens,
 * extrair o texto dessas regiões usando OCR e enviá-lo para narração na ordem correta,
 * iniciando a narração assim que o primeiro trecho estiver pronto.
 */
class ImageSelectionOCR {
    constructor() {
        // Estado da seleção
        this.isSelectionModeActive = false;
        this.currentImage = null;
        this.selections = [];
        this.currentSelection = null;
        this.startX = 0;
        this.startY = 0;
        this.isMouseDown = false;
        
        // Elementos DOM
        this.selectionControls = null;
        this.selectionIndicator = null;
        
        // Referências a outros módulos
        this.narrator = null;
        this.ocrProcessor = null;
        this.processingQueue = null;
        
        // Inicializar
        this.initialize();
    }
    
    /**
     * Inicializa o módulo de seleção de texto em imagens
     */
    initialize() {
        // Esperar o DOM estar completamente carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    /**
     * Configura o módulo de seleção
     */
    setup() {
        // Obter referência ao narrador principal
        if (window.comicNarrator) {
            this.narrator = window.comicNarrator;
            console.log('ImageSelectionOCR: Conectado ao narrador principal');
        } else {
            console.warn('ImageSelectionOCR: Narrador principal não encontrado');
            // Tentar novamente após um curto período
            setTimeout(() => {
                if (window.comicNarrator) {
                    this.narrator = window.comicNarrator;
                    console.log('ImageSelectionOCR: Conectado ao narrador principal (tentativa 2)');
                }
            }, 1000);
        }
        
        // Inicializar o processador OCR
        this.ocrProcessor = new OCRProcessor();
        
        // Inicializar a fila de processamento em background
        this.processingQueue = new BackgroundProcessingQueue();
        
        // Configurar callbacks da fila
        this.setupQueueCallbacks();
        
        // Adicionar botão ao menu de narração
        this.addSelectionButton();
        
        // Criar controles de seleção (inicialmente ocultos)
        this.createSelectionControls();
        
        // Criar indicador de modo de seleção
        this.createSelectionIndicator();
    }
    
    /**
     * Configura os callbacks da fila de processamento
     */
    setupQueueCallbacks() {
        // Quando um item é processado (um trecho de texto é extraído)
        this.processingQueue.setOnItemProcessed((result, metadata, index) => {
            console.log(`Trecho #${index + 1} processado:`, result.substring(0, 50) + '...');
            
            // Se for o primeiro item, iniciar narração imediatamente
            if (index === 0 && result && result.trim()) {
                this.startNarrationWithText(result);
            }
            
            // Atualizar o progresso visual
            const stats = this.processingQueue.getStats();
            this.updateProgressIndicator(
                `Processando seleções: ${stats.processedItems}/${stats.totalItems} (${Math.round(stats.progress * 100)}%)`
            );
            
            // Adicionar o texto extraído ao elemento visual
            this.appendExtractedText(result, index);
        });
        
        // Quando a fila é concluída
        this.processingQueue.setOnQueueCompleted((stats) => {
            console.log('Processamento de todos os trechos concluído:', stats);
            
            // Ocultar indicador de progresso
            this.hideProgressIndicator();
            
            // Mostrar notificação de conclusão
            this.showNotification('Todos os trechos foram processados e enviados para narração', 'success');
            
            // Desativar modo de seleção
            this.disableSelectionMode();
        });
        
        // Quando ocorre um erro
        this.processingQueue.setOnError((error, metadata, index) => {
            console.error(`Erro ao processar trecho #${index + 1}:`, error);
            
            // Mostrar notificação de erro
            this.showNotification(`Erro ao processar trecho #${index + 1}: ${error.message}`, 'error');
            
            // Adicionar mensagem de erro ao elemento visual
            this.appendExtractedText(`[Erro ao processar trecho #${index + 1}]`, index);
        });
    }
    
    /**
     * Adiciona botão de seleção de texto em imagens ao menu de narração
     */
    addSelectionButton() {
        // Verificar se o painel de controles existe
        const narrationControls = document.getElementById('narrationControls');
        if (!narrationControls) {
            // Tentar novamente após um curto período
            setTimeout(() => this.addSelectionButton(), 1000);
            return;
        }
        
        // Verificar se o botão já existe
        if (document.getElementById('selectImageTextAdvanced')) {
            return;
        }
        
        // Criar o botão
        const selectImageTextBtn = document.createElement('button');
        selectImageTextBtn.id = 'selectImageTextAdvanced';
        selectImageTextBtn.className = 'select-image-text-advanced';
        selectImageTextBtn.innerHTML = '<i class="fas fa-object-group"></i> Selecionar trechos de texto';
        selectImageTextBtn.title = 'Selecione áreas específicas de texto em imagens para narração sequencial';
        
        // Adicionar evento de clique
        selectImageTextBtn.addEventListener('click', () => this.toggleSelectionMode());
        
        // Adicionar ao painel de controles
        narrationControls.appendChild(selectImageTextBtn);
        
        // Armazenar referência ao botão
        this.selectImageTextBtn = selectImageTextBtn;
    }
    
    /**
     * Cria os controles de seleção
     */
    createSelectionControls() {
        // Verificar se os controles já existem
        if (document.querySelector('.image-selection-controls-advanced')) {
            this.selectionControls = document.querySelector('.image-selection-controls-advanced');
            return;
        }
        
        // Criar container para os controles
        this.selectionControls = document.createElement('div');
        this.selectionControls.className = 'image-selection-controls image-selection-controls-advanced';
        this.selectionControls.style.display = 'none';
        
        // Botão para cancelar a seleção atual
        const cancelButton = document.createElement('button');
        cancelButton.className = 'selection-button cancel';
        cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancelar seleção';
        cancelButton.addEventListener('click', () => this.cancelCurrentSelection());
        this.selectionControls.appendChild(cancelButton);
        
        // Botão para limpar todas as seleções
        const clearButton = document.createElement('button');
        clearButton.className = 'selection-button clear';
        clearButton.innerHTML = '<i class="fas fa-trash-alt"></i> Limpar todas';
        clearButton.addEventListener('click', () => this.clearAllSelections());
        this.selectionControls.appendChild(clearButton);
        
        // Botão para processar as seleções
        const processButton = document.createElement('button');
        processButton.className = 'selection-button process';
        processButton.innerHTML = '<i class="fas fa-check"></i> Processar seleções';
        processButton.addEventListener('click', () => this.processSelections());
        this.selectionControls.appendChild(processButton);
        
        // Adicionar ao corpo do documento
        document.body.appendChild(this.selectionControls);
    }
    
    /**
     * Cria o indicador de modo de seleção
     */
    createSelectionIndicator() {
        // Verificar se o indicador já existe
        if (document.querySelector('.selection-mode-indicator-advanced')) {
            this.selectionIndicator = document.querySelector('.selection-mode-indicator-advanced');
            return;
        }
        
        this.selectionIndicator = document.createElement('div');
        this.selectionIndicator.className = 'selection-mode-indicator selection-mode-indicator-advanced';
        this.selectionIndicator.innerHTML = '<i class="fas fa-object-group"></i> Modo de seleção de trechos de texto ativo';
        this.selectionIndicator.style.display = 'none';
        document.body.appendChild(this.selectionIndicator);
    }
    
    /**
     * Alterna o modo de seleção de texto em imagens
     */
    toggleSelectionMode() {
        if (this.isSelectionModeActive) {
            this.disableSelectionMode();
        } else {
            this.enableSelectionMode();
        }
    }
    
    /**
     * Ativa o modo de seleção de texto em imagens
     */
    enableSelectionMode() {
        // Verificar se o narrador está disponível
        if (!this.narrator) {
            console.warn('Narrador não disponível para seleção de texto em imagens');
            alert('Narrador não disponível. Tente novamente após carregar a página completamente.');
            return;
        }
        
        // Ativar modo de seleção
        this.isSelectionModeActive = true;
        
        // Atualizar interface
        document.body.classList.add('image-selection-mode-advanced');
        this.selectionIndicator.style.display = 'flex';
        this.selectionControls.style.display = 'flex';
        
        if (this.selectImageTextBtn) {
            this.selectImageTextBtn.classList.add('active');
        }
        
        // Adicionar listeners para imagens
        this.addImageListeners();
        
        console.log('Modo de seleção de trechos de texto em imagens ativado');
    }
    
    /**
     * Desativa o modo de seleção de texto em imagens
     */
    disableSelectionMode() {
        // Desativar modo de seleção
        this.isSelectionModeActive = false;
        
        // Atualizar interface
        document.body.classList.remove('image-selection-mode-advanced');
        this.selectionIndicator.style.display = 'none';
        this.selectionControls.style.display = 'none';
        
        if (this.selectImageTextBtn) {
            this.selectImageTextBtn.classList.remove('active');
        }
        
        // Remover listeners de imagens
        this.removeImageListeners();
        
        console.log('Modo de seleção de trechos de texto em imagens desativado');
    }
    
    /**
     * Adiciona listeners para todas as imagens na página
     */
    addImageListeners() {
        // Obter todas as imagens no container
        const imagesContainer = document.getElementById('imagesContainer');
        if (!imagesContainer) {
            console.warn('Container de imagens não encontrado');
            return;
        }
        
        const images = imagesContainer.querySelectorAll('img');
        if (images.length === 0) {
            console.warn('Nenhuma imagem encontrada no container');
            alert('Nenhuma imagem encontrada para seleção. Abra um arquivo de imagem primeiro.');
            this.disableSelectionMode();
            return;
        }
        
        console.log(`Adicionando listeners para ${images.length} imagens`);
        
        // Adicionar listeners para cada imagem
        images.forEach(img => {
            // Adicionar classe para identificar imagens com seleção habilitada
            img.classList.add('selection-enabled-advanced');
            
            // Adicionar container para posicionamento relativo
            const parent = img.parentElement;
            if (!parent.classList.contains('image-selection-container-advanced')) {
                const container = document.createElement('div');
                container.className = 'image-selection-container image-selection-container-advanced';
                parent.insertBefore(container, img);
                container.appendChild(img);
            }
        });
        
        // Adicionar listeners globais para eventos de mouse
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    /**
     * Remove listeners de todas as imagens
     */
    removeImageListeners() {
        // Remover listeners globais
        document.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Remover classes das imagens
        const images = document.querySelectorAll('.selection-enabled-advanced');
        images.forEach(img => {
            img.classList.remove('selection-enabled-advanced');
        });
    }
    
    /**
     * Manipula o evento de pressionar o mouse
     * @param {MouseEvent} event - Evento de mouse
     */
    handleMouseDown(event) {
        if (!this.isSelectionModeActive) return;
        
        // Verificar se o clique foi em uma imagem habilitada para seleção
        const target = event.target;
        if (!target.classList.contains('selection-enabled-advanced')) return;
        
        // Prevenir comportamento padrão
        event.preventDefault();
        
        // Armazenar a imagem atual
        this.currentImage = target;
        this.isMouseDown = true;
        
        // Obter posição inicial relativa à imagem
        const rect = this.currentImage.getBoundingClientRect();
        this.startX = event.clientX - rect.left;
        this.startY = event.clientY - rect.top;
        
        // Criar elemento de seleção
        this.currentSelection = document.createElement('div');
        this.currentSelection.className = 'selection-rectangle selection-rectangle-advanced';
        this.currentSelection.style.left = `${this.startX}px`;
        this.currentSelection.style.top = `${this.startY}px`;
        this.currentSelection.style.width = '0';
        this.currentSelection.style.height = '0';
        
        // Adicionar à imagem
        this.currentImage.parentElement.appendChild(this.currentSelection);
        
        console.log(`Iniciando seleção em (${this.startX}, ${this.startY})`);
    }
    
    /**
     * Manipula o evento de mover o mouse
     * @param {MouseEvent} event - Evento de mouse
     */
    handleMouseMove(event) {
        if (!this.isSelectionModeActive || !this.isMouseDown || !this.currentSelection || !this.currentImage) return;
        
        // Prevenir comportamento padrão
        event.preventDefault();
        
        // Obter posição atual relativa à imagem
        const rect = this.currentImage.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
        const currentY = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
        
        // Calcular dimensões do retângulo
        const width = Math.abs(currentX - this.startX);
        const height = Math.abs(currentY - this.startY);
        
        // Calcular posição do retângulo (para lidar com seleção em qualquer direção)
        const left = Math.min(this.startX, currentX);
        const top = Math.min(this.startY, currentY);
        
        // Atualizar estilo do retângulo
        this.currentSelection.style.left = `${left}px`;
        this.currentSelection.style.top = `${top}px`;
        this.currentSelection.style.width = `${width}px`;
        this.currentSelection.style.height = `${height}px`;
    }
    
    /**
     * Manipula o evento de soltar o mouse
     * @param {MouseEvent} event - Evento de mouse
     */
    handleMouseUp(event) {
        if (!this.isSelectionModeActive || !this.isMouseDown) return;
        
        this.isMouseDown = false;
        
        // Verificar se temos uma seleção atual
        if (!this.currentSelection || !this.currentImage) return;
        
        // Prevenir comportamento padrão
        event.preventDefault();
        
        // Verificar se a seleção tem tamanho mínimo
        const width = parseInt(this.currentSelection.style.width);
        const height = parseInt(this.currentSelection.style.height);
        
        if (width < 10 || height < 10) {
            // Seleção muito pequena, remover
            this.currentSelection.remove();
            this.currentSelection = null;
            return;
        }
        
        // Confirmar a seleção
        this.currentSelection.classList.add('confirmed');
        
        // Adicionar número à seleção
        const selectionNumber = document.createElement('div');
        selectionNumber.className = 'selection-number';
        selectionNumber.textContent = this.selections.length + 1;
        this.currentSelection.appendChild(selectionNumber);
        
        // Armazenar informações da seleção
        const selection = {
            element: this.currentSelection,
            image: this.currentImage,
            left: parseInt(this.currentSelection.style.left),
            top: parseInt(this.currentSelection.style.top),
            width: width,
            height: height,
            order: this.selections.length
        };
        
        this.selections.push(selection);
        
        // Limpar seleção atual
        this.currentSelection = null;
        
        console.log(`Seleção #${this.selections.length} confirmada: ${width}x${height}`);
    }
    
    /**
     * Cancela a seleção atual
     */
    cancelCurrentSelection() {
        if (this.currentSelection) {
            this.currentSelection.remove();
            this.currentSelection = null;
        }
        this.isMouseDown = false;
    }
    
    /**
     * Limpa todas as seleções
     */
    clearAllSelections() {
        // Remover elementos visuais
        this.selections.forEach(selection => {
            if (selection.element) {
                selection.element.remove();
            }
        });
        
        // Limpar array de seleções
        this.selections = [];
        
        // Remover container de texto extraído, se existir
        const extractedTextContainer = document.querySelector('.extracted-text-container-advanced');
        if (extractedTextContainer) {
            extractedTextContainer.remove();
        }
        
        console.log('Todas as seleções foram removidas');
    }
    
    /**
     * Processa todas as seleções para extração de texto
     */
    async processSelections() {
        if (this.selections.length === 0) {
            console.warn('Nenhuma seleção para processar');
            this.showNotification('Nenhuma seleção para processar. Selecione áreas de texto primeiro.', 'warning');
            return;
        }
        
        console.log(`Processando ${this.selections.length} seleções...`);
        
        // Mostrar indicador de progresso
        this.showProgressIndicator('Preparando seleções para processamento...');
        
        // Ordenar seleções pela ordem de criação
        const orderedSelections = [...this.selections].sort((a, b) => a.order - b.order);
        
        // Criar container para o texto extraído
        this.createExtractedTextContainer();
        
        // Limpar a fila de processamento
        this.processingQueue.clearQueue();
        
        // Adicionar cada seleção à fila
        orderedSelections.forEach(selection => {
            this.processingQueue.addItem(selection, {
                order: selection.order,
                dimensions: `${selection.width}x${selection.height}`
            });
        });
        
        // Iniciar processamento em background
        this.processingQueue.start(async (selection, metadata) => {
            // Extrair a região da imagem
            const imageRegion = await this.extractImageRegion(
                selection.image,
                selection.left,
                selection.top,
                selection.width,
                selection.height
            );
            
            // Processar OCR na região
            const text = await this.ocrProcessor.processImage(imageRegion);
            
            if (!text || !text.trim()) {
                return `[Nenhum texto detectado na seleção ${metadata.order + 1}]`;
            }
            
            return text.trim();
        });
    }
    
    /**
     * Cria o container para exibir o texto extraído
     */
    createExtractedTextContainer() {
        // Remover container existente, se houver
        const existingContainer = document.querySelector('.extracted-text-container-advanced');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Criar novo container
        const extractedTextContainer = document.createElement('div');
        extractedTextContainer.className = 'extracted-text-container extracted-text-container-advanced';
        extractedTextContainer.style.padding = '20px';
        extractedTextContainer.style.margin = '20px 0';
        extractedTextContainer.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
        extractedTextContainer.style.border = '1px solid rgba(52, 152, 219, 0.3)';
        extractedTextContainer.style.borderRadius = '5px';
        
        // Adicionar título
        const title = document.createElement('h3');
        title.textContent = 'Texto Extraído das Seleções';
        title.style.marginBottom = '10px';
        extractedTextContainer.appendChild(title);
        
        // Adicionar ao container de imagens
        const imagesContainer = document.getElementById('imagesContainer');
        if (imagesContainer) {
            imagesContainer.appendChild(extractedTextContainer);
        } else {
            // Fallback: adicionar ao body
            document.body.appendChild(extractedTextContainer);
        }
        
        return extractedTextContainer;
    }
    
    /**
     * Adiciona texto extraído ao container
     * @param {string} text - Texto extraído
     * @param {number} index - Índice da seleção
     */
    appendExtractedText(text, index) {
        const container = document.querySelector('.extracted-text-container-advanced');
        if (!container) return;
        
        // Criar elemento para o texto
        const textElement = document.createElement('div');
        textElement.className = 'extracted-text-item';
        textElement.dataset.index = index;
        
        // Adicionar número da seleção
        const numberBadge = document.createElement('span');
        numberBadge.className = 'selection-badge';
        numberBadge.textContent = index + 1;
        textElement.appendChild(numberBadge);
        
        // Adicionar o texto
        const textContent = document.createElement('div');
        textContent.className = 'extracted-text-content';
        textContent.textContent = text;
        textElement.appendChild(textContent);
        
        // Adicionar ao container
        container.appendChild(textElement);
        
        // Rolar para o texto extraído
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    /**
     * Inicia a narração com o texto extraído
     * @param {string} text - Texto para narração
     */
    startNarrationWithText(text) {
        if (!this.narrator) {
            console.warn('Narrador não disponível para iniciar narração');
            return;
        }
        
        // Parar qualquer narração em andamento
        if (this.narrator.isNarrating) {
            this.narrator.stopNarration();
        }
        
        // Criar elemento de texto temporário para narração
        const textElement = document.createElement('div');
        textElement.className = 'extracted-text';
        textElement.textContent = text;
        
        // Configurar o texto para narração
        if (window.narrationEnhancer) {
            window.narrationEnhancer.textHighlighter.setupTextElement(textElement);
            window.narrationEnhancer.activateEnhancedNarration();
        }
        
        // Iniciar narração
        setTimeout(() => {
            this.narrator.speakText(text);
            this.showNotification('Narração iniciada com o primeiro trecho extraído', 'success');
        }, 500);
        
        console.log('Narração iniciada com o primeiro trecho extraído');
    }
    
    /**
     * Extrai uma região de uma imagem como um canvas
     * @param {HTMLImageElement} image - Elemento de imagem
     * @param {number} x - Posição X da região
     * @param {number} y - Posição Y da região
     * @param {number} width - Largura da região
     * @param {number} height - Altura da região
     * @returns {Promise<HTMLCanvasElement>} - Canvas com a região extraída
     */
    extractImageRegion(image, x, y, width, height) {
        return new Promise((resolve) => {
            // Criar canvas para a região
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            // Obter contexto e desenhar a região
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
            
            // Para debug: mostrar a região extraída
            if (false) { // Definir como true para debug
                const debugImg = document.createElement('img');
                debugImg.src = canvas.toDataURL();
                debugImg.style.border = '2px solid red';
                debugImg.style.margin = '5px';
                debugImg.width = width;
                debugImg.height = height;
                document.body.appendChild(debugImg);
            }
            
            resolve(canvas);
        });
    }
    
    /**
     * Mostra um indicador de progresso
     * @param {string} message - Mensagem a ser exibida
     */
    showProgressIndicator(message) {
        // Verificar se já existe um indicador
        let progressIndicator = document.querySelector('.progress-indicator-advanced');
        
        if (!progressIndicator) {
            // Criar novo indicador
            progressIndicator = document.createElement('div');
            progressIndicator.className = 'progress-indicator progress-indicator-advanced';
            document.body.appendChild(progressIndicator);
        }
        
        // Atualizar mensagem
        progressIndicator.innerHTML = `
            <div class="progress-spinner"></div>
            <div class="progress-message">${message}</div>
        `;
        
        // Mostrar indicador
        progressIndicator.style.display = 'flex';
    }
    
    /**
     * Atualiza a mensagem do indicador de progresso
     * @param {string} message - Nova mensagem
     */
    updateProgressIndicator(message) {
        const progressMessage = document.querySelector('.progress-indicator-advanced .progress-message');
        if (progressMessage) {
            progressMessage.textContent = message;
        }
    }
    
    /**
     * Oculta o indicador de progresso
     */
    hideProgressIndicator() {
        const progressIndicator = document.querySelector('.progress-indicator-advanced');
        if (progressIndicator) {
            progressIndicator.style.display = 'none';
        }
    }
    
    /**
     *
     * Mostra uma notificação
     * @param {string} message - Mensagem a ser exibida
     * @param {string} type - Tipo de notificação (success, error, warning)
     */
    showNotification(message, type = 'info') {
        // Verificar se já existe uma notificação
        let notification = document.querySelector('.notification-advanced');
        
        if (!notification) {
            // Criar nova notificação
            notification = document.createElement('div');
            notification.className = 'notification notification-advanced';
            document.body.appendChild(notification);
        }
        
        // Definir ícone com base no tipo
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        // Atualizar conteúdo
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        // Adicionar classe de tipo
        notification.className = `notification notification-advanced ${type}`;
        
        // Mostrar notificação
        notification.style.display = 'flex';
        
        // Ocultar após alguns segundos
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
}

// Inicializar o módulo de seleção de texto em imagens quando o documento estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.imageSelectionOCR) {
            window.imageSelectionOCR = new ImageSelectionOCR();
        }
    });
} else {
    if (!window.imageSelectionOCR) {
        window.imageSelectionOCR = new ImageSelectionOCR();
    }
}