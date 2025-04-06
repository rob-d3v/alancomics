/**
 * RectangularTextSelection - Permite selecionar áreas retangulares de texto em imagens
 * para extração e narração sequencial
 * 
 * Este módulo implementa uma interface para selecionar regiões de texto em imagens,
 * extrair o texto dessas regiões usando OCR e enviá-lo para narração na ordem correta.
 */
class RectangularTextSelection {
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
        this.extractedTextContainer = null;
        
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
            console.log('RectangularTextSelection: Conectado ao narrador principal');
        } else {
            console.warn('RectangularTextSelection: Narrador principal não encontrado');
            // Tentar novamente após um curto período
            setTimeout(() => {
                if (window.comicNarrator) {
                    this.narrator = window.comicNarrator;
                    console.log('RectangularTextSelection: Conectado ao narrador principal (tentativa 2)');
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
        
        // Criar container para texto extraído
        this.createExtractedTextContainer();
        
        // Adicionar estilos CSS
        this.addStyles();
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
        if (document.getElementById('selectRectangularText')) {
            return;
        }
        
        // Criar o botão
        const selectTextBtn = document.createElement('button');
        selectTextBtn.id = 'selectRectangularText';
        selectTextBtn.className = 'select-rectangular-text';
        selectTextBtn.innerHTML = '<i class="fas fa-object-group"></i> Selecionar trechos de texto';
        selectTextBtn.title = 'Selecione áreas específicas de texto em imagens para narração sequencial';
        
        // Adicionar evento de clique
        selectTextBtn.addEventListener('click', () => this.toggleSelectionMode());
        
        // Adicionar ao painel de controles
        narrationControls.appendChild(selectTextBtn);
        
        // Armazenar referência ao botão
        this.selectTextBtn = selectTextBtn;
    }
    
    /**
     * Cria os controles de seleção
     */
    createSelectionControls() {
        // Verificar se os controles já existem
        if (document.querySelector('.rectangular-selection-controls')) {
            this.selectionControls = document.querySelector('.rectangular-selection-controls');
            return;
        }
        
        // Criar container para os controles
        this.selectionControls = document.createElement('div');
        this.selectionControls.className = 'rectangular-selection-controls';
        this.selectionControls.style.display = 'none';
        
        // Botão para cancelar a seleção atual
        const cancelButton = document.createElement('button');
        cancelButton.className = 'selection-button cancel';
        cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancelar seleção';
        cancelButton.addEventListener('click', () => this.cancelCurrentSelection());
        this.selectionControls.appendChild(cancelButton);
        
        // Botão para confirmar a seleção atual
        const confirmButton = document.createElement('button');
        confirmButton.className = 'selection-button confirm';
        confirmButton.innerHTML = '<i class="fas fa-check"></i> Confirmar seleção';
        confirmButton.addEventListener('click', () => this.confirmCurrentSelection());
        this.selectionControls.appendChild(confirmButton);
        
        // Botão para processar todas as seleções
        const processButton = document.createElement('button');
        processButton.className = 'selection-button process';
        processButton.innerHTML = '<i class="fas fa-play"></i> Processar seleções';
        processButton.addEventListener('click', () => this.processAllSelections());
        this.selectionControls.appendChild(processButton);
        
        // Botão para limpar todas as seleções
        const clearButton = document.createElement('button');
        clearButton.className = 'selection-button clear';
        clearButton.innerHTML = '<i class="fas fa-trash"></i> Limpar seleções';
        clearButton.addEventListener('click', () => this.clearAllSelections());
        this.selectionControls.appendChild(clearButton);
        
        // Botão para sair do modo de seleção
        const exitButton = document.createElement('button');
        exitButton.className = 'selection-button exit';
        exitButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sair do modo de seleção';
        exitButton.addEventListener('click', () => this.disableSelectionMode());
        this.selectionControls.appendChild(exitButton);
        
        // Adicionar ao corpo do documento
        document.body.appendChild(this.selectionControls);
    }
    
    /**
     * Cria o indicador de modo de seleção
     */
    createSelectionIndicator() {
        // Verificar se o indicador já existe
        if (document.querySelector('.rectangular-selection-indicator')) {
            this.selectionIndicator = document.querySelector('.rectangular-selection-indicator');
            return;
        }
        
        // Criar o indicador
        this.selectionIndicator = document.createElement('div');
        this.selectionIndicator.className = 'rectangular-selection-indicator';
        this.selectionIndicator.innerHTML = '<i class="fas fa-object-group"></i> Modo de seleção de texto ativo';
        this.selectionIndicator.style.display = 'none';
        
        // Adicionar ao corpo do documento
        document.body.appendChild(this.selectionIndicator);
    }
    
    /**
     * Cria o container para texto extraído
     */
    createExtractedTextContainer() {
        // Verificar se o container já existe
        if (document.querySelector('.extracted-text-container')) {
            this.extractedTextContainer = document.querySelector('.extracted-text-container');
            return;
        }
        
        // Criar o container
        this.extractedTextContainer = document.createElement('div');
        this.extractedTextContainer.className = 'extracted-text-container';
        this.extractedTextContainer.style.display = 'none';
        
        // Adicionar cabeçalho
        const header = document.createElement('div');
        header.className = 'extracted-text-header';
        header.innerHTML = '<h3>Texto Extraído</h3>';
        
        // Botão para fechar
        const closeButton = document.createElement('button');
        closeButton.className = 'close-extracted-text';
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.addEventListener('click', () => {
            this.extractedTextContainer.style.display = 'none';
        });
        header.appendChild(closeButton);
        
        this.extractedTextContainer.appendChild(header);
        
        // Adicionar conteúdo
        const content = document.createElement('div');
        content.className = 'extracted-text-content';
        this.extractedTextContainer.appendChild(content);
        
        // Adicionar ao corpo do documento
        document.body.appendChild(this.extractedTextContainer);
    }
    
    /**
     * Adiciona estilos CSS necessários
     */
    addStyles() {
        // Verificar se os estilos já existem
        if (document.getElementById('rectangular-selection-styles')) {
            return;
        }
        
        // Criar elemento de estilo
        const style = document.createElement('style');
        style.id = 'rectangular-selection-styles';
        style.textContent = `
            /* Estilos para o modo de seleção */
            body.rectangular-selection-mode {
                cursor: crosshair !important;
            }
            
            body.rectangular-selection-mode img {
                cursor: crosshair !important;
            }
            
            /* Estilos para a área de seleção */
            .selection-area {
                position: absolute;
                border: 2px dashed #ff5722;
                background-color: rgba(255, 87, 34, 0.2);
                z-index: 1000;
                pointer-events: none;
            }
            
            .selection-area.confirmed {
                border: 2px solid #4caf50;
                background-color: rgba(76, 175, 80, 0.2);
            }
            
            .selection-area .selection-number {
                position: absolute;
                top: -20px;
                left: -10px;
                background-color: #ff5722;
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
            }
            
            .selection-area.confirmed .selection-number {
                background-color: #4caf50;
            }
            
            /* Estilos para os controles de seleção */
            .rectangular-selection-controls {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 10px;
                background-color: rgba(0, 0, 0, 0.8);
                padding: 10px 15px;
                border-radius: 8px;
                z-index: 1001;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            
            .selection-button {
                background-color: #2196f3;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 14px;
                transition: background-color 0.2s;
            }
            
            .selection-button:hover {
                background-color: #1976d2;
            }
            
            .selection-button.cancel {
                background-color: #f44336;
            }
            
            .selection-button.cancel:hover {
                background-color: #d32f2f;
            }
            
            .selection-button.confirm {
                background-color: #4caf50;
            }
            
            .selection-button.confirm:hover {
                background-color: #388e3c;
            }
            
            .selection-button.process {
                background-color: #ff9800;
            }
            
            .selection-button.process:hover {
                background-color: #f57c00;
            }
            
            .selection-button.clear {
                background-color: #9c27b0;
            }
            
            .selection-button.clear:hover {
                background-color: #7b1fa2;
            }
            
            /* Estilos para o indicador de modo de seleção */
            .rectangular-selection-indicator {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #ff5722;
                color: white;
                padding: 8px 15px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: bold;
                z-index: 1001;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            
            /* Estilos para o container de texto extraído */
            .extracted-text-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                max-width: 600px;
                max-height: 80vh;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 1002;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .extracted-text-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 15px;
                background-color: #2196f3;
                color: white;
            }
            
            .extracted-text-header h3 {
                margin: 0;
                font-size: 16px;
            }
            
            .close-extracted-text {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 18px;
            }
            
            .extracted-text-content {
                padding: 15px;
                overflow-y: auto;
                max-height: calc(80vh - 50px);
            }
            
            .extracted-text-item {
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .extracted-text-item:last-child {
                border-bottom: none;
            }
            
            .extracted-text-item .item-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                font-weight: bold;
                color: #2196f3;
            }
            
            /* Estilos para notificações */
            .rectangular-selection-notification {
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                padding: 10px 15px;
                border-radius: 4px;
                color: white;
                font-weight: bold;
                z-index: 1003;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                animation: fadeInOut 3s forwards;
            }
            
            .rectangular-selection-notification.success {
                background-color: #4caf50;
            }
            
            .rectangular-selection-notification.error {
                background-color: #f44336;
            }
            
            .rectangular-selection-notification.info {
                background-color: #2196f3;
            }
            
            @keyframes fadeInOut {
                0% { opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { opacity: 0; }
            }
            
            /* Estilos para o indicador de progresso */
            .rectangular-selection-progress {
                position: fixed;
                top: 70px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #2196f3;
                color: white;
                padding: 8px 15px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: bold;
                z-index: 1001;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
        `;
        
        // Adicionar ao cabeçalho do documento
        document.head.appendChild(style);
    }
    
    /**
     * Alterna o modo de seleção
     */
    toggleSelectionMode() {
        if (this.isSelectionModeActive) {
            this.disableSelectionMode();
        } else {
            this.enableSelectionMode();
        }
    }
    
    /**
     * Ativa o modo de seleção
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
        document.body.classList.add('rectangular-selection-mode');
        this.selectionIndicator.style.display = 'flex';
        this.selectionControls.style.display = 'flex';
        
        if (this.selectTextBtn) {
            this.selectTextBtn.classList.add('active');
        }
        
        // Adicionar listeners para imagens
        this.addImageListeners();
        
        // Mostrar notificação
        this.showNotification('Modo de seleção de texto ativado. Clique e arraste para selecionar áreas de texto.', 'info');
        
        console.log('Modo de seleção de trechos de texto em imagens ativado');
    }
    
    /**
     * Desativa o modo de seleção
     */
    disableSelectionMode() {
        // Desativar modo de seleção
        this.isSelectionModeActive = false;
        
        // Atualizar interface
        document.body.classList.remove('rectangular-selection-mode');
        this.selectionIndicator.style.display = 'none';
        this.selectionControls.style.display = 'none';
        
        if (this.selectTextBtn) {
            this.selectTextBtn.classList.remove('active');
        }
        
        // Remover listeners de imagens
        this.removeImageListeners();
        
        // Cancelar seleção atual se existir
        if (this.currentSelection) {
            this.cancelCurrentSelection();
        }
        
        console.log('Modo de seleção de trechos de texto em imagens desativado');
    }
    
    /**
     * Adiciona listeners de eventos às imagens
     */
    addImageListeners() {
        // Obter todas as imagens visíveis
        const images = document.querySelectorAll('#imagesContainer img');
        
        images.forEach(img => {
            // Adicionar classe para indicar que a imagem é selecionável
            img.classList.add('selectable-image');
            
            // Adicionar eventos de mouse
            img.addEventListener('mousedown', this.handleMouseDown.bind(this));
            img.addEventListener('mousemove', this.handleMouseMove.bind(this));
            img.addEventListener('mouseup', this.handleMouseUp.bind(this));
            
            // Prevenir comportamento padrão de arrastar imagens
            img.addEventListener('dragstart', e => e.preventDefault());
        });
        
        // Remover evento global
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    removeImageListeners() {
        // Obter todas as imagens
        const images = document.querySelectorAll('.selectable-image');
        
        images.forEach(img => {
            // Remover classe
            img.classList.remove('selectable-image');
            
            // Remover eventos
            img.removeEventListener('mousedown', this.handleMouseDown.bind(this));
            img.removeEventListener('mousemove', this.handleMouseMove.bind(this));
            img.removeEventListener('mouseup', this.handleMouseUp.bind(this));
            img.removeEventListener('dragstart', e => e.preventDefault());
        });
        
        // Remover evento global
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    /**
     * Manipula o evento de pressionar o botão do mouse
     * @param {MouseEvent} e - Evento de mouse
     */
    handleMouseDown(e) {
        if (!this.isSelectionModeActive) return;
        
        // Armazenar a imagem atual
        this.currentImage = e.target;
        
        // Obter a posição do clique relativa à imagem
        const rect = this.currentImage.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;
        
        // Iniciar seleção
        this.isMouseDown = true;
        
        // Criar elemento de seleção
        this.createSelectionElement(this.startX, this.startY, 0, 0);
    }
    
    /**
     * Manipula o evento de movimento do mouse
     * @param {MouseEvent} e - Evento de mouse
     */
    handleMouseMove(e) {
        if (!this.isSelectionModeActive || !this.isMouseDown || !this.currentImage) return;
        
        // Obter a posição atual relativa à imagem
        const rect = this.currentImage.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        // Calcular dimensões da seleção
        const width = currentX - this.startX;
        const height = currentY - this.startY;
        
        // Atualizar elemento de seleção
        this.updateSelectionElement(width, height);
    }
    
    /**
     * Manipula o evento de soltar o botão do mouse
     * @param {MouseEvent} e - Evento de mouse
     */
    handleMouseUp(e) {
        if (!this.isSelectionModeActive || !this.isMouseDown || !this.currentImage) return;
        
        // Finalizar seleção
        this.isMouseDown = false;
        
        // Obter a posição final relativa à imagem
        const rect = this.currentImage.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        
        // Calcular dimensões finais da seleção
        const width = endX - this.startX;
        const height = endY - this.startY;
        
        // Verificar se a seleção é válida (tamanho mínimo)
        if (Math.abs(width) < 10 || Math.abs(height) < 10) {
            this.cancelCurrentSelection();
            return;
        }
        
        // Atualizar elemento de seleção com dimensões finais
        this.updateSelectionElement(width, height);
    }
    
    /**
     * Cria um elemento visual para representar a área de seleção
     * @param {number} x - Posição X inicial
     * @param {number} y - Posição Y inicial
     * @param {number} width - Largura inicial
     * @param {number} height - Altura inicial
     */
    createSelectionElement(x, y, width, height) {
        // Criar elemento de seleção
        const selectionElement = document.createElement('div');
        selectionElement.className = 'selection-area';
        
        // Posicionar o elemento
        selectionElement.style.left = `${x}px`;
        selectionElement.style.top = `${y}px`;
        selectionElement.style.width = `${width}px`;
        selectionElement.style.height = `${height}px`;
        
        // Adicionar ao container da imagem
        const imageContainer = this.currentImage.parentElement;
        imageContainer.style.position = 'relative';
        imageContainer.appendChild(selectionElement);
        
        // Armazenar referência ao elemento de seleção atual
        this.currentSelection = {
            element: selectionElement,
            image: this.currentImage,
            x: x,
            y: y,
            width: width,
            height: height,
            confirmed: false
        };
    }
    
    /**
     * Atualiza as dimensões do elemento de seleção
     * @param {number} width - Nova largura
     * @param {number} height - Nova altura
     */
    updateSelectionElement(width, height) {
        if (!this.currentSelection || !this.currentSelection.element) return;
        
        // Calcular posição e dimensões corretas (para seleções em qualquer direção)
        let x = this.startX;
        let y = this.startY;
        let w = width;
        let h = height;
        
        if (width < 0) {
            x = this.startX + width;
            w = Math.abs(width);
        }
        
        if (height < 0) {
            y = this.startY + height;
            h = Math.abs(height);
        }
        
        // Atualizar posição e dimensões
        this.currentSelection.element.style.left = `${x}px`;
        this.currentSelection.element.style.top = `${y}px`;
        this.currentSelection.element.style.width = `${w}px`;
        this.currentSelection.element.style.height = `${h}px`;
        
        // Atualizar dados da seleção
        this.currentSelection.x = x;
        this.currentSelection.y = y;
        this.currentSelection.width = w;
        this.currentSelection.height = h;
    }
    
    /**
     * Cancela a seleção atual
     */
    cancelCurrentSelection() {
        if (!this.currentSelection || !this.currentSelection.element) return;
        
        // Remover elemento de seleção
        this.currentSelection.element.remove();
        
        // Limpar referência
        this.currentSelection = null;
    }
    
    /**
     * Confirma a seleção atual e a adiciona à lista de seleções
     */
    confirmCurrentSelection() {
        if (!this.currentSelection || !this.currentSelection.element) {
            this.showNotification('Nenhuma seleção ativa para confirmar', 'error');
            return;
        }
        
        // Marcar como confirmada
        this.currentSelection.confirmed = true;
        this.currentSelection.element.classList.add('confirmed');
        
        // Adicionar número da seleção
        const selectionNumber = document.createElement('div');
        selectionNumber.className = 'selection-number';
        selectionNumber.textContent = this.selections.length + 1;
        this.currentSelection.element.appendChild(selectionNumber);
        
        // Adicionar à lista de seleções
        this.selections.push(this.currentSelection);
        
        // Limpar seleção atual
        this.currentSelection = null;
        
        // Mostrar notificação
        this.showNotification(`Seleção #${this.selections.length} confirmada`, 'success');
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
        
        // Limpar lista de seleções
        this.selections = [];
        
        // Cancelar seleção atual se existir
        if (this.currentSelection) {
            this.cancelCurrentSelection();
        }
        
        // Mostrar notificação
        this.showNotification('Todas as seleções foram removidas', 'info');
    }
    
    /**
     * Processa todas as seleções confirmadas
     */
    processAllSelections() {
        // Verificar se há seleções para processar
        if (this.selections.length === 0) {
            this.showNotification('Nenhuma seleção para processar', 'error');
            return;
        }
        
        // Mostrar notificação
        this.showNotification(`Iniciando processamento de ${this.selections.length} seleções...`, 'info');
        
        // Mostrar indicador de progresso
        this.showProgressIndicator('Preparando para processar seleções...');
        
        // Mostrar container de texto extraído
        this.clearExtractedTextContainer();
        this.extractedTextContainer.style.display = 'flex';
        
        // Limpar fila de processamento
        this.processingQueue.clearQueue();
        
        // Adicionar cada seleção à fila de processamento
        this.selections.forEach((selection, index) => {
            this.processingQueue.addItem(
                async () => this.processSelection(selection),
                { index, selection }
            );
        });
        
        // Iniciar processamento
        this.processingQueue.startProcessing();
    }
    
    /**
     * Processa uma seleção individual
     * @param {Object} selection - Objeto de seleção
     * @returns {Promise<string>} - Texto extraído
     */
    async processSelection(selection) {
        // Verificar se a seleção é válida
        if (!selection || !selection.image) {
            throw new Error('Seleção inválida');
        }
        
        try {
            // Criar canvas para recortar a área selecionada
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Definir dimensões do canvas
            canvas.width = selection.width;
            canvas.height = selection.height;
            
            // Desenhar apenas a área selecionada da imagem no canvas
            ctx.drawImage(
                selection.image,
                selection.x, selection.y, selection.width, selection.height,
                0, 0, selection.width, selection.height
            );
            
            // Obter a imagem recortada como URL de dados
            const croppedImageUrl = canvas.toDataURL('image/png');
            
            // Processar a imagem recortada com OCR
            const result = await this.ocrProcessor.processImage(croppedImageUrl);
            
            // Retornar o texto extraído
            return result.text || '';
        } catch (error) {
            console.error('Erro ao processar seleção:', error);
            throw error;
        }
    }
    
    /**
     * Inicia a narração com o texto extraído
     * @param {string} text - Texto a ser narrado
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
        }, 100);
    }
    
    /**
     * Mostra uma notificação temporária
     * @param {string} message - Mensagem a ser exibida
     * @param {string} type - Tipo de notificação (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Remover notificação anterior se existir
        const existingNotification = document.querySelector('.rectangular-selection-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `rectangular-selection-notification ${type}`;
        notification.textContent = message;
        
        // Adicionar ao corpo do documento
        document.body.appendChild(notification);
        
        // Remover após alguns segundos
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    /**
     * Mostra o indicador de progresso
     * @param {string} message - Mensagem a ser exibida
     */
    showProgressIndicator(message) {
        // Remover indicador anterior se existir
        this.hideProgressIndicator();
        
        // Criar elemento de indicador
        const indicator = document.createElement('div');
        indicator.className = 'rectangular-selection-progress';
        indicator.textContent = message;
        
        // Adicionar ao corpo do documento
        document.body.appendChild(indicator);
    }
    
    /**
     * Atualiza o indicador de progresso
     * @param {string} message - Nova mensagem
     */
    updateProgressIndicator(message) {
        // Obter indicador existente
        const indicator = document.querySelector('.rectangular-selection-progress');
        
        // Criar novo se não existir
        if (!indicator) {
            this.showProgressIndicator(message);
            return;
        }
        
        // Atualizar mensagem
        indicator.textContent = message;
    }
    
    /**
     * Oculta o indicador de progresso
     */
    hideProgressIndicator() {
        // Remover indicador se existir
        const indicator = document.querySelector('.rectangular-selection-progress');
        if (indicator) {
            indicator.remove();
        }
    }
    
    /**
     * Limpa o container de texto extraído
     */
    clearExtractedTextContainer() {
        const content = this.extractedTextContainer.querySelector('.extracted-text-content');
        if (content) {
            content.innerHTML = '';
        }
    }
    
    /**
     * Adiciona texto extraído ao container
     * @param {string} text - Texto extraído
     * @param {number} index - Índice da seleção
     */
    appendExtractedText(text, index) {
        const content = this.extractedTextContainer.querySelector('.extracted-text-content');
        if (!content) return;
        
        // Criar item para o texto extraído
        const item = document.createElement('div');
        item.className = 'extracted-text-item';
        
        // Adicionar cabeçalho do item
        const header = document.createElement('div');
        header.className = 'item-header';
        header.innerHTML = `<span>Trecho #${index + 1}</span>`;
        item.appendChild(header);
        
        // Adicionar texto
        const textElement = document.createElement('div');
        textElement.className = 'item-text';
        textElement.textContent = text;
        item.appendChild(textElement);
        
        // Adicionar ao container
        content.appendChild(item);
        
        // Rolar para o final
        content.scrollTop = content.scrollHeight;
    }
}

// Criar instância global quando o script for carregado
window.rectangularTextSelection = new RectangularTextSelection();
    
    // /**
    //  * Remove listeners de eventos das imagens
    //  */
    // removeImageListeners() {
    //     // Obter todas as imagens
    //     const images = document.querySelectorAll('.selectable-image');
        
    //     images.forEach(img => {
    //         // Remover classe
    //         img.classList.remove('selectable-image');
            
    //         // Remover eventos
    //         img.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    //         img.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    //         img.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    //         img.removeEventListener('dragstart', e => e.preventDefault());